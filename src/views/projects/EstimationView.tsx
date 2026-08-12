"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/project-store";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";
import { TakeoffCanvas } from "@/components/estimation/TakeoffCanvas";
import { EstimationGrid } from "@/components/estimation/EstimationGrid";
import { Toolbar } from "@/components/estimation/Toolbar";
import { useEstimationAutoSave } from "@/components/estimation/useEstimationAutoSave";
import { useEstimationStore } from "@/store/estimation-store";
import { TakeoffType } from "@/types/estimation.types";

interface EstimationSummaryType {
  grand_total?: number;
  items?: {
    description: string;
    item_code: string;
    total_qty: number;
    unit: string;
    total_cost: number;
  }[];
}

interface EstimationViewProps {
  projectUid: string;
}

export function EstimationView({ projectUid }: EstimationViewProps) {
  const { project, isLoading, fetchProject } = useProjectStore();
  const { setItems, setLastSavedItems, setFloorPlanId, syncStatus } = useEstimationStore();
  
  // Hook up Auto-Save
  useEstimationAutoSave();

  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  
  const [estimations, setEstimations] = useState<unknown[]>([]);
  const [estimationSummary, setEstimationSummary] = useState<EstimationSummaryType | null>(null);

  useEffect(() => {
    fetchProject(projectUid);
    projectsApi.getEstimationSummary(projectUid).then(setEstimationSummary).catch(console.error);
  }, [projectUid, fetchProject]);

  useEffect(() => {
    if (selectedAssetId) {
      setFloorPlanId(selectedAssetId);
      projectsApi.getEstimations(selectedAssetId).then(data => {
        const mappedItems = data.map((be: { id: number; item_code: string; description: string; trace_data?: { type?: string; points?: { x: number; y: number }[]; color?: string; multiplier?: string; unit_cost?: number }; unit: string; gross_qty: number; net_qty: number }) => ({
          id: crypto.randomUUID(), // New frontend UUID
          backendId: be.id, // Keep track of DB ID
          item_code: be.item_code,
          description: be.description,
          type: (be.trace_data?.type === 'polygon' ? 'area' : be.trace_data?.type === 'line' ? 'length' : be.trace_data?.type === 'point' ? 'count' : be.trace_data?.type || 'area') as TakeoffType,
          points: be.trace_data?.points || [],
          color: be.trace_data?.color || '#D4AF37',
          unit: be.unit || 'sqft',
          gross_qty: Number(be.gross_qty) || 0,
          multiplier: be.trace_data?.multiplier || "1",
          net_qty: Number(be.net_qty) || 0,
          unit_cost: Number(be.trace_data?.unit_cost || 0),
          total_cost: Number(be.net_qty || 0) * Number(be.trace_data?.unit_cost || 0)
        }));
        setItems(mappedItems);
        setLastSavedItems(mappedItems); // Initialize baseline for auto-save
        setEstimations(data);
      }).catch(console.error);
    } else {
      setFloorPlanId(null);
      setItems([]);
      setLastSavedItems([]);
      Promise.resolve().then(() => {
        setEstimations([]);
      });
    }
  }, [selectedAssetId, setFloorPlanId, setItems, setLastSavedItems]);

  const floorPlans = project?.assets?.filter(a => a.category === "2d_plan") || [];
  const selectedAsset = floorPlans.find(a => a.id === selectedAssetId);

  // Auto-select first floor plan if none selected
  useEffect(() => {
    if (floorPlans.length > 0 && !selectedAssetId) {
      setSelectedAssetId(floorPlans[0].id);
    }
  }, [floorPlans, selectedAssetId]);

  if (isLoading || !project) return <div className="flex h-full items-center justify-center"><Spinner size="lg" label="Loading Estimation Workspace..." /></div>;

  const [rightPanelSubTab, setRightPanelSubTab] = useState<"grid" | "summary">("grid");

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-50 animate-fade-in relative">
      
      {/* Central Canvas Area (Takes full left width) */}
      <div className="flex-1 h-full relative flex flex-col bg-[url('/grid-pattern.svg')] bg-[length:32px_32px] dark:bg-[url('/grid-pattern-dark.svg')] z-0 overflow-hidden min-w-0">
        
        {/* Top Header Bar */}
        <div className="h-11 bg-surface-50/80 backdrop-blur-2xl border-b border-surface-200 flex items-center px-3 sm:px-4 justify-between shrink-0 shadow-xs relative z-10 gap-2">
          
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 bg-accent/10 rounded-md flex items-center justify-center text-accent text-xs shadow-inner shrink-0">
              📐
            </div>
            
            {/* 2D Floor Plan Header Dropdown */}
            <div className="relative flex items-center min-w-0">
              <select
                value={selectedAssetId || ""}
                onChange={(e) => setSelectedAssetId(Number(e.target.value) || null)}
                className="appearance-none bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-lg pl-2.5 pr-7 py-1 text-xs font-black text-primary outline-none focus:border-accent cursor-pointer truncate max-w-[180px] sm:max-w-[280px] transition-colors"
              >
                {floorPlans.length === 0 ? (
                  <option value="" disabled>No 2D Plans Uploaded</option>
                ) : (
                  floorPlans.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({(asset.size / 1024).toFixed(1)} KB)
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute right-2 text-surface-400 text-[9px]">▼</div>
            </div>

            {/* Auto-save Status Indicator */}
            <div className="flex items-center gap-1.5 ml-1 sm:ml-2 bg-surface-100/50 px-2 py-0.5 rounded-full border border-surface-200 shrink-0">
              {syncStatus === 'saving' && <><Spinner size="sm" /> <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Saving...</span></>}
              {syncStatus === 'saved' && <><span className="text-emerald-500 text-xs">✓</span> <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Saved</span></>}
              {syncStatus === 'error' && <><span className="text-red-500 text-xs">⚠️</span> <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Error</span></>}
              {syncStatus === 'idle' && <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Synced</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRightPanelOpen(prev => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 bg-accent text-background font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-xs"
            >
              📊 Takeoff Summary
            </button>
          </div>
        </div>
        
        {/* Canvas Body */}
        {selectedAsset ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            key={selectedAsset.id}
            className="flex-1 relative overflow-hidden flex flex-col p-2 sm:p-3 bg-surface-50/50 backdrop-blur-[2px]"
          >
            <Toolbar />
            {selectedAsset.file ? (
              <TakeoffCanvas imageUrl={selectedAsset.file} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-surface-100 text-center p-8 rounded-xl border border-dashed border-surface-200">
                 <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Unsupported format for visual takeoff</p>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 relative z-10 min-h-[300px]">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-surface-50/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-xl border border-surface-200"
            >
              📐
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight mb-2">Estimation Workspace</h2>
            <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider max-w-sm leading-relaxed mb-4">
              Select a 2D floor plan from the header dropdown to begin taking off quantities, measuring areas, and calculating costs.
            </p>
          </div>
        )}
      </div>

      {/* Collapsed Right Toggle (Desktop) */}
      <AnimatePresence>
        {!rightPanelOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setRightPanelOpen(true)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-20 bg-surface-100/80 backdrop-blur-md border border-r-0 border-surface-200 rounded-l-xl items-center justify-center text-surface-400 hover:text-accent transition-all shadow-md group"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right Panel: Estimation Table / Summary (Mobile Overlay / Desktop Inline) */}
      <AnimatePresence>
        {rightPanelOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <div 
              onClick={() => setRightPanelOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
            />
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: typeof window !== "undefined" && window.innerWidth < 768 ? "90%" : rightPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
              className={`fixed md:relative inset-y-0 right-0 z-50 md:z-20 h-full bg-surface-100/95 backdrop-blur-3xl border-l border-surface-200 shadow-xl flex flex-col shrink-0 min-w-0 max-w-[90vw] md:max-w-none ${isResizing ? 'select-none pointer-events-none' : ''}`}
            >
              {/* Resize Handle (Desktop Only) */}
              <div 
                className="hidden md:block absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-accent/40 z-50 transition-colors pointer-events-auto"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                  const startX = e.clientX;
                  const startWidth = rightPanelWidth;
                  const handleMove = (moveEvent: PointerEvent) => {
                    const delta = startX - moveEvent.clientX;
                    setRightPanelWidth(Math.max(320, Math.min(750, startWidth + delta)));
                  };
                  const handleUp = () => {
                    setIsResizing(false);
                    window.removeEventListener("pointermove", handleMove);
                    window.removeEventListener("pointerup", handleUp);
                  };
                  window.addEventListener("pointermove", handleMove);
                  window.addEventListener("pointerup", handleUp);
                }}
              />
              
              {/* Right Panel Header & Subtabs */}
              <div className="h-11 px-3 flex items-center justify-between border-b border-surface-200 bg-surface-50/80 shrink-0 gap-2">
                <div className="flex items-center gap-1 p-0.5 bg-surface-200/60 rounded-lg shrink-0">
                  <button
                    onClick={() => setRightPanelSubTab("grid")}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                      rightPanelSubTab === "grid"
                        ? "bg-surface-card text-foreground border border-surface-200 shadow-2xs"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                  >
                    📊 Plan Grid
                  </button>
                  <button
                    onClick={() => setRightPanelSubTab("summary")}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                      rightPanelSubTab === "summary"
                        ? "bg-surface-card text-foreground border border-surface-200 shadow-2xs"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                  >
                    📑 Master Summary
                  </button>
                </div>

                <button onClick={() => setRightPanelOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-200 text-surface-400 hover:text-accent transition-all shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              
              {/* Right Panel Main Content */}
              <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-transparent to-surface-50/40 no-scrollbar">
                {rightPanelSubTab === "grid" ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-3 bg-surface-card p-3 rounded-xl border border-surface-200 shadow-2xs">
                      <div>
                        <p className="text-[8px] font-black text-accent uppercase tracking-wider mb-0.5">Plan Takeoff Context</p>
                        <h3 className="text-xs font-black text-foreground tracking-tight truncate max-w-[170px]">{selectedAsset?.title || "Active Plan"}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-text-secondary uppercase tracking-wider mb-0.5">Recorded Lines</p>
                        <span className="text-xs font-black text-foreground bg-surface-100 px-2 py-0.5 rounded-md border border-surface-200">{estimations.length}</span>
                      </div>
                    </div>

                    <div className="flex-1 h-0 overflow-hidden relative rounded-xl border border-surface-200 shadow-2xs">
                      <EstimationGrid />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div className="text-center p-4 bg-gradient-to-br from-accent/10 via-surface-card to-surface-card rounded-xl border border-surface-200 shadow-2xs relative overflow-hidden">
                      <p className="text-[9px] font-black text-accent uppercase tracking-wider mb-1 relative z-10">Project Grand Total Estimate</p>
                      <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight relative z-10 drop-shadow-2xs">
                        ${estimationSummary?.grand_total?.toLocaleString() || "0.00"}
                      </div>
                      <p className="text-[9px] font-semibold text-text-secondary mt-1">Aggregated across all 2D floor plans & material takeoffs</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1 border-b border-surface-200 pb-1.5">
                         <h4 className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Master Category Totals</h4>
                         <span className="text-[8px] font-black uppercase tracking-wider text-text-secondary">{estimationSummary?.items?.length || 0} Categories</span>
                      </div>
                      {estimationSummary?.items?.length ? (
                        estimationSummary.items.map((item: { description: string; item_code: string; total_qty: number; unit: string; total_cost: number }, i: number) => (
                           <div key={i} className="flex justify-between items-center p-2.5 bg-surface-card rounded-xl border border-surface-200 hover:border-accent/40 transition-all shadow-2xs">
                             <div className="flex-1 min-w-0 pr-2">
                               <p className="text-xs font-bold text-foreground truncate">{item.description}</p>
                               <p className="text-[8px] font-black uppercase tracking-wider text-text-secondary mt-0.5 bg-surface-100 border border-surface-200 w-fit px-1.5 py-0.5 rounded">{item.item_code}</p>
                             </div>
                             <div className="text-right shrink-0">
                               <p className="text-xs font-black text-foreground">{item.total_qty} <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold">{item.unit}</span></p>
                               <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">${(item.total_cost || 0).toLocaleString()}</p>
                             </div>
                           </div>
                        ))
                      ) : (
                        <div className="text-center p-6 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
                          <span className="text-2xl mb-2 block opacity-30">📋</span>
                          <p className="text-xs font-bold text-text-secondary leading-relaxed">No estimation summary data calculated yet.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-3 border-t border-surface-200 bg-surface-50/80 backdrop-blur-xl shrink-0">
                <button 
                  onClick={() => projectsApi.exportProjectData(project.uid, 'estimations')}
                  className="w-full h-9 bg-gradient-to-r from-accent to-accent-hover text-background font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>📥</span> Export Full Estimation Sheet (CSV)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
