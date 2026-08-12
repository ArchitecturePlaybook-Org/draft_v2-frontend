"use client";
import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MilestoneBlockExpanded, Task, TaskStatus,
  MilestonePhase, SpatialZone
} from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { TaskItem } from "../projects/TaskItem";
import { toast } from "sonner";
import { getWebSocketUrl } from "@/lib/api/constants";

interface KanbanDrawerProps {
  block: MilestoneBlockExpanded;
  phase: MilestonePhase;
  zone: SpatialZone;
  isOpen: boolean;
  onClose: () => void;
  onBlockUpdated: (updated: MilestoneBlockExpanded) => void;
  userRole?: "contractor" | "qa_inspector" | "admin" | "viewer";
  projectUid?: string;
  /** Controlled panel width from parent split state */
  width?: number;
  leftOffset?: number;
  /** Bubbles task click up to parent for split-pane rendering */
  onTaskSelect?: (task: Task) => void;
  readOnly?: boolean;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: "TODO", label: "To Do", color: "border-t-[3px] border-surface-300 bg-transparent", dotColor: "bg-surface-300" },
  { id: "ON_HOLD", label: "On Hold", color: "border-t-[3px] border-amber-500 bg-transparent", dotColor: "bg-amber-500" },
  { id: "WIP", label: "In Progress", color: "border-t-[3px] border-semantic-blue bg-transparent", dotColor: "bg-semantic-blue" },
  { id: "QA", label: "Under Inspection", color: "border-t-[3px] border-accent bg-transparent", dotColor: "bg-accent" },
  { id: "DONE", label: "Done", color: "border-t-[3px] border-semantic-green bg-transparent", dotColor: "bg-semantic-green" },
];

const getUpdatedBlock = (currentBlock: MilestoneBlockExpanded, updatedTasks: Task[]): MilestoneBlockExpanded => {
  const safeTasks = Array.isArray(updatedTasks) ? updatedTasks : [];
  const total = safeTasks.length;
  const completed = safeTasks.filter(t => t?.status === "DONE").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  let status = currentBlock.status;
  if (status !== "LOCKED") {
    status = completed === total && total > 0 ? "DONE" : "ACTIVE";
  }
  return {
    ...currentBlock,
    tasks: safeTasks,
    total_tasks: total,
    completed_tasks: completed,
    progress_percent: progress,
    status,
  };
};

export const KanbanDrawer: React.FC<KanbanDrawerProps> = ({
  block,
  phase,
  zone,
  isOpen,
  onClose,
  onBlockUpdated,
  userRole = "admin",
  projectUid,
  width,
  leftOffset = 0,
  onTaskSelect,
  readOnly = false,
}) => {
  const [tasks, setTasks] = useState<Task[]>(block.tasks || []);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const isLocked = block.status === "LOCKED" || readOnly;

  // ── Task Template pre-fill state ──────────────────────────────────────────
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [taskChecklists, setTaskChecklists] = useState<string[]>([]);
  const [taskSubtasks, setTaskSubtasks] = useState<any[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDesc, setNewSubtaskDesc] = useState("");
  const [subtaskChecklistInputs, setSubtaskChecklistInputs] = useState<Record<number, string>>({});

  // Sync tasks whenever block or block.tasks prop updates, and fetch fresh task data
  React.useEffect(() => {
    if (block?.tasks) {
      setTasks(block.tasks.filter((t: any) => t && !t.is_deleted));
    }
    if (block?.id) {
      projectsApi.getBlockTasks(block.id)
        .then((fetchedTasks) => {
          if (Array.isArray(fetchedTasks) && fetchedTasks.length > 0) {
            setTasks(fetchedTasks.filter((t: any) => t && !t.is_deleted));
          }
        })
        .catch(() => {});
    }
  }, [block?.id, block?.tasks]);

  // Fetch task templates on mount
  React.useEffect(() => {
    projectsApi.getTaskTemplates()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setTaskTemplates(list);
      })
      .catch(() => {});
  }, []);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (id) {
      const tpl = taskTemplates.find((t: any) => String(t.id) === id);
      if (tpl) {
        setNewTaskTitle(tpl.name || "");
        setTemplateDescription(tpl.description || "");
        const rawCl = Array.isArray(tpl.default_checklists) ? tpl.default_checklists : [];
        const clList: string[] = rawCl
          .map((c: any) => (typeof c === "string" ? c : c?.title || ""))
          .filter(Boolean);
        setTaskChecklists(clList);
        setTaskSubtasks(Array.isArray(tpl.default_subtasks) ? tpl.default_subtasks : []);
      }
    } else {
      setTemplateDescription("");
      setTaskChecklists([]);
      setTaskSubtasks([]);
    }
  };

  const [onHoldPromptTask, setOnHoldPromptTask] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [onHoldReasonText, setOnHoldReasonText] = useState("");

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    if (readOnly) return;
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  }, [readOnly]);

  const handleDragOver = useCallback((e: React.DragEvent, col: TaskStatus) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(col);
  }, [readOnly]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: TaskStatus) => {
    if (readOnly) return;
    e.preventDefault();
    setDragOverColumn(null);
    if (draggingTaskId === null) return;

    const task = tasks.find(t => t.uid === draggingTaskId);
    if (!task || task.status === targetStatus) {
      setDraggingTaskId(null);
      return;
    }

    if (targetStatus === "ON_HOLD") {
      setOnHoldPromptTask({ taskId: draggingTaskId, taskTitle: task.title });
      setDraggingTaskId(null);
      return;
    }

    // Optimistic UI update
    const previousTasks = [...tasks];
    const updatedTask = { ...task, status: targetStatus };
    const optimisticTasks = tasks.map(t => t.uid === draggingTaskId ? updatedTask : t);
    setTasks(optimisticTasks);
    setDraggingTaskId(null);

    try {
      const updated = await projectsApi.updateTask(draggingTaskId, { status: targetStatus });
      const updatedTasks = optimisticTasks.map(t => t.uid === updated.uid ? updated : t);
      setTasks(updatedTasks);
      onBlockUpdated(getUpdatedBlock(block, updatedTasks));
      toast.success(`Moved to ${COLUMNS.find(c => c.id === targetStatus)?.label}`);
    } catch (err: any) {
      // Snap back on failure
      setTasks(previousTasks);
      toast.error(err?.message || "Cannot move task — gate rule violated.");
    }
  }, [draggingTaskId, tasks, block, onBlockUpdated]);

  const handleConfirmOnHoldDrop = async () => {
    if (!onHoldPromptTask || !onHoldReasonText.trim()) return;
    const { taskId } = onHoldPromptTask;
    const task = tasks.find(t => t.uid === taskId);
    if (!task) return;

    const previousTasks = [...tasks];
    const updatedTask = { ...task, status: "ON_HOLD" as const, on_hold_reason: onHoldReasonText.trim() };
    const optimisticTasks = tasks.map(t => t.uid === taskId ? updatedTask : t);
    setTasks(optimisticTasks);
    setOnHoldPromptTask(null);
    const reason = onHoldReasonText.trim();
    setOnHoldReasonText("");

    try {
      const updated = await projectsApi.updateTask(taskId, { status: "ON_HOLD", on_hold_reason: reason });
      const updatedTasks = optimisticTasks.map(t => t.uid === updated.uid ? updated : t);
      setTasks(updatedTasks);
      onBlockUpdated(getUpdatedBlock(block, updatedTasks));
      toast.success("Moved to On Hold");
    } catch (err: any) {
      setTasks(previousTasks);
      toast.error(err?.message || "Could not move task to On Hold.");
    }
  };

  // ── Add Task ────────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const created = await projectsApi.createTask({
        project: block.project_id || (projectUid ? (isNaN(Number(projectUid)) ? projectUid : parseInt(projectUid)) : undefined),
        block: block.id,
        title: newTaskTitle.trim(),
        description: templateDescription.trim(),
        checklists: taskChecklists,
        default_checklists: taskChecklists,
        subtasks: taskSubtasks,
        default_subtasks: taskSubtasks,
        status: "TODO",
      });

      // Ensure checklists are present on the created task
      let taskChecklistItems = created?.checklists || [];
      if ((!taskChecklistItems || taskChecklistItems.length === 0) && taskChecklists.length > 0 && created?.uid) {
        const results = await Promise.allSettled(
          taskChecklists.map((title, idx) => projectsApi.createChecklistItem(created.uid, title))
        );
        taskChecklistItems = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r, idx) => r.value || { id: Date.now() + idx, title: taskChecklists[idx], is_completed: false });
      }

      if ((!taskChecklistItems || taskChecklistItems.length === 0) && taskChecklists.length > 0) {
        taskChecklistItems = taskChecklists.map((title, idx) => ({
          id: Date.now() + idx,
          title,
          is_completed: false,
          order: idx,
        }));
      }
      
      const createdTask: Task = {
        ...created,
        description: templateDescription.trim() || created.description || "",
        checklists: taskChecklistItems,
        status: created.status || "TODO",
      };

      const currentTasks = Array.isArray(tasks) ? tasks : [];
      const exists = currentTasks.some(t => (createdTask.uid && t.uid === createdTask.uid) || (createdTask.id && t.id === createdTask.id));
      const updatedTasks = exists
        ? currentTasks.map(t => (t.uid === createdTask.uid || (t.id && t.id === createdTask.id)) ? createdTask : t)
        : [...currentTasks, createdTask];
      
      setTasks(updatedTasks);
      onBlockUpdated(getUpdatedBlock(block, updatedTasks));
      setNewTaskTitle("");
      setSelectedTemplateId("");
      setTemplateDescription("");
      setTaskChecklists([]);
      setNewChecklistInput("");
      setIsAddingTask(false);
      toast.success("Task added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add task.");
    }
  };

  // ── Task Updated callback ────────────────────────────────────────────────────
  const handleTaskUpdated = (updated: Task) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = currentTasks.map(t => t.uid === updated.uid ? updated : t);
    setTasks(updatedTasks);
    onBlockUpdated(getUpdatedBlock(block, updatedTasks));
  };

  const handleTaskDeleted = (taskId: string) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const newTasks = currentTasks.filter(t => t.uid !== taskId);
    setTasks(newTasks);
    onBlockUpdated(getUpdatedBlock(block, newTasks));
  };

  const safeTasksList = Array.isArray(tasks) ? tasks.filter(t => t && !t.is_deleted) : [];
  const filteredTasks = safeTasksList.filter(t => t && (!priorityFilter || t.priority === priorityFilter));
  
  const tasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => {
    if (!t) return false;
    const taskStatus = (t.status || "TODO").toUpperCase();
    if (status === "TODO") {
      return taskStatus === "TODO" || taskStatus === "PENDING";
    }
    if (status === "ON_HOLD") {
      return taskStatus === "ON_HOLD" || taskStatus === "ON HOLD" || taskStatus === "HOLD";
    }
    if (status === "WIP") {
      return taskStatus === "WIP" || taskStatus === "IN PROGRESS" || taskStatus === "IN_PROGRESS";
    }
    if (status === "QA") {
      return taskStatus === "QA" || taskStatus === "INSPECTION" || taskStatus === "UNDER INSPECTION";
    }
    if (status === "DONE") {
      return taskStatus === "DONE";
    }
    return taskStatus === status;
  });

  return (
    <>

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{ left: typeof window !== "undefined" && window.innerWidth < 768 ? 0 : leftOffset, width: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : (width ?? 896) }}
        className="fixed top-0 bottom-0 h-screen bg-background border-r border-surface-200 shadow-premium z-[45] flex flex-col min-w-0 overflow-hidden w-full md:w-auto"
      >
        {/* Drawer Header */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2.5 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 shrink-0 min-w-0 w-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span
                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white shrink-0"
                style={{ backgroundColor: phase.color_hex }}
              >
                {phase.name}
              </span>
              <span className="text-surface-300 text-xs shrink-0">›</span>
              <span className="text-[8px] font-bold text-surface-500 uppercase tracking-wider truncate">{zone.name}</span>
              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                block.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
                block.status === "ACTIVE" ? "bg-accent/10 text-accent" :
                "bg-surface-100 text-surface-400"
              }`}>
                {block.status}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-primary dark:text-white tracking-tight truncate">
              {zone.name} — Kanban Board
            </h2>
            <p className="text-[11px] text-surface-400 dark:text-surface-500 font-medium mt-0.5">
              {tasks.length} tasks · {block.completed_tasks}/{block.total_tasks} done
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap sm:justify-end w-full sm:w-auto max-w-full overflow-x-auto no-scrollbar">
            <select
              value={priorityFilter || ""}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className="h-8 px-2 bg-surface-100 dark:bg-surface-800 border border-transparent hover:border-surface-200 dark:hover:border-surface-700 rounded-lg outline-none focus:border-accent text-[9px] font-bold uppercase tracking-wider text-surface-400 transition-colors shrink-0 max-w-full"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            {!readOnly && userRole === "admin" && (
              <button
                onClick={() => {
                  setSelectedTemplateId("");
                  setNewTaskTitle("");
                  setTemplateDescription("");
                  setTaskChecklists([]);
                  setTaskSubtasks([]);
                  setNewChecklistInput("");
                  setNewSubtaskTitle("");
                  setNewSubtaskDesc("");
                  setSubtaskChecklistInputs({});
                  setIsAddingTask(true);
                }}
                className="h-8 px-3 bg-accent text-background font-bold text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shrink-0 whitespace-nowrap flex items-center gap-1 shadow-xs"
              >
                <span>+ Add Task</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-surface-100 hover:bg-red-500 hover:text-white text-surface-400 flex items-center justify-center transition-all font-bold shrink-0 text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Block Notes */}
        <div className="px-7 py-3 border-b border-surface-200 bg-surface-50 shrink-0">
          <textarea
            className="w-full text-xs text-foreground bg-surface-100 hover:bg-surface-100/80 border border-surface-300 focus:border-accent rounded-lg p-2.5 outline-none resize-none transition-all placeholder:text-surface-400 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            rows={2}
            disabled={readOnly}
            placeholder={readOnly ? "No notes added for this block." : "Add notes for this block... (e.g. key blockers, handover instructions)"}
            defaultValue={block.notes || ""}
            onBlur={async (e) => {
              if (e.target.value !== block.notes) {
                try {
                  const updated = await projectsApi.updateBlock(block.id, { notes: e.target.value });
                  onBlockUpdated({ ...block, notes: updated.notes });
                  toast.success("Notes saved.");
                } catch (err) {
                  toast.error("Failed to save notes.");
                }
              }
            }}
          />
        </div>

        {/* Locked banner */}
        {isLocked && (
          <div className="px-7 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-bold text-amber-400">
              This block is <strong>Locked</strong> — complete the previous milestone phase first to unlock.
            </p>
          </div>
        )}

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-4 h-full min-w-[720px]">
            {COLUMNS.map(col => {
              const colTasks = tasksByStatus(col.id);
              const isDragTarget = dragOverColumn === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={e => handleDrop(e, col.id)}
                  className={`
                    flex flex-col flex-1 min-w-[180px] max-w-[260px]
                    rounded-t-sm
                    ${isDragTarget
                      ? "border-semantic-blue bg-surface-100/50"
                      : `${col.color} ${isLocked ? "opacity-60" : ""}`
                    }
                  `}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-surface-200">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-surface-600">{col.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black tabular-nums bg-surface-200 px-2 py-0.5 rounded-full border border-surface-300 text-foreground">
                        {colTasks.length}
                      </span>
                      {col.id === "TODO" && !readOnly && userRole === "admin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId("");
                            setNewTaskTitle("");
                            setTemplateDescription("");
                            setTaskChecklists([]);
                            setTaskSubtasks([]);
                            setNewChecklistInput("");
                            setNewSubtaskTitle("");
                            setNewSubtaskDesc("");
                            setSubtaskChecklistInputs({});
                            setIsAddingTask(true);
                          }}
                          className="w-5 h-5 rounded bg-accent/15 hover:bg-accent/30 text-accent flex items-center justify-center text-xs font-black transition-colors"
                          title="Add Task to To Do"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cards scroll area */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                    {tasksByStatus(col.id).map(task => (
                      <TaskItem
                        key={task.uid}
                        task={task}
                        isLocked={isLocked}
                        onDragStart={(e) => handleDragStart(e, task.uid)}
                        onClick={() => onTaskSelect?.(task)}
                      />
                    ))}

                    {colTasks.length === 0 && (
                      <div className={`
                        h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1
                        ${isDragTarget
                          ? "border-accent bg-accent/10"
                          : "border-surface-300 bg-surface-50/50"
                        }
                      `}>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400">
                          {isDragTarget ? "Drop here" : "Empty"}
                        </span>
                        {col.id === "TODO" && !readOnly && userRole === "admin" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId("");
                              setNewTaskTitle("");
                              setTemplateDescription("");
                              setTaskChecklists([]);
                              setTaskSubtasks([]);
                              setNewChecklistInput("");
                              setNewSubtaskTitle("");
                              setNewSubtaskDesc("");
                              setSubtaskChecklistInputs({});
                              setIsAddingTask(true);
                            }}
                            className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                          >
                            + Add Task
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary footer */}
        <div className="px-7 py-3 border-t border-surface-200 bg-surface-100 shrink-0 flex items-center gap-6">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span className="text-[9px] font-bold text-surface-600">{col.label}</span>
              <span className="text-[9px] font-black tabular-nums text-foreground">{tasksByStatus(col.id).length}</span>
            </div>
          ))}
          <div className="ml-auto">
            <span className="text-[9px] font-bold text-accent">{block.progress_percent}% complete</span>
          </div>
        </div>

        {/* ── Create Task Modal with Templates, Checklists & Subtasks ──────────── */}
        {isAddingTask && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-surface-50 border border-surface-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-surface-200 bg-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-lg">
                    ✨
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-accent/15 text-accent rounded border border-accent/25">
                        {zone.name}
                      </span>
                      <span className="text-xs text-surface-500 font-semibold">
                        → {phase.name}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-foreground">Create New Task</h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Template Selector Card */}
                {taskTemplates.length > 0 && (
                  <div className="p-3 bg-surface-100 border border-surface-300 rounded-xl space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600 flex items-center justify-between">
                      <span>Pre-fill from Architectural Template</span>
                      {selectedTemplateId && (
                        <button
                          type="button"
                          onClick={() => handleSelectTemplate("")}
                          className="text-[10px] text-accent hover:underline normal-case font-bold"
                        >
                          Clear Selection
                        </button>
                      )}
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full h-9 px-3 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-accent text-xs font-bold text-foreground transition-colors appearance-none"
                    >
                      <option value="" className="bg-surface-100 text-foreground">— Choose a standard template (optional) —</option>
                      {taskTemplates.map((tpl: any) => (
                        <option key={tpl.id} value={String(tpl.id)} className="bg-surface-100 text-foreground">
                          {tpl.name} ({tpl.default_duration_days || 1}d) • {tpl.default_checklists?.length || 0} checkpoints • {tpl.default_subtasks?.length || 0} subtasks
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Task Title & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      Task Title *
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Phase 1: Foundation Pouring & Curing"
                      className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-xl text-xs font-bold text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      Priority
                    </label>
                    <select
                      defaultValue="MEDIUM"
                      className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-xl text-xs font-bold text-foreground outline-none focus:border-accent appearance-none"
                    >
                      <option value="HIGH" className="bg-surface-100 text-foreground">High Priority</option>
                      <option value="MEDIUM" className="bg-surface-100 text-foreground">Medium Priority</option>
                      <option value="LOW" className="bg-surface-100 text-foreground">Low Priority</option>
                    </select>
                  </div>
                </div>

                {/* Execution Directives */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                    Execution Directives / Requirements
                  </label>
                  <textarea
                    rows={2}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Add architectural specifications or operational notes..."
                    className="w-full p-2.5 bg-surface-100 border border-surface-300 rounded-xl text-xs font-medium text-foreground outline-none focus:border-accent transition-all resize-none leading-relaxed placeholder:text-surface-400"
                  />
                </div>

                {/* Primary Quality & Inspection Checklists */}
                <div className="space-y-2 pt-2 border-t border-surface-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> Primary Checklists ({taskChecklists.length})
                    </span>
                  </label>

                  {taskChecklists.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {taskChecklists.map((cl, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 border border-surface-300 rounded-lg group"
                        >
                          <span className="text-emerald-400 text-xs shrink-0 font-bold">✓</span>
                          <span className="flex-1 text-xs font-medium text-foreground truncate">{cl}</span>
                          <button
                            type="button"
                            onClick={() => setTaskChecklists(prev => prev.filter((_, i) => i !== idx))}
                            className="w-5 h-5 rounded hover:bg-red-500/15 text-surface-400 hover:text-red-400 flex items-center justify-center text-xs font-bold transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChecklistInput}
                      onChange={(e) => setNewChecklistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newChecklistInput.trim()) {
                            setTaskChecklists(prev => [...prev, newChecklistInput.trim()]);
                            setNewChecklistInput("");
                          }
                        }
                      }}
                      placeholder="Add checklist item (Press Enter)..."
                      className="flex-1 h-8.5 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs font-medium text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newChecklistInput.trim()) {
                          setTaskChecklists(prev => [...prev, newChecklistInput.trim()]);
                          setNewChecklistInput("");
                        }
                      }}
                      className="h-8.5 px-3 bg-accent text-background rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Subtask Templates Section */}
                <div className="space-y-3 pt-2 border-t border-surface-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="text-indigo-400">📁</span> Subtasks & Nested Checklists ({taskSubtasks.length})
                  </label>

                  {taskSubtasks.length > 0 && (
                    <div className="space-y-2.5">
                      {taskSubtasks.map((sub, sIdx) => (
                        <div key={sIdx} className="bg-surface-100 border border-surface-300 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-black shrink-0">
                                {sIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">{sub.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTaskSubtasks(prev => prev.filter((_, i) => i !== sIdx))}
                              className="text-surface-400 hover:text-red-400 p-1 transition-colors text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>

                          {sub.description && (
                            <p className="text-[11px] text-surface-600 pl-7">{sub.description}</p>
                          )}

                          {/* Nested Checkpoints */}
                          <div className="pl-7 space-y-1.5 pt-1">
                            {(sub.checklists || []).map((cl: string, cIdx: number) => (
                              <div key={cIdx} className="flex items-center justify-between gap-2 text-[11px] text-foreground bg-surface-50 px-2.5 py-1 rounded-md border border-surface-200">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-[9px] text-emerald-400">●</span>
                                  <span className="truncate">{cl}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTaskSubtasks(prev => {
                                      const updated = [...prev];
                                      if (updated[sIdx]?.checklists) {
                                        updated[sIdx].checklists = updated[sIdx].checklists.filter((_: any, i: number) => i !== cIdx);
                                      }
                                      return updated;
                                    });
                                  }}
                                  className="text-surface-400 hover:text-red-400 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}

                            {/* Add checkpoint input for this specific subtask */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={subtaskChecklistInputs[sIdx] || ""}
                                onChange={(e) => setSubtaskChecklistInputs(prev => ({ ...prev, [sIdx]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const text = (subtaskChecklistInputs[sIdx] || "").trim();
                                    if (text) {
                                      setTaskSubtasks(prev => {
                                        const updated = [...prev];
                                        const cur = updated[sIdx]?.checklists || [];
                                        updated[sIdx] = { ...updated[sIdx], checklists: [...cur, text] };
                                        return updated;
                                      });
                                      setSubtaskChecklistInputs(prev => ({ ...prev, [sIdx]: "" }));
                                    }
                                  }
                                }}
                                placeholder="Add checkpoint to this subtask..."
                                className="flex-1 h-7 px-2 bg-surface-50 border border-surface-300 rounded text-[11px] text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const text = (subtaskChecklistInputs[sIdx] || "").trim();
                                  if (text) {
                                    setTaskSubtasks(prev => {
                                      const updated = [...prev];
                                      const cur = updated[sIdx]?.checklists || [];
                                      updated[sIdx] = { ...updated[sIdx], checklists: [...cur, text] };
                                      return updated;
                                    });
                                    setSubtaskChecklistInputs(prev => ({ ...prev, [sIdx]: "" }));
                                  }
                                }}
                                className="h-7 px-2.5 bg-surface-200 text-foreground text-[9px] font-bold uppercase tracking-wider rounded hover:bg-surface-300 transition-all shrink-0"
                              >
                                + Checkpoint
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Subtask Box */}
                  <div className="bg-surface-100/70 border border-dashed border-surface-300 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      + Add Subtask
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Subtask title (e.g. Rebar inspection)..."
                        className="w-full h-8 px-3 bg-surface-50 border border-surface-300 rounded-lg text-xs font-semibold text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubtaskDesc}
                          onChange={(e) => setNewSubtaskDesc(e.target.value)}
                          placeholder="Optional subtask directive..."
                          className="flex-1 h-8 px-3 bg-surface-50 border border-surface-300 rounded-lg text-xs text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newSubtaskTitle.trim()) {
                              toast.error("Please enter a subtask title.");
                              return;
                            }
                            setTaskSubtasks(prev => [
                              ...prev,
                              {
                                title: newSubtaskTitle.trim(),
                                description: newSubtaskDesc.trim() || undefined,
                                checklists: [],
                              }
                            ]);
                            setNewSubtaskTitle("");
                            setNewSubtaskDesc("");
                          }}
                          className="h-8 px-3 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all shrink-0"
                        >
                          + Add Subtask
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-100">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="h-9 px-5 rounded-xl border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="h-9 px-6 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/20 disabled:opacity-50"
                >
                  Create Task
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* On Hold Prompt Modal */}
        {onHoldPromptTask && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
            <div className="bg-surface-50 border border-surface-300 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-surface-200 pb-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-lg">
                  ⏸️
                </span>
                <div>
                  <h3 className="text-base font-black text-foreground">Why is this task on hold?</h3>
                  <p className="text-xs text-surface-500">Moving <strong className="text-foreground">"{onHoldPromptTask.taskTitle}"</strong> to On Hold.</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirmOnHoldDrop();
                }}
                className="space-y-4"
              >
                <textarea
                  value={onHoldReasonText}
                  onChange={(e) => setOnHoldReasonText(e.target.value)}
                  placeholder="e.g. Waiting for material delivery / client approval..."
                  rows={3}
                  required
                  autoFocus
                  className="w-full p-3 bg-surface-100 border border-surface-300 rounded-xl text-xs font-medium text-foreground outline-none focus:border-accent transition-all resize-none leading-relaxed placeholder:text-surface-400"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOnHoldPromptTask(null);
                      setOnHoldReasonText("");
                    }}
                    className="px-4 py-2 rounded-xl border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!onHoldReasonText.trim()}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    Confirm On Hold
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </motion.div>

    </>
  );
};
