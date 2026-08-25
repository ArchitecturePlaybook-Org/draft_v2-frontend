"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Edit3, Trash2, CheckSquare, Clock, Globe, Building2, Layers, Circle, CheckCircle2, Loader2, UploadCloud, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { TaskTemplate, TaskTemplateChecklistItem } from "../../page";

export default function MilestoneDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuthStore();
  const isSuperAdmin = !!((user as any)?.is_staff || (user as any)?.is_superuser);

  const [milestone, setMilestone] = useState<TaskTemplate | null>(null);
  const [allocatedTemplates, setAllocatedTemplates] = useState<TaskTemplate[]>([]);
  const [allTemplates, setAllTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTemplateToAdd, setSelectedTemplateToAdd] = useState<number | "">("");

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;


  const [addingTemplate, setAddingTemplate] = useState(false);

  // Bulk Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);


  // Form states for creating a new template
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [newTplName, setNewTplName] = useState("");
  const [newTplDesc, setNewTplDesc] = useState("");
  const [newTplDuration, setNewTplDuration] = useState(1);
  const [newTplChecklists, setNewTplChecklists] = useState<any[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<"pre" | "during" | "post">("during");
  const [newChecklistDesc, setNewChecklistDesc] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);

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

  const addChecklistItem = () => {
    const title = newChecklistInput.trim();
    if (!title) return;
    const exists = newTplChecklists.some((item) => {
      const norm = typeof item === "string" ? { title: item } : item;
      return norm.title.toLowerCase() === title.toLowerCase();
    });
    if (exists) { toast.error("Duplicate checkpoint."); return; }
    
    const newItem: TaskTemplateChecklistItem = {
      title,
      type: newChecklistType,
      description: newChecklistDesc.trim() || undefined,
    };
    setNewTplChecklists(prev => [...prev, newItem]);
    setNewChecklistInput("");
    setNewChecklistType("during");
    setNewChecklistDesc("");
  };

  const removeChecklistItem = (idx: number) => {
    setNewTplChecklists(prev => prev.filter((_, i) => i !== idx));
  };

  const openEdit = (tpl: TaskTemplate) => {
    setEditingTemplate(tpl);
    setNewTplName(tpl.name);
    setNewTplDesc(tpl.description || "");
    setNewTplDuration(tpl.default_duration_days || 1);
    setNewTplChecklists(tpl.default_checklists || []);
    setNewChecklistInput("");
    setNewChecklistType("during");
    setNewChecklistDesc("");
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!newTplName.trim()) { toast.error("Template name is required."); return; }
    setSavingTpl(true);
    try {
      const payload = {
        name: newTplName.trim(),
        description: newTplDesc.trim(),
        default_duration_days: newTplDuration,
        default_checklists: newTplChecklists,
        milestone_task: id,
      };

      if (editingTemplate) {
        if (editingTemplate.isOrgTemplate) {
          await projectsApi.updateOrgTaskTemplate(editingTemplate.id, payload);
        } else {
          await projectsApi.updateTaskTemplate(editingTemplate.id, payload);
        }
        toast.success(`Template "${newTplName}" updated.`);
      } else {
        if (milestone?.isOrgTemplate) {
          await projectsApi.createOrgTaskTemplate(payload);
        } else {
          await projectsApi.createTaskTemplate(payload);
        }
        toast.success(`Template "${newTplName}" created and mapped.`);
      }

      setShowCreateModal(false);
      setEditingTemplate(null);
      setNewTplName("");
      setNewTplDesc("");
      setNewTplDuration(1);
      setNewTplChecklists([]);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save template.");
    } finally {
      setSavingTpl(false);
    }
  };


  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, oRes] = await Promise.all([
        projectsApi.getTaskTemplates(),
        projectsApi.getOrgTaskTemplates(),
      ]);
      const gList: TaskTemplate[] = (Array.isArray(gRes) ? gRes : (gRes as any)?.results ?? []).map((t: any) => ({ ...t, isOrgTemplate: false }));
      const oList: TaskTemplate[] = (Array.isArray(oRes) ? oRes : (oRes as any)?.results ?? []).map((t: any) => ({ ...t, isOrgTemplate: true }));
      const all = [...gList, ...oList];
      setAllTemplates(all);
      const found = all.find(t => t.id === id && t.is_milestone);
      setMilestone(found || null);
      setNameInput(found?.name || "");
      setAllocatedTemplates(all.filter(t => t.milestone_task === id && !t.is_milestone));
    } catch {
      toast.error("Failed to load milestone.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSaveName = async () => {
    if (!milestone || !nameInput.trim()) return;
    setSavingName(true);
    try {
      if (milestone.isOrgTemplate) {
        await projectsApi.updateOrgTaskTemplate(milestone.id, { name: nameInput.trim() });
      } else {
        await projectsApi.updateTaskTemplate(milestone.id, { name: nameInput.trim() });
      }
      setMilestone(prev => prev ? { ...prev, name: nameInput.trim() } : prev);
      setEditingName(false);
      toast.success("Milestone name updated.");
    } catch {
      toast.error("Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!selectedTemplateToAdd) return;
    setAddingTemplate(true);
    try {
      const tpl = allTemplates.find(t => t.id === selectedTemplateToAdd);
      if (!tpl) return;
      const payload = { milestone_task: id } as any;
      if (tpl.isOrgTemplate) {
        await projectsApi.updateOrgTaskTemplate(tpl.id, payload);
      } else {
        await projectsApi.updateTaskTemplate(tpl.id, payload);
      }
      toast.success(`"${tpl.name}" added to this milestone.`);
      setSelectedTemplateToAdd("");
      setShowAddModal(false);
      fetchData();
    } catch {
      toast.error("Failed to add template.");
    } finally {
      setAddingTemplate(false);
    }
  };

  const handleRemoveTemplate = async (tpl: TaskTemplate) => {
    try {
      const payload = { milestone_task: null } as any;
      if (tpl.isOrgTemplate) {
        await projectsApi.updateOrgTaskTemplate(tpl.id, payload);
      } else {
        await projectsApi.updateTaskTemplate(tpl.id, payload);
      }
      toast.success(`"${tpl.name}" removed from milestone.`);
      fetchData();
    } catch {
      toast.error("Failed to remove.");
    }
  };

  const unallocatedTemplates = allTemplates.filter(t => !t.is_milestone && !t.milestone_task);

  const filteredAllocated = allocatedTemplates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredAllocated.length / ITEMS_PER_PAGE));
  const paginatedAllocated = filteredAllocated.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        <span className="text-sm font-bold text-surface-400">Loading milestone...</span>
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-sm font-bold text-surface-400">Milestone not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-accent text-xs font-bold hover:underline">Back</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/task-templates")}
          className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-400 hover:text-foreground flex items-center justify-center transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                className="flex-1 h-9 px-3 bg-surface-100 border border-purple-500/40 focus:border-purple-400 rounded-lg text-base font-black text-foreground outline-none"
              />
              <button onClick={handleSaveName} disabled={savingName} className="h-9 px-4 bg-purple-500 hover:bg-purple-600 text-white text-xs font-black rounded-lg disabled:opacity-50 transition-all">
                {savingName ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingName(false)} className="h-9 px-3 bg-surface-100 hover:bg-surface-200 text-surface-400 text-xs font-bold rounded-lg">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                <span>🎯</span> {milestone.name}
              </h1>
              <button onClick={() => setEditingName(true)} className="w-6 h-6 rounded bg-surface-100 hover:bg-surface-200 text-surface-400 hover:text-foreground flex items-center justify-center transition-all">
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-[11px] text-surface-500 mt-0.5">
            Milestone task group · {allocatedTemplates.length} template{allocatedTemplates.length !== 1 ? "s" : ""} · {milestone.isOrgTemplate ? "Organisation" : "Global"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3 bg-surface-100 border border-surface-200 hover:bg-surface-200 text-foreground font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0"
          >
            Allocate Template
          </button>
          <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="h-8 px-3.5 border border-surface-300 bg-surface-50 hover:bg-surface-200 text-foreground font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shrink-0"
          >
            <UploadCloud className="w-3.5 h-3.5 text-purple-500" />
            <span>Import Excel</span>
          </button>
          <button
            onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }}
            className="h-8 px-3.5 bg-accent hover:opacity-90 text-background font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
        </div>
      </div>

            {/* Allocated templates */}
      <div className="rounded-xl border border-surface-300 bg-surface-50 overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-surface-100 border-b border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-surface-600">Templates in this Milestone</h2>
            <span className="text-[9px] font-bold text-surface-500 bg-surface-200 border border-surface-300 px-2 py-0.5 rounded-full">{allocatedTemplates.length}</span>
          </div>
          
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              type="text"
              placeholder="Search allocated tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-50 border border-surface-200 rounded-md text-xs text-foreground placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
            />
          </div>
        </div>
        
        {allocatedTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <span className="text-3xl opacity-30">📋</span>
            <p className="text-sm font-bold text-surface-400">No templates allocated yet</p>
            <p className="text-[11px] text-surface-500">Click "Add Template" to allocate templates to this milestone group.</p>
            <button onClick={() => setShowAddModal(true)} className="h-8 px-4 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 mt-1">
              <Plus className="w-3 h-3" /> Add Template
            </button>
          </div>
        ) : filteredAllocated.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="text-3xl opacity-30">🔍</span>
            <p className="text-xs font-bold text-foreground">No tasks found.</p>
            <p className="text-[10px] text-surface-500">Try adjusting your search query.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1.5fr_100px_130px_130px] gap-2 px-4 py-2 bg-surface-50 border-b border-surface-200">
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Template Name</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Duration</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600">Checklists</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-surface-600 text-right">Actions</span>
            </div>
            
            <div className="divide-y divide-surface-200">
              {paginatedAllocated.map(tpl => (
                <div key={tpl.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_100px_130px_130px] gap-2 items-center px-4 py-2.5 hover:bg-surface-100/70 transition-colors group">
                  {/* Name + badge */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="text-xs font-bold text-foreground truncate">{tpl.name}</p>
                      {tpl.isOrgTemplate ? (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded shrink-0">
                          <Building2 className="w-2 h-2" /> Org Table
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded shrink-0">
                          <Globe className="w-2 h-2" /> Global
                        </span>
                      )}
                    </div>
                    {tpl.description && <p className="text-[10px] text-surface-500 truncate mt-0.5">{tpl.description}</p>}
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-surface-400" />
                    <span className="text-[11px] font-bold text-foreground">{tpl.default_duration_days}d</span>
                  </div>

                  {/* Checklists count */}
                  <div>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[9px] font-bold border border-accent/25">
                      ✓ {(tpl.default_checklists || []).length} Checkpoints
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:justify-end">
                    <button
                      onClick={() => openEdit(tpl)}
                      className="h-6.5 px-2 rounded-lg bg-surface-200 hover:bg-accent/20 hover:text-accent text-foreground text-[9px] font-bold uppercase transition-all opacity-0 group-hover:opacity-100"
                      title="Edit template details"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemoveTemplate(tpl)}
                      className="h-6.5 px-2 rounded-lg bg-surface-200 hover:bg-red-500/20 hover:text-red-400 text-surface-400 text-[9px] font-bold uppercase transition-all opacity-0 group-hover:opacity-100"
                      title="Remove from milestone"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-t border-surface-200">
                <span className="text-[10px] text-surface-500 font-medium">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAllocated.length)} of {filteredAllocated.length}
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

{/* Add template modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="bg-surface-50 border border-surface-300 w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-surface-100">
                <h3 className="text-sm font-black text-foreground">Add Template to Milestone</h3>
                <button onClick={() => setShowAddModal(false)} className="w-6 h-6 rounded bg-surface-200 hover:bg-red-500 hover:text-white text-foreground flex items-center justify-center text-xs font-bold transition-all">✕</button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Select Template</label>
                  <select
                    value={selectedTemplateToAdd}
                    onChange={e => setSelectedTemplateToAdd(e.target.value ? Number(e.target.value) : "")}
                    className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs font-bold text-foreground outline-none focus:border-accent"
                  >
                    <option value="">Choose a template</option>
                    {unallocatedTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.default_duration_days}d) - {t.isOrgTemplate ? "Org" : "Global"}</option>
                    ))}
                  </select>
                  {unallocatedTemplates.length === 0 && (
                    <p className="text-[10px] text-surface-400 italic">All templates are already allocated to a milestone.</p>
                  )}
                </div>
                <div className="flex items-center gap-2 justify-end pt-2 border-t border-surface-200">
                  <button onClick={() => setShowAddModal(false)} className="h-8 px-4 bg-surface-100 hover:bg-surface-200 text-foreground text-xs font-bold rounded-lg transition-all">Cancel</button>
                  <button
                    onClick={handleAddTemplate}
                    disabled={!selectedTemplateToAdd || addingTemplate}
                    className="h-8 px-4 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-all"
                  >
                    {addingTemplate ? "Adding..." : "Add to Milestone"}
                  </button>
                </div>
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
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base bg-purple-500/15 text-purple-400 shrink-0">
                    <UploadCloud className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      Bulk Import Templates
                    </h3>
                    <p className="text-[10px] text-surface-500">
                      Import templates directly into this milestone.
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
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-black">1</span>
                    <h4 className="text-xs font-bold text-foreground">Download Sample File</h4>
                  </div>
                  <div className="pl-7">
                    <p className="text-[11px] text-surface-500 mb-2">
                      Make sure to specify "{milestone?.name}" in the "Parent Milestone Name" column to link them here automatically.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          await projectsApi.downloadTemplateSample(milestone?.isOrgTemplate ? false : true);
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
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-black">2</span>
                    <h4 className="text-xs font-bold text-foreground">Upload Populated File</h4>
                  </div>
                  <div className="pl-7">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-surface-300 rounded-xl hover:border-purple-400 hover:bg-purple-500/5 transition-all cursor-pointer bg-surface-100">
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
                      await projectsApi.uploadTemplateExcel(milestone?.isOrgTemplate ? false : true, importFile);
                      toast.success("Templates imported successfully!");
                      setShowImportModal(false);
                      setImportFile(null);
                      fetchData();
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to import templates");
                    } finally {
                      setImporting(false);
                    }
                  }}
                  className="h-8 px-5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {importing ? "Importing..." : "Start Import"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create template modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-xl bg-surface-50 border border-surface-300 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-surface-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-base shrink-0">
                    {editingTemplate ? "✏️" : "➕"}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      {editingTemplate ? "Edit Task Template" : "New Task Template"}
                    </h3>
                    <p className="text-[10px] text-surface-500">
                      {editingTemplate 
                        ? `Update details for template "${editingTemplate.name}".`
                        : `Creates and maps a template to milestone group "${milestone.name}".`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowCreateModal(false); setEditingTemplate(null); }}
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
                      value={newTplName}
                      onChange={e => setNewTplName(e.target.value)}
                      placeholder="e.g. Phase 2: Structural Framing"
                      className="w-full h-8 px-2.5 bg-surface-100 border border-surface-300 rounded-lg text-xs font-bold text-foreground outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Duration (Days) *</label>
                    <input
                      type="number"
                      min={1}
                      value={newTplDuration}
                      onChange={e => setNewTplDuration(parseInt(e.target.value) || 1)}
                      className="w-full h-8 px-2.5 bg-surface-100 border border-surface-300 rounded-lg text-xs font-bold text-foreground outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Description / Directives</label>
                  <textarea
                    value={newTplDesc}
                    onChange={e => setNewTplDesc(e.target.value)}
                    placeholder="Standard operating directives..."
                    rows={2}
                    className="w-full p-2 bg-surface-100 border border-surface-300 rounded-lg text-xs font-medium text-foreground outline-none focus:border-purple-400 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Checklists */}
                <div className="space-y-1.5 pt-2 border-t border-surface-200">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-400" />
                    Primary Checklists ({newTplChecklists.length})
                  </label>
                  {newTplChecklists.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {newTplChecklists.map((item, idx) => {
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
                          value={newChecklistInput}
                          onChange={(e) => setNewChecklistInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                          placeholder="Checkpoint title..."
                          className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-purple-400 text-xs font-semibold text-foreground transition-colors"
                        />
                      </div>
                      <div>
                        <select
                          value={newChecklistType}
                          onChange={(e) => setNewChecklistType(e.target.value as any)}
                          className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-purple-400 text-xs font-semibold text-foreground appearance-none"
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
                      className="w-full h-8 px-2.5 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-purple-400 text-xs font-medium text-foreground transition-colors"
                    />
                    <div className="flex justify-end">
                      <button type="button" onClick={addChecklistItem} className="h-7.5 px-3.5 bg-purple-500 text-white font-black text-[9px] uppercase tracking-wider rounded-md hover:opacity-90 flex items-center gap-1 shrink-0 shadow-xs">
                        <Plus className="w-3.5 h-3.5" /> Add Checkpoint
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-200 bg-surface-100 shrink-0">
                <button type="button" onClick={() => { setShowCreateModal(false); setEditingTemplate(null); }} className="h-8 px-4 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors">Cancel</button>
                <button type="button" onClick={handleSaveTemplate} disabled={savingTpl} className="h-8 px-5 bg-purple-500 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5">
                  {savingTpl && <Loader2 className="w-3 h-3 animate-spin" />}
                  {savingTpl ? (editingTemplate ? "Saving..." : "Creating...") : (editingTemplate ? "Save Changes" : "Create & Map")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}