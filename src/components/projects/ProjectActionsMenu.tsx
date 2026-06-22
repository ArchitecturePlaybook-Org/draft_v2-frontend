"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePermissions } from "@/hooks/use-permissions";

interface ProjectActionsMenuProps {
  project: any;
}

export const ProjectActionsMenu: React.FC<ProjectActionsMenuProps> = ({ project }) => {
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
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-bold text-surface-500 hover:text-primary hover:border-surface-300 transition-colors shadow-sm"
      >
        <span>⚙️ Actions</span>
        <span className="text-[10px]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-fade-in-up" style={{ animationDuration: '0.15s' }}>
          <button className="w-full text-left px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-50 hover:text-primary transition-colors flex items-center gap-2">
            <span>👤</span> Assign Personnel
          </button>
          
          <button 
            className="w-full text-left px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-50 hover:text-primary transition-colors flex items-center gap-2"
            onClick={() => window.open(`/dashboard/projects/${project.uid}/report/project-summary`, '_blank')}
          >
            <span>📄</span> Generate Report
          </button>
          
          <button className="w-full text-left px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-50 hover:text-primary transition-colors flex items-center gap-2">
            <span>🔁</span> Clone Project
          </button>

          {project.status === "Completed" && (
            <button className="w-full text-left px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-50 hover:text-primary transition-colors flex items-center gap-2">
              <span>🚀</span> Publish to Portfolio
            </button>
          )}

          <div className="h-px bg-surface-100 my-1 mx-2" />

          <button className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
            <span>🗑️</span> Delete Blueprint
          </button>
        </div>
      )}
    </div>
  );
};
