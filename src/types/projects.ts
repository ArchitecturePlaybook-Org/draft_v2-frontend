import { User } from "./auth";

export type ProjectStatus = "To Start" | "Work in Progress" | "Completed";

export type ProjectRole = "manager" | "editor" | "viewer";

export interface Account {
  uid: string;
  name: string;
  slug: string;
  account_type: "individual" | "organization";
}

export interface Project {
  id: number;
  uid: string;
  title: string;
  description: string;
  status: ProjectStatus;
  account: Account;
  created_by: User;
  memberships_count: number;
  tasks_count: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "Pending" | "In Progress" | "Done";

export type AssetCategory = "sketch" | "2d_plan" | "3d_model" | "document";

export interface SitePhoto {
  id: number;
  floor_plan: number;
  image: string;
  caption: string;
  grid_col: number;
  grid_row: number;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_m: number | null;
  gps_source: "browser" | "exif" | "none";
  captured_at: string | null;
  uploaded_by: User | null;
  created_at: string;
}

export interface ProjectAsset {
  id: number;
  project: string;
  title: string;
  category: AssetCategory;
  file: string; // URL
  thumbnail: string | null;
  size: number;
  uploaded_by: User | null;
  // Revision Control
  canonical_uid: string;
  version_number: number;
  is_latest: boolean;
  revision_notes: string;
  // Site Photos
  site_photos_count: number;
  site_photos: SitePhoto[];
  created_at: string;
  updated_at: string;
}

export interface TaskAssetLink {
  id: number;
  task: string;
  canonical_uid: string;
  asset_title: string;
  linked_at: string;
  latest_asset: ProjectAsset | null;
}

export interface Task {
  uid: string;
  project: string;
  title: string;
  description: string;
  cost: string;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  assigned_to: User | null;
  asset_links: TaskAssetLink[];
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: number;
  name: string;
  description: string;
  default_duration_days: number;
  default_checklists: any[];
}

export interface ProjectMembership {
  id: number;
  user: User;
  role: ProjectRole;
  joined_at: string;
}

export interface ProjectDetail extends Project {
  memberships: ProjectMembership[];
  tasks: Task[];
  assets: ProjectAsset[]; // Only is_latest=true by default
}
