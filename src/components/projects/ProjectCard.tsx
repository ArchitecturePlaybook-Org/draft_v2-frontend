import React from "react";
import Link from "next/link";
import { Project } from "@/types/projects";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Completed": return "success";
      case "Work in Progress": return "info";
      default: return "warning";
    }
  };

  return (
    <Link href={`/dashboard/projects/${project.uid}`} className="block transition-transform active:scale-[0.98]">
      <Card className="p-6 flex flex-col gap-5 min-h-60 bg-surface-100! border-(--surface-300)!">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusVariant(project.status)}>
              {project.status}
            </Badge>
            <Badge variant="secondary">
              🏢 {project.account.name}
            </Badge>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-2 leading-tight group-hover:text-(--primary) transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-(--gray-400) line-clamp-2 leading-relaxed">
            {project.description || "No description provided."}
          </p>
        </div>

        <div className="mt-auto pt-5 border-t border-white/5 flex justify-between items-center bg-white/[0.01] -mx-6 -mb-6 px-6 py-4">
          <div className="flex gap-5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-(--gray-400)">
               <span className="text-sm text-(--primary) opacity-90">📋</span>
               <span className="text-foreground text-xs">{project.tasks_count}</span>
               <span className="opacity-40">Tasks</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-(--gray-400)">
               <span className="text-sm text-(--accent) opacity-90">👥</span>
               <span className="text-foreground text-xs">{project.memberships_count}</span>
               <span className="opacity-40">Members</span>
            </div>
          </div>
          <div className="text-[10px] font-black text-(--gray-600) uppercase tracking-[0.2em]">
            {new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </Card>
    </Link>
  );
};
