import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";

interface CloneProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any; // ProjectDetail
}

export function CloneProjectModal({ isOpen, onClose, project }: CloneProjectModalProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const handleClone = async () => {
    try {
      setIsCloning(true);
      setError(null);
      // Wait for the clone to complete
      const newProject = await projectsApi.cloneProject(project.uid);
      // Redirect to the new project
      router.push(`/dashboard/projects/${newProject.uid}`);
      onClose();
    } catch (err: any) {
      console.error("Failed to clone project", err);
      setError(err?.message || "Failed to clone project.");
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface dark:bg-surface-dark rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20">
          <h2 className="text-lg font-semibold text-text dark:text-white flex items-center gap-2">
            <span>🔁</span> Clone Project
          </h2>
          <button 
            onClick={onClose} 
            disabled={isCloning}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-text dark:text-white mb-4">
            Are you sure you want to clone <strong>{project.title}</strong>?
          </p>

          <div className="text-xs text-text-secondary bg-gray-50 dark:bg-black/20 p-4 rounded-lg border border-gray-100 dark:border-white/5 space-y-2 mb-6">
            <p><strong>What will be cloned:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Project structure (Phases, Zones, Blocks)</li>
              <li>Tasks, subtasks, and dependencies</li>
              <li>Task metadata (trades, costs, targets)</li>
              <li>Checklists</li>
            </ul>
            <p className="pt-2"><strong>What will be reset:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Start and end dates</li>
              <li>User assignments</li>
              <li>Task statuses (reset to TODO)</li>
              <li>Progress metrics and checklist completion</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-md border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isCloning}
              className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleClone}
              disabled={isCloning}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {isCloning ? <Spinner size="sm" className="mr-2" /> : null}
              {isCloning ? "Cloning..." : "Clone Project"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
