"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Project } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EstablishBlueprintModal } from "@/components/projects/EstablishBlueprintModal";
import { Spinner } from "@/components/ui/Spinner";
import { usePermissions } from "@/hooks/use-permissions";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

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

export function ProjectsRegistryView() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [initialData, setInitialData] = useState({ title: "", description: "" });

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
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getProjects(),
  });

  const { data: sharedTasks = [], isLoading: isSharedTasksLoading } = useQuery<any[]>({
    queryKey: ["shared-tasks"],
    queryFn: () => projectsApi.getTasks({ is_shared: true }),
  });

  const isLoading = isProjectsLoading || isSharedTasksLoading;

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

  const handleSearchParams = (leadId: string | null, leadTitle: string | null, clientName: string | null) => {
    if (leadId) {
      setInitialData({
        title: leadTitle ? `Blueprint: ${leadTitle}` : `New Project for ${clientName}`,
        description: `Originating from Business Lead ID: ${leadId}`
      });
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

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <Suspense fallback={null}>
        <SearchParamsReader onParams={handleSearchParams} />
      </Suspense>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-surface-50/40 backdrop-blur-2xl p-10 border border-white/20 dark:border-white/5 rounded-[2rem] shadow-2xl shadow-primary/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-full arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-primary mb-3 tracking-tight drop-shadow-sm">Project Registry</h1>
          <p className="text-sm text-surface-400 font-medium max-w-2xl leading-relaxed">
            {isAdmin 
              ? "System-wide overview of all active architectural projects, accounts, and cross-tenant collaborations across the platform." 
              : "Manage and oversee your active architectural designs, construction workflows, and collaborative project data mapped to your professional entities."}
          </p>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={() => {
              if (!planLimits.isLoading && !planLimits.canCreateProject) {
                setShowUpgradeModal(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="h-12 px-6 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(var(--color-accent),0.4)]"
          >
            <span className="text-lg leading-none mb-0.5">+</span> Establish Blueprint
          </button>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-surface-50/40 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-xl shadow-primary/5 relative z-10">
        <div className="flex-1 flex items-center gap-3 bg-surface-100/50 backdrop-blur-md px-5 rounded-xl border border-white/10 dark:border-white/5 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10 transition-all shadow-inner">
          <span className="text-surface-400 drop-shadow-sm">🔍</span>
          <input 
            type="text"
            placeholder="Search projects by title or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 h-12 bg-transparent outline-none text-sm font-bold text-primary placeholder:text-surface-400/70 placeholder:font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-surface-400 hover:text-primary pr-2 transition-colors">✕</button>
          )}
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none h-12 px-5 bg-surface-100/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl text-xs font-bold text-primary outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all cursor-pointer shadow-inner appearance-none"
            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="To Start">To Start</option>
            <option value="Work in Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="flex-1 md:flex-none h-12 px-5 bg-surface-100/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl text-xs font-bold text-primary outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all cursor-pointer shadow-inner appearance-none pr-10"
            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="A_Z">A to Z</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-surface-100 border border-surface-200 rounded-2xl">
          <Spinner size="lg" label="Retrieving architectural nodes..." />
        </div>
      ) : filteredProjects.length > 0 ? (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
        >
          {filteredProjects.map((project) => (
            <motion.div key={project.uid} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="h-full">
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="project"
        currentPlan={planLimits.subscription?.plan?.name}
      />

      {/* Shared Tasks Section */}
      {sharedTasks.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-extrabold text-primary mb-6 tracking-tight">Shared Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {sharedTasks.map((task, idx) => (
              <motion.div 
                key={task.uid} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 * idx }}
                whileHover={{ rotateY: 2, rotateX: -2, y: -5, z: 20 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="h-full"
              >
                <a href={`/share/task/${task.uid}`} className="block group h-full">
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-2xl border border-amber-200 dark:border-amber-800/30 hover:border-accent/40 shadow-sm hover:shadow-2xl transition-all h-full flex flex-col relative">
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                      <div className="absolute top-0 right-0 w-[500px] h-full bg-amber-500/5 arch-grid opacity-10 group-hover:opacity-30 transition-opacity duration-1000 mix-blend-overlay" />
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    </div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-xl text-amber-900 dark:text-amber-100 tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {task.title}
                        </h3>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-700/80 dark:text-amber-400/80 flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          {typeof task.project === "object" ? task.project.title : `Project ${task.project}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] rounded-md bg-amber-500 text-white shadow-lg shadow-amber-500/20 backdrop-blur-md">
                          Shared Task
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-amber-900/70 dark:text-amber-100/70 line-clamp-2 leading-relaxed mb-8 flex-1 relative z-10 font-medium">
                      {task.description || "No description provided."}
                    </p>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
