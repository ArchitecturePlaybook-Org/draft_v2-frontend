import React from "react";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus } from "@/types/projects";
import { ProjectStatusDropdown } from "@/components/projects/ProjectStatusDropdown";
import { motion } from "framer-motion";
import { Building2, User, MapPin, CheckCircle2, Users, Calendar, ArrowRight, MoreHorizontal } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onStatusChange?: (uid: string, newStatus: ProjectStatus) => void;
  onSaveAsTemplate?: (projectUid: string, projectTitle: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onStatusChange, onSaveAsTemplate }) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const navigateToProject = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/dashboard/projects/${project.uid}`);
  };

  const tasksDone = project.tasks_done_count || 0;
  const totalTasks = project.tasks_count || 0;
  const progressPercent = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="bg-surface-card/90 dark:bg-surface-800/60 backdrop-blur-xl p-4.5 rounded-2xl border border-surface-200/80 dark:border-surface-700/60 hover:border-accent/70 shadow-sm hover:shadow-xl hover:shadow-accent/10 transition-all duration-300 h-[260px] flex flex-col justify-between relative overflow-hidden group min-w-0"
    >
      {/* Dynamic Hover Ambient Light */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Blueprint Grid Watermark */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent pointer-events-none" />

      {/* ── CARD NAVIGATOR LINK OVERLAY ── */}
      <div 
        onClick={navigateToProject}
        className="absolute inset-0 z-0 cursor-pointer"
        title={`Open ${project.title} workspace`}
      />

      {/* ── TOP SECTION ── */}
      <div className="relative z-10 space-y-2.5 pointer-events-none">
        {/* Row 1: Code Badge (Left) vs Status & Options (Right) */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1 min-w-0 shrink overflow-hidden">
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600 truncate shrink-0">
              {project.project_code || project.uid.substring(0, 8)}
            </span>
            {project.kind && (
              <span className="text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 truncate shrink-0 hidden sm:inline-block">
                {project.kind}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
            <ProjectStatusDropdown 
              uid={project.uid} 
              status={project.status as ProjectStatus} 
              onChange={onStatusChange} 
            />

            {onSaveAsTemplate && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    setMenuOpen(prev => !prev); 
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center text-surface-400 hover:text-foreground hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-xs font-bold cursor-pointer"
                  title="Project Options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 z-50 min-w-[150px] bg-background border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xl py-1 backdrop-blur-xl"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onSaveAsTemplate(project.uid, project.title);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-foreground hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📋</span> Save as Template
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


        {/* Row 2: Title */}
        <div className="pointer-events-auto cursor-pointer min-w-0" onClick={navigateToProject}>
          <h3 className="font-black text-sm sm:text-base text-foreground tracking-tight group-hover:text-accent transition-colors truncate">
            {project.title}
          </h3>
          
          <div className="flex items-center gap-2 text-[9.5px] font-semibold text-surface-400 truncate mt-0.5">
            {project.account?.name && (
              <span className="flex items-center gap-1 text-surface-500 truncate">
                <Building2 className="w-3 h-3 text-accent shrink-0" />
                <span className="truncate">{project.account.name}</span>
              </span>
            )}
            {project.client_name && (
              <span className="flex items-center gap-1 truncate border-l border-surface-300/50 pl-2">
                <User className="w-3 h-3 text-surface-400 shrink-0" />
                <span className="truncate">{project.client_name}</span>
              </span>
            )}
            {project.location && (
              <span className="flex items-center gap-1 truncate border-l border-surface-300/50 pl-2">
                <MapPin className="w-3 h-3 text-surface-400 shrink-0" />
                <span className="truncate">{project.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Description */}
        <p className="text-[11px] text-surface-400 line-clamp-2 leading-relaxed font-normal">
          {project.description || "No architectural description provided."}
        </p>
      </div>

      {/* ── BOTTOM SECTION: PROGRESS & FOOTER STATS ── */}
      <div className="relative z-10 space-y-2.5 pt-2.5 border-t border-surface-200/70 dark:border-surface-700/60 pointer-events-none">
        {/* Progress Bar Container */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
            <span className="text-surface-400">Timeline Progress</span>
            <span className="text-accent font-mono font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-surface-200/80 dark:bg-surface-700/80 h-1.5 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-accent to-amber-300 h-full rounded-full transition-all duration-500 shadow-2xs" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        {/* Footer Metadata */}
        <div className="flex justify-between items-center text-[9.5px] font-bold text-surface-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-surface-100 dark:bg-surface-700/70 px-2 py-0.5 rounded-md text-foreground font-mono">
              <CheckCircle2 className="w-3 h-3 text-accent" /> {totalTasks} Tasks
            </span>
            <span className="flex items-center gap-1 bg-surface-100 dark:bg-surface-700/70 px-2 py-0.5 rounded-md text-foreground">
              <Users className="w-3 h-3 text-blue-400" /> {project.memberships_count}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-surface-400 font-mono uppercase tracking-wider group-hover:text-accent transition-colors">
            <Calendar className="w-3 h-3" />
            <span>{new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform ml-0.5 text-accent" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
