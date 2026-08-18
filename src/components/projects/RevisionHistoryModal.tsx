"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ProjectAsset } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  History,
  Upload,
  X,
  FileText,
  CheckCircle2,
  RotateCcw,
  Eye,
  Loader2,
  Clock,
  User,
  FileCheck,
  Plus,
  Cloud,
  Check,
  AlertCircle
} from "lucide-react";

export interface DrawingMarkup {
  id: number;
  canonical_uid: string;
  title: string;
  description?: string;
  author_name?: string;
  author_username?: string;
  category: string;
  status: "OPEN" | "RESOLVED";
  created_at: string;
  updated_at?: string;
}

function ReopenReasonModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  markupTitle 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (reason: string) => void; 
  markupTitle?: string 
}) {
  const [reason, setReason] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[220] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-card border border-surface-200 dark:border-surface-700 rounded-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-sm text-primary">Re-open Request: {markupTitle}</h3>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for re-opening this request..."
          className="w-full text-xs bg-surface-100 border border-surface-200 dark:border-surface-700 rounded-xl p-2.5 text-primary outline-none focus:border-accent"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-bold text-surface-400 hover:text-primary">Cancel</button>
          <button
            onClick={() => { onSubmit(reason); setReason(""); }}
            disabled={!reason.trim()}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-accent text-background disabled:opacity-50 cursor-pointer"
          >
            Confirm Re-open
          </button>
        </div>
      </div>
    </div>
  );
}

interface RevisionHistoryModalProps {
  asset: ProjectAsset;
  onClose: () => void;
  onRevisionUploaded: () => void;
  onVersionPromoted: () => void;
}

export function RevisionHistoryModal({ asset, onClose, onRevisionUploaded, onVersionPromoted }: RevisionHistoryModalProps) {
  const [history, setHistory] = useState<ProjectAsset[]>([]);
  const [markups, setMarkups] = useState<DrawingMarkup[]>([]);
  const [activeTab, setActiveTab] = useState<"versions" | "timeline">("versions");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [reopenTargetMarkup, setReopenTargetMarkup] = useState<any | null>(null);
  const [previewAsset, setPreviewAsset] = useState<ProjectAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      type: "upload_v1" | "revision" | "cloud_request" | "cloud_resolved";
      title: string;
      description?: string;
      author?: string;
      timestamp: string;
      rawDate: Date;
      versionNumber?: number;
      badgeText: string;
      badgeStyle: string;
      icon: React.ReactNode;
      assetObj?: ProjectAsset;
    }> = [];

    // 1. Version Upload Events
    history.forEach((verAsset) => {
      const isV1 = verAsset.version_number === 1;
      const dateObj = new Date(verAsset.created_at);
      events.push({
        id: `ver-${verAsset.id}`,
        type: isV1 ? "upload_v1" : "revision",
        title: isV1 ? "🚀 Initial Blueprint Uploaded" : `📐 New Revision Uploaded (v${verAsset.version_number})`,
        description: verAsset.revision_notes || (isV1 ? "Initial version uploaded to project data hub." : "Revision uploaded by team."),
        author: verAsset.uploaded_by?.name || verAsset.uploaded_by?.email || "Project Architect",
        timestamp: verAsset.created_at,
        rawDate: dateObj,
        versionNumber: verAsset.version_number,
        badgeText: `v${verAsset.version_number}`,
        badgeStyle: isV1 ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-accent/20 text-accent border-accent/30",
        icon: isV1 ? <FileCheck className="w-4 h-4 text-emerald-500" /> : <Upload className="w-4 h-4 text-accent" />,
        assetObj: verAsset,
      });
    });

    // 2. Contractor Cloud Request Events
    markups.forEach((m, idx) => {
      const createdDate = new Date(m.created_at);
      events.push({
        id: `markup-req-${m.id}`,
        type: "cloud_request",
        title: `☁️ Contractor Cloud Request #${idx + 1}: ${m.title}`,
        description: m.description || "Contractor requested drawing change/clarification.",
        author: m.author_name && m.author_name !== "Contractor" ? m.author_name : (m.author_username || "Contractor"),
        timestamp: m.created_at,
        rawDate: createdDate,
        badgeText: m.status === "RESOLVED" ? "Cloud Flagged" : "Open Action Required",
        badgeStyle: m.status === "RESOLVED" ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "bg-red-500/20 text-red-500 border-red-500/30",
        icon: <Cloud className="w-4 h-4 text-red-500" />
      });

      if (m.status === "RESOLVED" && m.updated_at) {
        const resolvedDate = new Date(m.updated_at);
        events.push({
          id: `markup-res-${m.id}`,
          type: "cloud_resolved",
          title: `✓ Revision Request Resolved: ${m.title}`,
          description: "Cloud markup request resolved and verified by project team.",
          author: "Project Manager",
          timestamp: m.updated_at,
          rawDate: resolvedDate,
          badgeText: "Resolved",
          badgeStyle: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        });
      }
    });

    return events.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [history, markups]);

  const handleReopenAuditMarkup = async (reason: string) => {
    if (!reopenTargetMarkup) return;
    const nowStr = format(new Date(), "dd MMM yyyy, HH:mm");
    const reopenEntry = `\n\n🔄 [Re-opened on ${nowStr}]:\n${reason}`;
    const updatedDesc = (reopenTargetMarkup.description || "") + reopenEntry;

    if (typeof (projectsApi as any).updateDrawingMarkupStatus === "function") {
      await (projectsApi as any).updateDrawingMarkupStatus(reopenTargetMarkup.id, "OPEN", updatedDesc);
    }
    toast.success("Revision request re-opened with reason attached!");
    setReopenTargetMarkup(null);
    if (typeof (projectsApi as any).getDrawingMarkups === "function") {
      const updated = await (projectsApi as any).getDrawingMarkups({ canonical_uid: asset.canonical_uid });
      setMarkups(updated || []);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const historyPromise = projectsApi.getAssetHistory(asset.id);
        const markupsPromise = typeof (projectsApi as any).getDrawingMarkups === "function"
          ? (projectsApi as any).getDrawingMarkups({ canonical_uid: asset.canonical_uid })
          : Promise.resolve([]);

        const [data, markupsData] = await Promise.all([historyPromise, markupsPromise]);
        const sorted = [...data].reverse();
        setHistory(sorted);
        setMarkups(markupsData || []);
      } catch (err) {
        console.error("Failed to load history", err);
        toast.error("Failed to load version history.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [asset.id, asset.canonical_uid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await projectsApi.uploadRevision(asset.id, selectedFile, revisionNotes);
      toast.success("New revision uploaded successfully!");
      onRevisionUploaded();
      onClose();
    } catch (err: any) {
      console.error("Failed to upload revision", err);
      toast.error(`Failed to upload revision: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePromote = async (versionAsset: ProjectAsset) => {
    setPromotingId(versionAsset.id);
    try {
      await projectsApi.promoteAssetVersion(versionAsset.id);
      toast.success(`Version ${versionAsset.version_number} is now the active version`);
      onVersionPromoted();
      onClose();
    } catch (err: any) {
      console.error("Failed to promote version", err);
      toast.error(`Failed to restore version: ${err.message || 'Unknown error'}`);
    } finally {
      setPromotingId(null);
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "PPP 'at' p");
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="fixed inset-0 z-[120] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

      <div
        className="relative h-full w-full max-w-[540px] bg-surface-100/95 dark:bg-surface-900/95 backdrop-blur-2xl border-l border-surface-200 dark:border-surface-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 backdrop-blur-md space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <History className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <h2 className="font-black text-sm text-primary truncate max-w-[200px]">{asset.title}</h2>
                  <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono text-[9px] font-black uppercase shrink-0">
                    v{history.find(h => h.is_latest)?.version_number || history.length}
                  </span>
                </div>
                <p className="text-[10px] text-surface-400 font-medium">Blueprint Revision Stack & Audit Log</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowUploadForm(v => !v)}
                className="px-2.5 py-1 bg-accent text-background rounded-lg font-bold text-[10px] uppercase tracking-wider hover:opacity-90 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                {showUploadForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                <span>{showUploadForm ? "Close" : "Upload Revision"}</span>
              </button>

              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-200/60 dark:bg-surface-800/60 hover:bg-surface-300 text-surface-600 dark:text-surface-300 transition-all cursor-pointer"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Segmented Tab Navigation */}
          <div className="flex p-0.5 bg-surface-200/60 dark:bg-surface-800/60 rounded-lg gap-1 border border-surface-200/80 dark:border-surface-700/80">
            <button
              onClick={() => setActiveTab("versions")}
              className={`flex-1 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "versions"
                  ? "bg-surface-card dark:bg-surface-900 text-accent shadow-xs border border-surface-200 dark:border-surface-700 font-black"
                  : "text-surface-500 hover:text-primary"
              }`}
            >
              <History className="w-3 h-3" />
              <span>Version Stack ({history.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-surface-card dark:bg-surface-900 text-accent shadow-xs border border-surface-200 dark:border-surface-700 font-black"
                  : "text-surface-500 hover:text-primary"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Full Audit Timeline ({timelineEvents.length})</span>
            </button>
          </div>

          {/* Compact Upload Form */}
          {showUploadForm && (
            <form onSubmit={handleUploadRevision} className="p-3 bg-surface-100 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 space-y-2 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-surface-400 block">
                  Select File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-surface-300 dark:border-surface-700 hover:border-accent rounded-lg p-2.5 text-center cursor-pointer transition-all flex items-center justify-center gap-2 bg-surface-50 dark:bg-surface-950"
                  >
                    <Upload className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-[11px] font-bold text-primary">Click to select PDF or Image</span>
                  </div>
                ) : (
                  <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 rounded-lg flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-bold text-primary truncate">{selectedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-[9px] font-bold text-red-500 hover:underline shrink-0 ml-2"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  value={revisionNotes}
                  onChange={e => setRevisionNotes(e.target.value)}
                  placeholder="Revision notes (e.g. Updated layout)..."
                  className="w-full text-[11px] bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-accent text-primary placeholder:text-surface-400"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full py-1.5 bg-accent text-background font-black text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Submit Revision v{history.length + 1}</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider">Loading complete audit history...</p>
            </div>
          ) : activeTab === "timeline" ? (
            <div className="space-y-5 relative pl-6 pr-1 py-2 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-accent before:via-surface-300 dark:before:via-surface-700 before:to-emerald-500">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">Complete Lifecycle Flow ({timelineEvents.length} Events)</span>
                <span className="text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">Chronological Audit</span>
              </div>

              {timelineEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-surface-400 font-bold">No timeline events recorded yet.</div>
              ) : (
                timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative group animate-in fade-in slide-in-from-left duration-200">
                    <div className="absolute -left-[31px] top-1.5 w-6 h-6 rounded-full bg-surface-100 dark:bg-surface-900 border-2 border-surface-300 dark:border-surface-700 group-hover:border-accent flex items-center justify-center shadow-md transition-all">
                      {evt.icon}
                    </div>

                    <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/80 dark:border-surface-800 space-y-2 shadow-2xs hover:border-accent/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-[11px] text-primary flex items-center gap-1.5">{evt.title}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {evt.assetObj && (
                            <button
                              onClick={() => setPreviewAsset(evt.assetObj!)}
                              className="px-2 py-0.5 rounded-lg bg-surface-200 dark:bg-surface-800 hover:bg-accent hover:text-background text-primary font-bold text-[9px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                              title="View drawing version image"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          )}
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-mono font-black uppercase border ${evt.badgeStyle}`}>
                            {evt.badgeText}
                          </span>
                        </div>
                      </div>

                      {evt.description && (
                        <p className="text-[11px] text-surface-600 dark:text-surface-300 font-medium bg-surface-100/50 dark:bg-surface-900/50 p-2 rounded-lg border border-surface-200/40 dark:border-surface-800 leading-relaxed whitespace-pre-wrap">
                          {evt.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-[9px] text-surface-400 pt-1 border-t border-surface-200/40 dark:border-surface-800 gap-1.5">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <User className="w-3 h-3 text-accent" />
                          {evt.author}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-surface-400">
                          <Clock className="w-3 h-3 text-surface-400" />
                          {formatFullDate(evt.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {markups.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-red-500 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Contractor Revision Cloud Requests ({markups.length})</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {markups.map((m, idx) => (
                      <div key={m.id} className="p-3 rounded-lg bg-surface-50 dark:bg-surface-950 border border-surface-200/80 dark:border-surface-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[9px] font-black shrink-0">
                              ☁️ Cloud #{idx + 1}
                            </span>
                            <span className="font-bold text-[11px] text-primary truncate max-w-[180px]">{m.title}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 ${m.status === "RESOLVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                            }`}>
                            {m.status === "RESOLVED" ? <Check className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                            <span>{m.status}</span>
                          </span>
                        </div>

                        {m.description && (
                          <p className="text-surface-600 dark:text-surface-300 text-[10px] font-medium bg-surface-100/50 dark:bg-surface-900/50 p-2 rounded border border-surface-200/40 dark:border-surface-800">
                            {m.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[9px] pt-1 border-t border-surface-200/50 dark:border-surface-800 text-surface-400">
                          <div>
                            <span className="block font-bold text-surface-500 uppercase">Requested By</span>
                            <span className="font-semibold text-primary">👤 {m.author_name && m.author_name !== "Contractor" ? m.author_name : (m.author_username || "Demo User")}</span>
                          </div>
                          <div>
                            <span className="block font-bold text-surface-500 uppercase">Request Timestamp</span>
                            <span className="font-semibold text-primary">🕒 {formatFullDate(m.created_at)}</span>
                          </div>
                          <div>
                            <span className="block font-bold text-surface-500 uppercase">Category</span>
                            <span className="font-semibold text-accent">{m.category}</span>
                          </div>
                          <div>
                            <span className="block font-bold text-surface-500 uppercase">Status & Action</span>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className={`font-semibold ${m.status === "RESOLVED" ? "text-emerald-400" : "text-amber-400"}`}>
                                {m.status === "RESOLVED" ? "Resolved" : "Open Action"}
                              </span>
                              <button
                                onClick={async () => {
                                  if (m.status === "RESOLVED") {
                                    setReopenTargetMarkup(m);
                                  } else if (typeof (projectsApi as any).updateDrawingMarkupStatus === "function") {
                                    await (projectsApi as any).updateDrawingMarkupStatus(m.id, "RESOLVED");
                                    toast.success("Revision request resolved");
                                    if (typeof (projectsApi as any).getDrawingMarkups === "function") {
                                      const updated = await (projectsApi as any).getDrawingMarkups({ canonical_uid: asset.canonical_uid });
                                      setMarkups(updated || []);
                                    }
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                  m.status === "RESOLVED" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30" : "bg-emerald-500 text-white hover:opacity-90"
                                }`}
                              >
                                {m.status === "RESOLVED" ? "↺ Re-Open" : "✓ Resolve"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400">Drawing Version Stack</p>
                {history.map((verAsset) => {
                  const isCurrent = verAsset.is_latest;

                  return (
                    <div
                      key={verAsset.id}
                      className={`p-3 rounded-xl border transition-all space-y-2 ${isCurrent
                          ? "bg-accent/5 border-accent/40 shadow-2xs"
                          : "bg-surface-50/80 dark:bg-surface-800/40 border-surface-200 dark:border-surface-800"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono ${isCurrent ? "bg-accent text-background" : "bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                            }`}>
                            v{verAsset.version_number}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewAsset(verAsset)}
                            className="px-2.5 py-1 bg-surface-200/80 dark:bg-surface-700 hover:bg-accent hover:text-background text-primary font-bold text-[9px] uppercase rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="View version image in full screen modal"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Image</span>
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handlePromote(verAsset)}
                              disabled={promotingId === verAsset.id}
                              className="px-2.5 py-1 bg-accent text-background hover:opacity-90 font-bold text-[9px] uppercase rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {promotingId === verAsset.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>Make Active</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {verAsset.revision_notes && (
                        <p className="text-[11px] text-primary font-bold bg-surface-100/80 dark:bg-surface-900/60 p-2 rounded-lg border border-surface-200/60 dark:border-surface-800">
                          📝 {verAsset.revision_notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[9px] text-surface-400 pt-1 border-t border-surface-200/60 dark:border-surface-800">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-surface-400" />
                          Uploaded: {formatFullDate(verAsset.created_at)}
                        </span>
                        <span className="font-mono text-surface-500 font-semibold">
                          {formatFileSize(verAsset.size)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* High-Resolution Drawing Image Modal Overlay */}
      {previewAsset && (
        <div 
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewAsset(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[85vh] bg-surface-card border border-surface-200 dark:border-surface-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 bg-surface-100 dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-accent text-background font-mono text-[10px] font-black uppercase">
                  v{previewAsset.version_number}
                </span>
                <span className="font-bold text-xs text-primary truncate max-w-[320px]">{previewAsset.title}</span>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 text-surface-600 dark:text-surface-300 transition-all cursor-pointer"
                aria-label="Close image preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black/60 min-h-[350px]">
              {previewAsset.file ? (
                <img
                  src={previewAsset.file}
                  alt={previewAsset.title}
                  className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <div className="text-center text-xs text-surface-400 p-8">No preview file found for this version.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-Open Reason Input Modal */}
      <ReopenReasonModal
        isOpen={reopenTargetMarkup !== null}
        onClose={() => setReopenTargetMarkup(null)}
        onSubmit={handleReopenAuditMarkup}
        markupTitle={reopenTargetMarkup?.title}
      />
    </div>
  );
}
