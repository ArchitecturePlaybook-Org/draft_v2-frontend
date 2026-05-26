import React from "react";
import Link from "next/link";
import { Project } from "@/types/projects";

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link href={`/dashboard/projects/${project.uid}`} className="block group h-full">
      <div className="bg-white p-8 rounded-2xl border border-surface-200 hover:border-accent/40 shadow-sm hover:shadow-2xl transition-all h-full flex flex-col relative">
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-full bg-primary/5 arch-grid opacity-10 group-hover:opacity-20 transition-opacity" />
        </div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-primary tracking-tight group-hover:text-accent transition-colors">
              {project.title}
            </h3>
            <p className="text-[9px] uppercase tracking-widest font-bold text-surface-400">
              {project.project_code || project.uid} · {project.account.name}
            </p>
            {project.client_name && (
              <p className="text-xs text-surface-500 mt-1">👤 {project.client_name}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md shadow-sm outline-none border-r-4 border-transparent ${
              project.status === 'Completed' ? 'bg-emerald-500 text-white' : 
              project.status === 'Work in Progress' ? 'bg-primary text-white' : 'bg-surface-200 text-surface-600'
            }`}>
              {project.status}
            </span>
            {project.kind && (
              <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md bg-accent/10 text-accent border border-accent/20">
                {project.kind}
              </span>
            )}
          </div>
        </div>

        {project.location && (
          <p className="text-[10px] uppercase tracking-widest text-surface-400 mb-3 font-bold flex items-center gap-1.5 relative z-10">
            📍 {project.location}
          </p>
        )}

        <p className="text-sm text-surface-500 line-clamp-2 leading-relaxed mb-8 flex-1 relative z-10">
          {project.description || "No architectural specification provided."}
        </p>

        <div className="pt-5 border-t border-surface-100 flex justify-between items-center mt-auto relative z-10">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-surface-400">
               <span className="text-xs text-primary">📋</span>
               <span>{project.tasks_count}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-surface-400">
               <span className="text-xs text-accent">👥</span>
               <span>{project.memberships_count}</span>
            </div>
          </div>
          <div className="text-[9px] font-bold text-surface-300 uppercase tracking-widest">
            {new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>
    </Link>
  );
};
