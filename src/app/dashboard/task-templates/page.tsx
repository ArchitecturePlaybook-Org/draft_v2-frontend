"use client";

import React, { useEffect, useState, useCallback } from "react";
import { projectsApi } from "@/domains/projects/api";
import { useAuthStore } from "@/store/auth-store";
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
  Circle,
  Globe,
  Building2,
  Copy,
  Loader2,
  Lock,
} from "lucide-react";

export interface SubtaskTemplateItem {
  id?: string;
  title: string;
  description?: string;
  checklists?: string[];
}

export interface TaskTemplate {
  id: number;
  isOrgTemplate?: boolean;
  account?: number | null;
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

type TemplateTab = "global" | "my_org";

export default function TaskTemplatesPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = !!((user as any)?.is_staff || (user as any)?.is_superuser);

  const [globalTemplates, setGlobalTemplates] = useState<TaskTemplate[]>([]);
  const [orgTemplates, setOrgTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TemplateTab>("global");

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TaskTemplate | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cloningId, setCloningId] = useState<number | null>(null);

  // Subtask Builder state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDesc, setNewSubtaskDesc] = useState("");
  const [subtaskChecklistInputs, setSubtaskChecklistInputs] = useState<Record<number, string>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, oRes] = await Promise.allSettled([
        projectsApi.getTaskTemplates(),
        projectsApi.getOrgTaskTemplates(),
      ]);

      if (gRes.status === "fulfilled") {
        const gList: TaskTemplate[] = (Array.isArray(gRes.value) ? gRes.value : gRes.value?.results ?? []).map(
          (t: any) => ({ ...t, isOrgTemplate: false })
        );
        setGlobalTemplates(gList);
      }

      if (oRes.status === "fulfilled") {
        const oList: TaskTemplate[] = (Array.isArray(oRes.value) ? oRes.value : oRes.value?.results ?? []).map(
          (t: any) => ({ ...t, isOrgTemplate: true })
        );
        setOrgTemplates(oList);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load task templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const displayedTemplates = activeTab === "global" ? globalTemplates : orgTemplates;

  // Clone
  const handleClone = async (t: TaskTemplate) => {
    setCloningId(t.id);
    try {
      await projectsApi.cloneTaskTemplate(t.id);
      toast.success(`"${t.name}" cloned to Organisation Templates table.`);
      await fetchTemplates();
      setActiveTab("my_org");
    } catch (err: any) {
      toast.error(err?.message || "Failed to clone template.");
    } finally {
      setCloningId(null);
    }
  };

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Template name is required.";
    if (form.default_duration_days < 1) errs.default_duration_days = "Min 1 day required.";
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
        if (editingTemplate.isOrgTemplate) {
          await projectsApi.updateOrgTaskTemplate(editingTemplate.id, payload);
        } else {
          await projectsApi.updateTaskTemplate(editingTemplate.id, payload);
        }
        toast.success("Template updated.");
      } else {
        if (activeTab === "global" && isSuperAdmin) {
          await projectsApi.createTaskTemplate(payload);
        } else {
          await projectsApi.createOrgTaskTemplate(payload);
          setActiveTab("my_org");
        }
        toast.success("Template created.");
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
      if (deleteTarget.isOrgTemplate) {
        await projectsApi.deleteOrgTaskTemplate(deleteTarget.id);
      } else {
        await projectsApi.deleteTaskTemplate(deleteTarget.id);
      }
      toast.success("Template deleted.");
      setDeleteTarget(null);
      if (previewTemplate?.id === deleteTarget.id) setPreviewTemplate(null);
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

  // Checklist handlers
  const addChecklistItem = () => {
    const item = newChecklistItem.trim();
    if (!item) return;
    if (form.default_checklists.includes(item)) { toast.error("Duplicate checkpoint."); return; }
    setForm((prev) => ({ ...prev, default_checklists: [...prev.default_checklists, item] }));
    setNewChecklistItem("");
  };

  const removeChecklistItem = (idx: number) => {
    setForm((prev) => ({ ...prev, default_checklists: prev.default_checklists.filter((_, i) => i !== idx) }));
  };

  // Subtask handlers
  const addSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) { toast.error("Provide a subtask title."); return; }
    setForm((prev) => ({
      ...prev,
      default_subtasks: [...prev.default_subtasks, { title, description: newSubtaskDesc.trim() || undefined, checklists: [] }],
    }));
    setNewSubtaskTitle("");
    setNewSubtaskDesc("");
  };

  const removeSubtask = (subIdx: number) => {
    setForm((prev) => ({ ...prev, default_subtasks: prev.default_subtasks.filter((_, i) => i !== subIdx) }));
  };

  const addSubtaskChecklistItem = (subIdx: number) => {
    const text = (subtaskChecklistInputs[subIdx] || "").trim();
    if (!text) return;
    setForm((prev) => {
      const updated = [...prev.default_subtasks];
      const s = updated[subIdx];
      if (s && !(s.checklists || []).includes(text)) {
        s.checklists = [...(s.checklists || []), text];
      }
      return { ...prev, default_subtasks: updated };
    });
    setSubtaskChecklistInputs((prev) => ({ ...prev, [subIdx]: "" }));
  };

  const removeSubtaskChecklistItem = (subIdx: number, clIdx: number) => {
    setForm((prev) => {
      const updated = [...prev.default_subtasks];
      if (updated[subIdx]?.checklists) {
        updated[subIdx].checklists = updated[subIdx].checklists!.filter((_, i) => i !== clIdx);
      }
      return { ...prev, default_subtasks: updated };
    });
  };

  // ── Compact Template Row ──────────────────────────────────────────────────────
  const TemplateRow = ({ t }: { t: TaskTemplate }) => {
    const isGlobal = !t.isOrgTemplate;
    const isCloning = cloningId === t.id;
    const canEdit = isSuperAdmin || !isGlobal;

    return (
      <div
        onClick={() => setPreviewTemplate(t)}
        className="grid grid-cols-1 sm:grid-cols-[1.5fr_80px_100px_110px_130px] gap-2 items-center px-4 py-2.5 border-b border-surface-200 hover:bg-surface-100/70 transition-colors group cursor-pointer"
      >
        {/* Name + badge */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <p className="text-xs font-bold text-foreground truncate group-hover:text-accent transition-colors">
              {t.name}
            </p>
            {isGlobal ? (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded shrink-0">
                <Globe className="w-2 h-2" /> Global
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded shrink-0">
                <Building2 className="w-2 h-2" /> Org Table
              </span>
            )}
          </div>
          {t.description && <p className="text-[10px] text-surface-500 truncate mt-0.5">{t.description}</p>}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-surface-400" />
          <span className="text-[11px] font-bold text-foreground">{t.default_duration_days}d</span>
        </div>

        {/* Checklists count */}
        <div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[9px] font-bold border border-accent/25">
            ✓ {(t.default_checklists || []).length} items
          </span>
        </div>

        {/* Subtasks count */}
        <div>
          {(t.default_subtasks || []).length > 0 ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 text-[9px] font-bold border border-indigo-500/25">
              <Layers className="w-2.5 h-2.5" /> {(t.default_subtasks || []).length} subtasks
            </span>
          ) : (
            <span className="text-[9px] text-surface-400">None</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:justify-end" onClick={(e) => e.stopPropagation()}>
          {isGlobal && (
            <button
              onClick={() => handleClone(t)}
              disabled={isCloning}
              className="h-6.5 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 disabled:opacity-60"
              title="Clone to Organisation Table"
            >
              {isCloning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Copy className="w-2.5 h-2.5" />}
              <span>Clone</span>
            </button>
          )}

          {canEdit ? (
            <>
              <button
                onClick={() => openEdit(t)}
                className="h-6.5 px-2 rounded-lg bg-surface-200 hover:bg-accent/20 hover:text-accent text-foreground text-[9px] font-bold uppercase transition-all"
                title="Edit Template"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setDeleteTarget(t)}
                className="h-6.5 px-2 rounded-lg bg-surface-200 hover:bg-red-500/20 hover:text-red-400 text-surface-400 text-[9px] font-bold uppercase transition-all"
                title="Delete Template"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1 text-[8px] text-surface-400 font-bold uppercase">
              <Lock className="w-2.5 h-2.5" /> Global
            </span>
          )}
        </div>
      </div>
    );
  };

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-sm">📋</span>
            Task Templates
          </h1>
          <p className="text-[11px] text-surface-500 mt-0.5">
            Global Templates (`projects_tasktemplate`) &amp; Organisation Templates (`projects_orgtasktemplate`).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-8 px-3.5 bg-accent text-background font-black text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Template</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-100 border border-surface-200 p-0.5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === "global"
              ? "bg-surface-50 text-foreground shadow-xs border border-surface-200"
              : "text-surface-500 hover:text-foreground"
          }`}
        >
          <Globe className="w-3 h-3 text-blue-400" />
          Global Templates (`projects_tasktemplate`)
          <span className="px-1 py-0.2 bg-blue-500/10 text-blue-400 rounded text-[8px] font-black border border-blue-500/20">
            {globalTemplates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("my_org")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === "my_org"
              ? "bg-surface-50 text-foreground shadow-xs border border-surface-200"
              : "text-surface-500 hover:text-foreground"
          }`}
        >
          <Building2 className="w-3 h-3 text-emerald-400" />
          Organisation Templates (`projects_orgtasktemplate`)
          <span className="px-1 py-0.2 bg-emerald-500/10 text-emerald-400 rounded text-[8px] font-black border border-emerald-500/20">
            {orgTemplates.length}
          </span>
        </button>
      </div>

      {/* Info banner */}
      {activeTab === "global" && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-[10px] text-blue-300 font-medium">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Global templates table. Click <strong>Clone</strong> to copy any item into your organisation&apos;s custom templates table.</span>
        </div>
      )}
      {activeTab === "my_org" && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-300 font-medium">
          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Organisation templates table (`projects_orgtasktemplate`). Add custom templates or clone from Global Templates.</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-surface-300 bg-surface-50 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-xs text-surface-500 font-bold">Loading templates…</span>
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div className="text-3xl">{activeTab === "global" ? "🌐" : "🏢"}</div>
            <p className="text-xs font-bold text-foreground">
              {activeTab === "global" ? "No global templates available." : "No organisation templates yet."}
            </p>
            <p className="text-[10px] text-surface-500">
              {activeTab === "global"
                ? "Global templates will appear here once configured."
                : 'Click "+ New Template" or clone a Global Template to get started.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1.5fr_80px_100px_110px_130px] gap-2 px-4 py-2 bg-surface-100 border-b border-surface-300">
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Template Name</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Duration</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Checklists</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Subtasks</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600 text-right">Actions</span>
            </div>
            {displayedTemplates.map((t) => <TemplateRow key={t.id} t={t} />)}
          </>
        )}
      </div>

      {/* ── Template Preview Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-surface-50 border border-surface-300 w-full max-w-xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-surface-200 bg-surface-100 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold text-base shrink-0">📋</span>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="px-1.5 py-0.2 text-[8px] font-black uppercase bg-accent/15 text-accent rounded border border-accent/25">Template</span>
                      {!previewTemplate.isOrgTemplate ? (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                          <Globe className="w-2 h-2" /> Global Table
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          <Building2 className="w-2 h-2" /> Org Table
                        </span>
                      )}
                      <span className="text-[11px] text-surface-500 flex items-center gap-1 font-semibold">
                        <Clock className="w-2.5 h-2.5" /> {previewTemplate.default_duration_days} Days
                      </span>
                    </div>
                    <h2 className="text-base font-black text-foreground">{previewTemplate.name}</h2>
                    {previewTemplate.description && (
                      <p className="text-[11px] text-surface-600 mt-0.5 leading-relaxed">{previewTemplate.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="w-6 h-6 rounded bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-400" />
                    Primary Checklists ({previewTemplate.default_checklists?.length || 0})
                  </h3>
                  {previewTemplate.default_checklists?.length > 0 ? (
                    <div className="bg-surface-100 border border-surface-200 rounded-lg divide-y divide-surface-200 overflow-hidden">
                      {previewTemplate.default_checklists.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-surface-500 italic bg-surface-100/50 p-2 rounded-lg border border-surface-200">No primary checklist items defined.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    Subtask Templates ({(previewTemplate.default_subtasks ?? []).length})
                  </h3>
                  {(previewTemplate.default_subtasks ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {(previewTemplate.default_subtasks ?? []).map((sub, idx) => (
                        <div key={idx} className="bg-surface-100 border border-surface-200 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[8px] font-black">{idx + 1}</span>
                              {sub.title}
                            </h4>
                            <span className="text-[8px] font-bold text-surface-500">{(sub.checklists || []).length} Checkpoints</span>
                          </div>
                          {sub.description && <p className="text-[10px] text-surface-600 pl-5.5 leading-relaxed">{sub.description}</p>}
                          {(sub.checklists || []).length > 0 && (
                            <div className="pl-5.5 pt-0.5 space-y-1">
                              {sub.checklists!.map((cl, cIdx) => (
                                <div key={cIdx} className="flex items-center gap-1.5 text-[10px] text-surface-600">
                                  <Circle className="w-2.5 h-2.5 text-surface-400 shrink-0" />
                                  <span>{cl}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-surface-500 italic bg-surface-100/50 p-2 rounded-lg border border-surface-200">No subtasks configured for this template.</p>
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-surface-200 bg-surface-100 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  {!previewTemplate.isOrgTemplate && (
                    <button
                      onClick={() => { handleClone(previewTemplate); setPreviewTemplate(null); }}
                      disabled={cloningId === previewTemplate.id}
                      className="h-7 px-3 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 border border-blue-500/25"
                    >
                      <Copy className="w-3 h-3" />
                      Clone to Org Table
                    </button>
                  )}
                  {(isSuperAdmin || previewTemplate.isOrgTemplate) && (
                    <button
                      onClick={() => { const t = previewTemplate; setPreviewTemplate(null); openEdit(t); }}
                      className="h-7 px-3 bg-surface-200 hover:bg-accent/20 hover:text-accent text-foreground font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="h-7 px-4 bg-accent text-background font-bold text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create/Edit Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-xl bg-surface-50 border border-surface-300 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold text-base">
                    {editingTemplate ? "✏️" : "➕"}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      {editingTemplate
                        ? editingTemplate.isOrgTemplate ? "Edit Organisation Template" : "Edit Global Template"
                        : activeTab === "global" && isSuperAdmin ? "New Global Template" : "New Organisation Template"}
                    </h3>
                    <p className="text-[10px] text-surface-500">
                      {editingTemplate
                        ? "Update template details, checkpoints, and subtasks."
                        : activeTab === "global" && isSuperAdmin
                        ? "Saves to Global Templates table (`projects_tasktemplate`)."
                        : "Saves to Organisation Templates table (`projects_orgtasktemplate`)."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-6 h-6 rounded bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Basic info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Template Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
                      placeholder="e.g. Phase 2: Structural Framing"
                      className={`w-full h-8 px-2.5 bg-surface-100 border rounded-lg text-xs font-bold text-foreground outline-none transition-all ${errors.name ? "border-red-500" : "border-surface-300 focus:border-accent"}`}
                    />
                    {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Duration (Days) *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.default_duration_days}
                      onChange={(e) => setForm((p) => ({ ...p, default_duration_days: parseInt(e.target.value) || 1 }))}
                      className="w-full h-8 px-2.5 bg-surface-100 border border-surface-300 rounded-lg text-xs font-bold text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Description / Directives</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Standard operating directives..."
                    rows={2}
                    className="w-full p-2 bg-surface-100 border border-surface-300 rounded-lg text-xs font-medium text-foreground outline-none focus:border-accent transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Checklists */}
                <div className="space-y-1.5 pt-2 border-t border-surface-200">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-400" />
                    Primary Checklists ({form.default_checklists.length})
                  </label>
                  {form.default_checklists.length > 0 && (
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {form.default_checklists.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2.5 py-1 bg-surface-100 border border-surface-200 rounded-md text-xs">
                          <span className="w-3.5 h-3.5 rounded border border-accent/40 flex items-center justify-center text-[7px] text-accent shrink-0 font-bold">✓</span>
                          <span className="flex-1 font-medium text-foreground truncate">{item}</span>
                          <button type="button" onClick={() => removeChecklistItem(idx)} className="w-4 h-4 rounded hover:bg-red-500/15 text-surface-400 hover:text-red-400 flex items-center justify-center text-xs font-bold transition-all">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                      placeholder="Add checkpoint (Press Enter)..."
                      className="flex-1 h-7.5 px-2.5 bg-surface-100 border border-surface-300 rounded-md text-xs font-medium text-foreground outline-none focus:border-accent"
                    />
                    <button type="button" onClick={addChecklistItem} className="h-7.5 px-2.5 bg-accent text-background rounded-md text-[9px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1 shrink-0">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>

                {/* Subtasks */}
                <div className="space-y-2 pt-2 border-t border-surface-200">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    Subtask Templates ({form.default_subtasks.length})
                  </label>
                  {form.default_subtasks.length > 0 && (
                    <div className="space-y-2">
                      {form.default_subtasks.map((sub, sIdx) => (
                        <div key={sIdx} className="bg-surface-100 border border-surface-200 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[8px] font-black shrink-0">{sIdx + 1}</span>
                              <span className="text-xs font-bold text-foreground truncate">{sub.title}</span>
                            </div>
                            <button type="button" onClick={() => removeSubtask(sIdx)} className="text-surface-400 hover:text-red-400 p-0.5 transition-colors" title="Remove Subtask">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {sub.description && <p className="text-[10px] text-surface-600 pl-5.5">{sub.description}</p>}
                          <div className="pl-5.5 space-y-1 pt-0.5">
                            {(sub.checklists || []).map((cl, cIdx) => (
                              <div key={cIdx} className="flex items-center justify-between gap-1.5 text-[10px] text-foreground bg-surface-50 px-2 py-0.5 rounded border border-surface-200">
                                <div className="flex items-center gap-1 truncate"><Circle className="w-2 h-2 text-emerald-400 shrink-0" /><span className="truncate">{cl}</span></div>
                                <button type="button" onClick={() => removeSubtaskChecklistItem(sIdx, cIdx)} className="text-surface-400 hover:text-red-400 text-xs font-bold">✕</button>
                              </div>
                            ))}
                            <div className="flex items-center gap-1 pt-0.5">
                              <input
                                type="text"
                                value={subtaskChecklistInputs[sIdx] || ""}
                                onChange={(e) => setSubtaskChecklistInputs((p) => ({ ...p, [sIdx]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtaskChecklistItem(sIdx); } }}
                                placeholder="Add checkpoint to this subtask..."
                                className="flex-1 h-6.5 px-2 bg-surface-50 border border-surface-300 rounded text-[10px] text-foreground outline-none focus:border-accent"
                              />
                              <button type="button" onClick={() => addSubtaskChecklistItem(sIdx)} className="h-6.5 px-2 bg-surface-200 text-foreground text-[8px] font-bold uppercase tracking-wider rounded hover:bg-surface-300 transition-all shrink-0">+ Checkpoint</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-surface-100/70 border border-dashed border-surface-300 rounded-lg p-2.5 space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-surface-600">+ Add New Subtask</p>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Subtask title..."
                        className="w-full h-7.5 px-2.5 bg-surface-50 border border-surface-300 rounded-md text-xs font-semibold text-foreground outline-none focus:border-accent"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newSubtaskDesc}
                          onChange={(e) => setNewSubtaskDesc(e.target.value)}
                          placeholder="Optional directive notes..."
                          className="flex-1 h-7.5 px-2.5 bg-surface-50 border border-surface-300 rounded-md text-xs text-foreground outline-none focus:border-accent"
                        />
                        <button type="button" onClick={addSubtask} className="h-7.5 px-3 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 font-bold text-[9px] uppercase tracking-wider rounded-md transition-all flex items-center gap-1 shrink-0">
                          <Plus className="w-3 h-3" /> Subtask
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-200 bg-surface-100">
                <button type="button" onClick={closeModal} className="h-8 px-4 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors">Cancel</button>
                <button type="button" onClick={handleSubmit} disabled={saving} className="h-8 px-5 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5">
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  {saving ? "Saving..." : editingTemplate ? "Update" : "Create"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xs bg-surface-50 border border-surface-300 rounded-xl shadow-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center font-bold text-sm">🗑️</span>
                <div>
                  <h3 className="text-sm font-black text-foreground">Delete Template?</h3>
                  <p className="text-[11px] text-surface-500">&quot;{deleteTarget.name}&quot; will be deleted.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="h-7.5 px-3 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors">Cancel</button>
                <button onClick={handleDelete} className="h-7.5 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
