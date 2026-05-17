"use client";
import React, { useState, useEffect, useRef } from "react";
import { ProjectAsset } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getAssetHistory(asset.id);
        setHistory(data.reverse()); // newest first
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [asset.id]);

  const handleUploadRevision = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await projectsApi.uploadRevision(asset.id, file, revisionNotes);
      onRevisionUploaded();
      onClose();
    } catch (err: any) {
      alert(`Failed to upload revision: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePromote = async (versionAsset: ProjectAsset) => {
    if (!confirm(`Roll back to Version ${versionAsset.version_number}? This will make it the active version.`)) return;
    try {
      await projectsApi.promoteAssetVersion(versionAsset.id);
      onVersionPromoted();
      onClose();
    } catch (err: any) {
      alert(`Failed to promote version: ${err.message}`);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Slide-in panel */}
      <div
        className="relative h-full w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-surface-100 bg-gradient-to-r from-surface-50 to-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Blueprint Stack</p>
              <h2 className="font-black text-xl text-primary">{asset.title}</h2>
              <p className="text-xs text-surface-400 mt-0.5">{history.length} revisions in this stack</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 text-surface-400 hover:text-primary transition-all text-lg">✕</button>
          </div>

          {/* Upload Revision Button */}
          <button
            onClick={() => setShowUploadForm(v => !v)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
          >
            <span>⬆</span>
            {showUploadForm ? "Cancel" : "Upload New Revision"}
          </button>

          {showUploadForm && (
            <div className="mt-3 p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-3">
              <div>
                <label className="text-xs font-bold text-surface-500 uppercase tracking-widest block mb-1">Revision Notes (Optional)</label>
                <textarea
                  value={revisionNotes}
                  onChange={e => setRevisionNotes(e.target.value)}
                  placeholder="What changed in this version? e.g. Added bathroom layout"
                  rows={2}
                  className="w-full text-sm border border-surface-200 rounded-lg p-2 resize-none outline-none focus:border-accent"
                />
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,.pdf" className="hidden" onChange={handleUploadRevision} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-all disabled:opacity-60"
              >
                {isUploading ? "Uploading..." : "📎 Choose File & Upload"}
              </button>
            </div>
          )}
        </div>

        {/* Version Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-5 bottom-0 w-0.5 bg-surface-100" />

              <div className="space-y-4">
                {history.map((version, idx) => (
                  <div key={version.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 z-10 ${
                      version.is_latest
                        ? "bg-accent text-white border-accent shadow-lg shadow-accent/30"
                        : "bg-white text-surface-400 border-surface-200"
                    }`}>
                      V{version.version_number}
                    </div>

                    {/* Card */}
                    <div className={`flex-1 rounded-xl border p-4 transition-all ${
                      version.is_latest
                        ? "border-accent/30 bg-accent/5 shadow-sm"
                        : "border-surface-200 bg-white hover:border-surface-300"
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-primary">Version {version.version_number}</span>
                            {version.is_latest && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                                ✓ Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-surface-400 mt-0.5">{formatDate(version.created_at)}</p>
                          {version.uploaded_by && (
                            <p className="text-[11px] text-surface-500 mt-0.5">
                              by <span className="font-bold">{version.uploaded_by.first_name || version.uploaded_by.email}</span>
                            </p>
                          )}
                          {version.revision_notes && (
                            <p className="text-xs text-primary mt-2 bg-surface-50 rounded-lg p-2 italic border border-surface-100">
                              "{version.revision_notes}"
                            </p>
                          )}
                          <p className="text-[10px] text-surface-400 mt-1 font-mono">{(version.size / 1024).toFixed(1)} KB</p>
                        </div>

                        <div className="flex flex-col gap-1.5 ml-3">
                          <a
                            href={version.file}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-surface-100 text-surface-600 rounded-lg text-[10px] font-bold hover:bg-surface-200 transition-all text-center"
                          >
                            View
                          </a>
                          {!version.is_latest && (
                            <button
                              onClick={() => handlePromote(version)}
                              className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-all"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
