"use client";

import React, { useState, useEffect } from "react";
import { Project } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Spinner } from "@/components/ui/Spinner";
import { usePermissions } from "@/hooks/use-permissions";

import { useSearchParams } from "next/navigation";

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = usePermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [newProject, setNewProject] = useState({ 
    title: "", 
    description: "", 
    account_id: "" 
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const leadId = searchParams.get('lead_id');
    if (leadId) {
      const leadTitle = searchParams.get('title');
      const clientName = searchParams.get('client_name');
      setNewProject(prev => ({
        ...prev,
        title: leadTitle ? `Blueprint: ${leadTitle}` : `New Project for ${clientName}`,
        description: `Originating from Business Lead ID: ${leadId}`
      }));
      setShowCreateModal(true);
    }
  }, [searchParams]);

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.account_id) {
      alert("Please enter a Project Title and select a Professional Entity from the list.");
      return;
    }
    setIsCreating(true);
    try {
      await projectsApi.createProject({
        title: newProject.title,
        description: newProject.description,
        account_id: parseInt(newProject.account_id)
      });
      setShowCreateModal(false);
      setNewProject({ title: "", description: "", account_id: "" });
      fetchProjects();
    } catch (err: any) {
      alert(`Failed to establish project blueprint: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-12">
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

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-surface-200">
            <div className="p-8 border-b border-surface-100 bg-surface-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-primary tracking-tight">Establish New Blueprint</h3>
                <p className="text-[10px] uppercase tracking-widest font-bold text-surface-400 mt-1">Map project to a tenant entity</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-surface-400 hover:text-red-500 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Project Title</label>
                <input 
                  type="text" 
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title: e.target.value})}
                  className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm transition-colors" 
                  placeholder="e.g. Neo-Gothic Skyscraper Extension"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Architectural Scope (Optional)</label>
                <textarea 
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                  className="w-full h-24 bg-surface-50 border border-surface-200 p-4 rounded-xl outline-none focus:border-accent font-medium text-sm transition-colors resize-none" 
                  placeholder="Detailed context regarding the project..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Map to Professional Entity</label>
                <select 
                  value={newProject.account_id}
                  onChange={e => setNewProject({...newProject, account_id: e.target.value})}
                  className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors appearance-none"
                >
                  <option value="" disabled>Select Firm / Tenant...</option>
                  {orgs.map(org => (
                    <option key={org.id} value={org.id}>{org.name} ({org.account_type})</option>
                  ))}
                </select>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-surface-100">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest text-surface-500 hover:bg-surface-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="px-6 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-primary text-white hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Initializing..." : "Establish Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
