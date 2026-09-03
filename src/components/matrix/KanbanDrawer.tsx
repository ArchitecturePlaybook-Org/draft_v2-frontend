"use client";
import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MilestoneBlockExpanded, Task, TaskStatus,
  MilestonePhase, SpatialZone
} from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { inventoryApi } from "@/domains/inventory/api";
import { TaskMaterialRequirement, MasterMaterial } from "@/domains/inventory/types";
import { DirectPostOpportunityModal } from "@/components/marketplace/DirectPostOpportunityModal";
import { PlaceRequisitionOrderModal } from "@/components/inventory/PlaceRequisitionOrderModal";
import { MaterialIssueModal } from "@/components/inventory/MaterialIssueModal";
import { MaterialDetailModal } from "@/components/inventory/MaterialDetailModal";
import { TaskItem } from "../projects/TaskItem";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import {
  Search, Loader2, Package, Layers, Share2, Receipt, PackageCheck,
  CheckCircle2, Eye, ArrowUpRight, Calculator, ClipboardList, AlertCircle
} from "lucide-react";

interface KanbanDrawerProps {
  block: MilestoneBlockExpanded;
  phase: MilestonePhase;
  zone: SpatialZone;
  isOpen: boolean;
  onClose: () => void;
  onBlockUpdated: (updated: MilestoneBlockExpanded) => void;
  userRole?: "contractor" | "qa_inspector" | "admin" | "viewer";
  projectUid?: string;
  /** Controlled panel width from parent split state */
  width?: number;
  leftOffset?: number;
  /** Bubbles task click up to parent for split-pane rendering */
  onTaskSelect?: (task: Task) => void;
  readOnly?: boolean;
  onUnlockClick?: () => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: "TODO", label: "To Do", color: "border-t-[3px] border-surface-300 bg-transparent", dotColor: "bg-surface-300" },
  { id: "ON_HOLD", label: "On Hold", color: "border-t-[3px] border-amber-500 bg-transparent", dotColor: "bg-amber-500" },
  { id: "WIP", label: "In Progress", color: "border-t-[3px] border-semantic-blue bg-transparent", dotColor: "bg-semantic-blue" },
  { id: "QA", label: "Under Inspection", color: "border-t-[3px] border-accent bg-transparent", dotColor: "bg-accent" },
  { id: "DONE", label: "Done", color: "border-t-[3px] border-semantic-green bg-transparent", dotColor: "bg-semantic-green" },
];

const getUpdatedBlock = (currentBlock: MilestoneBlockExpanded, updatedTasks: Task[]): MilestoneBlockExpanded => {
  const safeTasks = Array.isArray(updatedTasks) ? updatedTasks : [];
  const total = safeTasks.length;
  const completed = safeTasks.filter(t => t?.status === "DONE").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  let status = currentBlock.status;
  if (status !== "LOCKED") {
    status = completed === total && total > 0 ? "DONE" : "ACTIVE";
  }
  return {
    ...currentBlock,
    tasks: safeTasks,
    total_tasks: total,
    completed_tasks: completed,
    progress_percent: progress,
    status,
  };
};

export const KanbanDrawer: React.FC<KanbanDrawerProps> = ({
  block,
  phase,
  zone,
  isOpen,
  onClose,
  onBlockUpdated,
  userRole = "admin",
  projectUid,
  width,
  leftOffset = 0,
  onTaskSelect,
  readOnly = false,
  onUnlockClick,
}) => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>(block.tasks || []);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const isLocked = block.status === "LOCKED" || readOnly;

  // ── Tab state: Tasks Kanban vs Block BOM ──────────────────────────────────
  const [drawerTab, setDrawerTab] = useState<"tasks" | "bom">("tasks");
  const [blockRequirements, setBlockRequirements] = useState<TaskMaterialRequirement[]>([]);
  const [loadingBOM, setLoadingBOM] = useState(false);
  const [showDirectPostModal, setShowDirectPostModal] = useState(false);

  // Modals matching TaskInventoryTrackerTab
  const [selectedReqForIssue, setSelectedReqForIssue] = useState<TaskMaterialRequirement | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [selectedMaterialForView, setSelectedMaterialForView] = useState<MasterMaterial | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingViewId, setLoadingViewId] = useState<string | null>(null);

  const handleViewMaterialDetail = async (materialId: string) => {
    try {
      setLoadingViewId(materialId);
      const res = await inventoryApi.getMaterial(materialId);
      setSelectedMaterialForView(res);
      setShowViewModal(true);
    } catch (e) {
      toast.error("Failed to load material specifications.");
    } finally {
      setLoadingViewId(null);
    }
  };

  // Synchronize tasks whenever block changes
  React.useEffect(() => {
    setTasks(block.tasks || []);
  }, [block.tasks, block.id]);

  // Load requirements for all tasks in this block
  const loadBlockBOM = useCallback(async () => {
    if (!projectUid) return;
    setLoadingBOM(true);
    try {
      let reqs: TaskMaterialRequirement[] = [];
      if (block.id) {
        reqs = await inventoryApi.getTaskRequirements({ project: projectUid, block: block.id });
      }
      
      if (!reqs || reqs.length === 0) {
        const all = await inventoryApi.getTaskRequirements({ project: projectUid });
        const currentTasks = block.tasks || tasks || [];
        const taskIds = new Set(
          currentTasks.flatMap((t) => [
            String((t as any).id || ""),
            String((t as any).uid || ""),
          ]).filter((v) => v !== "" && v !== "undefined" && v !== "null")
        );
        reqs = all.filter((r) => {
          const rTaskId = typeof r.task === "object" && r.task !== null
            ? String((r.task as any).id || (r.task as any).uid || "")
            : String(r.task || (r as any).task_id || "");
          const rTaskUid = typeof r.task === "object" && r.task !== null
            ? String((r.task as any).uid || "")
            : "";
          return taskIds.has(rTaskId) || (rTaskUid !== "" && taskIds.has(rTaskUid));
        });
      }
      setBlockRequirements(reqs);
    } catch (e) {
      console.error("Failed to load block BOM", e);
    } finally {
      setLoadingBOM(false);
    }
  }, [projectUid, block.id, block.tasks, tasks]);

  React.useEffect(() => {
    if (isOpen) {
      loadBlockBOM();
    }
  }, [isOpen, block.id, loadBlockBOM]);

  // Aggregate block requirements by material
  const aggregatedBlockMaterials = React.useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      category: string;
      unit: string;
      rate: number;
      planned: number;
      issued: number;
      balance: number;
      stock: number;
      total: number;
      taskCount: number;
    }>();

    for (const req of blockRequirements) {
      const matId = req.material || req.material_name;
      const planned = Number(req.planned_qty) || 0;
      const issued = Number(req.issued_qty) || 0;
      const balance = planned - issued;
      const rate = Number(req.standard_rate) || 380;
      const stock = Number(req.available_stock) || 0;

      const existing = map.get(matId);
      if (!existing) {
        map.set(matId, {
          id: matId,
          name: req.material_name,
          category: req.material_category || "GENERAL",
          unit: req.material_unit || "BAG",
          rate,
          planned,
          issued,
          balance: Math.max(0, balance),
          stock,
          total: planned * rate,
          taskCount: 1,
        });
      } else {
        existing.planned += planned;
        existing.issued += issued;
        existing.balance += Math.max(0, balance);
        existing.total += planned * rate;
        existing.taskCount += 1;
      }
    }
    return Array.from(map.values());
  }, [blockRequirements]);

  const blockBOMTotalValue = aggregatedBlockMaterials.reduce((acc, curr) => acc + curr.total, 0);

  // ── Task Template pre-fill state ──────────────────────────────────────────
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [taskChecklists, setTaskChecklists] = useState<{ title: string; requires_visual_proof: boolean }[]>([]);
  const [taskSubtasks, setTaskSubtasks] = useState<any[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState("");
  const [newChecklistRequiresProof, setNewChecklistRequiresProof] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDesc, setNewSubtaskDesc] = useState("");
  const [subtaskChecklistInputs, setSubtaskChecklistInputs] = useState<Record<number, string>>({});

  // ── Milestone task allocation ─────────────────────────────────────────────
  const [projectMilestoneTasks, setProjectMilestoneTasks] = useState<Task[]>([]);
  const [milestoneTaskId, setMilestoneTaskId] = useState<number | null>(null);
  const [currentProject, setCurrentProject] = useState<any>(null);

  // ── Bulk planning from milestone templates ─────────────────────────
  const [selectedMilestoneTplId, setSelectedMilestoneTplId] = useState<number | "">("");
  const [tplTasksToCreate, setTplTasksToCreate] = useState<{ id: number; name: string; checked: boolean; default_checklists: any[] }[]>([]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [isBulkPlannerOpen, setIsBulkPlannerOpen] = useState(false);

  // ── Advanced Search & Filter States for Bulk Milestone Planner ─────────────
  const [milestoneSearchQuery, setMilestoneSearchQuery] = useState("");
  const [bulkTaskSearchQuery, setBulkTaskSearchQuery] = useState("");

  // Compute specializations: intersection of user profile specializations and project specializations
  const userSpecIds = React.useMemo(() => {
    const specs = user?.profile?.specializations || (user as any)?.specializations || [];
    return specs
      .map((s: any) => (typeof s === "number" ? s : s?.id))
      .filter((id: any): id is number => typeof id === "number" && !isNaN(id));
  }, [user]);

  const projectSpecIds = React.useMemo(() => {
    const specs = currentProject?.specializations || [];
    return specs
      .map((s: any) => (typeof s === "number" ? s : s?.id))
      .filter((id: any): id is number => typeof id === "number" && !isNaN(id));
  }, [currentProject]);

  const effectiveSpecIds = React.useMemo(() => {
    return Array.from(new Set([...projectSpecIds, ...userSpecIds]));
  }, [userSpecIds, projectSpecIds]);

  // Client-side filtered templates matching user & project specializations
  const filteredTaskTemplates = React.useMemo(() => {
    if (effectiveSpecIds.length === 0) return taskTemplates;
    return taskTemplates.filter((tpl: any) => {
      const rawSpecs = tpl.specializations || tpl.specialization_ids || [];
      const tplSpecs = Array.isArray(rawSpecs)
        ? rawSpecs.map((s: any) => (typeof s === "number" ? s : s?.id))
        : [];
      if (tplSpecs.length === 0) return true; // General template available to all
      return tplSpecs.some((id: number) => effectiveSpecIds.includes(id));
    });
  }, [taskTemplates, effectiveSpecIds]);

  // Milestone templates matching user & project specializations
  const availableMilestoneTemplates = React.useMemo(() => {
    const milestones = filteredTaskTemplates.filter((t: any) => t.is_milestone);
    if (!milestoneSearchQuery.trim()) return milestones;
    const query = milestoneSearchQuery.toLowerCase();
    return milestones.filter(
      (t: any) =>
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
    );
  }, [filteredTaskTemplates, milestoneSearchQuery]);

  // Memoized search filtering for tasks inside selected milestone
  const filteredTplTasksToCreate = React.useMemo(() => {
    if (!bulkTaskSearchQuery.trim()) return tplTasksToCreate;
    const query = bulkTaskSearchQuery.toLowerCase();
    return tplTasksToCreate.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.default_checklists &&
          t.default_checklists.some((c: any) =>
            (typeof c === "string" ? c : c?.title || "").toLowerCase().includes(query)
          ))
    );
  }, [tplTasksToCreate, bulkTaskSearchQuery]);

  // Sync tasks whenever block or block.tasks prop updates, and fetch fresh task data
  React.useEffect(() => {
    if (block?.tasks) {
      setTasks(block.tasks.filter((t: any) => t && !t.is_deleted));
    }
    if (block?.id) {
      projectsApi.getBlockTasks(block.id)
        .then((fetchedTasks) => {
          if (Array.isArray(fetchedTasks) && fetchedTasks.length > 0) {
            setTasks(fetchedTasks.filter((t: any) => t && !t.is_deleted));
          }
        })
        .catch(() => { });
    }
  }, [block?.id, block?.tasks]);

  // Fetch project details for specializations filtering
  React.useEffect(() => {
    if (projectUid) {
      projectsApi.getProjectDetails(projectUid).then(setCurrentProject).catch(() => { });
    }
  }, [projectUid]);

  // Fetch all task templates so milestone packages and all allocated sub-tasks are loaded into memory
  React.useEffect(() => {
    Promise.all([
      projectsApi.getTaskTemplates(),
      projectsApi.getOrgTaskTemplates()
    ]).then(([gData, oData]) => {
      const gList = Array.isArray(gData) ? gData : (gData?.results ?? []);
      const oList = Array.isArray(oData) ? oData : (oData?.results ?? []);
      setTaskTemplates([...gList, ...oList]);
    }).catch(() => { });
  }, []);

  // Fetch milestone tasks for this project so users can allocate tasks to one
  React.useEffect(() => {
    if (projectUid) {
      projectsApi.getTasks({ project: projectUid })
        .then((all: Task[]) => {
          setProjectMilestoneTasks(all.filter((t: any) => t.is_milestone && !t.is_deleted));
        })
        .catch(() => { });
    }
  }, [projectUid]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (id) {
      const tpl = taskTemplates.find((t: any) => String(t.id) === id);
      if (tpl) {
        setNewTaskTitle(tpl.name || "");
        setTemplateDescription(tpl.description || "");
        const rawCl = Array.isArray(tpl.default_checklists) ? tpl.default_checklists : [];
        const clList = rawCl
          .map((c: any) => {
            if (typeof c === "string") return { title: c, requires_visual_proof: false };
            return { title: c?.title || "", requires_visual_proof: !!c?.requires_visual_proof };
          })
          .filter((i: any) => i.title);
        setTaskChecklists(clList);
        setTaskSubtasks(Array.isArray(tpl.default_subtasks) ? tpl.default_subtasks : []);
      }
    } else {
      setTemplateDescription("");
      setTaskChecklists([]);
      setTaskSubtasks([]);
    }
  };

  const [onHoldPromptTask, setOnHoldPromptTask] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [onHoldReasonText, setOnHoldReasonText] = useState("");

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    if (readOnly) return;
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  }, [readOnly]);

  const handleDragOver = useCallback((e: React.DragEvent, col: TaskStatus) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(col);
  }, [readOnly]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: TaskStatus) => {
    if (readOnly) return;
    e.preventDefault();
    setDragOverColumn(null);
    if (draggingTaskId === null) return;

    const task = tasks.find(t => t.uid === draggingTaskId);
    if (!task || task.status === targetStatus) {
      setDraggingTaskId(null);
      return;
    }

    if (targetStatus === "ON_HOLD") {
      setOnHoldPromptTask({ taskId: draggingTaskId, taskTitle: task.title });
      setDraggingTaskId(null);
      return;
    }

    // Optimistic UI update
    const previousTasks = [...tasks];
    const updatedTask = { ...task, status: targetStatus };
    const optimisticTasks = tasks.map(t => t.uid === draggingTaskId ? updatedTask : t);
    setTasks(optimisticTasks);
    setDraggingTaskId(null);

    try {
      const updated = await projectsApi.updateTask(draggingTaskId, { status: targetStatus });
      const updatedTasks = optimisticTasks.map(t => t.uid === updated.uid ? updated : t);
      setTasks(updatedTasks);
      onBlockUpdated(getUpdatedBlock(block, updatedTasks));
      toast.success(`Moved to ${COLUMNS.find(c => c.id === targetStatus)?.label}`);
    } catch (err: any) {
      // Snap back on failure
      setTasks(previousTasks);
      toast.error(err?.message || "Cannot move task — gate rule violated.");
    }
  }, [draggingTaskId, tasks, block, onBlockUpdated]);

  const handleConfirmOnHoldDrop = async () => {
    if (!onHoldPromptTask || !onHoldReasonText.trim()) return;
    const { taskId } = onHoldPromptTask;
    const task = tasks.find(t => t.uid === taskId);
    if (!task) return;

    const previousTasks = [...tasks];
    const updatedTask = { ...task, status: "ON_HOLD" as const, on_hold_reason: onHoldReasonText.trim() };
    const optimisticTasks = tasks.map(t => t.uid === taskId ? updatedTask : t);
    setTasks(optimisticTasks);
    setOnHoldPromptTask(null);
    const reason = onHoldReasonText.trim();
    setOnHoldReasonText("");

    try {
      const updated = await projectsApi.updateTask(taskId, { status: "ON_HOLD", on_hold_reason: reason });
      const updatedTasks = optimisticTasks.map(t => t.uid === updated.uid ? updated : t);
      setTasks(updatedTasks);
      onBlockUpdated(getUpdatedBlock(block, updatedTasks));
      toast.success("Moved to On Hold");
    } catch (err: any) {
      setTasks(previousTasks);
      toast.error(err?.message || "Could not move task to On Hold.");
    }
  };

  // ── Add Task ────────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const created = await projectsApi.createTask({
        project: block.project_id || (projectUid ? (isNaN(Number(projectUid)) ? projectUid : parseInt(projectUid)) : undefined),
        block: block.id,
        title: newTaskTitle.trim(),
        description: templateDescription.trim(),
        checklists: taskChecklists.map(c => c.title),
        default_checklists: taskChecklists.map(c => c.title),
        subtasks: taskSubtasks,
        default_subtasks: taskSubtasks,
        status: "TODO",
        milestone_task_id: milestoneTaskId ?? undefined,
      });

      // Ensure checklists are present on the created task
      let taskChecklistItems = created?.checklists || [];
      if ((!taskChecklistItems || taskChecklistItems.length === 0) && taskChecklists.length > 0 && created?.uid) {
        const results = await Promise.allSettled(
          taskChecklists.map((cl) => projectsApi.createChecklistItem(created.uid, cl.title, "during", "", cl.requires_visual_proof))
        );
        taskChecklistItems = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r, idx) => r.value || { id: Date.now() + idx, title: taskChecklists[idx].title, requires_visual_proof: taskChecklists[idx].requires_visual_proof, is_completed: false });
      }

      if ((!taskChecklistItems || taskChecklistItems.length === 0) && taskChecklists.length > 0) {
        taskChecklistItems = taskChecklists.map((cl, idx) => ({
          id: Date.now() + idx,
          title: cl.title,
          requires_visual_proof: cl.requires_visual_proof,
          is_completed: false,
          order: idx,
        }));
      }

      const createdTask: Task = {
        ...created,
        description: templateDescription.trim() || created.description || "",
        checklists: taskChecklistItems,
        status: created.status || "TODO",
      };

      const currentTasks = Array.isArray(tasks) ? tasks : [];
      const exists = currentTasks.some(t => (createdTask.uid && t.uid === createdTask.uid) || (createdTask.id && t.id === createdTask.id));
      const updatedTasks = exists
        ? currentTasks.map(t => (t.uid === createdTask.uid || (t.id && t.id === createdTask.id)) ? createdTask : t)
        : [...currentTasks, createdTask];

      setTasks(updatedTasks);
      onBlockUpdated(getUpdatedBlock(block, updatedTasks));
      setNewTaskTitle("");
      setSelectedTemplateId("");
      setTemplateDescription("");
      setTaskChecklists([]);
      setNewChecklistInput("");
      setMilestoneTaskId(null);
      setIsAddingTask(false);
      toast.success("Task added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add task.");
    }
  };

  // ── Task Updated callback ────────────────────────────────────────────────────
  const handleTaskUpdated = (updated: Task) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = currentTasks.map(t => t.uid === updated.uid ? updated : t);
    setTasks(updatedTasks);
    onBlockUpdated(getUpdatedBlock(block, updatedTasks));
  };

  const handleTaskDeleted = (taskId: string) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const newTasks = currentTasks.filter(t => t.uid !== taskId);
    setTasks(newTasks);
    onBlockUpdated(getUpdatedBlock(block, newTasks));
  };

  // ── Create Milestone Task removed ──────────────────────

  const handleSelectMilestoneTpl = (milestoneTplId: number | "") => {
    setSelectedMilestoneTplId(milestoneTplId);
    setBulkTaskSearchQuery("");
    if (milestoneTplId) {
      const targetId = Number(milestoneTplId);
      const allocated = taskTemplates.filter((t: any) => {
        if (t.is_milestone) return false;
        const mTask = t.milestone_task !== undefined ? t.milestone_task : t.milestone_task_id;
        const parentId = typeof mTask === "object" && mTask !== null ? mTask.id : mTask;
        return parentId != null && Number(parentId) === targetId;
      });
      setTplTasksToCreate(allocated.map((t: any) => ({
        id: t.id,
        name: t.name,
        checked: true,
        default_checklists: t.default_checklists || [],
      })));
    } else {
      setTplTasksToCreate([]);
    }
  };

  const handleBulkCreateTasks = async () => {
    const selected = tplTasksToCreate.filter(t => t.checked);
    if (selected.length === 0) return;
    setGeneratingTasks(true);
    try {
      const targetProjectId = block.project_id || (projectUid ? (isNaN(Number(projectUid)) ? projectUid : parseInt(projectUid)) : undefined);

      // Parallel batch creation of tasks
      const createPromises = selected.map(async (tpl) => {
        const checklists = (tpl.default_checklists || []).map((item: any) =>
          typeof item === "string" ? item : item.title || ""
        ).filter(Boolean);

        const created = await projectsApi.createTask({
          project: targetProjectId,
          block: block.id,
          title: tpl.name,
          description: "",
          checklists: checklists,
          default_checklists: checklists,
          status: "TODO",
        });

        let taskChecklistItems = created?.checklists || [];
        if ((!taskChecklistItems || taskChecklistItems.length === 0) && checklists.length > 0 && created?.uid) {
          const results = await Promise.allSettled(
            checklists.map((title) => projectsApi.createChecklistItem(created.uid, title))
          );
          taskChecklistItems = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
            .map((r, idx) => r.value || { id: Date.now() + idx, title: checklists[idx], is_completed: false });
        }

        return {
          ...created,
          checklists: taskChecklistItems,
          status: created.status || "TODO",
        };
      });

      const results = await Promise.allSettled(createPromises);
      const createdTasksList: Task[] = results
        .filter((r): r is PromiseFulfilledResult<Task> => r.status === "fulfilled")
        .map(r => r.value);

      const currentTasks = Array.isArray(tasks) ? tasks : [];
      const newTasks = [...currentTasks];
      for (const ct of createdTasksList) {
        if (!newTasks.some(t => (ct.uid && t.uid === ct.uid) || (ct.id && t.id === ct.id))) {
          newTasks.push(ct);
        }
      }
      setTasks(newTasks);
      onBlockUpdated(getUpdatedBlock(block, newTasks));

      setSelectedMilestoneTplId("");
      setTplTasksToCreate([]);
      setMilestoneSearchQuery("");
      setBulkTaskSearchQuery("");
      setIsBulkPlannerOpen(false);
      toast.success(`Generated ${createdTasksList.length} tasks from milestone template.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to bulk generate tasks.");
    } finally {
      setGeneratingTasks(false);
    }
  };

  const safeTasksList = Array.isArray(tasks) ? tasks.filter(t => t && !t.is_deleted) : [];
  const filteredTasks = safeTasksList.filter(t => t && (!priorityFilter || t.priority === priorityFilter));

  const tasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => {
    if (!t) return false;
    const taskStatus = (t.status || "TODO").toUpperCase();
    if (status === "TODO") {
      return taskStatus === "TODO" || taskStatus === "PENDING";
    }
    if (status === "ON_HOLD") {
      return taskStatus === "ON_HOLD" || taskStatus === "ON HOLD" || taskStatus === "HOLD";
    }
    if (status === "WIP") {
      return taskStatus === "WIP" || taskStatus === "IN PROGRESS" || taskStatus === "IN_PROGRESS";
    }
    if (status === "QA") {
      return taskStatus === "QA" || taskStatus === "INSPECTION" || taskStatus === "UNDER INSPECTION";
    }
    if (status === "DONE") {
      return taskStatus === "DONE";
    }
    return taskStatus === status;
  });

  return (
    <>

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ left: typeof window !== "undefined" && window.innerWidth < 768 ? 0 : leftOffset, width: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : (width ?? 896) }}
        className="fixed top-0 bottom-0 h-screen bg-background border-r border-surface-200 shadow-premium z-[45] flex flex-col min-w-0 overflow-hidden w-full md:w-auto"
      >
        {/* Drawer Header */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-surface-100 bg-surface-50 shrink-0">
          {/* Top row: location badges + close */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white shrink-0"
                style={{ backgroundColor: phase.color_hex }}
              >
                {phase.name}
              </span>
              <span className="text-surface-300 text-xs shrink-0">›</span>
              <span className="text-[8px] font-bold text-surface-500 uppercase tracking-wider truncate">{zone.name}</span>
              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${block.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
                block.status === "ACTIVE" ? "bg-accent/10 text-accent" :
                  "bg-surface-100 text-surface-400"
                }`}>
                {block.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-red-500 hover:text-white text-surface-400 flex items-center justify-center transition-all font-bold shrink-0 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* View Tab Switcher */}
            <div className="flex items-center gap-1 bg-surface-200/80 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab("tasks")}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  drawerTab === "tasks"
                    ? "bg-accent text-background shadow-xs"
                    : "text-surface-400 hover:text-primary"
                }`}
              >
                📋 Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("bom")}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                  drawerTab === "bom"
                    ? "bg-accent text-background shadow-xs"
                    : "text-surface-400 hover:text-primary"
                }`}
              >
                <Package className="w-3 h-3" /> Block BOM ({aggregatedBlockMaterials.length})
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              {drawerTab === "tasks" && (
                <>
                  {!readOnly && !isLocked && userRole === "admin" && (
                    <button
                      onClick={() => setIsBulkPlannerOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 cursor-pointer"
                    >
                      <span>⚡</span> Milestone
                    </button>
                  )}
                  {!readOnly && userRole === "admin" && (
                    <button
                      onClick={() => {
                        setSelectedTemplateId("");
                        setNewTaskTitle("");
                        setTemplateDescription("");
                        setTaskChecklists([]);
                        setTaskSubtasks([]);
                        setNewChecklistInput("");
                        setNewSubtaskTitle("");
                        setNewSubtaskDesc("");
                        setSubtaskChecklistInputs({});
                        setIsAddingTask(true);
                      }}
                      className="h-7 px-3 bg-accent text-background font-bold text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      + Add Task
                    </button>
                  )}
                  <select
                    value={priorityFilter || ""}
                    onChange={(e) => setPriorityFilter(e.target.value || null)}
                    className="h-7 px-2 bg-surface-100 border border-transparent hover:border-surface-200 rounded-lg outline-none text-[9px] font-bold uppercase tracking-wider text-surface-400 transition-colors cursor-pointer"
                  >
                    <option value="">All Priorities</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </>
              )}

              {drawerTab === "bom" && (
                <button
                  type="button"
                  onClick={() => setShowDirectPostModal(true)}
                  disabled={aggregatedBlockMaterials.length === 0}
                  className="h-7 px-3.5 bg-accent hover:opacity-90 text-background font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
                >
                  <Share2 className="w-3 h-3" /> Post Block Tender
                </button>
              )}
            </div>
          </div>
        </div>
        {/* ── TASKS VIEW ── */}
        <>
          {/* Block Notes */}
          <div className="px-4 py-2.5 border-b border-surface-200 bg-surface-50 shrink-0">
            <textarea
              className="w-full text-xs text-foreground bg-surface-100 hover:bg-surface-100/80 border border-surface-300 focus:border-accent rounded-lg p-2.5 outline-none resize-none transition-all placeholder:text-surface-400 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              rows={2}
              disabled={readOnly}
              placeholder={readOnly ? "No notes added for this block." : "Add notes for this block..."}
              defaultValue={block.notes || ""}
              onBlur={async (e) => {
                if (e.target.value !== block.notes) {
                  try {
                    const updated = await projectsApi.updateBlock(block.id, { notes: e.target.value });
                    onBlockUpdated({ ...block, notes: updated.notes });
                    toast.success("Notes saved.");
                  } catch {
                    toast.error("Failed to save notes.");
                  }
                }
              }}
            />
          </div>

          {/* ── CONDITIONAL VIEW: Tasks Kanban vs Block BOM ── */}
          {drawerTab === "tasks" ? (
            <>
              {/* Kanban columns */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex gap-4 h-full min-w-[720px]">
                  {COLUMNS.map(col => {
                    const colTasks = tasksByStatus(col.id);
                    const isDragTarget = dragOverColumn === col.id;
                    return (
                      <div
                        key={col.id}
                        onDragOver={e => handleDragOver(e, col.id)}
                        onDragLeave={() => setDragOverColumn(null)}
                        onDrop={e => handleDrop(e, col.id)}
                        className={`flex flex-col flex-1 min-w-[180px] max-w-[260px] rounded-t-sm ${isDragTarget ? "border-semantic-blue bg-surface-100/50" : `${col.color} ${isLocked ? "opacity-60" : ""}`
                          }`}
                      >
                        <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-surface-200">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-surface-600">{col.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black tabular-nums bg-surface-200 px-2 py-0.5 rounded-full border border-surface-300 text-foreground">{colTasks.length}</span>
                            {col.id === "TODO" && !readOnly && userRole === "admin" && (
                              <button type="button" onClick={() => { setSelectedTemplateId(""); setNewTaskTitle(""); setTemplateDescription(""); setTaskChecklists([]); setTaskSubtasks([]); setNewChecklistInput(""); setNewSubtaskTitle(""); setNewSubtaskDesc(""); setSubtaskChecklistInputs({}); setIsAddingTask(true); }}
                                className="w-5 h-5 rounded bg-accent/15 hover:bg-accent/30 text-accent flex items-center justify-center text-xs font-black transition-colors" title="Add Task">
                                +
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                          {tasksByStatus(col.id).map(task => (
                            <TaskItem key={task.uid} task={task} isLocked={isLocked} onDragStart={(e) => handleDragStart(e, task.uid)} onClick={() => onTaskSelect?.(task)} />
                          ))}
                          {colTasks.length === 0 && (
                            <div className={`h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 ${isDragTarget ? "border-accent bg-accent/10" : "border-surface-300 bg-surface-50/50"
                              }`}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400">{isDragTarget ? "Drop here" : "Empty"}</span>
                              {col.id === "TODO" && !readOnly && userRole === "admin" && (
                                <button type="button" onClick={() => { setSelectedTemplateId(""); setNewTaskTitle(""); setTemplateDescription(""); setTaskChecklists([]); setTaskSubtasks([]); setNewChecklistInput(""); setNewSubtaskTitle(""); setNewSubtaskDesc(""); setSubtaskChecklistInputs({}); setIsAddingTask(true); }}
                                  className="text-[10px] font-bold text-accent hover:underline">+ Add Task</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary footer */}
              <div className="px-4 py-2.5 border-t border-surface-200 bg-surface-100 shrink-0 flex items-center gap-4">
                {COLUMNS.map(col => (
                  <div key={col.id} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className="text-[9px] font-bold text-surface-600">{col.label}</span>
                    <span className="text-[9px] font-black tabular-nums text-foreground">{tasksByStatus(col.id).length}</span>
                  </div>
                ))}
                <div className="ml-auto"><span className="text-[9px] font-bold text-accent">{block.progress_percent}% complete</span></div>
              </div>
            </>
          ) : (
            /* ── Block BOM & Inventory Tracker View (Matching TaskInventoryTrackerTab) ── */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-surface-100 border border-surface-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-primary uppercase tracking-wider">
                      Milestone Bill of Materials (BOM) & On-Site Inventory
                    </h4>
                    <p className="text-[10px] text-surface-400">
                      Track planned vs issued vs consumed quantities for {phase.name} — {zone.name} ({tasks.length} tasks).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {blockRequirements.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowReqModal(true)}
                      className="h-7 px-3 text-[11px] font-bold rounded-lg bg-surface-200 hover:bg-surface-300 text-primary border border-surface-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ClipboardList className="w-3 h-3 text-accent" />
                      Place Requisition Order
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDirectPostModal(true)}
                    disabled={blockRequirements.length === 0}
                    className="h-7 px-3.5 bg-accent hover:opacity-90 text-background font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
                  >
                    <Share2 className="w-3 h-3" />
                    Post Tender / Job
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReqForIssue(null);
                      setShowIssueModal(true);
                    }}
                    disabled={blockRequirements.length === 0}
                    className="h-7 px-3 text-[11px] font-bold rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    Issue to Trade
                  </button>
                </div>
              </div>

              {/* Table / Empty state */}
              {loadingBOM ? (
                <div className="py-16 text-center text-xs text-surface-400 animate-pulse">
                  Aggregating milestone block material requirements...
                </div>
              ) : blockRequirements.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-surface-300 rounded-xl bg-surface-50">
                  <PackageCheck className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                  <p className="text-xs text-primary font-medium">No materials attached to tasks in this block yet</p>
                  <p className="text-[11px] text-surface-400 mt-0.5 max-w-sm mx-auto">
                    Open any task in the Kanban board to use the Civil Engineering Estimator to calculate exact materials required.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-surface-200 rounded-xl bg-surface-50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-100 text-surface-400 uppercase tracking-wider font-semibold border-b border-surface-200">
                      <tr>
                        <th className="py-2.5 px-3">Material</th>
                        <th className="py-2.5 px-3">Planned Qty</th>
                        <th className="py-2.5 px-3">Issued Qty</th>
                        <th className="py-2.5 px-3">Consumed Qty</th>
                        <th className="py-2.5 px-3">Site Stock Available</th>
                        <th className="py-2.5 px-3">Fulfillment</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 text-primary">
                      {blockRequirements.map((req) => {
                        const pct = req.fulfillment_percentage || (req.planned_qty > 0 ? Math.min(100, Math.round((req.issued_qty / req.planned_qty) * 100)) : 0);
                        const stockAvail = req.available_stock ?? 0;
                        const neededQty = req.planned_qty - req.issued_qty;
                        return (
                          <tr key={req.id} className="hover:bg-surface-100/60 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-primary">{req.material_name}</div>
                              <div className="text-[10px] text-surface-400">Unit: {req.material_unit}</div>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-primary">
                              {req.planned_qty} {req.material_unit}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-emerald-400">
                              {req.issued_qty} {req.material_unit}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-amber-400">
                              {req.consumed_qty} {req.material_unit}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {stockAvail > 0 ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-emerald-400 font-mono text-xs block">
                                    {stockAvail.toLocaleString()} {req.material_unit}
                                  </span>
                                  {stockAvail >= neededQty || neededQty <= 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                                      AVAILABLE IN STOCK
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block">
                                      PARTIAL ({stockAvail} / {neededQty} needed)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-red-400 font-mono text-xs block">
                                    0 {req.material_unit}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20 inline-block">
                                    OUT OF STOCK
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 min-w-[130px]">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-surface-400 font-medium">{pct}%</span>
                                {pct >= 100 ? (
                                  <span className="text-emerald-400 flex items-center gap-0.5 text-[10px] font-bold">
                                    <CheckCircle2 className="w-3 h-3" /> Ready
                                  </span>
                                ) : (
                                  <span className="text-amber-400 text-[10px] font-bold">Pending</span>
                                )}
                              </div>
                              <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={loadingViewId === req.material}
                                  onClick={() => handleViewMaterialDetail(req.material)}
                                  className="h-6 px-2 text-[11px] font-semibold text-surface-400 hover:text-primary bg-surface-100 hover:bg-surface-200 border border-surface-300 rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="View Material Specifications & Brand Details"
                                >
                                  <Eye className="w-3 h-3 text-accent" />
                                  {loadingViewId === req.material ? "Loading..." : "View Specs"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReqForIssue(req);
                                    setShowIssueModal(true);
                                  }}
                                  className="h-6 px-2 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 rounded transition-colors cursor-pointer"
                                >
                                  Issue Slip
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
        {/* ── Create Task Modal with Templates, Checklists & Subtasks ──────────── */}
        {isAddingTask && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-surface-50 border border-surface-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-surface-200 bg-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-lg">
                    ✨
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-accent/15 text-accent rounded border border-accent/25">
                        {zone.name}
                      </span>
                      <span className="text-xs text-surface-500 font-semibold">
                        → {phase.name}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-foreground">Create New Task</h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Template Selector Card */}
                {filteredTaskTemplates.length > 0 && (
                  <div className="p-3 bg-surface-100 border border-surface-300 rounded-xl space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600 flex items-center justify-between">
                      <span>Pre-fill from Architectural Template</span>
                      {selectedTemplateId && (
                        <button
                          type="button"
                          onClick={() => handleSelectTemplate("")}
                          className="text-[10px] text-accent hover:underline normal-case font-bold"
                        >
                          Clear Selection
                        </button>
                      )}
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full h-9 px-3 bg-surface-50 border border-surface-300 rounded-lg outline-none focus:border-accent text-xs font-bold text-foreground transition-colors appearance-none"
                    >
                      <option value="" className="bg-surface-100 text-foreground">— Choose a standard template (optional) —</option>
                      {filteredTaskTemplates.map((tpl: any) => (
                        <option key={tpl.id} value={String(tpl.id)} className="bg-surface-100 text-foreground">
                          {tpl.name} ({tpl.default_duration_days || 1}d) • {tpl.default_checklists?.length || 0} checkpoints • {tpl.default_subtasks?.length || 0} subtasks
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Milestone Allocation — simple one-liner */}
                {projectMilestoneTasks.length > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <span className="text-purple-400 text-sm shrink-0">🎯</span>
                    <select
                      value={milestoneTaskId ?? ""}
                      onChange={(e) => setMilestoneTaskId(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 h-8 px-2.5 bg-transparent border-0 outline-none text-xs font-bold text-foreground"
                    >
                      <option value="">— Allocate to a Milestone Task (optional) —</option>
                      {projectMilestoneTasks.map((t) => (
                        <option key={t.uid} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    {milestoneTaskId && (
                      <button type="button" onClick={() => setMilestoneTaskId(null)} className="text-purple-400 hover:text-red-400 text-xs font-bold shrink-0">✕</button>
                    )}
                  </div>
                )}

                {/* Task Title & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      Task Title *
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Phase 1: Foundation Pouring & Curing"
                      className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-xl text-xs font-bold text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      Priority
                    </label>
                    <select
                      defaultValue="MEDIUM"
                      className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-xl text-xs font-bold text-foreground outline-none focus:border-accent appearance-none"
                    >
                      <option value="HIGH" className="bg-surface-100 text-foreground">High Priority</option>
                      <option value="MEDIUM" className="bg-surface-100 text-foreground">Medium Priority</option>
                      <option value="LOW" className="bg-surface-100 text-foreground">Low Priority</option>
                    </select>
                  </div>
                </div>

                {/* Execution Directives */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                    Execution Directives / Requirements
                  </label>
                  <textarea
                    rows={2}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Add architectural specifications or operational notes..."
                    className="w-full p-2.5 bg-surface-100 border border-surface-300 rounded-xl text-xs font-medium text-foreground outline-none focus:border-accent transition-all resize-none leading-relaxed placeholder:text-surface-400"
                  />
                </div>

                {/* Primary Quality & Inspection Checklists */}
                <div className="space-y-2 pt-2 border-t border-surface-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> Primary Checklists ({taskChecklists.length})
                    </span>
                  </label>

                  {taskChecklists.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {taskChecklists.map((cl, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 border border-surface-300 rounded-lg group"
                        >
                          <span className="text-emerald-400 text-xs shrink-0 font-bold">✓</span>
                          <span className="flex-1 text-xs font-medium text-foreground truncate">{cl.title}</span>
                          {cl.requires_visual_proof && (
                            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                              📷 Proof Req.
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setTaskChecklists(prev => prev.filter((_, i) => i !== idx))}
                            className="w-5 h-5 rounded hover:bg-red-500/15 text-surface-400 hover:text-red-400 flex items-center justify-center text-xs font-bold transition-all shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newChecklistInput}
                        onChange={(e) => setNewChecklistInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newChecklistInput.trim()) {
                              setTaskChecklists(prev => [...prev, { title: newChecklistInput.trim(), requires_visual_proof: newChecklistRequiresProof }]);
                              setNewChecklistInput("");
                              setNewChecklistRequiresProof(false);
                            }
                          }
                        }}
                        placeholder="Add checklist item (Press Enter)..."
                        className="flex-1 h-8.5 px-3 bg-surface-100 border border-surface-300 rounded-lg text-xs font-medium text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newChecklistInput.trim()) {
                            setTaskChecklists(prev => [...prev, { title: newChecklistInput.trim(), requires_visual_proof: newChecklistRequiresProof }]);
                            setNewChecklistInput("");
                            setNewChecklistRequiresProof(false);
                          }
                        }}
                        className="h-8.5 px-3 bg-accent text-background rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newChecklistRequiresProof}
                        onChange={(e) => setNewChecklistRequiresProof(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-surface-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                        📸 Photo Evidence Required for this Checkpoint
                      </span>
                    </label>
                  </div>
                </div>

                {/* Subtask Templates Section */}
                <div className="space-y-3 pt-2 border-t border-surface-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="text-indigo-400">📁</span> Subtasks & Nested Checklists ({taskSubtasks.length})
                  </label>

                  {taskSubtasks.length > 0 && (
                    <div className="space-y-2.5">
                      {taskSubtasks.map((sub, sIdx) => (
                        <div key={sIdx} className="bg-surface-100 border border-surface-300 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-black shrink-0">
                                {sIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">{sub.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTaskSubtasks(prev => prev.filter((_, i) => i !== sIdx))}
                              className="text-surface-400 hover:text-red-400 p-1 transition-colors text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>

                          {sub.description && (
                            <p className="text-[11px] text-surface-600 pl-7">{sub.description}</p>
                          )}

                          {/* Nested Checkpoints */}
                          <div className="pl-7 space-y-1.5 pt-1">
                            {(sub.checklists || []).map((cl: string, cIdx: number) => (
                              <div key={cIdx} className="flex items-center justify-between gap-2 text-[11px] text-foreground bg-surface-50 px-2.5 py-1 rounded-md border border-surface-200">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-[9px] text-emerald-400">●</span>
                                  <span className="truncate">{cl}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTaskSubtasks(prev => {
                                      const updated = [...prev];
                                      if (updated[sIdx]?.checklists) {
                                        updated[sIdx].checklists = updated[sIdx].checklists.filter((_: any, i: number) => i !== cIdx);
                                      }
                                      return updated;
                                    });
                                  }}
                                  className="text-surface-400 hover:text-red-400 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}

                            {/* Add checkpoint input for this specific subtask */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={subtaskChecklistInputs[sIdx] || ""}
                                onChange={(e) => setSubtaskChecklistInputs(prev => ({ ...prev, [sIdx]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const text = (subtaskChecklistInputs[sIdx] || "").trim();
                                    if (text) {
                                      setTaskSubtasks(prev => {
                                        const updated = [...prev];
                                        const cur = updated[sIdx]?.checklists || [];
                                        updated[sIdx] = { ...updated[sIdx], checklists: [...cur, text] };
                                        return updated;
                                      });
                                      setSubtaskChecklistInputs(prev => ({ ...prev, [sIdx]: "" }));
                                    }
                                  }
                                }}
                                placeholder="Add checkpoint to this subtask..."
                                className="flex-1 h-7 px-2 bg-surface-50 border border-surface-300 rounded text-[11px] text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const text = (subtaskChecklistInputs[sIdx] || "").trim();
                                  if (text) {
                                    setTaskSubtasks(prev => {
                                      const updated = [...prev];
                                      const cur = updated[sIdx]?.checklists || [];
                                      updated[sIdx] = { ...updated[sIdx], checklists: [...cur, text] };
                                      return updated;
                                    });
                                    setSubtaskChecklistInputs(prev => ({ ...prev, [sIdx]: "" }));
                                  }
                                }}
                                className="h-7 px-2.5 bg-surface-200 text-foreground text-[9px] font-bold uppercase tracking-wider rounded hover:bg-surface-300 transition-all shrink-0"
                              >
                                + Checkpoint
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Subtask Box */}
                  <div className="bg-surface-100/70 border border-dashed border-surface-300 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                      + Add Subtask
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Subtask title (e.g. Rebar inspection)..."
                        className="w-full h-8 px-3 bg-surface-50 border border-surface-300 rounded-lg text-xs font-semibold text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubtaskDesc}
                          onChange={(e) => setNewSubtaskDesc(e.target.value)}
                          placeholder="Optional subtask directive..."
                          className="flex-1 h-8 px-3 bg-surface-50 border border-surface-300 rounded-lg text-xs text-foreground outline-none focus:border-accent placeholder:text-surface-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newSubtaskTitle.trim()) {
                              toast.error("Please enter a subtask title.");
                              return;
                            }
                            setTaskSubtasks(prev => [
                              ...prev,
                              {
                                title: newSubtaskTitle.trim(),
                                description: newSubtaskDesc.trim() || undefined,
                                checklists: [],
                              }
                            ]);
                            setNewSubtaskTitle("");
                            setNewSubtaskDesc("");
                          }}
                          className="h-8 px-3 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all shrink-0"
                        >
                          + Add Subtask
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-100">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="h-9 px-5 rounded-xl border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="h-9 px-6 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/20 disabled:opacity-50"
                >
                  Create Task
                </button>
              </div>

            </motion.div>
          </div>
        )}

        {/* ── Bulk Plan from Milestone Template Modal (Advanced Searchable & Optimized) ── */}
        {isBulkPlannerOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
            <div className="bg-surface-50 border border-surface-300 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-5 py-4 border-b border-surface-200 bg-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-base">
                    ⚡
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">Bulk Plan from Milestone</h3>
                    <p className="text-[10px] text-surface-500 font-semibold">Search templates and select tasks to generate into block</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkPlannerOpen(false)}
                  className="w-7 h-7 rounded-lg bg-surface-200 text-foreground hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Milestone Search Bar */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-surface-600 flex items-center justify-between">
                    <span>Select Milestone Template</span>
                    <span className="text-[9px] text-surface-400 font-bold">{availableMilestoneTemplates.length} Available</span>
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-surface-400" />
                    <input
                      type="text"
                      value={milestoneSearchQuery}
                      onChange={(e) => setMilestoneSearchQuery(e.target.value)}
                      placeholder="Search milestone templates..."
                      className="w-full h-8 pl-8 pr-7 bg-surface-100 border border-surface-300 rounded-lg text-xs font-semibold text-foreground outline-none focus:border-purple-400 placeholder:text-surface-400"
                    />
                    {milestoneSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMilestoneSearchQuery("")}
                        className="absolute right-2.5 top-2 text-surface-400 hover:text-foreground text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedMilestoneTplId}
                    onChange={(e) => handleSelectMilestoneTpl(e.target.value ? Number(e.target.value) : "")}
                    className="w-full h-9 px-3 bg-surface-100 border border-surface-300 rounded-xl text-xs font-bold text-foreground outline-none focus:border-purple-400"
                  >
                    <option value="">— Choose a milestone template ({availableMilestoneTemplates.length}) —</option>
                    {availableMilestoneTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMilestoneTplId !== "" && (
                  <div className="space-y-3 pt-3 border-t border-surface-200">
                    {/* Task Search Bar inside selected milestone */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-surface-600">
                          Tasks in Milestone ({tplTasksToCreate.filter((t) => t.checked).length}/{tplTasksToCreate.length} Selected)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTplTasksToCreate((prev) => prev.map((t) => ({ ...t, checked: true })))}
                            className="text-[10px] text-purple-400 hover:underline font-bold"
                          >
                            Select All
                          </button>
                          <span className="text-surface-300 text-xs">|</span>
                          <button
                            type="button"
                            onClick={() => setTplTasksToCreate((prev) => prev.map((t) => ({ ...t, checked: false })))}
                            className="text-[10px] text-surface-400 hover:underline font-bold"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-surface-400" />
                        <input
                          type="text"
                          value={bulkTaskSearchQuery}
                          onChange={(e) => setBulkTaskSearchQuery(e.target.value)}
                          placeholder="Filter tasks or checkpoints..."
                          className="w-full h-8 pl-8 pr-7 bg-surface-100 border border-surface-300 rounded-lg text-xs font-semibold text-foreground outline-none focus:border-purple-400 placeholder:text-surface-400"
                        />
                        {bulkTaskSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setBulkTaskSearchQuery("")}
                            className="absolute right-2.5 top-2 text-surface-400 hover:text-foreground text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredTplTasksToCreate.length === 0 ? (
                      <p className="text-[11px] text-surface-500 italic py-3 text-center">
                        {bulkTaskSearchQuery ? "No matching tasks found for filter query." : "No sub-templates allocated to this milestone template."}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {filteredTplTasksToCreate.map((tpl) => {
                          const checkpointCount = (tpl.default_checklists || []).length;
                          return (
                            <label
                              key={tpl.id}
                              className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-colors ${tpl.checked
                                  ? "bg-purple-500/10 border-purple-500/30 text-foreground"
                                  : "bg-surface-100 border-surface-200 text-surface-400 hover:bg-surface-200"
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={tpl.checked}
                                onChange={(e) =>
                                  setTplTasksToCreate((prev) =>
                                    prev.map((t) => (t.id === tpl.id ? { ...t, checked: e.target.checked } : t))
                                  )
                                }
                                className="w-4 h-4 rounded border-surface-300 text-purple-500 focus:ring-purple-500 cursor-pointer"
                              />
                              <span className="text-xs font-bold truncate flex-1">{tpl.name}</span>
                              {checkpointCount > 0 && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-accent/15 text-accent border border-accent/25 shrink-0">
                                  ✓ {checkpointCount} checkpoints
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-200 bg-surface-100">
                <span className="text-[10px] font-extrabold text-surface-500 uppercase tracking-wider">
                  {tplTasksToCreate.filter((t) => t.checked).length} tasks queued for generation
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBulkPlannerOpen(false)}
                    className="h-8 px-4 rounded-lg border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={generatingTasks || tplTasksToCreate.filter((t) => t.checked).length === 0}
                    onClick={handleBulkCreateTasks}
                    className="h-8 px-5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/20"
                  >
                    {generatingTasks ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <span>Create {tplTasksToCreate.filter((t) => t.checked).length} Tasks</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* On Hold Prompt Modal */}
        {onHoldPromptTask && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
            <div className="bg-surface-50 border border-surface-300 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-surface-200 pb-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-lg">
                  ⏸️
                </span>
                <div>
                  <h3 className="text-base font-black text-foreground">Why is this task on hold?</h3>
                  <p className="text-xs text-surface-500">Moving <strong className="text-foreground">"{onHoldPromptTask.taskTitle}"</strong> to On Hold.</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirmOnHoldDrop();
                }}
                className="space-y-4"
              >
                <textarea
                  value={onHoldReasonText}
                  onChange={(e) => setOnHoldReasonText(e.target.value)}
                  placeholder="e.g. Waiting for material delivery / client approval..."
                  rows={3}
                  required
                  autoFocus
                  className="w-full p-3 bg-surface-100 border border-surface-300 rounded-xl text-xs font-medium text-foreground outline-none focus:border-accent transition-all resize-none leading-relaxed placeholder:text-surface-400"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOnHoldPromptTask(null);
                      setOnHoldReasonText("");
                    }}
                    className="px-4 py-2 rounded-xl border border-surface-300 text-foreground hover:bg-surface-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!onHoldReasonText.trim()}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    Confirm On Hold
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Requisition Order Modal */}
        {showReqModal && (
          <PlaceRequisitionOrderModal
            isOpen={showReqModal}
            onClose={() => setShowReqModal(false)}
            taskId={tasks[0] ? (tasks[0] as any).id : 0}
            taskTitle={`${phase.name} — ${zone.name}`}
            projectId={projectUid ? Number(projectUid) : undefined}
            requirements={blockRequirements}
            onCreated={loadBlockBOM}
          />
        )}

        {/* Material Issue Modal */}
        {showIssueModal && (
          <MaterialIssueModal
            isOpen={showIssueModal}
            onClose={() => {
              setShowIssueModal(false);
              setSelectedReqForIssue(null);
            }}
            taskId={selectedReqForIssue ? selectedReqForIssue.task : (tasks[0] ? (tasks[0] as any).id : 0)}
            defaultMaterialId={selectedReqForIssue?.material}
            onIssued={loadBlockBOM}
          />
        )}

        {/* Material Detail Specifications Modal */}
        {showViewModal && selectedMaterialForView && (
          <MaterialDetailModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setSelectedMaterialForView(null);
            }}
            material={selectedMaterialForView}
          />
        )}

        {/* Direct Post Opportunity Modal for Block BOM */}
        <DirectPostOpportunityModal
          isOpen={showDirectPostModal}
          onClose={() => setShowDirectPostModal(false)}
          initialTitle={`Procurement Tender: ${phase.name} — ${zone.name}`}
          initialItems={aggregatedBlockMaterials.map((m) => ({
            name: m.name,
            category: m.category,
            quantity: m.balance > 0 ? m.balance : m.planned,
            unit: m.unit,
            rate: m.rate,
          }))}
          sourceContext={`Milestone Block: ${phase.name} — ${zone.name}`}
          projectUid={projectUid}
        />

      </motion.div>

    </>
  );
};
