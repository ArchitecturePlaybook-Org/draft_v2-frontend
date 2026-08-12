"use client";

import React, { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { projectsApi } from "@/domains/projects/api";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Sparkles,
  ArrowRight,
  Loader2
} from "lucide-react";

interface TaskPrefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrefill: (template: { 
    name: string; 
    description: string; 
    default_checklists: string[]; 
    default_subtasks?: any[];
  }) => void;
}

export function TaskPrefillModal({ isOpen, onClose, onSelectPrefill }: TaskPrefillModalProps) {
  const { project, taskTemplates, fetchTemplates } = useProjectStore();
  const { isAdmin } = usePermissions();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [durationDays, setDurationDays] = useState("1");
  const [checklistsInput, setChecklistsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    setIsSaving(true);
    try {
      const checklists = checklistsInput
        .split("\n")
        .map(item => item.trim())
        .filter(Boolean);

      await projectsApi.createTaskTemplate({
        name: templateName.trim(),
        description: templateDesc.trim(),
        default_duration_days: parseInt(durationDays) || 1,
        default_checklists: checklists
      });

      toast.success("Pre-filled Task Template created successfully!");
      setTemplateName("");
      setTemplateDesc("");
      setChecklistsInput("");
      setIsCreatingNew(false);
      await fetchTemplates();
    } catch (err: any) {
      console.error("Failed to create prefill template", err);
      toast.error("Failed to save pre-fill template: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this pre-fill template?")) return;

    setDeletingId(id);
    try {
      await projectsApi.deleteTaskTemplate(id);
      toast.success("Pre-fill template removed.");
      await fetchTemplates();
    } catch (err: any) {
      console.error("Failed to delete template", err);
      toast.error("Failed to delete pre-fill template.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-surface-200 dark:border-white/10 flex justify-between items-center bg-surface-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
                Pre-filled Task Templates
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-accent/10 text-accent rounded-md border border-accent/20">
                  Quick Prefill
                </span>
              </h2>
              <p className="text-[11px] font-bold text-surface-500">
                Select a standard architectural pre-fill template to populate your task instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && !isCreatingNew && (
              <button
                onClick={() => setIsCreatingNew(true)}
                className="px-3 py-1.5 bg-accent text-background font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pre-fill</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-200/60 hover:bg-surface-300 flex items-center justify-center text-surface-600 transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Admin New Template Creation Form */}
          {isCreatingNew && (
            <form onSubmit={handleCreateTemplate} className="bg-surface-50 dark:bg-white/5 border border-accent/30 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top duration-200 shadow-md">
              <div className="flex justify-between items-center border-b border-surface-200 dark:border-white/10 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-accent flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Create Admin Pre-fill Task Template
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-surface-400 hover:text-foreground font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 block">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Foundation Excavation & Rebar"
                    className="w-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 block">Est. Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 block">Description / Standard Directives</label>
                <textarea
                  rows={2}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Standard operating procedure and quality check notes..."
                  className="w-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-foreground outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 block">Default Checklist Items (One per line)</label>
                <textarea
                  rows={3}
                  value={checklistsInput}
                  onChange={(e) => setChecklistsInput(e.target.value)}
                  placeholder={"Verify rebar spacing and gauge\nCheck formwork alignment and bracing\nConfirm signoff from Lead Structural Engineer"}
                  className="w-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl p-3 text-xs font-mono text-foreground outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 h-9 bg-surface-200/60 dark:bg-white/10 text-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:bg-surface-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-9 bg-accent text-background font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save Pre-fill Template</span>
                </button>
              </div>
            </form>
          )}

          {/* Templates Grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-surface-500 flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                Available Pre-filled Templates ({taskTemplates.length})
              </h3>
            </div>

            {taskTemplates.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-surface-200 dark:border-white/10 rounded-3xl space-y-3 bg-surface-50/50 dark:bg-white/5">
                <div className="w-12 h-12 rounded-2xl bg-surface-200/50 dark:bg-white/10 text-surface-400 flex items-center justify-center mx-auto">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-foreground">No Pre-filled Templates Found</p>
                <p className="text-[11px] text-surface-400 max-w-sm mx-auto">
                  {isAdmin 
                    ? "As an Admin, click 'Add Pre-fill' above to create standard task templates for your team."
                    : "Your project admin has not configured pre-filled templates yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {taskTemplates.map((template: any) => {
                  const checklists = Array.isArray(template.default_checklists) 
                    ? template.default_checklists 
                    : [];
                  const subtasks = Array.isArray(template.default_subtasks)
                    ? template.default_subtasks
                    : [];

                  return (
                    <div
                      key={template.id}
                      onClick={() => {
                        onSelectPrefill({
                          name: template.name,
                          description: template.description || "",
                          default_checklists: checklists,
                          default_subtasks: subtasks
                        });
                        onClose();
                      }}
                      className="group bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 hover:border-accent/60 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-black text-foreground group-hover:text-accent transition-colors leading-snug">
                            {template.name}
                          </h4>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDeleteTemplate(e, template.id)}
                              disabled={deletingId === template.id}
                              className="text-surface-400 hover:text-red-500 p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete Pre-fill Template"
                            >
                              {deletingId === template.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {template.description && (
                          <p className="text-[11px] text-surface-500 font-medium line-clamp-2 leading-relaxed">
                            {template.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {checklists.length > 0 && (
                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold">
                              ✓ {checklists.length} Checklists
                            </span>
                          )}
                          {subtasks.length > 0 && (
                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 font-bold">
                              📁 {subtasks.length} Subtasks
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-surface-200/60 dark:border-white/5 flex justify-between items-center text-[10px] font-bold">
                        <span className="text-surface-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-accent" />
                          Est: {template.default_duration_days || 1} {template.default_duration_days === 1 ? 'day' : 'days'}
                        </span>

                        <span className="text-accent group-hover:translate-x-1 transition-transform flex items-center gap-1 font-black uppercase tracking-wider">
                          Use Pre-fill <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
