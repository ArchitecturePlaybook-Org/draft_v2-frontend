"use client";

import React, { useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { X, Plus, Trash2, CheckSquare, Layers, Sparkles, Loader2 } from "lucide-react";

interface ChecklistItem {
  title: string;
  type: "pre" | "during" | "post";
  requires_visual_proof?: boolean;
}

interface CreateTaskTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStage?: string;
  onSuccess: () => void;
}

export function CreateTaskTemplateModal({
  isOpen,
  onClose,
  defaultStage = "superstructure",
  onSuccess,
}: CreateTaskTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState(defaultStage);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([
    { title: "Verify material delivery batch certificates & physical condition", type: "pre", requires_visual_proof: true },
    { title: "Field dimensional measurement & alignment check", type: "during", requires_visual_proof: false },
    { title: "Complete snagging inspection report & obtain Consultant signoff", type: "post", requires_visual_proof: true },
  ]);

  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<"pre" | "during" | "post">("during");
  const [newChecklistRequiresProof, setNewChecklistRequiresProof] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddChecklist = () => {
    if (!newChecklistTitle.trim()) {
      toast.error("Please enter a checklist item title.");
      return;
    }
    setChecklists([
      ...checklists,
      {
        title: newChecklistTitle.trim(),
        type: newChecklistType,
        requires_visual_proof: newChecklistRequiresProof
      },
    ]);
    setNewChecklistTitle("");
    setNewChecklistRequiresProof(false);
  };

  const handleRemoveChecklist = (index: number) => {
    setChecklists(checklists.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    try {
      setSaving(true);
      toast.loading("Saving new QA/QC Task Template & Checklists...", { id: "create-template" });

      const formattedChecklists = checklists.map((cl, idx) => ({
        id: idx + 1,
        title: cl.title,
        type: cl.type,
        requires_visual_proof: !!cl.requires_visual_proof,
        order: idx + 1,
      }));

      const payload = {
        name: name.trim(),
        description: description.trim(),
        stage: stage,
        default_duration_days: 2,
        default_checklists: formattedChecklists,
        is_milestone: true,
        is_active: true,
      };

      await projectsApi.createTaskTemplate(payload);

      toast.success("QA/QC Task Template created successfully!", { id: "create-template" });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create task template.", { id: "create-template" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface-card dark:bg-[#0b0f19] border border-surface-200 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 dark:border-white/10 flex items-center justify-between bg-surface-100/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Create QA/QC Task Template</h3>
              <p className="text-xs text-surface-500 font-medium">Add a reusable QA/QC task template with mandatory inspection checklists directly to presets.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-surface-200 dark:hover:bg-white/10 text-surface-400 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Task Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-surface-600 dark:text-surface-400">
              Task Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Column Formwork Plumbness & Concrete Pour"
              className="w-full px-3.5 py-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-surface-600 dark:text-surface-400">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Laser total station verticality check and slump testing before pour..."
              className="w-full px-3.5 py-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl text-xs font-medium text-foreground focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Target Stage */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-surface-600 dark:text-surface-400">
              InfraLens Construction Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
            >
              <option value="pre_construction">1. Pre-Construction (Site preparation, mobilization)</option>
              <option value="substructure">2. Substructure (Foundations, piling, basements)</option>
              <option value="superstructure">3. Superstructure (RCC frames, structural steel, slabs)</option>
              <option value="finishes">4. Finishes & Facade (Masonry, plastering, glazing, flooring)</option>
              <option value="mep">5. MEP Services (Electrical, HVAC, Plumbing, Firefighting)</option>
              <option value="documentation">6. Documentation & Handover (Snagging, As-built drawings, NOCs)</option>
            </select>
          </div>

          {/* Checklist Builder */}
          <div className="space-y-3 pt-2 border-t border-surface-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-purple-500 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                <span>Inspection Criteria Checklists ({checklists.length})</span>
              </label>
              <span className="text-[10px] text-surface-400 font-medium">Add pass/fail checkpoints</span>
            </div>

            {/* Existing Checklists List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {checklists.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-100/80 dark:bg-surface-800/60 border border-surface-200 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="font-semibold text-foreground text-xs leading-snug truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.requires_visual_proof && (
                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        📷 Proof Req.
                      </span>
                    )}
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-surface-200 text-surface-600 dark:text-surface-300">
                      {item.type === "pre" ? "Pre-Activity" : item.type === "post" ? "Post-Activity" : "During Activity"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklist(idx)}
                      className="w-6 h-6 rounded-md hover:bg-red-500/20 text-surface-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Checklist Input */}
            <div className="space-y-2 pt-2 bg-surface-50 dark:bg-surface-800/40 p-3 rounded-xl border border-surface-200 dark:border-white/5">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="e.g. Verify rebar cover blocks (min 50mm)"
                  className="flex-1 w-full px-3.5 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklist();
                    }
                  }}
                />
                <select
                  value={newChecklistType}
                  onChange={(e) => setNewChecklistType(e.target.value as any)}
                  className="px-3 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="pre">Pre-Activity</option>
                  <option value="during">During Activity</option>
                  <option value="post">Post-Activity</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-bold text-xs flex items-center justify-center gap-1 border border-purple-500/30 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Checkpoint Photo Required Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={newChecklistRequiresProof}
                  onChange={(e) => setNewChecklistRequiresProof(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-surface-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  📸 Photo Evidence Required for this Checkpoint
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-surface-200 dark:border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-surface-200 text-xs font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-6 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Task...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Task & Checklists</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
