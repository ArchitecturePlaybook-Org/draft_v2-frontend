"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { Task, TaskComment } from "@/types/projects";
import { toast } from "sonner";
import { FloorPlanGridViewer } from "@/components/projects/FloorPlanGridViewer";
import ModelViewer from "@/components/ModelViewer";
import { format } from "date-fns";
import { TaskMaterialTab } from "@/components/projects/TaskMaterialTab";
import { TaskHSETab } from "@/components/projects/TaskHSETab";
import { TaskFieldDiaryTab } from "@/components/projects/TaskFieldDiaryTab";

export default function SharedTaskPage() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;

  const [loading, setLoading] = useState(true);
  const [publicInfo, setPublicInfo] = useState<any>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Input States
  const [newComment, setNewComment] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [newIssue, setNewIssue] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [fullScreenDrawingId, setFullScreenDrawingId] = useState<string | null>(null);

  useEffect(() => {
    if (uid) {
      loadAccessInfo();
    }
  }, [uid]);

  const loadAccessInfo = async () => {
    setLoading(true);
    try {
      const info = await projectsApi.getTaskPublicInfo(uid);
      setPublicInfo(info);
      if (info.has_access) {
        await loadFullTask();
        await loadComments();
      }
    } catch (err: any) {
      if (err.status === 404) {
        toast.error("Task not found or unavailable.");
      } else {
        toast.error("Failed to load task information.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFullTask = async () => {
    try {
      const fullTask = await projectsApi.getTask(uid);
      setTask(fullTask);
    } catch (err) {
      toast.error("Failed to load full task details.");
    }
  };

  const loadComments = async () => {
    try {
      const data = await projectsApi.getTaskComments(uid);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments");
    }
  };

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    try {
      await projectsApi.requestTaskAccess(uid);
      toast.success("Access requested successfully.");
      await loadAccessInfo();
    } catch (err: any) {
      toast.error(err.message || "Failed to request access.");
    } finally {
      setIsRequesting(false);
    }
  };

  // Interactions
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await projectsApi.createTaskComment(uid, newComment);
      setNewComment("");
      await loadComments();
      toast.success("Comment posted");
    } catch(err) {
      toast.error("Failed to post comment");
    }
  };

  const handleToggleChecklist = async (id: number, currentStatus: boolean) => {
    try {
      await projectsApi.updateChecklistItemWithAttachments(id, !currentStatus);
      await loadFullTask();
    } catch (err) {
      toast.error("Failed to update checklist item");
    }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklist.trim()) return;
    try {
      await projectsApi.createChecklistItem(uid, newChecklist.trim());
      setNewChecklist("");
      await loadFullTask();
    } catch (err) {
      toast.error("Failed to add checklist item");
    }
  };

  const handleToggleSubtask = async (subUid: string, currentStatus: string) => {
    try {
      await projectsApi.updateTask(subUid, { status: currentStatus === 'DONE' ? 'TODO' : 'DONE' });
      await loadFullTask();
    } catch (err) {
      toast.error("Failed to update subtask");
    }
  };
  
  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    try {
      await projectsApi.createTask({
        title: newSubtask.trim(),
        parent_task: uid,
        project: task?.project as any,
      });
      setNewSubtask("");
      await loadFullTask();
    } catch (err) {
      toast.error("Failed to add subtask");
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssue.trim()) return;
    try {
      await projectsApi.createPunchListItem({
        task: uid,
        title: newIssue.trim(),
        severity: "MEDIUM",
        issue_type: "QUALITY",
        description: "Pending context",
        root_cause: "OTHER",
      });
      setNewIssue("");
      await loadFullTask();
    } catch(err) {
      toast.error("Failed to report issue");
    }
  };

  const handleResolveIssue = async (issueId: number) => {
    try {
      await projectsApi.resolvePunchListItem(issueId);
      await loadFullTask();
    } catch (err) {
      toast.error("Failed to resolve issue");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !task?.project) return;
    const file = e.target.files[0];
    try {
      setIsUploadingPhoto(true);
      const assetRes = await projectsApi.uploadProjectAsset(task.project as any, 'site_photo', file, file.name);
      await projectsApi.linkAssetToTask(uid, assetRes.canonical_uid);
      await loadFullTask();
      toast.success("Photo uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateProgress = async (delta: number) => {
    if (!task) return;
    const currentQty = parseFloat(task.quantity_completed?.toString() || "0");
    const newQty = Math.max(0, currentQty + delta);
    try {
      setUpdatingProgress(true);
      await projectsApi.updateTask(task.uid, { quantity_completed: newQty });
      await loadFullTask();
    } catch (err) {
      toast.error("Failed to update progress");
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleQuickLogTime = async (hours: number) => {
    try {
      setIsLoggingTime(true);
      await projectsApi.createTaskTimeLog(uid, {
        date: format(new Date(), "yyyy-MM-dd"),
        hours: hours,
        description: "Quick log",
        billable: true,
      });
      await loadFullTask();
      toast.success(`Logged ${hours} hour${hours > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error("Failed to log time");
    } finally {
      setIsLoggingTime(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!publicInfo) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />
        <div className="bg-surface-100/50 backdrop-blur-3xl p-10 rounded-3xl shadow-2xl shadow-primary/10 text-center max-w-md w-full border border-surface-200/50 relative z-10 animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/10 shadow-[0_0_15px_rgba(255,186,8,0.1)]">
            <span className="text-3xl">🔍</span>
          </div>
          <h2 className="text-2xl font-black text-primary mb-2 tracking-tight">Task Not Found</h2>
          <p className="text-sm text-surface-500 mb-8 font-medium">This task link might be invalid or has been deleted.</p>
          <button onClick={() => router.push("/dashboard")} className="h-12 w-full bg-surface-100/50 backdrop-blur-md border border-surface-200/50 text-foreground font-bold text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-surface-200/80 hover:-translate-y-0.5 hover:shadow-xl transition-all">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Derived properties for Material Tab
  const isMatrixTask = (task as any)?.is_matrix_task ?? false;
  const estimatedCost = task ? parseFloat((task as any).estimated_cost?.toString() || "0") : 0;
  const burnCost = task ? parseFloat((task as any).actual_cost?.toString() || "0") : 0;
  const variance = estimatedCost - burnCost;
  const isOverBudget = burnCost > estimatedCost;


  // Single Page Continuous Flow layout
  if (publicInfo.has_access && task) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col relative overflow-hidden">
        {/* Cinematic War Room Backdrop */}
        <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none fixed" />
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none fixed" />

        <header className="bg-surface-100/70 backdrop-blur-xl border-b border-surface-200/50 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20 shadow-[0_0_10px_rgba(255,186,8,0.2)]">
              <span className="text-accent font-black text-xs">AP</span>
            </div>
            <span className="text-sm font-black text-primary tracking-tight">Architecture Playbook</span>
          </div>
          <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em] bg-accent/10 px-4 py-2 rounded-lg border border-accent/20">
            Public Task Link
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10 space-y-8">
          
          {/* Section 1: Hero & Metadata */}
          <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                task.status === "DONE" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                task.status === "WIP" ? "bg-accent/10 text-accent border-accent/20" :
                task.status === "QA" ? "bg-amber-50 text-amber-600 border-amber-200" :
                "bg-surface-200 text-surface-600 border-surface-300"
              }`}>
                {task.status}
              </span>
              {task.trade && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-sm"
                  style={{ backgroundColor: task.trade.color_hex }}>
                  {task.trade.name}
                </span>
              )}
              {task.has_active_blocker && (
                <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm">
                  🚨 Blocker
                </span>
              )}
              {task.tags && task.tags.map((t: any) => (
                <span key={t.id} className="px-3 py-1 bg-surface-200 text-surface-600 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border border-surface-300">
                  {t.name}
                </span>
              ))}
              <span className="text-[10px] font-mono text-surface-400">ID: {task.task_code || task.uid}</span>
            </div>
            
            <h1 className="text-4xl font-black text-primary tracking-tight leading-tight mb-8">{task.title}</h1>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-surface-50/50 p-6 rounded-2xl border border-surface-200/50 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Phase</p>
                <p className="font-bold text-primary">{task.phase_name || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Location / Zone</p>
                <p className="font-bold text-primary">{task.zone_name || "General Site"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Priority</p>
                <p className="font-bold text-primary">{task.priority || "MEDIUM"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">QA Inspector</p>
                <p className="font-bold text-primary">{task.qa_inspector?.name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Start Date</p>
                <p className="font-bold text-primary">{task.start_date ? format(new Date(task.start_date), "dd MMM yyyy") : "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Due Date</p>
                <p className="font-bold text-primary">{task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Estimated Hours</p>
                <p className="font-bold text-primary">{task.estimated_hours || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Est. Cost</p>
                <p className="font-bold text-primary">${task.estimated_cost || "0.00"}</p>
              </div>
              <div className="col-span-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-1">Assignee</p>
                <p className="font-bold text-primary">{task.assigned_to?.name || "Unassigned"}</p>
              </div>
            </div>

            {task.description && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400 mb-2">Description</p>
                <p className="whitespace-pre-wrap text-surface-600 leading-relaxed font-medium">{task.description}</p>
              </div>
            )}
          </div>

          {/* Drawings & Models (Full Width) */}
          {task.asset_links && task.asset_links.filter(l => l.latest_asset?.category === '2d_plan' || l.latest_asset?.category === '3d_model' || l.latest_asset?.category === 'sh3d').length > 0 && (
            <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-6">Drawings & Models</h3>
              <div className="space-y-6">
                {task.asset_links.map(l => {
                  const asset = l.latest_asset;
                  if (!asset) return null;
                  if (asset.category === '2d_plan') {
                    return (
                      <div key={l.id} className="border border-surface-200 rounded-2xl overflow-hidden bg-surface-50 p-2 relative h-[500px]">
                        <FloorPlanGridViewer
                          asset={asset}
                          inline
                          projectId={publicInfo?.project_id || 0}
                          onRefresh={loadFullTask}
                          onToggleFullScreen={() => setFullScreenDrawingId(asset.canonical_uid)}
                        />
                      </div>
                    );
                  }
                  if (asset.category === '3d_model' || asset.category === 'sh3d') {
                    return (
                      <div key={l.id} className="border border-surface-200 rounded-2xl overflow-hidden bg-slate-50 relative h-[500px]">
                         <ModelViewer url={asset.file} format={asset.category === 'sh3d' ? 'sh3d' : 'glb'} />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Section 2: Progress & Core Status (Left Column) */}
            <div className="lg:col-span-1 space-y-8">
              {/* Progress Card */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-6">Progress Tracking</h3>
                <div className="relative w-32 h-32 mb-6">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" className="text-surface-200/50" strokeWidth="8"/>
                    <circle
                      cx="40" cy="40" r="32" fill="none"
                      stroke={(task.progress_percent || 0) >= 100 ? "#10b981" : "#f59e0b"}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - (task.progress_percent || 0) / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-primary tabular-nums tracking-tight">{task.progress_percent || 0}%</span>
                  </div>
                </div>
                {task.quantity_target && (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <p className="text-lg font-black text-primary tabular-nums">
                      {task.quantity_completed || 0}
                      <span className="text-sm font-bold text-surface-400 ml-1">/ {task.quantity_target} {task.quantity_unit}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2 w-full">
                      <button onClick={() => handleUpdateProgress(-1)} disabled={updatingProgress} className="flex-1 py-2 bg-surface-200 hover:bg-surface-300 rounded-xl font-bold transition-colors disabled:opacity-50">-1</button>
                      <button onClick={() => handleUpdateProgress(1)} disabled={updatingProgress} className="flex-1 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50">+1</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtasks Card */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-4">Subtasks</h3>
                <div className="space-y-3 mb-4">
                  {task.subtasks?.map((sub: any) => (
                    <div key={sub.uid} onClick={() => handleToggleSubtask(sub.uid, sub.status)} className="cursor-pointer p-4 rounded-2xl border border-surface-200/50 bg-surface-50/50 hover:bg-surface-100 flex gap-3 items-start transition-colors">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${sub.status === 'DONE' ? 'border-emerald-500 bg-emerald-500' : 'border-surface-300'}`}>
                        {sub.status === 'DONE' && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${sub.status === 'DONE' ? 'text-surface-400 line-through' : 'text-primary'}`}>{sub.title}</p>
                      </div>
                    </div>
                  ))}
                  {(!task.subtasks || task.subtasks.length === 0) && (
                    <p className="text-xs text-surface-400 text-center py-2">No subtasks.</p>
                  )}
                </div>
              </div>

              {/* Checklists Card */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-4">QA Checklist</h3>
                <div className="space-y-3 mb-4">
                  {task.checklists?.map((item: any) => (
                    <div key={item.id} onClick={() => handleToggleChecklist(item.id, item.is_completed)} className="cursor-pointer flex items-start gap-3 p-4 bg-surface-50/50 hover:bg-surface-100 rounded-2xl border border-surface-200/50 transition-colors">
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.is_completed ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-surface-200"}`}>
                        {item.is_completed && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${item.is_completed ? "text-surface-400 line-through" : "text-primary"}`}>{item.title || item.description}</p>
                      </div>
                    </div>
                  ))}
                  {(!task.checklists || task.checklists.length === 0) && (
                    <p className="text-xs text-surface-400 text-center py-2">No checklist items.</p>
                  )}
                </div>
              </div>

              {/* Quick Time Log Card */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-4">Quick Time Log</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {[1, 2, 4, 8].map(h => (
                    <button 
                      key={h}
                      onClick={() => handleQuickLogTime(h)}
                      disabled={isLoggingTime}
                      className="flex-1 bg-surface-200 hover:bg-surface-300 text-surface-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm border border-surface-300 shadow-sm"
                    >
                      +{h} hr{h > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-center bg-surface-50 p-2 rounded-xl border border-surface-200">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
                    Total Logged: <span className="text-primary text-sm">{task.total_hours_logged || 0} hrs</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Heavy Context (Right Column) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Material Allocation Ledger (Fully Interactive) */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-6">Material Allocations & Consumption Log</h3>
                 <TaskMaterialTab 
                    task={task}
                    isMatrixTask={isMatrixTask}
                    estimatedCost={estimatedCost}
                    burnCost={burnCost}
                    variance={variance}
                    isOverBudget={isOverBudget}
                    onRefreshTask={loadFullTask}
                    isContractor={false}
                    isAdmin={false}
                 />
              </div>

              {/* Open Issues & Blockers */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400">Issues & Blockers</h3>
                </div>
                
                <div className="space-y-4 mb-6">
                  {task.punch_list_items?.map((issue: any) => (
                    <div key={issue.id} className="bg-surface-50/50 rounded-2xl p-5 border border-surface-200/50 flex gap-4 items-start">
                      <div className="shrink-0 pt-1 cursor-pointer hover:scale-110 transition-transform" onClick={() => handleResolveIssue(issue.id)} title="Click to resolve">
                        {issue.is_resolved ? (
                          <span className="text-2xl drop-shadow-sm">✅</span>
                        ) : issue.severity === "HIGH" ? (
                          <span className="text-2xl animate-pulse drop-shadow-sm">🚨</span>
                        ) : (
                          <span className="text-2xl drop-shadow-sm">⚠️</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold ${issue.is_resolved ? "text-surface-400 line-through" : "text-primary"}`}>{issue.title}</h4>
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md ${
                            issue.is_resolved ? "bg-surface-200 text-surface-500" :
                            issue.severity === "HIGH" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-surface-500">{issue.description}</p>
                      </div>
                    </div>
                  ))}
                  {(!task.punch_list_items || task.punch_list_items.length === 0) && (
                    <p className="text-center text-sm text-surface-400 py-4">No issues reported.</p>
                  )}
                </div>

                <form onSubmit={handleCreateIssue} className="flex gap-3 items-center border-t border-surface-200/50 pt-6">
                  <input 
                    type="text" 
                    value={newIssue}
                    onChange={(e) => setNewIssue(e.target.value)}
                    placeholder="Describe new issue or blocker..." 
                    className="flex-1 bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                  <button 
                    type="submit" 
                    disabled={!newIssue.trim()} 
                    className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    🚨 Report Issue
                  </button>
                </form>
              </div>

              {/* Site Photos */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400">Site Photos</h3>
                  <label className="cursor-pointer bg-accent text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors shadow-sm flex items-center gap-2">
                    {isUploadingPhoto ? "Uploading..." : "📷 Upload Photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {task.asset_links?.filter((l: any) => l.latest_asset?.category === 'site_photo').map((link: any) => (
                    <div key={link.id} className="relative aspect-square rounded-2xl overflow-hidden border border-surface-200/50 bg-surface-50 group">
                      <img src={link.latest_asset?.file} alt={link.latest_asset?.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-white text-xs font-bold truncate">{link.latest_asset?.title}</p>
                      </div>
                    </div>
                  ))}
                  {task.asset_links?.filter((l: any) => l.latest_asset?.category === 'site_photo').length === 0 && (
                    <p className="col-span-full text-center text-sm text-surface-400 py-6">No site photos uploaded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Project Level Logs (Full Width) */}
            <div className="lg:col-span-3 space-y-8 mt-8">
              {/* HSE Logs */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-6">Health & Safety (HSE)</h3>
                <div className="pr-2">
                   <TaskHSETab task={task} projectUid={task.project_uid || publicInfo.project_uid} />
                </div>
              </div>

              {/* Field Diary */}
              <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-6">Daily Field Diary</h3>
                <div className="pr-2">
                   <TaskFieldDiaryTab task={task} projectUid={task.project_uid || publicInfo.project_uid} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Comments Feed */}
          <div className="bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-surface-400 mb-6">Discussion & Updates</h3>
            <div className="space-y-6 mb-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center py-10 bg-surface-50/50 rounded-2xl border border-surface-200/50">
                  <p className="text-surface-400 font-medium text-sm">No comments yet. Start the discussion.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{comment.user?.name?.charAt(0) || "U"}</span>
                    </div>
                    <div className="flex-1 bg-surface-50 p-4 rounded-2xl rounded-tl-none border border-surface-200/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-primary text-sm">{comment.user?.name || "User"}</span>
                        <span className="text-[10px] text-surface-400 font-medium">{format(new Date(comment.created_at), "dd MMM, HH:mm")}</span>
                      </div>
                      <p className="text-sm text-surface-600 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handlePostComment} className="flex gap-3">
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment or update..." 
                className="flex-1 bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                Post
              </button>
            </form>
          </div>

          {/* Access Note */}
          <div className="text-center pt-8 pb-12">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
              You are securely managing this task via <span className="text-accent">Architecture Playbook</span>
            </p>
          </div>
        </main>

        {/* Full-Screen Floor Plan Modal */}
        {fullScreenDrawingId && task && (() => {
          const fullScreenAsset = task.asset_links
            ?.find(l => l.latest_asset?.canonical_uid === fullScreenDrawingId)
            ?.latest_asset;
          return fullScreenAsset ? (
            <FloorPlanGridViewer
              asset={fullScreenAsset}
              projectId={publicInfo?.project_id || 0}
              onClose={() => setFullScreenDrawingId(null)}
              onRefresh={loadFullTask}
            />
          ) : null;
        })()}
      </div>
    );
  }

  // Request Access Wall
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="bg-surface-100/50 backdrop-blur-3xl p-10 rounded-[2.5rem] shadow-2xl shadow-primary/10 border border-surface-200/50 max-w-lg w-full relative z-10 animate-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-6 border border-primary/10 shadow-[0_0_15px_rgba(255,186,8,0.1)]">
          <svg className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(17,24,39,0.3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">Private Task</h2>
        <p className="text-surface-500 mb-8 font-medium leading-relaxed">
          You need permission to access <strong className="text-primary">"{publicInfo.title}"</strong> in <strong className="text-primary">{publicInfo.project_title}</strong>.
        </p>

        {publicInfo.request_status === "Pending" ? (
          <div className="bg-amber-500/10 border border-amber-500/20 backdrop-blur-md rounded-2xl p-6 text-center animate-pulse">
            <span className="text-3xl mb-3 block drop-shadow-md">⏳</span>
            <h3 className="font-black text-amber-600 mb-1">Request Pending</h3>
            <p className="text-xs text-amber-600/80 font-bold uppercase tracking-widest">Awaiting Manager Approval</p>
          </div>
        ) : publicInfo.request_status === "Rejected" ? (
          <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl p-6 text-center">
            <span className="text-3xl mb-3 block drop-shadow-md">🚫</span>
            <h3 className="font-black text-red-600 mb-1">Request Denied</h3>
            <p className="text-xs text-red-600/80 font-bold uppercase tracking-widest">Access Declined</p>
          </div>
        ) : (
          <button 
            onClick={handleRequestAccess}
            disabled={isRequesting}
            className="h-14 w-full bg-gradient-to-r from-accent to-accent/90 text-background font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,186,8,0.4)] transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {isRequesting ? "Requesting..." : "Request Access"}
          </button>
        )}
      </div>
    </div>
  );
}
