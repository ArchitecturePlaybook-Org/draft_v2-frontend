import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";

interface Create3DModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  onSuccess: (newAsset?: any) => void;
}

const PRESETS = [
  "New Architectural Design",
  "Ground Floor Layout",
  "Full Building BIM Model",
  "Interior Spatial Layout",
  "Structural Framework",
];

export const Create3DModelModal: React.FC<Create3DModelModalProps> = ({
  isOpen,
  onClose,
  projectUid,
  onSuccess,
}) => {
  const [modelName, setModelName] = useState("New Architectural Design");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [openEditorImmediately, setOpenEditorImmediately] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = modelName.trim();
    if (!trimmedName) {
      setError("Please enter a valid model name.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      let createdAsset: any = null;

      if (selectedFile) {
        const projectData = await projectsApi.getProjectDetails(projectUid);
        if (!projectData?.id) throw new Error("Project details not found.");

        const isSh3d = selectedFile.name.toLowerCase().endsWith('.sh3d');
        const category = isSh3d ? "sh3d" : "3d_model";

        // Direct S3 Upload via presigned URL
        createdAsset = await projectsApi.uploadProjectAsset(
          projectData.id,
          category,
          selectedFile,
          trimmedName
        );
      } else {
        createdAsset = await projectsApi.initSH3DProject(projectUid, trimmedName);
      }

      onSuccess(createdAsset);

      if (openEditorImmediately && createdAsset && !selectedFile) {
        const assetId = createdAsset.canonical_uid || createdAsset.id;
        if (assetId) {
          window.open(
            `/dashboard/projects/${projectUid}/editor?assetId=${assetId}&isNew=true`,
            "_blank"
          );
        }
      }

      onClose();
    } catch (err: any) {
      console.error("Failed to initialize or upload 3D model:", err);
      setError(err?.message || "Failed to initialize/upload 3D model. Please try again.");
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
          {/* Top Decorative Banner / Header */}
          <div className="p-8 border-b border-surface-200/50 dark:border-white/5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  🏠
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      BIM 3D CONSTRUCTION
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-primary tracking-tight mt-1">
                    Create 3D Construction Model
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-200/50 dark:bg-surface-800/50 backdrop-blur-md border border-surface-300/50 dark:border-white/10 text-surface-500 hover:bg-red-500 hover:text-white transition-all shadow-sm text-base disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                3D Model Name <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => {
                    setModelName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Ground Floor BIM Model"
                  autoFocus
                  disabled={isCreating}
                  className="w-full bg-surface-100/60 dark:bg-surface-800/60 border border-surface-300/60 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-primary placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                />
                {modelName && !isCreating && (
                  <button
                    type="button"
                    onClick={() => setModelName("")}
                    className="absolute right-3.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 text-sm p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Optional Direct S3 3D File Upload */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                Upload Existing 3D File <span className="text-surface-400 font-medium lowercase">(Direct S3 Upload)</span>
              </label>
              <div className="relative border-2 border-dashed border-surface-300 dark:border-white/10 rounded-2xl p-4 text-center hover:border-emerald-500/50 bg-surface-100/30 dark:bg-surface-800/20 transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept=".obj,.glb,.gltf,.ifc,.sh3d,.sh3x,.zip,.stl,.fbx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      if (!modelName || modelName === "New Architectural Design") {
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                        setModelName(nameWithoutExt);
                      }
                      if (error) setError(null);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      <span>📦</span>
                      <span className="truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-surface-400 font-semibold">({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="z-20 text-surface-400 hover:text-red-500 text-xs font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary group-hover:text-emerald-500 transition-colors">
                      📁 Click or drag 3D file (.OBJ, .GLB, .GLTF, .IFC, .SH3D, .ZIP)
                    </p>
                    <p className="text-[10px] font-medium text-surface-400">
                      File will be uploaded directly from browser to AWS S3 storage
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-surface-400 mb-2.5">
                Suggested Model Names
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setModelName(preset);
                      if (error) setError(null);
                    }}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                      modelName === preset
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm"
                        : "bg-surface-100/50 dark:bg-surface-800/40 border-surface-200/60 dark:border-white/5 text-surface-600 dark:text-surface-300 hover:bg-surface-200/60 dark:hover:bg-surface-700/50"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Option Checkbox */}
            <div className="bg-surface-100/50 dark:bg-surface-800/30 p-4 rounded-2xl border border-surface-200/50 dark:border-white/5 flex items-start gap-3">
              <input
                type="checkbox"
                id="openEditorImmediately"
                checked={openEditorImmediately}
                onChange={(e) => setOpenEditorImmediately(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-surface-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
              />
              <label
                htmlFor="openEditorImmediately"
                className="text-xs font-semibold text-surface-600 dark:text-surface-300 cursor-pointer leading-relaxed select-none"
              >
                Launch 3D Floor Plan & Model Editor immediately upon creation
                <span className="block text-[10px] text-surface-400 font-medium mt-0.5">
                  Opens full-screen 3D architectural editor in a new tab.
                </span>
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-surface-500 dark:text-surface-400 hover:bg-surface-200/50 dark:hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !modelName.trim()}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Spinner size="sm" className="border-white" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Create 3D Model</span>
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
