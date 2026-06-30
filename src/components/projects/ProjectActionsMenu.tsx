"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePermissions } from "@/hooks/use-permissions";

interface ProjectActionsMenuProps {
  project: any;
  onAssignPersonnel?: () => void;
  onCloneProject?: () => void;
  onOpenSettings?: () => void;
  onDeleteProject?: () => void;
}

export const ProjectActionsMenu: React.FC<ProjectActionsMenuProps> = ({ project, onAssignPersonnel, onCloneProject, onOpenSettings, onDeleteProject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isAdmin, canManageProject } = usePermissions();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasManagementRights = isAdmin || canManageProject(project);

  if (!hasManagementRights) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 border border-surface-200 rounded-md text-xs font-bold text-text-secondary hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors shadow-none"
      >
        <span>⚙️ Actions</span>
        <span className="text-[10px]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface-100 border border-surface-200 rounded-md shadow-none overflow-hidden z-50 py-1 animate-fade-in-up" style={{ animationDuration: '0.15s' }}>
          <button 
            className="w-full text-left px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-200 hover:text-[#D4AF37] transition-colors flex items-center gap-2"
            onClick={() => {
              setIsOpen(false);
              onOpenSettings?.();
            }}
          >
            <span>⚙️</span> Project Settings
          </button>
          
          <button 
            className="w-full text-left px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-200 hover:text-[#D4AF37] transition-colors flex items-center gap-2"
            onClick={() => {
              setIsOpen(false);
              onAssignPersonnel?.();
            }}
          >
            <span>👤</span> Assign Personnel
          </button>
          
          <button 
            className="w-full text-left px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-200 hover:text-[#D4AF37] transition-colors flex items-center gap-2"
            onClick={() => window.open(`/dashboard/projects/${project.uid}/report/project-summary`, '_blank')}
          >
            <span>📄</span> Generate Report
          </button>
          
          <button 
            className="w-full text-left px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-200 hover:text-[#D4AF37] transition-colors flex items-center gap-2"
            onClick={() => {
              setIsOpen(false);
              onCloneProject?.();
            }}
          >
            <span>🔁</span> Clone Project
          </button>

          {project.status === "Completed" && (
            <button className="w-full text-left px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-200 hover:text-[#D4AF37] transition-colors flex items-center gap-2">
              <span>🚀</span> Publish to Portfolio
            </button>
          )}

          <div className="h-px bg-surface-100 my-1 mx-2" />

          <button 
            onClick={() => {
              setIsOpen(false);
              onDeleteProject?.();
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-semantic-red hover:bg-semantic-red/10 transition-colors flex items-center gap-2"
          >
            <span>🗑️</span> Delete Blueprint
          </button>
        </div>
      )}
    </div>
  );
};
