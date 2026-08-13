import { User } from "./auth";

export type ProjectStatus = "To Start" | "Work in Progress" | "Completed";

export type ProjectRole = "manager" | "editor" | "viewer";

export interface Account {
  id: number;
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
  project_code?: string;
  kind?: string;
  location?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  unit_system: "metric" | "imperial";
  is_template?: boolean;
  template_scope?: "GLOBAL" | "ORG" | "USER";
  share_token?: string | null;
  created_by: User;
  memberships_count: number;
  tasks_count: number;
  tasks_done_count?: number;
  budget_used?: number;
  budget_total?: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "TODO" | "ON_HOLD" | "WIP" | "QA" | "DONE";

export type AssetCategory = "sketch" | "2d_plan" | "3d_model" | "document" | "sh3d";


export interface SitePhoto {
  id: number;
  floor_plan: number;
  image: string; // URL
  caption: string;
  grid_col: number;
  grid_row: number;
  latitude?: number | null;
  longitude?: number | null;
  gps_accuracy_m?: number | null;
  gps_source: 'browser' | 'exif' | 'none';
  captured_at?: string | null;
  uploaded_by: User | null;
  created_at: string;
}

export interface ProjectAsset {
  id: number;
  project: string;
  folder?: number | null;
  title: string;
  category: AssetCategory;
  drawing_tag?: "none" | "gfc" | "abd";
  file: string; // URL
  thumbnail: string | null;
  size: number;
  uploaded_by: User | null;
  // Revision Control
  canonical_uid: string;
  version_number: number;
  is_latest: boolean;
  revision_notes: string;

  // Floor Plan Calibration
  scale_pixels_per_meter?: number;
  scale_calibrated_at?: string;
  site_photos?: SitePhoto[];
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
  id: number;
  uid: string;
  task_code?: string;
  project: string;
  project_uid?: string;
  title: string;
  description: string;
  cost: string;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  due_date?: string | null;
  due_date_alert_sent?: boolean;
  is_recurring_template?: boolean;
  recurrence_pattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
  next_run_date?: string | null;
  assigned_to: User | null;
  asset_links: TaskAssetLink[];
  created_at: string;
  updated_at: string;
  // Matrix fields
  block?: number;
  trade?: Trade | null;
  trade_id?: number | null;
  quantity_target?: number | null;
  quantity_completed?: number;
  quantity_unit?: string;
  unit_rate?: string;
  estimated_cost?: string;
  actual_burn_cost?: number;
  cost_variance?: number;
  progress_percent?: number;
  has_active_blocker?: boolean;
  requires_owner_response?: boolean;
  qa_inspector?: User | null;
  qa_inspector_id?: number | null;
  zone_name?: string;
  phase_name?: string;
  checklists?: any[];
  parent_task_id?: number | null;
  parent_task?: Task | null;
  subtasks?: Task[];
  priority?: "HIGH" | "MEDIUM" | "LOW";
  tags?: TaskTag[];
  external_collaborator_count?: number;
  is_deleted?: boolean;
  deleted_at?: string | null;
  on_hold_reason?: string | null;
}



export interface TaskTag {
  id: number;
  name: string;
  color: string;
  account: number;
}

export interface SubtaskTemplateItem {
  id?: string;
  title: string;
  description?: string;
  checklists?: string[];
}

export interface TaskTemplate {
  id: number;
  name: string;
  description: string;
  default_duration_days: number;
  default_checklists: string[];
  default_subtasks?: SubtaskTemplateItem[];
}

export interface ProjectMembership {
  id: number;
  user: User;
  role: ProjectRole;
  joined_at: string;
}

export interface ProjectFolder {
  id: number;
  project: string;
  name: string;
  category: AssetCategory;
  parent: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  memberships: ProjectMembership[];
  tasks: Task[];
  assets: ProjectAsset[]; // Only is_latest=true by default
  folders: ProjectFolder[];
}

export interface Trade {
  id: number;
  name: string;
  color_hex: string;
}

export interface SpatialZone {
  id: number;
  project: number;
  name: string;
  order: number;
  zone_type: string;
  bim_element_id?: string;
  drawing_snapshot?: string | null;
}

export interface MilestonePhase {
  id: number;
  project: number;
  name: string;
  sequence_order: number;
  color_hex: string;
  description?: string;
}

export type BlockStatus = 'LOCKED' | 'ACTIVE' | 'DONE';

export interface MilestoneBlockCompact {
  id: number;
  project_id: number;
  zone_id: number;
  phase_id: number;
  status: BlockStatus;
  progress_percent: number;
  has_blockers: boolean;
  total_tasks: number;
  completed_tasks: number;
  notes?: string;
  // Manual unlock audit trail
  unlocked_by_name?: string | null;
  unlocked_at?: string | null;
  unlock_reason?: string | null;
}


export interface MilestoneBlockExpanded extends MilestoneBlockCompact {
  zone_name: string;
  phase_name: string;
  tasks: Task[];
}

export interface MatrixPayload {
  project_id?: number;
  zones: SpatialZone[];
  phases: MilestonePhase[];
  blocks: MilestoneBlockCompact[];
}

export interface ExpandedFeedSection {
  phase: MilestonePhase;
  blocks: MilestoneBlockExpanded[];
}

export interface ExpandedFeedPayload {
  sections: ExpandedFeedSection[];
  page: number;
  has_next: boolean;
}

export interface AIZoneResult {
  name: string;
  zone_type: string;
}

export interface WorkPackageTemplate {
  id: number;
  trade: Trade;
  name: string;
  description: string;
  tasks: any[];
}

export interface ChecklistAttachment {
  id: number;
  checklist_item: number;
  file: string;
  uploaded_by: User | null;
  created_at: string;
}

export interface TaskChecklistItem {
  id: number;
  task: string;
  title: string;
  is_completed: boolean;
  requires_visual_proof: boolean;
  completed_at: string | null;
  completed_by: User | null;
  attachments?: ChecklistAttachment[];
  order: number;
  created_at?: string;
}

export interface ChecklistTemplateItem {
  id: number;
  title: string;
  requires_visual_proof: boolean;
  order: number;
}

export interface ChecklistTemplate {
  id: number;
  account: number;
  name: string;
  description: string;
  items: ChecklistTemplateItem[];
  created_at: string;
}



export interface TaskComment {
  id: number;
  task: string;
  user: User;
  content: string;
  created_at: string;
}


