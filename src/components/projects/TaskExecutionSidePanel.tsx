import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Task, ProjectAsset, TaskChecklistItem, SpatialZone, MilestonePhase, ChecklistTemplate, TaskComment } from "@/types/projects";
import { usePermissions } from "@/hooks/use-permissions";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { FloorPlanGridViewer } from "./FloorPlanGridViewer";
import { TaskMaterialTab } from "./TaskMaterialTab";
import { TaskCommunicationPanel } from "./TaskCommunicationPanel";
import { TaskTimeLogTab } from "./TaskTimeLogTab";
import ModelViewer from "@/components/ModelViewer";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { TaskHSETab } from "./TaskHSETab";
import { TaskFieldDiaryTab } from "./TaskFieldDiaryTab";
import Link from "next/link";

interface TaskExecutionSidePanelProps {
  task: Task;
  projectId: number;
  projectUid: string;
  projectAssets: ProjectAsset[];
  projectTasks: Task[];
  criticalPathUids: string[];
  taskTags: any[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

type TaskTab = "execution" | "subtasks" | "boq" | "checklist" | "issues" | "drawing" | "time" | "dependencies" | "hse" | "diary" | "photos";


const TaskPhotosTab: React.FC<{ task: Task; projectId: number; onRefresh: () => void }> = ({ task, projectId, onRefresh }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const photos = task.asset_links?.filter(l => l.latest_asset?.category === 'site_photo') || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const title = file.name.replace(/\.[^/.]+$/, "");
        const assetRes = await projectsApi.uploadProjectAsset(projectId, 'site_photo', file, title);
        await projectsApi.linkAssetToTask(task.uid, assetRes.canonical_uid);
      }
      toast.success("Photos uploaded and linked successfully.");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUnlink = async (linkId: number) => {
    try {
      await projectsApi.unlinkAssetFromTask(linkId);
      onRefresh();
      toast.success("Photo removed from task.");
    } catch (err: any) {
      toast.error("Failed to remove photo.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center bg-surface-100 border-surface-200 p-6 rounded-2xl border border-surface-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-primary">Site Photos</h3>
          <p className="text-sm text-surface-500 text-surface-400 font-medium">Visual documentation of work progress.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-11 px-6 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? "Uploading..." : "Upload Photos"}
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 bg-surface-50 border border-dashed border-surface-200 rounded-3xl">
          <span className="text-4xl mb-4 block">📸</span>
          <h4 className="text-lg font-bold text-primary mb-1">No Photos Yet</h4>
          <p className="text-sm text-surface-500 text-surface-400">Upload progress photos to document completion.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map(link => {
            const asset = link.latest_asset;
            if (!asset) return null;
            return (
              <div key={link.id} className="group relative bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="aspect-square bg-surface-100 relative">
                  <img src={asset.file} alt={asset.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                    <button 
                      onClick={() => window.open(asset.file, '_blank')}
                      className="w-10 h-10 rounded-full bg-surface-100 border-surface-200/20 hover:bg-surface-100 border-surface-200/40 text-white flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button 
                      onClick={() => handleUnlink(link.id)}
                      className="w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-xs font-bold text-primary truncate">{asset.title}</h4>
                  <p className="text-[9px] text-surface-400 font-bold uppercase mt-1">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TaskExecutionSidePanel: React.FC<TaskExecutionSidePanelProps> = ({ 
  task: initialTask, 
  projectId,
  projectUid,
  projectAssets,
  projectTasks,
  criticalPathUids,
  taskTags,
  onClose,
  onTaskUpdated
}) => {
  const [panelWidth, setPanelWidth] = useState(800);
  const { isAdmin, hasGlobalPermission, canEditProject } = usePermissions();
  const [task, setTask] = useState<Task>(initialTask);
  const [activeTab, setActiveTab] = useState<TaskTab>("execution");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.status);
  
  // Matrix specific state
  const [quantityDelta, setQuantityDelta] = useState("");
  const [newChecklistDesc, setNewChecklistDesc] = useState("");
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [newIssueSeverity, setNewIssueSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [newIssueType, setNewIssueType] = useState("QUALITY");
  const [newRootCause, setNewRootCause] = useState("POOR_WORKMANSHIP");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const [checklistProofModal, setChecklistProofModal] = useState<TaskChecklistItem | null>(null);
  const checklistPhotoRef = useRef<HTMLInputElement>(null);

  const [zones, setZones] = useState<SpatialZone[]>([]);
  const [phases, setPhases] = useState<MilestonePhase[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");

  // Drawing state
  const [selectedAssetToLink, setSelectedAssetToLink] = useState<string>("");
  const [fullScreenDrawingId, setFullScreenDrawingId] = useState<string | null>(null);
  const [isFullScreen3D, setIsFullScreen3D] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedDependencyUids, setSelectedDependencyUids] = useState<string[]>([]);
  const [isSavingDependencies, setIsSavingDependencies] = useState(false);
  
  const isMatrixTask = task.block !== null && task.block !== undefined;
  const isArchitect = true; // Temporary bypass since we don't have full ProjectDetail here
  const isContractor = false;
  const isQA = false;
  
  React.useEffect(() => {
    if (projectUid) {
      projectsApi.getMatrix(projectUid).then(data => {
        setZones(data.zones);
        setPhases(data.phases);
        if (task.block) {
          const b = data.blocks.find(b => b.id === task.block);
          if (b) {
            setSelectedZoneId(b.zone_id.toString());
            setSelectedPhaseId(b.phase_id.toString());
          }
        }
      }).catch(err => console.error("Failed to fetch matrix data", err));
    }
    
    // Fetch checklist templates if admin/QA
    if (isAdmin || isQA) {
      projectsApi.getChecklistTemplates().then(data => {
        setChecklistTemplates(data);
      }).catch(err => console.error("Failed to fetch checklist templates", err));
    }
    
    // Initialize selected dependencies
    if (task.depends_on && projectTasks) {
      const uids = task.depends_on.map(id => projectTasks.find(t => t.id === id)?.uid).filter(Boolean) as string[];
      setSelectedDependencyUids(uids);
    }
  }, [projectUid, task.block, isAdmin, isQA, task.depends_on, projectTasks]);

  const handleUpdateMatrixLocation = async (zId: string, pId: string) => {
    if (zId && pId) {
      try {
        await projectsApi.updateTask(task.uid, { zone_id: parseInt(zId), phase_id: parseInt(pId) });
        await refreshTask();
        toast.success("Matrix location updated.");
      } catch (err: any) {
        toast.error("Failed to update matrix location.");
      }
    }
  };

  const refreshTask = async () => {
    try {
      const updated = await projectsApi.getTask(task.uid);
      setTask(updated);
      onTaskUpdated();
    } catch { /* silent */ }
  };

  const handleStatusChange = async (newStatus: string) => {
    const previousStatus = currentStatus;
    setCurrentStatus(newStatus as any);
    setIsUpdating(true);
    try {
      await projectsApi.updateTask(task.uid, { status: newStatus });
      await refreshTask();
    } catch (err) {
      console.error(err);
      setCurrentStatus(previousStatus);
      toast.error("Protocol failed: Could not synchronize status.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Matrix functions
  const handleLogProgress = async () => {
    const delta = parseFloat(quantityDelta);
    if (isNaN(delta) || delta <= 0) {
      toast.error("Enter a valid positive quantity.");
      return;
    }
    setIsUpdating(true);
    try {
      // Assuming a patch endpoint for progress
      const updated = await projectsApi.updateTask(task.uid, { 
        quantity_completed: (task.quantity_completed || 0) + delta 
      });
      setTask(updated);
      onTaskUpdated();
      setQuantityDelta("");
      toast.success(`+${delta} ${task.quantity_unit} logged successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to log progress.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleChecklist = async (item: TaskChecklistItem) => {
    if (!item.is_completed && item.requires_visual_proof) {
      setChecklistProofModal(item);
      return;
    }
    setIsUpdating(true);
    try {
      await projectsApi.updateChecklistItemWithAttachments(item.id, !item.is_completed);
      await refreshTask();
    } catch (err: any) {
      toast.error(err.message || "Failed to update checklist.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmChecklistProof = async () => {
    if (!checklistProofModal) return;
    const files = checklistPhotoRef.current?.files ? Array.from(checklistPhotoRef.current.files) : [];
    if (files.length === 0) {
      toast.error("Please upload at least one photo as proof.");
      return;
    }
    setIsUpdating(true);
    try {
      await projectsApi.updateChecklistItemWithAttachments(checklistProofModal.id, true, files);
      await refreshTask();
      setChecklistProofModal(null);
      toast.success("Checklist item verified with proof.");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete checklist with proof.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistDesc.trim()) return;
    try {
      await projectsApi.createChecklistItem(task.uid, newChecklistDesc.trim());
      setNewChecklistDesc("");
      await refreshTask();
      toast.success("Checklist item added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add item.");
    }
  };

  const handleImportTemplate = async () => {
    if (!selectedTemplateId) return;
    setIsUpdating(true);
    try {
      await projectsApi.importChecklistTemplate(task.uid, parseInt(selectedTemplateId));
      setSelectedTemplateId("");
      await refreshTask();
      toast.success("Checklist template imported successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to import template.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !newIssueDesc.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setIsUpdating(true);
    try {
      const files = photoRef.current?.files ? Array.from(photoRef.current.files) : [];
      await projectsApi.createPunchListItem({
        task: task.uid,
        title: newIssueTitle.trim(),
        description: newIssueDesc.trim(),
        severity: newIssueSeverity,
        issue_type: newIssueType,
        root_cause: newRootCause,
        attachments: files,
      });
      setNewIssueTitle("");
      setNewIssueDesc("");
      setNewIssueSeverity("MEDIUM");
      setNewIssueType("QUALITY");
      setNewRootCause("POOR_WORKMANSHIP");
      if (photoRef.current) photoRef.current.value = "";
      setShowIssueForm(false);
      await refreshTask();
      toast.success("Issue Tracker item raised successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to raise Issue Tracker item.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolveIssue = async (issueId: number) => {
    try {
      await projectsApi.resolvePunchListItem(issueId);
      await refreshTask();
      toast.success("Issue Tracker item resolved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve item.");
    }
  };

  const handleCreateSubtask = async (title: string, description: string = "") => {
    setIsUpdating(true);
    try {
      await projectsApi.createTask({
        project: projectId,
        title: title,
        description: description,
        parent_task_id: task.id
      });
      await refreshTask();
      toast.success("Subtask created successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to create subtask.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSubtask = async (subtaskUid: string, data: any) => {
    setIsUpdating(true);
    try {
      await projectsApi.updateTask(subtaskUid, data);
      await refreshTask();
    } catch (err: any) {
      toast.error(err.message || "Failed to update subtask.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/share/task/${task.uid}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
  };

  const handleLinkDrawing = async () => {
    if (!selectedAssetToLink) return;
    setIsLinking(true);
    try {
      await projectsApi.linkAssetToTask(task.uid, selectedAssetToLink);
      await refreshTask();
      toast.success("Drawing linked successfully.");
      setSelectedAssetToLink("");
    } catch (err: any) {
      toast.error(err.message || "Failed to link drawing.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkDrawing = async (linkId: number) => {
    setIsLinking(true);
    try {
      await projectsApi.unlinkAssetFromTask(linkId);
      await refreshTask();
      toast.success("Drawing unlinked.");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink drawing.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleSaveDependencies = async () => {
    setIsSavingDependencies(true);
    try {
      await projectsApi.setTaskDependencies(task.uid, selectedDependencyUids);
      await refreshTask();
      toast.success("Dependencies saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save dependencies (possible cycle).");
    } finally {
      setIsSavingDependencies(false);
    }
  };

  // Matrix variables
  const checklists = task.checklists || [];
  const issues = task.punch_list_items || [];
  const uncheckedCount = checklists.filter((i: any) => !i.is_completed).length;
  const openIssueCount = issues.filter((i: any) => !i.is_resolved).length;
  // Diary-sourced counts for notification badges
  const diarySourcedIssueCount = issues.filter((i: any) => !i.is_resolved && i.source_diary_entry != null).length;
  const openSafetyCount = (task as any).diary_safety_entries?.filter((s: any) => s.incident_reported).length || 0;
  
  const estimatedCost = parseFloat(task.estimated_cost as any) || 0;
  const burnCost = task.actual_burn_cost || 0;
  const variance = task.cost_variance || 0;
  const isOverBudget = variance < 0;

  const tabs: { id: TaskTab; label: string; hidden?: boolean }[] = [
    { id: "execution", label: isMatrixTask ? "Progress & Timeline" : "Execution Details" },
    { id: "dependencies", label: "Dependencies" },
    { id: "subtasks", label: "Subtasks" },
    { id: "time", label: "Time Tracking" },
    { id: "checklist", label: "Checklists & QA" },
    { id: "issues", label: "Issue Tracker" },
    { id: "hse", label: "Safety" },
    { id: "diary", label: "Field Diary" },
    { id: "boq", label: "Materials & Requisition", hidden: isContractor },
    { id: "drawing", label: "Context & Models", hidden: !isMatrixTask },
  ];

  const linked2dPlanLinks = task.asset_links?.filter(l => l.latest_asset?.category === "2d_plan") || [];
  const linked3dModelLink = task.asset_links?.find(l => l.latest_asset?.category === "3d_model" || l.latest_asset?.category === "sh3d");
  const linked3dModel = linked3dModelLink?.latest_asset;

  const linked2dPlanUids = new Set(linked2dPlanLinks.map(l => l.latest_asset?.canonical_uid));

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-2xl"
      />
      <motion.div 
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{ width: panelWidth }}
        className="fixed top-0 right-0 bottom-0 z-50 bg-background shadow-2xl flex flex-col border-l border-surface-200"
      >
        {/* Resize Handle */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/50 z-50 transition-colors"
          onPointerDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = panelWidth;
            const handleMove = (moveEvent: PointerEvent) => {
              const delta = startX - moveEvent.clientX;
              setPanelWidth(Math.max(400, Math.min(window.innerWidth - 100, startWidth + delta)));
            };
            const handleUp = () => {
              window.removeEventListener("pointermove", handleMove);
              window.removeEventListener("pointerup", handleUp);
            };
            window.addEventListener("pointermove", handleMove);
            window.addEventListener("pointerup", handleUp);
          }}
        />
        
        {/* Header */}
        <div className="sticky top-0 z-50 px-8 py-6 border-b border-surface-200 bg-surface-50/80 bg-background/80 backdrop-blur-2xl flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 relative overflow-hidden gap-6 shadow-sm">
          <div className="absolute -top-20 -right-20 w-64 h-64 arch-grid opacity-5 pointer-events-none" />
          
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md border ${
                currentStatus === "DONE" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800/30" :
                currentStatus === "WIP" ? "bg-accent/10 text-accent border-accent/20" :
                currentStatus === "QA" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800/30" :
                "bg-surface-200 text-surface-600 text-surface-300 border-surface-300"
              }`}>
                {currentStatus}
              </span>
              {task.trade && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white"
                  style={{ backgroundColor: task.trade.color_hex }}>
                  {task.trade.name}
                </span>
              )}
              {task.has_active_blocker && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                  🚨 Blocker
                </span>
              )}
              {task.estimated_hours ? (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-200" title="Burn Rate (Hours Logged / Estimated)">
                  ⏱️ {task.total_hours_logged || 0} / {task.estimated_hours}h
                </span>
              ) : task.total_hours_logged ? (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-200" title="Time Logged">
                  ⏱️ {task.total_hours_logged}h logged
                </span>
              ) : null}
              <span className="text-[10px] font-mono text-surface-400">ID: {task.task_code || task.uid}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight truncate" title={task.title}>{task.title}</h2>
          </div>

          <div className="relative z-10 flex items-center gap-4 shrink-0 flex-wrap">
            <div className="flex bg-surface-200/50 p-1 rounded-xl border border-surface-200">
              {["TODO", "WIP", "QA", "DONE"].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isUpdating}
                  className={`px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all ${
                    currentStatus === s ? "bg-surface-100 border-surface-200 shadow-xl text-primary" : "text-surface-500 text-surface-400 hover:text-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleCopyLink}
              className="h-11 px-6 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center gap-2 whitespace-nowrap"
            >
              🔗 Copy Link
            </button>
            <button 
                onClick={() => {
                  const url = `${window.location.origin}/share/task/${task.uid}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Share link copied to clipboard!");
                }}
                className="h-11 px-6 rounded-xl bg-surface-200 text-surface-600 text-surface-300 hover:bg-surface-300 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap"
              >
                Share
              </button>
            <button onClick={onClose} className="w-11 h-11 rounded-xl bg-surface-200 text-surface-600 text-surface-300 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold shadow-sm">
              ✕
            </button>
          </div>
        </div>

        {/* Layout: Main Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col bg-surface-100 border-surface-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex px-8 border-b border-surface-200 bg-surface-100 pt-4 pb-2 shrink-0 overflow-x-auto gap-2 custom-scrollbar">
              {tabs.filter(t => !t.hidden).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TaskTab)}
                  className={`relative px-5 py-2.5 font-bold text-[10px] tracking-widest uppercase transition-colors whitespace-nowrap flex items-center gap-2 rounded-full z-10 ${
                    activeTab === tab.id ? "text-background" : "text-surface-500 hover:text-primary hover:bg-surface-200/50"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTaskTab"
                      className="absolute inset-0 bg-accent rounded-full -z-10 shadow-md"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {tab.label}
                  {tab.id === "checklist" && uncheckedCount > 0 && (
                    <span className={`w-4 h-4 text-[8px] font-black rounded-full flex items-center justify-center ${activeTab === tab.id ? 'bg-background/20 text-background' : 'bg-amber-400 text-white'}`}>{uncheckedCount}</span>
                  )}
                  {tab.id === "issues" && openIssueCount > 0 && (
                    <span className={`w-4 h-4 text-[8px] font-black rounded-full flex items-center justify-center ${
                      activeTab === tab.id ? 'bg-background/20 text-background' : 
                      task.has_active_blocker ? 'bg-red-500 animate-pulse text-white' : 'bg-amber-400 text-white'
                    }`}>{openIssueCount}</span>
                  )}
                  {tab.id === "hse" && openSafetyCount > 0 && (
                    <span className={`w-4 h-4 text-[8px] font-black rounded-full flex items-center justify-center ${
                      activeTab === tab.id ? 'bg-background/20 text-background' : 'bg-orange-500 animate-pulse text-white'
                    }`}>{openSafetyCount}</span>
                  )}
                  {tab.id === "diary" && diarySourcedIssueCount > 0 && (
                    <span className={`w-4 h-4 text-[8px] font-black rounded-full flex items-center justify-center ${
                      activeTab === tab.id ? 'bg-background/20 text-background' : 'bg-red-400 text-white'
                    }`}>{diarySourcedIssueCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-surface-50">
              
              {/* EXECUTION / PROGRESS TAB */}
              {activeTab === "execution" && (
                <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] h-[calc(100vh-280px)]">
                  {/* Main Execution Content */}
                  <div className="flex-1 space-y-8 overflow-y-auto pr-2 pb-8 max-w-4xl">
                    {/* If Matrix, show quantity progress */}
                  {isMatrixTask && (
                    <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 p-6 flex items-center gap-6 shadow-sm">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                          <circle
                            cx="40" cy="40" r="32" fill="none"
                            stroke={(task.progress_percent || 0) >= 100 ? "#10b981" : "#2563eb"}
                            strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - (task.progress_percent || 0) / 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-black text-primary tabular-nums">{task.progress_percent || 0}%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Quantity Progress</p>
                        <p className="text-2xl font-black text-primary tabular-nums">
                          {task.quantity_completed || 0}
                          <span className="text-sm font-bold text-surface-400 ml-1">/ {task.quantity_target ?? "—"} {task.quantity_unit}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* If Matrix & Admin/Contractor, show progress logger */}
                  {isMatrixTask && (isContractor || isAdmin) && (
                    <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 p-5 shadow-sm">
                      <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Log Field Progress</h4>
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="0.01"
                            step="0.1"
                            value={quantityDelta}
                            onChange={e => setQuantityDelta(e.target.value)}
                            placeholder={`Quantity completed today...`}
                            className="w-full h-12 bg-surface-50 border border-surface-200 rounded-xl px-4 outline-none focus:border-accent font-bold text-primary text-sm transition-colors"
                          />
                          {task.quantity_unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-surface-400 uppercase">{task.quantity_unit}</span>
                          )}
                        </div>
                        <button
                          onClick={handleLogProgress}
                          disabled={isUpdating || !quantityDelta}
                          className="h-12 px-6 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-40 shrink-0"
                        >
                          {isUpdating ? "Saving..." : "Log"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Matrix Location */}
                  <div>
                    <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">Matrix Location</h3>
                    <div className="bg-surface-100 border-surface-200 p-8 rounded-2xl border border-surface-200 shadow-sm space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Zone</label>
                          <select 
                            value={selectedZoneId}
                            onChange={(e) => {
                              setSelectedZoneId(e.target.value);
                              handleUpdateMatrixLocation(e.target.value, selectedPhaseId);
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors appearance-none"
                          >
                            <option value="" disabled>Select Zone...</option>
                            {zones.map(z => (
                              <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Phase</label>
                          <select 
                            value={selectedPhaseId}
                            onChange={(e) => {
                              setSelectedPhaseId(e.target.value);
                              handleUpdateMatrixLocation(selectedZoneId, e.target.value);
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors appearance-none"
                          >
                            <option value="" disabled>Select Phase...</option>
                            {phases.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Standard Directives & Timeline */}
                  <div>
                    <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">Timeline & Directives</h3>
                    <div className="bg-surface-100 border-surface-200 p-8 rounded-2xl border border-surface-200 shadow-sm space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Start Date</label>
                          <input 
                            type="date" 
                            value={task.start_date || ""} 
                            onChange={async (e) => {
                              await projectsApi.updateTask(task.uid, { start_date: e.target.value });
                              refreshTask();
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Due Date</label>
                          <input 
                            type="date" 
                            value={task.due_date || task.end_date || ""} 
                            onChange={async (e) => {
                              await projectsApi.updateTask(task.uid, { due_date: e.target.value });
                              refreshTask();
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Priority</label>
                          <select
                            value={task.priority || "MEDIUM"}
                            onChange={async (e) => {
                              await projectsApi.updateTask(task.uid, { priority: e.target.value });
                              refreshTask();
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                          >
                            <option value="HIGH">High Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="LOW">Low Priority</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Tags</label>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {task.tags?.map(tag => (
                              <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-widest flex items-center gap-1" style={{ borderColor: tag.color, backgroundColor: `${tag.color}10`, color: tag.color }}>
                                {tag.name}
                                <button onClick={async () => {
                                  const newTagIds = task.tags?.filter(t => t.id !== tag.id).map(t => t.id);
                                  await projectsApi.updateTask(task.uid, { tag_ids: newTagIds });
                                  refreshTask();
                                }} className="hover:text-red-500">✕</button>
                              </span>
                            ))}
                          </div>
                          <select 
                            value="" 
                            onChange={async (e) => {
                              if (!e.target.value) return;
                              const tagId = parseInt(e.target.value);
                              if (task.tags?.some(t => t.id === tagId)) return;
                              const currentTagIds = task.tags?.map(t => t.id) || [];
                              await projectsApi.updateTask(task.uid, { tag_ids: [...currentTagIds, tagId] });
                              refreshTask();
                            }}
                            className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                          >
                            <option value="" disabled>Add a tag...</option>
                            {taskTags?.filter(t => !task.tags?.some(tt => tt.id === t.id)).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Execution Directives</label>
                        <textarea
                          rows={4}
                          value={task.description || ""}
                          onChange={(e) => setTask({...task, description: e.target.value})}
                          onBlur={async () => {
                            await projectsApi.updateTask(task.uid, { description: task.description });
                            refreshTask();
                          }}
                          placeholder="Add architectural requirements..."
                          className="w-full p-4 bg-surface-50 border border-surface-200 rounded-2xl outline-none focus:border-accent font-medium text-sm text-primary resize-none transition-colors leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Communication Side Panel */}
                  <div className="w-[380px] shrink-0 border-l border-surface-200 pl-8 hidden lg:flex flex-col h-full">
                    <TaskCommunicationPanel task={task} onCommentAdded={refreshTask} />
                  </div>
                </div>
              )}

              {/* CHECKLISTS TAB */}
              {activeTab === "checklist" && (
                <div className="max-w-4xl space-y-4">
                  <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
                    {checklists.length === 0 ? (
                      <div className="p-8 text-center text-surface-400">
                        <p className="text-3xl mb-2">📋</p>
                        <p className="text-sm font-bold">No checklist items yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-surface-100">
                        {checklists.map((item: any) => (
                          <div key={item.id} className="flex flex-col gap-2 p-4 hover:bg-surface-50 transition-colors group border-b border-surface-100 last:border-0">
                            <label className="flex items-start gap-4 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.is_completed}
                                onChange={() => handleToggleChecklist(item)}
                                disabled={isContractor && task.status !== "WIP" || isUpdating}
                                className="w-5 h-5 mt-0.5 rounded border-surface-300 accent-accent shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-semibold transition-colors ${item.is_completed ? "line-through text-surface-400" : "text-primary group-hover:text-accent"}`}>
                                    {item.title || item.description}
                                  </p>
                                  {item.requires_visual_proof && (
                                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">📸 Proof Req.</span>
                                  )}
                                </div>
                                {item.is_completed && item.completed_by && (
                                  <p className="text-[10px] text-surface-400 mt-1">Completed by {item.completed_by.email}</p>
                                )}
                              </div>
                              {item.is_completed && (
                                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </label>
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="flex gap-2 ml-9 mt-1">
                                {item.attachments.map((att: any) => (
                                  <button 
                                    key={att.id} 
                                    onClick={() => setLightboxImageUrl(att.file)}
                                    className="w-12 h-12 rounded overflow-hidden border border-surface-200 block hover:opacity-80 transition-opacity cursor-pointer focus:outline-none shrink-0"
                                  >
                                    <img src={att.file} className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {(isAdmin || isArchitect || isQA) && (
                    <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 p-4 shadow-sm">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newChecklistDesc}
                          onChange={e => setNewChecklistDesc(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddChecklistItem()}
                          placeholder="Add verification checkpoint..."
                          className="flex-1 h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-medium text-primary"
                        />
                        <button
                          onClick={handleAddChecklistItem}
                          disabled={!newChecklistDesc.trim()}
                          className="h-10 px-4 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-40"
                        >
                          + Add
                        </button>
                      </div>
                      
                      {/* Import Template Section */}
                      <div className="mt-4 pt-4 border-t border-surface-200 flex gap-3 items-center">
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                          className="flex-1 h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-medium text-primary appearance-none"
                        >
                          <option value="" disabled>Import from global template...</option>
                          {checklistTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.items?.length || 0} items)</option>
                          ))}
                        </select>
                        <button
                          onClick={handleImportTemplate}
                          disabled={!selectedTemplateId || isUpdating}
                          className="h-10 px-4 bg-surface-200 text-surface-700 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-surface-300 transition-all disabled:opacity-40 whitespace-nowrap"
                        >
                          {isUpdating ? "Importing..." : "Import"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ISSUES TAB */}
              {activeTab === "issues" && (
                <div className="max-w-4xl space-y-4">
                  {issues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className={`bg-surface-100 border-surface-200 rounded-2xl border p-5 shadow-sm ${
                        issue.severity === "HIGH" && !issue.is_resolved
                          ? "border-red-300 bg-red-50 dark:bg-red-900/20/30"
                          : "border-surface-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              issue.severity === "HIGH" ? "bg-red-100 text-red-600" :
                              issue.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                              "bg-surface-100 text-surface-500 text-surface-400"
                            }`}>
                              {issue.severity === "HIGH" ? "🚨 Blocker" : issue.severity}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 text-surface-300 border border-surface-200">
                              {issue.issue_type} | {issue.root_cause}
                            </span>
                            {issue.is_resolved && (
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">✓ Resolved</span>
                            )}
                          </div>
                          <h5 className="font-bold text-sm text-primary">{issue.title}</h5>
                          <p className="text-xs text-surface-500 text-surface-400 mt-1 leading-relaxed">{issue.description}</p>
                          {issue.attachments && issue.attachments.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {issue.attachments.map((att: any) => (
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
                        {!issue.is_resolved && isAdmin && (
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="shrink-0 h-8 px-3 bg-emerald-100 text-emerald-700 font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {issues.length === 0 && !showIssueForm && (
                    <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 p-10 text-center shadow-sm">
                      <p className="text-3xl mb-2">🟢</p>
                      <p className="text-sm font-bold text-surface-400">No issue tracker items reported</p>
                    </div>
                  )}

                  {showIssueForm ? (
                    <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 p-5 space-y-4 shadow-sm">
                      <h4 className="text-sm font-bold text-primary">Add Issue Tracker Item</h4>
                      <input
                        type="text"
                        value={newIssueTitle}
                        onChange={e => setNewIssueTitle(e.target.value)}
                        placeholder="Observation title..."
                        className="w-full h-11 bg-surface-50 border border-surface-200 rounded-xl px-4 outline-none focus:border-accent text-sm font-medium"
                      />
                      <textarea
                        value={newIssueDesc}
                        onChange={e => setNewIssueDesc(e.target.value)}
                        placeholder="Describe the observation..."
                        rows={3}
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 outline-none focus:border-accent text-sm font-medium resize-none"
                      />
                      <div className="grid grid-cols-3 gap-3 items-center">
                        <select
                          value={newIssueType}
                          onChange={e => setNewIssueType(e.target.value)}
                          className="h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-bold text-primary"
                        >
                          <option value="QUALITY">Quality</option>
                          <option value="SAFETY">Safety</option>
                          <option value="DESIGN">Design</option>
                          <option value="PROCUREMENT">Procurement</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <select
                          value={newRootCause}
                          onChange={e => setNewRootCause(e.target.value)}
                          className="h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-bold text-primary"
                        >
                          <option value="POOR_WORKMANSHIP">Poor Workmanship</option>
                          <option value="WEATHER">Weather</option>
                          <option value="MATERIAL_DEFECT">Material Defect</option>
                          <option value="SCOPE_GAP">Scope Gap</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <select
                          value={newIssueSeverity}
                          onChange={e => setNewIssueSeverity(e.target.value as any)}
                          className="h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-bold text-primary"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High / Blocker</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest block mb-2">Photo Evidence</label>
                        <input type="file" ref={photoRef} accept="image/*" multiple className="text-sm font-bold text-surface-500 text-surface-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-surface-100 file:text-primary hover:file:bg-surface-200" />
                      </div>
                      <div className="flex gap-2 justify-end mt-4">
                        <button onClick={() => setShowIssueForm(false)} className="h-9 px-4 text-surface-500 text-surface-400 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-surface-100 transition-all">Cancel</button>
                        <button
                          onClick={handleCreateIssue}
                          disabled={isUpdating}
                          className="h-9 px-5 bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all disabled:opacity-40"
                        >
                          {isUpdating ? "Saving..." : "Add Item"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowIssueForm(true)}
                      className="w-full py-3 border-2 border-dashed border-surface-300 rounded-xl text-surface-500 text-surface-400 font-bold text-xs uppercase tracking-widest hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      + Add Issue Tracker Item
                    </button>
                  )}
                </div>
              )}

              {/* HSE TAB */}
              {activeTab === "hse" && (
                <TaskHSETab task={task} projectUid={projectUid} />
              )}

              {/* DIARY TAB */}
              {activeTab === "diary" && (
                <TaskFieldDiaryTab task={task} projectUid={projectUid} />
              )}

              {/* BOQ / MATERIALS TAB */}
              {activeTab === "boq" && (
                <div className="max-w-4xl space-y-4">
                  <TaskMaterialTab 
                    task={task}
                    isMatrixTask={isMatrixTask}
                    estimatedCost={estimatedCost}
                    burnCost={burnCost}
                    variance={variance}
                    isOverBudget={isOverBudget}
                    onRefreshTask={refreshTask}
                    isContractor={isContractor}
                    isAdmin={isAdmin}
                    phaseId={selectedPhaseId ? parseInt(selectedPhaseId) : undefined}
                  />
                </div>
              )}

              {/* SUBTASKS TAB */}
              {activeTab === "subtasks" && (
                <div className="flex flex-col gap-6 max-w-4xl mx-auto h-[calc(100vh-280px)]">
                  <div className="flex items-center justify-between bg-surface-100 border-surface-200 p-6 rounded-2xl border border-surface-200 shadow-sm">
                    <div>
                      <h3 className="text-xl font-bold text-primary">Subtasks</h3>
                      <p className="text-xs text-surface-500 text-surface-400 font-medium mt-1">Break this task down into smaller actionable steps.</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2">
                    {task.subtasks && task.subtasks.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                        {task.subtasks.map((subtask: any) => (
                          <div 
                            key={subtask.uid} 
                            onClick={() => {
                              const nextStatus = subtask.status === "DONE" ? "TODO" : subtask.status === "TODO" ? "WIP" : "DONE";
                              handleUpdateSubtask(subtask.uid, { status: nextStatus });
                            }}
                            className={`p-5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${
                              subtask.status === "DONE" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30" :
                              subtask.status === "WIP" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30" :
                              "bg-surface-100 border-surface-200 border-surface-200 hover:border-accent"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <h4 className={`text-sm font-bold ${subtask.status === "DONE" ? "text-surface-500 text-surface-400 line-through" : "text-primary"}`}>{subtask.title}</h4>
                              <span className={`shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${
                                subtask.status === "DONE" ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:border-emerald-800/30" :
                                subtask.status === "WIP" ? "bg-blue-100 text-blue-700 border-blue-200 dark:border-blue-800/30" :
                                "bg-surface-100 text-surface-500 text-surface-400 border-surface-200"
                              }`}>
                                {subtask.status}
                              </span>
                            </div>
                            {subtask.description && (
                              <p className={`text-xs mt-2 line-clamp-3 ${subtask.status === "DONE" ? "text-emerald-700/60" : "text-surface-500 text-surface-400"}`}>{subtask.description}</p>
                            )}
                            {subtask.assigned_to && (
                              <Link href={`/dashboard/team/${subtask.assigned_to.id}`} className="mt-4 flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <div className="w-5 h-5 rounded-full bg-accent text-background flex items-center justify-center text-[8px] font-bold uppercase">
                                  {subtask.assigned_to.name.charAt(0)}
                                </div>
                                <span className={`text-[10px] font-bold hover:underline ${subtask.status === "DONE" ? "text-emerald-700/60" : "text-surface-500 text-surface-400"}`}>{subtask.assigned_to.name}</span>
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
                        <svg className="w-8 h-8 text-surface-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <p className="text-surface-500 text-surface-400 font-medium text-sm">No subtasks added yet.</p>
                      </div>
                    )}
                  </div>

                  {(isAdmin || isArchitect) && (
                    <div className="bg-surface-50 p-5 rounded-2xl border border-surface-200 shadow-inner shrink-0">
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const title = formData.get("title") as string;
                          const description = formData.get("description") as string;
                          if (title.trim()) {
                            handleCreateSubtask(title.trim(), description?.trim() || "");
                            e.currentTarget.reset();
                          }
                        }}
                        className="flex flex-col gap-3"
                      >
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-surface-500 text-surface-400">Create Subtask</h4>
                        <input
                          type="text"
                          name="title"
                          placeholder="Subtask title..."
                          className="bg-surface-100 border-surface-200 border border-surface-200 rounded-lg px-4 py-2.5 text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-surface-400 placeholder:font-medium transition-all"
                          required
                          disabled={isUpdating}
                        />
                        <textarea
                          name="description"
                          placeholder="Description (optional)..."
                          rows={2}
                          className="bg-surface-100 border-surface-200 border border-surface-200 rounded-lg px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-surface-400 transition-all resize-none"
                          disabled={isUpdating}
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isUpdating}
                            className="px-6 py-2.5 bg-accent text-background text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-accent transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                            Add Subtask Card
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* TIME TAB */}
              {activeTab === "time" && (
                <div className="max-w-4xl space-y-4">
                  <TaskTimeLogTab 
                    task={task} 
                    onUpdate={() => {
                      refreshTask();
                    }} 
                  />
                </div>
              )}

              {/* DRAWING TAB */}
              {activeTab === "drawing" && isMatrixTask && (
                <div className="w-full h-full overflow-y-auto pb-4">
                  <div className={`grid gap-6 h-full min-h-0 ${(linked2dPlanLinks.length > 0) && linked3dModel ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 max-w-4xl'}`}>
                  {/* 2D Plan Section */}
                  {linked2dPlanLinks.length > 0 && (
                    <div className="flex-none flex flex-col min-h-[500px] bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 shadow-sm overflow-hidden p-4 shrink-0">
                      <div className="flex justify-between items-center mb-4 shrink-0">
                        <div>
                          <h4 className="text-sm font-bold text-primary">Linked 2D Plans</h4>
                          <p className="text-[10px] text-surface-400 uppercase tracking-widest font-bold">{linked2dPlanLinks.length} drawing{linked2dPlanLinks.length > 1 ? 's' : ''} attached</p>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {linked2dPlanLinks.map(link => {
                          const asset = link.latest_asset;
                          if (!asset) return null;
                          return (
                            <div key={link.id} className="border border-surface-200 rounded-xl overflow-hidden bg-surface-50 p-3 shadow-sm">
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="text-xs font-bold text-primary truncate pr-4">{asset.title}</h5>
                                <button 
                                  onClick={() => handleUnlinkDrawing(link.id)}
                                  disabled={isLinking}
                                  className="h-7 px-3 shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
                                >
                                  Unlink
                                </button>
                              </div>
                              <div className="relative min-h-[350px]">
                                <FloorPlanGridViewer 
                                  asset={asset} 
                                  projectId={projectId}
                                  inline 
                                  onRefresh={refreshTask} 
                                  onToggleFullScreen={() => setFullScreenDrawingId(asset.canonical_uid)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3D Model Section */}
                  {linked3dModel && (
                    <div className="flex-none flex flex-col min-h-[500px] bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 shadow-sm overflow-hidden p-4 shrink-0">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="text-sm font-bold text-primary">{linked3dModel.title}</h4>
                          <p className="text-[10px] text-surface-400 uppercase tracking-widest font-bold">Linked 3D Model</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsFullScreen3D(true)}
                            className="h-8 px-4 bg-surface-100 text-surface-600 text-surface-300 font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-surface-200 hover:text-primary transition-all"
                          >
                            Full Screen
                          </button>
                          <button 
                            onClick={() => handleUnlinkDrawing(linked3dModelLink!.id)}
                            disabled={isLinking}
                            className="h-8 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
                          >
                            Unlink
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 relative min-h-[400px] rounded-xl overflow-hidden border border-surface-200 bg-slate-50">
                        {!isFullScreen3D && (
                          <ModelViewer 
                            url={linked3dModel.file} 
                            format={
                              linked3dModel.category === 'sh3d' ? 'sh3d' :
                              linked3dModel.file.toLowerCase().endsWith('.obj') ? 'obj' : 'glb'
                            } 
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linking UI */}
                  {projectAssets.filter(a => 
                    (a.category === "2d_plan" && !linked2dPlanUids.has(a.canonical_uid)) || 
                    ((a.category === "3d_model" || a.category === "sh3d") && !linked3dModel)
                  ).length > 0 && (
                    <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 p-10 text-center shadow-sm space-y-6 shrink-0">
                      <div>
                        <p className="text-3xl mb-2">📐</p>
                        <p className="text-sm font-bold text-surface-400">Context & Models</p>
                        <p className="text-xs text-surface-400 mt-2">Link 2D Floorplans or 3D Models to this task.</p>
                      </div>
                      
                      <div className="max-w-sm mx-auto p-5 bg-surface-50 rounded-xl border border-surface-200 text-left space-y-4">
                        <label className="block text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Select Asset to Link</label>
                        <select 
                          value={selectedAssetToLink}
                          onChange={e => setSelectedAssetToLink(e.target.value)}
                          className="w-full h-11 bg-surface-100 border-surface-200 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                        >
                          <option value="" disabled>Select Asset...</option>
                          {projectAssets
                            .filter(a => 
                              (a.category === "2d_plan" && !linked2dPlanUids.has(a.canonical_uid)) || 
                              ((a.category === "3d_model" || a.category === "sh3d") && !linked3dModel)
                            )
                            .map(a => (
                              <option key={a.canonical_uid} value={a.canonical_uid}>{(a.category === "3d_model" || a.category === "sh3d") ? "🏛️ " : "📐 "}{a.title}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleLinkDrawing}
                          disabled={!selectedAssetToLink || isLinking}
                          className="w-full h-11 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-40"
                        >
                          {isLinking ? "Linking..." : "Link Asset"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DEPENDENCIES TAB */}
            {activeTab === "dependencies" && (
              <div className="max-w-4xl space-y-6">
                <div className="bg-surface-100 border-surface-200 p-6 rounded-2xl border border-surface-200 shadow-sm">
                  <h3 className="text-xl font-bold text-primary mb-2">Task Dependencies</h3>
                  <p className="text-xs text-surface-500 text-surface-400 font-medium mb-6">
                    Select tasks that must be completed before this task can begin. The backend will automatically detect and prevent cyclic dependencies.
                  </p>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest block mb-2">Predecessor Tasks</label>
                    
                    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto border border-surface-200 rounded-xl p-2 bg-surface-50">
                      {projectTasks.filter(t => t.uid !== task.uid).map(pt => (
                        <label key={pt.uid} className="flex items-center gap-3 p-3 bg-surface-100 border-surface-200 border border-surface-100 rounded-lg cursor-pointer hover:border-accent transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedDependencyUids.includes(pt.uid)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDependencyUids(prev => [...prev, pt.uid]);
                              } else {
                                setSelectedDependencyUids(prev => prev.filter(uid => uid !== pt.uid));
                              }
                            }}
                            className="w-5 h-5 rounded border-surface-300 text-accent focus:ring-accent"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-primary truncate">{pt.title}</p>
                            <p className="text-[10px] text-surface-400 font-mono mt-0.5">{pt.task_code || pt.uid.slice(0,8)}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md border ${
                            pt.status === "DONE" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800/30" :
                            "bg-surface-100 text-surface-500 text-surface-400 border-surface-200"
                          }`}>
                            {pt.status}
                          </span>
                        </label>
                      ))}
                      {projectTasks.length <= 1 && (
                        <div className="p-4 text-center text-surface-500 text-surface-400 text-xs font-medium">
                          No other tasks available in this project to link.
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSaveDependencies}
                        disabled={isSavingDependencies}
                        className="h-11 px-6 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-md disabled:opacity-50"
                      >
                        {isSavingDependencies ? "Saving..." : "Save Dependencies"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PHOTOS TAB */}
            {activeTab === "photos" && (
              <TaskPhotosTab task={task} projectId={projectId} onRefresh={refreshTask} />
            )}

            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Full Screen Drawing Modal Overlay */}
      {fullScreenDrawingId && (
        <FloorPlanGridViewer 
          asset={linked2dPlanLinks.find(l => l.latest_asset?.canonical_uid === fullScreenDrawingId)?.latest_asset!} 
          onClose={() => setFullScreenDrawingId(null)} 
          onRefresh={refreshTask} 
        />
      )}

      {/* Full Screen 3D Model Modal Overlay */}
      {isFullScreen3D && linked3dModel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-100 border-surface-200 w-full max-w-6xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setIsFullScreen3D(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-surface-100 border-surface-200/50 hover:bg-surface-100 border-surface-200 rounded-full flex items-center justify-center text-lg shadow-sm transition-colors text-surface-900 font-bold"
            >
              ✕
            </button>
            <div className="flex-1 w-full h-full bg-slate-100">
              <ModelViewer 
                url={linked3dModel.file} 
                format={
                  linked3dModel.category === 'sh3d' ? 'sh3d' :
                  linked3dModel.file.toLowerCase().endsWith('.obj') ? 'obj' : 'glb'
                } 
              />
            </div>
          </div>
        </div>
      )}

      {/* Checklist Proof Modal */}
      {checklistProofModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-100 border-surface-200 w-full max-w-md rounded-2xl flex flex-col overflow-hidden shadow-2xl relative p-6 space-y-6">
            <h3 className="text-xl font-bold text-primary tracking-tight">Visual Proof Required</h3>
            <p className="text-sm text-surface-600 text-surface-300 leading-relaxed">
              To verify <strong className="text-primary">"{checklistProofModal.title}"</strong>, please upload photo evidence of the completed work.
            </p>
            <div>
              <input type="file" ref={checklistPhotoRef} accept="image/*" multiple className="w-full text-sm font-bold text-surface-500 text-surface-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-surface-100 file:text-primary hover:file:bg-surface-200" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setChecklistProofModal(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest text-surface-500 text-surface-400 hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmChecklistProof}
                disabled={isUpdating}
                className="px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest bg-accent text-background shadow-lg shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {isUpdating ? "Verifying..." : "Verify & Complete"}
              </button>
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
      </>
  );
};
