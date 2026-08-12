"use client";

import React, { useEffect, useState, useCallback } from "react";
import { projectsApi } from "@/domains/projects/api";
import { useIsAdmin } from "@/domains/auth/hooks";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  Circle
} from "lucide-react";

export interface SubtaskTemplateItem {
  id?: string;
  title: string;
  description?: string;
  checklists?: string[];
}

export interface TaskTemplate {
  id: number;
  name: string;
  description: string;
  default_duration_days: number;
  default_checklists: string[];
  default_subtasks?: SubtaskTemplateItem[];
}

interface FormData {
  name: string;
  description: string;
  default_duration_days: number;
  default_checklists: string[];
  default_subtasks: SubtaskTemplateItem[];
}

const EMPTY_FORM: FormData = {
  name: "",
  description: "",
  default_duration_days: 1,
  default_checklists: [],
  default_subtasks: [],
};

export default function AdminTaskTemplatesPage() {
  const isAdmin = useIsAdmin();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TaskTemplate | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Subtask Builder state within form
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDesc, setNewSubtaskDesc] = useState("");
  const [subtaskChecklistInputs, setSubtaskChecklistInputs] = useState<Record<number, string>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getTaskTemplates();
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setTemplates(list);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load task templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchTemplates();
  }, [isAdmin, fetchTemplates]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const paginatedTemplates = templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = "Template name is required.";
    } else if (
      templates.some(
        (t) => t.name.toLowerCase() === form.name.trim().toLowerCase() && t.id !== editingTemplate?.id
      )
    ) {
      errs.name = "A template with this name already exists.";
    }
    if (form.default_duration_days < 1) {
      errs.default_duration_days = "Duration must be at least 1 day.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        default_duration_days: form.default_duration_days,
        default_checklists: form.default_checklists,
        default_subtasks: form.default_subtasks,
      };
      if (editingTemplate) {
        await projectsApi.updateTaskTemplate(editingTemplate.id, payload);
        toast.success("Template updated successfully.");
      } else {
        await projectsApi.createTaskTemplate(payload);
        toast.success("Template created successfully.");
      }
      closeModal();
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await projectsApi.deleteTaskTemplate(deleteTarget.id);
      toast.success("Template deleted.");
      setDeleteTarget(null);
      if (previewTemplate?.id === deleteTarget.id) {
        setPreviewTemplate(null);
      }
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete template.");
    }
  };

  // Modal helpers
  const openCreate = () => {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setNewChecklistItem("");
    setNewSubtaskTitle("");
    setNewSubtaskDesc("");
    setSubtaskChecklistInputs({});
    setShowModal(true);
  };

  const openEdit = (t: TaskTemplate) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      description: t.description || "",
      default_duration_days: t.default_duration_days || 1,
      default_checklists: [...(t.default_checklists || [])],
      default_subtasks: [...(t.default_subtasks || [])],
    });
    setErrors({});
    setNewChecklistItem("");
    setNewSubtaskTitle("");
    setNewSubtaskDesc("");
    setSubtaskChecklistInputs({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  // Root Checklist Handlers
  const addChecklistItem = () => {
    const item = newChecklistItem.trim();
    if (!item) return;
    if (form.default_checklists.includes(item)) {
      toast.error("Duplicate checklist item.");
      return;
    }
    setForm((prev) => ({ ...prev, default_checklists: [...prev.default_checklists, item] }));
    setNewChecklistItem("");
  };

  const removeChecklistItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      default_checklists: prev.default_checklists.filter((_, i) => i !== idx),
    }));
  };

  // Subtask Builder Handlers
  const addSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) {
      toast.error("Please provide a subtask title.");
      return;
    }
    const newSub: SubtaskTemplateItem = {
      title,
      description: newSubtaskDesc.trim() || undefined,
      checklists: [],
    };
    setForm((prev) => ({
      ...prev,
      default_subtasks: [...prev.default_subtasks, newSub],
    }));
    setNewSubtaskTitle("");
    setNewSubtaskDesc("");
  };

  const removeSubtask = (subIdx: number) => {
    setForm((prev) => ({
      ...prev,
      default_subtasks: prev.default_subtasks.filter((_, i) => i !== subIdx),
    }));
  };

  const addSubtaskChecklistItem = (subIdx: number) => {
    const text = (subtaskChecklistInputs[subIdx] || "").trim();
    if (!text) return;
    setForm((prev) => {
      const updated = [...prev.default_subtasks];
      const targetSub = updated[subIdx];
      if (targetSub) {
        const currentCl = targetSub.checklists || [];
        if (!currentCl.includes(text)) {
          targetSub.checklists = [...currentCl, text];
        }
      }
      return { ...prev, default_subtasks: updated };
    });
    setSubtaskChecklistInputs((prev) => ({ ...prev, [subIdx]: "" }));
  };

  const removeSubtaskChecklistItem = (subIdx: number, clIdx: number) => {
    setForm((prev) => {
      const updated = [...prev.default_subtasks];
      const targetSub = updated[subIdx];
      if (targetSub && targetSub.checklists) {
        targetSub.checklists = targetSub.checklists.filter((_, i) => i !== clIdx);
      }
      return { ...prev, default_subtasks: updated };
    });
  };

  // ── Not Authorized ────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/15 flex items-center justify-center text-4xl">
            🔒
          </div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">
            Access Denied
          </h2>
          <p className="text-sm text-surface-500 max-w-xs mx-auto">
            You do not have permission to manage task templates. Only administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center text-xl">📋</span>
            Task & Subtask Templates
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Configure global task templates with root checkpoints and pre-defined subtasks with nested checklists.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-10 px-5 bg-accent text-background font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md shadow-accent/20 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Table / Cards */}
      <div className="rounded-2xl border border-surface-300 bg-surface-50 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="text-4xl">📭</div>
            <p className="text-sm font-bold text-foreground">No task templates yet.</p>
            <p className="text-xs text-surface-500">Click &quot;+ New Template&quot; to create your first standard workflow.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1.5fr_90px_110px_130px_110px] gap-4 px-6 py-3 bg-surface-100 border-b border-surface-300">
              <span className="text-[10px] font-black uppercase tracking-wider text-surface-600">Template Name</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-surface-600">Duration</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-surface-600">Checklists</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-surface-600">Subtasks</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-surface-600 text-right">Actions</span>
            </div>

            {/* Rows */}
            {paginatedTemplates.map((t) => {
              const rootChecklistsCount = (t.default_checklists || []).length;
              const subtasksCount = (t.default_subtasks || []).length;

              return (
                <div
                  key={t.id}
                  onClick={() => setPreviewTemplate(t)}
                  className="grid grid-cols-1 sm:grid-cols-[1.5fr_90px_110px_130px_110px] gap-2 sm:gap-4 items-center px-6 py-4 border-b border-surface-200 hover:bg-surface-100/60 transition-colors group cursor-pointer"
                >
                  {/* Name + Description */}
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground truncate group-hover:text-accent transition-colors flex items-center gap-2">
                      {t.name}
                      <span className="text-[10px] text-surface-400 group-hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        ↗
                      </span>
                    </p>
                    {t.description && (
                      <p className="text-xs text-surface-500 truncate mt-0.5">{t.description}</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-surface-400" />
                    <span className="text-xs font-bold text-foreground">{t.default_duration_days}</span>
                    <span className="text-[10px] text-surface-500">days</span>
                  </div>

                  {/* Root Checklists count */}
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-bold border border-accent/25">
                      ✓ {rootChecklistsCount} items
                    </span>
                  </div>

                  {/* Subtasks count */}
                  <div>
                    {subtasksCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-[10px] font-bold border border-indigo-500/25">
                        <Layers className="w-2.5 h-2.5" /> {subtasksCount} subtasks
                      </span>
                    ) : (
                      <span className="text-[10px] text-surface-500">None</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(t)}
                      className="h-8 px-2.5 rounded-lg bg-surface-200 hover:bg-accent/20 hover:text-accent text-foreground text-[10px] font-bold uppercase tracking-wider transition-all"
                      title="Edit Template"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="h-8 px-2.5 rounded-lg bg-surface-200 hover:bg-red-500/20 hover:text-red-400 text-surface-400 text-[10px] font-bold uppercase tracking-wider transition-all"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 bg-surface-100 border-t border-surface-200">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-4 rounded-lg bg-surface-200 text-xs font-bold text-foreground hover:bg-surface-300 disabled:opacity-40 transition-all"
                >
                  ← Previous
                </button>
                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                  Page {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-4 rounded-lg bg-surface-200 text-xs font-bold text-foreground hover:bg-surface-300 disabled:opacity-40 transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Template Preview / Detail Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-surface-50 border border-surface-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-surface-200 bg-surface-100 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-lg shrink-0">
                    📋
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-accent/15 text-accent rounded border border-accent/25">
                        Template Detail
                      </span>
                      <span className="text-xs text-surface-500 flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3" /> {previewTemplate.default_duration_days} Days
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-foreground">{previewTemplate.name}</h2>
                    {previewTemplate.description && (
                      <p className="text-xs text-surface-600 mt-1 leading-relaxed">{previewTemplate.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
                {/* Root Checklist Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Primary Quality & Inspection Checklists ({previewTemplate.default_checklists?.length || 0})
                  </h3>
                  {previewTemplate.default_checklists && previewTemplate.default_checklists.length > 0 ? (
                    <div className="bg-surface-100 border border-surface-300 rounded-xl divide-y divide-surface-200 overflow-hidden">
                      {previewTemplate.default_checklists.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-surface-500 italic bg-surface-100/50 p-3 rounded-xl border border-surface-200">
                      No primary checklist items defined.
                    </p>
                  )}
                </div>

                {/* Subtask Templates Section */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Subtask Templates ({previewTemplate.default_subtasks?.length || 0})
                  </h3>

                  {previewTemplate.default_subtasks && previewTemplate.default_subtasks.length > 0 ? (
                    <div className="space-y-2.5">
                      {previewTemplate.default_subtasks.map((sub, idx) => (
                        <div key={idx} className="bg-surface-100 border border-surface-300 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-black">
                                {idx + 1}
                              </span>
                              {sub.title}
                            </h4>
                            <span className="text-[9px] font-bold text-surface-500">
                              {(sub.checklists || []).length} Checkpoints
                            </span>
                          </div>

                          {sub.description && (
                            <p className="text-[11px] text-surface-600 pl-7 leading-relaxed">{sub.description}</p>
                          )}

                          {sub.checklists && sub.checklists.length > 0 && (
                            <div className="pl-7 pt-1 space-y-1">
                              {sub.checklists.map((cl, cIdx) => (
                                <div key={cIdx} className="flex items-center gap-2 text-[11px] text-surface-600">
                                  <Circle className="w-3 h-3 text-surface-400 shrink-0" />
                                  <span>{cl}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-surface-500 italic bg-surface-100/50 p-3 rounded-xl border border-surface-200">
                      No subtasks configured for this template.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-surface-200 bg-surface-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    const target = previewTemplate;
                    setPreviewTemplate(null);
                    openEdit(target);
                  }}
                  className="h-8.5 px-4 bg-surface-200 hover:bg-accent/20 hover:text-accent text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Template</span>
                </button>

                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="h-8.5 px-5 bg-accent text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create/Edit Modal with Subtask & Checklist Builder ────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-2xl bg-surface-50 border border-surface-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-lg">
                    {editingTemplate ? "✏️" : "➕"}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-foreground">
                      {editingTemplate ? "Edit Task Template" : "New Task Template"}
                    </h3>
                    <p className="text-xs text-surface-500">
                      Configure root checkpoints and subtasks for this architectural template.
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Basic info row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, name: e.target.value }));
                        if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      placeholder="e.g. Phase 2: Structural Framing"
                      className={`w-full h-9 px-3 bg-surface-100 border rounded-xl text-xs font-bold text-foreground outline-none transition-all ${
                        errors.name
                          ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
                          : "border-surface-300 focus:border-accent"
                      }`}
                    />
                    {errors.name && <p className="text-[11px] text-red-500 font-bold">{errors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      Duration (Days) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.default_duration_days}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, default_duration_days: parseInt(e.target.value) || 1 }));
                        if (errors.default_duration_days) setErrors((prev) => ({ ...prev, default_duration_days: "" }));
                      }}
                      className={`w-full h-9 px-3 bg-surface-100 border rounded-xl text-xs font-bold text-foreground outline-none transition-all ${
                        errors.default_duration_days
                          ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
                          : "border-surface-300 focus:border-accent"
                      }`}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                    Description / Directives
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Standard directives and specifications for this task phase..."
                    rows={2}
                    className="w-full p-2.5 bg-surface-100 border border-surface-300 rounded-xl text-xs font-medium text-foreground outline-none focus:border-accent transition-all resize-none leading-relaxed placeholder:text-surface-400"
                  />
                </div>

                {/* Root Checklist Items */}
                <div className="space-y-2 pt-2 border-t border-surface-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Primary Task Checklists ({form.default_checklists.length})
                    </label>
                  </div>

                  {form.default_checklists.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {form.default_checklists.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 border border-surface-300 rounded-lg group"
                        >
                          <span className="w-4 h-4 rounded border-2 border-accent/40 flex items-center justify-center text-[8px] text-accent shrink-0 font-bold">
                            ✓
                          </span>
                          <span className="flex-1 text-xs font-medium text-foreground truncate">
                            {item}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(idx)}
                            className="w-5 h-5 rounded hover:bg-red-500/15 text-surface-400 hover:text-red-400 flex items-center justify-center text-xs font-bold transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addChecklistItem();
                        }
                      }}
                      placeholder="Add primary task checkpoint (Press Enter)..."
                      className="flex-1 h-8.5 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs font-medium text-foreground outline-none focus:border-accent transition-all placeholder:text-surface-400"
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="h-8.5 px-3 bg-accent text-background rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>

                {/* Subtask Templates Section */}
                <div className="space-y-3 pt-2 border-t border-surface-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Subtask Templates & Nested Checklists ({form.default_subtasks.length})
                  </label>

                  {/* Existing Subtasks List */}
                  {form.default_subtasks.length > 0 && (
                    <div className="space-y-2.5">
                      {form.default_subtasks.map((sub, sIdx) => (
                        <div key={sIdx} className="bg-surface-100 border border-surface-300 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-black shrink-0">
                                {sIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">{sub.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSubtask(sIdx)}
                              className="text-surface-400 hover:text-red-400 p-1 transition-colors"
                              title="Remove Subtask"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {sub.description && (
                            <p className="text-[11px] text-surface-600 pl-7">{sub.description}</p>
                          )}

                          {/* Nested Checkpoints */}
                          <div className="pl-7 space-y-1.5 pt-1">
                            {(sub.checklists || []).map((cl, cIdx) => (
                              <div key={cIdx} className="flex items-center justify-between gap-2 text-[11px] text-foreground bg-surface-50 px-2.5 py-1 rounded-md border border-surface-200">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Circle className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                  <span className="truncate">{cl}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSubtaskChecklistItem(sIdx, cIdx)}
                                  className="text-surface-400 hover:text-red-400 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}

                            {/* Add checklist input for this specific subtask */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={subtaskChecklistInputs[sIdx] || ""}
                                onChange={(e) => setSubtaskChecklistInputs((prev) => ({ ...prev, [sIdx]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addSubtaskChecklistItem(sIdx);
                                  }
                                }}
                                placeholder="Add checkpoint to this subtask..."
                                className="flex-1 h-7 px-2 bg-surface-50 border border-surface-300 rounded text-[11px] text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                              />
                              <button
                                type="button"
                                onClick={() => addSubtaskChecklistItem(sIdx)}
                                className="h-7 px-2.5 bg-surface-200 text-foreground text-[9px] font-bold uppercase tracking-wider rounded hover:bg-surface-300 transition-all shrink-0"
                              >
                                + Checkpoint
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Subtask Box */}
                  <div className="bg-surface-100/70 border border-dashed border-surface-300 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      + Add New Subtask Template
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Subtask title (e.g. Structural Steel Framing Inspection)..."
                        className="w-full h-8 px-3 bg-surface-50 border border-surface-300 rounded-lg text-xs font-semibold text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubtaskDesc}
                          onChange={(e) => setNewSubtaskDesc(e.target.value)}
                          placeholder="Optional subtask directive/notes..."
                          className="flex-1 h-8 px-3 bg-surface-50 border border-surface-300 rounded-lg text-xs text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                        />
                        <button
                          type="button"
                          onClick={addSubtask}
                          className="h-8 px-3.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subtask</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-9 px-5 rounded-xl border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-9 px-6 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/20 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface-50 border border-surface-300 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center font-bold text-lg">
                  🗑️
                </span>
                <div>
                  <h3 className="text-base font-black text-foreground">Delete Template?</h3>
                  <p className="text-xs text-surface-500">
                    &quot;{deleteTarget.name}&quot; will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="h-9 px-4 rounded-xl border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="h-9 px-5 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
