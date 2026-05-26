"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProjectDetail, Task, ProjectAsset, TaskTemplate, SpatialZone, MilestonePhase } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { usePermissions } from "@/hooks/use-permissions";
import { TaskItem } from "@/components/projects/TaskItem";
import { TaskExecutionModal } from "@/components/projects/TaskExecutionModal";
import { Spinner } from "@/components/ui/Spinner";
import { SketchBoard } from "@/components/sketch/SketchBoard";
import { RevisionHistoryModal } from "@/components/projects/RevisionHistoryModal";
import { FloorPlanGridViewer } from "@/components/projects/FloorPlanGridViewer";
import { MilestoneMatrixView } from "@/components/matrix/MilestoneMatrixView";
import { ExpandedFeedView } from "@/components/matrix/ExpandedFeedView";
import ModelViewer from "@/components/ModelViewer";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import ProjectShareManager from "@/components/projects/ProjectShareManager";

type TabView = "data_hub" | "kanban" | "gantt" | "matrix" | "issues" | "share";
type HubCategory = "sketch" | "2d_plan" | "3d_model" | "document";

const GanttTaskBar = ({ task, totalDays, minDate, onTaskUpdate, onClick }: { task: Task, totalDays: number, minDate: Date, onTaskUpdate: (uid: string, start: string, end: string) => void, onClick: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const hasDates = task.start_date && task.end_date;
  const startMs = hasDates ? new Date(task.start_date!).getTime() : 0;
  const endMs = hasDates ? new Date(task.end_date!).getTime() : 0;
  
  const [draftStart, setDraftStart] = useState(startMs);
  const [draftEnd, setDraftEnd] = useState(endMs);
  const [mode, setMode] = useState<"idle" | "move" | "resize">("idle");
  const dragStartX = useRef(0);
  const initialStart = useRef(0);
  const initialEnd = useRef(0);

  useEffect(() => {
    if (mode === "idle" && hasDates) {
      setDraftStart(new Date(task.start_date!).getTime());
      setDraftEnd(new Date(task.end_date!).getTime());
    }
  }, [task.start_date, task.end_date, mode, hasDates]);

  if (!hasDates) {
    return (
      <button 
        onClick={onClick}
        className="mx-auto text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-4 py-2 rounded-full border border-accent/10 hover:bg-accent hover:text-white transition-all"
      >
        Initialize Timeline Protocol
      </button>
    );
  }

  const msPerPixel = containerRef.current 
    ? (totalDays * 24 * 60 * 60 * 1000) / containerRef.current.offsetWidth 
    : 0;

  const handlePointerDown = (e: React.PointerEvent, dragMode: "move" | "resize") => {
    e.stopPropagation();
    setMode(dragMode);
    dragStartX.current = e.clientX;
    initialStart.current = draftStart;
    initialEnd.current = draftEnd;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode === "idle" || !msPerPixel) return;
    const deltaMs = (e.clientX - dragStartX.current) * msPerPixel;
    
    const deltaDays = Math.round(deltaMs / (24 * 60 * 60 * 1000));
    const snappedDeltaMs = deltaDays * 24 * 60 * 60 * 1000;

    if (mode === "move") {
      setDraftStart(initialStart.current + snappedDeltaMs);
      setDraftEnd(initialEnd.current + snappedDeltaMs);
    } else if (mode === "resize") {
      const newEnd = initialEnd.current + snappedDeltaMs;
      if (newEnd >= draftStart) {
        setDraftEnd(newEnd);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (mode === "idle") return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (draftStart !== startMs || draftEnd !== endMs) {
      const format = (ms: number) => new Date(ms).toISOString().split('T')[0];
      onTaskUpdate(task.uid, format(draftStart), format(draftEnd));
    }
    setMode("idle");
  };

  const taskDays = Math.max(1, Math.ceil((draftEnd - draftStart) / (1000 * 60 * 60 * 24)));
  const offsetDays = Math.ceil((draftStart - minDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const width = `${(taskDays / totalDays) * 100}%`;
  const left = `${(offsetDays / totalDays) * 100}%`;

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative h-12 bg-surface-50/50 rounded-2xl border border-dashed border-surface-100 flex items-center px-2"
    >
      <div 
        onPointerDown={(e) => handlePointerDown(e, "move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute h-8 rounded-xl shadow-lg transition-colors cursor-grab active:cursor-grabbing flex items-center px-4 group/bar hover:scale-[1.02] ${
          task.status === "DONE" ? "bg-emerald-500 shadow-emerald-200" : task.status === "WIP" ? "bg-accent shadow-accent/20" : "bg-primary shadow-primary/20"
        }`}
        style={{ width, left, touchAction: "none" }}
      >
        <div onClick={(e) => { e.stopPropagation(); onClick(); }} className="flex-1 truncate">
          <span className="text-[10px] text-white font-extrabold uppercase tracking-widest">{task.status}</span>
        </div>
        
        <div 
          onPointerDown={(e) => handlePointerDown(e, "resize")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-black/10 rounded-r-xl flex items-center justify-center"
        >
          <div className="w-1 h-3 border-l-2 border-r-2 border-white/50" />
        </div>
      </div>
    </div>
  );
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskParam = searchParams.get("task");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { canManageProject, canEditProject } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabView>("kanban");
  const [activeHubCategory, setActiveHubCategory] = useState<HubCategory>("sketch");
  const [matrixView, setMatrixView] = useState<"grid" | "feed">("grid");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [firmMembers, setFirmMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [renamingAssetId, setRenamingAssetId] = useState<number | null>(null);
  const [newAssetTitle, setNewAssetTitle] = useState("");
  // Blueprint Stack state
  const [historyAsset, setHistoryAsset] = useState<ProjectAsset | null>(null);
  const [linkingAssetId, setLinkingAssetId] = useState<number | null>(null);
  const linkDropdownRef = useRef<HTMLDivElement>(null);
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [projectIntId, setProjectIntId] = useState<number | null>(null);
  const [surveyAsset, setSurveyAsset] = useState<ProjectAsset | null>(null);
  const [viewerAsset, setViewerAsset] = useState<ProjectAsset | null>(null);
  const [manageLinksAsset, setManageLinksAsset] = useState<ProjectAsset | null>(null);

  const [zones, setZones] = useState<SpatialZone[]>([]);
  const [phases, setPhases] = useState<MilestonePhase[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");

  const [globalPunchList, setGlobalPunchList] = useState<any[]>([]);
  const [isLoadingPunchList, setIsLoadingPunchList] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Project Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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


  const fetchProject = async () => {
    try {
      const data = await projectsApi.getProjectDetails(id as string);
      setProject(data);
      setProjectIntId(data.id); // cache the integer PK for uploads
      
      try {
        const matrixData = await projectsApi.getMatrix(data.uid);
        setZones(matrixData.zones);
        setPhases(matrixData.phases);
      } catch (err) {
        console.error("Failed to fetch matrix data:", err);
      }
    } catch (err) {

      console.error("Failed to fetch project:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAsset = (asset: any) => {
    if (asset.category === "sketch") {
      const isEditable = asset.file.endsWith(".excalidraw") || asset.file.endsWith(".json");
      
      if (isEditable) {
        // Open the dedicated sketching route in a new tab
        window.open(`/dashboard/projects/${id}/sketch?assetUrl=${encodeURIComponent(asset.file)}`, "_blank");
      } else {
        // Legacy PNG sketch
        window.open(asset.file, "_blank");
      }
    } else if (asset.category === "2d_plan") {
      // Launch the interactive Site Survey Grid
      setSurveyAsset(asset);
    } else if (asset.category === "3d_model") {
      setViewerAsset(asset);
    } else {
      // For general documents
      const isImage = /\.(png|jpg|jpeg|gif)$/i.test(asset.file);
      if (isImage) {
        setLightboxImageUrl(asset.file);
      } else {
        window.open(asset.file, "_blank");
      }
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await projectsApi.getTaskTemplates();
      setTaskTemplates(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchTemplates();
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
    if (activeTab === "issues" && project) {
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
      fetchProject();
    } catch (err) {
      alert("Failed to resolve issue tracker item.");
    }
  };

  useEffect(() => {
    if (showAssignModal && project && firmMembers.length === 0) {
      orgsApi.listMembers(project.account.id).then(setFirmMembers).catch(console.error);
    }
  }, [showAssignModal, project, firmMembers.length]);

  if (isLoading) return <div className="py-32 flex justify-center"><Spinner size="lg" label="Retrieving architectural nodes..." /></div>;
  if (!project) return (
    <div className="text-center py-32 bg-white border border-surface-200 rounded-2xl shadow-sm mt-8">
      <h2 className="text-xl font-bold text-primary mb-4 tracking-tight">Blueprint Not Found</h2>
      <button onClick={() => router.back()} className="px-6 py-2 border-2 border-surface-200 text-surface-500 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:border-accent hover:text-accent transition-all">Go Back</button>
    </div>
  );

  const canManage = canManageProject(project);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsAssigning(true);
    try {
      await projectsApi.addProjectMember(project.id, parseInt(selectedUser), "editor");
      setShowAssignModal(false);
      setSelectedUser("");
      fetchProject();
    } catch (err: any) {
      alert(err.message || "Failed to assign personnel. Ensure they belong to the parent firm.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = selectedTemplate ? taskTemplates.find(t => t.id.toString() === selectedTemplate)?.name : newTaskTitle;
    if (!title) return;
    
    setIsCreatingTask(true);
    try {
      await projectsApi.createTask({ 
        project: project.id, 
        title,
        zone_id: selectedZoneId ? parseInt(selectedZoneId) : undefined,
        phase_id: selectedPhaseId ? parseInt(selectedPhaseId) : undefined
      });
      setNewTaskTitle("");
      setSelectedTemplate("");
      setSelectedZoneId("");
      setSelectedPhaseId("");
      fetchProject();
    } catch(err: any) {
      alert(err.message || "Failed to queue execution phase");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.uid === taskId ? { ...t, status: newStatus as any } : t)
      };
    });

    try {
      await projectsApi.updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error(err);
      fetchProject();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm("Are you sure you want to decommission this architectural asset?")) return;
    try {
      // Optimistic UI update
      if (project) {
        setProject({
          ...project,
          assets: project.assets.filter(a => a.id !== assetId)
        });
      }
      await projectsApi.deleteProjectAsset(assetId);
      // We still fetch to ensure synchronization with any backend side-effects
      fetchProject();
    } catch (err) {
      alert("Failed to delete asset.");
      fetchProject(); // Rollback/Sync
    }
  };

  const handleRenameAsset = async (assetId: number) => {
    if (!newAssetTitle) return;
    try {
      await projectsApi.updateProjectAsset(assetId, { title: newAssetTitle });
      setRenamingAssetId(null);
      setNewAssetTitle("");
      fetchProject();
    } catch (err) {
      alert("Failed to rename asset.");
    }
  };

  // Professional Gantt Calculation
  const renderGantt = () => {
    if (!project.tasks || project.tasks.length === 0) return <div className="p-8 text-center text-surface-400">No tasks to display in Gantt chart.</div>;
    
    // 1. Determine Project Range
    const tasksWithDates = project.tasks.filter(t => t.start_date && t.end_date);
    let minDate: Date;
    let maxDate: Date;

    if (tasksWithDates.length > 0) {
      minDate = new Date(Math.min(...tasksWithDates.map(t => new Date(t.start_date!).getTime())));
      maxDate = new Date(Math.max(...tasksWithDates.map(t => new Date(t.end_date!).getTime())));
      // Add padding
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 7);
    } else {
      minDate = new Date();
      maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
    }

    const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const handleTaskUpdate = async (taskId: string, start: string, end: string) => {
      // Optimistic update
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.uid === taskId ? { ...t, start_date: start, end_date: end } : t)
        };
      });

      try {
        await projectsApi.updateTask(taskId, { start_date: start, end_date: end });
      } catch (err) {
        console.error(err);
        fetchProject(); // revert on error
      }
    };

    // Group tasks by Phase
    const phasesMap = new Map<string, Task[]>();
    project.tasks.forEach(task => {
      const phaseName = task.phase_name || "Unphased";
      if (!phasesMap.has(phaseName)) phasesMap.set(phaseName, []);
      phasesMap.get(phaseName)!.push(task);
    });
    const groupedPhases = Array.from(phasesMap.entries());

    return (
      <div className="w-full overflow-x-auto bg-white p-10 rounded-[2.5rem] border border-surface-200 shadow-2xl shadow-primary/5 animate-in fade-in duration-700">
        <div className="min-w-[1200px]">
          {/* Timeline Header */}
          <div className="flex border-b border-surface-100 pb-6 mb-8">
            <div className="w-1/4 pr-10">
              <h3 className="text-xl font-bold text-primary tracking-tight">Project Phases</h3>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em] mt-1">Timeline Orchestration</p>
            </div>
            <div className="flex-1 relative h-10">
              <div className="absolute inset-0 flex justify-between px-2">
                {[0, 0.25, 0.5, 0.75, 1].map(p => {
                  const d = new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * p);
                  return (
                    <div key={p} className="flex flex-col items-center">
                      <span className="text-[9px] font-extrabold text-surface-400 uppercase tracking-widest">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <div className="w-px h-2 bg-surface-200 mt-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Task Rows Grouped by Phase */}
          <div className="space-y-10">
            {groupedPhases.map(([phaseName, phaseTasks]) => (
              <div key={phaseName} className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-surface-500 border-b border-surface-100 pb-2">{phaseName}</h4>
                <div className="space-y-6">
                  {phaseTasks.map((task) => (
                    <div key={task.uid} className="flex items-center group">
                      <div className="w-1/4 pr-10 py-2">
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">{task.title}</h4>
                          {task.zone_name && <span className="text-[10px] font-bold text-surface-400 uppercase truncate">({task.zone_name})</span>}
                        </div>
                        <p className="text-[9px] font-bold text-surface-400 uppercase tracking-tighter mt-0.5">
                          {task.start_date && task.end_date ? `${task.start_date} → ${task.end_date}` : "Timeline Not Defined"}
                        </p>
                      </div>
                      <GanttTaskBar 
                        task={task} 
                        totalDays={totalDays} 
                        minDate={minDate} 
                        onTaskUpdate={handleTaskUpdate} 
                        onClick={() => setActiveTask(task)} 
                      />
                      <div className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setActiveTask(task)}
                          className="w-10 h-10 rounded-xl bg-surface-100 text-surface-500 hover:bg-primary hover:text-white transition-all flex items-center justify-center text-xs"
                        >
                          ⚙️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="bg-white p-12 border border-surface-200 rounded-2xl shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="absolute top-0 right-0 w-64 h-full arch-grid opacity-[0.03] pointer-events-none" />
        
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-5">
            <span className="px-3 py-1 bg-surface-100 text-surface-600 text-[9px] font-bold uppercase tracking-widest rounded-md border border-surface-200">
              🏢 {project.account.name}
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-primary mb-4 leading-tight tracking-tight">{project.title}</h1>
        </div>

        <div className="relative z-10 flex gap-4 shrink-0">
          <button 
            onClick={() => window.open(`/dashboard/projects/${id}/report/project-summary`, "_blank")}
            className="h-10 px-6 bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            📄 Generate Report
          </button>
          <button 
            onClick={() => router.push(`/dashboard/projects/${id}/procurement`)}
            className="h-10 px-6 bg-surface-100 text-primary font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-surface-200 transition-all border border-surface-200 flex items-center gap-2"
          >
            🛒 Procurement Ledger
          </button>
          {canManage && (
            <>
              <button onClick={() => setShowAssignModal(true)} className="h-10 px-6 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-md">
                + Assign Personnel
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="h-10 px-4 bg-white text-red-500 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-50 hover:text-red-600 transition-all shadow-sm border border-red-200 flex items-center gap-2">
                <span className="text-sm">🗑️</span> Delete Blueprint
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 pb-px">
        {[
          { id: "data_hub", label: "Master Data Hub" },
          { id: "matrix", label: "Construction Matrix" },
          { id: "kanban", label: "Advanced Kanban" },
          { id: "gantt", label: "Gantt Timeline" },
          { id: "issues", label: "Project Issue Tracker" },
          { id: "share", label: "Share Dashboard" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabView)}
            className={`px-6 py-3 font-bold text-sm tracking-wide transition-colors border-b-2 ${
              activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-surface-400 hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        
        {/* DATA HUB VIEW */}
        {activeTab === "data_hub" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 space-y-2">
              {[
                { id: "sketch", label: "Creative Sketches", icon: "✏️" },
                { id: "2d_plan", label: "2D Floor Plans", icon: "📐" },
                { id: "3d_model", label: "3D Construction Models", icon: "🏛️" },
                { id: "document", label: "Documents", icon: "📄" },
              ].map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveHubCategory(cat.id as HubCategory)}
                  className={`w-full text-left px-5 py-4 rounded-2xl font-extrabold text-[10px] uppercase tracking-widest transition-all ${
                    activeHubCategory === cat.id 
                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02] border-primary" 
                    : "bg-white text-surface-500 hover:bg-surface-50 border border-surface-200"
                  }`}
                >
                  <span className="mr-3 text-base">{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
            <div className="col-span-1 md:col-span-3">
              <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-sm min-h-[400px]">
                <div className="flex justify-between items-center mb-6 border-b border-surface-100 pb-4">
                  <h3 className="text-xl font-extrabold text-primary tracking-tight">
                    {activeHubCategory.replace('_', ' ').toUpperCase()}
                  </h3>
                  <div className="flex gap-3">
                    {activeHubCategory === "sketch" && (
                      <button 
                        onClick={() => window.open(`/dashboard/projects/${id}/sketch`, "_blank")}
                        className="px-6 py-2 bg-accent text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-primary transition-all shadow-lg shadow-accent/20"
                      >
                        New Design Sketch
                      </button>
                    )}
                    {/* Hidden file input for 2D/3D/Document uploads */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={activeHubCategory === "3d_model" ? ".obj,.glb" : "image/png,image/jpeg,image/jpg,image/gif,.pdf"}
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length || !projectIntId) return;
                        setIsUploading(true);
                        setUploadProgress(`0 / ${files.length}`);
                        let successCount = 0;
                        try {
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            const title = file.name.replace(/\.[^/.]+$/, ""); // strip extension
                            await projectsApi.uploadProjectAsset(projectIntId, activeHubCategory, file, title);
                            successCount++;
                            setUploadProgress(`${successCount} / ${files.length}`);
                          }
                          fetchProject();
                        } catch (err: any) {
                          alert(`Upload failed on file ${successCount + 1}: ${err.message}`);
                        } finally {
                          setIsUploading(false);
                          setUploadProgress("");
                          e.target.value = ""; // reset so same files can be re-selected
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-4 py-2 bg-surface-100 text-primary font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? `Uploading ${uploadProgress}...` : "Upload File"}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.assets?.filter(a => a.category === activeHubCategory).length ? (
                    project.assets.filter(a => a.category === activeHubCategory).map(asset => (
                      <div 
                        key={asset.id} 
                        className="p-4 border border-surface-200 rounded-xl hover:border-accent hover:shadow-md transition-all bg-white group relative"
                      >
                        {/* Version Badge — only for non-sketch assets */}
                        {asset.category !== "sketch" && (
                          <div className="absolute top-3 left-3 z-10">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              asset.is_latest 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-surface-100 text-surface-400"
                            }`}>
                              V{asset.version_number}
                            </span>
                          </div>
                        )}

                        <div 
                          onClick={() => handleOpenAsset(asset)}
                          className="h-32 bg-surface-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-surface-100 cursor-pointer"
                        >
                          {asset.thumbnail ? (
                            <img src={asset.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : asset.file.match(/\.(png|jpg|jpeg|gif)$/i) ? (
                            <img src={asset.file} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                          ) : asset.category === "sketch" ? (
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-4xl">✏️</span>
                              <span className="text-[8px] font-bold text-accent uppercase tracking-widest">Editable Design</span>
                            </div>
                          ) : (
                            <span className="text-4xl opacity-20">{activeHubCategory === '3d_model' ? '🏛️' : activeHubCategory === '2d_plan' ? '📐' : '📄'}</span>
                          )}
                        </div>
                        
                        {renamingAssetId === asset.id ? (
                          <div className="flex gap-2 items-center">
                            <input 
                              type="text" 
                              value={newAssetTitle}
                              onChange={(e) => setNewAssetTitle(e.target.value)}
                              autoFocus
                              className="flex-1 bg-surface-50 border border-surface-200 rounded px-2 py-1 text-sm font-bold outline-none focus:border-accent"
                            />
                            <button onClick={() => handleRenameAsset(asset.id)} className="text-emerald-500 text-xs font-bold">Save</button>
                            <button onClick={() => setRenamingAssetId(null)} className="text-surface-400 text-xs font-bold">✕</button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0" onClick={() => handleOpenAsset(asset)}>
                                <p className="font-bold text-sm truncate text-primary cursor-pointer hover:text-accent transition-colors">{asset.title}</p>
                                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest mt-0.5">{(asset.size / 1024).toFixed(1)} KB</p>
                              </div>
                              
                              <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Revision History — only for non-sketch assets */}
                                {asset.category !== "sketch" && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setHistoryAsset(asset); }}
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-100 text-xs"
                                    title="Revision History"
                                  >
                                    🕐
                                  </button>
                                )}
                                {/* Rename */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setRenamingAssetId(asset.id); setNewAssetTitle(asset.title); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-100 text-xs grayscale hover:grayscale-0"
                                  title="Rename"
                                >
                                  📝
                                </button>
                                {/* Delete */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-xs grayscale hover:grayscale-0"
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {/* Task Link Button */}
                            {(activeHubCategory === "2d_plan" || activeHubCategory === "3d_model") && (
                              <div className="mt-2.5 pt-2.5 border-t border-surface-100">
                                {(() => {
                                  const linkedTasksCount = project.tasks.filter(t => t.asset_links?.some(l => String(l.canonical_uid) === String(asset.canonical_uid))).length;
                                  return (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setManageLinksAsset(asset); }}
                                      className="w-full text-xs font-bold bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 outline-none hover:border-accent text-primary transition-colors flex justify-between items-center cursor-pointer"
                                    >
                                      <span className="text-[9px] uppercase tracking-widest text-surface-500">Linked Tasks</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] ${linkedTasksCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-500'}`}>
                                        {linkedTasksCount}
                                      </span>
                                    </button>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center flex flex-col items-center">
                      <span className="text-4xl opacity-20 mb-3">📁</span>
                      <p className="text-sm font-bold text-surface-400">No assets uploaded to this hub yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KANBAN VIEW */}
        {activeTab === "kanban" && (
          <div className="space-y-6">
            {canEditProject(project) && (
              <form onSubmit={handleCreateTask} className="bg-white p-3 pr-4 rounded-2xl border border-surface-200 flex flex-wrap md:flex-nowrap gap-4 items-center shadow-sm">
                <span className="text-lg pl-4 opacity-30 hidden md:block">📋</span>
                
                <select 
                  value={selectedTemplate} 
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none text-sm font-bold text-primary flex-1 min-w-[200px]"
                >
                  <option value="">-- Custom Phase --</option>
                  {taskTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {!selectedTemplate && (
                  <input 
                    type="text" 
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Custom phase title..."
                    className="flex-2 h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none font-medium text-sm text-primary min-w-[200px]"
                  />
                )}

                <select 
                  required
                  value={selectedZoneId} 
                  onChange={e => setSelectedZoneId(e.target.value)}
                  className="h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none text-sm font-bold text-primary w-[140px]"
                >
                  <option value="" disabled>Zone...</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>

                <select 
                  required
                  value={selectedPhaseId} 
                  onChange={e => setSelectedPhaseId(e.target.value)}
                  className="h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none text-sm font-bold text-primary w-[140px]"
                >
                  <option value="" disabled>Phase...</option>
                  {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                
                <button 
                  type="submit"
                  disabled={isCreatingTask || (!selectedTemplate && !newTaskTitle) || !selectedZoneId || !selectedPhaseId}
                  className="h-12 px-8 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-50 ml-auto"
                >
                  {isCreatingTask ? "Adding..." : "+ Add Task"}
                </button>
              </form>
            )}

            <div className="flex overflow-x-auto gap-6 pb-4">
              {[
                { id: "TODO", label: "To Do", color: "bg-surface-50 border-surface-200", dot: "bg-surface-400" },
                { id: "WIP", label: "In Progress", color: "bg-blue-50 border-blue-200", dot: "bg-accent" },
                { id: "QA", label: "Under Inspection", color: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
                { id: "DONE", label: "Done", color: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
              ].map(col => (
                <div 
                  key={col.id} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex flex-col min-w-[300px] flex-1 p-4 rounded-2xl border min-h-[500px] ${col.color}`}
                >
                  <h4 className="flex items-center font-extrabold text-[11px] uppercase tracking-widest text-surface-600 mb-4 px-2">
                    <span className={`w-2 h-2 rounded-full mr-2 ${col.dot}`} />
                    {col.label} 
                    <span className="ml-auto bg-white border border-surface-200 text-surface-600 px-2 py-0.5 rounded-full shadow-sm">
                      {project.tasks.filter(t => t.status === col.id).length}
                    </span>
                  </h4>
                  <div className="space-y-3 min-h-full pb-8">
                    {project.tasks.filter(t => t.status === col.id).map(task => (
                      <TaskItem 
                        key={task.uid} 
                        task={task} 
                        onClick={() => setActiveTask(task)} 
                        onDragStart={(e) => handleDragStart(e, task.uid)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MATRIX VIEW */}
        {activeTab === "matrix" && (
          <div className="w-full">
            <div className="flex gap-4 mb-6 bg-surface-50 p-2 rounded-xl border border-surface-200 w-fit">
              <button 
                onClick={() => setMatrixView('grid')} 
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${matrixView === 'grid' ? 'bg-primary text-white shadow-md' : 'text-surface-500 hover:bg-surface-200'}`}
              >
                Master Gate Matrix
              </button>
              <button 
                onClick={() => setMatrixView('feed')} 
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${matrixView === 'feed' ? 'bg-primary text-white shadow-md' : 'text-surface-500 hover:bg-surface-200'}`}
              >
                Expanded Milestone Feed
              </button>
            </div>
            {matrixView === 'grid' ? (
              <MilestoneMatrixView projectUid={project.uid} onTaskChange={fetchProject} />
            ) : (
              <ExpandedFeedView projectUid={project.uid} />
            )}
          </div>
        )}

        {/* GANTT VIEW */}
        {activeTab === "gantt" && renderGantt()}

        {/* ISSUES VIEW */}
        {activeTab === "issues" && (
          <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-sm animate-fade-in">
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
                  <div key={item.id} className="p-4 border border-surface-200 rounded-xl flex items-start gap-4 hover:border-surface-300 transition-colors bg-surface-50/30">
                    <div className="shrink-0 pt-1">
                      <span className={`w-3 h-3 rounded-full block ${item.is_resolved ? 'bg-emerald-500' : item.severity === 'HIGH' ? 'bg-red-500 animate-pulse' : item.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex gap-2 items-center mb-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${item.is_resolved ? 'bg-surface-100 text-surface-500' : item.severity === 'HIGH' ? 'bg-red-100 text-red-600' : item.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {item.severity}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 border border-surface-200">
                              {item.issue_type} | {item.root_cause}
                            </span>
                            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-primary text-sm">{item.title}</h4>
                          <p className="text-xs text-surface-500 mt-1">{item.description}</p>
                          
                          {/* Attachments rendering */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {item.attachments.map((att: any) => (
                                <button 
                                  key={att.id} 
                                  onClick={() => setLightboxImageUrl(att.file)}
                                  className="w-16 h-16 rounded-lg overflow-hidden border border-surface-200 block hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
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
                            className="px-4 py-1.5 bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between">
                        <div className="text-[10px] font-bold text-surface-400 uppercase">
                          Task: <span className="text-primary cursor-pointer hover:text-accent hover:underline" onClick={() => { setActiveTask(project?.tasks.find(t => t.uid === item.task_uid) || null) }}>{item.task_title || "Unknown Task"}</span>
                        </div>
                        {item.reported_by && (
                          <div className="text-[10px] font-bold text-surface-400 flex items-center gap-1.5">
                            Reported by <img src={item.reported_by.avatar || `https://ui-avatars.com/api/?name=${item.reported_by.first_name}+${item.reported_by.last_name}&background=f3f4f6&color=1e293b`} className="w-4 h-4 rounded-full" /> {item.reported_by.first_name} {item.reported_by.last_name}
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

        {/* SHARE DASHBOARD VIEW */}
        {activeTab === "share" && (
          <div className="animate-fade-in">
            <ProjectShareManager projectId={project.uid} />
          </div>
        )}

      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-surface-200">
            <div className="p-8 border-b border-surface-100 bg-surface-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-primary tracking-tight">Assign Internal Personnel</h3>
                <p className="text-[10px] uppercase tracking-widest font-bold text-surface-400 mt-1">From {project.account.name}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-surface-400 hover:text-red-500 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleAssign} className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Select Specialist</label>
                <select 
                  required
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors appearance-none"
                >
                  <option value="" disabled>Choose firm member...</option>
                  {firmMembers
                    .filter(m => !project.memberships.some(pm => pm.user.id === m.user.id))
                    .map(member => (
                    <option key={member.user.id} value={member.user.id}>{member.user.name} ({member.role})</option>
                  ))}
                </select>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-surface-100">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-6 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest text-surface-500 hover:bg-surface-100">Cancel</button>
                <button type="submit" disabled={isAssigning || !selectedUser} className="px-6 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-primary text-white hover:bg-accent disabled:opacity-50">
                  {isAssigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Execution Modal */}
      {activeTask && (
        <TaskExecutionModal 
          task={activeTask} 
          projectUid={project.uid}
          projectAssets={project.assets || []}
          onClose={() => setActiveTask(null)} 
          onTaskUpdated={() => {
            fetchProject();
          }}
        />
      )}
      {/* Blueprint Stack — Revision History Modal */}
      {historyAsset && (
        <RevisionHistoryModal
          asset={historyAsset}
          onClose={() => setHistoryAsset(null)}
          onRevisionUploaded={() => { fetchProject(); setHistoryAsset(null); }}
          onVersionPromoted={() => { fetchProject(); setHistoryAsset(null); }}
        />
      )}
      {/* Site Survey Grid Viewer */}
      {surveyAsset && (
        <FloorPlanGridViewer
          asset={surveyAsset}
          onClose={() => setSurveyAsset(null)}
          onRefresh={fetchProject}
        />
      )}
      {/* 3D Model Viewer Modal */}
      {viewerAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-6xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setViewerAsset(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/50 hover:bg-white rounded-full flex items-center justify-center text-lg shadow-sm transition-colors text-surface-900 font-bold"
            >
              ✕
            </button>
            <div className="flex-1 w-full h-full bg-slate-100">
              <ModelViewer 
                url={viewerAsset.file} 
                format={viewerAsset.file.toLowerCase().endsWith('.obj') ? 'obj' : 'glb'} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImageUrl && (
        <ImageLightbox 
          imageUrl={lightboxImageUrl} 
          onClose={() => setLightboxImageUrl(null)} 
        />
      )}

      {/* Manage Links Modal */}
      {manageLinksAsset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-surface-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-surface-100 bg-surface-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-primary tracking-tight">Manage Task Links</h3>
                <p className="text-[10px] uppercase tracking-widest font-bold text-surface-400 mt-1 truncate max-w-[250px]">{manageLinksAsset.title}</p>
              </div>
              <button onClick={() => setManageLinksAsset(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-200/50 text-surface-500 hover:bg-surface-200 hover:text-red-500 transition-colors text-lg">✕</button>
            </div>
            
            <div className="p-2 overflow-y-auto flex-1">
              {project.tasks.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center">
                   <span className="text-4xl mb-3 opacity-20">📋</span>
                   <div className="text-surface-400 text-sm font-bold">No tasks in this project yet.</div>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {project.tasks.map(task => {
                    const link = task.asset_links?.find(l => String(l.canonical_uid) === String(manageLinksAsset.canonical_uid));
                    const isLinked = !!link;

                    const is3DModel = manageLinksAsset.category === '3d_model';
                    const taskHas3DModelAlready = task.asset_links?.some(l => l.latest_asset?.category === '3d_model');
                    const disabled = !isLinked && is3DModel && taskHas3DModelAlready;
                    
                    return (
                      <label 
                        key={task.uid} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'} ${isLinked ? 'border-accent bg-accent/5' : 'border-surface-200 hover:bg-surface-50'}`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent cursor-pointer disabled:cursor-not-allowed"
                          checked={isLinked}
                          disabled={disabled}
                          onChange={async (e) => {
                            try {
                              if (e.target.checked) {
                                await projectsApi.linkAssetToTask(task.uid, manageLinksAsset.canonical_uid);
                              } else {
                                if (link) {
                                  await projectsApi.unlinkAssetFromTask(link.id);
                                }
                              }
                              fetchProject();
                            } catch (err: any) {
                              alert(err?.response?.data?.non_field_errors?.[0] || err.message || "Failed to update task link.");
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isLinked ? 'text-accent' : 'text-primary'}`}>{task.title}</p>
                          <p className="text-[9px] uppercase tracking-widest font-bold text-surface-400 truncate mt-0.5">
                            <span className={task.status === "DONE" ? "text-emerald-500" : task.status === "WIP" ? "text-accent" : ""}>{task.status}</span>
                            {task.zone_name ? ` • ${task.zone_name}` : ''}
                            {disabled && <span className="ml-2 text-red-500">🚫 Already has 3D model</span>}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-surface-100 bg-surface-50 flex justify-end">
              <button 
                onClick={() => setManageLinksAsset(null)} 
                className="px-6 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-primary text-white hover:bg-accent transition-colors shadow-md hover:shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-surface-100 bg-red-50/50">
              <div className="w-12 h-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center text-xl mb-4">🗑️</div>
              <h2 className="text-2xl font-extrabold text-red-600 tracking-tight">Delete Blueprint</h2>
              <p className="text-sm text-red-400 mt-2">
                This action cannot be undone. This will permanently delete the project <strong className="text-red-500">{project.title}</strong>, including all tasks, uploaded files, floor plans, and assets.
              </p>
            </div>
            <form onSubmit={handleDeleteProject} className="p-8">
              <div className="mb-6">
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-widest mb-2">
                  Please type <span className="text-primary">{project.title}</span> to confirm.
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-surface-50 border-2 border-surface-200 rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none focus:border-red-400 focus:bg-white transition-all"
                  placeholder="Project Title"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-widest hover:bg-surface-50 rounded-xl transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isDeleting || deleteConfirmText !== project.title}
                  className="px-6 py-3 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-500/20"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
