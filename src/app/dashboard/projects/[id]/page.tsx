"use client";

import React, { useState, useEffect, use } from "react";
import { useAuthStore } from "@/store/auth-store";
import { TaskItem } from "@/components/projects/TaskItem";
import { ProjectDetail, Task } from "@/types/projects";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjectDetail() {
      try {
        const data = await apiClient.get<ProjectDetail>(`/api/projects/projects/${id}/`);
        setProject(data);
      } catch (err) {
        console.error("Failed to fetch project detail:", err);
        setError("Unable to load project details.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjectDetail();
  }, [id]);

  const canManageProject = user?.role === "architect" || user?.role === "admin";
  const canManageTasks = canManageProject || user?.role === "constructor";

  const handleTaskStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      await apiClient.patch(`/api/projects/tasks/${taskId}/`, { status: newStatus });
      // Update local state
      if (project) {
        setProject({
          ...project,
          tasks: project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t)
        });
      }
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  if (loading) return <div style={{ padding: "4rem", textAlign: "center" }}><div className="spinner"></div></div>;
  if (error || !project) return <div style={{ padding: "4rem", textAlign: "center", color: "#f87171" }}>{error || "Project not found"}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Detail Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Link href="/dashboard/projects" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
          ← Back to Projects
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ maxWidth: "800px" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, margin: 0, marginBottom: "0.75rem" }}>
              {project.title}
            </h1>
            <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>
              {project.description || "No description provided for this project."}
            </p>
          </div>
          <div style={{ 
            padding: "0.5rem 1rem", 
            borderRadius: "100px", 
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "0.875rem",
            fontWeight: 600
          }}>
            Status: <span style={{ color: project.status === "Completed" ? "#34d399" : "#fbbf24" }}>{project.status}</span>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "2.5rem" }}>
        {/* Tasks Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Project Tasks</h2>
            {canManageProject && (
              <button className="button-secondary" style={{ fontSize: "0.8125rem" }}>Add Task</button>
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {project.tasks.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "1rem", color: "rgba(255,255,255,0.3)" }}>
                No tasks defined yet.
              </div>
            ) : (
              project.tasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  canUpdateStatus={canManageTasks}
                  onStatusUpdate={handleTaskStatusUpdate}
                />
              ))
            )}
          </div>
        </div>

        {/* Sidebar Context */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Members Card */}
          <div className="card">
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Project Team</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {project.members.map(member => (
                <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ 
                    width: "32px", height: "32px", borderRadius: "50%", 
                    background: "rgba(255,255,255,0.1)", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "0.875rem" 
                  }}>
                    {member.user.name?.[0] || "?"}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{member.user.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{member.project_role}</div>
                  </div>
                </div>
              ))}
            </div>
            {canManageProject && (
              <button className="button-secondary" style={{ width: "100%", marginTop: "1rem", fontSize: "0.8125rem" }}>
                 Manage Team
              </button>
            )}
          </div>

          {/* Stats Card */}
          <div className="card card-accent">
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Financial Overview</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Total Budget</span>
                <span style={{ fontWeight: 600 }}>
                  ${project.tasks.reduce((acc, t) => acc + Number(t.cost), 0).toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Completed Work</span>
                <span style={{ fontWeight: 600, color: "#34d399" }}>
                  ${project.tasks.filter(t => t.status === "Done").reduce((acc, t) => acc + Number(t.cost), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
