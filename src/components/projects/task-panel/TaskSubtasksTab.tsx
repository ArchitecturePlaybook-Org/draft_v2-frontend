import React, { useState } from "react";
import Link from "next/link";
import { Task, TaskChecklistItem } from "@/types/projects";
import { Plus, X, Layers, CheckSquare, ListChecks, Trash2 } from "lucide-react";
import { TaskChecklistTab } from "./TaskChecklistTab";

interface ChecklistTemplate {
  id: number;
  name: string;
  items?: any[];
}

interface TaskSubtasksTabProps {
  task: Task;
  isUpdating: boolean;
  isAdmin: boolean;
  isArchitect: boolean;
  isContractor?: boolean;
  isQA?: boolean;
  readOnly?: boolean;
  handleUpdateSubtask: (subtaskUid: string, data: any) => void;
  handleCreateSubtask: (title: string, description: string) => void;
  handleDeleteSubtask?: (subtaskUid: string) => void;
  onSelectSubtask?: (subtask: Task) => void;
  // Checklist props for unified view
  checklists?: TaskChecklistItem[];
  newChecklistDesc?: string;
  setNewChecklistDesc?: (val: string) => void;
  handleAddChecklistItem?: () => void;
  handleToggleChecklist?: (item: TaskChecklistItem) => void;
  handleDeleteChecklist?: (item: TaskChecklistItem) => void;
  checklistTemplates?: ChecklistTemplate[];
  selectedTemplateId?: string;
  setSelectedTemplateId?: (val: string) => void;
  handleImportTemplate?: () => void;
  setLightboxImageUrl?: (url: string | null) => void;
}

export const TaskSubtasksTab: React.FC<TaskSubtasksTabProps> = ({
  task,
  isUpdating,
  isAdmin,
  isArchitect,
  isContractor = false,
  isQA = false,
  readOnly = false,
  handleUpdateSubtask,
  handleCreateSubtask,
  handleDeleteSubtask,
  onSelectSubtask,
  checklists = [],
  newChecklistDesc = "",
  setNewChecklistDesc = () => {},
  handleAddChecklistItem = () => {},
  handleToggleChecklist = () => {},
  handleDeleteChecklist = () => {},
  checklistTemplates = [],
  selectedTemplateId = "",
  setSelectedTemplateId = () => {},
  handleImportTemplate = () => {},
  setLightboxImageUrl = () => {},
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const completedChecklistsCount = checklists.filter(i => i.is_completed).length;

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto p-1">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-surface-100 border border-surface-300 px-4 py-3 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
            <ListChecks className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Subtasks & Quality Checklists</h3>
            <p className="text-[10px] text-surface-500">
              Manage operational action items and quality verification checkpoints.
            </p>
          </div>
        </div>

        {!readOnly && (isAdmin || isArchitect) && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-accent hover:opacity-90 text-background text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subtask</span>
          </button>
        )}
      </div>

      {/* Main Content Sections */}
      <div className="space-y-4">
        {/* Section 1: Subtasks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Subtasks ({task.subtasks?.length || 0})
              </h4>
            </div>
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="text-[9px] font-bold text-surface-500">
                Click status pill to toggle • Click card for details
              </span>
            )}
          </div>

          {task.subtasks && task.subtasks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {task.subtasks.map((subtask: any) => (
                <div
                  key={subtask.uid}
                  onClick={() => {
                    if (onSelectSubtask) {
                      onSelectSubtask(subtask);
                    } else if (!readOnly) {
                      const nextStatus = subtask.status === "TODO" ? "ON_HOLD" : subtask.status === "ON_HOLD" ? "WIP" : subtask.status === "WIP" ? "DONE" : "TODO";
                      handleUpdateSubtask(subtask.uid, { status: nextStatus });
                    }
                  }}
                  className={`group p-3 rounded-xl border border-surface-300 bg-surface-100 shadow-xs cursor-pointer transition-all hover:border-accent hover:shadow-sm flex flex-col justify-between min-h-[95px] ${
                    subtask.status === "DONE" ? "border-l-4 border-l-emerald-500" :
                    subtask.status === "ON_HOLD" ? "border-l-4 border-l-amber-500" :
                    subtask.status === "WIP" ? "border-l-4 border-l-blue-500" :
                    subtask.status === "QA" ? "border-l-4 border-l-purple-500" :
                    "border-l-4 border-l-surface-400"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h5 className={`text-xs font-bold line-clamp-1 ${subtask.status === "DONE" ? "text-surface-500 line-through opacity-70" : "text-foreground"}`}>
                        {subtask.title}
                      </h5>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (readOnly) return;
                            const nextStatus = subtask.status === "TODO" ? "ON_HOLD" : subtask.status === "ON_HOLD" ? "WIP" : subtask.status === "WIP" ? "DONE" : "TODO";
                            handleUpdateSubtask(subtask.uid, { status: nextStatus });
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border transition-all ${
                            subtask.status === "DONE" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                            subtask.status === "ON_HOLD" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                            subtask.status === "WIP" ? "bg-blue-500/20 text-blue-400 border-blue-500/40" :
                            subtask.status === "QA" ? "bg-purple-500/20 text-purple-400 border-purple-500/40" :
                            "bg-surface-200 text-foreground border-surface-300"
                          }`}
                        >
                          {subtask.status === "ON_HOLD" ? "HOLD" : subtask.status}
                        </button>

                        {!readOnly && handleDeleteSubtask && (isAdmin || isArchitect) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete subtask "${subtask.title}"?`)) {
                                handleDeleteSubtask(subtask.uid);
                              }
                            }}
                            className="p-1 text-surface-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Subtask"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {subtask.description && (
                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${subtask.status === "DONE" ? "text-surface-500 opacity-70" : "text-surface-600"}`}>
                        {subtask.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-surface-200 flex items-center justify-between text-[10px]">
                    {subtask.assigned_to ? (
                      <span className="flex items-center gap-1.5 text-foreground font-medium">
                        <span className="w-4 h-4 rounded-full bg-accent text-background flex items-center justify-center text-[7px] font-bold uppercase">
                          {subtask.assigned_to.name?.charAt(0) || "U"}
                        </span>
                        <span className="truncate max-w-[120px]">{subtask.assigned_to.name}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-surface-500">Unassigned</span>
                    )}
                    <span className="text-[9px] font-bold text-accent group-hover:translate-x-0.5 transition-transform">
                      Details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 bg-surface-100/50 rounded-xl border border-dashed border-surface-300 p-4 text-center">
              <p className="text-foreground text-xs font-bold mb-1">No subtasks added yet.</p>
              {!readOnly && (isAdmin || isArchitect) && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-2.5 py-1 bg-accent/15 hover:bg-accent/25 text-accent text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-accent/30"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add First Subtask</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Quality & Inspection Checklists */}
        <div className="space-y-2 pt-3 border-t border-surface-300">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Quality & Inspection Checklists ({completedChecklistsCount}/{checklists.length} Completed)
              </h4>
            </div>
          </div>

          <TaskChecklistTab
            task={task}
            checklists={checklists}
            newChecklistDesc={newChecklistDesc}
            setNewChecklistDesc={setNewChecklistDesc}
            handleAddChecklistItem={handleAddChecklistItem}
            handleToggleChecklist={handleToggleChecklist}
            handleDeleteChecklist={handleDeleteChecklist}
            isContractor={isContractor}
            isUpdating={isUpdating}
            isAdmin={isAdmin}
            isArchitect={isArchitect}
            isQA={isQA}
            checklistTemplates={checklistTemplates}
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={setSelectedTemplateId}
            handleImportTemplate={handleImportTemplate}
            setLightboxImageUrl={setLightboxImageUrl}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Create Subtask Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-50 border border-surface-300 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
                  <Plus className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-foreground">Create Subtask</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
              >
                ✕
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
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-surface-600">Title *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Inspect foundation rebar spacing"
                  className="w-full bg-surface-100 border border-surface-300 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-accent placeholder:text-surface-400 transition-all"
                  required
                  autoFocus
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-surface-600">Description (Optional)</label>
                <textarea
                  name="description"
                  placeholder="Specifications or notes..."
                  rows={2}
                  className="w-full bg-surface-100 border border-surface-300 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:border-accent placeholder:text-surface-400 transition-all resize-none leading-relaxed"
                  disabled={isUpdating}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isUpdating}
                  className="px-3.5 py-1.5 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-accent hover:opacity-90 text-background text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isUpdating ? "Saving..." : "Create"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
