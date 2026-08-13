"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { projectsApi } from "@/domains/projects/api";
import { SpatialZone, MilestonePhase } from "@/types/projects";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  MapPin,
  Milestone,
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  Globe,
  Building2,
  ChevronDown,
} from "lucide-react";

interface TaskTemplate {
  id: number;
  isOrgTemplate?: boolean;
  name: string;
  description: string;
  default_duration_days: number;
  default_checklists: string[];
  default_subtasks?: any[];
}

interface CreateMatrixTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  onTaskCreated: () => void;
}

export function CreateMatrixTaskModal({
  isOpen,
  onClose,
  projectUid,
  onTaskCreated,
}: CreateMatrixTaskModalProps) {
  const [zones, setZones] = useState<SpatialZone[]>([]);
  const [phases, setPhases] = useState<MilestonePhase[]>([]);
  const [globalTemplates, setGlobalTemplates] = useState<TaskTemplate[]>([]);
  const [orgTemplates, setOrgTemplates] = useState<TaskTemplate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedZoneId, setSelectedZoneId] = useState<number | "">("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | "">("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [checklists, setChecklists] = useState<string[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState("");
  const [subtasks, setSubtasks] = useState<any[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [matrixData, gRes, oRes] = await Promise.all([
        projectsApi.getMatrix(projectUid),
        projectsApi.getTaskTemplates(),
        projectsApi.getOrgTaskTemplates(),
      ]);
      setZones(matrixData?.zones || []);
      setPhases(matrixData?.phases || []);

      const gList: TaskTemplate[] = (Array.isArray(gRes) ? gRes : (gRes as any)?.results ?? []).map(
        (t: any) => ({ ...t, isOrgTemplate: false })
      );
      const oList: TaskTemplate[] = (Array.isArray(oRes) ? oRes : (oRes as any)?.results ?? []).map(
        (t: any) => ({ ...t, isOrgTemplate: true })
      );

      setGlobalTemplates(gList);
      setOrgTemplates(oList);
    } catch {
      toast.error("Failed to load matrix & template data.");
    } finally {
      setLoadingData(false);
    }
  }, [projectUid]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    if (key) {
      const [type, idStr] = key.split(":");
      const list = type === "org" ? orgTemplates : globalTemplates;
      const tpl = list.find((t) => String(t.id) === idStr);
      if (tpl) {
        setTaskTitle(tpl.name);
        setTaskDesc(tpl.description || "");
        const cl: string[] = (tpl.default_checklists || []).map((c: any) =>
          typeof c === "string" ? c : c?.title || ""
        ).filter(Boolean);
        setChecklists(cl);
        setSubtasks(Array.isArray(tpl.default_subtasks) ? tpl.default_subtasks : []);
      }
    } else {
      setTaskTitle("");
      setTaskDesc("");
      setChecklists([]);
      setSubtasks([]);
    }
  };

  const handleCreate = async () => {
    if (!taskTitle.trim()) { toast.error("Task title is required."); return; }
    if (!selectedZoneId) { toast.error("Please select a Zone."); return; }
    if (!selectedPhaseId) { toast.error("Please select a Phase."); return; }

    setIsSaving(true);
    try {
      const block = await projectsApi.getOrCreateBlock(
        Number(selectedZoneId),
        Number(selectedPhaseId)
      );

      const created = await projectsApi.createTask({
        project: block.project_id,
        block: block.id,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        checklists,
        default_checklists: checklists,
        subtasks,
        default_subtasks: subtasks,
        status: "TODO",
      });

      if ((!created?.checklists || created.checklists.length === 0) && checklists.length > 0 && created?.uid) {
        await Promise.allSettled(checklists.map((title) => projectsApi.createChecklistItem(created.uid, title)));
      }

      toast.success("Task created!");
      onTaskCreated();
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create task.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedZoneId("");
    setSelectedPhaseId("");
    setSelectedTemplateKey("");
    setTaskTitle("");
    setTaskDesc("");
    setChecklists([]);
    setSubtasks([]);
    setNewChecklistInput("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="bg-surface-50 border border-surface-300 w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-200 bg-surface-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-foreground">Create Task</h3>
              <p className="text-[10px] text-surface-500 font-medium">Select zone &amp; phase, optionally apply a template.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded bg-surface-200 hover:bg-red-500 hover:text-white text-foreground flex items-center justify-center text-xs font-bold transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3.5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
          {loadingData ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span className="text-xs font-bold text-surface-500">Loading matrix data…</span>
            </div>
          ) : (
            <>
              {/* Zone + Phase */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-surface-600 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> Zone *
                  </label>
                  <div className="relative">
                    <select
                      id="create-matrix-task-zone"
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full h-8 px-2.5 pr-7 bg-surface-100 border border-surface-300 rounded-lg text-xs font-bold text-foreground outline-none focus:border-accent appearance-none cursor-pointer"
                    >
                      <option value="">Select zone…</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-surface-600 flex items-center gap-1">
                    <Milestone className="w-2.5 h-2.5" /> Phase *
                  </label>
                  <div className="relative">
                    <select
                      id="create-matrix-task-phase"
                      value={selectedPhaseId}
                      onChange={(e) => setSelectedPhaseId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full h-8 px-2.5 pr-7 bg-surface-100 border border-surface-300 rounded-lg text-xs font-bold text-foreground outline-none focus:border-accent appearance-none cursor-pointer"
                    >
                      <option value="">Select phase…</option>
                      {phases.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Template selector */}
              {(globalTemplates.length > 0 || orgTemplates.length > 0) && (
                <div className="p-2.5 bg-surface-100 border border-surface-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase tracking-wider text-surface-600 flex items-center gap-1">
                      <ClipboardList className="w-2.5 h-2.5" /> Pre-fill Template
                    </label>
                    {selectedTemplateKey && (
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate("")}
                        className="text-[9px] text-accent hover:underline font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {globalTemplates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-surface-400 flex items-center gap-1">
                        <Globe className="w-2 h-2 text-blue-400" /> Global Table (`projects_tasktemplate`)
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {globalTemplates.map((tpl) => (
                          <button
                            key={`global:${tpl.id}`}
                            type="button"
                            onClick={() => handleSelectTemplate(`global:${tpl.id}`)}
                            className={`text-left px-2 py-1.5 rounded border text-[10px] font-bold transition-all truncate ${
                              selectedTemplateKey === `global:${tpl.id}`
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-surface-300 bg-surface-50 text-foreground hover:border-accent/50"
                            }`}
                          >
                            <span className="truncate block">{tpl.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {orgTemplates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-surface-400 flex items-center gap-1">
                        <Building2 className="w-2 h-2 text-emerald-400" /> Org Table (`projects_orgtasktemplate`)
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {orgTemplates.map((tpl) => (
                          <button
                            key={`org:${tpl.id}`}
                            type="button"
                            onClick={() => handleSelectTemplate(`org:${tpl.id}`)}
                            className={`text-left px-2 py-1.5 rounded border text-[10px] font-bold transition-all truncate ${
                              selectedTemplateKey === `org:${tpl.id}`
                                ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                                : "border-surface-300 bg-surface-50 text-foreground hover:border-emerald-400/50"
                            }`}
                          >
                            <span className="truncate block">{tpl.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Task Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Install Structural Steel Columns"
                  className="w-full h-8 px-2.5 bg-surface-100 border border-surface-300 rounded-lg text-xs font-bold text-foreground outline-none focus:border-accent transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-surface-600">Directives / Notes</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Standard operating directives…"
                  rows={2}
                  className="w-full p-2 bg-surface-100 border border-surface-300 rounded-lg text-xs font-medium text-foreground outline-none focus:border-accent resize-none leading-relaxed"
                />
              </div>

              {/* Checklists */}
              <div className="space-y-1.5 pt-1.5 border-t border-surface-200">
                <label className="text-[9px] font-black uppercase tracking-wider text-surface-600 flex items-center justify-between">
                  <span>Checklists ({checklists.length})</span>
                </label>
                {checklists.length > 0 && (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {checklists.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-surface-100 border border-surface-200 rounded text-[11px]">
                        <span className="w-3.5 h-3.5 rounded border border-accent/40 flex items-center justify-center text-[7px] text-accent shrink-0 font-bold">✓</span>
                        <span className="flex-1 font-medium text-foreground truncate">{item}</span>
                        <button
                          type="button"
                          onClick={() => setChecklists((prev) => prev.filter((_, i) => i !== idx))}
                          className="w-4 h-4 rounded hover:bg-red-500/15 text-surface-400 hover:text-red-400 flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = newChecklistInput.trim();
                        if (val) { setChecklists((p) => [...p, val]); setNewChecklistInput(""); }
                      }
                    }}
                    placeholder="Add checkpoint…"
                    className="flex-1 h-7.5 px-2 bg-surface-100 border border-surface-300 rounded text-[11px] font-medium text-foreground outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newChecklistInput.trim();
                      if (val) { setChecklists((p) => [...p, val]); setNewChecklistInput(""); }
                    }}
                    className="h-7.5 px-2.5 bg-accent text-background rounded text-[9px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>

              {subtasks.length > 0 && (
                <div className="flex items-center gap-1.5 p-2 bg-indigo-500/5 border border-indigo-500/20 rounded-lg text-[10px]">
                  <span className="text-indigo-400 font-bold">{subtasks.length} subtask{subtasks.length > 1 ? "s" : ""} preloaded from template</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-200 bg-surface-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="h-7.5 px-3.5 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || loadingData || !taskTitle.trim() || !selectedZoneId || !selectedPhaseId}
            className="h-7.5 px-4 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
            {isSaving ? "Creating…" : "Create Task"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
