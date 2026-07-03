import { fetchFromBff } from "@/shared/api/fetchFromBff";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SocialPost {
  id: number;
  instagram_id: string | null;
  source: string;
  image_url: string;
  additional_images: string[];
  caption: string;
  hashtags: string[];
  author_name: string;
  author_username: string;
  author_avatar_url: string;
  author_profile_url: string;
  likes_count: number;
  comments_count: number;
  original_post_url: string;
  posted_at: string | null;
  is_featured: boolean;
  linked_user_uid: string | null;
  is_saved: boolean;
  image_count: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export async function fetchSocialFeed(params?: {
  search?: string;
  sort?: string;
  featured?: boolean;
  author?: string;
  page?: number;
}): Promise<PaginatedResponse<SocialPost>> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("sort", params.sort);
  if (params?.featured) q.set("featured", "true");
  if (params?.author) q.set("author", params.author);
  if (params?.page && params.page > 1) q.set("page", String(params.page));
  const qs = q.toString() ? `?${q.toString()}` : "";
  return fetchFromBff<PaginatedResponse<SocialPost>>(`/api/v1/social/feed/${qs}`);
}

export async function fetchSocialPostDetail(id: number): Promise<SocialPost> {
  return fetchFromBff<SocialPost>(`/api/v1/social/feed/${id}/`);
}

// ─── Save / Unsave ───────────────────────────────────────────────────────────

export async function toggleSavePost(id: number): Promise<{ is_saved: boolean }> {
  return fetchFromBff<{ is_saved: boolean }>(`/api/v1/social/feed/${id}/save/`, {
    method: "POST",
  });
}

export async function fetchSavedPosts(): Promise<PaginatedResponse<SocialPost>> {
  return fetchFromBff<PaginatedResponse<SocialPost>>("/api/v1/social/saved/");
}
