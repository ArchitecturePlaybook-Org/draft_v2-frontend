"use client";

import React, { useState, useEffect } from "react";
import { Project } from "@/types/projects";
import { apiClient } from "@/lib/api-client";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { usePermissions } from "@/hooks/use-permissions";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = usePermissions();

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await apiClient.get<unknown>("/api/projects/projects/");
        const paginatedData = data as { results?: Project[] } | Project[];
        
        if (Array.isArray(paginatedData)) {
          setProjects(paginatedData);
        } else if (paginatedData && Array.isArray(paginatedData.results)) {
          setProjects(paginatedData.results);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground mb-3 tracking-tight">Projects</h1>
          <p className="text-(--gray-400) max-w-2xl leading-relaxed">
            {isAdmin 
              ? "System-wide overview of all active architectural projects, accounts, and cross-tenant collaborations across the platform." 
              : "Manage and oversee your active architectural designs, construction workflows, and collaborative project data."}
          </p>
        </div>
        <Button leftIcon={<span className="text-xl">+</span>} className="w-full md:w-auto">
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Spinner size="lg" label="Syncing project universe..." />
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {projects.map((project) => (
            <ProjectCard key={project.uid} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 glass-card border-(--surface-300)! bg-surface-100/50!">
          <div className="text-4xl mb-6 opacity-40">🏗️</div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Projects Found</h3>
          <p className="text-(--gray-400) max-w-sm mx-auto mb-8">
            You don&apos;t have any active projects yet. start by creating your first architectural blueprint.
          </p>
          <Button variant="outline">Start Your First Project</Button>
        </div>
      )}
    </div>
  );
}
