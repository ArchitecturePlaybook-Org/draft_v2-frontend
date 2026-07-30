"use client";

import React, { useState, useEffect } from "react";
import { ProjectAsset } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  History,
  X,
  Pencil,
  Eye,
  Loader2,
  Sparkles,
  Clock,
  RotateCcw,
  Search,
  User,
  CheckCircle2,
  FileText
} from "lucide-react";
import { RestoreVersionDialog } from "./RestoreVersionDialog";

interface SketchVersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number | null;
  projectUid?: string;
  currentVersionId?: number | null;
  currentVersionNumber?: number | null;
  isViewingLatest?: boolean;
  onOpenVersion?: (
    version: Pick<ProjectAsset, "id"> & Partial<Pick<ProjectAsset, "canonical_uid" | "is_latest" | "version_number">>
  ) => void | Promise<void>;
  onOpenLatest?: () => void | Promise<void>;
  onRestored?: () => void | Promise<void>;
  onVersionPromoted?: () => void | Promise<void>;
}

export function SketchVersionPanel({
  isOpen = true,
  onClose,
  assetId,
  projectUid,
  currentVersionId,
  currentVersionNumber,
  isViewingLatest = true,
  onOpenVersion,
  onOpenLatest,
  onRestored,
  onVersionPromoted
}: SketchVersionPanelProps) {
  const [history, setHistory] = useState<ProjectAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openingVersionId, setOpeningVersionId] = useState<number | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ProjectAsset | null>(null);
  const [expandedNotesId, setExpandedNotesId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen || !assetId) return;

    let cancelled = false;
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const list = await projectsApi.getAssetHistory(assetId);
        if (!cancelled) {
          const sorted = [...list].sort((a, b) => b.version_number - a.version_number);
          setHistory(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load version history:", err);
          toast.error("Could not load version history");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [isOpen, assetId]);

  if (!isOpen) return null;

  const handleOpen = async (version: ProjectAsset) => {
    if (!onOpenVersion || version.id === currentVersionId) return;
    setOpeningVersionId(version.id);
    try {
      await onOpenVersion(version);
    } catch (err) {
      console.error("Failed to open version:", err);
      toast.error(`Could not open version ${version.version_number}`);
    } finally {
      setOpeningVersionId(null);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await projectsApi.promoteAssetVersion(restoreTarget.id);
      toast.success(`Restored V${restoreTarget.version_number} as current active sketch`);
      setRestoreTarget(null);

      const list = await projectsApi.getAssetHistory(assetId!);
      const sorted = [...list].sort((a, b) => b.version_number - a.version_number);
      setHistory(sorted);

      if (onRestored) {
        await onRestored();
      }
      if (onVersionPromoted) {
        await onVersionPromoted();
      }
    } catch (err) {
      console.error("Failed to restore version:", err);
      toast.error("Failed to restore this version");
    }
  };

  const authorLabel = (v: ProjectAsset) => {
    if (!v.uploaded_by) return null;
    const name = `${v.uploaded_by.first_name || ""} ${v.uploaded_by.last_name || ""}`.trim();
    return name || v.uploaded_by.email || null;
  };

  const formatRelativeDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "PPP 'at' p");
    } catch {
      return dateStr;
    }
  };

  const filteredHistory = history.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const versionMatch = `v${v.version_number}`.includes(q) || `${v.version_number}`.includes(q);
    const notesMatch = v.revision_notes?.toLowerCase().includes(q);
    const authorMatch = authorLabel(v)?.toLowerCase().includes(q);
    return versionMatch || notesMatch || authorMatch;
  });

  const latestVersion = history.find((v) => v.is_latest);

  const handleOpenLatest = async () => {
    if (!onOpenLatest || !latestVersion) return;
    setOpeningVersionId(latestVersion.id);
    try {
      await onOpenLatest();
    } finally {
      setOpeningVersionId(null);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[120] flex justify-end"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

        <aside
          className="relative h-full w-full max-w-[440px] bg-background/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="version-history-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="shrink-0 p-5 border-b border-border bg-muted/20 dark:bg-muted/10 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="version-history-title" className="font-black text-lg text-primary tracking-tight">
                    Version History
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-3 h-3 text-accent" />
                    {!isLoading ? `${history.length} Saved Snapshots` : "Loading versions..."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-primary transition-all active:scale-95"
                aria-label="Close version history"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Context Banner */}
            {!isLoading && currentVersionNumber != null && (
              <div
                className={`rounded-2xl border p-3.5 flex items-start gap-3 transition-all ${
                  isViewingLatest
                    ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-400/10"
                    : "border-accent/30 bg-accent/10 dark:bg-accent/10"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${isViewingLatest ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-accent/20 text-accent"}`}>
                  {isViewingLatest ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-primary">
                      {isViewingLatest
                        ? `Editing Version ${currentVersionNumber}`
                        : `Viewing Version ${currentVersionNumber}`}
                    </p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isViewingLatest
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    }`}>
                      {isViewingLatest ? "Current Active" : "Snapshot Mode"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {isViewingLatest
                      ? "Changes save directly to this canvas. Use Save As Version to create a branch."
                      : "Read-only preview. Switch to Current or restore this version to edit."}
                  </p>
                </div>
              </div>
            )}

            {/* Search Filter */}
            {history.length > 2 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search version notes or author..."
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
            )}
          </div>

          {/* Body List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {onOpenLatest && latestVersion && latestVersion.id !== currentVersionId && (
              <button
                type="button"
                onClick={() => void handleOpenLatest()}
                disabled={openingVersionId === latestVersion.id}
                className="w-full group rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent p-4 text-left hover:border-emerald-500/50 hover:from-emerald-500/20 transition-all disabled:opacity-70 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    {openingVersionId === latestVersion.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {openingVersionId === latestVersion.id
                        ? "Switching to Current…"
                        : `Switch to Current (V${latestVersion.version_number})`}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Return to the primary active version to edit & save changes
                    </p>
                  </div>
                </div>
              </button>
            )}

            {isLoading ? (
              <VersionSkeleton />
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-primary">
                  {searchQuery ? "No matching versions found" : "No saved versions yet"}
                </p>
                <p className="text-[11px] text-muted-foreground max-w-[240px] leading-relaxed">
                  {searchQuery
                    ? "Try adjusting your search terms to find relevant version snapshots."
                    : "Use Save As Version in the canvas toolbar to create a snapshot."}
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline vertical connector */}
                <div
                  className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border/80"
                  aria-hidden
                />

                <ul className="space-y-4" role="list">
                  {filteredHistory.map((version) => {
                    const isViewing = currentVersionId === version.id;
                    const isOpening = openingVersionId === version.id;
                    const author = authorLabel(version);
                    const notes = version.revision_notes?.trim();
                    const notesLong = notes && notes.length > 100;
                    const notesExpanded = expandedNotesId === version.id;

                    return (
                      <li key={version.id} className="relative flex gap-3.5 group">
                        {/* Timeline Node */}
                        <div
                          className={`relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all ${
                            version.is_latest
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                              : isViewing
                                ? "bg-accent text-background border-accent shadow-sm"
                                : "bg-background border-border text-muted-foreground group-hover:border-accent/50 group-hover:text-primary"
                          }`}
                        >
                          {isOpening ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            `V${version.version_number}`
                          )}
                        </div>

                        {/* Version Card */}
                        <div
                          className={`flex-1 min-w-0 rounded-2xl border transition-all ${
                            isViewing
                              ? "border-accent/40 bg-accent/5 dark:bg-accent/10 ring-1 ring-accent/20 shadow-md"
                              : version.is_latest
                                ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                                : "border-border bg-card hover:border-border/90 hover:shadow-sm"
                          }`}
                        >
                          <div className="p-4 space-y-2.5">
                            <div className="flex gap-3">
                              {version.thumbnail && (
                                <div className="shrink-0 w-14 h-14 rounded-xl border border-border overflow-hidden bg-black/5 shadow-inner">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={version.thumbnail}
                                    alt={`Version ${version.version_number} thumbnail`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-sm text-primary">
                                    Version {version.version_number}
                                  </span>
                                  {version.is_latest && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                      Current
                                    </span>
                                  )}
                                  {isViewing && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                                      <Eye className="w-2.5 h-2.5" />
                                      Viewing
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                                  <span
                                    className="inline-flex items-center gap-1"
                                    title={formatFullDate(version.created_at)}
                                  >
                                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                                    {formatRelativeDate(version.created_at)}
                                  </span>
                                  {author && (
                                    <>
                                      <span>•</span>
                                      <span className="inline-flex items-center gap-1 truncate max-w-[130px]">
                                        <User className="w-3 h-3 text-muted-foreground/70" />
                                        {author}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {notes && (
                              <div className="rounded-xl border border-border/80 bg-muted/30 dark:bg-muted/20 px-3 py-2">
                                <p
                                  className={`text-xs text-primary/90 italic leading-relaxed ${
                                    notesLong && !notesExpanded ? "line-clamp-2" : ""
                                  }`}
                                >
                                  "{notes}"
                                </p>
                                {notesLong && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedNotesId(notesExpanded ? null : version.id);
                                    }}
                                    className="text-[10px] font-bold text-accent mt-1 hover:underline block"
                                  >
                                    {notesExpanded ? "Show less" : "Show more"}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Card Actions */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                              {isViewing ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Active on canvas
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleOpen(version)}
                                  disabled={isOpening}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-border bg-background hover:bg-muted text-primary disabled:opacity-50 transition-all active:scale-95"
                                >
                                  {isOpening ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Opening...
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5" />
                                      View Version
                                    </>
                                  )}
                                </button>
                              )}

                              {!version.is_latest && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRestoreTarget(version);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all active:scale-95 ml-auto"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Restore V{version.version_number}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-4 border-t border-border bg-muted/20 dark:bg-muted/10 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-primary">Tip:</span> Restoring a previous version promotes it as the new Current version without deleting any history.
          </div>
        </aside>
      </div>

      {restoreTarget && (
        <RestoreVersionDialog
          version={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onConfirm={handleRestoreConfirm}
        />
      )}
    </>
  );
}

function VersionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3.5 items-start">
          <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2 p-4 rounded-2xl border border-border bg-card">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted/60 rounded w-1/2" />
            <div className="h-10 bg-muted/40 rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
