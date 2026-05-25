"use client";
import React, { useState, useCallback } from "react";
import {
  MilestoneBlockExpanded, Task, TaskStatus,
  MilestonePhase, SpatialZone
} from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { TaskItem } from "../projects/TaskItem";
import { TaskExecutionModal } from "../projects/TaskExecutionModal";
import { toast } from "sonner";

interface KanbanDrawerProps {
  block: MilestoneBlockExpanded;
  phase: MilestonePhase;
  zone: SpatialZone;
  isOpen: boolean;
  onClose: () => void;
  onBlockUpdated: (updated: MilestoneBlockExpanded) => void;
  userRole?: "contractor" | "qa_inspector" | "admin";
  projectUid?: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-surface-100 border-surface-200", dotColor: "bg-surface-400" },
  { id: "WIP", label: "In Progress", color: "bg-blue-50 border-blue-100", dotColor: "bg-accent" },
  { id: "QA", label: "Under Inspection", color: "bg-amber-50 border-amber-100", dotColor: "bg-amber-400" },
  { id: "DONE", label: "Done", color: "bg-emerald-50 border-emerald-100", dotColor: "bg-emerald-500" },
];

export const KanbanDrawer: React.FC<KanbanDrawerProps> = ({
  block,
  phase,
  zone,
  isOpen,
  onClose,
  onBlockUpdated,
  userRole = "admin",
  projectUid,
}) => {
  const [tasks, setTasks] = useState<Task[]>(block.tasks || []);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const isLocked = block.status === "LOCKED";

  // Sync tasks if block updates from backend/websockets
  React.useEffect(() => {
    setTasks(block.tasks || []);
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
    setTasks(prev => prev.map(t => t.uid === draggingTaskId ? { ...t, status: targetStatus } : t));
    setDraggingTaskId(null);

    try {
      const updated = await projectsApi.updateTask(draggingTaskId, { status: targetStatus });
      setTasks(prev => prev.map(t => t.uid === updated.uid ? updated : t));
      onBlockUpdated({ ...block, tasks: tasks.map(t => t.uid === updated.uid ? updated : t) });
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
        project: block.project_id,
        block: block.id,
        title: newTaskTitle.trim(),
      });
      setTasks(prev => [...prev, created]);
      setNewTaskTitle("");
      setIsAddingTask(false);
      toast.success("Task added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add task.");
    }
  };

  // ── Task Updated callback ────────────────────────────────────────────────────
  const handleTaskUpdated = (updated: Task) => {
    setTasks(prev => prev.map(t => t.uid === updated.uid ? updated : t));
    if (selectedTask?.uid === updated.uid) setSelectedTask(updated);
  };

  const handleTaskDeleted = (taskId: string) => {
    const newTasks = tasks.filter(t => t.uid !== taskId);
    setTasks(newTasks);
    onBlockUpdated({ ...block, tasks: newTasks });
    if (selectedTask?.uid === taskId) setSelectedTask(null);
  };

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`
        fixed right-0 top-0 bottom-0 z-40 w-full max-w-5xl
        bg-white shadow-2xl border-l border-surface-200
        flex flex-col overflow-hidden
        transition-transform duration-300 ease-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-surface-100 bg-surface-50 shrink-0">
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
            <h2 className="text-xl font-extrabold text-primary tracking-tight">
              {zone.name} — Kanban Board
            </h2>
            <p className="text-xs text-surface-400 font-medium mt-0.5">
              {tasks.length} tasks · {block.completed_tasks}/{block.total_tasks} done
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userRole === "admin" && (
              <button
                onClick={() => setIsAddingTask(true)}
                className="h-9 px-4 bg-accent text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary transition-all"
              >
                + Add Task
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-surface-100 hover:bg-red-500 hover:text-white text-surface-500 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Locked banner */}
        {isLocked && (
          <div className="px-7 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs font-bold text-amber-700">
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
              className="flex-1 h-10 bg-white border border-surface-200 rounded-xl px-4 outline-none focus:border-accent text-sm font-bold text-primary"
            />
            <button onClick={handleAddTask} className="h-10 px-5 bg-accent text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary transition-all">
              Add
            </button>
            <button onClick={() => { setIsAddingTask(false); setNewTaskTitle(""); }} className="h-10 px-4 text-surface-500 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-surface-100 transition-all">
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
                    border-2 rounded-2xl transition-all duration-150
                    ${isDragTarget
                      ? "border-accent bg-accent/5 shadow-lg scale-[1.01]"
                      : `${col.color} ${isLocked ? "opacity-60" : ""}`
                    }
                  `}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">{col.label}</span>
                    </div>
                    <span className="text-[10px] font-black tabular-nums bg-white px-2 py-0.5 rounded-full border border-surface-200 text-surface-600">
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
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}

                    {colTasks.length === 0 && (
                      <div className={`
                        h-24 rounded-xl border-2 border-dashed flex items-center justify-center
                        transition-all duration-150
                        ${isDragTarget
                          ? "border-accent bg-accent/10"
                          : "border-surface-200/60"
                        }
                      `}>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-surface-300">
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
        <div className="px-7 py-3 border-t border-surface-100 bg-surface-50 shrink-0 flex items-center gap-6">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span className="text-[9px] font-bold text-surface-500">{col.label}</span>
              <span className="text-[9px] font-black tabular-nums text-primary">{tasksByStatus(col.id).length}</span>
            </div>
          ))}
          <div className="ml-auto">
            <span className="text-[9px] font-bold text-surface-400">{block.progress_percent}% complete</span>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskExecutionModal
          task={selectedTask}
          projectUid={projectUid}
          projectAssets={[]}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            projectsApi.getTask(selectedTask.uid).then(updated => {
              handleTaskUpdated(updated);
              setSelectedTask(updated);
            });
          }}
        />
      )}
    </>
  );
};
