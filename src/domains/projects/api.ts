import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { Project, ProjectDetail, TaskAssetLink } from "@/types/projects";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const projectsApi = {
  getProjects: async () => {
    return fetchFromBff<PaginatedResponse<Project> | Project[]>("/api/projects/projects/", { method: "GET" });
  },

  getProjectDetails: async (id: string | number) => {
    return fetchFromBff<ProjectDetail>(`/api/projects/projects/${id}/`, { method: "GET" });
  },

  createProject: async (data: { title: string; description?: string; account_id: number }) => {
    return fetchFromBff<Project>("/api/projects/projects/", {
      method: "POST",
      body: JSON.stringify({ title: data.title, description: data.description, account: data.account_id })
    });
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

  createTask: async (data: { project: number; title: string; description?: string; cost?: number; start_date?: string; end_date?: string }) => {
    return fetchFromBff<any>("/api/projects/tasks/", { method: "POST", body: JSON.stringify(data) });
  },

  updateTask: async (taskId: string, data: Partial<{ title: string; description: string; cost: number; status: string; start_date: string; end_date: string }>) => {
    return fetchFromBff<any>(`/api/projects/tasks/${taskId}/`, { method: "PATCH", body: JSON.stringify(data) });
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
    return fetchFromBff<any[]>(`/api/projects/site-photos/?floor_plan=${floorPlanId}`, { method: "GET" });
  },

  deleteSitePhoto: async (photoId: number) => {
    return fetchFromBff<void>(`/api/projects/site-photos/${photoId}/`, { method: "DELETE" });
  },

  // ── Utilities ──────────────────────────────────────────────────────────

  getTaskTemplates: async () => {
    return fetchFromBff<any>("/api/projects/task-templates/", { method: "GET" });
  },

  getSecureAssetUrl: (assetId: number) => {
    return `/api/projects/assets/${assetId}/secure-view/`;
  }
};
