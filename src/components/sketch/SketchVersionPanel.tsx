"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  Eye,
  History,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { projectsApi } from "@/domains/projects/api";
import { ProjectAsset } from "@/types/projects";
import { RestoreVersionDialog } from "./RestoreVersionDialog";
import { toast } from "sonner";

interface SketchVersionPanelProps {
  assetId: number;
  projectUid: string;
  currentVersionId?: number;
  currentVersionNumber?: number;
  isViewingLatest?: boolean;
  onClose: () => void;
  onRestored?: () => void;
  onOpenVersion?: (
    version: Pick<ProjectAsset, "id"> & Partial<Pick<ProjectAsset, "canonical_uid" | "is_latest" | "version_number">>,
  ) => void | Promise<void>;
  onOpenLatest?: () => void | Promise<void>;
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authorLabel(version: ProjectAsset) {
  const user = version.uploaded_by;
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.email || null;
}

function VersionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
          <div className="flex-1 rounded-xl border border-border p-4 space-y-2">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-2.5 w-16 bg-muted/70 rounded" />
            <div className="h-8 w-full bg-muted/50 rounded-lg mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SketchVersionPanel({
  assetId,
  projectUid,
  currentVersionId,
  currentVersionNumber,
  isViewingLatest = true,
  onClose,
  onRestored,
  onOpenVersion,
  onOpenLatest,
}: SketchVersionPanelProps) {
  const [history, setHistory] = useState<ProjectAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState<ProjectAsset | null>(null);
  const [openingVersionId, setOpeningVersionId] = useState<number | null>(null);
  const [expandedNotesId, setExpandedNotesId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await projectsApi.getAssetHistory(assetId);
        if (active) setHistory([...data].reverse());
      } catch (err) {
        console.error("Failed to load sketch versions", err);
        toast.error("Could not load version history");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [assetId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !restoreTarget) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, restoreTarget]);

  const handleOpen = async (version: ProjectAsset) => {
    if (currentVersionId === version.id) return;

    if (onOpenVersion) {
      setOpeningVersionId(version.id);
      try {
        await onOpenVersion(version);
        onClose();
      } catch {
        // Parent shows toast
      } finally {
        setOpeningVersionId(null);
      }
      return;
    }
    window.open(
      `/dashboard/projects/${projectUid}/sketch?assetId=${version.id}`,
      "_blank",
    );
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    await projectsApi.promoteAssetVersion(restoreTarget.id);
    setRestoreTarget(null);
    onRestored?.();
    onClose();
    toast.success(`Version ${restoreTarget.version_number} is now active`);
  };

  const latestVersion = history.find((v) => v.is_latest);

  const handleOpenLatest = async () => {
    if (!onOpenLatest || !latestVersion) return;
    setOpeningVersionId(latestVersion.id);
    try {
      await onOpenLatest();
      onClose();
    } finally {
      setOpeningVersionId(null);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-200"
        onClick={onClose}
        role="presentation"
      >
        <div className="absolute inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-sm" />

        <aside
          className="relative h-full w-full max-w-[420px] bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="version-history-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border bg-gradient-to-b from-muted/40 to-background dark:from-muted/15">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <History className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-0.5">
                    Creative Sketch
                  </p>
                  <h2 id="version-history-title" className="font-black text-lg text-primary leading-tight">
                    Version History
                  </h2>
                  {!isLoading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {history.length} saved version{history.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Close version history"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current context */}
            {!isLoading && currentVersionNumber != null && (
              <div
                className={`mt-4 rounded-xl border px-3.5 py-3 flex items-start gap-3 ${
                  isViewingLatest
                    ? "border-emerald-500/25 bg-emerald-500/8 dark:bg-emerald-400/8"
                    : "border-primary/25 bg-primary/5 dark:bg-primary/10"
                }`}
              >
                {isViewingLatest ? (
                  <Pencil className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <Eye className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary leading-tight">
                    {isViewingLatest
                      ? `Editing V${currentVersionNumber} · Latest`
                      : `Viewing V${currentVersionNumber} · Read-only`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isViewingLatest
                      ? "Changes save to this version. Use Save As Version to branch."
                      : "Open another version to preview, or jump to latest to edit."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {onOpenLatest && latestVersion && latestVersion.id !== currentVersionId && (
              <button
                type="button"
                onClick={() => void handleOpenLatest()}
                disabled={openingVersionId === latestVersion.id}
                className="w-full mb-5 group rounded-xl border border-accent/30 bg-gradient-to-r from-accent/10 to-accent/5 dark:from-accent/15 dark:to-accent/5 p-4 text-left hover:border-accent/50 hover:from-accent/15 transition-all disabled:opacity-70"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-accent text-background flex items-center justify-center shadow-lg shadow-accent/20">
                    {openingVersionId === latestVersion.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary">
                      {openingVersionId === latestVersion.id
                        ? "Opening latest…"
                        : `Open latest · V${latestVersion.version_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Switch to the editable version and continue sketching
                    </p>
                  </div>
                </div>
              </button>
            )}

            {isLoading ? (
              <VersionSkeleton />
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-4">
                  <History className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-primary">No versions yet</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-[240px] leading-relaxed">
                  Use <span className="font-semibold text-primary">Save As Version</span> in the toolbar to create your first snapshot.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="absolute left-[17px] top-4 bottom-4 w-px bg-gradient-to-b from-border via-border to-transparent dark:from-border/80"
                  aria-hidden
                />

                <ul className="space-y-3" role="list">
                  {history.map((version) => {
                    const isViewing = currentVersionId === version.id;
                    const isOpening = openingVersionId === version.id;
                    const author = authorLabel(version);
                    const notes = version.revision_notes?.trim();
                    const notesLong = notes && notes.length > 120;
                    const notesExpanded = expandedNotesId === version.id;

                    return (
                      <li key={version.id} className="relative flex gap-3">
                        {/* Timeline node */}
                        <div
                          className={`relative z-10 shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-colors ${
                            version.is_latest
                              ? "bg-accent text-background border-accent shadow-md shadow-accent/25"
                              : isViewing
                                ? "bg-primary text-background border-primary shadow-sm"
                                : "bg-background border-border text-muted-foreground"
                          }`}
                        >
                          {isOpening ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            version.version_number
                          )}
                        </div>

                        {/* Card */}
                        <div
                          className={`flex-1 min-w-0 rounded-xl border transition-all ${
                            isViewing
                              ? "border-primary/40 bg-primary/[0.04] dark:bg-primary/10 ring-1 ring-primary/15 shadow-sm"
                              : version.is_latest
                                ? "border-accent/25 bg-accent/[0.03] dark:bg-accent/10"
                                : "border-border bg-card dark:bg-card/90 hover:border-border/80 hover:bg-muted/20"
                          } ${!isViewing && !isOpening ? "cursor-pointer" : ""}`}
                          onClick={() => {
                            if (!isViewing && !isOpening) void handleOpen(version);
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && !isViewing && !isOpening) {
                              e.preventDefault();
                              void handleOpen(version);
                            }
                          }}
                          role={!isViewing ? "button" : undefined}
                          tabIndex={!isViewing ? 0 : undefined}
                        >
                          <div className="p-3.5">
                            <div className="flex gap-3">
                              {version.thumbnail && (
                                <div className="shrink-0 w-14 h-14 rounded-lg border border-border overflow-hidden bg-muted/30">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={version.thumbnail}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-primary">
                                    Version {version.version_number}
                                  </span>
                                  {version.is_latest && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                      Latest
                                    </span>
                                  )}
                                  {isViewing && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                                      <Eye className="w-2.5 h-2.5" />
                                      Viewing
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                                    title={formatFullDate(version.created_at)}
                                  >
                                    <Clock className="w-3 h-3 shrink-0 opacity-70" />
                                    {formatRelativeDate(version.created_at)}
                                  </span>
                                  {author && (
                                    <>
                                      <span className="text-muted-foreground/40">·</span>
                                      <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                                        {author}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {notes && (
                              <div className="mt-2.5 rounded-lg border border-border/80 bg-muted/30 dark:bg-muted/20 px-3 py-2">
                                <p
                                  className={`text-xs text-primary/90 italic leading-relaxed ${
                                    notesLong && !notesExpanded ? "line-clamp-2" : ""
                                  }`}
                                >
                                  {notes}
                                </p>
                                {notesLong && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedNotesId(notesExpanded ? null : version.id);
                                    }}
                                    className="text-[10px] font-bold text-accent mt-1 hover:underline"
                                  >
                                    {notesExpanded ? "Show less" : "Show more"}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                              {isViewing ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Currently open
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleOpen(version);
                                  }}
                                  disabled={isOpening}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-border bg-background hover:bg-muted text-primary disabled:opacity-50 transition-colors"
                                >
                                  {isOpening ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Loading
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3" />
                                      Open
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
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-amber-500/25 bg-amber-500/8 dark:bg-amber-400/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/12 transition-colors ml-auto"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Restore
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
          <div className="shrink-0 px-5 py-4 border-t border-border bg-muted/20 dark:bg-muted/10">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-primary">Save</span> updates the current version.{" "}
              <span className="font-semibold text-primary">Save As Version</span> creates a new branch.{" "}
              <span className="font-semibold text-primary">Restore</span> makes an older version editable again.
            </p>
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
