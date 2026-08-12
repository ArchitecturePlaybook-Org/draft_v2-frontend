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

  // Sync tasks whenever block or block.tasks prop updates
  React.useEffect(() => {
    if (block?.tasks) {
      setTasks(block.tasks.filter((t: any) => t && !t.is_deleted));
    }
  }, [block, block?.tasks]);

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
        status: "TODO",
      });
      
      const createdTask: Task = {
        ...created,
        status: created.status || "TODO",
      };

      const currentTasks = Array.isArray(tasks) ? tasks : [];
      const exists = currentTasks.some(t => (createdTask.uid && t.uid === createdTask.uid) || (createdTask.id && t.id === createdTask.id));
      const updatedTasks = exists ? currentTasks : [...currentTasks, createdTask];
      
      setTasks(updatedTasks);
      onBlockUpdated(getUpdatedBlock(block, updatedTasks));
      setNewTaskTitle("");
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
                onClick={() => setIsAddingTask(true)}
                className="h-8 px-3 bg-accent text-background font-bold text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shrink-0 whitespace-nowrap"
              >
                + Add Task
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-red-500 hover:text-white text-surface-500 text-surface-400 flex items-center justify-center transition-all font-bold shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Block Notes */}
        <div className="px-7 py-3 border-b border-surface-100 dark:border-surface-800 bg-surface-100 bg-background shrink-0">
          <textarea
            className="w-full text-xs text-surface-600 text-surface-300 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-900 border border-transparent hover:border-surface-200 dark:hover:border-surface-700 focus:border-accent focus:bg-surface-100 dark:focus:bg-surface-900 rounded-lg p-3 outline-none resize-none transition-all placeholder:text-surface-300 dark:placeholder:text-surface-600 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="px-7 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              This block is <strong>Locked</strong> — complete the previous milestone phase first to unlock.
            </p>
          </div>
        )}

        {/* Quick-add task bar */}
        {isAddingTask && (
          <div className="px-7 py-3 bg-accent/5 border-b border-accent/20 flex items-center gap-3">
            <input
              autoFocus
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") setIsAddingTask(false);
              }}
              placeholder="New task title..."
              className="flex-1 h-10 bg-surface-100 bg-background border border-surface-200 border-surface-200 rounded-xl px-4 outline-none focus:border-accent text-sm font-bold text-primary dark:text-white"
            />
            <button onClick={handleAddTask} className="h-10 px-5 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all">
              Add
            </button>
            <button onClick={() => { setIsAddingTask(false); setNewTaskTitle(""); }} className="h-10 px-4 text-surface-500 text-surface-400 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">
              Cancel
            </button>
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
                  <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{col.label}</span>
                    </div>
                    <span className="text-[10px] font-black tabular-nums bg-surface-100 px-2 py-0.5 rounded-full border border-surface-200 text-text-secondary">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards scroll area */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5">
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
                        h-24 rounded-xl border-2 border-dashed flex items-center justify-center
                        ${isDragTarget
                          ? "border-accent bg-accent/10"
                          : "border-surface-200/60 border-surface-200/60"
                        }
                      `}>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-surface-300 dark:text-surface-600">
                          {isDragTarget ? "Drop here" : "Empty"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary footer */}
        <div className="px-7 py-3 border-t border-surface-100 dark:border-surface-800 bg-surface-50 bg-background shrink-0 flex items-center gap-6">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span className="text-[9px] font-bold text-surface-500 text-surface-400">{col.label}</span>
              <span className="text-[9px] font-black tabular-nums text-primary dark:text-white">{tasksByStatus(col.id).length}</span>
            </div>
          ))}
          <div className="ml-auto">
            <span className="text-[9px] font-bold text-surface-400">{block.progress_percent}% complete</span>
          </div>
        </div>

        {/* On Hold Prompt Modal */}
        {onHoldPromptTask && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-background border border-surface-200 dark:border-surface-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-surface-200 dark:border-surface-700 pb-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                  ⏸️
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-primary dark:text-white">Why is this task on hold?</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Moving <strong className="text-primary dark:text-white">"{onHoldPromptTask.taskTitle}"</strong> to On Hold.</p>
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
                  className="w-full p-3.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-medium text-primary dark:text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none leading-relaxed"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOnHoldPromptTask(null);
                      setOnHoldReasonText("");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!onHoldReasonText.trim()}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
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
