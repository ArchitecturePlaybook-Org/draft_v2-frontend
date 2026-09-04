"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Project } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EstablishBlueprintModal } from "@/components/projects/EstablishBlueprintModal";
import { Spinner } from "@/components/ui/Spinner";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { FolderKanban, Share2, ExternalLink, Lock, Globe } from "lucide-react";

function SearchParamsReader({ onParams }: { onParams: (params: { leadId: string | null; title: string | null; clientName: string | null; preset: string | null; create: string | null }) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onParams({
      leadId: searchParams.get('lead_id'),
      title: searchParams.get('title'),
      clientName: searchParams.get('client_name'),
      preset: searchParams.get('preset'),
      create: searchParams.get('create'),
    });
  }, [searchParams]);
  return null;
}

export function ProjectsRegistryView() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeRegistryTab, setActiveRegistryTab] = useState<"projects" | "shared_tasks">("projects");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<{ title?: string; description?: string; preset_slug?: string; kind?: string }>({ title: "", description: "" });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");

  const planLimits = usePlanLimits();
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [templatePanel, setTemplatePanel] = useState<{ open: boolean; projectUid: string; projectTitle: string } | null>(null);
  const [templateMeta, setTemplateMeta] = useState({ category: '', difficulty: '', visibility: 'PRIVATE' });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // TanStack Queries for automatic caching
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getProjects(),
  });

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: ({ uid, newStatus }: { uid: string; newStatus: string }) =>
      projectsApi.updateProject(uid, { status: newStatus as any }),
    onMutate: async ({ uid, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });
      const previousProjects = queryClient.getQueryData<Project[]>(["projects"]);

      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old ? old.map((p) => (p.uid === uid ? { ...p, status: newStatus as any } : p)) : []
      );

      return { previousProjects };
    },
    onError: (err, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects"], context.previousProjects);
      }
      alert("Failed to update project status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const handleSearchParams = (params: { leadId: string | null; title: string | null; clientName: string | null; preset: string | null; create: string | null }) => {
    if (params.leadId) {
      setInitialData({
        title: params.title ? `Blueprint: ${params.title}` : `New Project for ${params.clientName}`,
        description: `Originating from Business Lead ID: ${params.leadId}`,
        preset_slug: '',
      });
      setShowCreateModal(true);
    } else if (params.preset) {
      setInitialData({
        title: params.title || '',
        description: '',
        preset_slug: params.preset,
      });
      setShowCreateModal(true);
    } else if (params.create === 'true') {
      setShowCreateModal(true);
    }
  };

  const handleStatusChange = (uid: string, newStatus: string) => {
    statusMutation.mutate({ uid, newStatus });
  };

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

  const totalProjectsCount = projects.length;
  const inProgressCount = projects.filter(p => p.status === "Work in Progress").length;
  const completedCount = projects.filter(p => p.status === "Completed").length;

  return (
    <div className="w-full max-w-full space-y-4 animate-fade-in">
      <Suspense fallback={null}>
        <SearchParamsReader onParams={handleSearchParams} />
      </Suspense>

      {/* Header Banner with Quick Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface-50 border border-surface-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Project Registry</h1>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
              {totalProjectsCount} Blueprints
            </span>
          </div>
          <p className="text-xs text-surface-400 font-medium max-w-2xl leading-relaxed">
            {isAdmin 
              ? "Overview of active architectural projects, accounts, and cross-tenant collaborations across the platform." 
              : "Manage and oversee active architectural designs and collaborative project data."}
          </p>
        </div>

        {/* Quick Stats Pill Row + Primary CTA */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-surface-100 px-3 py-1.5 rounded-xl border border-surface-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-extrabold text-foreground">{inProgressCount} In Progress</span>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-100 px-3 py-1.5 rounded-xl border border-surface-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-extrabold text-foreground">{completedCount} Completed</span>
          </div>

          <button 
            onClick={() => {
              if (!planLimits.isLoading && !planLimits.canCreateProject) {
                setShowUpgradeModal(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="h-9 px-4 bg-accent hover:bg-accent/90 text-background font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 ml-auto lg:ml-0"
          >
            <span>+</span>
            <span>Establish Blueprint</span>
          </button>
        </div>
      </div>

      {/* Top Portfolio vs Shared Tasks Hub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveRegistryTab("projects")}
          className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeRegistryTab === "projects"
              ? "bg-accent text-background shadow-xs font-black"
              : "bg-surface-100/70 dark:bg-surface-800/50 text-surface-400 hover:text-primary"
          }`}
        >
          <FolderKanban className="w-4 h-4" /> All Projects ({totalProjectsCount})
        </button>

        <button
          onClick={() => setActiveRegistryTab("shared_tasks")}
          className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeRegistryTab === "shared_tasks"
              ? "bg-accent text-background shadow-xs font-black"
              : "bg-surface-100/70 dark:bg-surface-800/50 text-surface-400 hover:text-primary"
          }`}
        >
          <Share2 className="w-4 h-4" /> Shared Tasks Hub
        </button>
      </div>

      {activeRegistryTab === "shared_tasks" ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-surface-100/80 dark:bg-surface-800/40 border border-surface-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-primary">Cross-Project Shared Tasks Workspace</h2>
                <p className="text-xs text-surface-400 mt-0.5">
                  Select any active project below to open its dedicated Shared Tasks tab and client preview links.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <div
                key={p.uid}
                onClick={() => router.push(`/dashboard/projects/${p.uid}?tab=shared_tasks`)}
                className="p-6 rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 hover:border-accent/50 transition-all cursor-pointer group shadow-sm hover:shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                    {p.code || p.uid.substring(0, 8)}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-surface-400 flex items-center gap-1 group-hover:text-accent">
                    Open Shared Tasks Tab <ExternalLink className="w-3 h-3" />
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-primary group-hover:text-accent transition-colors line-clamp-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-surface-400 line-clamp-2 mt-1">
                    {p.description || "Active Architectural Blueprint Project"}
                  </p>
                </div>

                <div className="pt-3 border-t border-surface-200 dark:border-white/10 flex items-center justify-between text-xs text-surface-400 font-medium">
                  <span>Client: {p.client_name || "Internal Firm"}</span>
                  <span className="font-bold text-accent px-2 py-1 rounded-lg bg-accent/10 group-hover:bg-accent group-hover:text-background transition-all">
                    Shared Tasks ➔
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Sort Toolbar */}
          <div className="flex flex-col md:flex-row gap-2.5 bg-surface-50/60 dark:bg-surface-800/40 backdrop-blur-xl p-2.5 rounded-2xl border border-surface-200/80 dark:border-surface-700/60 shadow-sm relative z-10 items-center justify-between">
        
        {/* Search Bar */}
        <div className="w-full md:w-72 flex items-center gap-2 bg-surface-100/70 dark:bg-surface-700/50 px-3 rounded-xl border border-surface-200/60 dark:border-surface-700/50 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all shadow-inner">
          <span className="text-surface-400 text-xs shrink-0">🔍</span>
          <input 
            type="text"
            placeholder="Search title or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-8.5 bg-transparent outline-none text-xs font-bold text-foreground placeholder:text-surface-400/70 placeholder:font-normal"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-surface-400 hover:text-foreground text-xs transition-colors shrink-0">✕</button>
          )}
        </div>
        
        {/* Status Dropdown & Sort Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-8.5 px-3 bg-surface-100/80 dark:bg-surface-700/60 border border-surface-200/60 dark:border-surface-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-foreground outline-none focus:border-accent cursor-pointer appearance-none pr-8"
            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.9em' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="To Start">To Start</option>
            <option value="Work in Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="h-8.5 px-3 bg-surface-100/80 dark:bg-surface-700/60 border border-surface-200/60 dark:border-surface-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-foreground outline-none focus:border-accent cursor-pointer appearance-none pr-8"
            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.9em' }}
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="A_Z">A to Z</option>
          </select>
        </div>

      </div>

      {isLoading || !isMounted ? (
        <SkeletonGrid count={6} columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" />
      ) : filteredProjects.length > 0 ? (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5"
        >
          {filteredProjects.map((project) => (
            <motion.div key={project.uid} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} className="h-full">
              <ProjectCard
                project={project}
                onStatusChange={handleStatusChange}
                onSaveAsTemplate={(uid, title) => {
                  setTemplatePanel({ open: true, projectUid: uid, projectTitle: title });
                  setTemplateMeta({ category: '', difficulty: '', visibility: 'PRIVATE' });
                }}
              />
            </motion.div>
          ))}
        </motion.div>

      ) : (
        <div className="text-center py-32 bg-gradient-to-b from-surface-50/50 to-transparent backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 arch-grid opacity-10 pointer-events-none mix-blend-overlay group-hover:opacity-20 transition-opacity duration-1000" />
          <div className="relative z-10">
            <div className="w-24 h-24 bg-surface-100/50 backdrop-blur-md rounded-[2rem] mx-auto flex items-center justify-center border border-white/10 shadow-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 mb-8">
              <span className="text-5xl drop-shadow-[0_0_15px_rgba(var(--color-primary),0.2)]">🏗️</span>
            </div>
            <h3 className="text-2xl font-black text-primary mb-3 tracking-tight">No Blueprints Established</h3>
            <p className="text-sm text-surface-400 font-medium max-w-sm mx-auto mb-10 leading-relaxed">
              You don&apos;t have any active projects yet. Map a new architectural project to one of your firm entities.
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="h-12 px-8 bg-surface-100/50 backdrop-blur-md border border-white/10 dark:border-white/5 text-primary font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent hover:text-background hover:scale-105 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(var(--color-accent),0.4)]"
            >
              Start Your First Project
            </button>
          </div>
        </div>
      )}

      <EstablishBlueprintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
        orgs={orgs}
        initialData={initialData}
      />

      {/* ── Save as Template Slide Panel ── */}
      <AnimatePresence>
        {templatePanel?.open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
              onClick={() => setTemplatePanel(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-[100] bg-surface-50 border-l border-surface-200 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-surface-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-foreground">Save as Template</h2>
                  <p className="text-xs text-surface-400 font-medium mt-0.5 truncate max-w-[260px]">{templatePanel.projectTitle}</p>
                </div>
                <button onClick={() => setTemplatePanel(null)} className="w-8 h-8 rounded-xl flex items-center justify-center text-surface-400 hover:bg-surface-200 transition-colors">×</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="bg-accent/8 border border-accent/20 rounded-2xl p-4 text-sm text-surface-600 font-medium">
                  📋 A <strong>non-destructive clone</strong> of this project’s structure will be saved as a template. The original project and its data remain unchanged.
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Category</label>
                  <select
                    value={templateMeta.category}
                    onChange={e => setTemplateMeta(p => ({ ...p, category: e.target.value }))}
                    className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="">Select category...</option>
                    {["Residential","Commercial","Industrial","Renovation","Infrastructure","Mixed-Use"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Difficulty</label>
                  <select
                    value={templateMeta.difficulty}
                    onChange={e => setTemplateMeta(p => ({ ...p, difficulty: e.target.value }))}
                    className="w-full h-11 bg-surface-100 border border-surface-200 rounded-xl px-4 text-sm font-medium text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="">Select difficulty...</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Visibility</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'PRIVATE',  l: '🔒 Private',    d: 'Only you' },
                      { v: 'ORG',      l: '🏢 Org',         d: 'Your team' },
                      { v: 'UNLISTED', l: '🔗 Unlisted',  d: 'Link only' },
                      { v: 'PUBLIC',   l: '🌐 Public',     d: 'Marketplace' },
                    ].map(({ v, l, d }) => (
                      <button
                        key={v}
                        onClick={() => setTemplateMeta(p => ({ ...p, visibility: v }))}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          templateMeta.visibility === v ? 'border-accent bg-accent/10' : 'border-surface-200 hover:border-surface-300'
                        }`}
                      >
                        <div className="text-xs font-black text-foreground">{l}</div>
                        <div className="text-[10px] text-surface-400">{d}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-surface-200">
                <button
                  disabled={savingTemplate}
                  onClick={async () => {
                    setSavingTemplate(true);
                    try {
                      const result = await projectsApi.saveProjectAsTemplate(templatePanel.projectUid, {
                        category: templateMeta.category,
                        visibility: templateMeta.visibility,
                        difficulty: templateMeta.difficulty,
                      });
                      setTemplatePanel(null);
                      toast.success(
                        <div className="flex items-center gap-3">
                          <span>📋 Template saved as <strong>{result.title}</strong>!</span>
                          <button onClick={() => router.push(`/dashboard/templates/${result.uid}`)} className="font-bold text-accent underline">
                            View →
                          </button>
                        </div>
                      );
                    } catch {
                      toast.error('Failed to save as template.');
                    } finally {
                      setSavingTemplate(false);
                    }
                  }}
                  className="w-full h-12 bg-gradient-to-r from-accent to-accent/90 text-background rounded-xl font-black text-sm hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,186,8,0.4)] transition-all disabled:opacity-50"
                >
                  {savingTemplate ? 'Saving...' : '📋 Save as Template'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="project"
        currentPlan={planLimits.subscription?.plan?.name}
      />

      <EstablishBlueprintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(created) => {
          setShowCreateModal(false);
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          const targetUid = created?.uid || (created?.id ? String(created.id) : '');
          if (targetUid) {
            router.push(`/dashboard/projects/${targetUid}`);
          }
        }}
        orgs={orgs}
        initialData={initialData}
      />
    </div>
  );
}
