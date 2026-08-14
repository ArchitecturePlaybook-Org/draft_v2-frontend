"use client";

import React, { useState, useEffect, useRef } from "react";
import { ProjectAsset, DrawingMarkup } from "@/types/projects";
import { ProtectedFloorPlanViewer } from "./ProtectedFloorPlanViewer";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { Cloud, X, Layers, Plus, CheckCircle2, MapPin, Upload, FileCheck, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface DrawingRevisionCloudModalProps {
  asset: ProjectAsset;
  taskUid?: string;
  onClose: () => void;
  onRefresh?: () => void;
}

export function DrawingRevisionCloudModal({ asset, taskUid, onClose, onRefresh }: DrawingRevisionCloudModalProps) {
  const { user } = useAuthStore();
  const userRealName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || user.email
    : "";

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // ── Revision Cloud Markups State ──────────────────────────────────────────
  const [markups, setMarkups] = useState<DrawingMarkup[]>([]);
  const [isDrawingCloud, setIsDrawingCloud] = useState(true);
  
  // Drag to select area coordinates refs for instant tracking
  const isDraggingAreaRef = useRef(false);
  const areaStartRef = useRef<{ x: number; y: number } | null>(null);
  const [currentArea, setCurrentArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Confirmed pending area for modal
  const [pendingArea, setPendingArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [activeCloudMarkup, setActiveCloudMarkup] = useState<DrawingMarkup | null>(null);
  const [showCloudDrawer, setShowCloudDrawer] = useState(false);

  // Form inputs
  const [markupTitle, setMarkupTitle] = useState("");
  const [markupDescription, setMarkupDescription] = useState("");
  const [markupCategory, setMarkupCategory] = useState("Revision Request");
  const [contractorName, setContractorName] = useState(userRealName || "");

  // Resolution with new revision file upload
  const [resolveFile, setResolveFile] = useState<File | null>(null);
  const [isResolvingWithFile, setIsResolvingWithFile] = useState(false);
  const resolveFileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userRealName && !contractorName) {
      setContractorName(userRealName);
    }
  }, [userRealName]);

  useEffect(() => {
    loadMarkups();
  }, [asset.canonical_uid]);

  const loadMarkups = async () => {
    if (!asset.canonical_uid) return;
    try {
      const data = await projectsApi.getDrawingMarkups({ canonical_uid: asset.canonical_uid });
      setMarkups(data || []);
    } catch (err) {
      console.error("Failed to load drawing markups:", err);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      const newZoom = Math.min(Math.max(zoom + delta, 1), 5);
      setZoom(newZoom);
      if (newZoom === 1) setOffset({ x: 0, y: 0 });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  // Pan handlers when NOT drawing area
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawingCloud) return;
    if (zoom === 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || isDrawingCloud) return;
    setOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 1), 5));
    if (zoom + delta <= 1) setOffset({ x: 0, y: 0 });
  };

  // ── Drag-to-Select Revision Cloud Area Handlers ────────────────────────────
  const handleCloudMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingCloud) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.min(Math.max((clickX / rect.width) * 100, 0), 100);
    const yPercent = Math.min(Math.max((clickY / rect.height) * 100, 0), 100);

    isDraggingAreaRef.current = true;
    areaStartRef.current = { x: xPercent, y: yPercent };
    setCurrentArea({ x: xPercent, y: xPercent, width: 0, height: 0 });
  };

  const handleCloudMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingCloud || !isDraggingAreaRef.current || !areaStartRef.current) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
    const currentY = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100);

    const x = Math.min(areaStartRef.current.x, currentX);
    const y = Math.min(areaStartRef.current.y, currentY);
    const width = Math.abs(currentX - areaStartRef.current.x);
    const height = Math.abs(currentY - areaStartRef.current.y);

    setCurrentArea({ x, y, width, height });
  };

  const handleCloudMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingCloud || !isDraggingAreaRef.current) return;
    e.preventDefault();
    isDraggingAreaRef.current = false;

    setCurrentArea(latestArea => {
      if (!latestArea) return null;
      let finalArea = { ...latestArea };
      if (finalArea.width < 2 || finalArea.height < 2) {
        finalArea = {
          x: Math.max(0, finalArea.x - 7.5),
          y: Math.max(0, finalArea.y - 5),
          width: 15,
          height: 10
        };
      }
      setPendingArea(finalArea);
      return null;
    });

    areaStartRef.current = null;
  };

  const handleCreateMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingArea || !markupTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await projectsApi.createDrawingMarkup({
        canonical_uid: asset.canonical_uid,
        asset: asset.id,
        task_uid: taskUid,
        author_name: contractorName || "Contractor",
        x_percent: parseFloat(pendingArea.x.toFixed(2)),
        y_percent: parseFloat(pendingArea.y.toFixed(2)),
        width_percent: parseFloat(pendingArea.width.toFixed(2)),
        height_percent: parseFloat(pendingArea.height.toFixed(2)),
        title: markupTitle.trim(),
        description: markupDescription.trim(),
        category: markupCategory
      });

      toast.success("Revision cloud area saved successfully!");
      setPendingArea(null);
      setMarkupTitle("");
      setMarkupDescription("");
      await loadMarkups();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error("Failed to save revision cloud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveCloud = async (markupId: number, currentStatus: string) => {
    if (currentStatus === "RESOLVED") {
      // Re-open
      try {
        await projectsApi.updateDrawingMarkupStatus(markupId, "OPEN");
        toast.success("Revision request re-opened");
        await loadMarkups();
        setActiveCloudMarkup(null);
        if (onRefresh) onRefresh();
      } catch {
        toast.error("Failed to update status");
      }
      return;
    }

    try {
      setIsResolvingWithFile(true);
      // Mark as RESOLVED
      await projectsApi.updateDrawingMarkupStatus(markupId, "RESOLVED");

      if (resolveFile) {
        // Upload new revision file to asset history (becomes active v_latest)
        await projectsApi.uploadRevision(
          asset.id,
          resolveFile,
          `Resolved Revision Cloud #${markupId}: ${activeCloudMarkup?.title || "Fixed Plan"}`
        );
        toast.success("Uploaded fixed revision blueprint! Active version updated.");
      } else {
        toast.success("Revision request marked as RESOLVED");
      }

      setResolveFile(null);
      setActiveCloudMarkup(null);
      await loadMarkups();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(`Failed to resolve revision: ${err.message || 'Unknown error'}`);
    } finally {
      setIsResolvingWithFile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-950/90 backdrop-blur-md flex flex-col no-print">
      {/* Header Bar */}
      <div className="min-h-16 px-4 sm:px-6 py-3 bg-surface-900 border-b border-surface-800 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-xl transition-colors text-white text-lg shrink-0">←</button>
          <div className="min-w-0">
            <h2 className="font-black text-white text-sm uppercase tracking-tight truncate">{asset.title}</h2>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest truncate">
              Architectural Revision Clouds • {markups.length} Saved Requests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle Button */}
          <button
            onClick={() => setIsDrawingCloud(prev => !prev)}
            className={`px-3.5 h-8 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all flex items-center gap-1.5 shrink-0 ${
              isDrawingCloud 
                ? "bg-red-500 text-white border-red-400 shadow-lg animate-pulse" 
                : "bg-surface-800 text-surface-300 border-surface-700 hover:border-red-400"
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>{isDrawingCloud ? "Drag Area Mode Active" : "☁️ Enable Area Drag Mode"}</span>
          </button>

          {/* List Drawer Toggle */}
          {markups.length > 0 && (
            <button
              onClick={() => setShowCloudDrawer(prev => !prev)}
              className="px-3 h-8 text-[10px] font-black uppercase tracking-wider rounded-xl bg-surface-800 text-white border border-surface-700 hover:border-accent shrink-0 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Clouds ({markups.length})</span>
            </button>
          )}

          {/* Zoom controls */}
          <div className="flex bg-surface-800 p-1 rounded-xl border border-surface-700">
            <button onClick={() => handleZoom(-0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-700 text-white rounded-lg transition-all font-bold text-lg">－</button>
            <div className="px-2 sm:px-3 flex items-center text-[10px] font-black text-white uppercase whitespace-nowrap">{(zoom * 100).toFixed(0)}%</div>
            <button onClick={() => handleZoom(0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-700 text-white rounded-lg transition-all font-bold text-lg">＋</button>
          </div>

          <button onClick={onClose} className="px-4 h-9 bg-accent text-background font-black text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-md">
            Done
          </button>
        </div>
      </div>

      {/* Interactive Blueprint Canvas */}
      <div className="flex-1 relative overflow-hidden bg-surface-950">
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: isPanning ? 'none' : 'transform 0.2s ease-out',
              cursor: isDrawingCloud ? 'crosshair' : (zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default')
            }}
            className="relative"
          >
            <ProtectedFloorPlanViewer assetId={asset.id} versionKey={asset.updated_at} lazy={false}>
              {/* Drag Selection Overlay */}
              {isDrawingCloud && (
                <div
                  className="absolute inset-0 z-40 cursor-crosshair select-none"
                  onMouseDown={handleCloudMouseDown}
                  onMouseMove={handleCloudMouseMove}
                  onMouseUp={handleCloudMouseUp}
                  onMouseLeave={handleCloudMouseUp}
                >
                  {currentArea && (
                    <div
                      style={{
                        left: `${currentArea.x}%`,
                        top: `${currentArea.y}%`,
                        width: `${currentArea.width}%`,
                        height: `${currentArea.height}%`,
                      }}
                      className="absolute border-2 border-dashed border-red-500 bg-red-500/20 rounded-2xl pointer-events-none animate-pulse flex items-center justify-center"
                    >
                      <span className="px-2 py-1 rounded bg-red-500 text-white font-black text-[10px] uppercase shadow-lg">
                        ☁️ Selection Area ({currentArea.width.toFixed(0)}% × {currentArea.height.toFixed(0)}%)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Render Architectural Revision Cloud Callout Boxes */}
              <div className="absolute inset-0 pointer-events-auto z-30">
                {markups.map((m, idx) => (
                  <div
                    key={m.id}
                    style={{
                      left: `${m.x_percent}%`,
                      top: `${m.y_percent}%`,
                      width: `${m.width_percent || 16}%`,
                      height: `${m.height_percent || 12}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCloudMarkup(m);
                    }}
                    className={`absolute border-2 border-dashed rounded-2xl cursor-pointer group shadow-2xl flex flex-col justify-between p-2 transition-all hover:scale-[1.03] ${
                      m.status === "RESOLVED"
                        ? "border-emerald-500/80 bg-emerald-500/10 dark:bg-emerald-500/15"
                        : "border-red-500 bg-red-500/20 dark:bg-red-500/25 shadow-red-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md ${
                        m.status === "RESOLVED" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                      }`}>
                        <span>☁️</span>
                        <span>Cloud #{idx + 1}</span>
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        m.status === "RESOLVED" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500 text-background"
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="bg-surface-900/90 text-white px-2 py-1 rounded-lg text-[9px] font-bold truncate border border-white/10 shadow-md">
                      {m.title}
                    </div>
                  </div>
                ))}
              </div>
            </ProtectedFloorPlanViewer>
          </div>
        </div>

        {/* Modal to Submit New Revision Cloud */}
        {pendingArea && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-surface-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-red-500" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">New Revision Cloud Request</h3>
                </div>
                <button onClick={() => setPendingArea(null)} className="text-surface-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMarkup} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Revision Area Title / Action Required</label>
                  <input
                    type="text"
                    value={markupTitle}
                    onChange={e => setMarkupTitle(e.target.value)}
                    placeholder="e.g. Expand doorway opening 20cm left in selected area"
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-accent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Category</label>
                  <select
                    value={markupCategory}
                    onChange={e => setMarkupCategory(e.target.value)}
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-accent"
                  >
                    <option value="Revision Request">Revision Request</option>
                    <option value="Structural Clarification">Structural Clarification</option>
                    <option value="Electrical & MEP">Electrical & MEP</option>
                    <option value="Defect / Quality Issue">Defect / Quality Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Detailed Change Instructions</label>
                  <textarea
                    rows={3}
                    value={markupDescription}
                    onChange={e => setMarkupDescription(e.target.value)}
                    placeholder="Specify exact dimension changes, beam offsets, or architect approvals needed for this area..."
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl p-3 text-xs font-medium text-white outline-none focus:border-accent resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPendingArea(null)}
                    className="flex-1 py-2.5 bg-surface-800 text-surface-300 font-bold text-xs rounded-xl hover:bg-surface-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving Revision..." : "Save Revision Cloud"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Read-Only Review Modal for Active Revision Cloud with Resolution & Optional File Upload */}
        {activeCloudMarkup && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-surface-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 font-mono text-xs font-black">
                    ☁️ Cloud #{markups.findIndex(m => m.id === activeCloudMarkup.id) + 1}
                  </span>
                  <span className="text-xs font-black uppercase text-accent">{activeCloudMarkup.category}</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-800 text-[8px] font-black uppercase text-surface-400">
                    Read-Only Review
                  </span>
                </div>
                <button onClick={() => setActiveCloudMarkup(null)} className="text-surface-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <h4 className="text-base font-black text-white leading-tight">{activeCloudMarkup.title}</h4>

                {activeCloudMarkup.description && (
                  <p className="bg-surface-950 p-3 rounded-xl border border-surface-800 text-surface-300 font-medium whitespace-pre-wrap">
                    {activeCloudMarkup.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-surface-950 p-3 rounded-xl border border-surface-800">
                  <div>
                    <span className="text-surface-400 block font-bold uppercase">Requested By</span>
                    <span className="font-black text-white">{activeCloudMarkup.author_name || "Contractor"}</span>
                  </div>
                  <div>
                    <span className="text-surface-400 block font-bold uppercase">Current Status</span>
                    <span className={`font-black uppercase ${
                      activeCloudMarkup.status === "RESOLVED" ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {activeCloudMarkup.status}
                    </span>
                  </div>
                </div>

                {/* Optional Upload Revised Blueprint File Option when Resolving */}
                {activeCloudMarkup.status !== "RESOLVED" && (
                  <div className="p-3 bg-surface-950 border border-surface-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black uppercase text-accent">
                        Upload Revised Blueprint (Optional)
                      </label>
                      <span className="text-[9px] text-surface-400 font-medium">Not Mandatory</span>
                    </div>
                    <input
                      ref={resolveFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setResolveFile(file);
                      }}
                    />

                    {!resolveFile ? (
                      <button
                        type="button"
                        onClick={() => resolveFileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-surface-700 hover:border-accent/60 rounded-xl p-3 text-center cursor-pointer transition-all flex items-center justify-center gap-2 bg-surface-900/50"
                      >
                        <Upload className="w-4 h-4 text-accent" />
                        <span className="text-xs font-bold text-white">Click to Select Revised Image / PDF</span>
                      </button>
                    ) : (
                      <div className="p-2.5 border border-emerald-500/30 bg-emerald-500/10 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-bold text-white truncate">{resolveFile.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResolveFile(null)}
                          className="text-[10px] font-bold text-red-400 hover:underline shrink-0 ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isResolvingWithFile}
                  onClick={() => handleResolveCloud(activeCloudMarkup.id, activeCloudMarkup.status)}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                    activeCloudMarkup.status === "RESOLVED"
                      ? "bg-amber-500 text-background hover:opacity-90"
                      : "bg-emerald-500 text-white hover:opacity-90"
                  }`}
                >
                  {isResolvingWithFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Resolution...</span>
                    </>
                  ) : activeCloudMarkup.status === "RESOLVED" ? (
                    "Re-Open Revision Request"
                  ) : resolveFile ? (
                    "✓ Mark Resolved & Upload Revised Blueprint"
                  ) : (
                    "✓ Mark as Resolved"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
