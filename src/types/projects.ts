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
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  unit_system: "metric" | "imperial";
  created_by: User;
  memberships_count: number;
  tasks_count: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "TODO" | "WIP" | "QA" | "DONE";

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
  id: number;
  uid: string;
  task_code?: string;
  project: string;
  title: string;
  description: string;
  cost: string;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  due_date?: string | null;
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
  punch_list_items?: PunchListItem[];
  material_allocations?: TaskMaterialAllocation[];
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

export interface PunchListItemAttachment {
  id: number;
  punch_list_item: number;
  file: string;
  attachment_type: 'OBSERVATION' | 'RESOLUTION';
  uploaded_by: User | null;
  created_at: string;
}

export interface PunchListItem {
  id: number;
  task: string;
  task_uid?: string;
  task_title?: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  issue_type: 'QUALITY' | 'SAFETY' | 'DESIGN' | 'PROCUREMENT' | 'OTHER';
  root_cause: 'POOR_WORKMANSHIP' | 'WEATHER' | 'MATERIAL_DEFECT' | 'SCOPE_GAP' | 'OTHER';
  is_resolved: boolean;
  reported_by: any;
  attachments?: PunchListItemAttachment[];
  created_at: string;
}

export interface TaskComment {
  id: number;
  task: string;
  user: User;
  content: string;
  created_at: string;
}

export interface BOQSubItem {
  id: number;
  parent: number;
  material_code: string;
  description: string;
  quantity: string | number;
  unit_rate: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface BOQItem {
  id: number;
  project: string;
  phase?: number | null;
  material_code: string;
  total_budgeted_qty: string | number;
  unit_rate: string | number;
  remaining_budget?: string | number;
  remaining_phase_qty?: string | number;
  sub_items?: BOQSubItem[];
  created_at: string;
  updated_at: string;
}

export interface MaterialConsumptionLog {
  id: number;
  consumed_qty: string | number;
  total_cost: string | number;
  receipt?: string | null;
  logged_by?: User | null;
  created_at: string;
}

export interface TaskMaterialAllocation {
  id: number;
  task: string;
  task_title?: string;
  task_uid?: string;
  task_zone_name?: string;
  boq_item: number;
  boq_item_detail?: BOQItem;
  allocated_qty: string | number;
  actual_consumed_qty?: string | number | null;
  is_logged?: boolean;
  is_anomaly?: boolean;
  suggested_consumption_range?: { min: number; max: number };
  logs?: MaterialConsumptionLog[];
  req_status: "DRAFT" | "REQUISITIONED" | "ORDERED" | "DELIVERED";
  expected_on_site_by?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcurementAggregatorItem extends BOQItem {
  project_name?: string;
  draft_qty: string | number;
  requisitioned_qty: string | number;
  ordered_qty: string | number;
  delivered_qty: string | number;
  allocations: TaskMaterialAllocation[];
}
