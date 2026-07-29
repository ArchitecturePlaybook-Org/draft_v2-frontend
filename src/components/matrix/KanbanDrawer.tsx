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
  userRole?: "contractor" | "qa_inspector" | "admin";
  projectUid?: string;
  /** Controlled panel width from parent split state */
  width?: number;
  /** Bubbles task click up to parent for split-pane rendering */
  onTaskSelect?: (task: Task) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: "TODO", label: "To Do", color: "border-t-[3px] border-surface-300 bg-transparent", dotColor: "bg-surface-300" },
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
  onTaskSelect,
}) => {
  const [tasks, setTasks] = useState<Task[]>(block.tasks || []);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const isLocked = block.status === "LOCKED";

  // Sync tasks whenever block.tasks prop updates
  React.useEffect(() => {
    if (block.tasks) {
      setTasks(block.tasks);
    }
  }, [block.tasks]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(col);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggingTaskId === null) return;

    const task = tasks.find(t => t.uid === draggingTaskId);
    if (!task || task.status === targetStatus) {
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

  const safeTasksList = Array.isArray(tasks) ? tasks : [];
  const filteredTasks = safeTasksList.filter(t => t && (!priorityFilter || t.priority === priorityFilter));
  
  const tasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => {
    if (!t) return false;
    const taskStatus = (t.status || "TODO").toUpperCase();
    if (status === "TODO") {
      return taskStatus === "TODO" || taskStatus === "PENDING";
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
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{ width: width ?? 896 }}
        className="fixed top-0 right-0 h-screen bg-background border-l border-surface-200 shadow-premium z-[45] flex flex-col"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: phase.color_hex }}
              >
                {phase.name}
              </span>
              <span className="text-surface-300 text-xs">›</span>
              <span className="text-[9px] font-bold text-surface-500 uppercase tracking-widest">{zone.name}</span>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ml-1 ${
                block.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
                block.status === "ACTIVE" ? "bg-accent/10 text-accent" :
                "bg-surface-100 text-surface-400"
              }`}>
                {block.status}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-primary dark:text-white tracking-tight">
              {zone.name} — Kanban Board
            </h2>
            <p className="text-xs text-surface-400 dark:text-surface-500 font-medium mt-0.5">
              {tasks.length} tasks · {block.completed_tasks}/{block.total_tasks} done
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={priorityFilter || ""}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className="h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-transparent hover:border-surface-200 dark:hover:border-surface-700 rounded-xl outline-none focus:border-accent text-[10px] font-bold uppercase tracking-widest text-surface-500 text-surface-400 transition-colors"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            {userRole === "admin" && (
              <button
                onClick={() => setIsAddingTask(true)}
                className="h-9 px-4 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
              >
                + Add Task
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-red-500 hover:text-white text-surface-500 text-surface-400 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Block Notes */}
        <div className="px-7 py-3 border-b border-surface-100 dark:border-surface-800 bg-surface-100 bg-background shrink-0">
          <textarea
            className="w-full text-xs text-surface-600 text-surface-300 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-900 border border-transparent hover:border-surface-200 dark:hover:border-surface-700 focus:border-accent focus:bg-surface-100 dark:focus:bg-surface-900 rounded-lg p-3 outline-none resize-none transition-all placeholder:text-surface-300 dark:placeholder:text-surface-600 font-medium"
            rows={2}
            placeholder="Add notes for this block... (e.g. key blockers, handover instructions)"
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
      </motion.div>

    </>
  );
};
