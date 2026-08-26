import React, { useState } from "react";
import { Task, TaskChecklistItem } from "@/types/projects";
import { CheckCircle2, Circle, Trash2, Plus, Camera, Info, Upload } from "lucide-react";

interface ChecklistTemplate {
  id: number;
  name: string;
  items?: any[];
}

interface TaskChecklistTabProps {
  task: Task;
  checklists: TaskChecklistItem[];
  handleAddChecklistItem: (title: string, type: "pre" | "during" | "post", description: string, requiresVisualProof?: boolean) => void;
  handleToggleChecklist: (item: TaskChecklistItem) => void;
  handleToggleNA?: (item: TaskChecklistItem) => void;
  handleUploadChecklistPhoto?: (item: TaskChecklistItem, file: File) => void;
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
  handleToggleNA,
  handleUploadChecklistPhoto,
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
  const naCount = checklists.filter(i => i.is_na).length;
  const completed = checklists.filter(i => i.is_completed && !i.is_na).length;
  const verifiedCount = completed + naCount;
  const percent = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  // Local state for the new advanced checklist item form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"pre" | "during" | "post">("during");
  const [newDesc, setNewDesc] = useState("");
  const [newRequiresProof, setNewRequiresProof] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTitle.trim()) return;
    handleAddChecklistItem(newTitle.trim(), newType, newDesc.trim(), newRequiresProof);
    setNewTitle("");
    setNewType("during");
    setNewDesc("");
    setNewRequiresProof(false);
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
                item.is_na ? "bg-amber-500/5 border-l-2 border-l-amber-500" : item.is_completed ? "bg-surface-50/50" : ""
              }`}
            >
              {/* Checkbox Button */}
              <button
                type="button"
                onClick={() => !readOnly && handleToggleChecklist(item)}
                disabled={(isContractor && task.status !== "WIP") || isUpdating || readOnly || item.is_na}
                className="mt-0.5 shrink-0 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title={item.is_na ? "Item is marked Not Applicable" : item.is_completed ? "Mark incomplete" : item.requires_visual_proof ? "Upload photo evidence to complete" : "Mark complete"}
              >
                {item.is_na ? (
                  <span className="w-4.5 h-4.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center text-[9px] font-black">
                    -
                  </span>
                ) : item.is_completed ? (
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
                      onClick={() => !readOnly && !item.is_na && handleToggleChecklist(item)}
                      className={`text-xs font-semibold cursor-pointer transition-colors leading-snug ${
                        item.is_na
                          ? "line-through text-surface-400 opacity-60 italic"
                          : item.is_completed
                          ? "line-through text-surface-400 opacity-75"
                          : "text-foreground group-hover:text-accent"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className={`inline-flex items-center text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${bgClass} shrink-0`}>
                      {item.type === "pre" ? "Pre-Activity" : item.type === "post" ? "Post-Activity" : "During Activity"}
                    </span>
                    {item.is_na && (
                      <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                        N/A
                      </span>
                    )}
                    {item.requires_visual_proof && !item.is_na && (
                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                        <Camera className="w-2.5 h-2.5" /> Photo Required
                      </span>
                    )}
                  </div>

                  {/* Actions Row: N/A Button, Photo Upload Button, Delete Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* N/A Toggle Button */}
                    {!readOnly && handleToggleNA && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleNA(item);
                        }}
                        disabled={isUpdating}
                        className={`h-6 px-2 rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
                          item.is_na
                            ? "bg-amber-500 text-black border-amber-500 shadow-xs ring-1 ring-amber-500/50"
                            : "bg-surface-200/80 hover:bg-amber-500/20 text-surface-500 hover:text-amber-500 border-surface-300"
                        }`}
                        title={item.is_na ? "Click to unmark N/A" : "Click to mark as Not Applicable (N/A)"}
                      >
                        <span>{item.is_na ? "✓ N/A" : "N/A"}</span>
                      </button>
                    )}

                    {/* Optional Photo Upload Button */}
                    {!readOnly && handleUploadChecklistPhoto && (
                      <label
                        className="h-6 px-2 rounded-md text-[9px] font-black uppercase tracking-wider bg-surface-200/80 hover:bg-blue-500/20 text-surface-500 hover:text-blue-500 border border-surface-300 hover:border-blue-500/40 transition-all flex items-center gap-1 cursor-pointer"
                        title="Upload photo evidence"
                      >
                        <Camera className="w-3 h-3 text-blue-400" />
                        <span className="hidden sm:inline">Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUpdating}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadChecklistPhoto(item, file);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                    )}

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
                </div>

                {/* Description */}
                {item.description && (
                  <p className={`text-[10px] leading-relaxed font-medium ${item.is_completed || item.is_na ? "text-surface-400 line-through opacity-70" : "text-surface-500"}`}>
                    {item.description}
                  </p>
                )}

                {/* Subtext info */}
                {item.is_completed && item.completed_by && !item.is_na && (
                  <span className="text-[9px] text-surface-400 font-medium">
                    Completed by {item.completed_by.email || item.completed_by.name}
                  </span>
                )}
                {item.is_na && item.completed_by && (
                  <span className="text-[9px] text-amber-500/80 font-medium">
                    Marked N/A by {item.completed_by.email || item.completed_by.name}
                  </span>
                )}

                {/* Action button for photo required when not yet completed */}
                {!item.is_completed && !item.is_na && item.requires_visual_proof && !readOnly && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(item)}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all shadow-xs"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Upload Mandatory Photo Proof</span>
                    </button>
                  </div>
                )}

                {/* Attachments preview */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-surface-400 flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5" /> Evidence ({item.attachments.length})
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {item.attachments.map((att: any) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => setLightboxImageUrl(att.file)}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-surface-300 hover:border-accent block transition-all hover:scale-105 cursor-pointer focus:outline-none shrink-0 relative group shadow-xs"
                        >
                          <img src={att.file} alt="Proof" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
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
      <div className="bg-surface-100 border border-surface-300 rounded-xl p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-foreground tracking-tight">QA/QC Checkpoints</span>
          <span className="font-black tabular-nums text-accent">
            {verifiedCount}/{total} Verified {naCount > 0 ? `(${naCount} N/A)` : ""} ({percent}%)
          </span>
        </div>
        <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Checklists by stage */}
      <div className="space-y-4">
        {renderGroup("Pre-Activity Gate", preItems, "bg-blue-400", "border-blue-500/30 text-blue-400 bg-blue-500/10")}
        {renderGroup("During Activity", duringItems, "bg-amber-400", "border-amber-500/30 text-amber-400 bg-amber-500/10")}
        {renderGroup("Post-Activity / Handover", postItems, "bg-emerald-400", "border-emerald-500/30 text-emerald-400 bg-emerald-500/10")}

        {total === 0 && (
          <div className="p-8 text-center bg-surface-50 border border-dashed border-surface-300 rounded-xl space-y-1">
            <Info className="w-5 h-5 text-surface-400 mx-auto mb-1" />
            <p className="text-xs font-bold text-foreground">No checkpoints added yet</p>
            <p className="text-[10px] text-surface-400">Add mandatory inspection checkpoints below or import a template.</p>
          </div>
        )}
      </div>

      {/* Add Checklist Item Form */}
      {!readOnly && (isAdmin || isArchitect || isQA) && (
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-3.5 space-y-3 shadow-xs">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-accent" />
            <span>Add New Inspection Checkpoint</span>
          </h4>

          <form onSubmit={onSubmit} className="space-y-2.5">
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
                  <option value="pre" className="bg-surface-100 text-foreground">Pre-Activity</option>
                  <option value="during" className="bg-surface-100 text-foreground">During Activity</option>
                  <option value="post" className="bg-surface-100 text-foreground">Post-Activity</option>
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

            {/* Photo Required Toggle */}
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-lg flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newRequiresProof}
                  onChange={(e) => setNewRequiresProof(e.target.checked)}
                  disabled={isUpdating}
                  className="w-4 h-4 rounded border-surface-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    Photo Evidence Required
                  </span>
                  <p className="text-[10px] text-surface-400 font-medium">
                    Contractors must upload photo evidence to verify and complete this checkpoint
                  </p>
                </div>
              </label>
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
