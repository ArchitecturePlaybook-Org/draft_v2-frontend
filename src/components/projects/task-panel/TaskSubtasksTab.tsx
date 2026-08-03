import React, { useState } from "react";
import Link from "next/link";
import { Task } from "@/types/projects";
import { Plus, X, Layers } from "lucide-react";

interface TaskSubtasksTabProps {
  task: Task;
  isUpdating: boolean;
  isAdmin: boolean;
  isArchitect: boolean;
  handleUpdateSubtask: (subtaskUid: string, data: any) => void;
  handleCreateSubtask: (title: string, description: string) => void;
  handleDeleteSubtask?: (subtaskUid: string) => void;
  onSelectSubtask?: (subtask: Task) => void;
}

export const TaskSubtasksTab: React.FC<TaskSubtasksTabProps> = ({
  task,
  isUpdating,
  isAdmin,
  isArchitect,
  handleUpdateSubtask,
  handleCreateSubtask,
  handleDeleteSubtask,
  onSelectSubtask,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto h-[calc(100vh-280px)] p-2">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-surface-100 dark:bg-surface-800/80 border-surface-200 dark:border-surface-700 p-6 rounded-2xl border shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-extrabold text-primary dark:text-white tracking-tight">Subtasks</h3>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium ml-8">
            Break this task down into smaller actionable steps.
          </p>
        </div>

        {(isAdmin || isArchitect) && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-background text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-accent/20 hover:scale-105 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Subtask
          </button>
        )}
      </div>

      {/* Subtask Cards Grid */}
      <div className="flex-1 overflow-y-auto p-2 pb-6 custom-scrollbar">
        {task.subtasks && task.subtasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
            {task.subtasks.map((subtask: any) => (
              <div 
                key={subtask.uid} 
                onClick={() => {
                  if (onSelectSubtask) {
                    onSelectSubtask(subtask);
                  } else {
                    const nextStatus = subtask.status === "TODO" ? "ON_HOLD" : subtask.status === "ON_HOLD" ? "WIP" : subtask.status === "WIP" ? "DONE" : "TODO";
                    handleUpdateSubtask(subtask.uid, { status: nextStatus });
                  }
                }}
                className={`group p-6 rounded-2xl border-l-4 border-r border-t border-b border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/90 shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-accent relative z-10 flex flex-col justify-between min-h-[175px] ${
                  subtask.status === "DONE" ? "border-l-emerald-500" :
                  subtask.status === "ON_HOLD" ? "border-l-amber-500" :
                  subtask.status === "WIP" ? "border-l-blue-500" :
                  subtask.status === "QA" ? "border-l-purple-500" :
                  "border-l-slate-400"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <h4 className={`text-sm font-extrabold tracking-tight line-clamp-2 ${subtask.status === "DONE" ? "text-surface-500 dark:text-surface-400 line-through" : "text-primary dark:text-white"}`}>{subtask.title}</h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = subtask.status === "TODO" ? "ON_HOLD" : subtask.status === "ON_HOLD" ? "WIP" : subtask.status === "WIP" ? "DONE" : "TODO";
                          handleUpdateSubtask(subtask.uid, { status: nextStatus });
                        }}
                        className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all hover:scale-105 shadow-sm ${
                          subtask.status === "DONE" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" :
                          subtask.status === "ON_HOLD" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" :
                          subtask.status === "WIP" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" :
                          subtask.status === "QA" ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" :
                          "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600"
                        }`}
                        title="Click to toggle status"
                      >
                        {subtask.status === "ON_HOLD" ? "ON HOLD" : subtask.status}
                      </button>

                      {handleDeleteSubtask && (isAdmin || isArchitect) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete subtask "${subtask.title}"?`)) {
                              handleDeleteSubtask(subtask.uid);
                            }
                          }}
                          className="p-1 text-xs hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                          title="Delete Subtask"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  {subtask.description && (
                    <p className={`text-xs mt-2 line-clamp-3 leading-relaxed ${subtask.status === "DONE" ? "text-emerald-700/60 dark:text-emerald-400/60" : "text-surface-500 dark:text-surface-400"}`}>{subtask.description}</p>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-surface-200/60 dark:border-surface-700/60 flex items-center justify-between">
                  {subtask.assigned_to ? (
                    <Link href={`/dashboard/team/${subtask.assigned_to.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <div className="w-5 h-5 rounded-full bg-accent text-background flex items-center justify-center text-[8px] font-bold uppercase">
                        {subtask.assigned_to.name.charAt(0)}
                      </div>
                      <span className={`text-[10px] font-bold hover:underline ${subtask.status === "DONE" ? "text-emerald-700/60 dark:text-emerald-400/60" : "text-surface-500 dark:text-surface-400"}`}>{subtask.assigned_to.name}</span>
                    </Link>
                  ) : (
                    <span className="text-[10px] font-bold text-surface-400 dark:text-surface-500">Unassigned</span>
                  )}
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 bg-surface-50 dark:bg-surface-800/40 rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center">
            <Layers className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-600 dark:text-surface-300 font-extrabold text-base mb-1">No subtasks added yet.</p>
            <p className="text-xs text-surface-400 dark:text-surface-500 max-w-sm mb-4">Click "Create Subtask" above to break this task into smaller manageable action items.</p>
            {(isAdmin || isArchitect) && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add First Subtask
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Subtask Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-background border border-surface-200 dark:border-surface-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-primary dark:text-white">Create New Subtask</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">Add a new action item under this task.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-primary transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get("title") as string;
                const description = formData.get("description") as string;
                if (title.trim()) {
                  handleCreateSubtask(title.trim(), description?.trim() || "");
                  setShowCreateModal(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500 dark:text-surface-400">Subtask Title *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Inspect foundation rebar spacing"
                  className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-3 text-sm font-bold text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-surface-400 transition-all"
                  required
                  autoFocus
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500 dark:text-surface-400">Description (Optional)</label>
                <textarea
                  name="description"
                  placeholder="Provide additional details or specifications for this subtask..."
                  rows={3}
                  className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-3 text-xs font-medium text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-surface-400 transition-all resize-none leading-relaxed"
                  disabled={isUpdating}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isUpdating}
                  className="px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-background text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {isUpdating ? "Creating..." : "Create Subtask"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
