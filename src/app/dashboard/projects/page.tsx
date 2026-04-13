"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Project } from "@/types/projects";
import { apiClient } from "@/lib/api-client";

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await apiClient.get<Project[]>("/api/projects/projects/");
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError("Unable to load projects. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const canCreate = user?.role === "architect" || user?.role === "admin";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0, marginBottom: "0.25rem" }}>
            Active Projects
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", margin: 0, fontSize: "0.9375rem" }}>
            Overview of architectural works and ongoing developments.
          </p>
        </div>
        {canCreate && (
          <button className="button-primary" style={{ padding: "0.75rem 1.25rem", borderRadius: "100px" }}>
             Initiate New Project
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div style={{ 
          padding: "2rem", 
          background: "rgba(239,68,68,0.05)", 
          border: "1px solid rgba(239,68,68,0.1)", 
          borderRadius: "1rem",
          color: "#f87171",
          textAlign: "center"
        }}>
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div style={{ 
          padding: "4rem", 
          textAlign: "center", 
          background: "rgba(255,255,255,0.02)", 
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: "1.5rem"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏙️</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>No projects found</h3>
          <p style={{ color: "rgba(255,255,255,0.4)" }}>
            Get started by creating your first architectural project.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
