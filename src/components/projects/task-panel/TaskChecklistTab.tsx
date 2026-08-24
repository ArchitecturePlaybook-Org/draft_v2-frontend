import React, { useState } from "react";
import { Task, TaskChecklistItem } from "@/types/projects";
import { CheckCircle2, Circle, Trash2, Plus, Camera, Info } from "lucide-react";

interface ChecklistTemplate {
  id: number;
  name: string;
  items?: any[];
}

interface TaskChecklistTabProps {
  task: Task;
  checklists: TaskChecklistItem[];
  handleAddChecklistItem: (title: string, type: "pre" | "during" | "post", description: string) => void;
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

  // Local state for the new advanced checklist item form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"pre" | "during" | "post">("during");
  const [newDesc, setNewDesc] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTitle.trim()) return;
    handleAddChecklistItem(newTitle.trim(), newType, newDesc.trim());
    setNewTitle("");
    setNewType("during");
    setNewDesc("");
  };

  // Group checklists by type
  const preItems = checklists.filter(i => i.type === "pre");
  const duringItems = checklists.filter(i => i.type === "during" || !i.type);
  const postItems = checklists.filter(i => i.type === "post");

  const renderGroup = (title: string, items: TaskChecklistItem[], colorClass: string, bgClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-surface-400 flex items-center gap-1.5 px-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
          {title} ({items.length})
        </h4>
        <div className="bg-surface-100 border border-surface-300 rounded-xl overflow-hidden shadow-xs divide-y divide-surface-200">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`flex items-start gap-2.5 px-3.5 py-3 hover:bg-surface-200/50 transition-colors group ${
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
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 fill-emerald-500/10" />
                ) : (
                  <Circle className="w-4.5 h-4.5 text-surface-400 group-hover:text-accent transition-colors" />
                )}
              </button>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-start gap-2 justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      onClick={() => !readOnly && handleToggleChecklist(item)}
                      className={`text-xs font-semibold cursor-pointer transition-colors leading-snug ${
                        item.is_completed
                          ? "line-through text-surface-400 opacity-75"
                          : "text-foreground group-hover:text-accent"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className={`inline-flex items-center text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${bgClass} shrink-0`}>
                      {item.type || "during"}
                    </span>
                    {item.requires_visual_proof && (
                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                        <Camera className="w-2.5 h-2.5" /> Proof Req.
                      </span>
                    )}
                  </div>

                  {/* Delete button */}
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

                {/* Description */}
                {item.description && (
                  <p className={`text-[10px] leading-relaxed font-medium ${item.is_completed ? "text-surface-400 line-through opacity-70" : "text-surface-500"}`}>
                    {item.description}
                  </p>
                )}

                {/* Subtext info */}
                {item.is_completed && item.completed_by && (
                  <span className="text-[9px] text-surface-400 font-medium">
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
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
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

      {/* Checklist Items List Grouped */}
      <div className="space-y-4">
        {checklists.length === 0 ? (
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6 text-center">
            <p className="text-xl mb-1">📋</p>
            <p className="text-xs font-bold text-foreground">No checklist items yet</p>
            <p className="text-[10px] text-surface-500 mt-0.5">Add checkpoints below or import a template.</p>
          </div>
        ) : (
          <>
            {renderGroup("Pre-Construction Checkpoints", preItems, "bg-purple-400", "bg-purple-500/10 text-purple-400 border-purple-500/20")}
            {renderGroup("During Construction Checkpoints", duringItems, "bg-amber-400", "bg-amber-500/10 text-amber-400 border-amber-500/20")}
            {renderGroup("Post-Construction Checkpoints", postItems, "bg-emerald-400", "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}
          </>
        )}
      </div>

      {/* Add Checkpoint & Import Form */}
      {!readOnly && (isAdmin || isArchitect || isQA) && (
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-3 shadow-xs space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-surface-500 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-accent" /> Add New Checkpoint
          </h4>
          <form onSubmit={onSubmit} className="space-y-2.5">
            {/* Title & Type Select */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Checkpoint title (e.g. Foundation reinforcement inspection)"
                  required
                  disabled={isUpdating}
                  className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-accent text-xs font-semibold text-foreground placeholder:text-surface-400 transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  disabled={isUpdating}
                  className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-accent text-xs font-semibold text-foreground appearance-none"
                >
                  <option value="pre" className="bg-surface-100 text-foreground">Pre-Construction</option>
                  <option value="during" className="bg-surface-100 text-foreground">During Construction</option>
                  <option value="post" className="bg-surface-100 text-foreground">Post-Construction</option>
                </select>
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Checkpoint description / requirements (Optional)..."
                disabled={isUpdating}
                rows={2}
                className="w-full p-2 bg-surface-50 border border-surface-300 rounded-lg text-xs font-medium text-foreground outline-none focus:border-accent placeholder:text-surface-400 transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!newTitle.trim() || isUpdating}
                className="h-8 px-4 bg-accent text-background font-black text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                {isUpdating ? (
                  <span className="animate-spin text-xs">⟳</span>
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Add Checkpoint</span>
              </button>
            </div>
          </form>

          {/* Import Template Dropdown */}
          {checklistTemplates && checklistTemplates.length > 0 && (
            <div className="pt-3 border-t border-surface-200 flex gap-2 items-center">
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
