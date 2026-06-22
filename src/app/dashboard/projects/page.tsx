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
  const [sharedTasks, setSharedTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = usePermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [initialData, setInitialData] = useState({ title: "", description: "" });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");

  const handleSearchParams = (leadId: string | null, leadTitle: string | null, clientName: string | null) => {
    if (leadId) {
      setInitialData({
        title: leadTitle ? `Blueprint: ${leadTitle}` : `New Project for ${clientName}`,
        description: `Originating from Business Lead ID: ${leadId}`
      });
      setShowCreateModal(true);
    }
  };

  const handleStatusChange = async (uid: string, newStatus: string) => {
    // Optimistic UI update
    setProjects(prev => prev.map(p => p.uid === uid ? { ...p, status: newStatus as any } : p));
    try {
      await projectsApi.updateProject(uid, { status: newStatus as any });
    } catch (err: any) {
      alert("Failed to update project status.");
      fetchProjects();
    }
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getProjects();
      const paginatedData = data as { results?: Project[] } | Project[];
      let projs: Project[] = [];
      if (Array.isArray(paginatedData)) {
        projs = paginatedData;
      } else if (paginatedData && Array.isArray(paginatedData.results)) {
        projs = paginatedData.results;
      }
      setProjects(projs);

      // Fetch all tasks and filter out the ones belonging to external projects
      const allTasks = await projectsApi.getTasks();
      const projIds = new Set(projs.map(p => p.id));
      const shared = allTasks.filter(t => typeof t.project === "object" && t.project !== null ? !projIds.has((t.project as any).id) : !projIds.has(t.project as any));
      setSharedTasks(shared);
    } catch (err) {
      console.error("Failed to fetch projects/tasks:", err);
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

  const filteredProjects = projects.filter(p => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesClient = p.client_name?.toLowerCase().includes(q) || false;
      return matchesTitle || matchesClient;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "NEWEST") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "OLDEST") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "A_Z") return a.title.localeCompare(b.title);
    return 0;
  });

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
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={() => window.open("/api/proxy/projects/projects-export/", "_blank")}
            className="h-12 px-6 border-2 border-surface-200 text-surface-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:border-accent hover:text-accent transition-all flex items-center gap-2 bg-white"
          >
            <span>📊</span> Export Excel
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="h-12 px-6 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-accent transition-colors flex items-center gap-3 shadow-md hover:shadow-xl"
          >
            <span className="text-lg leading-none mb-0.5">+</span> Establish Blueprint
          </button>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-surface-200 shadow-sm relative z-10">
        <div className="flex-1 flex items-center gap-3 bg-surface-50 px-4 rounded-lg border border-surface-100">
          <span className="text-surface-400">🔍</span>
          <input 
            type="text"
            placeholder="Search projects by title or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 h-10 bg-transparent outline-none text-sm font-medium text-primary"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-surface-400 hover:text-primary pr-2">✕</button>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none h-10 px-4 bg-surface-50 border border-surface-100 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="To Start">To Start</option>
            <option value="Work in Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="flex-1 md:flex-none h-10 px-4 bg-surface-50 border border-surface-100 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="A_Z">A to Z</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white border border-surface-200 rounded-2xl">
          <Spinner size="lg" label="Retrieving architectural nodes..." />
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.uid} project={project} onStatusChange={handleStatusChange} />
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

      {/* Shared Tasks Section */}
      {sharedTasks.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-extrabold text-primary mb-6 tracking-tight">Shared Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {sharedTasks.map((task) => (
              <a href={`/share/task/${task.uid}`} key={task.uid} className="block group h-full">
                <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 hover:border-accent/40 shadow-sm hover:shadow-2xl transition-all h-full flex flex-col relative">
                  <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-full bg-amber-500/5 arch-grid opacity-10 group-hover:opacity-20 transition-opacity" />
                  </div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-amber-900 tracking-tight group-hover:text-accent transition-colors">
                        {task.title}
                      </h3>
                      <p className="text-[9px] uppercase tracking-widest font-bold text-amber-700">
                        {typeof task.project === "object" ? task.project.title : `Project ${task.project}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md bg-amber-500 text-white">
                        Shared Task
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-amber-800/70 line-clamp-2 leading-relaxed mb-8 flex-1 relative z-10">
                    {task.description || "No description provided."}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
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
