"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectDetail, Task, ProjectAsset } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { usePermissions } from "@/hooks/use-permissions";
import { TaskItem } from "@/components/projects/TaskItem";
import { TaskExecutionModal } from "@/components/projects/TaskExecutionModal";
import { Spinner } from "@/components/ui/Spinner";
import { SketchBoard } from "@/components/sketch/SketchBoard";
import { RevisionHistoryModal } from "@/components/projects/RevisionHistoryModal";
import { FloorPlanGridViewer } from "@/components/projects/FloorPlanGridViewer";

type TabView = "data_hub" | "kanban" | "gantt";
type HubCategory = "sketch" | "2d_plan" | "3d_model" | "document";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { canManageProject, canEditProject } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabView>("kanban");
  const [activeHubCategory, setActiveHubCategory] = useState<HubCategory>("sketch");

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
  const [projectIntId, setProjectIntId] = useState<number | null>(null);
  const [surveyAsset, setSurveyAsset] = useState<ProjectAsset | null>(null);


  const fetchProject = async () => {
    try {
      const data = await projectsApi.getProjectDetails(id);
      setProject(data);
      setProjectIntId(data.id); // cache the integer PK for uploads
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
    } else {
      window.open(asset.file, "_blank");
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
      await projectsApi.createTask({ project: project.id, title });
      setNewTaskTitle("");
      setSelectedTemplate("");
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

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
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

          {/* Task Rows */}
          <div className="space-y-6">
            {project.tasks.map((task) => {
              const hasDates = task.start_date && task.end_date;
              let width = "0%";
              let left = "0%";

              if (hasDates) {
                const start = new Date(task.start_date!).getTime();
                const end = new Date(task.end_date!).getTime();
                const taskDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                const offsetDays = Math.ceil((start - minDate.getTime()) / (1000 * 60 * 60 * 24));
                
                width = `${(taskDays / totalDays) * 100}%`;
                left = `${((offsetDays) / totalDays) * 100}%`;
              }

              return (
                <div key={task.uid} className="flex items-center group">
                  <div className="w-1/4 pr-10 py-2">
                    <h4 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">{task.title}</h4>
                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-tighter mt-0.5">
                      {hasDates ? `${task.start_date} → ${task.end_date}` : "Timeline Not Defined"}
                    </p>
                  </div>
                  <div className="flex-1 relative h-12 bg-surface-50/50 rounded-2xl border border-dashed border-surface-100 flex items-center px-2">
                    {hasDates ? (
                      <div 
                        onClick={() => setActiveTask(task)}
                        className={`absolute h-8 rounded-xl shadow-lg transition-all cursor-pointer flex items-center px-4 group/bar hover:scale-[1.02] ${
                          task.status === "Done" ? "bg-emerald-500 shadow-emerald-200" : task.status === "In Progress" ? "bg-accent shadow-accent/20" : "bg-primary shadow-primary/20"
                        }`}
                        style={{ width, left }}
                      >
                        <span className="text-[10px] text-white font-extrabold truncate uppercase tracking-widest">{task.status}</span>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-xl" />
                      </div>
                    ) : (
                      <button 
                        onClick={() => setActiveTask(task)}
                        className="mx-auto text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-4 py-2 rounded-full border border-accent/10 hover:bg-accent hover:text-white transition-all"
                      >
                        Initialize Timeline Protocol
                      </button>
                    )}
                  </div>
                  <div className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setActiveTask(task)}
                      className="w-10 h-10 rounded-xl bg-surface-100 text-surface-500 hover:bg-primary hover:text-white transition-all flex items-center justify-center text-xs"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
              );
            })}
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
          {canManage && (
            <button onClick={() => setShowAssignModal(true)} className="h-10 px-6 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-md">
              + Assign Personnel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 pb-px">
        {[
          { id: "data_hub", label: "Master Data Hub" },
          { id: "kanban", label: "Advanced Kanban" },
          { id: "gantt", label: "Gantt Timeline" }
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
                      accept="image/png,image/jpeg,image/jpg,image/gif,.pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !projectIntId) return;
                        setIsUploading(true);
                        try {
                          const title = file.name.replace(/\.[^/.]+$/, ""); // strip extension
                          await projectsApi.uploadProjectAsset(projectIntId, activeHubCategory, file, title);
                          fetchProject();
                        } catch (err: any) {
                          alert(`Upload failed: ${err.message}`);
                        } finally {
                          setIsUploading(false);
                          e.target.value = ""; // reset so same file can be re-selected
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-4 py-2 bg-surface-100 text-primary font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? "Uploading..." : "Upload File"}
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

                            {/* Task Link Dropdown */}
                            {activeHubCategory === "2d_plan" && (
                              <div className="mt-2.5 pt-2.5 border-t border-surface-100">
                                <label className="text-[9px] font-black uppercase tracking-widest text-surface-400 block mb-1">Linked Task</label>
                                <select
                                  className="w-full text-xs font-bold bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 outline-none focus:border-accent text-primary cursor-pointer"
                                  value={project.tasks.find(t => t.asset_links?.some(l => String(l.canonical_uid) === String(asset.canonical_uid)))?.uid || ""}
                                  onChange={async (e) => {
                                    const newTaskUid = e.target.value;
                                    // Remove existing link for this canonical uid
                                    for (const task of project.tasks) {
                                      const link = task.asset_links?.find(l => String(l.canonical_uid) === String(asset.canonical_uid));
                                      if (link) { await projectsApi.unlinkAssetFromTask(link.id); }
                                    }
                                    if (newTaskUid) {
                                      await projectsApi.linkAssetToTask(newTaskUid, asset.canonical_uid);
                                    }
                                    fetchProject();
                                  }}
                                >
                                  <option value="">— Not linked to any task —</option>
                                  {project.tasks.map(t => (
                                    <option key={t.uid} value={t.uid}>{t.title}</option>
                                  ))}
                                </select>
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
                
                <button 
                  type="submit"
                  disabled={isCreatingTask || (!selectedTemplate && !newTaskTitle)}
                  className="h-12 px-8 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-50 ml-auto"
                >
                  {isCreatingTask ? "Adding..." : "+ Add Task"}
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["Pending", "In Progress", "Done"].map(status => (
                <div 
                  key={status} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                  className="bg-surface-50 p-4 rounded-2xl border border-surface-200 min-h-[500px]"
                >
                  <h4 className="font-extrabold text-[11px] uppercase tracking-widest text-surface-500 mb-4 px-2">
                    {status} <span className="ml-2 bg-surface-200 text-surface-600 px-2 py-0.5 rounded-full">{project.tasks.filter(t => t.status === status).length}</span>
                  </h4>
                  <div className="space-y-3 min-h-full pb-8">
                    {project.tasks.filter(t => t.status === status).map(task => (
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

        {/* GANTT VIEW */}
        {activeTab === "gantt" && renderGantt()}

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
    </div>
  );
}
