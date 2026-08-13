"use client";
import React, { useState, useEffect, useRef } from "react";
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
  Plus
} from "lucide-react";

interface RevisionHistoryModalProps {
  asset: ProjectAsset;
  onClose: () => void;
  onRevisionUploaded: () => void;
  onVersionPromoted: () => void;
}

export function RevisionHistoryModal({ asset, onClose, onRevisionUploaded, onVersionPromoted }: RevisionHistoryModalProps) {
  const [history, setHistory] = useState<ProjectAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getAssetHistory(asset.id);
        const sorted = [...data].reverse();
        setHistory(sorted);
      } catch (err) {
        console.error("Failed to load history", err);
        toast.error("Failed to load version history.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [asset.id]);

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
        className="relative h-full w-full max-w-[460px] bg-surface-100/95 dark:bg-surface-900/95 backdrop-blur-2xl border-l border-surface-200 dark:border-surface-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
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
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Blueprint Stack</p>
                <h2 className="font-black text-lg text-primary truncate max-w-[260px]">{asset.title}</h2>
                <p className="text-[11px] text-surface-500 font-medium">
                  {history.length} revision{history.length !== 1 ? "s" : ""} in history
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

          {/* Toggle Upload Form Button */}
          <button
            onClick={() => setShowUploadForm(v => !v)}
            className="w-full h-10 flex items-center justify-center gap-2 px-4 bg-accent text-background rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-md active:scale-[0.99]"
          >
            {showUploadForm ? (
              <>
                <X className="w-4 h-4" />
                <span>Cancel Upload</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Upload New Revision</span>
              </>
            )}
          </button>

          {/* Upload Form Box */}
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
                className="w-full h-9 flex items-center justify-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Confirm & Upload Revision</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Revisions Timeline List */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-surface-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs font-medium">Loading blueprint history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 px-4 bg-surface-50/50 rounded-2xl border border-dashed border-surface-200 space-y-2">
              <FileText className="w-8 h-8 text-surface-400 mx-auto" />
              <p className="text-xs font-bold text-primary">No revisions recorded</p>
              <p className="text-[11px] text-surface-400 max-w-xs mx-auto">
                Upload new revisions to keep track of design modifications over time.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Connector */}
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-surface-200 dark:bg-surface-800" />

              <div className="space-y-4">
                {history.map((version) => (
                  <div key={version.id} className="relative flex gap-3.5 group">
                    {/* Version Badge Node */}
                    <div className={`relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all ${
                      version.is_latest
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                        : "bg-surface-100 dark:bg-surface-800 border-surface-300 dark:border-surface-700 text-surface-500"
                    }`}>
                      V{version.version_number}
                    </div>

                    {/* Version Card */}
                    <div className={`flex-1 rounded-2xl border p-4 space-y-2 transition-all ${
                      version.is_latest
                        ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm"
                        : "border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40 hover:border-surface-300"
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-primary">Version {version.version_number}</span>
                            {version.is_latest && (
                              <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-wider">
                                Current Active
                              </span>
                            )}
                            {version.category === "2d_plan" && version.drawing_tag && version.drawing_tag !== "none" && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                version.drawing_tag === "gfc"
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                  : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                              }`}>
                                {version.drawing_tag.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-surface-400 flex-wrap">
                            <span className="flex items-center gap-1" title={formatFullDate(version.created_at)}>
                              <Clock className="w-3 h-3 text-surface-400" />
                              {formatRelativeDate(version.created_at)}
                            </span>
                            {version.uploaded_by && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-surface-400" />
                                  {version.uploaded_by.first_name || version.uploaded_by.email}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-surface-400 bg-surface-200/50 dark:bg-surface-700/50 px-2 py-0.5 rounded-md shrink-0">
                          {formatFileSize(version.size)}
                        </span>
                      </div>

                      {version.revision_notes && (
                        <div className="p-2.5 bg-surface-100/80 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60 rounded-xl">
                          <p className="text-xs text-primary/90 italic leading-relaxed">
                            "{version.revision_notes}"
                          </p>
                        </div>
                      )}

                      {/* Card Action Controls */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-200/60 dark:border-surface-700/60">
                        {version.file && (
                          <a
                            href={version.file}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-200/70 dark:bg-surface-700/70 hover:bg-surface-300 text-primary text-xs font-bold rounded-xl transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Document
                          </a>
                        )}

                        {!version.is_latest && (
                          <button
                            onClick={() => handlePromote(version)}
                            disabled={promotingId === version.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ml-auto"
                          >
                            {promotingId === version.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Restore V{version.version_number}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-200/80 dark:border-surface-800/80 bg-surface-50/50 dark:bg-surface-900/50 text-[11px] text-surface-400">
          Revisions keep a complete audit trail of design changes without overwriting original assets.
        </div>
      </div>
    </div>
  );
}
