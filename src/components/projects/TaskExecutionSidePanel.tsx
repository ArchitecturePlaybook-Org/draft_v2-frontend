import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, ProjectAsset, TaskChecklistItem, SpatialZone, MilestonePhase, ChecklistTemplate, TaskComment } from "@/types/projects";
import { usePermissions } from "@/hooks/use-permissions";
import { useInfiniteScrollBatch } from "@/hooks/useInfiniteScrollBatch";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { FloorPlanGridViewer } from "./FloorPlanGridViewer";

import { TaskCommunicationPanel } from "./TaskCommunicationPanel";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import dynamic from "next/dynamic";

const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-500">
      Loading 3D Viewer...
    </div>
  )
});

import { TaskFieldDiaryTab } from "./TaskFieldDiaryTab";
import { TaskChecklistTab } from "./task-panel/TaskChecklistTab";
import { TaskSubtasksTab } from "./task-panel/TaskSubtasksTab";
import Link from "next/link";
import { useProjectNavStore } from "@/store/project-nav-store";

interface TaskExecutionSidePanelProps {
  task: Task;
  projectId: number;
  projectUid: string;
  projectAssets: ProjectAsset[];
  projectTasks: Task[];
  taskTags: any[];
  onClose: () => void;
  onTaskUpdated: () => void;
  /** When true: left-anchored split-pane mode (Matrix workspace) */
  splitMode?: boolean;
  /** Left anchor in px — equals navWidth (280 expanded / 80 collapsed) */
  leftOffset?: number;
  /** Width controlled externally by the split ratio. Replaces internal panelWidth. */
  panelWidthOverride?: number;
  readOnly?: boolean;
  /** When true: subtask panel positioned on left side while parent task stays on right */
  isSubtaskPanel?: boolean;
}

type TaskTab = "execution" | "subtasks" | "checklist" | "drawing" | "diary";


export const TaskExecutionSidePanel: React.FC<TaskExecutionSidePanelProps> = ({
  task: initialTask,
  projectId,
  projectUid,
  projectAssets,
  projectTasks,
  taskTags,
  onClose,
  onTaskUpdated,
  splitMode = false,
  leftOffset = 0,
  panelWidthOverride,
  readOnly = false,
  isSubtaskPanel = false,
}) => {
  const { isSidebarCollapsed } = useProjectNavStore();
  const NAV_W = isSidebarCollapsed ? 80 : 280;

  const [manualWidth, setManualWidth] = useState<number | null>(null);
  const defaultWidth = typeof window !== "undefined" ? window.innerWidth - NAV_W : 800;
  const panelWidth = manualWidth ?? defaultWidth;

  const { isAdmin, hasGlobalPermission, canEditProject } = usePermissions();
  const [task, setTask] = useState<Task>(initialTask);

  React.useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const [activeTab, setActiveTab] = useState<TaskTab>("execution");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [isCopied, setIsCopied] = useState(false);

  // Matrix specific state
  const [newChecklistDesc, setNewChecklistDesc] = useState("");
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
  const [selectedSubtask, setSelectedSubtask] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      await projectsApi.deleteTask(task.uid);
      toast.success("Task soft-deleted successfully");
      setShowDeleteModal(false);
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };


  const isMatrixTask = task.block !== null && task.block !== undefined;
  const isArchitect = true; // Temporary bypass since we don't have full ProjectDetail here
  const isContractor = false;
  const isQA = false;

  React.useEffect(() => {
    setTask(initialTask);
    setCurrentStatus(initialTask.status);
  }, [initialTask]);

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
  }, [projectUid, task.block, isAdmin, isQA, projectTasks]);

  const handleUpdateMatrixLocation = async (zId: string, pId: string) => {
    if (!zId && !pId) return;
    try {
      await projectsApi.updateTask(task.uid, {
        zone_id: zId ? parseInt(zId) : undefined,
        phase_id: pId ? parseInt(pId) : undefined
      });
      await refreshTask();
      toast.success("Matrix location updated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update matrix location.");
    }
  };

  const refreshTask = async () => {
    try {
      const updated = await projectsApi.getTask(task.uid);
      setTask(updated);
      const { useProjectStore } = await import("@/store/project-store");
      useProjectStore.getState().setActiveTask(updated);
      onTaskUpdated();
    } catch { /* silent */ }
  };

  const handleStatusChange = async (newStatus: string) => {
    const previousStatus = currentStatus;
    setCurrentStatus(newStatus as any);
    setIsUpdating(true);
    try {
      await projectsApi.updateTask(task.uid, { status: newStatus });
      // Sync the new status into the Zustand store so the Kanban board
      // moves this task card to the correct column instantly (no page refresh needed).
      const { useProjectStore } = await import("@/store/project-store");
      useProjectStore.getState().updateTaskStatus(task.uid, newStatus);
      await refreshTask();
    } catch (err) {
      console.error(err);
      setCurrentStatus(previousStatus);
      toast.error("Protocol failed: Could not synchronize status.");
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
    if (!newChecklistDesc.trim() || isUpdating) return;
    setIsUpdating(true);
    try {
      await projectsApi.createChecklistItem(task.uid, newChecklistDesc.trim());
      setNewChecklistDesc("");
      await refreshTask();
      toast.success("Checklist item added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add item.");
    } finally {
      setIsUpdating(false);
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



  const handleCreateSubtask = async (title: string, description: string = "") => {
    setIsUpdating(true);
    try {
      const payload: any = {
        title: title,
        description: description,
        parent_task_id: task.id,
        parent_task: task.uid || task.id,
      };
      if (projectId && Number(projectId) > 0) {
        payload.project = Number(projectId);
      }
      const createdSubtask = await projectsApi.createTask(payload);

      if (createdSubtask) {
        setTask(prev => ({
          ...prev,
          subtasks: [...(prev.subtasks || []), createdSubtask]
        }));
      }

      await refreshTask();
      toast.success("Subtask created successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to create subtask.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSubtask = async (subtaskUid: string, data: any) => {
    setTask(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).map(st => st.uid === subtaskUid ? { ...st, ...data } : st)
    }));

    setIsUpdating(true);
    try {
      await projectsApi.updateTask(subtaskUid, data);
      await refreshTask();
    } catch (err: any) {
      toast.error(err.message || "Failed to update subtask.");
      await refreshTask();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubtask = async (subtaskUid: string) => {
    setIsUpdating(true);
    try {
      await projectsApi.deleteTask(subtaskUid);
      setTask(prev => ({
        ...prev,
        subtasks: (prev.subtasks || []).filter(st => st.uid !== subtaskUid)
      }));
      await refreshTask();
      toast.success("Subtask soft-deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete subtask");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/share/task/${task.uid}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
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

  // Matrix variables
  const checklists = task.checklists || [];
  const uncheckedCount = checklists.filter((i: any) => !i.is_completed).length;

  const tabs: { id: TaskTab; label: string; hidden?: boolean }[] = [
    { id: "execution", label: isSubtaskPanel ? "Subtask Details & Timeline" : (isMatrixTask ? "Timeline & Directives" : "Execution Details") },
    { id: "subtasks", label: "Subtasks", hidden: isSubtaskPanel },
    { id: "checklist", label: "Checklists & Action Steps" },
    { id: "diary", label: "Field Diary", hidden: isSubtaskPanel },
    { id: "drawing", label: "Context & Models", hidden: !isMatrixTask && !isSubtaskPanel },
  ];

  const linked2dPlanLinks = task.asset_links?.filter(l => l.latest_asset?.category === "2d_plan") || [];
  const linked3dModelLink = task.asset_links?.find(l => l.latest_asset?.category === "3d_model" || l.latest_asset?.category === "sh3d");
  const linked3dModel = linked3dModelLink?.latest_asset;

  const linked2dPlanUids = new Set(linked2dPlanLinks.map(l => l.latest_asset?.canonical_uid));

  const {
    visibleItems: visiblePlanLinks,
    hasMore: hasMorePlans,
    isLoadingMore: isLoadingMorePlans,
    sentinelRef: plansSentinelRef,
    loadedCount: loadedPlanCount,
    totalCount: totalPlanCount,
  } = useInfiniteScrollBatch(linked2dPlanLinks, { resetKey: task.uid });

  // ── Split-pane vs standalone vs overlay layout ──────────────────────────
  const isParentWithActiveSubtask = !!selectedSubtask;
  const effectiveWidth = splitMode && panelWidthOverride 
    ? panelWidthOverride 
    : panelWidth;

  const slideX = "100%";

  const panelStyle = isSubtaskPanel
    ? { right: 0, width: effectiveWidth, transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }
    : splitMode
      ? { left: leftOffset, width: effectiveWidth, transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)" }
      : { right: 0, width: panelWidth, transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" };

  const panelClass = isSubtaskPanel
    ? "fixed top-0 right-0 bottom-0 z-[70] bg-background shadow-2xl flex flex-col border-l border-surface-200 min-w-0 overflow-hidden"
    : splitMode
      ? "fixed top-0 bottom-0 z-[45] bg-background shadow-2xl flex flex-col border-r border-surface-200 min-w-0 overflow-hidden"
      : "fixed top-0 right-0 bottom-0 z-50 bg-background shadow-2xl flex flex-col border-l border-surface-200 min-w-0 overflow-hidden";

  return (
    <>
      {/* Backdrop — hidden in splitMode (parent's shared backdrop handles dismissal) */}
      {!splitMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-2xl"
        />
      )}
      <motion.div
        initial={{ x: slideX, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slideX, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={panelStyle}
        className={panelClass}
      >
        {/* Resize Handle — hidden in splitMode (shared handle in MilestoneMatrixView takes over) */}
        {!splitMode && (
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/50 z-50 transition-colors"
            onPointerDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = panelWidth;
              const handleMove = (moveEvent: PointerEvent) => {
                const delta = startX - moveEvent.clientX;
                setManualWidth(Math.max(400, Math.min(window.innerWidth - NAV_W, startWidth + delta)));
              };
              const handleUp = () => {
                window.removeEventListener("pointermove", handleMove);
                window.removeEventListener("pointerup", handleUp);
              };
              window.addEventListener("pointermove", handleMove);
              window.addEventListener("pointerup", handleUp);
            }}
          />
        )}

        {/* Header */}
        <div className={`sticky top-0 z-50 border-b border-surface-200 bg-surface-50/80 bg-background/80 backdrop-blur-2xl flex flex-col gap-4 shrink-0 relative min-w-0 w-full shadow-sm ${splitMode ? "px-4 py-4" : "px-4 sm:px-8 py-5 sm:py-6"}`}>
          <div className="absolute -top-20 -right-20 w-64 h-64 arch-grid opacity-5 pointer-events-none" />

          <div className="relative z-10 min-w-0 w-full">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
              {isSubtaskPanel && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0 shadow-sm">
                  ↳ Subtask
                </span>
              )}
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md border shrink-0 ${currentStatus === "DONE" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800/30" :
                  currentStatus === "ON_HOLD" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800/30" :
                    currentStatus === "WIP" ? "bg-accent/10 text-accent border-accent/20" :
                      currentStatus === "QA" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-200 dark:border-purple-800/30" :
                        "bg-surface-200 text-surface-600 text-surface-300 border-surface-300"
                }`}>
                {currentStatus === "ON_HOLD" ? "ON HOLD" : currentStatus}
              </span>
              {task.trade && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white shrink-0 max-w-full truncate"
                  style={{ backgroundColor: task.trade.color_hex }}>
                  {task.trade.name}
                </span>
              )}
              {task.has_active_blocker && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse shrink-0">
                  🚨 Blocker
                </span>
              )}
              <span className="text-[10px] font-mono text-surface-400 truncate max-w-full">ID: {task.task_code || task.uid}</span>
            </div>
            <h2 className={`font-extrabold text-primary tracking-tight truncate ${splitMode || isSubtaskPanel ? "text-lg sm:text-xl" : "text-xl sm:text-2xl md:text-3xl"}`} title={task.title}>{task.title}</h2>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 w-full">
            <div className="flex bg-surface-200/50 p-1 rounded-xl border border-surface-200 shrink-0">
              {["TODO", "ON_HOLD", "WIP", "QA", "DONE"].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isUpdating}
                  className={`${splitMode ? "px-2 py-1.5" : "px-2.5 sm:px-4 py-2"} text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${currentStatus === s ? "bg-surface-100 border-surface-200 shadow-xl text-primary" : "text-surface-500 text-surface-400 hover:text-primary"
                    }`}
                >
                  {s === "ON_HOLD" ? "ON HOLD" : s}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopyLink}
              className={`${splitMode ? "h-9 px-3" : "h-10 sm:h-11 px-3 sm:px-6"} font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 whitespace-nowrap shrink-0 ${isCopied
                  ? "bg-emerald-600 text-white shadow-emerald-500/20 scale-[1.02]"
                  : "bg-accent text-background hover:opacity-90"
                }`}
            >
              {isCopied ? "✓" : splitMode ? "🔗" : "🔗 Copy Link"}
            </button>

            {!readOnly && (isAdmin || isArchitect) && (
              <button
                onClick={() => setShowDeleteModal(true)}
                title="Soft Delete Task"
                className={`${splitMode ? "w-9 h-9" : "w-10 h-10 sm:w-11 sm:h-11"} rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold shadow-sm shrink-0 border border-red-200 dark:border-red-800/30`}
              >
                🗑️
              </button>
            )}

            <button onClick={onClose} className={`${splitMode ? "w-9 h-9" : "w-10 h-10 sm:w-11 sm:h-11"} rounded-xl bg-surface-200 text-surface-600 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold shadow-sm shrink-0`}>
              ✕
            </button>
          </div>
        </div>

        {/* Layout: Main Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col bg-surface-100 border-surface-200 overflow-hidden">
            {/* Tabs */}
            <div className={`flex border-b border-surface-200 bg-surface-100 pt-4 pb-2 shrink-0 overflow-x-auto gap-2 custom-scrollbar ${splitMode ? "px-4" : "px-8"}`}>
              {tabs.filter(t => !t.hidden).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TaskTab)}
                  className={`relative px-5 py-2.5 font-bold text-[10px] tracking-widest uppercase transition-colors whitespace-nowrap flex items-center gap-2 rounded-full z-10 ${activeTab === tab.id ? "text-background" : "text-surface-500 hover:text-primary hover:bg-surface-200/50"
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
                    {/* Subtask Header Overview Card */}
                    {isSubtaskPanel && (
                      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-6 rounded-2xl shadow-sm space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shadow-sm">
                              ↳
                            </span>
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Parent Task Context</span>
                              <h4 className="text-sm font-extrabold text-primary dark:text-white truncate max-w-md">
                                {initialTask.parent_task?.title || "Parent Task"}
                              </h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-background/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700">
                            <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Subtask Progress</span>
                            <span className="text-xs font-black text-primary dark:text-white">
                              {currentStatus === "DONE" ? "100%" : currentStatus === "QA" ? "75%" : currentStatus === "WIP" ? "50%" : currentStatus === "ON_HOLD" ? "25%" : "0%"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Matrix Location */}
                    {!isSubtaskPanel && (
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
                  )}

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
                                const val = e.target.value;
                                setTask(prev => ({ ...prev, start_date: val }));
                                try {
                                  await projectsApi.updateTask(task.uid, { start_date: val });
                                  await refreshTask();
                                  toast.success("Start date updated.");
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to update start date.");
                                }
                              }}
                              className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Due Date</label>
                            <input
                              type="date"
                              value={task.end_date || task.due_date || ""}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setTask(prev => ({ ...prev, end_date: val, due_date: val }));
                                try {
                                  await projectsApi.updateTask(task.uid, { end_date: val, due_date: val });
                                  await refreshTask();
                                  toast.success("Due date updated.");
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to update due date.");
                                }
                              }}
                              className="w-full h-11 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Priority</label>
                            <select
                              value={task.priority || "MEDIUM"}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setTask(prev => ({ ...prev, priority: val as any }));
                                try {
                                  await projectsApi.updateTask(task.uid, { priority: val });
                                  await refreshTask();
                                  toast.success("Priority updated.");
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to update priority.");
                                }
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
                                    try {
                                      await projectsApi.updateTask(task.uid, { tag_ids: newTagIds });
                                      await refreshTask();
                                      toast.success("Tag removed.");
                                    } catch (err: any) {
                                      toast.error(err?.message || "Failed to remove tag.");
                                    }
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
                                try {
                                  await projectsApi.updateTask(task.uid, { tag_ids: [...currentTagIds, tagId] });
                                  await refreshTask();
                                  toast.success("Tag added.");
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to add tag.");
                                }
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
                            onChange={(e) => {
                              const val = e.target.value;
                              setTask(prev => ({ ...prev, description: val }));
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              try {
                                await projectsApi.updateTask(task.uid, { description: val });
                                await refreshTask();
                                toast.success("Execution directives saved.");
                              } catch (err: any) {
                                toast.error(err?.message || "Failed to save execution directives.");
                              }
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
                <TaskChecklistTab
                  task={task}
                  checklists={checklists}
                  newChecklistDesc={newChecklistDesc}
                  setNewChecklistDesc={setNewChecklistDesc}
                  handleAddChecklistItem={handleAddChecklistItem}
                  handleToggleChecklist={handleToggleChecklist}
                  isContractor={isContractor}
                  isUpdating={isUpdating}
                  isAdmin={isAdmin}
                  isArchitect={isArchitect}
                  isQA={isQA}
                  checklistTemplates={checklistTemplates}
                  selectedTemplateId={selectedTemplateId}
                  setSelectedTemplateId={setSelectedTemplateId}
                  handleImportTemplate={handleImportTemplate}
                  setLightboxImageUrl={setLightboxImageUrl}
                />
              )}

              {/* DIARY TAB */}
              {activeTab === "diary" && (
                <TaskFieldDiaryTab task={task} projectUid={projectUid} />
              )}


              {/* SUBTASKS TAB */}
              {activeTab === "subtasks" && (
                <TaskSubtasksTab
                  task={task}
                  isUpdating={isUpdating}
                  isAdmin={isAdmin}
                  isArchitect={isArchitect}
                  handleUpdateSubtask={handleUpdateSubtask}
                  handleCreateSubtask={handleCreateSubtask}
                  handleDeleteSubtask={handleDeleteSubtask}
                  onSelectSubtask={(subtask) => setSelectedSubtask(subtask)}
                />
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
                          {visiblePlanLinks.map(link => {
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

                          {hasMorePlans && (
                            <div ref={plansSentinelRef} className="flex flex-col items-center justify-center py-4 gap-2">
                              {isLoadingMorePlans ? (
                                <div className="flex items-center gap-2 text-xs font-bold text-surface-400">
                                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                                  Loading more floor plans...
                                </div>
                              ) : (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
                                  Showing {loadedPlanCount} of {totalPlanCount} — scroll for more
                                </p>
                              )}
                            </div>
                          )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-background border border-surface-200 dark:border-surface-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xl mx-auto">
              🗑️
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-primary dark:text-white">Soft-Delete Task?</h3>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Are you sure you want to delete <strong className="text-primary dark:text-white">"{task.title}"</strong>? It will be hidden from all active views and can be restored if needed.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Task"}
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

      {/* Subtask Slide-in Panel — slides in from the RIGHT */}
      <AnimatePresence>
        {selectedSubtask && (
          <TaskExecutionSidePanel
            key={selectedSubtask.uid}
            task={selectedSubtask}
            projectId={projectId}
            projectUid={projectUid}
            projectAssets={projectAssets}
            projectTasks={projectTasks}
            taskTags={taskTags}
            onClose={() => setSelectedSubtask(null)}
            onTaskUpdated={async () => {
              await refreshTask();
              onTaskUpdated();
            }}
            readOnly={readOnly}
            isSubtaskPanel
          />
        )}
      </AnimatePresence>
    </>
  );
};
