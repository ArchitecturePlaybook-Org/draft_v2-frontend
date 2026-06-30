"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/project-store";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";
import { TakeoffCanvas } from "@/components/estimation/TakeoffCanvas";
import { EstimationGrid } from "@/components/estimation/EstimationGrid";
import { Toolbar } from "@/components/estimation/Toolbar";
import { useEstimationAutoSave } from "@/components/estimation/useEstimationAutoSave";
import { useEstimationStore } from "@/store/estimation-store";
export default function EstimationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { project, isLoading, fetchProject } = useProjectStore();
  const { setItems, setLastSavedItems, setFloorPlanId, syncStatus } = useEstimationStore();
  
  // Hook up Auto-Save
  useEstimationAutoSave();

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  
  const [estimations, setEstimations] = useState<any[]>([]);
  const [estimationSummary, setEstimationSummary] = useState<any>(null);

  useEffect(() => {
    fetchProject(id as string);
    projectsApi.getEstimationSummary(id as string).then(setEstimationSummary).catch(console.error);
  }, [id, fetchProject]);

  useEffect(() => {
    if (selectedAssetId) {
      setFloorPlanId(selectedAssetId);
      projectsApi.getEstimations(selectedAssetId).then(data => {
        const mappedItems = data.map((be: any) => ({
          id: crypto.randomUUID(), // New frontend UUID
          backendId: be.id, // Keep track of DB ID
          item_code: be.item_code,
          description: be.description,
          type: be.trace_data?.type || 'polygon',
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
      setEstimations([]);
    }
  }, [selectedAssetId, setFloorPlanId, setItems, setLastSavedItems]);

  if (isLoading || !project) return <div className="flex h-full items-center justify-center"><Spinner size="lg" label="Loading Estimation Workspace..." /></div>;

  const floorPlans = project.assets?.filter(a => a.category === "2d_plan") || [];
  const selectedAsset = floorPlans.find(a => a.id === selectedAssetId);

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-50 animate-fade-in relative">
      
      {/* Left Panel: Drawings */}
      <AnimatePresence>
        {leftPanelOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full bg-surface-100/60 backdrop-blur-3xl border-r border-surface-200 shadow-[5px_0_20px_-5px_rgba(0,0,0,0.05)] flex flex-col z-20 relative"
          >
            <div className="h-16 px-5 flex justify-between items-center border-b border-surface-200/50 bg-surface-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗂️</span>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Master Data Hub</h2>
              </div>
              <button onClick={() => setLeftPanelOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-200 text-surface-400 hover:text-accent transition-all group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <p className="text-[9px] font-bold text-surface-400 uppercase tracking-[0.2em] pl-1">2D Floor Plans ({floorPlans.length})</p>
              {floorPlans.length === 0 ? (
                <div className="text-center p-8 bg-surface-50/50 rounded-[1.5rem] border border-dashed border-surface-300">
                  <span className="text-3xl mb-3 block opacity-30">📐</span>
                  <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest leading-relaxed">No 2D floor plans found in this project.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {floorPlans.map(asset => (
                    <div 
                      key={asset.id} 
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all duration-300 border group ${
                        selectedAssetId === asset.id 
                          ? 'bg-accent/10 border-accent/40 shadow-[0_5px_15px_rgba(var(--color-accent),0.15)] scale-[1.02]' 
                          : 'bg-surface-50 hover:bg-white border-surface-200 hover:border-surface-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center transition-colors ${selectedAssetId === asset.id ? 'bg-accent/20' : 'bg-surface-200 group-hover:bg-surface-100'}`}>
                          {asset.thumbnail ? (
                            <img src={asset.thumbnail} className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-screen" />
                          ) : (
                            <span className="text-xl">📐</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-black truncate transition-colors ${selectedAssetId === asset.id ? 'text-accent' : 'text-primary'}`}>{asset.title}</p>
                          <p className="text-[9px] uppercase tracking-[0.2em] text-surface-400 mt-1">{(asset.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Left Toggle */}
      <AnimatePresence>
        {!leftPanelOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setLeftPanelOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-24 bg-surface-100/80 backdrop-blur-md border border-l-0 border-surface-200 rounded-r-2xl flex items-center justify-center text-surface-400 hover:text-accent hover:w-12 transition-all shadow-[5px_0_20px_rgba(0,0,0,0.1)] group"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M9 18l6-6-6-6"/></svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Central Canvas Area */}
      <div className="flex-1 h-full relative flex flex-col bg-[url('/grid-pattern.svg')] bg-[length:32px_32px] dark:bg-[url('/grid-pattern-dark.svg')] z-0 overflow-hidden">
        {selectedAsset ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={selectedAsset.id}
            className="flex-1 relative overflow-hidden flex flex-col"
          >
             {/* Header */}
             <div className="h-16 bg-surface-50/80 backdrop-blur-2xl border-b border-surface-200/50 flex items-center px-8 justify-between shrink-0 shadow-sm relative z-10">
                 <div className="flex items-center gap-4">
                 <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent text-sm shadow-inner">
                   🎯
                 </div>
                 <h3 className="text-sm font-black text-primary tracking-tight">{selectedAsset.title}</h3>
                 
                 {/* Auto-save Status Indicator */}
                 <div className="flex items-center gap-2 ml-4 bg-surface-100/50 px-3 py-1 rounded-full border border-surface-200">
                   {syncStatus === 'saving' && <><Spinner size="sm" /> <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Saving...</span></>}
                   {syncStatus === 'saved' && <><span className="text-emerald-500 text-xs">✓</span> <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Saved</span></>}
                   {syncStatus === 'error' && <><span className="text-red-500 text-xs">⚠️</span> <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Error</span></>}
                   {syncStatus === 'idle' && <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Synced</span>}
                 </div>
               </div>
               </div>
             
             {/* Canvas Area */}
             <div className="flex-1 relative overflow-hidden flex flex-col p-4 bg-surface-50/50 backdrop-blur-[2px]">
                <Toolbar />
                {selectedAsset.file ? (
                  <TakeoffCanvas imageUrl={selectedAsset.file} />
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-surface-100 text-center p-12 rounded-2xl border-2 border-surface-200">
                     <p className="text-sm font-black text-surface-400 uppercase tracking-widest">Unsupported format for visual takeoff</p>
                  </div>
                )}
             </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 bg-surface-50/80 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-6xl mb-8 shadow-2xl border border-white/40 dark:border-white/10"
            >
              📐
            </motion.div>
            <h2 className="text-4xl font-black text-primary tracking-tighter mb-4">Estimation Workspace</h2>
            <p className="text-xs font-bold text-surface-500 uppercase tracking-widest max-w-md leading-relaxed">
              Select a 2D floor plan from the left panel to begin taking off quantities, measuring areas, and generating your estimation sheet.
            </p>
          </div>
        )}
      </div>

      {/* Collapsed Right Toggle */}
      <AnimatePresence>
        {!rightPanelOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setRightPanelOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-24 bg-surface-100/80 backdrop-blur-md border border-r-0 border-surface-200 rounded-l-2xl flex items-center justify-center text-surface-400 hover:text-accent hover:w-12 transition-all shadow-[-5px_0_20px_rgba(0,0,0,0.1)] group"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right Panel: Estimation Table / Summary */}
      <AnimatePresence>
        {rightPanelOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightPanelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
            className={`h-full bg-surface-100/60 backdrop-blur-3xl border-l border-surface-200 shadow-[-5px_0_20px_-5px_rgba(0,0,0,0.05)] flex flex-col z-20 relative ${isResizing ? 'select-none pointer-events-none' : ''}`}
            style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
          >
            {/* Resize Handle (absolutely positioned just inside or outside the left edge) */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-accent/40 z-50 transition-colors pointer-events-auto"
              style={{ pointerEvents: 'auto' }}
              onPointerDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                const startX = e.clientX;
                const startWidth = rightPanelWidth;
                const handleMove = (moveEvent: PointerEvent) => {
                  const delta = startX - moveEvent.clientX;
                  setRightPanelWidth(Math.max(320, Math.min(800, startWidth + delta)));
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
            
            <div className="h-16 px-5 flex items-center border-b border-surface-200/50 bg-surface-50/50 shrink-0">
              <button onClick={() => setRightPanelOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-200 text-surface-400 hover:text-accent transition-all group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-transparent to-surface-50/30">
              {/* Context Switcher: Active Plan vs Total Project Summary */}
              {selectedAssetId ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full flex flex-col">
                  <div className="flex justify-between items-end mb-8 bg-white/40 dark:bg-surface-800/40 p-5 rounded-[1.5rem] border border-white/50 dark:border-white/5 shadow-sm backdrop-blur-md">
                    <div>
                      <p className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-1">Local Context</p>
                      <h3 className="text-xl font-black text-primary tracking-tight truncate max-w-[200px]">{selectedAsset?.title} Takeoffs</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest mb-1">Items Tracked</p>
                      <span className="text-xl font-black text-primary">{estimations.length}</span>
                    </div>
                  </div>

                  <div className="flex-1 h-0 overflow-hidden relative rounded-2xl border border-surface-200 shadow-sm mt-4">
                    <EstimationGrid />
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="mb-10 text-center p-8 bg-gradient-to-br from-surface-50 to-surface-100 rounded-[2rem] border border-white/50 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-3 relative z-10">Project Grand Total</p>
                    <div className="text-5xl font-black text-primary tracking-tighter relative z-10 drop-shadow-sm">
                      ${estimationSummary?.grand_total?.toLocaleString() || "0.00"}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-4 px-2 border-b border-surface-200 pb-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400">Aggregated Master List</h4>
                       <span className="text-[9px] font-black uppercase tracking-widest text-surface-400">{estimationSummary?.items?.length || 0} Categories</span>
                    </div>
                    {estimationSummary?.items?.length ? (
                      estimationSummary.items.map((item: any, i: number) => (
                         <div key={i} className="flex justify-between items-center p-4 bg-white/60 dark:bg-surface-100/60 backdrop-blur-md rounded-2xl border border-surface-200 hover:border-accent/40 hover:shadow-lg transition-all group">
                           <div className="flex-1 min-w-0 pr-4">
                             <p className="text-sm font-black text-primary truncate group-hover:text-accent transition-colors">{item.description}</p>
                             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-surface-400 mt-1.5 bg-surface-100 w-fit px-2 py-0.5 rounded">{item.item_code}</p>
                           </div>
                           <div className="text-right shrink-0">
                             <p className="text-base font-black text-primary">{item.total_qty} <span className="text-[10px] uppercase tracking-widest text-surface-400 font-bold">{item.unit}</span></p>
                             <p className="text-xs font-black text-accent mt-1">${(item.total_cost || 0).toLocaleString()}</p>
                           </div>
                         </div>
                      ))
                    ) : (
                      <div className="text-center p-10 bg-white/40 dark:bg-surface-100/40 rounded-[2rem] border border-dashed border-surface-300">
                        <span className="text-3xl mb-3 block opacity-30">📋</span>
                        <p className="text-xs font-bold text-surface-400 leading-relaxed">No project-wide estimation data available yet. Start by selecting a plan and creating takeoffs.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-5 border-t border-surface-200/50 bg-white/50 dark:bg-surface-100/50 backdrop-blur-xl shrink-0">
              <button 
                onClick={() => projectsApi.exportProjectData(project.uid, 'estimations')}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-background text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all hover:scale-[1.02] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_25px_-10px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3"
              >
                <span>📥</span> Export Full Estimation Data
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
