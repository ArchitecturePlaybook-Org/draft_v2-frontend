"use client";

import React, { useState, useEffect, useRef } from "react";
import { ProjectAsset, DrawingMarkup } from "@/types/projects";
import { ProtectedFloorPlanViewer } from "./ProtectedFloorPlanViewer";
import { ArchitecturalRevisionCloudCallout } from "./ArchitecturalRevisionCloudCallout";
import { ReopenReasonModal } from "./ReopenReasonModal";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { Cloud, X, Check, Upload, FileCheck, Loader2, MessageSquare, AlertCircle, Eye } from "lucide-react";

interface ContractorRevisionReviewModalProps {
  asset: ProjectAsset;
  initialMarkupId?: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export function ContractorRevisionReviewModal({ asset, initialMarkupId, onClose, onRefresh }: ContractorRevisionReviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [markups, setMarkups] = useState<DrawingMarkup[]>([]);
  const [selectedMarkup, setSelectedMarkup] = useState<DrawingMarkup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Resolution Form State
  const [replyText, setReplyText] = useState("");
  const [resolveFile, setResolveFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMarkups();
  }, [asset.canonical_uid]);

  const loadMarkups = async () => {
    if (!asset.canonical_uid) return;
    try {
      setIsLoading(true);
      const data = await projectsApi.getDrawingMarkups({ canonical_uid: asset.canonical_uid });
      setMarkups(data || []);
      if (initialMarkupId) {
        const found = data?.find(m => m.id === initialMarkupId);
        if (found) setSelectedMarkup(found);
      } else if (data && data.length > 0) {
        setSelectedMarkup(data[0]);
      }
    } catch (err) {
      console.error("Failed to load drawing markups:", err);
    } finally {
      setIsLoading(false);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
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

  const [reopenTargetMarkup, setReopenTargetMarkup] = useState<DrawingMarkup | null>(null);

  const handleReopenWithReason = async (reason: string) => {
    if (!reopenTargetMarkup) return;
    const nowStr = format(new Date(), "dd MMM yyyy, HH:mm");
    const reopenEntry = `\n\n🔄 [Re-opened on ${nowStr} by ${userRealName || "User"}]:\n${reason}`;
    const updatedDesc = (reopenTargetMarkup.description || "") + reopenEntry;

    await projectsApi.updateDrawingMarkupStatus(reopenTargetMarkup.id, "OPEN", updatedDesc);
    toast.success("Revision request re-opened with reason attached!");
    setReopenTargetMarkup(null);
    await loadMarkups();
    if (onRefresh) onRefresh();
  };

  const handleResolveMarkup = async (statusOverride?: string) => {
    if (!selectedMarkup) return;

    if (selectedMarkup.status === "RESOLVED" && !statusOverride) {
      setReopenTargetMarkup(selectedMarkup);
      return;
    }

    const targetStatus = statusOverride || (selectedMarkup.status === "OPEN" ? "RESOLVED" : "OPEN");

    try {
      setIsSubmitting(true);

      // Append reply note if present
      let updatedDesc = selectedMarkup.description || "";
      if (replyText.trim()) {
        const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        updatedDesc += `\n\n[Resolution Reply - ${timeStamp}]: ${replyText.trim()}`;
      }

      await projectsApi.updateDrawingMarkupStatus(selectedMarkup.id, targetStatus as any, updatedDesc);

      // Upload optional new plan version if selected
      if (resolveFile) {
        await projectsApi.uploadRevision(
          asset.id,
          resolveFile,
          `Resolved Revision Cloud #${selectedMarkup.id}: ${selectedMarkup.title}`
        );
        toast.success("Uploaded revised blueprint file! Active version updated.");
      } else {
        toast.success(`Request marked as ${targetStatus}`);
      }

      setReplyText("");
      setResolveFile(null);
      await loadMarkups();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCount = markups.filter(m => m.status === "OPEN").length;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col no-print">
      {/* Header Bar */}
      <div className="min-h-16 px-4 sm:px-6 py-3 bg-surface-50 border-b border-surface-100 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 hover:bg-surface-100 rounded-xl transition-colors text-white text-lg shrink-0">←</button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-white text-sm uppercase tracking-tight truncate">{asset.title}</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase">
                Contractor Revision Review Mode
              </span>
            </div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest truncate">
              {openCount} Open Request{openCount !== 1 ? "s" : ""} • {markups.length} Total Clouds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex bg-surface-100 p-1 rounded-xl border border-surface-200">
            <button onClick={() => handleZoom(-0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-200 text-white rounded-lg transition-all font-bold text-lg">－</button>
            <div className="px-2 sm:px-3 flex items-center text-[10px] font-black text-white uppercase whitespace-nowrap">{(zoom * 100).toFixed(0)}%</div>
            <button onClick={() => handleZoom(0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-200 text-white rounded-lg transition-all font-bold text-lg">＋</button>
          </div>

          <button onClick={onClose} className="px-4 h-9 bg-accent text-background font-black text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-md">
            Done
          </button>
        </div>
      </div>

      {/* Main Container: Canvas + Review & Resolve Drawer */}
      <div className="flex-1 relative flex overflow-hidden bg-background">
        {/* 2D Blueprint Canvas Overlay */}
        <div className="flex-1 relative overflow-hidden">
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
                cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
              }}
              className="relative"
            >
              <ProtectedFloorPlanViewer assetId={asset.id} versionKey={asset.updated_at} lazy={false}>
                {/* Render Pinned Contractor Revision Cloud Boxes (Click to Select) */}
                <div className="absolute inset-0 pointer-events-auto z-30">
                  {markups.map((m, idx) => (
                    <ArchitecturalRevisionCloudCallout
                      key={m.id}
                      markup={m}
                      index={idx}
                      isSelected={selectedMarkup?.id === m.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMarkup(m);
                      }}
                    />
                  ))}
                </div>
              </ProtectedFloorPlanViewer>
            </div>
          </div>
        </div>

        {/* Right Side Review & Resolution Drawer */}
        <div className="w-80 sm:w-96 bg-surface-50 border-l border-surface-100 flex flex-col z-30 shadow-2xl shrink-0">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Revision Cloud Requests ({markups.length})</h3>
            </div>
          </div>

          {/* List of Clouds or Selected Cloud Details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {markups.length === 0 ? (
              <div className="py-16 text-center text-surface-400">
                <Cloud className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-bold">No contractor revision requests found.</p>
              </div>
            ) : selectedMarkup ? (
              <div className="space-y-4">
                {/* Cloud Header Info */}
                <div className="p-4 rounded-2xl bg-background border border-surface-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-400 font-mono text-xs font-black">
                      ☁️ Cloud #{markups.findIndex(m => m.id === selectedMarkup.id) + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${selectedMarkup.status === "RESOLVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                      {selectedMarkup.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase text-accent tracking-widest">{selectedMarkup.category}</span>
                    <h4 className="text-sm font-black text-white leading-tight mt-0.5">{selectedMarkup.title}</h4>
                  </div>

                  {selectedMarkup.description && (
                    <div className="bg-surface-50 p-3 rounded-xl border border-surface-100 text-xs text-surface-300 font-medium whitespace-pre-wrap">
                      {selectedMarkup.description}
                    </div>
                  )}

                  <div className="text-[10px] text-surface-400 space-y-1 pt-1 border-t border-surface-100">
                    <p className="font-semibold text-white">👤 Requested By: {selectedMarkup.author_name || "Contractor"}</p>
                  </div>
                </div>

                {/* Resolution & Reply Form */}
                <div className="p-4 rounded-2xl bg-background border border-surface-100 space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Resolve Request</span>
                  </h5>

                  {/* Optional Reply Note */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-surface-400">
                      Reply / Resolution Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Add a reply for the contractor..."
                      className="w-full bg-surface-50 border border-surface-100 rounded-xl p-2.5 text-xs text-white outline-none focus:border-accent resize-none placeholder:text-surface-600"
                    />
                  </div>

                  {/* Optional Revised Blueprint Upload */}
                  {selectedMarkup.status !== "RESOLVED" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black uppercase text-accent">
                          Upload Revised Blueprint (Optional)
                        </label>
                        <span className="text-[9px] text-surface-500 font-medium">Not Mandatory</span>
                      </div>
                      <input
                        ref={fileInputRef}
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
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border border-dashed border-surface-200 hover:border-accent rounded-xl p-2.5 text-center cursor-pointer transition-all flex items-center justify-center gap-2 bg-surface-50/50"
                        >
                          <Upload className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[11px] font-bold text-surface-300">Attach Revised Image / PDF</span>
                        </button>
                      ) : (
                        <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-bold text-white text-[11px] truncate">{resolveFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setResolveFile(null)}
                            className="text-[10px] font-bold text-red-400 hover:underline shrink-0 ml-1"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolution Action Button */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleResolveMarkup()}
                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${selectedMarkup.status === "RESOLVED"
                      ? "bg-amber-500 text-background hover:opacity-90"
                      : "bg-emerald-500 text-white hover:opacity-90"
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Status...</span>
                      </>
                    ) : selectedMarkup.status === "RESOLVED" ? (
                      "Re-Open Revision Request"
                    ) : resolveFile ? (
                      "✓ Resolve Request & Upload Revision"
                    ) : (
                      "✓ Mark Request as Resolved"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-surface-400 tracking-wider mb-2">Select a cloud to review:</p>
                {markups.map((m, idx) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMarkup(m)}
                    className="p-3 rounded-xl bg-background border border-surface-100 hover:border-accent/60 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-red-400">☁️ Cloud #{idx + 1}</span>
                      <span className={`text-[9px] font-bold uppercase ${m.status === "RESOLVED" ? "text-emerald-400" : "text-amber-400"}`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white truncate">{m.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Re-Open Reason Input Modal */}
      <ReopenReasonModal
        isOpen={reopenTargetMarkup !== null}
        onClose={() => setReopenTargetMarkup(null)}
        onSubmit={handleReopenWithReason}
        markupTitle={reopenTargetMarkup?.title}
      />
    </div>
  );
}
