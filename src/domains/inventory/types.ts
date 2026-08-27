export type MaterialCategory =
  | "CEMENT"
  | "SAND_AGGREGATE"
  | "CONSUMABLE"
  | "STRUCTURAL"
  | "MASONRY"
  | "FINISHING"
  | "MEP"
  | "WATERPROOFING"
  | "SAFETY"
  | "TOOLS"
  | "OTHER";

export type MaterialUnit =
  | "BAG"
  | "KG"
  | "TON"
  | "M3"
  | "M2"
  | "CFT"
  | "RUNNING_METER"
  | "PIECE"
  | "BUNDLE"
  | "LITER"
  | "BOX"
  | "SET"
  | "NO"
  | "NOS"
  | "PKT"
  | "DRUM"
  | "ROLL";

export type BrandQualityTier = "PREMIUM" | "STANDARD" | "ECONOMY";

export interface MaterialBrandMaster {
  id: string;
  account: number;
  name: string;
  code: string;
  origin_country?: string;
  website?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  quality_tier: BrandQualityTier;
  primary_category?: MaterialCategory | string;
  is_approved: boolean;
  is_active?: boolean;
  notes?: string;
  materials_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialCategoryMaster {
  id: string;
  account: number;
  code: string;
  name: string;
  description?: string;
  default_unit: MaterialUnit;
  default_gst_rate: string | number;
  calc_algo_name?: string;
  icon?: string;
  is_active?: boolean;
  materials_count?: number;
  active_materials_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterMaterial {
  id: string;
  account: number;
  name: string;
  item_code: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  standard_rate: string | number;
  min_stock: string | number;
  max_stock: string | number;
  reorder_level: string | number;
  is_serialized: boolean;
  material_spec: Record<string, any>;
  calc_inp_json: Record<string, any>;
  calc_algo_name: string;
  hsn_sac_code: string;
  gst_rate: string | number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  account: number;
  project?: number | null;
  project_name?: string | null;
  name: string;
  code: string;
  location: string;
  manager?: number | null;
  manager_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteBalance {
  site_id: string;
  site_name: string;
  site_code: string;
  material_id: string;
  material_name: string;
  item_code: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  current_balance: number;
  total_value: number;
  min_stock: number;
  max_stock: number;
  reorder_level: number;
  health_status: "HEALTHY" | "REORDER_WARNING" | "CRITICAL_LOW" | "OVERSTOCKED";
}

export interface TaskMaterialRequirement {
  id: string;
  account: number;
  project: number;
  task: number;
  material: string;
  material_name: string;
  material_unit: MaterialUnit;
  input_quantity: number;
  input_unit: string;
  calc_params: Record<string, any>;
  planned_qty: number;
  issued_qty: number;
  consumed_qty: number;
  balance_remaining: number;
  fulfillment_percentage: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMaterialSummaryItem {
  material_id: string;
  material_name: string;
  item_code: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  total_planned: number;
  total_issued: number;
  total_consumed: number;
  balance_remaining: number;
  fulfillment_percentage: number;
  estimated_total_cost: number;
  issued_cost: number;
}

export type TransactionType =
  | "IN"
  | "OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUST_ADD"
  | "ADJUST_SUB"
  | "RETURN";

export type TransactionSource =
  | "PO_DELIVERY"
  | "ISSUE_TASK"
  | "SITE_TRANSFER"
  | "PHYSICAL_AUDIT"
  | "WASTE_WRITE_OFF"
  | "RETURN_TO_STORE"
  | "DIRECT_RECEIPT";

export interface StockLedgerEntry {
  id: string;
  account: number;
  site: string;
  site_name: string;
  material: string;
  material_name: string;
  material_unit: MaterialUnit;
  txn_type: TransactionType;
  source: TransactionSource;
  reference_id?: string | null;
  qty: string | number;
  unit_rate: string | number;
  total_value: number;
  batch_no?: string;
  remarks?: string;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  account: number;
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  categories: string[];
  rating: string | number;
  payment_terms_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type POStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ISSUED"
  | "PARTIALLY_DELIVERED"
  | "FULFILLED"
  | "CANCELLED";

export interface POItem {
  id: string;
  po: string;
  material: string;
  material_name: string;
  material_unit: MaterialUnit;
  qty: string | number;
  qty_received: string | number;
  pending_qty: number;
  rate: string | number;
  tax_percent: string | number;
  total_amount: number;
}

export interface PurchaseOrder {
  id: string;
  account: number;
  po_number: string;
  vendor: string;
  vendor_name: string;
  site: string;
  site_name: string;
  status: POStatus;
  subtotal_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  expected_delivery_date?: string | null;
  terms_and_conditions?: string;
  created_by?: number | null;
  approved_by?: number | null;
  items: POItem[];
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus = "PENDING" | "VERIFIED" | "PARTIALLY_ACCEPTED" | "REJECTED";

export interface DeliveryItem {
  id: string;
  delivery: string;
  material: string;
  material_name: string;
  material_unit: MaterialUnit;
  qty_delivered: string | number;
  qty_accepted: string | number;
  qty_rejected: string | number;
  rejection_reason?: string;
  batch_no?: string;
  test_certificate_doc?: string;
  remarks?: string;
}

export interface Delivery {
  id: string;
  account: number;
  grn_number: string;
  po?: string | null;
  supplier: string;
  supplier_name: string;
  site: string;
  site_name: string;
  vehicle_no: string;
  challan_no: string;
  challan_doc?: string;
  delivered_at: string;
  status: DeliveryStatus;
  has_variance: boolean;
  verified_by?: number | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  supervisor_notes?: string;
  items: DeliveryItem[];
  created_at: string;
}

export type WorkerTrade =
  | "MASON"
  | "BAR_BENDER"
  | "CARPENTER"
  | "ELECTRICIAN"
  | "PLUMBER"
  | "PAINTER"
  | "TILER"
  | "WELDER"
  | "HELPER"
  | "SUBCONTRACTOR";

export interface MaterialIssue {
  id: string;
  account: number;
  issue_number: string;
  site: string;
  site_name: string;
  material: string;
  material_name: string;
  material_unit: MaterialUnit;
  task?: number | null;
  issued_to: string;
  worker_trade: WorkerTrade;
  qty: string | number;
  purpose?: string;
  location_in_site?: string;
  issued_by?: number | null;
  issued_by_name?: string | null;
  issued_at: string;
  is_returned: boolean;
  returned_qty: string | number;
  net_consumed_qty: number;
}

export type EquipmentCategory =
  | "HEAVY_MACHINERY"
  | "POWER_TOOLS"
  | "CONCRETING"
  | "SCAFFOLDING"
  | "SURVEYING"
  | "SAFETY"
  | "GENERATORS";

export type EquipmentStatus =
  | "AVAILABLE"
  | "IN_USE"
  | "IN_TRANSIT"
  | "UNDER_MAINTENANCE"
  | "DECOMMISSIONED";

export interface Equipment {
  id: string;
  account: number;
  name: string;
  equipment_code: string;
  serial_no: string;
  category: EquipmentCategory;
  ownership_type: "OWNED" | "RENTED" | "SUBCONTRACTOR";
  status: EquipmentStatus;
  current_site?: string | null;
  site_name?: string | null;
  current_custodian?: number | null;
  custodian_name?: string;
  custodian_user_name?: string | null;
  qr_code_hash?: string;
  purchase_cost: string | number;
  daily_rental_rate: string | number;
  last_service_date?: string | null;
  next_service_due?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentMovement {
  id: string;
  equipment: string;
  equipment_name: string;
  from_site: string;
  from_site_name: string;
  to_site: string;
  to_site_name: string;
  status: "DISPATCHED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED";
  vehicle_no?: string;
  driver_contact?: string;
  dispatched_by?: number | null;
  dispatched_by_name?: string | null;
  dispatched_at: string;
  received_by?: number | null;
  received_by_name?: string | null;
  received_at?: string | null;
  notes?: string;
}

export interface WallOpening {
  id?: string;
  name?: string;
  type: "door" | "window" | "ventilator" | "other";
  width: number;
  height: number;
  qty: number;
  sill_height?: number;
}

export interface MasonryBOMItem {
  material_type: string;
  item_name: string;
  unit: string;
  base_quantity: number;
  wastage_percent: number;
  wastage_quantity: number;
  planned_quantity: number;
  assumptions: string;
  weight_kg?: number;
  volume_m3?: number;
  volume_cft?: number;
}

export interface MasonryGeometry {
  length_m: number;
  height_m: number;
  thickness_mm: number;
  gross_wall_area_m2: number;
  gross_wall_volume_m3: number;
  total_opening_area_m2: number;
  net_wall_area_m2: number;
  net_masonry_volume_m3: number;
}

export interface MasonryCalculationResult {
  calculator: "calculate_masonry_materials";
  rule_version: string;
  wall_geometry: MasonryGeometry;
  openings: any[];
  warnings: string[];
  units_required: number;
  theoretical_units: number;
  unit_type: string;
  dry_mortar_vol_m3?: number;
  wet_mortar_vol_m3?: number;
  cement_vol_m3?: number;
  sand_vol_m3?: number;
  cement_bags_50kg: number;
  cement_kg?: number;
  sand_m3?: number;
  sand_cft: number;
  sand_tons: number;
  block_adhesive_kg?: number;
  adhesive_bags_40kg?: number;
  lintel_concrete_volume_m3?: number;
  bom_items: MasonryBOMItem[];
  summary: string;
  calculation_breakdown: Record<string, string>;
}

export interface MultiWallConfig {
  id: string;
  name: string;
  room: string;
  length_m: number;
  height_m: number;
  wall_thickness_mm: number;
  brick_type: string;
  mortar_ratio: string;
  openings: WallOpening[];
  wastage_percent?: number;
}

