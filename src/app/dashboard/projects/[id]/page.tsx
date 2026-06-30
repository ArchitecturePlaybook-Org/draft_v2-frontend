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
import { AssignPersonnelModal } from "@/components/projects/AssignPersonnelModal";
import { CloneProjectModal } from "@/components/projects/CloneProjectModal";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { DeleteProjectModal } from "@/components/projects/DeleteProjectModal";
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
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [firmMembers, setFirmMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);


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
        onAssignPersonnel={() => setShowAssignModal(true)}
        onCloneProject={() => setShowCloneModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onDeleteProject={() => setShowDeleteModal(true)}
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
              <MilestoneMatrixView projectUid={project.uid} onTaskChange={() => fetchProject(project.uid)} projectTasks={project.tasks} />
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
      {/* Assign Personnel Modal */}
      {project && (
        <AssignPersonnelModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          project={project}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <ProjectSettingsModal 
          project={project}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteProjectModal 
          project={project}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {/* Clone Project Modal */}
      {project && (
        <CloneProjectModal
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          project={project}
        />
      )}
    </div>
  );
}
