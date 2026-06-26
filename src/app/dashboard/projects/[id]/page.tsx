"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProjectStatus } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { usePermissions } from "@/hooks/use-permissions";
import { TaskExecutionSidePanel } from "@/components/projects/TaskExecutionSidePanel";
import { Spinner } from "@/components/ui/Spinner";
import { MilestoneMatrixView } from "@/components/matrix/MilestoneMatrixView";
import { ExpandedFeedView } from "@/components/matrix/ExpandedFeedView";
import { SiteOpsTab } from "@/components/projects/SiteOpsTab";
import { ProjectHeroHeader } from "@/components/projects/ProjectHeroHeader";
import { useProjectNavStore } from "@/store/project-nav-store";
import { TaskAccessRequestsList } from "@/components/projects/TaskAccessRequestsList";
import { KanbanTab } from "@/components/projects/KanbanTab";
import { GanttTab } from "@/components/projects/GanttTab";
import { DataHubTab } from "@/components/projects/DataHubTab";
import { useProjectStore } from "@/store/project-store";
import { motion } from "framer-motion";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as any;
  const taskParam = searchParams.get("task");
  
  const { 
    project, 
    isLoading, 
    activeTab, 
    activeTask, 
    setActiveTab, 
    setActiveTask, 
    fetchProject, 
    fetchTemplates,
    updateProjectStatus
  } = useProjectStore();

  const { canManageProject, canEditProject } = usePermissions();
  const { setProjectContext, recordProjectAccess } = useProjectNavStore();
  
  const [matrixView, setMatrixView] = useState<"grid" | "feed">("grid");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [firmMembers, setFirmMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [globalPunchList, setGlobalPunchList] = useState<any[]>([]);
  const [isLoadingPunchList, setIsLoadingPunchList] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Project Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Publish Portfolio Modal
  const [showPublishPortfolioModal, setShowPublishPortfolioModal] = useState(false);
  const [portfolioCategory, setPortfolioCategory] = useState("");
  const [portfolioCity, setPortfolioCity] = useState("");
  const [portfolioCountry, setPortfolioCountry] = useState("");
  const [isPublishingPortfolio, setIsPublishingPortfolio] = useState(false);

  useEffect(() => {
    fetchProject(id as string);
    fetchTemplates();
  }, [id]);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (project) {
      setProjectContext(project.uid, project.title);
      recordProjectAccess({ uid: project.uid, title: project.title, status: project.status });
    }
  }, [project?.uid, project?.title, project?.status]);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel('sh3d_updates');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'SH3D_MODEL_SAVED' && event.data.projectUid === id) {
          console.log("SH3D model saved, refreshing project data to show new asset...");
          fetchProject(id as string);
        }
      };
      return () => bc.close();
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }
  }, [id]);

  useEffect(() => {
    if (project && taskParam && !activeTask) {
      const taskToOpen = project.tasks.find(t => t.uid === taskParam);
      if (taskToOpen) {
        setActiveTask(taskToOpen);
        router.replace(`/dashboard/projects/${project.uid}`, { scroll: false });
      }
    }
  }, [project, taskParam, activeTask, router]);

  useEffect(() => {
    if (activeTab === "site_ops" && project) {
      fetchGlobalPunchList();
    }
  }, [activeTab, project?.uid]);

  const fetchGlobalPunchList = async () => {
    if (!project) return;
    setIsLoadingPunchList(true);
    try {
      const data = await projectsApi.getPunchListItems(project.uid);
      setGlobalPunchList(data);
    } catch (err) {
      console.error("Failed to fetch project issue tracker", err);
    } finally {
      setIsLoadingPunchList(false);
    }
  };

  const handleResolveGlobalItem = async (itemId: number) => {
    try {
      await projectsApi.resolvePunchListItem(itemId);
      fetchGlobalPunchList();
      if (project) fetchProject(project.uid);
    } catch (err) {
      alert("Failed to resolve issue tracker item.");
    }
  };

  useEffect(() => {
    if (showAssignModal && project && firmMembers.length === 0) {
      orgsApi.listMembers(project.account.id).then(setFirmMembers).catch(console.error);
    }
  }, [showAssignModal, project, firmMembers.length]);

  const handleDeleteProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || deleteConfirmText !== project.title) return;
    setIsDeleting(true);
    try {
      await projectsApi.deleteProject(project.uid);
      router.push("/dashboard/projects");
    } catch (err: any) {
      alert(err.message || "Failed to delete project.");
      setIsDeleting(false);
    }
  };

  const submitPublishPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setIsPublishingPortfolio(true);
    try {
      await projectsApi.publishPortfolio(project.uid, {
        category: portfolioCategory,
        city: portfolioCity,
        country: portfolioCountry
      });
      alert("Project published to portfolio successfully!");
      setShowPublishPortfolioModal(false);
      router.push("/dashboard/profile");
    } catch (err: any) {
      alert(err.message || "Failed to publish portfolio.");
    } finally {
      setIsPublishingPortfolio(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !project) return;
    setIsAssigning(true);
    try {
      await projectsApi.addProjectMember(project.id, parseInt(selectedUser), "editor");
      setShowAssignModal(false);
      setSelectedUser("");
      fetchProject(project.uid);
    } catch (err: any) {
      alert(err.message || "Failed to assign personnel. Ensure they belong to the parent firm.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) return <div className="py-32 flex justify-center"><Spinner size="lg" label="Retrieving architectural nodes..." /></div>;
  if (!project) return (
    <div className="text-center py-32 bg-surface-100 border-surface-200 border border-surface-200 rounded-2xl shadow-sm mt-8">
      <h2 className="text-xl font-bold text-primary mb-4 tracking-tight">Blueprint Not Found</h2>
      <button onClick={() => router.back()} className="px-6 py-2 border-2 border-surface-200 text-surface-500 text-surface-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:border-accent hover:text-accent transition-all">Go Back</button>
    </div>
  );

  const canManage = canManageProject(project);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <ProjectHeroHeader 
        project={project} 
        onStatusChange={(uid, status) => updateProjectStatus(uid, status)} 
      />

      {canManage && (
        <div className="max-w-[1400px] mx-auto">
          <TaskAccessRequestsList projectId={project.uid} />
        </div>
      )}

      <div className="flex gap-2 p-1.5 bg-surface-50/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl w-fit shadow-inner mb-8 relative">
        {[
          { id: "kanban", label: "Kanban Board" },
          { id: "gantt", label: "Gantt Timeline" },
          { id: "data_hub", label: "Master Data Hub" },
          { id: "matrix", label: "Construction Matrix" },
          { id: "site_ops", label: "Site Operations" }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                router.push(`?tab=${tab.id}`, { scroll: false });
              }}
              className={`relative px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors z-10 ${
                isActive ? "text-primary" : "text-surface-400 hover:text-primary hover:bg-white/5"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/5 rounded-xl shadow-[0_0_15px_rgba(var(--color-accent),0.2)] -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === "kanban" && <KanbanTab />}
        
        {activeTab === "gantt" && <GanttTab />}

        {activeTab === "data_hub" && <DataHubTab />}

        {activeTab === "matrix" && (
          <div className="w-full">
            <div className="flex gap-4 mb-6 bg-surface-50 p-2 rounded-xl border border-surface-200 w-fit">
              <button 
                onClick={() => setMatrixView('grid')} 
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${matrixView === 'grid' ? 'bg-surface-200 text-primary shadow-md border-b-2 border-accent' : 'text-surface-400 hover:bg-surface-200'}`}
              >
                Master Gate Matrix
              </button>
              <button 
                onClick={() => setMatrixView('feed')} 
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${matrixView === 'feed' ? 'bg-surface-200 text-primary shadow-md border-b-2 border-accent' : 'text-surface-400 hover:bg-surface-200'}`}
              >
                Expanded Milestone Feed
              </button>
            </div>
            {matrixView === 'grid' ? (
              <MilestoneMatrixView projectUid={project.uid} onTaskChange={() => fetchProject(project.uid)} projectTasks={project.tasks} criticalPathUids={[]} />
            ) : (
              <ExpandedFeedView projectUid={project.uid} />
            )}
          </div>
        )}

        {activeTab === "site_ops" && (
          <SiteOpsTab 
            projectUid={project.uid} 
            projectTasks={project.tasks}
            fetchProject={() => fetchProject(project.uid)}
            renderIssues={() => (
              <div className="bg-surface-100 border-surface-200 p-8 rounded-2xl border border-surface-200 shadow-sm animate-fade-in">
                <h3 className="text-xl font-extrabold text-primary mb-6 tracking-tight">Project Issue Tracker</h3>
                
                {isLoadingPunchList ? (
                  <div className="py-20 flex justify-center"><Spinner size="lg" label="Loading issue tracker..." /></div>
                ) : globalPunchList.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <span className="text-4xl opacity-20 mb-3">✅</span>
                    <p className="text-sm font-bold text-surface-400">No issue tracker items reported for this project.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {globalPunchList.map(item => (
                      <div key={item.id} className="p-5 bg-surface-50/40 backdrop-blur-md border border-white/10 rounded-[1.5rem] flex items-start gap-5 hover:bg-white/5 hover:border-white/20 transition-all shadow-sm group">
                        <div className="shrink-0 pt-1">
                          <span className={`w-4 h-4 rounded-full block shadow-inner ${item.is_resolved ? 'bg-emerald-500/20 border-2 border-emerald-500' : item.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse' : item.severity === 'MEDIUM' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-blue-400 border border-blue-300'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex gap-2 items-center mb-2">
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${item.is_resolved ? 'bg-surface-100 text-surface-400 border-surface-200' : item.severity === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20' : item.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                  {item.severity}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-black/10 text-surface-400 border border-white/5 backdrop-blur-sm">
                                  {item.issue_type} | {item.root_cause}
                                </span>
                                <span className="text-[9px] font-bold text-surface-500 uppercase tracking-widest ml-2">{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                              <h4 className="font-black text-primary text-lg tracking-tight group-hover:text-accent transition-colors">{item.title}</h4>
                              <p className="text-xs text-surface-400 font-medium mt-1.5 leading-relaxed max-w-3xl">{item.description}</p>
                              
                              {item.attachments && item.attachments.length > 0 && (
                                <div className="flex gap-3 mt-4">
                                  {item.attachments.map((att: any) => (
                                    <button 
                                      key={att.id} 
                                      onClick={() => setLightboxImageUrl(att.file)}
                                      className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 block hover:scale-105 hover:border-accent hover:shadow-[0_0_15px_rgba(var(--color-accent),0.3)] transition-all cursor-pointer focus:outline-none"
                                    >
                                      <img src={att.file} className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {!item.is_resolved && canManage && (
                              <button 
                                onClick={() => handleResolveGlobalItem(item.id)}
                                className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all shrink-0"
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                          
                          <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="text-[9px] font-black text-surface-500 uppercase tracking-[0.2em]">
                              Task: <span className="text-primary cursor-pointer hover:text-accent hover:underline bg-white/5 px-2 py-1 rounded-md" onClick={() => { setActiveTask(project?.tasks.find(t => t.uid === item.task_uid) || null) }}>{item.task_title || "Unknown Task"}</span>
                            </div>
                            {item.reported_by && (
                              <div className="text-[9px] font-black text-surface-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                Reported by 
                                <Link href={`/dashboard/team/${item.reported_by.id}`} className="flex items-center gap-2 hover:text-accent transition-colors">
                                  <img src={item.reported_by.avatar || `https://ui-avatars.com/api/?name=${item.reported_by.first_name}+${item.reported_by.last_name}&background=f3f4f6&color=1e293b`} className="w-5 h-5 rounded-full border border-white/10" /> 
                                  <span className="text-primary hover:underline">{item.reported_by.first_name} {item.reported_by.last_name}</span>
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          />
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-surface-50/40 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            <div className="p-8 border-b border-white/10 flex justify-between items-center relative z-10">
              <div>
                <h3 className="text-2xl font-black text-primary tracking-tight">Assign Internal Personnel</h3>
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-accent mt-1">From {project.account.name}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-surface-400 hover:text-red-500 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleAssign} className="p-8 space-y-8 relative z-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Select Specialist</label>
                <select 
                  required
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full h-14 bg-white/5 backdrop-blur-md border border-white/10 px-5 rounded-xl outline-none focus:border-accent focus:ring-1 focus:ring-accent font-black text-xs text-primary transition-colors appearance-none cursor-pointer hover:bg-white/10"
                >
                  <option value="" disabled className="bg-surface-900">Choose firm member...</option>
                  {firmMembers
                    .filter(m => !project.memberships.some(pm => pm.user.id === m.user.id))
                    .map((member, index) => (
                    <option key={member.id || `${member.user.id}-${index}`} value={member.user.id} className="bg-surface-900">{member.user.name} ({member.role})</option>
                  ))}
                </select>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-6 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-surface-400 hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={isAssigning || !selectedUser} className="px-8 h-12 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] bg-accent hover:bg-accent/90 text-background shadow-[0_0_15px_rgba(var(--color-accent),0.4)] disabled:opacity-50 transition-all hover:scale-105">
                  {isAssigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTask && (
        <TaskExecutionSidePanel 
          task={activeTask} 
          projectId={project.id}
          projectUid={project.uid}
          projectTasks={project.tasks}
          criticalPathUids={[]}
          taskTags={[]}
          projectAssets={project.assets || []}
          onClose={() => setActiveTask(null)} 
          onTaskUpdated={() => {
            fetchProject(project.uid);
          }}
        />
      )}
      
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-50/40 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-red-500/20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <div className="p-10 pb-6 relative z-10 text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner border border-red-500/20">🗑️</div>
              <h2 className="text-3xl font-black text-red-500 tracking-tighter">Delete Blueprint</h2>
              <p className="text-xs font-bold text-surface-400 mt-4 leading-relaxed">
                This action cannot be undone. This will permanently delete the project <strong className="text-red-400">"{project.title}"</strong>, including all tasks, uploaded files, floor plans, and assets.
              </p>
            </div>
            <form onSubmit={handleDeleteProject} className="p-10 pt-4 relative z-10">
              <div className="mb-8">
                <label className="block text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] mb-3 text-center">
                  Type <span className="text-primary bg-white/10 px-2 py-0.5 rounded ml-1">{project.title}</span> to confirm
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-5 text-sm font-black text-primary outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-center backdrop-blur-md"
                  placeholder="Type project title"
                  required
                />
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={isDeleting || deleteConfirmText !== project.title}
                  className="w-full h-14 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-[1.02]"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
                <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} className="w-full h-12 text-[10px] font-black text-surface-400 uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPublishPortfolioModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-50/40 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-white/20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-full h-full arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />

            <div className="p-8 pb-4 relative z-10">
              <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-[0_0_15px_rgba(var(--color-accent),0.2)] border border-accent/20">🚀</div>
              <h2 className="text-3xl font-black text-primary tracking-tighter">Publish Portfolio</h2>
              <p className="text-[10px] font-black text-surface-400 mt-3 uppercase tracking-widest leading-relaxed">
                Add filter details so clients can discover this project easily.
              </p>
            </div>
            <form onSubmit={submitPublishPortfolio} className="p-8 space-y-5 relative z-10">
              <div>
                <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Category</label>
                <input
                  type="text"
                  value={portfolioCategory}
                  onChange={e => setPortfolioCategory(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-5 text-sm font-black text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all backdrop-blur-md"
                  placeholder="e.g. Residential, Commercial"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">City</label>
                <input
                  type="text"
                  value={portfolioCity}
                  onChange={e => setPortfolioCity(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-5 text-sm font-black text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all backdrop-blur-md"
                  placeholder="e.g. New York"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Country</label>
                <input
                  type="text"
                  value={portfolioCountry}
                  onChange={e => setPortfolioCountry(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-5 text-sm font-black text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all backdrop-blur-md"
                  placeholder="e.g. USA"
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 mt-4">
                <button type="button" onClick={() => setShowPublishPortfolioModal(false)} className="px-6 h-12 text-[10px] font-black text-surface-400 uppercase tracking-widest hover:bg-white/10 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishingPortfolio}
                  className="px-8 h-12 bg-accent hover:bg-accent/90 text-background text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(var(--color-accent),0.4)] hover:scale-105"
                >
                  {isPublishingPortfolio ? "Publishing..." : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
