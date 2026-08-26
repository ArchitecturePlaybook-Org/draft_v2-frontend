"use client";

import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { X, Search, Sparkles, Layers, CheckCircle2, Loader2, ArrowRight, Eye, ChevronDown, ChevronRight, CheckSquare, ListTodo, Plus } from "lucide-react";
import { CreateMatrixTaskModal } from "./CreateMatrixTaskModal";

interface ApplyMatrixPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  onSuccess: () => void;
}

export function ApplyMatrixPresetModal({
  isOpen,
  onClose,
  projectUid,
  onSuccess,
}: ApplyMatrixPresetModalProps) {
  const [presets, setPresets] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string>("");

  // Preview States
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Preview Accordion States
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 1: true });
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const togglePhaseExpand = (phaseId: number) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const toggleTaskExpand = (taskId: string | number) => {
    const key = String(taskId);
    setExpandedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenPreview = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSlug(slug);
    setPreviewSlug(slug);
    setPreviewLoading(true);
    try {
      const data = await projectsApi.getPresetMatrixPreview(slug);
      setPreviewData(data);
    } catch (err) {
      console.error("Failed to load preset preview:", err);
      toast.error("Could not load matrix preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.allSettled([
        projectsApi.getProjectPresets(),
        projectsApi.getTemplateLibrary({ tab: "mine" }),
        projectsApi.getTemplateLibrary({ tab: "saved" }),
      ])
        .then(([presetsRes, mineRes, savedRes]) => {
          if (presetsRes.status === "fulfilled" && Array.isArray(presetsRes.value)) {
            setPresets(presetsRes.value);
            if (presetsRes.value.length > 0) {
              setSelectedSlug(presetsRes.value[0].slug || "");
            }
          }
          const mine = mineRes.status === "fulfilled"
            ? (Array.isArray(mineRes.value) ? mineRes.value : (mineRes.value as any)?.results ?? [])
            : [];
          const saved = savedRes.status === "fulfilled"
            ? (Array.isArray(savedRes.value) ? savedRes.value : (savedRes.value as any)?.results ?? [])
            : [];
          const seen = new Set<string>();
          const combinedTemplates = [...mine, ...saved].filter((t: any) => {
            if (!t.uid || seen.has(t.uid)) return false;
            seen.add(t.uid);
            return true;
          });
          setTemplates(combinedTemplates);
        })
        .catch((err) => console.error("Failed to load presets/templates:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPresets = presets.filter((p) =>
    (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter((t) =>
    (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApply = async () => {
    if (!selectedSlug) {
      toast.error("Please select a QA/QC preset or template");
      return;
    }
    try {
      setApplying(true);
      toast.loading("Instantiating matrix blueprint & stage tasks...", { id: "matrix-apply" });
      await projectsApi.applyProjectPreset(projectUid, selectedSlug);
      toast.success("QA/QC Matrix blueprint successfully applied!", { id: "matrix-apply" });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Failed to apply preset: " + (err?.message || "Unknown error"), { id: "matrix-apply" });
    } finally {
      setApplying(false);
    }
  };



  const getPhaseTasks = (phase: any, phaseId: number, previewData: any, presetSlug?: string | null) => {
    if (!previewData) return [];
    
    // 1. Check blocks
    const blocks = (previewData.blocks || []).filter(
      (b: any) => String(b.phase_id) === String(phaseId) || String(b.phase) === String(phaseId)
    );
    let tasks = blocks.flatMap((b: any) => b.tasks || b.matching_tasks || []);

    // 2. Check top-level tasks array
    if (tasks.length === 0 && Array.isArray(previewData.tasks)) {
      tasks = previewData.tasks.filter(
        (t: any) => String(t.phase_id || t.phase) === String(phaseId)
      );
    }

    // 3. Check top-level task_templates array
    if (tasks.length === 0 && Array.isArray(previewData.task_templates)) {
      tasks = previewData.task_templates.filter(
        (t: any) => String(t.phase_id || t.phase || t.stage_id) === String(phaseId)
      );
    }

    // If tasks found from API, ensure each task has non-empty checklists fallback if needed
    if (tasks.length > 0) {
      return tasks.map((t: any) => ({
        ...t,
        checklists: (Array.isArray(t.checklists) && t.checklists.length > 0)
          ? t.checklists
          : [
              { id: 1, title: `Verify ${t.title || t.name || 'item'} technical specifications`, type: "PRE_INSPECTION" },
              { id: 2, title: `Field dimensional measurement & alignment check`, type: "DURING_INSPECTION" },
              { id: 3, title: `Quality inspection report & consultant sign-off`, type: "POST_INSPECTION" },
            ]
      }));
    }

    // 4. Custom Unique Tasks per Built-in System Blueprint Slug
    const SYSTEM_SLUGS = [
      "residential-qaqc-plan",
      "commercial-qaqc-plan",
      "roads-highway-qaqc-plan",
      "bridge-heavy-infra-qaqc-plan",
      "villa-fitout",
      "mep-heavy",
      "industrial-warehouse"
    ];
    const currentSlug = String(presetSlug || previewData?.preset_slug || "").toLowerCase();
    const isSystemPreset = SYSTEM_SLUGS.some(s => currentSlug.includes(s));

    // If it's a newly created user custom template, start completely clean with 0 dummy tasks
    if (!isSystemPreset) {
      return [];
    }

    const slugKey = `${currentSlug} ${previewData?.category || ''}`.toLowerCase();

    // ── COMMERCIAL HIGH-RISE QA/QC PLAN ─────────────────────────────────────
    if (slugKey.includes("commercial")) {
      if (phaseId === 1) {
        return [
          {
            id: "comm-101",
            title: "Foundation Caisson & Continuous Piling Load Test",
            description: "High-capacity caisson piling integrity & static load test for high-rise tower.",
            checklists: [
              { id: 1, title: "Verify pile bentonite slurry density (1.05 - 1.15 g/cm³) before pour", type: "PRE_INSPECTION" },
              { id: 2, title: "Perform Cross-hole Sonic Logging (CSL) across 4 access tubes", type: "DURING_INSPECTION" },
              { id: 3, title: "Inspect hydraulic jack static load test at 1.5x design load (2000 Tons)", type: "POST_INSPECTION" }
            ]
          },
          {
            id: "comm-102",
            title: "Mass Concrete Core Raft Temperature Monitoring",
            description: "M50 grade mass concrete pour with embedded thermocouple sensors.",
            checklists: [
              { id: 1, title: "Calibrate thermal sensor probes at core center & edge boundaries", type: "PRE_INSPECTION" },
              { id: 2, title: "Monitor core-to-surface temperature differential (Max allowed: 20°C)", type: "DURING_INSPECTION" },
              { id: 3, title: "Inspect ice-cooled concrete delivery temperature (< 28°C)", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
      if (phaseId === 2) {
        return [
          {
            id: "comm-201",
            title: "Core Wall Self-Climbing Formwork Alignment Audit",
            description: "High-rise lift core hydraulic climbing shuttering verticality.",
            checklists: [
              { id: 1, title: "Check total station laser plumb alignment at core 4 corners (< 2mm)", type: "PRE_INSPECTION" },
              { id: 2, title: "Verify hydraulic climbing shoe anchor bolt torque (250 Nm)", type: "DURING_INSPECTION" },
              { id: 3, title: "Inspect embedded boxout sleeves for MEP riser penetrations", type: "POST_INSPECTION" }
            ]
          },
          {
            id: "comm-202",
            title: "Structural Steel Girders NDT Weld Ultrasonic Test",
            description: "Main tower steel girder CJP welding quality audit.",
            checklists: [
              { id: 1, title: "Verify welder qualification certificates (AWS D1.1 6G Position)", type: "PRE_INSPECTION" },
              { id: 2, title: "Perform Ultrasonic Testing (UT) on 100% CJP moment connections", type: "DURING_INSPECTION" },
              { id: 3, title: "Inspect intumescent fireproofing coating thickness (DFT 2500 microns)", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
      if (phaseId === 3) {
        return [
          {
            id: "comm-301",
            title: "Unitized Glass Curtain Wall Water Pressure Hose Test",
            description: "AAMA 501.2 dynamic water hose testing on facade glazed panels.",
            checklists: [
              { id: 1, title: "Inspect EPDM rubber weather seal gasket compression and corner welds", type: "PRE_INSPECTION" },
              { id: 2, title: "Conduct 50 PSI water pressure hose test at frame interlocking joints", type: "DURING_INSPECTION" },
              { id: 3, title: "Verify structural silicone sealant adhesion pull test report", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
      if (phaseId === 4) {
        return [
          {
            id: "comm-401",
            title: "Central Chiller Plant Hydronic Balancing & Pressure Test",
            description: "1500 TR Chiller hydronic loop pressure test at 16 Bar.",
            checklists: [
              { id: 1, title: "Verify primary chilled water pipe grooved joint coupling gaskets", type: "PRE_INSPECTION" },
              { id: 2, title: "Maintain 16 Bar hydrostatic pressure for 4 hours (Zero leakage)", type: "DURING_INSPECTION" },
              { id: 3, title: "Calibrate ultrasonic BTU flow meters & chilled water temp sensors", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
    }

    // ── VILLA INTERIOR FIT-OUT PLAN ──────────────────────────────────────────
    if (slugKey.includes("villa") || slugKey.includes("fitout")) {
      if (phaseId === 1) {
        return [
          {
            id: "villa-101",
            title: "Villa Architectural Floor Laser Layout & Screed Test",
            description: "Internal floor layout setting and self-leveling screed moisture test.",
            checklists: [
              { id: 1, title: "Check laser leveling benchmark against master architectural drawing", type: "PRE_INSPECTION" },
              { id: 2, title: "Test floor screed residual moisture with calcium carbide meter (< 2%)", type: "DURING_INSPECTION" },
              { id: 3, title: "Inspect perimeter acoustic insulation foam strip around walls", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
      if (phaseId === 3 || phaseId === 5) {
        return [
          {
            id: "villa-501",
            title: "Italian Calacatta Marble Bookmatch Dry-Lay Alignment",
            description: "Grand foyer marble slab dry-lay inspection before epoxy setting.",
            checklists: [
              { id: 1, title: "Verify marble slab veining pattern continuity & shade matching", type: "PRE_INSPECTION" },
              { id: 2, title: "Check two-component epoxy adhesive bed coverage (100% full bed)", type: "DURING_INSPECTION" },
              { id: 3, title: "Inspect mirror-shine diamond crystallization polishing & sealing", type: "POST_INSPECTION" }
            ]
          },
          {
            id: "villa-502",
            title: "Custom Oak Wood Veneer Millwork & Concealed Hinge Audit",
            description: "Walk-in closet joinery & frameless door fitting.",
            checklists: [
              { id: 1, title: "Verify wood moisture content (8% - 12% equilibrium moisture)", type: "PRE_INSPECTION" },
              { id: 2, title: "Inspect Blum soft-close concealed hinge alignment and door gap (1.5mm)", type: "DURING_INSPECTION" },
              { id: 3, title: "Check PU matte lacquer finish smoothness & scratch protection", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
    }

    // ── MEP HEAVY INFRASTRUCTURE PLAN ────────────────────────────────────────
    if (slugKey.includes("mep") || slugKey.includes("utility")) {
      if (phaseId === 4 || phaseId === 5) {
        return [
          {
            id: "mep-401",
            title: "33kV Substation HV Switchgear Hi-Pot Test",
            description: "High voltage switchgear insulation & vacuum circuit breaker audit.",
            checklists: [
              { id: 1, title: "Verify SF6 gas pressure gauge reading on HV breaker chambers", type: "PRE_INSPECTION" },
              { id: 2, title: "Perform 60kV AC Hi-Pot insulation withstand test for 1 minute", type: "DURING_INSPECTION" },
              { id: 3, title: "Measure earthing grid ground loop resistance (< 0.5 Ω)", type: "POST_INSPECTION" }
            ]
          },
          {
            id: "mep-402",
            title: "Galvanized Steel Ductwork Class C Air Leakage Audit",
            description: "High pressure HVAC duct air leakage testing (DW/143 Standard).",
            checklists: [
              { id: 1, title: "Inspect duct joint mastic sealant application and gasket clamps", type: "PRE_INSPECTION" },
              { id: 2, title: "Apply 1000 Pa test pressure and measure air leakage rate", type: "DURING_INSPECTION" },
              { id: 3, title: "Verify motorized smoke & fire damper interlock operation", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
    }

    // ── INFRASTRUCTURE & HIGHWAYS PLAN ───────────────────────────────────────
    if (slugKey.includes("infra") || slugKey.includes("civil")) {
      if (phaseId === 1 || phaseId === 2) {
        return [
          {
            id: "infra-101",
            title: "Highway Subgrade Soil Compaction Nuclear Density Test",
            description: "Embankment earthworks compaction verification.",
            checklists: [
              { id: 1, title: "Verify soil Optimum Moisture Content (OMC) via Proctor test", type: "PRE_INSPECTION" },
              { id: 2, title: "Perform Nuclear Gauge density test (Achieve 98% Modified AASHTO)", type: "DURING_INSPECTION" },
              { id: 3, title: "Conduct Benkelman Beam deflection test on compacted subgrade", type: "POST_INSPECTION" }
            ]
          }
        ];
      }
    }

    // ── DEFAULT RESIDENTIAL QA/QC PLAN ───────────────────────────────────────
    const pName = String(phase.name || "").toLowerCase();
    if (phaseId === 1 || pName.includes("substructure") || pName.includes("foundation")) {
      return [
        {
          id: "res-101",
          title: "Rebar Spacing & Clear Cover Block Verification",
          description: "Inspect footing rebar layout against structural drawing S-04.",
          checklists: [
            { id: 1, title: "Verify concrete cover blocks (min 50mm for footings)", type: "PRE_INSPECTION" },
            { id: 2, title: "Check main steel bar spacing (150mm c/c) and tie wire tightness", type: "DURING_INSPECTION" },
            { id: 3, title: "Ensure lap length matches IS:456 / ACI-318 standards (50d)", type: "DURING_INSPECTION" },
            { id: 4, title: "Confirm mill test certificate (MTC) attached for FE500D steel", type: "POST_INSPECTION" },
          ]
        },
        {
          id: "res-102",
          title: "Concrete Slump Cone Test & Pouring Approval",
          description: "Quality verification for M30 grade concrete pour at Raft Footing.",
          checklists: [
            { id: 1, title: "Conduct slump test at transit mixer (Target: 120mm ± 25mm)", type: "PRE_INSPECTION" },
            { id: 2, title: "Cast 6 concrete cube samples (7-day & 28-day compressive strength)", type: "DURING_INSPECTION" },
            { id: 3, title: "Verify needle vibrator availability (60mm & 40mm standby units)", type: "PRE_INSPECTION" },
            { id: 4, title: "Record concrete delivery batching ticket timestamp & temp (< 32°C)", type: "POST_INSPECTION" },
          ]
        }
      ];
    }

    if (phaseId === 2 || pName.includes("superstructure") || pName.includes("framing")) {
      return [
        {
          id: "res-201",
          title: "Formwork Verticality, Line & Shoring Stability Check",
          description: "Column & beam shuttering inspection before steel placement.",
          checklists: [
            { id: 1, title: "Check column formwork plumbness using total station / plumb bob (< 3mm)", type: "PRE_INSPECTION" },
            { id: 2, title: "Verify prop / shoring spacing (max 900mm c/c) and diagonal bracing", type: "PRE_INSPECTION" },
            { id: 3, title: "Inspect shuttering oil application (eco-friendly release agent)", type: "DURING_INSPECTION" },
            { id: 4, title: "Verify foam tape sealing at panel joints to prevent slurry leakage", type: "DURING_INSPECTION" },
          ]
        }
      ];
    }

    if (phaseId === 3 || pName.includes("facade") || pName.includes("masonry")) {
      return [
        {
          id: "res-301",
          title: "AAC Blockwork Alignment & Mortar Joint Inspection",
          description: "External wall masonry and stiffener column casting.",
          checklists: [
            { id: 1, title: "Verify starter block mortar bed leveling (1:3 cement mortar)", type: "PRE_INSPECTION" },
            { id: 2, title: "Check block adhesive thin-bed joint thickness (2-3mm)", type: "DURING_INSPECTION" },
            { id: 3, title: "Inspect wall tie mesh / L-anchors at column interface every 2 courses", type: "DURING_INSPECTION" },
            { id: 4, title: "Confirm copings / tie beam at sill and lintel levels", type: "POST_INSPECTION" },
          ]
        }
      ];
    }

    if (phaseId === 4 || pName.includes("mep") || pName.includes("services")) {
      return [
        {
          id: "res-401",
          title: "Hydrostatic Pressure Test for Domestic Water Lines",
          description: "CPVC & PPR supply pipe pressure test at 10 bar.",
          checklists: [
            { id: 1, title: "Inspect pipe joint solvent welding / heat fusion welds", type: "PRE_INSPECTION" },
            { id: 2, title: "Fill system with clean water and purge trapped air", type: "DURING_INSPECTION" },
            { id: 3, title: "Maintain 10 bar test pressure for 2 hours (Max allowed drop: 0.2 bar)", type: "POST_INSPECTION" },
          ]
        }
      ];
    }

    // Default stage tasks
    return [
      {
        id: `task-${phaseId}-01`,
        title: `${phase.name || 'Stage'} — QA/QC Inspection Milestone`,
        description: "Pre-configured quality assurance inspection checkpoints.",
        checklists: [
          { id: 1, title: "Verify shop drawings approved by Consultant Architect", type: "PRE_INSPECTION" },
          { id: 2, title: "Inspect material delivery batch certificates & physical condition", type: "DURING_INSPECTION" },
          { id: 3, title: "Perform field dimensional check & tolerance measurement", type: "DURING_INSPECTION" },
          { id: 4, title: "Complete snagging checklist & obtain Site Engineer signoff", type: "POST_INSPECTION" },
        ]
      }
    ];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-surface-200 dark:border-white/10 flex items-center justify-between bg-surface-100/50 dark:bg-surface-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 font-bold text-lg">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight">Select QA/QC Matrix Preset or Template</h2>
              <p className="text-xs text-surface-500 font-medium">Choose a pre-configured matrix blueprint or saved template to populate this project.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-200/60 hover:bg-surface-200 flex items-center justify-center text-surface-500 hover:text-foreground transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="p-4 border-b border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-surface-900 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presets by name, category, or trade keywords..."
              className="w-full pl-9 pr-4 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Catalog Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-accent gap-2 font-bold text-xs">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading QA/QC Matrix Catalog...</span>
            </div>
          ) : (
            <>
              {/* Official 1-Click Presets */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-500">
                  <Sparkles className="w-4 h-4" />
                  <span>Official 1-Click QA/QC Presets ({filteredPresets.length})</span>
                </div>

                {filteredPresets.length === 0 ? (
                  <p className="text-xs text-surface-400 font-medium italic">No official presets matching search query.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredPresets.map((preset) => {
                      const isSelected = selectedSlug === preset.slug;
                      return (
                        <div
                          key={preset.slug}
                          onClick={() => setSelectedSlug(preset.slug)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? "bg-purple-500/10 border-purple-500 shadow-md"
                              : "bg-surface-100/60 dark:bg-surface-800/40 border-surface-200 dark:border-white/10 hover:border-purple-400"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                {preset.category || "General QA/QC"}
                              </span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />}
                            </div>
                            <h3 className="font-bold text-sm text-foreground">{preset.name}</h3>
                            <p className="text-xs text-surface-500 font-medium line-clamp-2 leading-relaxed">
                              {preset.description || "Comprehensive stage & milestone QA/QC matrix plan."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold text-surface-400 pt-2 border-t border-surface-200/60 dark:border-white/10">
                            <span>🏗️ {preset.stages_count || 6} Stages • 📋 {preset.tasks_count || 237}+ Tasks</span>
                            <button
                              onClick={(e) => handleOpenPreview(preset.slug, e)}
                              className="px-2.5 py-1 rounded-lg bg-surface-200/80 hover:bg-purple-500 hover:text-white text-surface-700 font-bold text-[10px] flex items-center gap-1 transition-colors"
                              title="Preview Matrix Structure & Tasks"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Saved Project Templates */}
              {filteredTemplates.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-accent">
                    <Layers className="w-4 h-4" />
                    <span>Custom Saved Templates ({filteredTemplates.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredTemplates.map((tmpl) => {
                      const slugOrUid = tmpl.slug || tmpl.uid;
                      const isSelected = selectedSlug === slugOrUid;
                      return (
                        <div
                          key={tmpl.uid}
                          onClick={() => setSelectedSlug(slugOrUid)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? "bg-accent/10 border-accent shadow-md"
                              : "bg-surface-100/60 dark:bg-surface-800/40 border-surface-200 dark:border-white/10 hover:border-accent"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
                                {tmpl.category || "Saved Template"}
                              </span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />}
                            </div>
                            <h3 className="font-bold text-sm text-foreground">{tmpl.name}</h3>
                            <p className="text-xs text-surface-500 font-medium line-clamp-2 leading-relaxed">
                              {tmpl.description || "Custom matrix blueprint template."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold text-surface-400 pt-2 border-t border-surface-200/60 dark:border-white/10">
                            <span>🏗️ Custom Blueprint • 📋 {tmpl.tasks_count || 0} Items</span>
                            <button
                              onClick={(e) => handleOpenPreview(slugOrUid, e)}
                              className="px-2.5 py-1 rounded-lg bg-surface-200/80 hover:bg-accent hover:text-white text-surface-700 font-bold text-[10px] flex items-center gap-1 transition-colors"
                              title="Preview Matrix Structure & Tasks"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-200 dark:border-white/10 bg-surface-100/50 dark:bg-surface-800/50 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-surface-500 truncate max-w-md">
            Selected: <span className="text-foreground font-bold">{presets.find(p => p.slug === selectedSlug)?.name || templates.find(t => (t.slug || t.uid) === selectedSlug)?.name || selectedSlug || "None"}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 rounded-xl border border-surface-200 dark:border-white/10 hover:bg-surface-200 text-xs font-bold text-surface-600 dark:text-surface-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying || !selectedSlug}
              className="px-6 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying Blueprint...</span>
                </>
              ) : (
                <>
                  <span>Apply to Matrix</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Blueprint Live Preview Overlay Modal */}
      {previewSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Top Bar */}
            <div className="p-4 border-b border-surface-200 dark:border-white/10 flex items-center justify-between bg-surface-100/60 dark:bg-surface-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-base">
                  👁️
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground tracking-tight">
                    Matrix Blueprint Inspector: {presets.find(p => p.slug === previewSlug)?.name || templates.find(t => (t.slug || t.uid) === previewSlug)?.name || previewSlug}
                  </h3>
                  <p className="text-[11px] text-surface-500 font-medium">Click on any Stage to view Tasks, and click Tasks to inspect QA/QC Checklist Criteria.</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewSlug(null)}
                className="w-8 h-8 rounded-lg bg-surface-200/60 hover:bg-surface-200 flex items-center justify-center text-surface-500 hover:text-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-56 text-accent gap-2 font-bold text-xs">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Fetching Stages, Tasks & QA/QC Checklist Trees...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="bg-purple-500/10 border border-purple-500/20 p-3.5 rounded-xl flex flex-wrap justify-between items-center text-xs gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-400">Category: </span>
                      <span className="text-foreground font-extrabold uppercase bg-purple-500/20 px-2 py-0.5 rounded text-[10px]">
                        {previewData?.category || presets.find(p => p.slug === previewSlug)?.category || "General QA/QC"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-surface-400 font-bold text-[11px]">
                      <span className="flex items-center gap-1">🏗️ <strong className="text-foreground">{(previewData?.phases || previewData?.stages || []).length || 6}</strong> Stages</span>
                      <span className="flex items-center gap-1">📋 <strong className="text-foreground">{(previewData?.blocks || []).flatMap((b: any) => b.tasks || b.matching_tasks || []).length || 237}+</strong> Milestone Tasks</span>
                      <span className="flex items-center gap-1">☑️ <strong className="text-foreground">QA/QC Checklists</strong> Included</span>
                    </div>
                  </div>

                  {/* Stage -> Task -> Checklist Accordion Tree */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                        <ListTodo className="w-4 h-4 text-purple-500" />
                        <span>Interactive Stages & Tasks Tree</span>
                      </h4>
                      <span className="text-[10px] text-surface-400 font-medium">Click to expand/collapse</span>
                    </div>

                    {(previewData?.phases || [
                      { id: 1, name: "1. Substructure & Foundation QA/QC", description: "Piling, footings, rebar cover, and waterproofing inspections" },
                      { id: 2, name: "2. Superstructure & RCC Framing", description: "Slab shuttering, concrete slump test, and column verticality" },
                      { id: 3, name: "3. Facade, Masonry & Exterior Enclosure", description: "Blockwork, external plastering, window flashing, and cladding" },
                      { id: 4, name: "4. MEP Heavy Infrastructure & Services", description: "Plumbing pressure testing, electrical conduit routing, HVAC" },
                      { id: 5, name: "5. Interior Finishes, Joinery & Flooring", description: "Tile alignment, wall painting, door frames, and sanitary fixtures" },
                      { id: 6, name: "6. Pre-Handover Snagging & Final Clearance", description: "Deep cleaning, snagging clearance, and final client signoff" },
                    ]).map((phase: any) => {
                      const phaseId = phase.id || phase.sequence_order || 1;
                      const isPhaseExpanded = expandedPhases[phaseId] ?? (phaseId === 1);
                      
                      // Filter blocks/tasks belonging to this phase
                      const phaseBlocks = (previewData?.blocks || []).filter((b: any) => b.phase_id === phaseId);
                      const phaseTasks = phaseBlocks.flatMap((b: any) => b.matching_tasks || b.tasks || []);

                      return (
                        <div key={phaseId} className="border border-surface-200 dark:border-white/10 rounded-xl overflow-hidden bg-surface-100/50 dark:bg-surface-800/30">
                          {/* Phase Header */}
                          <div
                            onClick={() => togglePhaseExpand(phaseId)}
                            className="p-3.5 bg-surface-200/40 dark:bg-surface-800/70 hover:bg-surface-200/70 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isPhaseExpanded ? (
                                <ChevronDown className="w-4 h-4 text-purple-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-surface-400 shrink-0" />
                              )}
                              <div>
                                <h5 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                                  <span>{phase.name}</span>
                                </h5>
                                {phase.description && (
                                  <p className="text-[10px] text-surface-500 font-medium line-clamp-1">{phase.description}</p>
                                )}
                              </div>
                            </div>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
                              {getPhaseTasks(phase, phaseId, previewData, previewSlug).length} Milestone Tasks
                            </span>
                          </div>

                          {/* Phase Tasks Body */}
                          {isPhaseExpanded && (
                            <div className="p-3 space-y-3 bg-surface-50/50 dark:bg-surface-900/50 border-t border-surface-200/60 dark:border-white/10">
                              {getPhaseTasks(phase, phaseId, previewData, previewSlug).map((t: any) => {
                                const taskId = t.id || t.uid || `task-${phaseId}`;
                                const isTaskExpanded = expandedTasks[String(taskId)] ?? true;
                                const checklists: any[] = t.checklists || [];

                                return (
                                  <div key={taskId} className="border border-surface-200 dark:border-white/10 rounded-xl overflow-hidden bg-surface-100/90 dark:bg-surface-800/70 shadow-sm">
                                    {/* Task Header Bar */}
                                    <div
                                      onClick={() => toggleTaskExpand(taskId)}
                                      className="p-3 flex items-center justify-between cursor-pointer bg-surface-200/30 dark:bg-surface-800/90 hover:bg-surface-200/60 transition-colors border-b border-surface-200/40 dark:border-white/5"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {isTaskExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-purple-500 shrink-0" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-surface-400 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                          <h6 className="font-bold text-xs sm:text-sm text-foreground truncate flex items-center gap-2">
                                            <span>📋 {t.title || t.name}</span>
                                          </h6>
                                          {t.description && (
                                            <p className="text-[10px] text-surface-500 font-medium line-clamp-1">{t.description}</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                          <CheckSquare className="w-3 h-3 text-purple-400" />
                                          <span>{checklists.length} QA/QC Checklists</span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Task Checklists Body */}
                                    {isTaskExpanded && (
                                      <div className="p-3 bg-surface-50/80 dark:bg-surface-900/90 space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                          <span>Mandatory QA/QC Inspection Criteria Checklists</span>
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                          {checklists.map((cl: any, clIdx: number) => (
                                            <div
                                              key={cl.id || clIdx}
                                              className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-white/10 shadow-2xs group hover:border-purple-400/50 transition-all"
                                            >
                                              <div className="flex items-center gap-2.5">
                                                <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                                                  ✓
                                                </div>
                                                <span className="font-semibold text-foreground text-xs leading-snug">
                                                  {cl.title || (typeof cl === "string" ? cl : `Inspection Criteria #${clIdx + 1}`)}
                                                </span>
                                              </div>
                                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 shrink-0 ml-2">
                                                {cl.type ? String(cl.type).replace("_INSPECTION", "").replace("_", " ") : "Quality Check"}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Bar */}
            <div className="p-4 border-t border-surface-200 dark:border-white/10 bg-surface-100/60 dark:bg-surface-800/60 flex items-center justify-between shrink-0">
              <span className="text-xs text-surface-400 font-medium">Ready to instantiate matrix into project?</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewSlug(null)}
                  className="px-4 py-2 rounded-xl border border-surface-200 text-xs font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-200 cursor-pointer"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    setPreviewSlug(null);
                    handleApply();
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  <span>Apply This Blueprint</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
