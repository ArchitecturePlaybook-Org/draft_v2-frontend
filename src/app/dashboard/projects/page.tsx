"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Project } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EstablishBlueprintModal } from "@/components/projects/EstablishBlueprintModal";
import { Spinner } from "@/components/ui/Spinner";
import { usePermissions } from "@/hooks/use-permissions";
import { useSearchParams } from "next/navigation";

// ── Inner component that safely uses useSearchParams() ──────────────────────
function SearchParamsReader({ onParams }: { onParams: (leadId: string | null, title: string | null, clientName: string | null) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onParams(
      searchParams.get('lead_id'),
      searchParams.get('title'),
      searchParams.get('client_name'),
    );
  }, [searchParams]);
  return null;
}

// ── Main page component ──────────────────────────────────────────────────────
function ProjectsPageInner() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = usePermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [initialData, setInitialData] = useState({ title: "", description: "" });

  const handleSearchParams = (leadId: string | null, leadTitle: string | null, clientName: string | null) => {
    if (leadId) {
      setInitialData({
        title: leadTitle ? `Blueprint: ${leadTitle}` : `New Project for ${clientName}`,
        description: `Originating from Business Lead ID: ${leadId}`
      });
      setShowCreateModal(true);
    }
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getProjects();
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
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (showCreateModal && orgs.length === 0) {
      orgsApi.listOrgs().then(data => {
        const orgList = Array.isArray(data) ? data : (data as any).results || [];
        setOrgs(orgList);
      }).catch(console.error);
    }
  }, [showCreateModal, orgs.length]);



  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Read search params safely inside Suspense */}
      <Suspense fallback={null}>
        <SearchParamsReader onParams={handleSearchParams} />
      </Suspense>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 border border-surface-200 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full arch-grid opacity-[0.03] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">Project Registry</h1>
          <p className="text-sm text-surface-500 max-w-2xl leading-relaxed">
            {isAdmin 
              ? "System-wide overview of all active architectural projects, accounts, and cross-tenant collaborations across the platform." 
              : "Manage and oversee your active architectural designs, construction workflows, and collaborative project data mapped to your professional entities."}
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="relative z-10 h-12 px-6 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-accent transition-colors flex items-center gap-3 shadow-md hover:shadow-xl"
        >
          <span className="text-lg leading-none mb-0.5">+</span> Establish Blueprint
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white border border-surface-200 rounded-2xl">
          <Spinner size="lg" label="Retrieving architectural nodes..." />
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {projects.map((project) => (
            <ProjectCard key={project.uid} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-white border border-surface-200 rounded-2xl shadow-sm">
          <div className="text-5xl mb-6 opacity-20">🏗️</div>
          <h3 className="text-xl font-bold text-primary mb-2 tracking-tight">No Blueprints Established</h3>
          <p className="text-sm text-surface-400 max-w-sm mx-auto mb-8 leading-relaxed">
            You don&apos;t have any active projects yet. Map a new architectural project to one of your firm entities.
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="h-10 px-6 border-2 border-surface-200 text-primary font-bold text-[10px] uppercase tracking-widest rounded-lg hover:border-accent hover:text-accent transition-all"
          >
            Start Your First Project
          </button>
        </div>
      )}

      <EstablishBlueprintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchProjects}
        orgs={orgs}
        initialData={initialData}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="py-32 flex justify-center"><Spinner size="lg" label="Loading..." /></div>}>
      <ProjectsPageInner />
    </Suspense>
  );
}
