import React from "react";
import Link from "next/link";
import { Project, ProjectStatus } from "@/types/projects";
import { ProjectStatusDropdown } from "@/components/projects/ProjectStatusDropdown";
import { motion } from "framer-motion";

interface ProjectCardProps {
  project: Project;
  onStatusChange?: (uid: string, newStatus: ProjectStatus) => void;
  onSaveAsTemplate?: (projectUid: string, projectTitle: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onStatusChange, onSaveAsTemplate }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <Link 
      href={`/dashboard/projects/${project.uid}`} 
      className="block group h-full"
    >
      <motion.div 
        whileHover={{ rotateY: 2, rotateX: -2, y: -5, z: 20 }}
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
        className="bg-surface-50/50 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 dark:border-white/5 hover:border-accent/50 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-accent/10 transition-all duration-500 h-full flex flex-col relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[300px] h-full bg-primary/5 arch-grid opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="space-y-1">
            <h3 className="font-bold text-xl text-primary tracking-tight group-hover:text-accent transition-colors drop-shadow-sm">
              {project.title}
            </h3>
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-surface-400">
              {project.project_code || project.uid.substring(0, 8)} <span className="opacity-50 mx-1">•</span> {project.account.name}
            </p>
            {project.client_name && (
              <p className="text-xs font-medium text-surface-400 mt-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {project.client_name}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <ProjectStatusDropdown 
              uid={project.uid} 
              status={project.status as ProjectStatus} 
              onChange={onStatusChange} 
            />
            {project.kind && (
              <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md bg-accent/10 text-accent border border-accent/20">
                {project.kind}
              </span>
            )}
            {/* 3-dot menu */}
            {onSaveAsTemplate && (
              <div className="relative">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(prev => !prev); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-surface-400 hover:text-foreground hover:bg-surface-200 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-7 z-50 min-w-[170px] bg-surface-50 border border-surface-200 rounded-xl shadow-xl py-1"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onSaveAsTemplate(project.uid, project.title);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-foreground hover:bg-surface-100 transition-colors flex items-center gap-2"
                    >
                      <span>📋</span> Save as Template
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {project.location && (
          <p className="text-[10px] uppercase tracking-widest text-surface-400 mb-3 font-bold flex items-center gap-1.5 relative z-10">
            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {project.location}
          </p>
        )}

        <p className="text-sm text-surface-500 text-surface-400 line-clamp-2 leading-relaxed mb-6 flex-1 relative z-10">
          {project.description || "No architectural specification provided."}
        </p>

        {/* Progress Bar */}
        <div className="mb-6 relative z-10 bg-surface-100/50 backdrop-blur-md p-4 rounded-2xl border border-white/5 dark:border-white/5 shadow-inner">
          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-[0.2em] text-surface-400 mb-2">
            <span>Project Progress</span>
            <span className="text-accent drop-shadow-[0_0_8px_rgba(var(--color-accent),0.6)]">{project.tasks_count > 0 ? Math.round(((project.tasks_done_count || 0) / project.tasks_count) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-surface-200/50 h-1.5 rounded-full overflow-hidden border border-black/5 dark:border-white/5 shadow-inner">
            <div 
              className="bg-accent h-full transition-all duration-1000 ease-out relative overflow-hidden" 
              style={{ width: `${project.tasks_count > 0 ? Math.round(((project.tasks_done_count || 0) / project.tasks_count) * 100) : 0}%` }} 
            >
              <div className="absolute inset-0 bg-white/20 w-[200%] animate-[shimmer_2s_infinite] -skew-x-12" />
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-white/10 dark:border-white/5 flex justify-between items-center mt-auto relative z-10">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-surface-400 bg-surface-100/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
               <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
               <span>{project.tasks_count}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-surface-400 bg-surface-100/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
               <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               <span>{project.memberships_count}</span>
            </div>
          </div>
          <div className="text-[9px] font-bold text-surface-400 uppercase tracking-[0.2em] bg-surface-100/30 px-2.5 py-1 rounded-lg">
            {new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
