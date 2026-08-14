"use client";

import React, { useEffect, useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { Task, TaskComment } from "@/types/projects";
import { toast } from "sonner";
import { FloorPlanGridViewer } from "@/components/projects/FloorPlanGridViewer";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { 
  X, 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  Loader2, 
  MessageSquare, 
  Camera, 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  Layers,
  User,
  ShieldCheck,
  Send
} from "lucide-react";

const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center bg-surface-100 dark:bg-surface-800 rounded-2xl text-xs font-semibold text-surface-400">
      Loading 3D Viewer...
    </div>
  )
});

import { TaskFieldDiaryTab } from "@/components/projects/TaskFieldDiaryTab";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

interface SharedTaskFullScreenModalProps {
  taskUid: string;
  onClose: () => void;
}

export function SharedTaskFullScreenModal({ taskUid, onClose }: SharedTaskFullScreenModalProps) {
  const [loading, setLoading] = useState(true);
  const [publicInfo, setPublicInfo] = useState<any>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Inputs
  const [newComment, setNewComment] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [fullScreenDrawingId, setFullScreenDrawingId] = useState<string | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (taskUid) {
      loadAccessInfo();
    }
  }, [taskUid]);

  const loadAccessInfo = async () => {
    setLoading(true);
    try {
      const info = await projectsApi.getTaskPublicInfo(taskUid);
      setPublicInfo(info);
      if (info.has_access) {
        await loadFullTask();
        await loadComments();
      }
    } catch (err: any) {
      toast.error("Failed to load task details.");
    } finally {
      setLoading(false);
    }
  };

  const loadFullTask = async () => {
    try {
      const fullTask = await projectsApi.getTask(taskUid);
      setTask(fullTask);
    } catch (err) {
      toast.error("Failed to load task info.");
    }
  };

  const loadComments = async () => {
    try {
      const data = await projectsApi.getTaskComments(taskUid);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments");
    }
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/share/task/${taskUid}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success("Public task link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openInNewTab = () => {
    window.open(`/share/task/${taskUid}`, "_blank");
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await projectsApi.createTaskComment(taskUid, newComment);
      setNewComment("");
      await loadComments();
      toast.success("Comment posted");
    } catch (err) {
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

  const handleToggleSubtask = async (subUid: string, currentStatus: string) => {
    try {
      await projectsApi.updateTask(subUid, { status: currentStatus === "DONE" ? "TODO" : "DONE" });
      await loadFullTask();
    } catch (err) {
      toast.error("Failed to update subtask");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !task?.project) return;
    const file = e.target.files[0];
    try {
      setIsUploadingPhoto(true);
      const assetRes = await projectsApi.uploadProjectAsset(task.project as any, "site_photo", file, file.name);
      await projectsApi.linkAssetToTask(taskUid, assetRes.canonical_uid);
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

  return (
    <div className="fixed inset-0 z-[200] bg-surface-50 dark:bg-surface-950 flex flex-col overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header Bar */}
      <header className="bg-surface-card/90 dark:bg-surface-900/90 border-b border-surface-200/80 dark:border-surface-800 backdrop-blur-2xl px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800/80 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 font-bold text-xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-surface-200 dark:bg-surface-800 hidden sm:block" />

          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent block">Shared Task View</span>
            <h2 className="text-sm font-bold text-primary truncate max-w-[280px] sm:max-w-md">
              {task?.title || publicInfo?.title || "Loading Task..."}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Share Link */}
          <button
            onClick={copyShareLink}
            className="px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800/80 hover:bg-surface-200 text-surface-600 dark:text-surface-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Copy Public Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copy Link</span>
          </button>

          {/* Open in New Tab Direct URL */}
          <button
            onClick={openInNewTab}
            className="px-3 py-1.5 rounded-xl bg-accent text-background font-black text-xs flex items-center gap-1.5 hover:opacity-90 transition-all shadow-xs"
            title="Open in New Tab"
          >
            <span>Direct URL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-200/60 dark:bg-surface-800/60 hover:bg-surface-300 text-surface-600 dark:text-surface-300 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-surface-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs font-semibold">Loading shared task...</span>
        </div>
      ) : !publicInfo ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="p-8 rounded-3xl bg-surface-card dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-center max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-primary mb-2">Task Not Found</h2>
            <p className="text-xs text-surface-500 mb-6">This task might have been removed or is unavailable.</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-accent text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-95"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Section 1: Hero & Metadata */}
          <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              {task?.status && (
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                  task.status === "DONE" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                  task.status === "WIP" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                  task.status === "QA" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" :
                  "bg-surface-200 dark:bg-surface-800 text-surface-600 border-surface-300"
                }`}>
                  {task.status}
                </span>
              )}
              {task?.trade && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-xs"
                  style={{ backgroundColor: task.trade.color_hex || "#3b82f6" }}>
                  {task.trade.name}
                </span>
              )}
              <span className="text-[10px] font-mono text-surface-400">ID: {task?.task_code || taskUid}</span>
            </div>

            <h1 className="text-3xl font-black text-primary tracking-tight leading-tight mb-6">{task?.title || publicInfo.title}</h1>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface-50 dark:bg-surface-950/50 p-5 rounded-2xl border border-surface-200/60 dark:border-surface-800 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Phase</p>
                <p className="text-xs font-bold text-primary">{task?.phase_name || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Location / Zone</p>
                <p className="text-xs font-bold text-primary">{task?.zone_name || "General Site"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Priority</p>
                <p className="text-xs font-bold text-primary">{task?.priority || "MEDIUM"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">QA Inspector</p>
                <p className="text-xs font-bold text-primary">{task?.qa_inspector?.name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Start Date</p>
                <p className="text-xs font-bold text-primary">{task?.start_date ? format(new Date(task.start_date), "dd MMM yyyy") : "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Due Date</p>
                <p className="text-xs font-bold text-primary">{task?.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Est. Cost</p>
                <p className="text-xs font-bold text-primary">${task?.estimated_cost || "0.00"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Assignee</p>
                <p className="text-xs font-bold text-primary">{task?.assigned_to?.name || "Unassigned"}</p>
              </div>
            </div>

            {task?.description && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1.5">Description</p>
                <p className="whitespace-pre-wrap text-xs text-surface-600 dark:text-surface-300 leading-relaxed font-medium">{task.description}</p>
              </div>
            )}
          </div>

          {/* Drawings & Models */}
          {task?.asset_links && task.asset_links.filter(l => l.latest_asset?.category === "2d_plan" || l.latest_asset?.category === "3d_model" || l.latest_asset?.category === "sh3d").length > 0 && (
            <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Drawings & Models</h3>
              <div className="space-y-6">
                {task.asset_links.map(l => {
                  const asset = l.latest_asset;
                  if (!asset) return null;
                  if (asset.category === "2d_plan") {
                    return (
                      <div key={l.id} className="border border-surface-200/80 dark:border-surface-800 rounded-2xl overflow-hidden bg-surface-50 dark:bg-surface-950 p-2 relative h-[420px]">
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
                  if (asset.category === "3d_model" || asset.category === "sh3d") {
                    return (
                      <div key={l.id} className="border border-surface-200/80 dark:border-surface-800 rounded-2xl overflow-hidden bg-surface-50 dark:bg-surface-950 relative h-[420px]">
                         <ModelViewer 
                            url={asset.file} 
                            format={
                              asset.category === "sh3d" ? "sh3d" : 
                              asset.file.toLowerCase().endsWith(".obj") ? "obj" : "glb"
                            } 
                         />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Progress & Checklists */}
            <div className="lg:col-span-1 space-y-6">
              {/* Progress Card */}
              {task && (
                <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Progress Tracking</h3>
                  <div className="relative w-28 h-28 mb-4">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" className="text-surface-200 dark:text-surface-800" strokeWidth="8"/>
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
                      <span className="text-2xl font-black text-primary tabular-nums tracking-tight">{task.progress_percent || 0}%</span>
                    </div>
                  </div>
                  {task.quantity_target && (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <p className="text-base font-black text-primary tabular-nums">
                        {task.quantity_completed || 0}
                        <span className="text-xs font-bold text-surface-400 ml-1">/ {task.quantity_target} {task.quantity_unit}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1 w-full">
                        <button onClick={() => handleUpdateProgress(-1)} disabled={updatingProgress} className="flex-1 py-1.5 bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50">-1</button>
                        <button onClick={() => handleUpdateProgress(1)} disabled={updatingProgress} className="flex-1 py-1.5 bg-accent hover:bg-accent/90 text-background text-xs font-bold rounded-xl transition-all disabled:opacity-50">+1</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subtasks Card */}
              {task && (
                <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-3">Subtasks</h3>
                  <div className="space-y-2">
                    {task.subtasks?.map((sub: any) => (
                      <div key={sub.uid} onClick={() => handleToggleSubtask(sub.uid, sub.status)} className="cursor-pointer p-3 rounded-xl border border-surface-200/60 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50 hover:bg-surface-100 flex gap-2.5 items-start transition-all">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${sub.status === "DONE" ? "border-emerald-500 bg-emerald-500 text-white" : "border-surface-300 dark:border-surface-700 bg-surface-card"}`}>
                          {sub.status === "DONE" && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <p className={`text-xs font-semibold ${sub.status === "DONE" ? "text-surface-400 line-through" : "text-primary"}`}>{sub.title}</p>
                      </div>
                    ))}
                    {(!task.subtasks || task.subtasks.length === 0) && (
                      <p className="text-xs text-surface-400 text-center py-2">No subtasks.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Checklists Card */}
              {task && (
                <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-3">QA Checklist</h3>
                  <div className="space-y-2">
                    {task.checklists?.map((item: any) => (
                      <div key={item.id} onClick={() => handleToggleChecklist(item.id, item.is_completed)} className="cursor-pointer flex items-start gap-2.5 p-3 bg-surface-50 dark:bg-surface-950/50 hover:bg-surface-100 rounded-xl border border-surface-200/60 dark:border-surface-800 transition-all">
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.is_completed ? "bg-emerald-500 text-white" : "bg-surface-200 dark:bg-surface-800"}`}>
                          {item.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <p className={`text-xs font-semibold ${item.is_completed ? "text-surface-400 line-through" : "text-primary"}`}>{item.title || item.description}</p>
                      </div>
                    ))}
                    {(!task.checklists || task.checklists.length === 0) && (
                      <p className="text-xs text-surface-400 text-center py-2">No checklist items.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Photos & Field Diary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Site Photos */}
              {task && (
                <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-surface-400">Site Photos</h3>
                    <label className="cursor-pointer bg-accent text-background font-black text-xs px-3 py-1.5 rounded-xl hover:opacity-90 transition-all shadow-xs flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isUploadingPhoto ? "Uploading..." : "Upload Photo"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {task.asset_links?.filter((l: any) => l.latest_asset?.category === "site_photo").map((link: any) => (
                      <div 
                        key={link.id} 
                        onClick={() => setViewingPhotoUrl(link.latest_asset?.file || null)}
                        className="relative aspect-square rounded-2xl overflow-hidden border border-surface-200/60 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 group cursor-pointer"
                      >
                        <img src={link.latest_asset?.file} alt={link.latest_asset?.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                          <p className="text-white text-[11px] font-bold truncate">{link.latest_asset?.title}</p>
                        </div>
                      </div>
                    ))}
                    {task.asset_links?.filter((l: any) => l.latest_asset?.category === "site_photo").length === 0 && (
                      <p className="col-span-full text-center text-xs text-surface-400 py-4">No site photos uploaded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Field Diary */}
              {task && (
                <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Daily Field Diary</h3>
                  <TaskFieldDiaryTab task={task} projectUid={task.project_uid || publicInfo.project_uid} />
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Comments Feed */}
          <div className="bg-surface-card/90 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4">Discussion & Updates</h3>
            <div className="space-y-4 mb-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center py-8 bg-surface-50 dark:bg-surface-950/50 rounded-2xl border border-surface-200/60 dark:border-surface-800">
                  <p className="text-surface-400 font-medium text-xs">No comments yet. Start the discussion.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-xs">
                      {comment.user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 bg-surface-50 dark:bg-surface-950/50 p-3.5 rounded-2xl rounded-tl-none border border-surface-200/60 dark:border-surface-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-primary text-xs">{comment.user?.name || "User"}</span>
                        <span className="text-[10px] text-surface-400 font-medium">{format(new Date(comment.created_at), "dd MMM, HH:mm")}</span>
                      </div>
                      <p className="text-xs text-surface-600 dark:text-surface-300 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handlePostComment} className="flex gap-2.5">
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment or update..." 
                className="flex-1 bg-surface-50 dark:bg-surface-950/50 border border-surface-200/80 dark:border-surface-800 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-accent transition-all"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="bg-accent text-background font-black px-5 py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 text-xs shadow-xs"
              >
                Post
              </button>
            </form>
          </div>
        </main>
      )}

      {/* Lightbox for Photos */}
      {viewingPhotoUrl && (
        <ImageLightbox
          imageUrl={viewingPhotoUrl}
          onClose={() => setViewingPhotoUrl(null)}
          altText="Site Photo"
        />
      )}
    </div>
  );
}
