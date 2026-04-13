import React from "react";
import Link from "next/link";
import { Project } from "@/types/projects";

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const statusColor = {
    "To Start": "#fbbf24",
    "Work in Progress": "#60a5fa",
    "Completed": "#34d399",
  }[project.status] || "rgba(255,255,255,0.2)";

  return (
    <Link href={`/dashboard/projects/${project.id}`} style={{ textDecoration: "none" }}>
      <div className="card card-hover" style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.5rem",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "transform 0.2s, border-color 0.2s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "100px",
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            background: `${statusColor}20`,
            color: statusColor,
            border: `1px solid ${statusColor}40`
          }}>
            {project.status}
          </div>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
            #{project.id}
          </span>
        </div>

        <div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
            {project.title}
          </h3>
          <p style={{ 
            fontSize: "0.875rem", 
            color: "rgba(255,255,255,0.5)", 
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.5
          }}>
            {project.description || "No description provided."}
          </p>
        </div>

        <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
            <span title="Tasks">📋 {project.tasks_count}</span>
            <span title="Members">👥 {project.members_count}</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
            {new Date(project.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
};
