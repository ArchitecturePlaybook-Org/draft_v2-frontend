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
import { toast } from "sonner";
import { useProjectNavStore } from "@/store/project-nav-store";
import { TaskExecutionSidePanel } from "@/components/projects/TaskExecutionSidePanel";
import { AnimatePresence, motion } from "framer-motion";
import { getWebSocketUrl } from "@/lib/api/constants";

interface MilestoneMatrixViewProps {
  projectUid: string;
  projectTasks: Task[];
  userRole?: "contractor" | "qa_inspector" | "admin";
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
  
  const [showAddZoneInput, setShowAddZoneInput] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [showAddPhaseInput, setShowAddPhaseInput] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  // ── Split-pane state ──────────────────────────────────────────────────────────
  const { isSidebarCollapsed } = useProjectNavStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);

  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMatrix = useCallback(async () => {
    if (initialPayload) {
      const safeInitial = {
        ...initialPayload,
        zones: initialPayload.zones || [],
        phases: initialPayload.phases || [],
        blocks: initialPayload.blocks || [],
      };
      setPayload(safeInitial);
      if (onMatrixLoaded) {
        onMatrixLoaded(safeInitial.zones.length > 0 && safeInitial.phases.length > 0);
      }
      setLoading(false);
      return;
    }
    try {
      const data = await projectsApi.getMatrix(projectUid);
      const safeData = {
        ...data,
        zones: data?.zones || [],
        phases: data?.phases || [],
        blocks: data?.blocks || [],
      };
      setPayload(safeData);
      if (onMatrixLoaded) {
        onMatrixLoaded(safeData.zones.length > 0 && safeData.phases.length > 0);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load matrix.");
    } finally {
      setLoading(false);
    }
  }, [projectUid, initialPayload, onMatrixLoaded]);

  useEffect(() => {
    fetchMatrix();
    
    if (readOnly || initialPayload) return; // No live updates for static public views

    // Connect WebSocket for real-time updates
    const wsUrl = getWebSocketUrl(`/ws/projects/${projectUid}/matrix/`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "matrix_update") {
          fetchMatrix();
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [fetchMatrix, projectUid, readOnly, initialPayload]);

  const getBlock = (zoneId: number, phaseId: number): MilestoneBlockCompact | null =>
    (payload?.blocks || []).find(b => b.zone_id === zoneId && b.phase_id === phaseId) ?? null;

  const handleCellClick = async (block: MilestoneBlockCompact, zone: SpatialZone, phase: MilestonePhase) => {
    if (readOnly) return;
    setLoadingBlockId(block.id);
    try {
      // Fetch full task details for the expanded block
      const tasks = await projectsApi.getBlockTasks(block.id);
      const expandedBlock: MilestoneBlockExpanded = {
        ...block,
        tasks,
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
      fetchMatrix();
      
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
    fetchMatrix();
    if (onTaskChange) onTaskChange();
    if (selectedBlock?.id === updated.id) {
      setSelectedBlock(updated);
    }
  };

  // ── Manual block unlock / lock ─────────────────────────────────────────────
  const handleUnlockBlock = async (blockId: number, reason?: string) => {
    try {
      const updatedBlock = await projectsApi.unlockBlock(blockId, reason);
      toast.success("Block unlocked");
      fetchMatrix();
      // Update selectedBlock so KanbanDrawer recomputes isLocked immediately
      if (selectedBlock?.id === blockId) {
        setSelectedBlock(prev => prev ? { ...prev, ...updatedBlock, status: "ACTIVE" as const } : prev);
      }
    } catch (err: any) {
      toast.error(err?.data?.detail || "Could not unlock block.");
      throw err;
    }
  };

  const handleLockBlock = async (blockId: number) => {
    try {
      const updatedBlock = await projectsApi.lockBlock(blockId);
      toast.success("Block re-locked");
      fetchMatrix();
      // Update selectedBlock so KanbanDrawer recomputes isLocked immediately
      if (selectedBlock?.id === blockId) {
        setSelectedBlock(prev => prev ? { ...prev, ...updatedBlock, status: "LOCKED" as const } : prev);
      }
    } catch (err: any) {
      toast.error(err?.data?.detail || "Could not lock block.");
      throw err;
    }
  };


  const submitAddZone = async () => {
    if (!payload) return;
    const projectId = payload.project_id || payload.zones[0]?.project || payload.phases[0]?.project || payload.blocks[0]?.project_id;
    if (!projectId || !newZoneName.trim()) return;
    
    setIsAddingZone(true);
    try {
      await projectsApi.createZone({
        project: projectId,
        name: newZoneName.trim(),
        order: payload.zones.length,
        zone_type: "custom"
      });
      fetchMatrix();
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
    const projectId = payload.project_id || payload.phases[0]?.project || payload.zones[0]?.project || payload.blocks[0]?.project_id;
    if (!projectId || !newPhaseName.trim()) return;
    
    setIsAddingPhase(true);
    try {
      await projectsApi.createPhase({
        project: projectId,
        name: newPhaseName.trim(),
        sequence_order: payload.phases.length + 1,
        color_hex: "#94a3b8"
      });
      fetchMatrix();
      toast.success("Phase added successfully");
      setShowAddPhaseInput(false);
      setNewPhaseName("");
    } catch (err: any) {
      toast.error("Failed to add phase: " + (err.message || ""));
    } finally {
      setIsAddingPhase(false);
    }
  };

  // ── Empty State — no zones or phases yet ───────────────────────────────────
  // ── Split-pane layout computation ─────────────────────────────────────────
  const NAV_W = isSidebarCollapsed ? 80 : 280;
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
            fetchMatrix();
          }} 
        />
      );
    }
    
    return (
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
          <button 
            onClick={() => setShowWizard(true)}
            className="mt-2 relative group overflow-hidden h-11 px-8 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_-10px_var(--accent)] z-10"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
            <span className="relative z-10">Configure Matrix</span>
          </button>
        )}
      </div>
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
        <button onClick={fetchMatrix} className="text-accent text-sm font-bold hover:underline">Retry</button>
      </div>
    );
  }

  const { zones, phases } = payload!;
  const ZONE_COL_W = 128; // px per zone column
  const PHASE_ROW_H = 110; // px per phase row
  const HEADER_W = 180;   // px for phase label column

  return (
    <>
      {/* Matrix Header — Zones */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="overflow-auto rounded-2xl border border-surface-200 border-surface-200 bg-surface-100 shadow-sm"
          style={{ maxHeight: "70vh" }}
        >
          <table className="border-collapse" style={{ minWidth: HEADER_W + zones.length * ZONE_COL_W }}>
            <thead className="sticky top-0 z-20 bg-surface-100 shadow-sm">
              <tr>
                {/* Corner cell */}
                <th
                  className="sticky left-0 z-30 bg-surface-100/90 backdrop-blur-md border-b border-r border-surface-200 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] text-center shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)]"
                  style={{ width: HEADER_W, minWidth: HEADER_W, height: 52 }}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-text-secondary">Phase</span>
                    <span className="mx-2 text-surface-300 dark:text-surface-600">/</span>
                    <span className="text-text-secondary">Zone</span>
                  </div>
                </th>
                {/* Zone headers */}
                {zones.map(zone => (
                  <th
                    key={zone.id}
                    style={{ width: ZONE_COL_W, minWidth: ZONE_COL_W, height: 52 }}
                    className="border-b border-r border-surface-200 px-2 text-center bg-surface-100/90 backdrop-blur-md"
                  >
                    <p className="text-[10px] font-black text-foreground uppercase tracking-[0.1em] truncate" title={zone.name}>{zone.name}</p>
                    {zone.zone_type && (
                      <p className="text-[8px] text-text-secondary font-bold uppercase tracking-[0.2em] mt-0.5 truncate">{zone.zone_type}</p>
                    )}
                  </th>
                ))}
                
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

                return (
                  <tr key={phase.id}>
                    {/* Phase label — sticky left */}
                    <td
                      className="sticky left-0 z-10 bg-surface-100/90 backdrop-blur-md border-b border-r border-surface-200 px-4 hover:bg-surface-200/50 transition-colors shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)]"
                      style={{ width: HEADER_W, minWidth: HEADER_W, height: PHASE_ROW_H }}
                    >
                      <div className="flex flex-col h-full justify-center">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: phase.color_hex, color: phase.color_hex }} />
                          <span className="text-[11px] font-black text-foreground uppercase tracking-[0.1em] leading-tight line-clamp-2">{phase.name}</span>
                        </div>
                        {/* Phase progress summary */}
                        <div className="text-[10px] font-bold text-text-secondary tabular-nums">
                          {phaseDone}/{phaseTotal} zones done
                        </div>
                        <div className="h-1 bg-surface-100 dark:bg-surface-700 rounded-full mt-1.5 overflow-hidden">
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
                          className="border-b border-r border-surface-100 border-surface-200/50 p-1.5 align-top"
                          style={{ width: ZONE_COL_W, minWidth: ZONE_COL_W, height: PHASE_ROW_H }}
                        >
                          {isLoading ? (
                            <div className="h-[88px] rounded-xl bg-surface-50 dark:bg-surface-800/50 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                            </div>
                          ) : (
                            <MatrixBlockCell
                              block={block}
                              zoneName={zone.name}
                              isManager={userRole === "admin"}
                              onClick={block ? () => handleCellClick(block, zone, phase) : () => handleEmptyCellClick(zone, phase)}
                              onUnlock={handleUnlockBlock}
                              onLock={handleLockBlock}
                            />
                          )}
                        </td>
                      );
                    })}
                    
                    {/* Empty cell under Add Zone Button */}
                    {!readOnly && userRole === "admin" && (
                      <td className="border-b border-surface-100 border-surface-200/50 bg-surface-50/30 dark:bg-surface-800/30" />
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
        <div className="flex items-center gap-6 mt-4 px-1">
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
          <button
            onClick={fetchMatrix}
            className="ml-auto text-[9px] font-bold text-surface-400 hover:text-accent uppercase tracking-widest flex items-center gap-1 transition-colors"
          >
            ↺ Refresh
          </button>
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

      {/* ── Task detail panel — slides from LEFT of main-area ────────────── */}
      <AnimatePresence>
        {selectedTask && selectedBlock && (
          <TaskExecutionSidePanel
            key={selectedTask.uid}
            task={selectedTask}
            projectId={0}
            projectUid={projectUid}
            projectAssets={[]}
            projectTasks={projectTasks}
            taskTags={[]}
            splitMode
            leftOffset={NAV_W}
            panelWidthOverride={taskPanelWidth}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={() => {}}
          />
        )}
      </AnimatePresence>

      {/* ── Shared resize handle — between task panel and Kanban ────────── */}
      {selectedTask && drawerOpen && (
        <div
          className="fixed top-0 bottom-0 w-2 z-[49] cursor-col-resize hover:bg-accent/60 transition-colors group"
          style={{ left: NAV_W + taskPanelWidth }}
          onPointerDown={handleResizeDrag}
        >
          <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 pl-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span className="w-1 h-1 rounded-full bg-accent" />
          </div>
        </div>
      )}

      {/* ── Kanban Drawer — slides from RIGHT, width = remaining main-area ── */}
      <AnimatePresence>
        {selectedBlock && drawerOpen && (
          <KanbanDrawer
            block={selectedBlock}
            phase={phases.find(p => p.id === selectedBlock.phase_id)!}
            zone={zones.find(z => z.id === selectedBlock.zone_id)!}
            isOpen={drawerOpen}
            width={kanbanWidth}
            onClose={() => { setSelectedTask(null); setDrawerOpen(false); setSelectedBlock(null); }}
            onBlockUpdated={handleBlockUpdated}
            onTaskSelect={setSelectedTask}
            userRole={userRole}
            projectUid={projectUid}
          />
        )}
      </AnimatePresence>
    </>
  );
};
