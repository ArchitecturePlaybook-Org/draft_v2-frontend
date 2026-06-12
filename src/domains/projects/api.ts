import { fetchFromBff } from "@/shared/api/fetchFromBff";
import {
  Project, ProjectDetail, TaskAssetLink,
  MatrixPayload, ExpandedFeedPayload, Task,
  WorkPackageTemplate, SpatialZone, MilestonePhase, AIZoneResult,
  BOQItem, TaskMaterialAllocation, TaskComment, ChecklistTemplate
} from "@/types/projects";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function unpackArray<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

export const projectsApi = {
  getProjects: async () => {
    return fetchFromBff<PaginatedResponse<Project> | Project[]>("/api/projects/projects/", { method: "GET" });
  },

  getProjectDetails: async (id: string | number) => {
    return fetchFromBff<ProjectDetail>(`/api/projects/projects/${id}/`, { method: "GET" });
  },

  createProject: async (data: { 
    title: string; 
    description?: string; 
    account_id: number;
    project_code?: string;
    kind?: string;
    location?: string;
    client_name?: string;
    client_phone?: string;
    client_email?: string;
  }) => {
    return fetchFromBff<Project>("/api/projects/projects/", {
      method: "POST",
      body: JSON.stringify({ 
        title: data.title, 
        description: data.description, 
        account: data.account_id,
        project_code: data.project_code,
        kind: data.kind,
        location: data.location,
        client_name: data.client_name,
        client_phone: data.client_phone,
        client_email: data.client_email
      })
    });
  },

  updateProject: async (uid: string, data: Partial<Project>) => {
    return fetchFromBff<Project>(`/api/projects/projects/${uid}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  deleteProject: async (uid: string) => {
    return fetchFromBff<void>(`/api/projects/projects/${uid}/`, {
      method: "DELETE"
    });
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  getTasks: async () => {
    const res = await fetchFromBff<any>("/api/projects/tasks/", { method: "GET" });
    return unpackArray<Task>(res);
  },

  addProjectMember: async (projectId: number, userId: number, role: string = "viewer") => {
    return fetchFromBff<any>(`/api/projects/projects/${projectId}/members/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role })
    });
  },

  removeProjectMember: async (projectId: number, userId: number) => {
    return fetchFromBff<void>(`/api/projects/projects/${projectId}/members/${userId}/`, { method: "DELETE" });
  },

  getTask: async (taskId: string) => {
    return fetchFromBff<any>(`/api/projects/tasks/${taskId}/`, { method: "GET" });
  },

  createTask: async (data: { project: number; title: string; [key: string]: any }) => {
    return fetchFromBff<any>("/api/projects/tasks/", { method: "POST", body: JSON.stringify(data) });
  },

  updateTask: async (taskId: string, data: Partial<any>) => {
    return fetchFromBff<any>(`/api/projects/tasks/${taskId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  // ── Checklist Items ───────────────────────────────────────────────────────
  getProjectChecklists: async (projectUid: string) => {
    const res = await fetchFromBff<any>(`/api/projects/task-checklists/?project_uid=${projectUid}`, { method: "GET" });
    return unpackArray<any>(res);
  },

  createChecklistItem: async (taskUid: string, title: string) => {
    return fetchFromBff<any>(`/api/projects/task-checklists/`, {
      method: "POST",
      body: JSON.stringify({ task: taskUid, title: title, is_completed: false })
    });
  },

  updateChecklistItem: async (itemId: number, isCompleted: boolean) => {
    return fetchFromBff<any>(`/api/projects/task-checklists/${itemId}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_completed: isCompleted })
    });
  },

  updateChecklistItemWithAttachments: async (itemId: number, isCompleted: boolean, files?: File[]) => {
    const formData = new FormData();
    formData.append("is_completed", isCompleted ? "true" : "false");
    if (files && files.length > 0) {
      files.forEach(f => formData.append("attachments", f));
    }
    return fetchFromBff<any>(`/api/projects/task-checklists/${itemId}/`, {
      method: "PATCH",
      body: formData
    });
  },

  getChecklistTemplates: async () => {
    const res = await fetchFromBff<any>(`/api/projects/checklist-templates/`, { method: "GET" });
    return unpackArray<ChecklistTemplate>(res);
  },

  createChecklistTemplate: async (data: { name: string; description?: string }) => {
    const res = await fetchFromBff<any>(`/api/projects/checklist-templates/`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return res.data;
  },

  deleteChecklistTemplate: async (templateId: number) => {
    await fetchFromBff<any>(`/api/projects/checklist-templates/${templateId}/`, {
      method: "DELETE"
    });
  },

  syncChecklistTemplateItems: async (templateId: number, items: { title: string; requires_visual_proof: boolean }[]) => {
    const res = await fetchFromBff<any>(`/api/projects/checklist-templates/${templateId}/sync-items/`, {
      method: "POST",
      body: JSON.stringify({ items })
    });
    return res.data;
  },

  importChecklistTemplate: async (taskUid: string, templateId: number) => {
    const res = await fetchFromBff<any>(`/api/projects/tasks/${taskUid}/import-checklist/`, {
      method: "POST",
      body: JSON.stringify({ template_id: templateId })
    });
    return unpackArray<any>(res);
  },

  // ── Task Access Requests ──────────────────────────────────────────────────
  getTaskPublicInfo: async (taskUid: string) => {
    const res = await fetchFromBff<any>(`/api/projects/tasks/${taskUid}/public_info/`, { method: "GET" });
    return res;
  },

  requestTaskAccess: async (taskUid: string) => {
    const res = await fetchFromBff<any>(`/api/projects/tasks/${taskUid}/request_access/`, { method: "POST" });
    return res;
  },

  getPendingTaskRequests: async () => {
    const res = await fetchFromBff<any>(`/api/projects/task-requests/`, { method: "GET" });
    return unpackArray<any>(res);
  },

  approveTaskRequest: async (requestId: number) => {
    const res = await fetchFromBff<any>(`/api/projects/task-requests/${requestId}/approve/`, { method: "POST" });
    return res;
  },

  rejectTaskRequest: async (requestId: number) => {
    const res = await fetchFromBff<any>(`/api/projects/task-requests/${requestId}/reject/`, { method: "POST" });
    return res;
  },

  // ── Issues ────────────────────────────────────────────────────────────────
  getPunchListItems: async (projectUid: string) => {
    const res = await fetchFromBff<any>(`/api/projects/punch-list-items/?project_uid=${projectUid}`, { method: "GET" });
    return unpackArray<any>(res);
  },

  createPunchListItem: async (data: { 
    task: string | number; 
    title: string; 
    description: string; 
    severity: string; 
    issue_type: string;
    root_cause: string;
    attachments?: File[] 
  }) => {
    const formData = new FormData();
    formData.append("task", data.task.toString());
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("severity", data.severity);
    formData.append("issue_type", data.issue_type);
    formData.append("root_cause", data.root_cause);
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((file) => {
        formData.append("attachments", file);
      });
    }
    
    return fetchFromBff<any>(`/api/projects/punch-list-items/`, {
      method: "POST",
      body: formData
    });
  },

  resolvePunchListItem: async (itemId: number) => {
    return fetchFromBff<any>(`/api/projects/punch-list-items/${itemId}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_resolved: true })
    });
  },

  // ── Task Comments ────────────────────────────────────────────────────────
  getTaskComments: async (taskUid: string) => {
    const res = await fetchFromBff<any>(`/api/projects/task-comments/?task=${taskUid}`, { method: "GET" });
    return unpackArray<TaskComment>(res);
  },
  createTaskComment: async (taskUid: string, content: string) => {
    return fetchFromBff<TaskComment>(`/api/projects/task-comments/`, {
      method: "POST",
      body: JSON.stringify({ task: taskUid, content })
    });
  },

  // ── Asset Management ─────────────────────────────────────────────────


  uploadProjectAsset: async (projectId: number, category: string, file: File, title: string, thumbnail?: Blob) => {
    const formData = new FormData();
    formData.append("project", projectId.toString());
    formData.append("category", category);
    formData.append("file", file);
    formData.append("title", title);
    if (thumbnail) formData.append("thumbnail", thumbnail, "thumbnail.png");
    return fetchFromBff<any>("/api/projects/assets/", { method: "POST", body: formData });
  },

  saveSH3DProject: async (projectUid: string, data: {
    sh3dFile: Blob;
    name: string;
    thumbnailFile?: Blob | null;
    glbFile?: Blob | null;
  }) => {
    const formData = new FormData();
    formData.append('sh3d_file', data.sh3dFile, data.name);
    formData.append('name', data.name);
    if (data.thumbnailFile) {
      formData.append('thumbnail', data.thumbnailFile, 'thumbnail.png');
    }
    if (data.glbFile) {
      formData.append('glb_file', data.glbFile, 'model.glb');
    }
    return fetchFromBff<any>(`/api/projects/projects/${projectUid}/save-sh3d/`, {
      method: "POST",
      body: formData
    });
  },

  initSH3DProject: async (projectUid: string, name: string) => {
    return fetchFromBff<any>(`/api/projects/projects/${projectUid}/init-sh3d/`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },

  updateProjectAsset: async (assetId: number, data: Partial<{ title: string; category: string }>) => {
    return fetchFromBff<any>(`/api/projects/assets/${assetId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteProjectAsset: async (assetId: number) => {
    return fetchFromBff<void>(`/api/projects/assets/${assetId}/`, { method: "DELETE" });
  },

  // ── Revision Control ──────────────────────────────────────────────────

  uploadRevision: async (parentAssetId: number, file: File, revisionNotes?: string, thumbnail?: Blob) => {
    const formData = new FormData();
    formData.append("file", file);
    if (revisionNotes) formData.append("revision_notes", revisionNotes);
    if (thumbnail) formData.append("thumbnail", thumbnail, "thumbnail.png");
    return fetchFromBff<any>(`/api/projects/assets/${parentAssetId}/upload-revision/`, { method: "POST", body: formData });
  },

  getAssetHistory: async (assetId: number) => {
    return fetchFromBff<any[]>(`/api/projects/assets/${assetId}/history/`, { method: "GET" });
  },

  promoteAssetVersion: async (assetId: number) => {
    return fetchFromBff<any>(`/api/projects/assets/${assetId}/promote/`, { method: "POST" });
  },

  // ── Task–Asset Linking ────────────────────────────────────────────────

  linkAssetToTask: async (taskUid: string, canonicalUid: string) => {
    return fetchFromBff<TaskAssetLink>("/api/projects/task-asset-links/", {
      method: "POST",
      body: JSON.stringify({ task: taskUid, canonical_uid: canonicalUid })
    });
  },

  unlinkAssetFromTask: async (linkId: number) => {
    return fetchFromBff<void>(`/api/projects/task-asset-links/${linkId}/`, { method: "DELETE" });
  },

  // ── Site Photos ──────────────────────────────────────────────────────
  
  uploadSitePhoto: async (data: {
    floor_plan: number;
    image: File;
    grid_col: number;
    grid_row: number;
    latitude?: number;
    longitude?: number;
    gps_accuracy_m?: number;
    gps_source: string;
    caption?: string;
  }) => {
    const formData = new FormData();
    formData.append("floor_plan", data.floor_plan.toString());
    formData.append("image", data.image);
    formData.append("grid_col", data.grid_col.toString());
    formData.append("grid_row", data.grid_row.toString());
    if (data.latitude) formData.append("latitude", data.latitude.toString());
    if (data.longitude) formData.append("longitude", data.longitude.toString());
    if (data.gps_accuracy_m) formData.append("gps_accuracy_m", data.gps_accuracy_m.toString());
    formData.append("gps_source", data.gps_source);
    if (data.caption) formData.append("caption", data.caption);
    
    return fetchFromBff<any>("/api/projects/site-photos/", { method: "POST", body: formData });
  },

  getSitePhotos: async (floorPlanId: number) => {
    const res = await fetchFromBff<any>(`/api/projects/site-photos/?floor_plan=${floorPlanId}`, { method: "GET" });
    return unpackArray<any>(res);
  },

  deleteSitePhoto: async (photoId: number) => {
    return fetchFromBff<void>(`/api/projects/site-photos/${photoId}/`, { method: "DELETE" });
  },

  // ── Floor Plan Estimations (Take-Off) ──────────────────────────────────
  getEstimations: async (floorPlanId: number) => {
    const res = await fetchFromBff<any>(`/api/projects/estimations/?floor_plan=${floorPlanId}`, { method: "GET" });
    return unpackArray<any>(res);
  },

  createEstimation: async (data: {
    floor_plan: number;
    item_code: string;
    description: string;
    unit?: string;
    no_of_items?: number | string;
    length?: number | string;
    width?: number | string;
    depth_height?: number | string;
    gross_qty: number | string;
    is_deduction?: boolean;
    net_qty: number | string;
    trace_data?: any;
  }) => {
    const payload: any = { ...data };
    if (payload.length === "") payload.length = undefined;
    if (payload.width === "") payload.width = undefined;
    if (payload.depth_height === "") payload.depth_height = undefined;
    if (payload.gross_qty === "") payload.gross_qty = undefined;
    if (payload.net_qty === "") payload.net_qty = undefined;
    if (payload.no_of_items === "") payload.no_of_items = undefined;
    return fetchFromBff<any>("/api/projects/estimations/", { method: "POST", body: JSON.stringify(payload) });
  },

  updateEstimation: async (estimationId: number, data: Partial<any>) => {
    const payload: any = { ...data };
    if (payload.length === "") payload.length = undefined;
    if (payload.width === "") payload.width = undefined;
    if (payload.depth_height === "") payload.depth_height = undefined;
    if (payload.gross_qty === "") payload.gross_qty = undefined;
    if (payload.net_qty === "") payload.net_qty = undefined;
    if (payload.no_of_items === "") payload.no_of_items = undefined;
    return fetchFromBff<any>(`/api/projects/estimations/${estimationId}/`, { method: "PATCH", body: JSON.stringify(payload) });
  },

  deleteEstimation: async (estimationId: number) => {
    return fetchFromBff<void>(`/api/projects/estimations/${estimationId}/`, { method: "DELETE" });
  },

  // ── Project Estimation (Aggregated Pricing) ──────────────────────────────
  getEstimationSummary: async (projectUid: string) => {
    return fetchFromBff<{ items: any[], grand_total: number }>(`/api/projects/projects/${projectUid}/estimation-summary/`, { method: "GET" });
  },

  updateEstimationPricing: async (projectUid: string, itemCode: string, unitCost: number | string) => {
    return fetchFromBff<any>(`/api/projects/projects/${projectUid}/estimation-pricing/`, { 
      method: "POST", 
      body: JSON.stringify({ item_code: itemCode, unit_cost: unitCost }) 
    });
  },

  updateEstimationMapping: async (projectUid: string, itemCode: string, compositionMapping: string) => {
    return fetchFromBff<any>(`/api/projects/projects/${projectUid}/estimation-mapping/`, { 
      method: "POST", 
      body: JSON.stringify({ item_code: itemCode, composition_mapping: compositionMapping }) 
    });
  },

  pushEstimationToBoq: async (projectUid: string, mappings: Record<string, string> = {}) => {
    return fetchFromBff<{ success: boolean, pushed_items: number }>(`/api/projects/projects/${projectUid}/push-to-boq/`, { 
      method: "POST",
      body: JSON.stringify({ mappings })
    });
  },

  // ── Utilities ──────────────────────────────────────────────────────────

  getTaskTemplates: async () => {
    return fetchFromBff<any>("/api/projects/task-templates/", { method: "GET" });
  },

  getSecureAssetUrl: (assetId: number) => {
    return `/api/projects/assets/${assetId}/secure-view/`;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATRIX ENGINE API
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Matrix View 1 (Compact grid payload) ─────────────────────────────────
  getMatrix: async (projectUid: string): Promise<MatrixPayload> => {
    return fetchFromBff<MatrixPayload>(`/api/projects/projects/${projectUid}/matrix/`, { method: "GET" });
  },

  // ── Matrix View 2 (Expanded feed, paginated by phase) ────────────────────
  getExpandedFeed: async (projectUid: string, page: number = 1): Promise<ExpandedFeedPayload> => {
    return fetchFromBff<ExpandedFeedPayload>(
      `/api/projects/projects/${projectUid}/expanded-feed/?page=${page}`,
      { method: "GET" }
    );
  },

  // ── Spatial Zones ─────────────────────────────────────────────────────────
  getZones: async (projectId: number): Promise<SpatialZone[]> => {
    const res = await fetchFromBff<any>(`/api/projects/zones/?project=${projectId}`, { method: "GET" });
    return unpackArray<SpatialZone>(res);
  },

  createZone: async (data: { project: number; name: string; order?: number; zone_type?: string; bim_element_id?: string }) => {
    return fetchFromBff<SpatialZone>("/api/projects/zones/", { method: "POST", body: JSON.stringify(data) });
  },

  updateZone: async (zoneId: number, data: Partial<SpatialZone>) => {
    return fetchFromBff<SpatialZone>(`/api/projects/zones/${zoneId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteZone: async (zoneId: number) => {
    return fetchFromBff<void>(`/api/projects/zones/${zoneId}/`, { method: "DELETE" });
  },

  uploadZoneDrawing: async (zoneId: number, file: File) => {
    const formData = new FormData();
    formData.append("drawing_snapshot", file);
    return fetchFromBff<SpatialZone>(`/api/projects/zones/${zoneId}/`, { method: "PATCH", body: formData });
  },

  // ── Milestone Phases ──────────────────────────────────────────────────────
  getPhases: async (projectId: number): Promise<MilestonePhase[]> => {
    const res = await fetchFromBff<any>(`/api/projects/phases/?project=${projectId}`, { method: "GET" });
    return unpackArray<MilestonePhase>(res);
  },

  createPhase: async (data: { project: number; name: string; sequence_order: number; color_hex?: string }) => {
    return fetchFromBff<MilestonePhase>("/api/projects/phases/", { method: "POST", body: JSON.stringify(data) });
  },

  updatePhase: async (phaseId: number, data: Partial<MilestonePhase>) => {
    return fetchFromBff<MilestonePhase>(`/api/projects/phases/${phaseId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deletePhase: async (phaseId: number) => {
    return fetchFromBff<void>(`/api/projects/phases/${phaseId}/`, { method: "DELETE" });
  },

  // ── Unified Tasks for Matrix ────────────────────────────────────────────────
  getOrCreateBlock: async (zoneId: number, phaseId: number) => {
    return fetchFromBff<any>(`/api/projects/blocks/get_or_create_empty/`, {
      method: "POST",
      body: JSON.stringify({ zone_id: zoneId, phase_id: phaseId })
    });
  },

  getBlockTasks: async (blockId: number): Promise<Task[]> => {
    const res = await fetchFromBff<any>(`/api/projects/tasks/?block=${blockId}`, { method: "GET" });
    return unpackArray<Task>(res);
  },

  getConstructionTask: async (taskId: string) => {
    return fetchFromBff<Task>(`/api/projects/tasks/${taskId}/`, { method: "GET" });
  },

  createConstructionTask: async (data: Partial<Task> & { block: number; title: string }) => {
    // Determine project from block or context
    return fetchFromBff<Task>("/api/projects/tasks/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateConstructionTask: async (taskId: string, data: Partial<Task>) => {
    return fetchFromBff<Task>(`/api/projects/tasks/${taskId}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  moveConstructionTask: async (taskId: string, newStatus: string) => {
    return fetchFromBff<Task>(`/api/projects/tasks/${taskId}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus })
    });
  },

  logProgress: async (taskId: string, quantityDelta: number) => {
    return fetchFromBff<Task>(`/api/projects/tasks/${taskId}/log-progress/`, {
      method: "POST",
      body: JSON.stringify({ quantity_delta: quantityDelta })
    });
  },

  deleteConstructionTask: async (taskId: string) => {
    return fetchFromBff<void>(`/api/projects/tasks/${taskId}/`, { method: "DELETE" });
  },

  // ── Procurement ───────────────────────────────────────────────────────────
  getBOQItems: async () => {
    const res = await fetchFromBff<any>(`/api/projects/boq-items/`, { method: "GET" });
    return unpackArray<BOQItem>(res);
  },


  updateBOQItem: async (id: number, data: Partial<{ phase: number | null; material_code: string; total_budgeted_qty: string | number; unit_rate: string | number }>) => {
    return fetchFromBff<BOQItem>(`/api/projects/boq-items/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  createBOQSubItem: async (data: { parent: number; material_code: string; description?: string; quantity: string | number; unit_rate: string | number }) => {
    return fetchFromBff<any>(`/api/projects/boq-sub-items/`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  deleteBOQSubItem: async (id: number) => {
    return fetchFromBff<void>(`/api/projects/boq-sub-items/${id}/`, {
      method: "DELETE"
    });
  },

  getProcurementAggregation: async (projectUid?: string) => {
    const url = projectUid ? `/api/projects/procurement/aggregator/?project_uid=${projectUid}` : `/api/projects/procurement/aggregator/`;
    return fetchFromBff<any[]>(url, { method: "GET" });
  },

  createMaterialAllocation: async (data: { task: string; boq_item: number; allocated_qty: string | number; req_status?: string; notes?: string; expected_on_site_by?: string }) => {
    return fetchFromBff<TaskMaterialAllocation>(`/api/projects/material-allocations/`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateMaterialAllocation: async (allocationId: number, data: Partial<TaskMaterialAllocation>) => {
    return fetchFromBff<TaskMaterialAllocation>(`/api/projects/material-allocations/${allocationId}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  updateMaterialAllocationStatus: async (allocationId: number, reqStatus: string, notes?: string, expectedOnSiteBy?: string) => {
    return fetchFromBff<TaskMaterialAllocation>(`/api/projects/material-allocations/${allocationId}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ req_status: reqStatus, notes, expected_on_site_by: expectedOnSiteBy })
    });
  },

  logMaterialConsumption: async (allocationId: number | null, actualQty: number | string, totalCost: number | string, receipt?: File | null, taskUid?: string, boqItemId?: number) => {
    const formData = new FormData();
    formData.append("actual_consumed_qty", actualQty.toString());
    formData.append("total_cost", totalCost.toString());
    if (taskUid) formData.append("task_uid", taskUid);
    if (boqItemId) formData.append("boq_item_id", boqItemId.toString());
    if (receipt) {
      formData.append("receipt", receipt);
    }
    
    const url = allocationId 
      ? `/api/projects/material-allocations/${allocationId}/log/`
      : `/api/projects/material-allocations/log-lazy/`;
      
    return fetchFromBff<TaskMaterialAllocation>(url, {
      method: "POST",
      body: formData
    });
  },

  bulkUpdateMaterialAllocationStatus: async (ids: number[], reqStatus: string) => {
    return fetchFromBff<any>(`/api/projects/material-allocations/bulk-update-status/`, {
      method: "POST",
      body: JSON.stringify({ ids, req_status: reqStatus })
    });
  },

  // ── Material Assemblies ───────────────────────────────────────────────────
  getMaterialAssemblies: async (): Promise<any[]> => {
    const res = await fetchFromBff<any>("/api/projects/material-assemblies/", { method: "GET" });
    return unpackArray<any>(res);
  },

  createMaterialAssembly: async (data: any) => {
    return fetchFromBff<any>("/api/projects/material-assemblies/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateMaterialAssembly: async (id: number, data: any) => {
    return fetchFromBff<any>(`/api/projects/material-assemblies/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  uploadMaterialAssemblyImage: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return fetchFromBff<any>(`/api/projects/material-assemblies/${id}/`, {
      method: "PATCH",
      body: formData
    });
  },

  removeMaterialAssemblyImage: async (id: number) => {
    return fetchFromBff<any>(`/api/projects/material-assemblies/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ image: null })
    });
  },

  deleteMaterialAssembly: async (id: number) => {
    return fetchFromBff<void>(`/api/projects/material-assemblies/${id}/`, { method: "DELETE" });
  },

  createMaterialAssemblyComponent: async (data: any) => {
    return fetchFromBff<any>("/api/projects/material-assembly-components/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateMaterialAssemblyComponent: async (id: number, data: any) => {
    return fetchFromBff<any>(`/api/projects/material-assembly-components/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  deleteMaterialAssemblyComponent: async (id: number) => {
    return fetchFromBff<void>(`/api/projects/material-assembly-components/${id}/`, { method: "DELETE" });
  },

  generateMaterialRecipe: async (item_code: string, description: string) => {
    return fetchFromBff<any>(`/api/projects/material-assemblies/generate-recipe/`, {
      method: "POST",
      body: JSON.stringify({ item_code, description })
    });
  },

  // ── Work Package Templates ────────────────────────────────────────────────
  getWorkPackages: async (): Promise<WorkPackageTemplate[]> => {
    const res = await fetchFromBff<any>("/api/projects/work-packages/", { method: "GET" });
    return unpackArray<WorkPackageTemplate>(res);
  },

  createWorkPackage: async (data: Partial<WorkPackageTemplate>) => {
    return fetchFromBff<WorkPackageTemplate>("/api/projects/work-packages/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // ── Workspace Generator ───────────────────────────────────────────────────
  generateWorkspace: async (projectUid: string, payload: {
    zones: { name: string; order?: number; zone_type?: string; bim_element_id?: string }[];
    phases: { name: string; sequence_order: number; color_hex?: string }[];
    zone_package_mapping?: Record<string, number>;
  }) => {
    return fetchFromBff<{ zones: number; phases: number; blocks: number; tasks: number }>(
      `/api/projects/projects/${projectUid}/generate-workspace/`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  // ── AI Zone Parser (Gemini Vision) ───────────────────────────────────────
  parseZonesFromDrawing: async (projectUid: string, file: File): Promise<{ zones: AIZoneResult[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchFromBff<{ zones: AIZoneResult[] }>(
      `/api/projects/projects/${projectUid}/parse-zones/`,
      { method: "POST", body: formData }
    );
  },

  // ── Block unlock (admin override) ─────────────────────────────────────────
  unlockBlock: async (blockId: number) => {
    return fetchFromBff<any>(`/api/projects/blocks/${blockId}/unlock/`, { method: "POST" });
  },

  // ── Share Links ───────────────────────────────────────────────────────────
  getShareLinks: async (projectId: string) => {
    return fetchFromBff<any[]>(`/api/projects/projects/${projectId}/share/`, { method: "GET" });
  },

  createShareLink: async (projectId: string, expiresInDays: number | null) => {
    return fetchFromBff<any>(`/api/projects/projects/${projectId}/share/`, {
      method: "POST",
      body: JSON.stringify({ expires_in_days: expiresInDays })
    });
  },

  revokeShareLink: async (projectId: string, token: string) => {
    return fetchFromBff<void>(`/api/projects/projects/${projectId}/share/${token}/`, { method: "DELETE" });
  },

  publishPortfolio: async (projectUid: string, data?: { category: string; city: string; country: string }) => {
    return fetchFromBff<any>(`/api/projects/projects/${projectUid}/publish-portfolio/`, { 
      method: "POST",
      body: data ? JSON.stringify(data) : undefined
    });
  },
};
