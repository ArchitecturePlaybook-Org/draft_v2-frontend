import { fetchFromBff } from "@/shared/api/fetchFromBff";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateAsset {
  uid: string;
  title: string;
  description: string;
  template_status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  template_visibility: "PRIVATE" | "ORG" | "PUBLIC" | "UNLISTED";
  template_category: string;
  template_tags: string[];
  template_building_type: string;
  template_country: string;
  template_difficulty: "BEGINNER" | "INTERMEDIATE" | "EXPERT" | "";
  template_license: string;
  template_est_duration_days: number | null;
  template_est_cost_min: string | null;
  template_est_cost_max: string | null;
  template_thumbnail: string;
  template_version: number;
  created_at: string;
  avg_rating: number;
  rating_count: number;
  task_count: number;
  checklist_count: number;
  author_name: string;
  // Auth-only fields
  is_in_library?: boolean;
  is_favorite?: boolean;
  use_count?: number;
  user_rating?: number | null;
  share_token?: string;
}

export interface TemplateRating {
  id: number;
  user_name: string;
  score: number;
  review: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Public: Marketplace Browsing ─────────────────────────────────────────────

export async function fetchPublicTemplates(params?: {
  category?: string;
  building_type?: string;
  difficulty?: string;
  search?: string;
  sort?: string;
  page?: number;
}): Promise<PaginatedResponse<TemplateAsset>> {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.building_type) q.set("building_type", params.building_type);
  if (params?.difficulty) q.set("difficulty", params.difficulty);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("sort", params.sort);
  if (params?.page) q.set("page", String(params.page));
  const qs = q.toString() ? `?${q.toString()}` : "";
  return fetchFromBff<PaginatedResponse<TemplateAsset>>(`/api/v1/marketplace/templates/${qs}`);
}

export async function fetchTemplateByShareToken(shareToken: string): Promise<TemplateAsset> {
  return fetchFromBff<TemplateAsset>(`/api/v1/public/templates/${shareToken}/`);
}

export async function saveTemplateToLibrary(shareToken: string): Promise<void> {
  return fetchFromBff<void>(`/api/v1/public/templates/${shareToken}/save/`, { method: "POST" });
}

// ─── Auth: User's Template Library ───────────────────────────────────────────

export async function fetchMyTemplates(): Promise<TemplateAsset[]> {
  const data = await fetchFromBff<PaginatedResponse<TemplateAsset> | TemplateAsset[]>("/api/v1/templates/");
  return Array.isArray(data) ? data : (data as PaginatedResponse<TemplateAsset>).results || [];
}

export async function fetchTemplateDetail(uid: string): Promise<TemplateAsset> {
  return fetchFromBff<TemplateAsset>(`/api/v1/templates/${uid}/`);
}

export async function rateTemplate(uid: string, score: number, review?: string): Promise<void> {
  return fetchFromBff<void>(`/api/v1/templates/${uid}/rate/`, {
    method: "POST",
    body: JSON.stringify({ score, review: review || "" }),
  });
}

export async function fetchTemplateRatings(uid: string): Promise<TemplateRating[]> {
  const data = await fetchFromBff<PaginatedResponse<TemplateRating> | TemplateRating[]>(
    `/api/v1/templates/${uid}/ratings/`
  );
  return Array.isArray(data) ? data : (data as PaginatedResponse<TemplateRating>).results || [];
}

export async function publishTemplate(
  uid: string,
  visibility: "PUBLIC" | "ORG" | "UNLISTED"
): Promise<TemplateAsset> {
  return fetchFromBff<TemplateAsset>(`/api/v1/templates/${uid}/publish/`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export async function generateShareLink(uid: string): Promise<{ share_token: string; share_url: string }> {
  return fetchFromBff<{ share_token: string; share_url: string }>(
    `/api/v1/templates/${uid}/generate-share-link/`,
    { method: "POST" }
  );
}

export async function favoriteTemplate(uid: string): Promise<{ is_favorite: boolean }> {
  return fetchFromBff<{ is_favorite: boolean }>(`/api/v1/templates/${uid}/favorite/`, {
    method: "POST",
  });
}

export async function createProjectFromTemplate(
  uid: string,
  accountId: number,
  title?: string
): Promise<{ uid: string; title: string }> {
  return fetchFromBff<{ uid: string; title: string }>(`/api/v1/templates/${uid}/create-project/`, {
    method: "POST",
    body: JSON.stringify({ account_id: accountId, title }),
  });
}
