"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MatrixPayload, MilestoneBlockCompact, MilestoneBlockExpanded,
  SpatialZone, MilestonePhase, Task
} from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { MatrixBlockCell } from "./MatrixBlockCell";
import { KanbanDrawer } from "./KanbanDrawer";
import { MatrixOnboardingWizard } from "./MatrixOnboardingWizard";
import { ApplyMatrixPresetModal } from "./ApplyMatrixPresetModal";
import { ZonePhaseDrawersModal } from "./ZonePhaseDrawersModal";
import { toast } from "sonner";
import { useProjectNavStore } from "@/store/project-nav-store";
import { TaskExecutionSidePanel } from "@/components/projects/TaskExecutionSidePanel";
import { AnimatePresence, motion } from "framer-motion";
import { getWebSocketUrl } from "@/lib/api/constants";
import { Trash2, Pencil, FolderKanban, MapPin, Flag } from "lucide-react";


interface MilestoneMatrixViewProps {
  projectUid: string;
  projectTasks: Task[];
  userRole?: "contractor" | "qa_inspector" | "admin" | "viewer";
  onMatrixLoaded?: (hasData: boolean) => void;
  onTaskChange?: () => void;
  readOnly?: boolean;
  initialPayload?: MatrixPayload;
}

export const MilestoneMatrixView: React.FC<MilestoneMatrixViewProps> = ({
  projectUid,
  projectTasks,
  userRole = "admin",
  onMatrixLoaded,
  onTaskChange,
  readOnly = false,
  initialPayload,
}) => {
  const [payload, setPayload] = useState<MatrixPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<MilestoneBlockExpanded | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingBlockId, setLoadingBlockId] = useState<number | null>(null);
  const [loadingCellId, setLoadingCellId] = useState<string | null>(null);

  const [isAddingZone, setIsAddingZone] = useState(false);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  const [showAddZoneInput, setShowAddZoneInput] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [showAddPhaseInput, setShowAddPhaseInput] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editedZoneName, setEditedZoneName] = useState("");
  const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
  const [editedPhaseName, setEditedPhaseName] = useState("");

  // Drawers Modal State for Spatial Zone / Milestone Phase allocated drawings
  const [drawerModalZone, setDrawerModalZone] = useState<SpatialZone | null>(null);
  const [drawerModalPhase, setDrawerModalPhase] = useState<MilestonePhase | null>(null);
  const [isDrawersModalOpen, setIsDrawersModalOpen] = useState(false);


  // ── Split-pane state ──────────────────────────────────────────────────────────
  const { isSidebarCollapsed } = useProjectNavStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);

  const scrollRef = useRef<HTMLDivElement>(null);

  const onTaskChangeRef = useRef(onTaskChange);
  const onMatrixLoadedRef = useRef(onMatrixLoaded);
  useEffect(() => {
    onTaskChangeRef.current = onTaskChange;
    onMatrixLoadedRef.current = onMatrixLoaded;
  }, [onTaskChange, onMatrixLoaded]);

  const refreshMatrix = useCallback(async () => {
    try {
      const data = await projectsApi.getMatrix(projectUid);
      const safeData = {
        ...data,
        zones: data?.zones || [],
        phases: data?.phases || [],
        blocks: data?.blocks || [],
      };
      setPayload(safeData);
      if (onMatrixLoadedRef.current) {
        onMatrixLoadedRef.current(safeData.zones.length > 0 && safeData.phases.length > 0);
      }
      setError(null);
    } catch (err: any) {
      console.error("Failed to refresh matrix", err);
    }
  }, [projectUid]);

  const refreshMatrixRef = useRef(refreshMatrix);
  useEffect(() => {
    refreshMatrixRef.current = refreshMatrix;
  }, [refreshMatrix]);

  // Initial matrix fetch
  useEffect(() => {
    if (initialPayload) {
      const safeInitial = {
        ...initialPayload,
        zones: initialPayload.zones || [],
        phases: initialPayload.phases || [],
        blocks: initialPayload.blocks || [],
      };
      setPayload(safeInitial);
      if (onMatrixLoadedRef.current) {
        onMatrixLoadedRef.current(safeInitial.zones.length > 0 && safeInitial.phases.length > 0);
      }
      setLoading(false);
      return;
    }

    refreshMatrix().finally(() => setLoading(false));
  }, [projectUid, initialPayload, refreshMatrix]);

  // Connect WebSocket for real-time updates (stable connection)
  useEffect(() => {
    if (readOnly || initialPayload) return;

    const wsUrl = getWebSocketUrl(`/ws/projects/${projectUid}/matrix/`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "matrix_update") {
          refreshMatrixRef.current();
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [projectUid, readOnly, initialPayload]);

  const getBlock = (zoneId: number, phaseId: number): MilestoneBlockCompact | null =>
    (payload?.blocks || []).find(b => b.zone_id === zoneId && b.phase_id === phaseId) ?? null;

  const handleCellClick = async (block: MilestoneBlockCompact, zone: SpatialZone, phase: MilestonePhase) => {
    setLoadingBlockId(block.id);
    try {
      let tasks: Task[] = [];
      try {
        tasks = await projectsApi.getBlockTasks(block.id);
      } catch (e) {
        tasks = (block as any).tasks || [];
      }
      const expandedBlock: MilestoneBlockExpanded = {
        ...block,
        tasks: Array.isArray(tasks) ? tasks : [],
        zone_name: zone.name,
        phase_name: phase.name,
      };
      setSelectedBlock(expandedBlock);
      setDrawerOpen(true);
    } catch (err: any) {
      toast.error("Failed to load block details.");
    } finally {
      setLoadingBlockId(null);
    }
  };

  const handleEmptyCellClick = async (zone: SpatialZone, phase: MilestonePhase) => {
    if (readOnly) return;
    const cellId = `${zone.id}-${phase.id}`;
    setLoadingCellId(cellId);
    try {
      const block = await projectsApi.getOrCreateBlock(zone.id, phase.id);
      refreshMatrix();

      const expandedBlock: MilestoneBlockExpanded = {
        ...block,
        tasks: [],
        zone_name: zone.name,
        phase_name: phase.name,
      };
      setSelectedBlock(expandedBlock);
      setDrawerOpen(true);
    } catch (err: any) {
      toast.error("Failed to initialize block.");
    } finally {
      setLoadingCellId(null);
    }
  };

  const handleBlockUpdated = (updated: MilestoneBlockExpanded) => {
    // Refresh matrix totals after a task change
    refreshMatrix();
    if (onTaskChangeRef.current) onTaskChangeRef.current();
    if (selectedBlock?.id === updated.id) {
      setSelectedBlock(updated);
    }
  };

  // ── Manual block unlock / lock ─────────────────────────────────────────────
  const [confirmLockAction, setConfirmLockAction] = useState<{ type: 'lock' | 'unlock', blockId: number } | null>(null);
  const [lockActionLoading, setLockActionLoading] = useState(false);

  const confirmBlockAction = async () => {
    if (!confirmLockAction) return;
    setLockActionLoading(true);
    try {
      if (confirmLockAction.type === 'unlock') {
        const updatedBlock = await projectsApi.unlockBlock(confirmLockAction.blockId);
        toast.success("Block unlocked");
        refreshMatrix();
        if (selectedBlock?.id === confirmLockAction.blockId) {
          setSelectedBlock(prev => prev ? { ...prev, ...updatedBlock, status: "ACTIVE" as const } : prev);
        }
      } else {
        const updatedBlock = await projectsApi.lockBlock(confirmLockAction.blockId);
        toast.success("Block re-locked");
        refreshMatrix();
        if (selectedBlock?.id === confirmLockAction.blockId) {
          setSelectedBlock(prev => prev ? { ...prev, ...updatedBlock, status: "LOCKED" as const } : prev);
        }
      }
      setConfirmLockAction(null);
    } catch (err: any) {
      toast.error(err?.data?.detail || `Could not ${confirmLockAction.type} block.`);
    } finally {
      setLockActionLoading(false);
    }
  };

  const handleUnlockBlock = async (blockId: number, reason?: string) => {
    setConfirmLockAction({ type: 'unlock', blockId });
  };

  const handleLockBlock = async (blockId: number) => {
    setConfirmLockAction({ type: 'lock', blockId });
  };


  const submitAddZone = async () => {
    if (!payload) return;
    const projectId = (payload.project_id && payload.project_id !== 0)
      ? payload.project_id
      : (payload.zones[0]?.project || payload.phases[0]?.project || payload.blocks[0]?.project_id || projectUid);
    if (!projectId || !newZoneName.trim()) return;

    setIsAddingZone(true);
    try {
      await projectsApi.createZone({
        project: projectId,
        name: newZoneName.trim(),
        order: payload.zones.length + 1,
        zone_type: "custom"
      });
      refreshMatrix();
      toast.success("Zone added successfully");
      setShowAddZoneInput(false);
      setNewZoneName("");
    } catch (err: any) {
      toast.error("Failed to add zone: " + (err.message || ""));
    } finally {
      setIsAddingZone(false);
    }
  };

  const submitAddPhase = async () => {
    if (!payload) return;
    const projectId = (payload.project_id && payload.project_id !== 0)
      ? payload.project_id
      : (payload.phases[0]?.project || payload.zones[0]?.project || payload.blocks[0]?.project_id || projectUid);
    if (!projectId || !newPhaseName.trim()) return;

    setIsAddingPhase(true);
    try {
      await projectsApi.createPhase({
        project: projectId,
        name: newPhaseName.trim(),
        sequence_order: payload.phases.length + 1,
        color_hex: "#94a3b8"
      });
      refreshMatrix();
      toast.success("Phase added successfully");
      setShowAddPhaseInput(false);
      setNewPhaseName("");
    } catch (err: any) {
      toast.error("Failed to add phase: " + (err.message || ""));
    } finally {
      setIsAddingPhase(false);
    }
  };

  const handleDeleteZone = async (zone: SpatialZone) => {
    const hasStartedTasks = (payload?.blocks || [])
      .filter(b => b.zone_id === zone.id)
      .some(b => b.status === "DONE" || b.status === "ACTIVE");

    if (hasStartedTasks) {
      toast.error(`Cannot delete zone "${zone.name}": tasks have already been started in this zone.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete zone "${zone.name}"? This zone can be deleted because no tasks have started yet.`)) {
      return;
    }

    try {
      await projectsApi.deleteZone(zone.id);
      toast.success(`Zone "${zone.name}" deleted.`);
      refreshMatrix();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to delete zone.");
    }
  };

  const handleDeletePhase = async (phase: MilestonePhase) => {
    const hasStartedTasks = (payload?.blocks || [])
      .filter(b => b.phase_id === phase.id)
      .some(b => b.status === "DONE" || b.status === "ACTIVE");

    if (hasStartedTasks) {
      toast.error(`Cannot delete phase "${phase.name}": tasks have already been started in this phase.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete phase "${phase.name}"? This phase can be deleted because no tasks have started yet.`)) {
      return;
    }

    try {
      await projectsApi.deletePhase(phase.id);
      toast.success(`Phase "${phase.name}" deleted.`);
      refreshMatrix();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to delete phase.");
    }
  };

  const handleResetMatrix = async () => {
    const hasStartedTasks = (payload?.blocks || []).some(b => b.status === "DONE" || b.status === "ACTIVE");

    if (hasStartedTasks) {
      toast.error("Cannot reset matrix: task(s) in this matrix have already been started.");
      return;
    }

    if (!confirm("Are you sure you want to reset/delete the Master Gate Matrix grid? This is allowed because no tasks have been started yet.")) {
      return;
    }

    try {
      await projectsApi.deleteMatrix(projectUid);
      toast.success("Master gate matrix reset successfully.");
      refreshMatrix();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to reset matrix.");
    }
  };

  const submitEditZone = async (zoneId: number) => {
    if (!editedZoneName.trim()) {
      setEditingZoneId(null);
      return;
    }
    try {
      await projectsApi.updateZone(zoneId, { name: editedZoneName.trim() });
      toast.success("Zone renamed");
      setEditingZoneId(null);
      refreshMatrix();
    } catch (err: any) {
      toast.error("Failed to update zone: " + (err.message || ""));
    }
  };

  const submitEditPhase = async (phaseId: number) => {
    if (!editedPhaseName.trim()) {
      setEditingPhaseId(null);
      return;
    }
    try {
      await projectsApi.updatePhase(phaseId, { name: editedPhaseName.trim() });
      toast.success("Phase renamed");
      setEditingPhaseId(null);
      refreshMatrix();
    } catch (err: any) {
      toast.error("Failed to update phase: " + (err.message || ""));
    }
  };

  // ── Empty State — no zones or phases yet ───────────────────────────────────
  // ── Split-pane layout computation ─────────────────────────────────────────
  const NAV_W = isSidebarCollapsed ? 48 : 185;
  const totalWidth = typeof window !== "undefined" ? window.innerWidth - NAV_W : 1160;
  const MIN_TASK_W = 420;
  const MIN_KANBAN_W = 400;
  const kanbanWidth = selectedTask
    ? Math.max(MIN_KANBAN_W, totalWidth * (1 - splitRatio))
    : totalWidth;
  const taskPanelWidth = selectedTask
    ? Math.max(MIN_TASK_W, totalWidth * splitRatio)
    : 0;

  const handleResizeDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startRatio = splitRatio;
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const newTask = startRatio * totalWidth + delta;
      const clamped = Math.max(MIN_TASK_W, Math.min(totalWidth - MIN_KANBAN_W, newTask));
      setSplitRatio(clamped / totalWidth);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Empty State — no zones or phases yet ──────────────────────────────────────
  if (!loading && payload && (payload.zones.length === 0 || payload.phases.length === 0)) {
    if (showWizard) {
      return (
        <MatrixOnboardingWizard
          projectUid={projectUid}
          onComplete={() => {
            setShowWizard(false);
            refreshMatrix();
          }}
        />
      );
    }

    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4 glass-card bg-surface-100/50 backdrop-blur-md relative overflow-hidden p-8">
          <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-surface-200/50 dark:bg-surface-700/50 flex items-center justify-center text-3xl shadow-inner relative z-10">🏗️</div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-foreground tracking-tight">No Matrix Configured</h3>
            <p className="text-sm text-text-secondary mt-2 font-medium max-w-md mx-auto">
              Use the Onboarding Wizard to define the spatial zones and milestone phases for this project.
            </p>
          </div>
          {!readOnly && userRole === "admin" && (
            <div className="flex items-center gap-3 mt-2 z-10 flex-wrap justify-center">
              <button
                onClick={() => setShowPresetModal(true)}
                className="relative group overflow-hidden h-11 px-6 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>⚡ Select QA/QC Preset or Template</span>
              </button>
              <button
                onClick={() => setShowWizard(true)}
                className="relative group overflow-hidden h-11 px-6 bg-surface-200 border border-surface-300 hover:bg-surface-300 text-foreground font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
              >
                <span>Configure Custom Matrix</span>
              </button>
            </div>
          )}
        </div>

        <ApplyMatrixPresetModal
          isOpen={showPresetModal}
          onClose={() => setShowPresetModal(false)}
          projectUid={projectUid}
          onSuccess={refreshMatrix}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-surface-400">Loading matrix...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <p className="text-sm font-bold text-red-500">{error}</p>
        <button onClick={refreshMatrix} className="text-accent text-sm font-bold hover:underline">Retry</button>
      </div>
    );
  }

  const { zones, phases } = payload!;
  const ZONE_COL_W = 124; // px per zone column (was 128px)
  const PHASE_ROW_H = 124;  // px per phase row (making it a square)
  const HEADER_W = 140;    // px for phase label column (was 180px)

  return (
    <>
      {/* Matrix Header — Zones */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-visible rounded-xl border border-surface-200 bg-surface-100 shadow-sm"
        >
          <table className="border-collapse table-fixed w-max" style={{ width: HEADER_W + (zones.length + (!readOnly && userRole === "admin" ? 1 : 0)) * ZONE_COL_W, minWidth: HEADER_W + (zones.length + (!readOnly && userRole === "admin" ? 1 : 0)) * ZONE_COL_W, maxWidth: HEADER_W + (zones.length + (!readOnly && userRole === "admin" ? 1 : 0)) * ZONE_COL_W }}>
            <thead className="sticky top-0 z-20 bg-surface-100 shadow-sm">
              <tr>
                {/* Corner cell */}
                <th
                  className="sticky left-0 z-30 bg-surface-100/90 backdrop-blur-md border-b border-r border-surface-200 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] text-center shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)]"
                  style={{ width: HEADER_W, minWidth: HEADER_W, height: 52 }}
                >
                  <div className="flex flex-row items-center justify-center h-full">
                    <span className="text-text-secondary">Phase</span>
                    <span className="mx-2 text-surface-300 dark:text-surface-600">/</span>
                    <span className="text-text-secondary">Zone</span>
                  </div>
                </th>
                {/* Zone headers */}
                {zones.map(zone => {
                  const hasStartedTasks = (payload?.blocks || [])
                    .filter(b => b.zone_id === zone.id)
                    .some(b => b.status === "DONE" || b.status === "ACTIVE");

                  return (
                    <th
                      key={zone.id}
                      style={{ width: ZONE_COL_W, minWidth: ZONE_COL_W, height: 52 }}
                      className="border-b border-r border-surface-200 px-2 text-center bg-surface-100/90 backdrop-blur-md relative group"
                    >
                      {editingZoneId === zone.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={editedZoneName}
                            onChange={(e) => setEditedZoneName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitEditZone(zone.id);
                              if (e.key === "Escape") setEditingZoneId(null);
                            }}
                            className="w-full text-[10px] px-1 py-0.5 border border-accent rounded bg-surface-50 text-foreground outline-none font-bold"
                          />
                          <button onClick={() => submitEditZone(zone.id)} className="text-[8px] font-bold text-accent px-1">✓</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <p
                            className="text-[10px] font-black text-foreground uppercase tracking-[0.1em] truncate cursor-pointer hover:text-accent"
                            title="Click to edit zone name"
                            onClick={() => {
                              if (!readOnly && userRole === "admin") {
                                setEditingZoneId(zone.id);
                                setEditedZoneName(zone.name);
                              }
                            }}
                          >
                            {zone.name}
                          </p>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerModalZone(zone);
                                setDrawerModalPhase(null);
                                setIsDrawersModalOpen(true);
                              }}
                              title={`View Drawings & Models allocated to ${zone.name}`}
                              className="p-0.5 rounded text-surface-400 hover:text-accent"
                            >
                              <FolderKanban className="w-2.5 h-2.5" />
                            </button>
                            {!readOnly && userRole === "admin" && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingZoneId(zone.id); setEditedZoneName(zone.name); }}
                                  title="Edit Zone Name"
                                  className="p-0.5 rounded text-surface-400 hover:text-accent"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone); }}
                                  disabled={hasStartedTasks}
                                  title={hasStartedTasks ? "Cannot delete zone: tasks have already been started" : "Delete Zone (no tasks started)"}
                                  className={`p-0.5 rounded ${hasStartedTasks
                                      ? "text-surface-300 cursor-not-allowed"
                                      : "text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    }`}
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </>
                            )}
                          </div>

                        </div>
                      )}
                      {zone.zone_type && (
                        <p className="text-[8px] text-text-secondary font-bold uppercase tracking-[0.2em] mt-0.5 truncate">{zone.zone_type}</p>
                      )}
                    </th>
                  );
                })}

                {/* Add Zone Button Column */}
                {!readOnly && userRole === "admin" && (
                  <th
                    style={{ width: ZONE_COL_W, minWidth: ZONE_COL_W, height: 52 }}
                    className="border-b border-surface-200 px-2 text-center align-middle bg-surface-100/90 backdrop-blur-md"
                  >
                    {showAddZoneInput ? (
                      <div className="flex flex-col gap-1 p-1">
                        <input
                          type="text"
                          autoFocus
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitAddZone();
                            if (e.key === 'Escape') setShowAddZoneInput(false);
                          }}
                          placeholder="Zone name..."
                          className="w-full text-[10px] p-1 border border-surface-300 dark:border-surface-600 rounded outline-none focus:border-accent text-foreground bg-surface-50"
                        />
                        <div className="flex gap-1">
                          <button onClick={submitAddZone} disabled={isAddingZone || !newZoneName.trim()} className="flex-1 bg-accent text-background text-[9px] font-bold py-1 rounded hover:scale-105 transition-transform">Add</button>
                          <button onClick={() => setShowAddZoneInput(false)} className="flex-1 bg-surface-200 text-text-secondary hover:text-foreground text-[9px] font-bold py-1 rounded transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddZoneInput(true)}
                        className="text-[10px] font-bold text-text-secondary hover:text-accent uppercase tracking-[0.2em] border border-dashed border-surface-300 hover:border-accent hover:shadow-[0_0_15px_var(--accent)] hover:shadow-accent/20 rounded-lg w-full h-8 flex items-center justify-center transition-all duration-300"
                      >
                        + Add Zone
                      </button>
                    )}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {phases.map(phase => {
                // Compute phase-level totals
                const phaseBlocks = payload!.blocks.filter(b => b.phase_id === phase.id);
                const phaseDone = phaseBlocks.filter(b => b.status === "DONE").length;
                const phaseActive = phaseBlocks.filter(b => b.status === "ACTIVE").length;
                const phaseTotal = phaseBlocks.length;
                const hasStartedTasksInPhase = phaseActive > 0 || phaseDone > 0;

                return (
                  <tr key={phase.id}>
                    {/* Phase label — sticky left */}
                    <td
                      className="sticky left-0 z-10 bg-surface-100/90 backdrop-blur-md border-b border-r border-surface-200 shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)] p-0 align-middle"
                      style={{ width: HEADER_W, minWidth: HEADER_W, maxWidth: HEADER_W, height: PHASE_ROW_H }}
                    >
                      <div className="relative w-full h-[124px] px-4 py-2 flex flex-col justify-center overflow-hidden">
                        {editingPhaseId === phase.id ? (
                          <div className="flex items-center gap-1 my-1">
                            <input
                              type="text"
                              autoFocus
                              value={editedPhaseName}
                              onChange={(e) => setEditedPhaseName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitEditPhase(phase.id);
                                if (e.key === "Escape") setEditingPhaseId(null);
                              }}
                              className="w-full text-[10px] px-1 py-0.5 border border-accent rounded bg-surface-50 text-foreground outline-none font-bold"
                            />
                            <button onClick={() => submitEditPhase(phase.id)} className="text-[8px] font-bold text-accent px-1">✓</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: phase.color_hex, color: phase.color_hex }} />
                              <span
                                className="text-[11px] font-black text-foreground uppercase tracking-[0.1em] leading-tight line-clamp-2 cursor-pointer hover:text-accent"
                                title="Click to edit phase name"
                                onClick={() => {
                                  if (!readOnly && userRole === "admin") {
                                    setEditingPhaseId(phase.id);
                                    setEditedPhaseName(phase.name);
                                  }
                                }}
                              >
                                {phase.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrawerModalPhase(phase);
                                  setDrawerModalZone(null);
                                  setIsDrawersModalOpen(true);
                                }}
                                title={`View Drawings & Models allocated to ${phase.name}`}
                                className="p-1 rounded text-surface-400 hover:text-purple-500"
                              >
                                <FolderKanban className="w-3 h-3" />
                              </button>
                              {!readOnly && userRole === "admin" && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingPhaseId(phase.id); setEditedPhaseName(phase.name); }}
                                    title="Edit Phase Name"
                                    className="p-1 rounded text-surface-400 hover:text-accent"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePhase(phase); }}
                                    disabled={hasStartedTasksInPhase}
                                    title={hasStartedTasksInPhase ? "Cannot delete phase: tasks have already been started" : "Delete Phase (no tasks started)"}
                                    className={`p-1 rounded ${hasStartedTasksInPhase
                                        ? "text-surface-300 cursor-not-allowed"
                                        : "text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                      }`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>

                          </div>
                        )}
                        {/* Phase progress summary */}
                        <div className="text-[10px] font-bold text-text-secondary tabular-nums">
                          {phaseDone}/{phaseTotal} zones done
                        </div>
                        <div className="h-1 bg-surface-100 dark:bg-surface-700 rounded-full mt-1.5 overflow-hidden shrink-0">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{ width: phaseTotal > 0 ? `${(phaseDone / phaseTotal) * 100}%` : "0%" }}
                          />
                        </div>
                        {phaseActive > 0 && (
                          <span className="mt-1 text-[8px] font-bold text-accent">{phaseActive} zone{phaseActive > 1 ? "s" : ""} in progress</span>
                        )}
                      </div>
                    </td>
                    {/* Zone cells */}
                    {zones.map(zone => {
                      const block = getBlock(zone.id, phase.id);
                      const cellId = `${zone.id}-${phase.id}`;
                      const isLoading = loadingBlockId === block?.id || loadingCellId === cellId;

                      return (
                        <td
                          key={zone.id}
                          className="border-b border-r border-surface-100 border-surface-200/50 p-0 align-middle"
                          style={{ width: ZONE_COL_W, minWidth: ZONE_COL_W, maxWidth: ZONE_COL_W, height: PHASE_ROW_H }}
                        >
                          <div className="w-full h-[124px] flex items-center justify-center overflow-hidden">
                            {isLoading ? (
                              <div className="w-[112px] min-w-[112px] max-w-[112px] h-[112px] min-h-[112px] max-h-[112px] aspect-square rounded-xl bg-surface-50 dark:bg-surface-800/50 flex items-center justify-center overflow-hidden">
                                <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                              </div>
                            ) : (
                              <MatrixBlockCell
                                block={block}
                                zoneName={zone.name}
                                isManager={!readOnly && userRole === "admin"}
                                onClick={block ? () => handleCellClick(block, zone, phase) : (!readOnly ? () => handleEmptyCellClick(zone, phase) : undefined)}
                                onUnlock={!readOnly ? handleUnlockBlock : undefined}
                                onLock={!readOnly ? handleLockBlock : undefined}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Empty cell under Add Zone Button */}
                    {!readOnly && userRole === "admin" && (
                      <td className="border-b border-surface-100 border-surface-200/50 bg-surface-50/30 dark:bg-surface-800/30 p-0">
                        <div className="w-full h-[124px]"></div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Add Phase Row */}
              {!readOnly && userRole === "admin" && (
                <tr>
                  <td className="border-r border-surface-200 p-4 sticky left-0 z-10 bg-surface-100/90 backdrop-blur-md shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)]">
                    {showAddPhaseInput ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          autoFocus
                          value={newPhaseName}
                          onChange={(e) => setNewPhaseName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitAddPhase();
                            if (e.key === 'Escape') setShowAddPhaseInput(false);
                          }}
                          placeholder="Phase name..."
                          className="w-full text-[11px] p-1.5 border border-surface-300 dark:border-surface-600 rounded outline-none focus:border-accent text-foreground bg-surface-50"
                        />
                        <div className="flex gap-1 mt-1">
                          <button onClick={submitAddPhase} disabled={isAddingPhase || !newPhaseName.trim()} className="flex-1 bg-accent text-background text-[10px] font-bold py-1.5 rounded hover:scale-105 transition-transform">Add</button>
                          <button onClick={() => setShowAddPhaseInput(false)} className="flex-1 bg-surface-200 text-text-secondary hover:text-foreground text-[10px] font-bold py-1.5 rounded transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddPhaseInput(true)}
                        className="text-[10px] font-bold text-text-secondary hover:text-accent uppercase tracking-[0.2em] border border-dashed border-surface-300 hover:border-accent hover:shadow-[0_0_15px_var(--accent)] hover:shadow-accent/20 rounded-lg w-full h-8 flex items-center justify-center transition-all duration-300"
                      >
                        + Add Phase
                      </button>
                    )}
                  </td>
                  <td colSpan={zones.length + 1} className="bg-surface-50/30" />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary legend */}
        <div className="flex flex-wrap items-center gap-6 mt-4 px-1">
          {[
            { label: "Locked", dot: "bg-surface-300", count: (payload?.blocks || []).filter(b => b.status === "LOCKED").length },
            { label: "Active", dot: "bg-accent", count: (payload?.blocks || []).filter(b => b.status === "ACTIVE").length },
            { label: "Done", dot: "bg-emerald-500", count: (payload?.blocks || []).filter(b => b.status === "DONE").length },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="text-[9px] font-bold text-surface-500 uppercase tracking-widest">{s.label}</span>
              <span className="text-[10px] font-black text-primary tabular-nums">{s.count}</span>
            </div>
          ))}

          <div className="ml-auto flex items-center gap-4">
            {!readOnly && userRole === "admin" && (
              <button
                onClick={handleResetMatrix}
                disabled={(payload?.blocks || []).some(b => b.status === "DONE" || b.status === "ACTIVE")}
                title={(payload?.blocks || []).some(b => b.status === "DONE" || b.status === "ACTIVE") ? "Cannot reset matrix: Tasks have already been started" : "Reset Matrix Grid"}
                className="text-[9px] font-bold text-surface-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-surface-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Reset Matrix Grid
              </button>
            )}
            <button
              onClick={refreshMatrix}
              className="text-[9px] font-bold text-surface-400 hover:text-accent uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              ↺ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Shared backdrop (covers main-area only, sidebar stays visible) ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 bottom-0 z-40 bg-black/50 backdrop-blur-sm"
            style={{ left: NAV_W, right: 0 }}
            onClick={() => {
              setSelectedTask(null);
              setDrawerOpen(false);
              setSelectedBlock(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Kanban Drawer — slides from LEFT of main-area ── */}
      <AnimatePresence>
        {selectedBlock && drawerOpen && (
          <KanbanDrawer
            block={selectedBlock}
            phase={phases.find(p => p.id === selectedBlock.phase_id)!}
            zone={zones.find(z => z.id === selectedBlock.zone_id)!}
            isOpen={drawerOpen}
            width={kanbanWidth}
            leftOffset={NAV_W}
            onClose={() => { setSelectedTask(null); setDrawerOpen(false); setSelectedBlock(null); }}
            onBlockUpdated={handleBlockUpdated}
            onTaskSelect={setSelectedTask}
            userRole={userRole}
            projectUid={projectUid}
            readOnly={readOnly}
            onUnlockClick={() => setConfirmLockAction({ type: 'unlock', blockId: selectedBlock.id })}
          />
        )}
      </AnimatePresence>

      {/* ── Shared resize handle — between Kanban and Task detail panel ────────── */}
      {selectedTask && drawerOpen && (
        <div
          className="fixed top-0 bottom-0 w-2 z-[49] cursor-col-resize hover:bg-accent/60 transition-colors group"
          style={{ left: NAV_W + kanbanWidth }}
          onPointerDown={handleResizeDrag}
        >
          <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 pl-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span className="w-1 h-1 rounded-full bg-accent" />
          </div>
        </div>
      )}

      {/* ── Task detail panel — slides from RIGHT ────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <TaskExecutionSidePanel
            key={selectedTask.uid}
            task={selectedTask}
            projectId={0}
            projectUid={projectUid}
            projectAssets={[]}
            projectTasks={projectTasks}
            taskTags={[]}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={async () => {
              await refreshMatrix();
              onTaskChangeRef.current?.();
              if (selectedBlock) {
                try {
                  const updatedTasks = await projectsApi.getBlockTasks(selectedBlock.id);
                  const safeTasks = Array.isArray(updatedTasks) ? updatedTasks.filter(t => t && !t.is_deleted) : [];
                  const doneCount = safeTasks.filter(t => t.status === "DONE").length;
                  const totalCount = safeTasks.length;
                  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                  setSelectedBlock(prev => prev ? {
                    ...prev,
                    tasks: safeTasks,
                    completed_tasks: doneCount,
                    total_tasks: totalCount,
                    progress_percent: progressPct,
                  } : null);
                } catch (e) {
                  console.error("Failed to update active block state", e);
                }
              }
            }}
            readOnly={readOnly}
          />
        )}
      </AnimatePresence>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmLockAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setConfirmLockAction(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-xs w-full relative z-10 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  confirmLockAction.type === 'lock' 
                    ? 'bg-amber-500/10 text-amber-500' 
                    : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {confirmLockAction.type === 'lock' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-[15px] font-black text-foreground tracking-tight">
                  {confirmLockAction.type === 'lock' ? "Lock Block?" : "Force Activate?"}
                </h3>
              </div>
              
              <p className="text-xs text-text-secondary mb-5 font-medium leading-relaxed">
                {confirmLockAction.type === 'lock'
                  ? "Are you sure you want to re-lock this block? You will not be able to interact with it until it is unlocked again."
                  : "Are you sure you want to manually activate this block? This overrides the strict phase progression rules."}
              </p>
              
              <div className="flex gap-2 w-full justify-end">
                <button
                  onClick={() => setConfirmLockAction(null)}
                  disabled={lockActionLoading}
                  className="px-4 py-2 bg-surface-200/50 hover:bg-surface-200 text-text-secondary hover:text-foreground font-bold uppercase tracking-widest text-[9px] rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBlockAction}
                  disabled={lockActionLoading}
                  className={`px-4 py-2 font-bold uppercase tracking-widest text-[9px] rounded-lg text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-md ${
                    confirmLockAction.type === 'lock' 
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25' 
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                  }`}
                >
                  {lockActionLoading ? (
                    <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : confirmLockAction.type === 'lock' ? "Lock" : "Activate"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preset & Template Selector Modal */}
      <ApplyMatrixPresetModal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        projectUid={projectUid}
        onSuccess={refreshMatrix}
      />

      {isDrawersModalOpen && (
        <ZonePhaseDrawersModal
          isOpen={isDrawersModalOpen}
          onClose={() => {
            setIsDrawersModalOpen(false);
            setDrawerModalZone(null);
            setDrawerModalPhase(null);
          }}
          projectUid={projectUid}
          zone={drawerModalZone}
          phase={drawerModalPhase}
        />
      )}
    </>
  );
};


export default MilestoneMatrixView;
