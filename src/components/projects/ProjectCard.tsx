import React from "react";
import Link from "next/link";
import { Project } from "@/types/projects";

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link href={`/dashboard/projects/${project.uid}`} className="block group h-full">
      <div className="bg-white p-8 rounded-2xl border border-surface-200 hover:border-accent/40 shadow-sm hover:shadow-2xl transition-all h-full flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-primary/5 arch-grid opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-primary tracking-tight group-hover:text-accent transition-colors">
              {project.title}
            </h3>
            <p className="text-[9px] uppercase tracking-widest font-bold text-surface-400">
              {project.uid} · {project.account.name}
            </p>
          </div>
          <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md shadow-sm shrink-0 ${
            project.status === 'Completed' ? 'bg-emerald-500 text-white' : 
            project.status === 'Work in Progress' ? 'bg-primary text-white' : 'bg-surface-200 text-surface-600'
          }`}>
            {project.status}
          </span>
        </div>

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
