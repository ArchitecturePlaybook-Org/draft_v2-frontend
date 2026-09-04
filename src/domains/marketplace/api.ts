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

export async function applyTemplate(
  projectUid: string,
  templateUid: string,
  startDate?: string
): Promise<TemplateAsset> {
  return fetchFromBff<TemplateAsset>(`/api/v1/projects/${projectUid}/apply-template/`, {
    method: "POST",
    body: JSON.stringify({
      template_uid: templateUid,
      start_date: startDate || new Date().toISOString().split("T")[0],
    }),
  });
}

// ─── Opportunities (Marketplace) ──────────────────────────────────────────────

export interface OpportunityPosting {
  id: number;
  poster: number;
  poster_details?: any; // User details
  project?: number;
  project_details?: any;
  task?: number;
  task_details?: any;
  type: "MATERIAL_REQUIRED" | "SERVICE_REQUIRED" | "PROJECT_LEAD";
  title: string;
  description: string;
  location: string;
  budget_range: string;
  requisition_id?: number | null;
  status: "OPEN" | "NEGOTIATING" | "CLOSED";
  is_public: boolean;
  tags: string[];
  procurement_items?: any[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityInterest {
  id: number;
  opportunity: number;
  opportunity_details?: OpportunityPosting;
  applicant: number;
  applicant_details?: any;
  status: "INTERESTED" | "IN_TALKS" | "AWARDED" | "REJECTED";
  chat_channel: number | null;
  quote_amount?: string | null;
  quote_attachment?: string | null;
  created_at: string;
  updated_at: string;
  po_created?: boolean;
  po_id?: string;
}

export async function fetchPublicOpportunities(params?: {
  type?: string;
  location?: string;
  search?: string;
  sort?: string;
  page?: number;
}): Promise<PaginatedResponse<OpportunityPosting>> {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.location) q.set("location", params.location);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("ordering", params.sort);
  if (params?.page) q.set("page", String(params.page));
  const qs = q.toString() ? `?${q.toString()}` : "";
  return fetchFromBff<PaginatedResponse<OpportunityPosting>>(`/api/v1/marketplace/opportunities/public/${qs}`);
}

export async function fetchOpportunity(id: number): Promise<OpportunityPosting> {
  return fetchFromBff<OpportunityPosting>(`/api/v1/marketplace/opportunities/public/${id}/`);
}

export async function fetchMyOpportunities(params?: {
  type?: string;
  status?: string;
  search?: string;
  sort?: string;
  page?: number;
}): Promise<PaginatedResponse<OpportunityPosting>> {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("ordering", params.sort);
  if (params?.page) q.set("page", String(params.page));
  const qs = q.toString() ? `?${q.toString()}` : "";
  return fetchFromBff<PaginatedResponse<OpportunityPosting>>(`/api/v1/marketplace/opportunities/my-postings/${qs}`);
}

export async function createOpportunity(data: Partial<OpportunityPosting>): Promise<OpportunityPosting> {
  return fetchFromBff<OpportunityPosting>(`/api/v1/marketplace/opportunities/my-postings/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOpportunity(
  id: number,
  data: Partial<OpportunityPosting>
): Promise<OpportunityPosting> {
  return fetchFromBff<OpportunityPosting>(`/api/v1/marketplace/opportunities/my-postings/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteOpportunity(id: number): Promise<void> {
  return fetchFromBff<void>(`/api/v1/marketplace/opportunities/my-postings/${id}/`, {
    method: "DELETE",
  });
}

export async function closeOpportunity(id: number): Promise<OpportunityPosting> {
  return fetchFromBff<OpportunityPosting>(`/api/v1/marketplace/opportunities/my-postings/${id}/mark-closed/`, {
    method: "POST",
  });
}

export async function expressOpportunityInterest(opportunityId: number): Promise<OpportunityInterest> {
  return fetchFromBff<OpportunityInterest>(`/api/v1/marketplace/opportunities/interests/`, {
    method: "POST",
    body: JSON.stringify({ opportunity: opportunityId }),
  });
}

export async function fetchReceivedInquiries(params?: {
  opportunity_id?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<OpportunityInterest>> {
  const q = new URLSearchParams();
  q.set("scope", "received");
  if (params?.opportunity_id) q.set("opportunity_id", String(params.opportunity_id));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString() ? `?${q.toString()}` : "";
  return fetchFromBff<PaginatedResponse<OpportunityInterest>>(`/api/v1/marketplace/opportunities/interests/${qs}`);
}

export async function fetchSentInquiries(params?: {
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<OpportunityInterest>> {
  const q = new URLSearchParams();
  q.set("scope", "sent");
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString() ? `?${q.toString()}` : "";
  return fetchFromBff<PaginatedResponse<OpportunityInterest>>(`/api/v1/marketplace/opportunities/interests/${qs}`);
}

export async function updateInquiryStatus(
  interestId: number,
  status: "INTERESTED" | "IN_TALKS" | "AWARDED" | "REJECTED",
  data?: { items?: any[]; quote_amount?: number }
): Promise<OpportunityInterest> {
  return fetchFromBff<OpportunityInterest>(
    `/api/v1/marketplace/opportunities/interests/${interestId}/update-status/`,
    {
      method: "POST",
      body: JSON.stringify({ status, ...data }),
    }
  );
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
