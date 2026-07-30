import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";

interface CreateSketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  onSuccess: () => void;
  /** Navigate to editor in same tab (sketch route). */
  onCreated?: (asset: { id: number; canonical_uid?: string }) => void;
  openInSameTab?: boolean;
}

const PRESETS = [
  "Concept Layout",
  "Facade Study",
  "Interior Mood Board",
  "Site Plan Sketch",
  "Client Presentation Draft",
];

export const CreateSketchModal: React.FC<CreateSketchModalProps> = ({
  isOpen,
  onClose,
  projectUid,
  onSuccess,
  onCreated,
  openInSameTab = false,
}) => {
  const [sketchName, setSketchName] = useState("Concept Layout");
  const [openEditorImmediately, setOpenEditorImmediately] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = sketchName.trim();
    if (!trimmedName) {
      setError("Please enter a name for your design sketch.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const createdAsset = await projectsApi.initSketchProject(projectUid, trimmedName);
      if (!createdAsset?.id) {
        throw new Error("Server did not return the new sketch. Restart the backend and try again.");
      }

      onSuccess();

      if (onCreated) {
        onCreated(createdAsset);
        onClose();
        return;
      }

      if (openEditorImmediately) {
        const url = `/dashboard/projects/${projectUid}/sketch?assetId=${createdAsset.id}`;
        if (openInSameTab) {
          window.location.assign(url);
        } else {
          window.open(url, "_blank");
        }
      }

      onClose();
    } catch (err: any) {
      console.error("Failed to create sketch:", err);
      setError(err?.message || "Failed to create sketch. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-2xl animate-in fade-in duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
          className="bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] w-full max-w-lg overflow-hidden border border-white/20 dark:border-white/10 relative"
        >
          <div className="p-8 border-b border-surface-200/50 dark:border-white/5 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-3xl shadow-lg shadow-accent/10">
                  ✏️
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent/15 text-accent border border-accent/20">
                    Creative Sketch
                  </span>
                  <h3 className="text-xl font-black text-primary tracking-tight mt-1">
                    New Design Sketch
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-200/50 dark:bg-surface-800/50 border border-surface-300/50 text-surface-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-surface-500 mb-2">
                Sketch name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sketchName}
                onChange={(e) => {
                  setSketchName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Ground Floor Concept"
                autoFocus
                disabled={isCreating}
                className="w-full bg-surface-100/60 dark:bg-surface-800/60 border border-surface-300/60 rounded-2xl px-4 py-3.5 text-sm font-bold text-primary placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
              <p className="text-[10px] text-surface-400 mt-2">
                Each sketch is its own design. Versions stay inside this sketch only.
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-surface-400 mb-2.5">
                Quick names
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSketchName(preset);
                      if (error) setError(null);
                    }}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                      sketchName === preset
                        ? "bg-accent/15 border-accent/40 text-accent shadow-sm"
                        : "bg-surface-100/50 border-surface-200/60 text-surface-600 hover:bg-surface-200/60"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-100/50 p-4 rounded-2xl border border-surface-200/50 flex items-start gap-3">
              <input
                type="checkbox"
                id="openSketchEditor"
                checked={openEditorImmediately}
                onChange={(e) => setOpenEditorImmediately(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-accent cursor-pointer"
              />
              <label htmlFor="openSketchEditor" className="text-xs font-semibold text-surface-600 cursor-pointer leading-relaxed">
                Open sketch editor immediately
                <span className="block text-[10px] text-surface-400 font-medium mt-0.5">
                  Starts a blank canvas for this sketch only.
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-surface-500 hover:bg-surface-200/50 rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !sketchName.trim()}
                className="px-6 py-3 bg-accent hover:opacity-90 text-background rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-accent/25 disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Spinner size="sm" className="border-background" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Create Sketch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
