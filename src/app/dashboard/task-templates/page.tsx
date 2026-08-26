"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { authApi } from "@/domains/auth/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit3,
  CheckSquare,
  Clock,
  CheckCircle2,
  Globe,
  Building2,
  Copy,
  Loader2,
  Lock,
  Layers,
  Circle,
  Upload,
  UploadCloud,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { SpecializationMultiSelect } from "@/components/ui/SpecializationMultiSelect";

export interface TaskTemplateChecklistItem {
  title: string;
  type: "pre" | "during" | "post";
  description?: string;
}

export interface TaskTemplate {
  id: number;
  isOrgTemplate?: boolean;
  account?: number | null;
  name: string;
  description: string;
  default_duration_days: number;
  default_checklists: (string | TaskTemplateChecklistItem)[];
  is_milestone?: boolean;
  is_active?: boolean;
  is_public?: boolean;
  milestone_task?: number | null;
}

interface FormData {
  name: string;
  description: string;
  default_duration_days: number;
  default_checklists: (string | TaskTemplateChecklistItem)[];
  is_milestone: boolean;
  is_active: boolean;
  is_public: boolean;
  milestone_task_id: number | null;
  specialization_ids: number[];
}

const EMPTY_FORM: FormData = {
  name: "",
  description: "",
  default_duration_days: 1,
  default_checklists: [],
  is_milestone: false,
  is_active: true,
  is_public: true,
  milestone_task_id: null,
  specialization_ids: [],
};

const DEFAULT_FALLBACK_PRESETS = [
  {
    name: "Residential Building QA/QC Plan",
    slug: "residential-qaqc-plan",
    category: "RESIDENTIAL",
    icon_emoji: "🏠",
    description: "237+ QA/QC checklists, test reports, and method statements for residential apartment buildings (G+4 to G+12) and individual houses. Mapped to IS 456, IS 1786, IS 875, NBC 2016.",
  },
  {
    name: "Commercial Building QA/QC Plan",
    slug: "commercial-qaqc-plan",
    category: "COMMERCIAL",
    icon_emoji: "🏢",
    description: "250+ QA/QC templates for IT parks, commercial malls, and office complexes. Covers high-grade RCC, post-tensioned slabs, MEP, fire safety, and LEED compliance.",
  },
  {
    name: "Roads & Highway Infrastructure Plan",
    slug: "roads-highway-qaqc-plan",
    category: "INFRASTRUCTURE",
    icon_emoji: "🛣️",
    description: "180+ site-ready templates for flexible and rigid pavement construction. Mapped to IRC codes, MORTH specifications, and CBR compaction testing.",
  },
  {
    name: "Bridge & Heavy Infrastructure Plan",
    slug: "bridge-heavy-infra-qaqc-plan",
    category: "HEAVY_INFRA",
    icon_emoji: "🌉",
    description: "200+ QA/QC templates for flyovers, bridges, and heavy concrete structures. Covers piling, pier caps, pre-stressed girders, and NDT testing.",
  },
];

type TemplateTab = "global" | "my_org" | "milestones" | "project_presets";

function TaskTemplatesPageContent() {
  const { user } = useAuthStore();
  const isSuperAdmin = !!((user as any)?.is_staff || (user as any)?.is_superuser);

  const [globalTemplates, setGlobalTemplates] = useState<TaskTemplate[]>([]);
  const [orgTemplates, setOrgTemplates] = useState<TaskTemplate[]>([]);
  const [projectPresets, setProjectPresets] = useState<any[]>(DEFAULT_FALLBACK_PRESETS);
  const [previewPreset, setPreviewPreset] = useState<any | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<any | null>(null);
  const [presetForm, setPresetForm] = useState({
    id: null as number | string | null,
    name: "",
    category: "RESIDENTIAL",
    icon_emoji: "🏠",
    description: "",
    is_active: true,
    is_public: true,
  });

  const openCreatePreset = () => {
    setEditingPreset(null);
    setPresetForm({
      id: null,
      name: "",
      category: "RESIDENTIAL",
      icon_emoji: "🏠",
      description: "",
      is_active: true,
      is_public: true,
    });
    setShowPresetModal(true);
  };

  const openEditPreset = (preset: any) => {
    setEditingPreset(preset);
    setPresetForm({
      id: preset.id || preset.slug,
      name: preset.name || "",
      category: preset.category || "RESIDENTIAL",
      icon_emoji: preset.icon_emoji || "🏠",
      description: preset.description || "",
      is_active: preset.is_active ?? true,
      is_public: preset.is_public ?? true,
    });
    setShowPresetModal(true);
  };
  const [savingPreset, setSavingPreset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allSpecializations, setAllSpecializations] = useState<any[]>([]);

  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");

  const [activeTab, setActiveTab] = useState<TemplateTab>(() => {
    if (tabParam === "project_presets" || tabParam === "project" || tabParam === "presets" || tabParam === "project_preset") {
      return "project_presets";
    }
    if (tabParam === "my_org" || tabParam === "org") return "my_org";
    if (tabParam === "milestones" || tabParam === "milestone") return "milestones";
    return "global";
  });

  useEffect(() => {
    if (tabParam) {
      if (tabParam === "project_presets" || tabParam === "project" || tabParam === "presets" || tabParam === "project_preset") {
        setActiveTab("project_presets");
      } else if (tabParam === "my_org" || tabParam === "org") {
        setActiveTab("my_org");
      } else if (tabParam === "milestones" || tabParam === "milestone") {
        setActiveTab("milestones");
      } else if (tabParam === "global") {
        setActiveTab("global");
      }
    }
  }, [tabParam]);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const router = useRouter();

  const handleTabChange = (tab: TemplateTab) => {
    setActiveTab(tab);
    router.replace(`/dashboard/task-templates?tab=${tab}`, { scroll: false });
  };

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TaskTemplate | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cloningId, setCloningId] = useState<number | null>(null);

  // Draft-save state: used when user creates a milestone template from within another form
  const [savedDraft, setSavedDraft] = useState<FormData | null>(null);
  const [creatingMilestoneFromHint, setCreatingMilestoneFromHint] = useState(false);

  // New checklist input states
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<"pre" | "during" | "post">("during");
  const [newChecklistDesc, setNewChecklistDesc] = useState("");


  // Bulk Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

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

  useEffect(() => {
    authApi.getSpecializations()
      .then(setAllSpecializations)
      .catch(() => {});
    projectsApi.getProjectPresets()
      .then(setProjectPresets)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);


  const baseDisplayedTemplates = activeTab === "global" 
    ? globalTemplates.filter(t => !t.is_milestone) 
    : activeTab === "my_org" 
      ? orgTemplates.filter(t => !t.is_milestone)
      : [...globalTemplates, ...orgTemplates].filter(t => t.is_milestone);

  const filteredTemplates = baseDisplayedTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE));
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


  const normalizeItem = (item: string | TaskTemplateChecklistItem): TaskTemplateChecklistItem => {
    if (typeof item === "string") {
      return { title: item, type: "during", description: "" };
    }
    return {
      title: item.title || "",
      type: item.type || "during",
      description: item.description || "",
    };
  };

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
        is_milestone: form.is_milestone,
        is_active: form.is_active,
        is_public: form.is_public,
        milestone_task: form.is_milestone ? null : (form.milestone_task_id ?? null),
        specialization_ids: form.specialization_ids,
      };

      if (editingTemplate) {
        if (editingTemplate.isOrgTemplate) {
          await projectsApi.updateOrgTaskTemplate(editingTemplate.id, payload);
        } else {
          await projectsApi.updateTaskTemplate(editingTemplate.id, payload);
        }
        toast.success("Template updated.");
      } else {
        if (activeTab === "global") {
          await projectsApi.createTaskTemplate(payload);
        } else {
          await projectsApi.createOrgTaskTemplate(payload);
          setActiveTab("my_org");
        }
        toast.success("Template created.");
      }

      // If this save was triggered from the "create milestone from hint" flow, restore the draft
      if (creatingMilestoneFromHint && savedDraft) {
        await fetchTemplates();
        setForm(savedDraft);
        setSavedDraft(null);
        setCreatingMilestoneFromHint(false);
        setEditingTemplate(null);
        setErrors({});
        setNewChecklistTitle("");
        setNewChecklistType("during");
        setNewChecklistDesc("");
        toast.info("Milestone template created! Your previous form has been restored.");
      } else {
        closeModal();
        fetchTemplates();
      }
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

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setNewChecklistTitle("");
    setNewChecklistType("during");
    setNewChecklistDesc("");
    setShowModal(true);
  };

  const openEdit = (t: TaskTemplate) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      description: t.description || "",
      default_duration_days: t.default_duration_days || 1,
      default_checklists: [...(t.default_checklists || [])],
      is_milestone: !!t.is_milestone,
      is_active: t.is_active ?? true,
      is_public: t.is_public ?? (t.isOrgTemplate ? false : true),
      milestone_task_id: t.milestone_task ?? null,
      specialization_ids: (t as any).specializations?.map((s: any) => typeof s === 'number' ? s : s.id) || [],
    });
    setErrors({});
    setNewChecklistTitle("");
    setNewChecklistType("during");
    setNewChecklistDesc("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (creatingMilestoneFromHint && savedDraft) {
      // User cancelled milestone creation — restore their original draft
      setForm(savedDraft);
      setSavedDraft(null);
      setCreatingMilestoneFromHint(false);
      setEditingTemplate(null);
      setNewChecklistTitle("");
      setNewChecklistType("during");
      setNewChecklistDesc("");
    } else {
      setShowModal(false);
      setEditingTemplate(null);
      setForm(EMPTY_FORM);
      setErrors({});
      setSavedDraft(null);
      setCreatingMilestoneFromHint(false);
      setNewChecklistTitle("");
      setNewChecklistType("during");
      setNewChecklistDesc("");
    }
  };

  // Opens a milestone-creation form while saving the current draft so user can come back
  const openCreateMilestoneFromHint = () => {
    setSavedDraft({ ...form });
    setCreatingMilestoneFromHint(true);
    setEditingTemplate(null);
    setForm({ ...EMPTY_FORM, is_milestone: true });
    setErrors({});
    setNewChecklistTitle("");
    setNewChecklistType("during");
    setNewChecklistDesc("");
  };

  // Opens a fresh create modal with is_milestone pre-checked (from the dedicated milestone section)
  const openCreateMilestone = () => {
    setSavedDraft(null);
    setCreatingMilestoneFromHint(false);
    setEditingTemplate(null);
    setForm({ ...EMPTY_FORM, is_milestone: true });
    setErrors({});
    setNewChecklistTitle("");
    setNewChecklistType("during");
    setNewChecklistDesc("");
    setShowModal(true);
  };

  // Checklist handlers
  const addChecklistItem = () => {
    const title = newChecklistTitle.trim();
    if (!title) return;
    const exists = form.default_checklists.some((item) => {
      const norm = typeof item === "string" ? { title: item } : item;
      return norm.title.toLowerCase() === title.toLowerCase();
    });
    if (exists) {
      toast.error("Duplicate checkpoint.");
      return;
    }
    const newItem: TaskTemplateChecklistItem = {
      title,
      type: newChecklistType,
      description: newChecklistDesc.trim() || undefined,
    };
    setForm((prev) => ({
      ...prev,
      default_checklists: [...prev.default_checklists, newItem],
    }));
    setNewChecklistTitle("");
    setNewChecklistType("during");
    setNewChecklistDesc("");
  };

  const removeChecklistItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      default_checklists: prev.default_checklists.filter((_, i) => i !== idx),
    }));
  };



  // ── Compact Template Row ──────────────────────────────────────────────────────
  const TemplateRow = ({ t }: { t: TaskTemplate }) => {
    const isGlobal = !t.isOrgTemplate;
    const isCloning = cloningId === t.id;
    const canEdit = true;

    return (
      <div
        onClick={() => t.is_milestone ? router.push(`/dashboard/task-templates/milestones/${t.id}`) : setPreviewTemplate(t)}
        className="grid grid-cols-1 sm:grid-cols-[1.5fr_100px_130px_130px] gap-2 items-center px-4 py-2.5 border-b border-surface-200 hover:bg-surface-100/70 transition-colors group cursor-pointer"
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
            {t.is_milestone && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded shrink-0">
                Milestone
              </span>
            )}
            {t.is_public && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded shrink-0" title="Visible in Public Templates library">
                🌐 Public
              </span>
            )}
            {t.is_active === false && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-surface-200 text-surface-500 border border-surface-300 rounded shrink-0" title="Inactive template">
                Inactive
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
            ✓ {(t.default_checklists || []).length} Checkpoints
          </span>
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
    <div className="w-full max-w-full space-y-4">
      {/* Page header (Clean 2-Row Responsive Layout) */}
      <div className="space-y-3 bg-surface-50 border border-surface-200 p-4 rounded-xl shadow-xs">
        {/* Row 1: Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-sm">📋</span>
              Task Templates
            </h1>
            <p className="text-[11px] text-surface-500 font-medium mt-0.5">
              Manage global and organisation-specific task structures and milestone packages.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="h-8 px-3 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-300 text-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={() => {
                if (activeTab === "project_presets") {
                  setShowPresetModal(true);
                } else {
                  setForm({ ...EMPTY_FORM, is_milestone: activeTab === "milestones" });
                  setEditingTemplate(null);
                  setErrors({});
                  setShowModal(true);
                }
              }}
              className="h-8 px-3.5 rounded-lg bg-accent hover:bg-accent/90 text-background font-black text-xs transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {activeTab === "project_presets"
                  ? "Create Project Preset"
                  : activeTab === "milestones"
                  ? "New Milestone"
                  : "New Template"}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-surface-200">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface-100/70 border border-surface-200">
            <button
              onClick={() => handleTabChange("global")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === "global"
                  ? "bg-surface-50 text-foreground shadow-xs border border-surface-200"
                  : "text-surface-500 hover:text-foreground"
              }`}
            >
              <Globe className="w-3 h-3 text-blue-400" />
              <span>Global</span>
              <span className="px-1.5 py-0.2 bg-blue-500/10 text-blue-400 rounded text-[9px] font-black border border-blue-500/20">
                {globalTemplates.filter((t) => !t.is_milestone).length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("my_org")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === "my_org"
                  ? "bg-surface-50 text-foreground shadow-xs border border-surface-200"
                  : "text-surface-500 hover:text-foreground"
              }`}
            >
              <Building2 className="w-3 h-3 text-emerald-400" />
              <span>Org</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-black border border-emerald-500/20">
                {orgTemplates.filter((t) => !t.is_milestone).length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("milestones")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === "milestones"
                  ? "bg-surface-50 text-foreground shadow-xs border border-surface-200"
                  : "text-surface-500 hover:text-foreground"
              }`}
            >
              <span className="text-xs">🎯</span>
              <span>Milestones</span>
              <span className="px-1.5 py-0.2 bg-surface-200 text-surface-600 rounded text-[9px] font-black border border-surface-300">
                {[...globalTemplates, ...orgTemplates].filter((t) => t.is_milestone).length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("project_presets")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === "project_presets"
                  ? "bg-surface-50 text-foreground shadow-xs border border-surface-200"
                  : "text-surface-500 hover:text-foreground"
              }`}
            >
              <Layers className="w-3 h-3 text-surface-500" />
              <span>Project Presets</span>
              <span className="px-1.5 py-0.2 bg-surface-200 text-surface-600 rounded text-[9px] font-black border border-surface-300">
                {projectPresets.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              type="text"
              placeholder="Search templates or checkpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-accent transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info banner */}
      {activeTab === "global" && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-[10px] text-blue-300 font-medium">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Global templates are platform standards. Click <strong>Clone</strong> to copy any template into your organisation.</span>
        </div>
      )}
      {activeTab === "my_org" && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-300 font-medium">
          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Private templates for your organisation. Add custom templates or clone from Global Templates.</span>
        </div>
      )}
      {activeTab === "project_presets" && (
        <div className="flex items-center gap-2 p-2.5 bg-surface-100 border border-surface-300 rounded-lg text-[10px] text-surface-500 font-medium">
          <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>Project Presets: Standard 6-stage QA/QC Matrix blueprints for turnkey project configuration.</span>
        </div>
      )}

      {/* ── PROJECT PRESETS TAB GRID ── */}
      {activeTab === "project_presets" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectPresets.map((preset) => (
            <div
              key={preset.slug}
              className="p-4 bg-surface-50 border border-surface-300 rounded-xl shadow-xs space-y-3.5 hover:border-surface-400 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-surface-100 border border-surface-200 text-foreground flex items-center justify-center text-lg font-bold shrink-0">
                    {preset.icon_emoji || "🏠"}
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">{preset.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-surface-100 text-surface-600 border border-surface-200">
                        {preset.category}
                      </span>
                      <span className="text-[10px] text-surface-400 font-semibold">6 Stages · 237+ Templates</span>
                      {preset.is_public !== false && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-100 text-surface-500 border border-surface-200">
                          Public
                        </span>
                      )}
                      {preset.is_active === false && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-200 text-surface-500 border border-surface-300">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-surface-500 font-medium leading-relaxed line-clamp-2">
                {preset.description}
              </p>

              {/* Stages Pill Badges */}
              <div className="space-y-1.5 pt-2 border-t border-surface-200">
                <label className="text-[9px] font-black uppercase tracking-wider text-surface-400">Standard Stages Included</label>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">1. Pre-Activity</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">2. Substructure</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">3. Superstructure</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">4. Finishes</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">5. MEP Services</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">6. Handover</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2.5 pt-2.5 border-t border-surface-200">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditPreset(preset)}
                    className="h-7.5 px-2.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-300 text-foreground text-xs font-bold transition-all flex items-center gap-1"
                    title="Edit Project Preset"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-surface-500" />
                    <span>Edit</span>
                  </button>
                  {preset.id && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete project preset "${preset.name}"?`)) return;
                        try {
                          await projectsApi.deleteProjectPreset(preset.id || preset.slug);
                          toast.success("Project preset deleted.");
                          const fresh = await projectsApi.getProjectPresets();
                          setProjectPresets(fresh);
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to delete preset");
                        }
                      }}
                      className="h-7.5 px-2.5 rounded-lg bg-surface-100 hover:bg-red-500/10 hover:text-red-400 border border-surface-300 text-surface-400 text-xs font-bold transition-all"
                      title="Delete Project Preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/task-templates/presets/${preset.slug}`)}
                    className="h-7.5 px-3 rounded-lg border border-surface-300 hover:bg-surface-200 text-foreground text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-surface-500" />
                    <span>Preview Matrix</span>
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/projects")}
                    className="h-7.5 px-3.5 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shadow-xs"
                  >
                    <span>Use Preset</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── UNIFIED TABLE CONTENT ── */
        <div className="rounded-xl border border-surface-300 bg-surface-50 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-xs text-surface-500 font-bold">Loading templates…</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div className="text-3xl">{activeTab === "milestones" ? "🎯" : activeTab === "global" ? "🌐" : "🏢"}</div>
            <p className="text-xs font-bold text-foreground">
              No templates found.
            </p>
            <p className="text-[10px] text-surface-500">
              {searchQuery ? "Try adjusting your search query." : "Templates will appear here once created."}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1.5fr_100px_130px_130px] gap-2 px-4 py-2 bg-surface-100 border-b border-surface-300">
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Template Name</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Duration</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Checklists</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600 text-right">Actions</span>
            </div>
            
            {paginatedTemplates.map((t) => <TemplateRow key={t.id} t={t} />)}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-t border-surface-200">
                <span className="text-[10px] text-surface-500 font-medium">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTemplates.length)} of {filteredTemplates.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md hover:bg-surface-200 text-surface-500 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold transition-colors ${currentPage === i + 1 ? "bg-accent text-white" : "hover:bg-surface-200 text-surface-600"}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md hover:bg-surface-200 text-surface-500 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )}

{/* ── Project Preset Preview Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {previewPreset && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-surface-50 border border-surface-300 w-full max-w-xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-surface-200 bg-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-surface-200 text-foreground flex items-center justify-center text-base font-bold">
                    {previewPreset.icon_emoji || "🏠"}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">{previewPreset.name}</h3>
                    <p className="text-[10px] text-surface-500 font-semibold">{previewPreset.category} · 6 Standard Matrix Stages</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewPreset(null)}
                  className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <p className="text-xs text-surface-600 font-medium leading-relaxed">
                  {previewPreset.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-surface-200">
                  <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">Standard Project Stages & Scope</label>
                  <div className="space-y-2">
                    <div className="p-3 bg-surface-100 border border-surface-200 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-foreground">1. Pre-Activity</p>
                      <p className="text-[11px] text-surface-500 font-medium">Site survey, soil investigation (IS 1892), SWMS, baseline schedule & approvals.</p>
                    </div>
                    <div className="p-3 bg-surface-100 border border-surface-200 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-foreground">2. Substructure</p>
                      <p className="text-[11px] text-surface-500 font-medium">Excavation, piling (IS 2911), raft/footings, basement retaining walls & waterproofing.</p>
                    </div>
                    <div className="p-3 bg-surface-100 border border-surface-200 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-foreground">3. Superstructure</p>
                      <p className="text-[11px] text-surface-500 font-medium">RCC frame columns/beams/slabs (IS 456), rebar TMT (IS 1786), masonry & structural steel.</p>
                    </div>
                    <div className="p-3 bg-surface-100 border border-surface-200 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-foreground">4. Finishes & Joinery</p>
                      <p className="text-[11px] text-surface-500 font-medium">Plastering (IS 1661), painting (IS 2932), tile/stone flooring, doors & windows.</p>
                    </div>
                    <div className="p-3 bg-surface-100 border border-surface-200 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-foreground">5. MEP Services</p>
                      <p className="text-[11px] text-surface-500 font-medium">Plumbing, electrical wiring & DBs (IS 732), HVAC ducting, fire fighting & lifts (NBC 2016).</p>
                    </div>
                    <div className="p-3 bg-surface-100 border border-surface-200 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-foreground">6. Handover & QA Audits</p>
                      <p className="text-[11px] text-surface-500 font-medium">Daily logs, quality audit checklists, snag list management & handover certificates.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-surface-200 bg-surface-100">
                <button
                  type="button"
                  onClick={() => setPreviewPreset(null)}
                  className="h-8 px-4 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPreset(null);
                    router.push("/dashboard/projects");
                  }}
                  className="h-8 px-5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  ⚡ Use in New Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                      {previewTemplate.is_milestone && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                          Milestone
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
                    Checklists ({previewTemplate.default_checklists?.length || 0})
                  </h3>
                  {previewTemplate.default_checklists?.length > 0 ? (
                    <div className="bg-surface-100 border border-surface-200 rounded-lg divide-y divide-surface-200 overflow-hidden max-h-96 overflow-y-auto">
                      {previewTemplate.default_checklists.map((item, idx) => {
                        const norm = normalizeItem(item);
                        return (
                          <div key={idx} className="flex items-start gap-2.5 px-3.5 py-2.5 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground truncate">{norm.title}</span>
                                <span className={`px-1 py-0.2 text-[8px] font-black uppercase rounded shrink-0 border ${norm.type === "pre"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : norm.type === "post"
                                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  }`}>
                                  {norm.type}
                                </span>
                              </div>
                              {norm.description && <p className="text-[10px] text-surface-500 mt-1 leading-relaxed">{norm.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-surface-500 italic bg-surface-100/50 p-2 rounded-lg border border-surface-200">No checklist items defined.</p>
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
                  <button
                    onClick={() => { const t = previewTemplate; setPreviewTemplate(null); openEdit(t); }}
                    className="h-7 px-3 bg-surface-200 hover:bg-accent/20 hover:text-accent text-foreground font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
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

      
      {/* ── Bulk Import Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-lg bg-surface-50 border border-surface-300 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base bg-blue-500/15 text-blue-400 shrink-0">
                    <UploadCloud className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      Bulk Import Templates
                    </h3>
                    <p className="text-[10px] text-surface-500">
                      Import multiple {activeTab === "global" ? "Global" : "Organisation"} templates using Excel.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="w-6 h-6 rounded bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Step 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">1</span>
                    <h4 className="text-xs font-bold text-foreground">Download Sample File</h4>
                  </div>
                  <div className="pl-7">
                    <p className="text-[11px] text-surface-500 mb-2">
                      Use our standardized Excel template to format your tasks, milestones, and checklists.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          if (activeTab === "project_presets") {
                            await projectsApi.downloadPresetSampleExcel();
                          } else {
                            await projectsApi.downloadTemplateSample(activeTab === "global");
                          }
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to download sample");
                        }
                      }}
                      className="h-8 px-4 border border-surface-300 bg-surface-100 hover:bg-surface-200 text-foreground text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                    >
                      Download Sample .xlsx
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">2</span>
                    <h4 className="text-xs font-bold text-foreground">Upload Populated File</h4>
                  </div>
                  <div className="pl-7">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-surface-300 rounded-xl hover:border-accent hover:bg-accent/5 transition-all cursor-pointer bg-surface-100">
                      <input
                        type="file"
                        accept=".xlsx, .csv"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setImportFile(e.target.files[0]);
                          }
                        }}
                      />
                      {importFile ? (
                        <div className="flex flex-col items-center text-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                          <span className="text-xs font-bold text-foreground">{importFile.name}</span>
                          <span className="text-[10px] text-surface-500 mt-0.5">Click to change file</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <UploadCloud className="w-6 h-6 text-surface-400 mb-1" />
                          <span className="text-xs font-bold text-surface-600">Click or drag file to upload</span>
                          <span className="text-[10px] text-surface-500 mt-0.5">Supports .xlsx and .csv</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-surface-200 bg-surface-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="h-8 px-4 bg-surface-200 hover:bg-surface-300 text-foreground font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!importFile || importing}
                  onClick={async () => {
                    if (!importFile) return;
                    setImporting(true);
                    try {
                      if (activeTab === "project_presets") {
                        const res = await projectsApi.uploadPresetExcel(importFile);
                        toast.success(res.message || "Project Presets imported successfully!");
                        const freshPresets = await projectsApi.getProjectPresets();
                        setProjectPresets(freshPresets);
                      } else {
                        await projectsApi.uploadTemplateExcel(activeTab === "global", importFile);
                        toast.success("Templates imported successfully!");
                        fetchTemplates();
                      }
                      setShowImportModal(false);
                      setImportFile(null);
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to import file");
                    } finally {
                      setImporting(false);
                    }
                  }}
                  className="h-8 px-5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {importing ? "Importing..." : "Start Import"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Project Preset Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showPresetModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-lg bg-surface-50 border border-surface-300 rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-base">
                    ⚡
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      {editingPreset ? "Edit Project Preset" : "Create Project Preset"}
                    </h3>
                    <p className="text-[10px] text-surface-500">Configure a 1-click QA/QC project blueprint preset.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPresetModal(false); setEditingPreset(null); }}
                  className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!presetForm.name.trim()) {
                    toast.error("Preset name is required");
                    return;
                  }
                  setSavingPreset(true);
                  try {
                    const generatedSlug = (presetForm as any).slug || presetForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `preset-${Date.now()}`;
                    const payload = { ...presetForm, slug: generatedSlug };

                    if (editingPreset && (presetForm.id || editingPreset.id || editingPreset.slug)) {
                      const targetId = presetForm.id || editingPreset.id || editingPreset.slug;
                      await projectsApi.updateProjectPreset(targetId, payload);
                      toast.success(`Project Preset "${presetForm.name}" updated successfully!`);
                    } else {
                      const newPreset = await projectsApi.createProjectPreset(payload);
                      toast.success(`Project Preset "${newPreset.name}" created successfully!`);
                    }
                    const freshPresets = await projectsApi.getProjectPresets();
                    setProjectPresets(freshPresets);
                    setShowPresetModal(false);
                    setEditingPreset(null);
                    setPresetForm({ id: null, name: "", category: "RESIDENTIAL", icon_emoji: "🏠", description: "", is_active: true, is_public: true });
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to save project preset");
                  } finally {
                    setSavingPreset(false);
                  }
                }}
                className="p-5 space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                    Preset Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Industrial Warehouse QA/QC Plan"
                    value={presetForm.name}
                    onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                      Category
                    </label>
                    <select
                      value={presetForm.category}
                      onChange={(e) => setPresetForm({ ...presetForm, category: e.target.value })}
                      className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="RESIDENTIAL">Residential Building</option>
                      <option value="COMMERCIAL">Commercial Building</option>
                      <option value="INFRASTRUCTURE">Roads & Infrastructure</option>
                      <option value="HEAVY_INFRA">Bridge & Heavy Infra</option>
                      <option value="INDUSTRIAL">Industrial & Warehouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                      Icon Emoji
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={presetForm.icon_emoji}
                      onChange={(e) => setPresetForm({ ...presetForm, icon_emoji: e.target.value })}
                      className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground text-center focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-surface-600 mb-1">
                    Description & Scope
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe the QA/QC matrix scope, standards, and checklists covered."
                    value={presetForm.description}
                    onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                    className="w-full p-3 bg-surface-100 border border-surface-300 rounded-lg text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:border-amber-500 transition-all font-medium resize-none"
                  />
                </div>

                {/* Active & Public Status Controls */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-200">
                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-surface-200 bg-surface-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={presetForm.is_active}
                      onChange={(e) => setPresetForm({ ...presetForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-surface-300 accent-amber-500 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">Active Preset</span>
                      <span className="text-[10px] text-surface-500 block leading-tight">Available in 1-click project matrix creation.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-surface-200 bg-surface-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={presetForm.is_public}
                      onChange={(e) => setPresetForm({ ...presetForm, is_public: e.target.checked })}
                      className="w-4 h-4 rounded border-surface-300 accent-amber-500 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3 text-cyan-400" /> Public Preset
                      </span>
                      <span className="text-[10px] text-surface-500 block leading-tight">Published to Public Templates (/dashboard/templates).</span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-200">
                  <button
                    type="button"
                    onClick={() => setShowPresetModal(false)}
                    className="h-9 px-4 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPreset}
                    className="h-9 px-5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs rounded-lg transition-all flex items-center gap-2 shadow-md shadow-amber-500/20"
                  >
                    {savingPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {savingPreset ? "Saving..." : "Create Preset"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Bulk Import Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-lg bg-surface-50 border border-surface-300 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base bg-blue-500/15 text-blue-400 shrink-0">
                    <UploadCloud className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      Bulk Import Templates
                    </h3>
                    <p className="text-[10px] text-surface-500">
                      Import multiple {activeTab === "global" ? "Global" : "Organisation"} templates using Excel.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="w-6 h-6 rounded bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">1</span>
                    <h4 className="text-xs font-bold text-foreground">Download Sample File</h4>
                  </div>
                  <div className="pl-7">
                    <p className="text-[11px] text-surface-500 mb-2">
                      Use our standardized Excel template to format your tasks, milestones, and checklists.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          await projectsApi.downloadTemplateSample(activeTab === "global");
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to download sample");
                        }
                      }}
                      className="h-8 px-4 border border-surface-300 bg-surface-100 hover:bg-surface-200 text-foreground text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                    >
                      Download Sample .xlsx
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">2</span>
                    <h4 className="text-xs font-bold text-foreground">Upload Populated File</h4>
                  </div>
                  <div className="pl-7">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-surface-300 rounded-xl hover:border-accent hover:bg-accent/5 transition-all cursor-pointer bg-surface-100">
                      <input
                        type="file"
                        accept=".xlsx, .csv"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setImportFile(e.target.files[0]);
                          }
                        }}
                      />
                      {importFile ? (
                        <div className="flex flex-col items-center text-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                          <span className="text-xs font-bold text-foreground">{importFile.name}</span>
                          <span className="text-[10px] text-surface-500 mt-0.5">Click to change file</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <UploadCloud className="w-6 h-6 text-surface-400 mb-1" />
                          <span className="text-xs font-bold text-surface-600">Click or drag file to upload</span>
                          <span className="text-[10px] text-surface-500 mt-0.5">Supports .xlsx and .csv</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-surface-200 bg-surface-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="h-8 px-4 bg-surface-200 hover:bg-surface-300 text-foreground font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!importFile || importing}
                  onClick={async () => {
                    if (!importFile) return;
                    setImporting(true);
                    try {
                      await projectsApi.uploadTemplateExcel(activeTab === "global", importFile);
                      toast.success("Templates imported successfully!");
                      setShowImportModal(false);
                      setImportFile(null);
                      fetchTemplates();
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to import templates");
                    } finally {
                      setImporting(false);
                    }
                  }}
                  className="h-8 px-5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {importing ? "Importing..." : "Start Import"}
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
              <div className="px-5 py-3.5 border-b border-surface-200 bg-surface-100 space-y-2">
                {creatingMilestoneFromHint && (
                  <div className="w-full pb-2 border-b border-purple-500/20 flex items-center gap-2">
                    <span className="text-purple-400 text-xs">🎯</span>
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Creating Milestone Template — your draft will be restored after saving</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${creatingMilestoneFromHint ? 'bg-purple-500/15 text-purple-400' : 'bg-accent/15 text-accent'}`}>
                      {creatingMilestoneFromHint ? "🎯" : editingTemplate ? "✏️" : "➕"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-foreground truncate">
                        {creatingMilestoneFromHint
                          ? "New Milestone Template"
                          : editingTemplate
                            ? editingTemplate.isOrgTemplate ? "Edit Organisation Template" : "Edit Global Template"
                            : activeTab === "global" ? "New Global Template" : "New Organisation Template"}
                      </h3>
                      <p className="text-[10px] text-surface-500 truncate">
                        {creatingMilestoneFromHint
                          ? "Save this milestone template, then you'll be returned to your previous form."
                          : editingTemplate
                            ? "Update template details and checkpoints."
                            : activeTab === "global"
                              ? "Saves to Global Templates table (`projects_tasktemplate`)."
                              : "Saves to Organisation Templates table (`projects_orgtasktemplate`)."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Basic info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className={`${form.is_milestone ? "sm:col-span-3" : "sm:col-span-2"} space-y-1`}>
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
                  {!form.is_milestone && (
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
                  )}
                </div>

                {/* Allocate to Milestone Task */}
                {!form.is_milestone && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-surface-600 flex items-center gap-1">
                      <span className="text-purple-400">🎯</span> Allocate to Milestone Task
                    </label>
                    <select
                      value={form.milestone_task_id ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, milestone_task_id: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full h-8 px-2.5 bg-surface-100 border border-surface-300 rounded-lg text-xs font-semibold text-foreground outline-none focus:border-accent"
                    >
                      <option value="">— None (not allocated to a milestone) —</option>
                      {baseDisplayedTemplates
                        .filter((t) => t.is_milestone && t.id !== editingTemplate?.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))
                      }
                    </select>
                    {baseDisplayedTemplates.filter((t) => t.is_milestone && t.id !== editingTemplate?.id).length === 0 && (
                      <div className="flex items-center gap-2 mt-1 p-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                        <span className="text-purple-400 text-xs shrink-0">🎯</span>
                        <p className="text-[9px] text-purple-400 font-semibold flex-1">No milestone templates in this tab yet.</p>
                        <button
                          type="button"
                          onClick={openCreateMilestoneFromHint}
                          className="shrink-0 h-6 px-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <span>+</span> Create Milestone Template
                        </button>
                      </div>
                    )}
                  </div>
                )}


                {/* Specializations Multi-Select Dropdown */}
                <div className="mt-2">
                  <SpecializationMultiSelect
                    specializations={allSpecializations}
                    selectedIds={form.specialization_ids}
                    onChange={(ids) => setForm((p) => ({ ...p, specialization_ids: ids }))}
                    label="Specializations (Multi-Select)"
                    placeholder="Select specializations..."
                  />
                </div>

                {/* Template Status Controls: Active & Public */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-surface-200">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-surface-200 bg-surface-100 hover:bg-surface-200/50 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-surface-300 accent-accent mt-0.5"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block">Active Template</span>
                      <span className="text-[10px] text-surface-500 block leading-tight">If disabled, template is hidden from workspace task creation.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-surface-200 bg-surface-100 hover:bg-surface-200/50 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(e) => setForm((p) => ({ ...p, is_public: e.target.checked }))}
                      className="w-4 h-4 rounded border-surface-300 accent-accent mt-0.5"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3 text-cyan-400" /> Public Template
                      </span>
                      <span className="text-[10px] text-surface-500 block leading-tight">When enabled, template is published to Public Templates (/dashboard/templates).</span>
                    </div>
                  </label>
                </div>

                {!form.is_milestone && (
                  <>
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
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {form.default_checklists.map((item, idx) => {
                            const norm = normalizeItem(item);
                            const typeColors = norm.type === "pre" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                               norm.type === "post" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                               "bg-amber-500/10 text-amber-400 border-amber-500/20";
                            return (
                              <div key={idx} className="bg-surface-100 border border-surface-200 rounded-xl p-2.5 space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-3.5 h-3.5 rounded border border-accent/40 flex items-center justify-center text-[7px] text-accent shrink-0 font-bold">✓</span>
                                    <span className="font-semibold text-foreground truncate">{norm.title}</span>
                                    <span className={`inline-flex items-center text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${typeColors} shrink-0`}>
                                      {norm.type === "pre" ? "Pre-Activity" : norm.type === "post" ? "Post-Activity" : "During Activity"}
                                    </span>
                                  </div>
                                  <button type="button" onClick={() => removeChecklistItem(idx)} className="w-4 h-4 rounded hover:bg-red-500/15 text-surface-400 hover:text-red-400 flex items-center justify-center text-xs font-bold transition-all shrink-0">✕</button>
                                </div>
                                {norm.description && (
                                  <p className="text-[10px] text-surface-500 pl-5 leading-normal">{norm.description}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="space-y-2 pt-2 border-t border-surface-200 bg-surface-100/50 p-2.5 rounded-lg border border-dashed border-surface-300">
                        <p className="text-[9px] font-black uppercase tracking-wider text-surface-500 flex items-center gap-1">
                          ➕ Add New Checkpoint
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={newChecklistTitle}
                              onChange={(e) => setNewChecklistTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                              placeholder="Checkpoint title..."
                              className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-accent text-xs font-semibold text-foreground transition-colors"
                            />
                          </div>
                          <div>
                            <select
                              value={newChecklistType}
                              onChange={(e) => setNewChecklistType(e.target.value as any)}
                              className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-accent text-xs font-semibold text-foreground appearance-none"
                            >
                              <option value="pre">Pre-Activity</option>
                              <option value="during">During Activity</option>
                              <option value="post">Post-Activity</option>
                            </select>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={newChecklistDesc}
                          onChange={(e) => setNewChecklistDesc(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                          placeholder="Optional checkpoint description/requirements..."
                          className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-accent text-xs font-medium text-foreground transition-colors"
                        />
                        <div className="flex justify-end">
                          <button type="button" onClick={addChecklistItem} className="h-7.5 px-3.5 bg-accent text-background rounded-md text-[9px] font-black uppercase tracking-wider hover:opacity-90 flex items-center gap-1 shrink-0 shadow-xs">
                            <Plus className="w-3.5 h-3.5" /> Add Checkpoint
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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

export default function TaskTemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-surface-400">Loading templates & presets…</p>
        </div>
      }
    >
      <TaskTemplatesPageContent />
    </Suspense>
  );
}
