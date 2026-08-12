import React from "react";
import { Task, TaskChecklistItem } from "@/types/projects";
import { CheckCircle2, Circle, Trash2, Plus, Sparkles, Image, Camera } from "lucide-react";

interface ChecklistTemplate {
  id: number;
  name: string;
  items?: any[];
}

interface TaskChecklistTabProps {
  task: Task;
  checklists: TaskChecklistItem[];
  newChecklistDesc: string;
  setNewChecklistDesc: (val: string) => void;
  handleAddChecklistItem: () => void;
  handleToggleChecklist: (item: TaskChecklistItem) => void;
  handleDeleteChecklist?: (item: TaskChecklistItem) => void;
  isContractor: boolean;
  isUpdating: boolean;
  isAdmin: boolean;
  isArchitect: boolean;
  isQA: boolean;
  checklistTemplates: ChecklistTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (val: string) => void;
  handleImportTemplate: () => void;
  setLightboxImageUrl: (url: string | null) => void;
  readOnly?: boolean;
}

export const TaskChecklistTab: React.FC<TaskChecklistTabProps> = ({
  task,
  checklists,
  newChecklistDesc,
  setNewChecklistDesc,
  handleAddChecklistItem,
  handleToggleChecklist,
  handleDeleteChecklist,
  isContractor,
  isUpdating,
  isAdmin,
  isArchitect,
  isQA,
  checklistTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  handleImportTemplate,
  setLightboxImageUrl,
  readOnly = false,
}) => {
  const total = checklists.length;
  const completed = checklists.filter(i => i.is_completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress Bar & Summary */}
      {total > 0 && (
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Checklist Progress
            </span>
            <span className="text-[11px] font-black text-accent tabular-nums">
              {completed} of {total} completed ({percent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-accent to-emerald-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist Items List */}
      <div className="bg-surface-100 border border-surface-300 rounded-xl overflow-hidden shadow-xs divide-y divide-surface-200">
        {checklists.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xl mb-1">📋</p>
            <p className="text-xs font-bold text-foreground">No checklist items yet</p>
            <p className="text-[10px] text-surface-500 mt-0.5">Add checkpoints below or import a template.</p>
          </div>
        ) : (
          checklists.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-surface-200/50 transition-colors group ${
                item.is_completed ? "bg-surface-50/50" : ""
              }`}
            >
              {/* Checkbox Button */}
              <button
                type="button"
                onClick={() => !readOnly && handleToggleChecklist(item)}
                disabled={(isContractor && task.status !== "WIP") || isUpdating || readOnly}
                className="mt-0.5 shrink-0 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title={item.is_completed ? "Mark incomplete" : "Mark complete"}
              >
                {item.is_completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                ) : (
                  <Circle className="w-4 h-4 text-surface-400 group-hover:text-accent transition-colors" />
                )}
              </button>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    onClick={() => !readOnly && handleToggleChecklist(item)}
                    className={`text-xs font-medium cursor-pointer transition-colors leading-snug ${
                      item.is_completed
                        ? "line-through text-surface-500 opacity-75"
                        : "text-foreground group-hover:text-accent font-semibold"
                    }`}
                  >
                    {item.title}
                  </span>

                  {item.requires_visual_proof && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                      <Camera className="w-2.5 h-2.5" /> Proof Req.
                    </span>
                  )}
                </div>

                {/* Subtext info */}
                {item.is_completed && item.completed_by && (
                  <span className="text-[9px] text-surface-500">
                    Completed by {item.completed_by.email || item.completed_by.name}
                  </span>
                )}

                {/* Attachments preview */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex gap-1.5 mt-1">
                    {item.attachments.map((att: any) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setLightboxImageUrl(att.file)}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-surface-300 hover:border-accent block transition-opacity cursor-pointer focus:outline-none shrink-0"
                      >
                        <img src={att.file} alt="Proof" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete button on hover */}
              {!readOnly && handleDeleteChecklist && (isAdmin || isArchitect) && (
                <button
                  type="button"
                  onClick={() => handleDeleteChecklist(item)}
                  disabled={isUpdating}
                  className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-red-400 transition-all rounded hover:bg-red-500/10 shrink-0"
                  title="Remove checkpoint"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Checkpoint & Import Row */}
      {!readOnly && (isAdmin || isArchitect || isQA) && (
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-2.5 shadow-xs space-y-2">
          {/* Quick Add Row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newChecklistDesc}
              onChange={e => setNewChecklistDesc(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !isUpdating && handleAddChecklistItem()}
              placeholder="Add checkpoint description (Press Enter)..."
              disabled={isUpdating}
              className="flex-1 h-8.5 bg-surface-50 border border-surface-300 rounded-lg px-3 outline-none focus:border-accent text-xs font-medium text-foreground placeholder:text-surface-400 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAddChecklistItem}
              disabled={!newChecklistDesc.trim() || isUpdating}
              className="h-8.5 px-3 bg-accent text-background font-bold text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              {isUpdating ? (
                <span className="animate-spin text-xs">⟳</span>
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add</span>
            </button>
          </div>

          {/* Import Template Dropdown */}
          {checklistTemplates && checklistTemplates.length > 0 && (
            <div className="pt-2 border-t border-surface-200 flex gap-2 items-center">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="flex-1 h-8 bg-surface-50 border border-surface-300 rounded-lg px-2.5 outline-none focus:border-accent text-[11px] font-medium text-foreground appearance-none"
              >
                <option value="" disabled className="bg-surface-100 text-foreground">Import from global checklist template...</option>
                {checklistTemplates.map(t => (
                  <option key={t.id} value={t.id} className="bg-surface-100 text-foreground">{t.name} ({t.items?.length || 0} items)</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleImportTemplate}
                disabled={!selectedTemplateId || isUpdating}
                className="h-8 px-3 bg-surface-200 text-foreground font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-surface-300 transition-all disabled:opacity-40 whitespace-nowrap"
              >
                Import
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
