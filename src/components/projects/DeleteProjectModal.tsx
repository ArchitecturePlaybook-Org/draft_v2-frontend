import React, { useState } from "react";
import { Project } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { useRouter } from "next/navigation";

interface DeleteProjectModalProps {
  project: Project;
  onClose: () => void;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ project, onClose }) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isConfirmed = confirmationText === project.title;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    
    setIsDeleting(true);
    setError("");
    try {
      await projectsApi.deleteProject(project.uid);
      // Once deleted, refresh the router cache and push to dashboard
      router.refresh();
      router.push("/dashboard/projects");
    } catch (err: any) {
      console.error("Failed to delete project", err);
      setError(err.message || "Failed to delete project. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface-100 rounded-xl border border-semantic-red/30 shadow-[0_0_40px_rgba(239,68,68,0.15)] w-full max-w-md flex flex-col overflow-hidden">
        
        {/* Danger Header */}
        <div className="flex flex-col items-center justify-center p-6 bg-semantic-red/10 border-b border-semantic-red/20 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-black/10 rounded-md text-text-tertiary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
          <div className="w-16 h-16 bg-semantic-red/20 text-semantic-red rounded-full flex items-center justify-center mb-4 border border-semantic-red/30">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary text-center">
            Delete Project
          </h2>
          <p className="text-sm text-text-secondary mt-2 text-center max-w-[280px]">
            You are about to permanently delete <strong className="text-text-primary">{project.title}</strong>.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-semantic-red/10 border border-semantic-red/20 text-semantic-red rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-surface-200/50 rounded-lg p-4 mb-6 border border-surface-200">
            <h3 className="text-xs font-bold text-semantic-red mb-2 uppercase tracking-wider">Danger Zone</h3>
            <ul className="text-xs text-text-secondary space-y-2 list-disc list-inside">
              <li>All tasks, phases, and matrix data will be destroyed.</li>
              <li>All uploaded blueprints and files will be permanently removed.</li>
              <li>Personnel access to this project will be revoked.</li>
              <li><strong className="text-text-primary">This action cannot be undone.</strong></li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-secondary text-center">
              Please type <strong className="text-text-primary select-none">{project.title}</strong> to confirm.
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-md px-3 py-2 text-sm text-center text-text-primary focus:outline-none focus:border-semantic-red focus:ring-1 focus:ring-semantic-red transition-all"
              placeholder="Project Name"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-surface-50/50 flex justify-end gap-3 border-t border-surface-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="px-6 py-2 bg-semantic-red hover:bg-red-600 text-white text-sm font-bold rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Permanently Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
