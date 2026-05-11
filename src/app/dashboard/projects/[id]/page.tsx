"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectDetail } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { usePermissions } from "@/hooks/use-permissions";
import { TaskItem } from "@/components/projects/TaskItem";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { projectPermissions, canManageProject, canEditProject } = usePermissions();

  useEffect(() => {
    async function fetchProject() {
      try {
        const data = await projectsApi.getProjectDetails(id);
        setProject(data);
      } catch (err) {
        console.error("Failed to fetch project:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  if (isLoading) return <div className="py-24 flex justify-center"><Spinner size="lg" label="Retrieving site plans..." /></div>;
  if (!project) return <div className="text-center py-20 px-6 glass-card mt-8"><h2 className="text-xl font-bold mb-4">Project Not Found</h2><Button onClick={() => router.back()}>Go Back</Button></div>;

  // perms variable removed as it was unused
  const canManage = canManageProject(project);

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-5">
            <Badge variant="secondary" className="bg-(--surface-200)! border-(--surface-300)! text-(--gray-400)! normal-case! tracking-normal!">
              🏢 {project.account.name}
            </Badge>
            <Badge variant={project.status === "Completed" ? "success" : "warning"}>
              {project.status}
            </Badge>
          </div>
          <h1 className="text-5xl font-extrabold text-foreground mb-4 leading-tight tracking-tight">{project.title}</h1>
          <p className="text-(--gray-400) max-w-3xl text-lg leading-relaxed">
            {project.description || "Detailed architectural overview and structural coordination for this mission-critical development."}
          </p>
        </div>

        <div className="flex gap-4 shrink-0">
          {canEditProject(project) && (
            <Button variant="outline" className="px-6">Edit Blueprint</Button>
          )}
          {canManage && (
            <Button variant="danger" className="px-6">Archive Project</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Task List (Primary Column) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center bg-white/[0.02] p-5 rounded-2xl border border-white/5">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                📋 Execution Roadmap
                <Badge variant="secondary" className="text-[10px] opacity-70">{project.tasks.length} Phases</Badge>
              </h2>
            </div>
            {canEditProject(project) && (
              <Button size="sm" variant="primary" leftIcon={<span>+</span>}>New Task</Button>
            )}
          </div>

          <div className="grid gap-5">
            {project.tasks.length > 0 ? (
              project.tasks.map((task) => (
                <TaskItem key={task.uid} task={task} />
              ))
            ) : (
              <div className="py-20 border-2 border-dashed border-white/5 rounded-3xl text-center">
                <p className="text-(--gray-600) font-medium">No tasks scheduled for this phase.</p>
              </div>
            )}
          </div>
        </div>

        {/* Members & Stats (Secondary Column) */}
        <div className="space-y-10">
          <Card hover={false} className="p-8 bg-surface-100! border-(--surface-300)!">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-(--gray-600) mb-6">
              Assigned Specialists
            </h3>
            <div className="space-y-5">
              {project.memberships.map((member) => (
                <div key={member.id} className="flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-(--surface-200) flex items-center justify-center text-sm font-bold text-foreground border border-white/5 group-hover:border-(--primary)/30 transition-all">
                      {member.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-(--primary) transition-colors">{member.user.name}</p>
                      <p className="text-[10px] font-medium text-(--gray-600) tracking-wide">{member.user.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize! text-[9px]! tracking-tighter!">{member.role}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card hover={false} className="p-8 bg-linear-to-br from-(--primary)/10 to-(--accent)/10 border-(--primary)/10!">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-(--gray-600) mb-6">
              Development Context
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-(--gray-400) font-medium">Structural Lead</span>
                <span className="text-foreground font-bold">{project.created_by.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-(--gray-400) font-medium">Tenant Root</span>
                <span className="text-(--primary) font-black uppercase tracking-tighter">{project.account.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-4 border-t border-white/5">
                <span className="text-(--gray-400) font-medium">Node Reference</span>
                <span className="text-(--gray-600) font-mono text-[9px]">{project.uid}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
