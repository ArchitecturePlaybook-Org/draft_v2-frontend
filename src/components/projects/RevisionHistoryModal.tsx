"use client";
import React, { useState, useEffect, useRef } from "react";
import { ProjectAsset, DrawingMarkup } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { ReopenReasonModal } from "./ReopenReasonModal";
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

interface RevisionHistoryModalProps {
  asset: ProjectAsset;
  onClose: () => void;
  onRevisionUploaded: () => void;
  onVersionPromoted: () => void;
}

export function RevisionHistoryModal({ asset, onClose, onRevisionUploaded, onVersionPromoted }: RevisionHistoryModalProps) {
  const [history, setHistory] = useState<ProjectAsset[]>([]);
  const [markups, setMarkups] = useState<DrawingMarkup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false); // Default: View Mode Only
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [reopenTargetMarkup, setReopenTargetMarkup] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReopenAuditMarkup = async (reason: string) => {
    if (!reopenTargetMarkup) return;
    const nowStr = format(new Date(), "dd MMM yyyy, HH:mm");
    const reopenEntry = `\n\n🔄 [Re-opened on ${nowStr}]:\n${reason}`;
    const updatedDesc = (reopenTargetMarkup.description || "") + reopenEntry;

    await projectsApi.updateDrawingMarkupStatus(reopenTargetMarkup.id, "OPEN", updatedDesc);
    toast.success("Revision request re-opened with reason attached!");
    setReopenTargetMarkup(null);
    const updated = await projectsApi.getDrawingMarkups({ canonical_uid: asset.canonical_uid });
    setMarkups(updated || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [data, markupsData] = await Promise.all([
          projectsApi.getAssetHistory(asset.id),
          projectsApi.getDrawingMarkups({ canonical_uid: asset.canonical_uid })
        ]);
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

  const formatRelativeDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Slide-in Panel */}
      <div
        className="relative h-full w-full max-w-[540px] bg-surface-100/95 dark:bg-surface-900/95 backdrop-blur-2xl border-l border-surface-200 dark:border-surface-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-surface-200/80 dark:border-surface-800/80 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                <History className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Blueprint Revision Stack & Audit Log</p>
                <h2 className="font-black text-lg text-primary truncate max-w-[300px]">{asset.title}</h2>
                <p className="text-[11px] text-surface-500 font-medium">
                  {history.length} Version{history.length !== 1 ? "s" : ""} • {markups.length} Contractor Cloud Request{markups.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-200/60 dark:bg-surface-800/60 hover:bg-surface-300 text-surface-600 dark:text-surface-300 transition-all active:scale-95"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Upload Form Button (Defaults to View Mode) */}
          <button
            onClick={() => setShowUploadForm(v => !v)}
            className="w-full h-10 flex items-center justify-center gap-2 px-4 bg-accent text-background rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-md active:scale-[0.99]"
          >
            {showUploadForm ? (
              <>
                <X className="w-4 h-4" />
                <span>Return to Revision View Log</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Upload New Revision File</span>
              </>
            )}
          </button>

          {/* Upload Form Box (Only visible when user toggles upload) */}
          {showUploadForm && (
            <form onSubmit={handleUploadRevision} className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-surface-200 dark:border-surface-700 space-y-3 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 block">
                  Select Revision File
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
                    className="border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-accent/60 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 bg-surface-100/50 dark:bg-surface-800/50"
                  >
                    <Upload className="w-5 h-5 text-accent" />
                    <span className="text-xs font-bold text-primary">Click to select PDF or Image file</span>
                    <span className="text-[10px] text-surface-400">PNG, JPG, WEBP, PDF</span>
                  </div>
                ) : (
                  <div className="p-3 border border-emerald-500/30 bg-emerald-500/10 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-bold text-primary truncate">{selectedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-[10px] font-bold text-red-500 hover:underline shrink-0 ml-2"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 block">
                  Revision Notes (Optional)
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={e => setRevisionNotes(e.target.value)}
                  placeholder="Describe what changed in this version (e.g., Added structural columns)..."
                  rows={2}
                  className="w-full text-xs bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none text-primary placeholder:text-surface-400"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full py-2.5 bg-accent text-background font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Submit Revision v{history.length + 1}</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Read-Only Revision View & Audit History Stack */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
              <p className="text-xs text-surface-500 font-bold uppercase tracking-wider">Loading complete audit history...</p>
            </div>
          ) : (
            <>
              {/* Contractor Revision Requests Audit Trail Section */}
              {markups.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-red-500 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4" />
                      <span>Contractor Revision Cloud Requests ({markups.length})</span>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {markups.map((m, idx) => (
                      <div key={m.id} className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/80 dark:border-surface-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-mono text-[10px] font-black">
                              ☁️ Cloud #{idx + 1}
                            </span>
                            <span className="font-black text-primary truncate max-w-[200px]">{m.title}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 ${m.status === "RESOLVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                            }`}>
                            {m.status === "RESOLVED" ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{m.status}</span>
                          </span>
                        </div>

                        {m.description && (
                          <p className="text-surface-600 dark:text-surface-300 text-[11px] font-medium bg-surface-100/50 dark:bg-surface-900/50 p-2.5 rounded-lg border border-surface-200/40 dark:border-surface-800">
                            {m.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-surface-200/50 dark:border-surface-800 text-surface-400">
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
                                {m.status === "RESOLVED" ? "Resolved" : "Open Action Required"}
                              </span>
                              <button
                                onClick={async () => {
                                  if (m.status === "RESOLVED") {
                                    setReopenTargetMarkup(m);
                                  } else {
                                    await projectsApi.updateDrawingMarkupStatus(m.id, "RESOLVED");
                                    toast.success("Revision request resolved");
                                    const updated = await projectsApi.getDrawingMarkups({ canonical_uid: asset.canonical_uid });
                                    setMarkups(updated || []);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${
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

              {/* Version History Stack */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400">Drawing Version Stack</p>
                {history.map((verAsset) => {
                  const isCurrent = verAsset.is_latest;

                  return (
                    <div
                      key={verAsset.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${isCurrent
                          ? "bg-accent/5 border-accent/40 shadow-sm"
                          : "bg-surface-50/80 dark:bg-surface-800/40 border-surface-200 dark:border-surface-800"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase font-mono ${isCurrent ? "bg-accent text-background" : "bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                            }`}>
                            v{verAsset.version_number}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active Version</span>
                            </span>
                          )}
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => handlePromote(verAsset)}
                            disabled={promotingId === verAsset.id}
                            className="px-3 py-1.5 bg-surface-200 dark:bg-surface-700 hover:bg-accent hover:text-background text-primary font-bold text-[10px] uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
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

                      {verAsset.revision_notes && (
                        <p className="text-xs text-primary font-bold bg-surface-100/80 dark:bg-surface-900/60 p-3 rounded-xl border border-surface-200/60 dark:border-surface-800">
                          📝 {verAsset.revision_notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-surface-400 pt-1 border-t border-surface-200/60 dark:border-surface-800">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-surface-400" />
                          Uploaded: {formatFullDate(verAsset.created_at)}
                        </span>
                        <span className="font-mono text-surface-500 font-semibold">
                          {formatFileSize(verAsset.file_size)}
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
