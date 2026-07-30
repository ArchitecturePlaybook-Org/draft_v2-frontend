"use client";

import React, { useState } from "react";
import { ProjectAsset } from "@/types/projects";
import { Button } from "@/components/ui/Button";

interface RestoreVersionDialogProps {
  version: ProjectAsset;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function RestoreVersionDialog({ version, onClose, onConfirm }: RestoreVersionDialogProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || "Failed to restore version.");
      setIsRestoring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="restore-version-title"
        aria-modal="true"
      >
        <div className="px-6 pt-6 pb-5 border-b border-border bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-400/10">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/25 dark:border-amber-400/20 flex items-center justify-center text-xl">
              ↩
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">
                Restore version
              </p>
              <h3 id="restore-version-title" className="text-lg font-black text-primary leading-tight">
                Make Version {version.version_number} active?
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Version {version.version_number} becomes the{" "}
                <span className="font-semibold text-primary">latest editable</span> sketch. Older
                versions remain in history — nothing is deleted.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          {version.revision_notes && (
            <div className="rounded-xl border border-border bg-muted/30 dark:bg-muted/20 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Version notes
              </p>
              <p className="text-sm text-primary italic">{version.revision_notes}</p>
            </div>
          )}

          <div className="rounded-xl border border-border/80 bg-muted/20 dark:bg-muted/10 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            After restoring, you can edit and save this version like any latest sketch.
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 dark:bg-muted/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRestoring}
            className="h-10 text-xs uppercase font-bold tracking-wider"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={isRestoring}
            className="h-10 text-xs uppercase font-bold tracking-wider bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white border-0"
          >
            {isRestoring ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Restoring…
              </span>
            ) : (
              `Restore Version ${version.version_number}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
