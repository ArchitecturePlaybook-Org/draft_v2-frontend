"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { usePermissions } from "@/hooks/use-permissions";
import { TaskExecutionSidePanel } from "@/components/projects/TaskExecutionSidePanel";
import { Spinner } from "@/components/ui/Spinner";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { MilestoneMatrixView } from "@/components/matrix/MilestoneMatrixView";
import { ExpandedFeedView } from "@/components/matrix/ExpandedFeedView";
import { CreateMatrixTaskModal } from "@/components/matrix/CreateMatrixTaskModal";
import { SiteOpsTab } from "@/components/projects/SiteOpsTab";
import { ProjectHeroHeader } from "@/components/projects/ProjectHeroHeader";
import { ManageProjectAccessModal } from "../../components/projects/ManageProjectAccessModal";
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
import { Plus } from "lucide-react";


interface ProjectDetailViewProps {
  projectUid: string;
}

export function ProjectDetailView({ projectUid }: ProjectDetailViewProps) {
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

  const { canManageProject, isProjectCreator } = usePermissions();
  const isCreator = isProjectCreator(project);
  const { setProjectContext, recordProjectAccess } = useProjectNavStore();
  
  const [matrixView, setMatrixView] = useState<"grid" | "feed">("grid");
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [firmMembers, setFirmMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

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

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (projectUid) {
      projectsApi.getPendingTaskRequests(projectUid)
        .then(reqs => setPendingRequestsCount(reqs.length))
        .catch(() => {});
    }
  }, [projectUid]);

  useEffect(() => {
    fetchProject(projectUid);
    fetchTemplates();
  }, [projectUid]);

  useEffect(() => {
    if (tabParam) {
      if (tabParam !== activeTab) {
        setActiveTab(tabParam);
      }
    } else {
      setActiveTab("data_hub");
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
        if (event.data && event.data.type === 'SH3D_MODEL_SAVED' && event.data.projectUid === projectUid) {
          console.log("SH3D model saved, refreshing project data to show new asset...");
          fetchProject(projectUid);
        }
      };
      return () => bc.close();
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }
  }, [projectUid]);

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

  if (isLoading) return <SkeletonDashboard />;
  
  if (!project) return (
    <div className="text-center py-32 bg-surface-100 border border-surface-200 rounded-2xl shadow-sm mt-8">
      <h2 className="text-xl font-bold text-primary mb-4 tracking-tight">Blueprint Not Found</h2>
      <button onClick={() => router.back()} className="px-6 py-2 border-2 border-surface-200 text-surface-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:border-accent hover:text-accent transition-all">Go Back</button>
    </div>
  );

  const canManage = canManageProject(project);

  return (
    <div className="space-y-8 animate-fade-in pb-12 min-w-0 max-w-full overflow-x-clip">
      <ProjectHeroHeader 
        project={project} 
        onStatusChange={(uid, status) => updateProjectStatus(uid, status)} 
        onAssignPersonnel={() => setShowAssignModal(true)}
        onCloneProject={() => setShowCloneModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onDeleteProject={() => setShowDeleteModal(true)}
      />




      <div className="mt-6 min-w-0 max-w-full">
        {/* {activeTab === "kanban" && <KanbanTab />} */}
        
        {activeTab === "gantt" && <GanttTab />}

        {activeTab === "data_hub" && <DataHubTab />}

        {activeTab === "access_requests" && <TaskAccessRequestsList projectUid={project.uid} />}

        {activeTab === "matrix" && (
          <div className="w-full min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex overflow-x-auto no-scrollbar gap-1.5 bg-surface-50 p-1 rounded-xl border border-surface-200 flex-1 shrink-0">
                <button 
                  onClick={() => setMatrixView('grid')} 
                  className={`px-3 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap shrink-0 ${matrixView === 'grid' ? 'bg-surface-200 text-primary shadow-sm border-b-2 border-accent' : 'text-surface-400 hover:bg-surface-200'}`}
                >
                  Master Gate Matrix
                </button>
                <button 
                  onClick={() => setMatrixView('feed')} 
                  className={`px-3 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap shrink-0 ${matrixView === 'feed' ? 'bg-surface-200 text-primary shadow-sm border-b-2 border-accent' : 'text-surface-400 hover:bg-surface-200'}`}
                >
                  Expanded Milestone Feed
                </button>
              </div>
              {matrixView === 'grid' && canManageProject(project) && (
                <button
                  id="create-matrix-task-btn"
                  onClick={() => setShowCreateTaskModal(true)}
                  className="h-8 px-4 bg-accent text-background font-black text-[10px] uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md shadow-accent/20 flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Task
                </button>
              )}
            </div>
            {matrixView === 'grid' ? (
              <MilestoneMatrixView projectUid={project.uid} onTaskChange={() => fetchProject(project.uid)} projectTasks={project.tasks} />
            ) : (
              <ExpandedFeedView projectUid={project.uid} />
            )}
            <CreateMatrixTaskModal
              isOpen={showCreateTaskModal}
              onClose={() => setShowCreateTaskModal(false)}
              projectUid={project.uid}
              onTaskCreated={() => fetchProject(project.uid)}
            />
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

      {showAssignModal && isCreator && (
        <ManageProjectAccessModal
          project={project}
          onClose={() => setShowAssignModal(false)}
          onAccessUpdated={() => fetchProject(project.uid)}
        />
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
