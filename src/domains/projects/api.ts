import { fetchFromBff } from "@/shared/api/fetchFromBff";
import {
  Project, ProjectDetail, TaskAssetLink,
  MatrixPayload, ExpandedFeedPayload, Task,
  WorkPackageTemplate, SpatialZone, MilestonePhase, AIZoneResult,
  TaskComment, ChecklistTemplate, SitePhoto
} from "@/types/projects";
import { DiaryEntry } from "@/types/diary";
import { NCR } from "@/types/quality";

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
  getProjects: async (): Promise<Project[]> => {
    const res = await fetchFromBff<PaginatedResponse<Project> | Project[]>("/api/v1/projects/projects/", { method: "GET" });
    return unpackArray<Project>(res);
  },

  getProjectDetails: async (id: string | number) => {
    return fetchFromBff<ProjectDetail>(`/api/v1/projects/projects/${id}/`, { method: "GET" });
  },

  getProjectAnalytics: async (id: string | number) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${id}/analytics/`, { method: "GET" });
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
    is_template?: boolean;
    template_scope?: string;
  }) => {
    return fetchFromBff<Project>("/api/v1/projects/projects/", {
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
        client_email: data.client_email,
        is_template: data.is_template,
        template_scope: data.template_scope
      })
    });
  },

  getTemplates: async () => {
    return fetchFromBff<PaginatedResponse<Project> | Project[]>("/api/v1/projects/projects/?is_template=true", { method: "GET" });
  },

  cloneProject: async (uid: string, account_id?: number) => {
    const body = account_id ? { account_id } : {};
    return fetchFromBff<ProjectDetail>(`/api/v1/projects/projects/${uid}/clone/`, { 
        method: "POST", 
        body: JSON.stringify(body) 
    });
  },

  duplicateProject: async (uid: string) => {
    return fetchFromBff<ProjectDetail>(`/api/v1/projects/projects/${uid}/duplicate/`, { 
        method: "POST", 
        body: JSON.stringify({}) 
    });
  },

  generateShareToken: async (uid: string) => {
    return fetchFromBff<{ share_token: string }>(`/api/v1/projects/projects/${uid}/generate_share_token/`, { method: "POST" });
  },

  importTemplate: async (share_token: string, account_id: number) => {
    return fetchFromBff<ProjectDetail>("/api/v1/projects/projects/import_template/", { 
      method: "POST", 
      body: JSON.stringify({ share_token, account_id }) 
    });
  },

  updateProject: async (uid: string, data: Partial<Project>) => {
    return fetchFromBff<Project>(`/api/v1/projects/projects/${uid}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  deleteProject: async (uid: string) => {
    return fetchFromBff<void>(`/api/v1/projects/projects/${uid}/`, {
      method: "DELETE"
    });
  },

  exportProjectData: (uid: string, type: 'boq' | 'tasks' | 'estimations', format: 'excel' | 'csv' | 'pdf' = 'excel', groupBy: 'flat' | 'floor_plan' = 'flat') => {
    window.open(`/api/v1/projects/projects/${uid}/export/?type=${type}&format=${format}&group_by=${groupBy}`, "_blank");
  },

  exportProjectReport: (uid: string) => {
    window.open(`/api/v1/projects/projects/${uid}/report/`, "_blank");
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  getTasks: async (filters?: { project?: number | string; block?: number | string; status?: string; priority?: string; search?: string; assignee?: number | string; tags?: string; include_subtasks?: boolean; is_shared?: boolean }) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.project) params.append("project", filters.project.toString());
      if (filters.block) params.append("block", filters.block.toString());
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.search) params.append("search", filters.search);
      if (filters.assignee) params.append("assignee", filters.assignee.toString());
      if (filters.tags) params.append("tags", filters.tags);
      if (filters.include_subtasks) params.append("include_subtasks", "true");
      if (filters.is_shared) params.append("is_shared", "true");
    }
    const queryString = params.toString();
    const url = `/api/v1/projects/tasks/${queryString ? `?${queryString}` : ""}`;
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<Task>(res);
  },

  bulkUpdateTasks: async (task_uids: string[], updates: any) => {
    return fetchFromBff<{success: boolean, updated_count: number}>("/api/v1/projects/tasks/bulk_update/", {
      method: "POST",
      body: JSON.stringify({ task_uids, updates })
    });
  },

  bulkDeleteTasks: async (task_uids: string[]) => {
    return fetchFromBff<{success: boolean, deleted_count: number}>("/api/v1/projects/tasks/bulk_delete/", {
      method: "DELETE",
      body: JSON.stringify({ task_uids })
    });
  },

  deleteTask: async (uid: string) => {
    return fetchFromBff<any>(`/api/v1/projects/tasks/${uid}/`, { method: "DELETE" });
  },

  restoreTask: async (uid: string) => {
    return fetchFromBff<any>(`/api/v1/projects/tasks/${uid}/restore/`, { method: "POST" });
  },

  addProjectMember: async (projectId: number, userId: number, role: string = "viewer") => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectId}/members/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role })
    });
  },

  removeProjectMember: async (projectId: number, userId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/projects/${projectId}/members/${userId}/`, { method: "DELETE" });
  },

  getTask: async (taskId: string) => {
    return fetchFromBff<any>(`/api/v1/projects/tasks/${taskId}/`, { method: "GET" });
  },

  createTask: async (data: { project?: number | string; title: string; [key: string]: any }) => {
    console.log("[FRONTEND_API] createTask called with payload:", data);
    const res = await fetchFromBff<any>("/api/v1/projects/tasks/", { method: "POST", body: JSON.stringify(data) });
    console.log("[FRONTEND_API] createTask response:", res);
    return res;
  },

  updateTask: async (taskId: string, data: Partial<any>) => {
    return fetchFromBff<any>(`/api/v1/projects/tasks/${taskId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  // ── Checklist Items ───────────────────────────────────────────────────────
  getProjectChecklists: async (projectUid: string) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/task-checklists/?project_uid=${projectUid}`, { method: "GET" });
    return unpackArray<any>(res);
  },

  createChecklistItem: async (taskUid: string, title: string) => {
    return fetchFromBff<any>(`/api/v1/projects/task-checklists/`, {
      method: "POST",
      body: JSON.stringify({ task: taskUid, title: title, is_completed: false })
    });
  },

  updateChecklistItem: async (itemId: number, isCompleted: boolean) => {
    return fetchFromBff<any>(`/api/v1/projects/task-checklists/${itemId}/`, {
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
    return fetchFromBff<any>(`/api/v1/projects/task-checklists/${itemId}/`, {
      method: "PATCH",
      body: formData
    });
  },

  deleteChecklistItem: async (itemId: number) => {
    return fetchFromBff<any>(`/api/v1/projects/task-checklists/${itemId}/`, {
      method: "DELETE"
    });
  },

  getChecklistTemplates: async () => {
    const res = await fetchFromBff<any>(`/api/v1/projects/checklist-templates/`, { method: "GET" });
    return unpackArray<ChecklistTemplate>(res);
  },

  createChecklistTemplate: async (data: { name: string; description?: string }) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/checklist-templates/`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return res.data;
  },

  deleteChecklistTemplate: async (templateId: number) => {
    await fetchFromBff<any>(`/api/v1/projects/checklist-templates/${templateId}/`, {
      method: "DELETE"
    });
  },

  syncChecklistTemplateItems: async (templateId: number, items: { title: string; requires_visual_proof: boolean }[]) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/checklist-templates/${templateId}/sync-items/`, {
      method: "POST",
      body: JSON.stringify({ items })
    });
    return res.data;
  },

  importChecklistTemplate: async (taskUid: string, templateId: number) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/tasks/${taskUid}/import-checklist/`, {
      method: "POST",
      body: JSON.stringify({ template_id: templateId })
    });
    return unpackArray<any>(res);
  },

  // ── Task Access Requests ──────────────────────────────────────────────────
  getTaskPublicInfo: async (taskUid: string) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/tasks/${taskUid}/public_info/`, { method: "GET" });
    return res;
  },

  requestTaskAccess: async (taskUid: string) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/tasks/${taskUid}/request_access/`, { method: "POST" });
    return res;
  },

  getPendingTaskRequests: async (projectUid?: string) => {
    const url = projectUid 
      ? `/api/v1/projects/task-requests/?project_uid=${projectUid}`
      : `/api/v1/projects/task-requests/`;
    const res = await fetchFromBff<any>(url, { method: "GET" });
    return unpackArray<any>(res);
  },

  approveTaskRequest: async (requestId: number) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/task-requests/${requestId}/approve/`, { method: "POST" });
    return res;
  },

  rejectTaskRequest: async (requestId: number) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/task-requests/${requestId}/reject/`, { method: "POST" });
    return res;
  },

  getProjectTaskCollaborators: async (projectUid: string) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/task-collaborators/`, { method: "GET" });
    return unpackArray<any>(res);
  },


  getTaskCollaborators: async (taskUid: string) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/tasks/${taskUid}/collaborators/`, { method: "GET" });
    return unpackArray<any>(res);
  },

  removeTaskCollaborator: async (taskUid: string, userId: number) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/tasks/${taskUid}/remove-collaborator/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId })
    });
    return res;
  },



  // ── Field Diary ───────────────────────────────────────────────────────────
  getDiaryEntries: async (projectUid: string): Promise<DiaryEntry[]> => {
    const res = await fetchFromBff<DiaryEntry[] | PaginatedResponse<DiaryEntry>>(`/api/v1/projects/field-diaries/entries/?project_uid=${projectUid}`, { method: "GET" });
    return unpackArray<DiaryEntry>(res);
  },

  getDiaryEntryDetail: async (id: number): Promise<DiaryEntry> => {
    return fetchFromBff<DiaryEntry>(`/api/v1/projects/field-diaries/entries/${id}/`, { method: "GET" });
  },

  createDiaryEntry: async (data: Partial<DiaryEntry>): Promise<DiaryEntry> => {
    return fetchFromBff<DiaryEntry>("/api/v1/projects/field-diaries/entries/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateDiaryEntry: async (id: number, data: Partial<DiaryEntry>): Promise<DiaryEntry> => {
    return fetchFromBff<DiaryEntry>(`/api/v1/projects/field-diaries/entries/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  signDiaryEntry: async (id: number): Promise<DiaryEntry> => {
    return fetchFromBff<DiaryEntry>(`/api/v1/projects/field-diaries/entries/${id}/sign/`, {
      method: "POST"
    });
  },

  createDiarySubEntry: async (diaryId: number, subModel: string, data: any): Promise<any> => {
    return fetchFromBff<any>(`/api/v1/projects/field-diaries/entries/${diaryId}/${subModel}/`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  deleteDiarySubEntry: async (subModel: string, id: number): Promise<void> => {
    // subModel should be 'labor', 'delays', 'activities', 'materials', or 'equipment'
    return fetchFromBff<void>(`/api/v1/projects/field-diaries/${subModel}/${id}/`, { method: "DELETE" });
  },

  uploadDiaryAttachment: async (diaryId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchFromBff<any>(`/api/v1/projects/field-diaries/entries/${diaryId}/attachments/`, {
      method: "POST",
      body: formData
    });
  },

  uploadMaterialReceipt: async (materialId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("receipt_image", file);
    return fetchFromBff<any>(`/api/v1/projects/field-diaries/materials/${materialId}/upload-receipt/`, {
      method: "PATCH",
      body: formData
    });
  },


  // ── Non-Conformance Reports (NCR) ───────────────────────────────────────
  getNcrs: async (projectUid: string): Promise<NCR[]> => {
    const res = await fetchFromBff<NCR[] | PaginatedResponse<NCR>>(`/api/v1/projects/ncrs/?project_uid=${projectUid}`, { method: "GET" });
    return unpackArray<NCR>(res);
  },

  createNcr: async (data: { project: number; title: string; description: string; severity: string }): Promise<NCR> => {
    return fetchFromBff<NCR>("/api/v1/projects/ncrs/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateNcrStatus: async (ncrId: number, status: string): Promise<NCR> => {
    return fetchFromBff<NCR>(`/api/v1/projects/ncrs/${ncrId}/`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },



  // ── Task Comments ────────────────────────────────────────────────────────
  getTaskComments: async (taskUid: string) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/task-comments/?task=${taskUid}`, { method: "GET" });
    return unpackArray<TaskComment>(res);
  },
  createTaskComment: async (taskUid: string, content: string) => {
    return fetchFromBff<TaskComment>(`/api/v1/projects/task-comments/`, {
      method: "POST",
      body: JSON.stringify({ task: taskUid, content })
    });
  },

  createTaskAccessRequest: async (taskUid: string, reason: string) => {
    return fetchFromBff<any>("/api/v1/projects/task-requests/", {
      method: "POST",
      body: JSON.stringify({
        task_uid: taskUid,
        reason
      })
    });
  },

  // ── Task Tags ───────────────────────────────────────────────────────────
  getTaskTags: async () => {
    const res = await fetchFromBff<any>("/api/v1/projects/task-tags/", { method: "GET" });
    return unpackArray<any>(res);
  },

  createTaskTag: async (data: { name: string; color: string; account_id?: number }) => {
    return fetchFromBff<any>("/api/v1/projects/task-tags/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateTaskTag: async (id: number, data: any) => {
    return fetchFromBff<any>(`/api/v1/projects/task-tags/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  deleteTaskTag: async (id: number) => {
    return fetchFromBff<void>(`/api/v1/projects/task-tags/${id}/`, { method: "DELETE" });
  },

  // ── Asset & Folder Management ─────────────────────────────────────────

  createProjectFolder: async (data: { project: number; name: string; category: string; parent?: number | null }) => {
    return fetchFromBff<any>("/api/v1/projects/folders/", { method: "POST", body: JSON.stringify(data) });
  },

  updateProjectFolder: async (folderId: number, data: Partial<{ name: string; parent: number | null }>) => {
    return fetchFromBff<any>(`/api/v1/projects/folders/${folderId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteProjectFolder: async (folderId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/folders/${folderId}/`, { method: "DELETE" });
  },

  uploadProjectAsset: async (projectId: number, category: string, file: File, title: string, thumbnail?: Blob, folderId?: number | null) => {
    try {
      // Step 1: Request presigned S3 upload URL from backend
      const presignedRes = await fetchFromBff<{
        direct_s3?: boolean;
        upload_url?: string;
        file_key?: string;
        file_url?: string;
      }>("/api/v1/projects/assets/presigned-upload-url/", {
        method: "POST",
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          category,
          project_id: projectId
        })
      });

      if (presignedRes?.direct_s3 && presignedRes.upload_url && presignedRes.file_key) {
        console.log("[Direct S3 Upload] Uploading directly from frontend to S3...");
        // Step 2: Upload file directly from browser to S3 via PUT request
        const s3PutRes = await fetch(presignedRes.upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream"
           },

          body: file
        });

        if (!s3PutRes.ok) {
          throw new Error(`Direct S3 upload failed with status ${s3PutRes.status}`);
        }

        console.log("[Direct S3 Upload] S3 upload successful. Saving asset metadata in DB.");
        // Step 3: Register asset record in DB using S3 file key
        const formData = new FormData();
        formData.append("project", projectId.toString());
        formData.append("category", category);
        formData.append("file_key", presignedRes.file_key);
        formData.append("title", title);
        formData.append("size", file.size.toString());
        if (folderId) formData.append("folder", folderId.toString());
        if (thumbnail) formData.append("thumbnail", thumbnail, "thumbnail.png");

        return fetchFromBff<any>("/api/v1/projects/assets/", { method: "POST", body: formData });
      }
    } catch (err) {
      console.warn("[Direct S3 Upload] Skipped or failed, falling back to standard upload:", err);
    }

    // Step 4: Fallback to standard multipart upload
    const formData = new FormData();
    formData.append("project", projectId.toString());
    formData.append("category", category);
    formData.append("file", file);
    formData.append("title", title);
    if (folderId) formData.append("folder", folderId.toString());
    if (thumbnail) formData.append("thumbnail", thumbnail, "thumbnail.png");
    return fetchFromBff<any>("/api/v1/projects/assets/", { method: "POST", body: formData });
  },

  saveSH3DProject: async (projectUid: string, data: {
    sh3dFile: Blob;
    name: string;
    thumbnailFile?: Blob | null;
    glbFile?: Blob | null;
    assetId?: string;
    asRevision?: boolean;
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
    if (data.assetId) {
      formData.append('asset_id', data.assetId);
    }
    if (data.asRevision) {
      formData.append('as_revision', 'true');
    }
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/save-sh3d/`, {
      method: "POST",
      body: formData
    });
  },

  initSH3DProject: async (projectUid: string, name: string) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/init-sh3d/`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },

  initSketchProject: async (projectUid: string, name: string) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/init-sketch/`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  getProjectAssetDetails: async (assetId: number, options?: { skipCache?: boolean }) => {
    return fetchFromBff<any>(`/api/v1/projects/assets/${assetId}/?all=true`, {
      method: "GET",
      skipCache: options?.skipCache,
    });
  },

  /** Load Excalidraw JSON for a specific asset revision (server reads storage directly). */
  getAssetScene: async (assetId: number) => {
    const cacheBust = Date.now();
    return fetchFromBff<any>(
      `/api/v1/projects/assets/${assetId}/scene/?all=true&_=${cacheBust}`,
      { method: "GET", skipCache: true },
    );
  },

  getAssetByCanonicalUid: async (canonicalUid: string) => {
    return fetchFromBff<any>(`/api/v1/projects/assets/by-canonical/${canonicalUid}/`, { method: "GET" });
  },

  updateProjectAsset: async (assetId: number, data: Partial<{ title: string; category: string }>) => {
    return fetchFromBff<any>(`/api/v1/projects/assets/${assetId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteProjectAsset: async (assetId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/assets/${assetId}/`, { method: "DELETE" });
  },

  // ── Floor Plan Calibration ─────────────────────────────────────────────
  calibrateAsset: async (assetId: number, scale_pixels_per_meter: number) => {
    return fetchFromBff<any>(`/api/v1/projects/assets/${assetId}/calibrate/`, { 
      method: "PATCH", 
      body: JSON.stringify({ scale_pixels_per_meter }) 
    });
  },

  // ── Revision Control ──────────────────────────────────────────────────

  uploadRevision: async (parentAssetId: number, file: File, revisionNotes?: string, thumbnail?: Blob) => {
    const formData = new FormData();
    formData.append("file", file);
    if (revisionNotes) formData.append("revision_notes", revisionNotes);
    if (thumbnail) formData.append("thumbnail", thumbnail, "thumbnail.png");
    return fetchFromBff<any>(`/api/v1/projects/assets/${parentAssetId}/upload-revision/`, { method: "POST", body: formData });
  },

  overwriteAsset: async (assetId: number, file: File, thumbnail?: Blob, revisionNotes?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (thumbnail) formData.append("thumbnail", thumbnail, "thumbnail.png");
    if (revisionNotes) formData.append("revision_notes", revisionNotes);
    return fetchFromBff<any>(`/api/v1/projects/assets/${assetId}/overwrite/`, { method: "POST", body: formData });
  },

  getAssetHistory: async (assetId: number) => {
    return fetchFromBff<any[]>(`/api/v1/projects/assets/${assetId}/history/?all=true`, {
      method: "GET",
      skipCache: true,
    });
  },

  promoteAssetVersion: async (assetId: number) => {
    return fetchFromBff<any>(`/api/v1/projects/assets/${assetId}/promote/`, { method: "POST" });
  },

  // ── Task–Asset Linking ────────────────────────────────────────────────

  linkAssetToTask: async (taskUid: string, canonicalUid: string) => {
    return fetchFromBff<TaskAssetLink>("/api/v1/projects/task-asset-links/", {
      method: "POST",
      body: JSON.stringify({ task: taskUid, canonical_uid: canonicalUid })
    });
  },

  unlinkAssetFromTask: async (linkId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/task-asset-links/${linkId}/`, { method: "DELETE" });
  },

  // ── Site Photos ────────────────────────────────────────────────────────
  
  uploadSitePhoto: async (data: {
    floor_plan: number;
    image: File;
    caption: string;
    grid_col: number;
    grid_row: number;
    latitude?: number;
    longitude?: number;
    gps_accuracy_m?: number;
    gps_source: 'browser' | 'exif' | 'none';
    captured_at?: string;
  }) => {
    const formData = new FormData();
    formData.append("floor_plan", data.floor_plan.toString());
    formData.append("image", data.image);
    formData.append("caption", data.caption);
    formData.append("grid_col", data.grid_col.toString());
    formData.append("grid_row", data.grid_row.toString());
    if (data.latitude) formData.append("latitude", data.latitude.toString());
    if (data.longitude) formData.append("longitude", data.longitude.toString());
    if (data.gps_accuracy_m) formData.append("gps_accuracy_m", data.gps_accuracy_m.toString());
    if (data.captured_at) formData.append("captured_at", data.captured_at);
    formData.append("gps_source", data.gps_source);
    
    return fetchFromBff<SitePhoto>("/api/v1/projects/site-photos/", { 
      method: "POST", 
      body: formData 
    });
  },

  getSitePhotos: async (floorPlanId: number) => {
    return fetchFromBff<any>(`/api/v1/projects/site-photos/?floor_plan=${floorPlanId}`).then(unpackArray<SitePhoto>);
  },

  deleteSitePhoto: async (photoId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/site-photos/${photoId}/`, { method: "DELETE" });
  },

  // ── Floor Plan Estimations (Take-Off) ──────────────────────────────────
  getEstimations: async (floorPlanId: number) => {
    const res = await fetchFromBff<any>(`/api/v1/projects/estimations/?floor_plan=${floorPlanId}`, { method: "GET" });
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
    return fetchFromBff<any>("/api/v1/projects/estimations/", { method: "POST", body: JSON.stringify(payload) });
  },

  updateEstimation: async (estimationId: number, data: Partial<any>) => {
    const payload: any = { ...data };
    if (payload.length === "") payload.length = undefined;
    if (payload.width === "") payload.width = undefined;
    if (payload.depth_height === "") payload.depth_height = undefined;
    if (payload.gross_qty === "") payload.gross_qty = undefined;
    if (payload.net_qty === "") payload.net_qty = undefined;
    if (payload.no_of_items === "") payload.no_of_items = undefined;
    return fetchFromBff<any>(`/api/v1/projects/estimations/${estimationId}/`, { method: "PATCH", body: JSON.stringify(payload) });
  },

  deleteEstimation: async (estimationId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/estimations/${estimationId}/`, { method: "DELETE" });
  },

  // ── Project Estimation (Aggregated Pricing) ──────────────────────────────
  getEstimationSummary: async (projectUid: string) => {
    return fetchFromBff<{ items: any[], grand_total: number }>(`/api/v1/projects/projects/${projectUid}/estimation-summary/`, { method: "GET" });
  },

  updateEstimationPricing: async (projectUid: string, itemCode: string, unitCost: number | string) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/estimation-pricing/`, { 
      method: "POST", 
      body: JSON.stringify({ item_code: itemCode, unit_cost: unitCost }) 
    });
  },

  updateEstimationMapping: async (projectUid: string, itemCode: string, compositionMapping: string) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/estimation-mapping/`, { 
      method: "POST", 
      body: JSON.stringify({ item_code: itemCode, composition_mapping: compositionMapping }) 
    });
  },

  pushEstimationToBoq: async (projectUid: string, mappings: Record<string, string> = {}) => {
    return fetchFromBff<{ success: boolean, pushed_items: number }>(`/api/v1/projects/projects/${projectUid}/push-to-boq/`, { 
      method: "POST",
      body: JSON.stringify({ mappings })
    });
  },

  importBIMJson: async (projectUid: string, elements: any[]) => {
    return fetchFromBff<{ success: boolean, imported: number }>(`/api/v1/projects/projects/${projectUid}/import-bim-json/`, {
      method: "POST",
      body: JSON.stringify({ elements })
    });
  },


  // ── Utilities ──────────────────────────────────────────────────────────

  getTaskTemplates: async () => {
    return fetchFromBff<any>("/api/v1/projects/task-templates/", { method: "GET" });
  },

  createTaskTemplate: async (data: { name: string; description?: string; default_duration_days?: number; default_checklists?: string[] }) => {
    return fetchFromBff<any>("/api/v1/projects/task-templates/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateTaskTemplate: async (templateId: number, data: Partial<{ name: string; description: string; default_duration_days: number; default_checklists: string[] }>) => {
    return fetchFromBff<any>(`/api/v1/projects/task-templates/${templateId}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  deleteTaskTemplate: async (templateId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/task-templates/${templateId}/`, {
      method: "DELETE"
    });
  },

  getInventoryItems: async () => {
    return fetchFromBff<any[]>("/api/v1/projects/inventory-items/");
  },

  // Invoices
  getVendorInvoices: async () => {
    return fetchFromBff<any[]>("/api/v1/projects/vendor-invoices/");
  },
  exportVendorInvoice: (invoiceId: number) => {
    window.open(`/api/v1/projects/vendor-invoices/${invoiceId}/export-pdf/`, "_blank");
  },

  getSecureAssetUrl: (assetId: number) => {
    return `/api/v1/projects/assets/${assetId}/secure-view/`;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATRIX ENGINE API
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Matrix View 1 (Compact grid payload) ─────────────────────────────────
  getMatrix: async (projectUid: string): Promise<MatrixPayload> => {
    return fetchFromBff<MatrixPayload>(`/api/v1/projects/projects/${projectUid}/matrix/`, { method: "GET" });
  },

  // ── Master Catalog (Global Template Dropdown) ───────────────────────────
  getMasterCatalog: async () => {
    const res = await fetchFromBff<any>("/api/v1/projects/master-catalog/", { method: "GET" });
    return unpackArray<any>(res);
  },

  downloadMasterCatalogTemplate: () => {
    window.open("/api/v1/projects/master-catalog/export_template/", "_blank");
  },

  importMasterCatalog: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchFromBff<any>("/api/v1/projects/master-catalog/import_excel/", {
      method: "POST",
      body: formData
    });
  },

  createMasterCatalogItem: async (data: any) => {
    return fetchFromBff<any>("/api/v1/projects/master-catalog/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  
  updateMasterCatalogItem: async (id: number, data: any) => {
    return fetchFromBff<any>(`/api/v1/projects/master-catalog/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  deleteMasterCatalogItem: async (id: number) => {
    return fetchFromBff<void>(`/api/v1/projects/master-catalog/${id}/`, { method: "DELETE" });
  },

  // ── Matrix View 2 (Expanded feed, paginated by phase) ────────────────────
  getExpandedFeed: async (projectUid: string, page: number = 1): Promise<ExpandedFeedPayload> => {
    return fetchFromBff<ExpandedFeedPayload>(
      `/api/v1/projects/projects/${projectUid}/expanded-feed/?page=${page}`,
      { method: "GET" }
    );
  },

  // ── Spatial Zones ─────────────────────────────────────────────────────────
  getZones: async (projectId: number): Promise<SpatialZone[]> => {
    const res = await fetchFromBff<any>(`/api/v1/projects/zones/?project=${projectId}`, { method: "GET" });
    return unpackArray<SpatialZone>(res);
  },

  createZone: async (data: { project: number; name: string; order?: number; zone_type?: string; bim_element_id?: string }) => {
    return fetchFromBff<SpatialZone>("/api/v1/projects/zones/", { method: "POST", body: JSON.stringify(data) });
  },

  updateZone: async (zoneId: number, data: Partial<SpatialZone>) => {
    return fetchFromBff<SpatialZone>(`/api/v1/projects/zones/${zoneId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteZone: async (zoneId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/zones/${zoneId}/`, { method: "DELETE" });
  },

  uploadZoneDrawing: async (zoneId: number, file: File) => {
    const formData = new FormData();
    formData.append("drawing_snapshot", file);
    return fetchFromBff<SpatialZone>(`/api/v1/projects/zones/${zoneId}/`, { method: "PATCH", body: formData });
  },

  // ── Milestone Phases ──────────────────────────────────────────────────────
  getPhases: async (projectId: number): Promise<MilestonePhase[]> => {
    const res = await fetchFromBff<any>(`/api/v1/projects/phases/?project=${projectId}`, { method: "GET" });
    return unpackArray<MilestonePhase>(res);
  },

  createPhase: async (data: { project: number; name: string; sequence_order: number; color_hex?: string }) => {
    return fetchFromBff<MilestonePhase>("/api/v1/projects/phases/", { method: "POST", body: JSON.stringify(data) });
  },

  updatePhase: async (phaseId: number, data: Partial<MilestonePhase>) => {
    return fetchFromBff<MilestonePhase>(`/api/v1/projects/phases/${phaseId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deletePhase: async (phaseId: number) => {
    return fetchFromBff<void>(`/api/v1/projects/phases/${phaseId}/`, { method: "DELETE" });
  },

  deleteMatrix: async (projectUid: string) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/matrix/`, { method: "DELETE" });
  },

  // ── Unified Tasks for Matrix ────────────────────────────────────────────────
  getOrCreateBlock: async (zoneId: number, phaseId: number) => {
    return fetchFromBff<any>(`/api/v1/projects/blocks/get_or_create_empty/`, {
      method: "POST",
      body: JSON.stringify({ zone_id: zoneId, phase_id: phaseId })
    });
  },

  updateBlock: async (blockId: number, data: Partial<any>) => {
    return fetchFromBff<any>(`/api/v1/projects/blocks/${blockId}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  getBlockTasks: async (blockId: number): Promise<Task[]> => {
    const res = await fetchFromBff<any>(`/api/v1/projects/tasks/?block=${blockId}`, { method: "GET" });
    return unpackArray<Task>(res);
  },

  getConstructionTask: async (taskId: string) => {
    return fetchFromBff<Task>(`/api/v1/projects/tasks/${taskId}/`, { method: "GET" });
  },

  createConstructionTask: async (data: Partial<Task> & { block: number; title: string }) => {
    // Determine project from block or context
    return fetchFromBff<Task>("/api/v1/projects/tasks/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  updateConstructionTask: async (taskId: string, data: Partial<Task>) => {
    return fetchFromBff<Task>(`/api/v1/projects/tasks/${taskId}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  moveConstructionTask: async (taskId: string, newStatus: string) => {
    return fetchFromBff<Task>(`/api/v1/projects/tasks/${taskId}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus })
    });
  },

  logProgress: async (taskId: string, quantityDelta: number) => {
    return fetchFromBff<Task>(`/api/v1/projects/tasks/${taskId}/log-progress/`, {
      method: "POST",
      body: JSON.stringify({ quantity_delta: quantityDelta })
    });
  },

  deleteConstructionTask: async (taskId: string) => {
    return fetchFromBff<void>(`/api/v1/projects/tasks/${taskId}/`, { method: "DELETE" });
  },



  // ── Work Package Templates ────────────────────────────────────────────────
  getWorkPackages: async (): Promise<WorkPackageTemplate[]> => {
    const res = await fetchFromBff<any>("/api/v1/projects/work-packages/", { method: "GET" });
    return unpackArray<WorkPackageTemplate>(res);
  },

  createWorkPackage: async (data: Partial<WorkPackageTemplate>) => {
    return fetchFromBff<WorkPackageTemplate>("/api/v1/projects/work-packages/", {
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
      `/api/v1/projects/projects/${projectUid}/generate-workspace/`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  // ── AI Zone Parser (Gemini Vision) ───────────────────────────────────────
  parseZonesFromDrawing: async (projectUid: string, file: File): Promise<{ zones: AIZoneResult[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchFromBff<{ zones: AIZoneResult[] }>(
      `/api/v1/projects/projects/${projectUid}/parse-zones/`,
      { method: "POST", body: formData }
    );
  },


  // ── Share Links ───────────────────────────────────────────────────────────

  getShareLinks: async (projectId: string) => {
    return fetchFromBff<any[]>(`/api/v1/projects/projects/${projectId}/share/`, { method: "GET" });
  },

  createShareLink: async (projectId: string, expiresInDays: number | null) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectId}/share/`, {
      method: "POST",
      body: JSON.stringify({ expires_in_days: expiresInDays })
    });
  },

  revokeShareLink: async (projectId: string, token: string) => {
    return fetchFromBff<void>(`/api/v1/projects/projects/${projectId}/share/${token}/`, { method: "DELETE" });
  },

  publishPortfolio: async (projectUid: string, data?: { category: string; city: string; country: string }) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/publish-portfolio/`, { 
      method: "POST",
      body: data ? JSON.stringify(data) : undefined
    });
  },

  // ── Template System ──────────────────────────────────────────────────────────

  /** Save an active project as a new template (non-destructive clone). */
  saveProjectAsTemplate: async (projectUid: string, metadata: {
    category?: string; tags?: string[]; building_type?: string;
    country?: string; difficulty?: string; license?: string;
    visibility?: string; est_duration_days?: number;
    est_cost_min?: number; est_cost_max?: number; thumbnail?: string;
  }) => {
    return fetchFromBff<any>(`/api/v1/projects/projects/${projectUid}/save-as-template/`, {
      method: "POST",
      body: JSON.stringify(metadata),
    });
  },

  /** Get the user's template library. Supports ?tab=mine|saved|org&search=&category=&sort=&favorites_only= */
  getTemplateLibrary: async (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchFromBff<any>(`/api/v1/projects/templates/${qs}`, { method: "GET" });
  },

  /** Get full detail for a single template (includes task tree). */
  getTemplateDetail: async (uid: string) => {
    return fetchFromBff<any>(`/api/v1/projects/templates/${uid}/`, { method: "GET" });
  },

  /** Update template metadata (category, tags, visibility, etc.). */
  updateTemplate: async (uid: string, data: Record<string, any>) => {
    return fetchFromBff<any>(`/api/v1/projects/templates/${uid}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /** Publish a template and set its visibility. */
  publishTemplate: async (uid: string, visibility: "PUBLIC" | "ORG" | "UNLISTED" = "PUBLIC") => {
    return fetchFromBff<any>(`/api/v1/projects/templates/${uid}/publish/`, {
      method: "PATCH",
      body: JSON.stringify({ visibility }),
    });
  },

  /** Archive a template (hides from library and marketplace, does not delete). */
  archiveTemplate: async (uid: string) => {
    return fetchFromBff<any>(`/api/v1/projects/templates/${uid}/archive/`, { method: "PATCH" });
  },

  /** Generate (or rotate) a shareable link token for a template. */
  generateTemplateShareLink: async (uid: string) => {
    return fetchFromBff<{ share_token: string; share_url: string }>(
      `/api/v1/projects/templates/${uid}/generate-share-link/`,
      { method: "POST" }
    );
  },

  /** Toggle favorite status for a template. */
  toggleTemplateFavorite: async (uid: string) => {
    return fetchFromBff<{ is_favorite: boolean }>(
      `/api/v1/projects/templates/${uid}/favorite/`,
      { method: "POST" }
    );
  },

  /** Submit or update a rating (1–5) on a published template. */
  rateTemplate: async (uid: string, score: number, review?: string) => {
    return fetchFromBff<any>(`/api/v1/projects/templates/${uid}/rate/`, {
      method: "POST",
      body: JSON.stringify({ score, review }),
    });
  },

  /** Get paginated ratings list for a template. */
  getTemplateRatings: async (uid: string, page = 1) => {
    return fetchFromBff<any>(`/api/v1/projects/templates/${uid}/ratings/?page=${page}`, { method: "GET" });
  },

  /** Create a new active project from a template. */
  createProjectFromTemplate: async (templateUid: string, data: {
    title: string; account_id: number;
    description?: string; kind?: string; location?: string;
    client_name?: string; client_phone?: string; client_email?: string;
  }) => {
    return fetchFromBff<{ uid: string; title: string }>(
      `/api/v1/projects/templates/${templateUid}/create-project/`,
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  /** Browse the public template marketplace. */
  getTemplatesHubTemplates: async (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchFromBff<any>(`/api/v1/projects/marketplace/templates/${qs}`, { method: "GET" });
  },

  /** Fetch a public template by its share token (no auth required). */
  getPublicTemplate: async (shareToken: string) => {
    return fetchFromBff<any>(`/api/v1/projects/public/templates/${shareToken}/`, { method: "GET" });
  },

  /** Fetch a public template's matrix data by its share token (no auth required). */
  getPublicTemplateMatrix: async (shareToken: string) => {
    return fetchFromBff<any>(`/api/v1/projects/public/templates/${shareToken}/matrix/`, { method: "GET" });
  },

  /** Save a public template (by share token) to the user's library. */
  savePublicTemplateToLibrary: async (shareToken: string) => {
    return fetchFromBff<{ saved: boolean; template_uid: string; template_title: string }>(
      `/api/v1/projects/public/templates/${shareToken}/save/`,
      { method: "POST" }
    );
  },

  // ── Matrix Block: Manual Unlock / Lock ─────────────────────────────────────

  /** Manually unlock a LOCKED block (manager only). */
  unlockBlock: async (blockId: number, reason?: string) => {
    return fetchFromBff<import("@/types/projects").MilestoneBlockCompact>(
      `/api/v1/projects/blocks/${blockId}/unlock/`,
      { method: "POST", body: JSON.stringify({ reason: reason ?? "" }) }
    );
  },

  /** Re-lock an ACTIVE block (manager only, only when all tasks are TODO). */
  lockBlock: async (blockId: number) => {
    return fetchFromBff<import("@/types/projects").MilestoneBlockCompact>(
      `/api/v1/projects/blocks/${blockId}/lock/`,
      { method: "POST" }
    );
  },
};



