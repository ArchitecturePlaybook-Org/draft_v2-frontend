// ─────────────────────────────────────────────────────────────────────────────
// BOQ Estimation Studio — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const TYPOLOGY_OPTIONS = [
  { value: "g1_residential", label: "G+1 Residential House (1200–1800 sqft)" },
  { value: "multi_storey_rcc", label: "Multi-Storey RCC Frame (G+3/G+4/G+5)" },
  { value: "villa", label: "Residential Villa" },
  { value: "boundary_wall", label: "Boundary Wall (Brick + RCC Columns)" },
  { value: "compound_wall", label: "Compound Wall (Industrial)" },
  { value: "retaining_wall", label: "Cantilever Retaining Wall" },
  { value: "internal_road_bt", label: "Internal Road — Bituminous (BT)" },
  { value: "internal_road_cc", label: "Internal Road — Concrete (CC)" },
  { value: "rcc_drain", label: "RCC Storm Drain" },
  { value: "septic_tank", label: "Septic Tank (IS 2470)" },
  { value: "toilet_block", label: "Toilet Block (SBM-G)" },
  { value: "modular_kitchen", label: "Modular Kitchen Interior" },
  { value: "bathroom_renovation", label: "Bathroom Renovation (Full)" },
  { value: "false_ceiling", label: "False Ceiling Package (Gypsum/PVC)" },
  { value: "vitrified_flooring", label: "Vitrified Tile Flooring — Full Home" },
] as const;

export type TypologyValue = typeof TYPOLOGY_OPTIONS[number]["value"];

export const STAGE_LABELS: Record<string, string> = {
  earthwork: "Earthwork & Site Preparation",
  substructure: "Substructure & Foundation",
  superstructure: "Superstructure Masonry",
  rcc: "RCC Concrete & Steel",
  plaster: "Plastering & Pointing",
  flooring: "Flooring & Dado",
  doors_windows: "Doors & Windows",
  painting: "Painting & Finishing",
  mep: "MEP Services",
  external: "External Works",
};

export interface BOQParameters {
  typology: TypologyValue;
  // Envelope
  outer_length: number;
  outer_width: number;
  floor_height: number;
  num_floors: number;
  // Wall config
  outer_wall_thickness_mm: number;
  inner_wall_length: number;   // Running metres of internal partition walls
  inner_wall_thickness_mm: number;
  // Openings
  outer_door_count: number;
  outer_door_size_m2: number;
  outer_window_count: number;
  outer_window_size_m2: number;
  inner_door_count: number;
  inner_door_size_m2: number;
  // Foundation & Site
  plinth_height: number;
  soil_type: "soft" | "medium" | "hard";
  excavation_depth: number;
}

export interface BOQLineItem {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  stage: string;
  is_code_ref: string;
  deductions_note: string;
}

export interface BOQResult {
  typology: string;
  built_up_area: number;
  total_cost: number;
  assumptions: string[];
  line_items: BOQLineItem[];
}

export interface BOQTypologyDB {
  slug: string;
  name: string;
  category: "building" | "infrastructure" | "wall" | "sanitation" | "interior";
  category_display?: string;
  description: string;
  icon: string;
  default_parameters: Partial<BOQParameters>;
  display_order: number;
  is_active?: boolean;
  rule_count?: number;
}

export const STATE_OPTIONS = [
  { value: "all", label: "All States & National" },
  { value: "national", label: "National / CPWD (All India)" },
  { value: "karnataka", label: "Karnataka (KPWD SOR 2023-24)" },
  { value: "tamil_nadu", label: "Tamil Nadu (TNPWD Schedule 2023-24)" },
  { value: "maharashtra", label: "Maharashtra (PWD SOR 2023-24)" },
  { value: "delhi", label: "Delhi (CPWD DSR 2023)" },
  { value: "telangana", label: "Telangana (TSSOR 2023-24)" },
  { value: "andhra_pradesh", label: "Andhra Pradesh (APSOR 2023-24)" },
  { value: "kerala", label: "Kerala (KPWD PRICE 2023)" },
  { value: "gujarat", label: "Gujarat (GWSSB / R&B SOR)" },
  { value: "west_bengal", label: "West Bengal (PWD SOR)" },
] as const;

export interface DSRRateMasterDB {
  id?: number;
  item_code: string;
  state?: string;
  state_sor_name?: string;
  chapter_no?: number;
  chapter_name?: string;
  description: string;
  unit: string;
  rate: number;
  labor_component?: number;
  material_component?: number;
  stage: string;
  is_code_ref: string;
  state_multiplier: number;
  is_active: boolean;
  updated_at?: string;
}

export interface BOQCalculationRuleDB {
  id?: number;
  typology: string;
  item: number | string;
  item_code?: string;
  item_description?: string;
  item_unit?: string;
  item_rate?: number;
  stage: string;
  quantity_formula: string;
  deduction_formula: string;
  condition_expression: string;
  coefficient: number;
  waste_margin_percent: number;
  deductions_note_template: string;
  display_order: number;
  is_active: boolean;
  updated_at?: string;
}

export interface BOQSessionSummary {
  id: number;
  name: string;
  typology: string;
  outer_length: number;
  outer_width: number;
  num_floors: number;
  built_up_area: number;
  total_cost_estimate: number | null;
  created_at: string;
}

export interface BOQTypologyPresetDB {
  id: number;
  typology: string;
  typology_name?: string;
  name: string;
  description: string;
  parameters: BOQParameters;
  is_default: boolean;
  display_order: number;
}

export const TYPOLOGY_PRESETS: Record<TypologyValue, BOQParameters> = {
  g1_residential: {
    typology: "g1_residential",
    outer_length: 12,
    outer_width: 9,
    floor_height: 3.0,
    num_floors: 2,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 36,
    inner_wall_thickness_mm: 115,
    outer_door_count: 2,
    outer_door_size_m2: 2.10,
    outer_window_count: 8,
    outer_window_size_m2: 1.44,
    inner_door_count: 6,
    inner_door_size_m2: 1.89,
    plinth_height: 0.60,
    soil_type: "medium",
    excavation_depth: 1.50,
  },
  multi_storey_rcc: {
    typology: "multi_storey_rcc",
    outer_length: 24,
    outer_width: 16,
    floor_height: 3.2,
    num_floors: 5,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 140,
    inner_wall_thickness_mm: 115,
    outer_door_count: 10,
    outer_door_size_m2: 2.10,
    outer_window_count: 32,
    outer_window_size_m2: 1.80,
    inner_door_count: 24,
    inner_door_size_m2: 1.89,
    plinth_height: 0.90,
    soil_type: "medium",
    excavation_depth: 2.40,
  },
  villa: {
    typology: "villa",
    outer_length: 16,
    outer_width: 12,
    floor_height: 3.5,
    num_floors: 2,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 48,
    inner_wall_thickness_mm: 115,
    outer_door_count: 4,
    outer_door_size_m2: 2.40,
    outer_window_count: 14,
    outer_window_size_m2: 2.16,
    inner_door_count: 8,
    inner_door_size_m2: 1.89,
    plinth_height: 0.75,
    soil_type: "medium",
    excavation_depth: 1.60,
  },
  boundary_wall: {
    typology: "boundary_wall",
    outer_length: 60,
    outer_width: 0.23,
    floor_height: 2.1,
    num_floors: 1,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 1,
    outer_door_size_m2: 3.60,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0.30,
    soil_type: "medium",
    excavation_depth: 0.90,
  },
  compound_wall: {
    typology: "compound_wall",
    outer_length: 120,
    outer_width: 0.23,
    floor_height: 2.4,
    num_floors: 1,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 2,
    outer_door_size_m2: 4.50,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0.45,
    soil_type: "medium",
    excavation_depth: 1.10,
  },
  retaining_wall: {
    typology: "retaining_wall",
    outer_length: 30,
    outer_width: 0.45,
    floor_height: 3.5,
    num_floors: 1,
    outer_wall_thickness_mm: 450,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 0,
    outer_door_size_m2: 0,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0,
    soil_type: "hard",
    excavation_depth: 1.80,
  },
  internal_road_bt: {
    typology: "internal_road_bt",
    outer_length: 100,
    outer_width: 7.0,
    floor_height: 0.35,
    num_floors: 1,
    outer_wall_thickness_mm: 0,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 0,
    outer_door_size_m2: 0,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0,
    soil_type: "medium",
    excavation_depth: 0.45,
  },
  internal_road_cc: {
    typology: "internal_road_cc",
    outer_length: 100,
    outer_width: 7.0,
    floor_height: 0.30,
    num_floors: 1,
    outer_wall_thickness_mm: 0,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 0,
    outer_door_size_m2: 0,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0,
    soil_type: "medium",
    excavation_depth: 0.40,
  },
  rcc_drain: {
    typology: "rcc_drain",
    outer_length: 100,
    outer_width: 1.0,
    floor_height: 1.2,
    num_floors: 1,
    outer_wall_thickness_mm: 150,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 0,
    outer_door_size_m2: 0,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0,
    soil_type: "medium",
    excavation_depth: 1.40,
  },
  septic_tank: {
    typology: "septic_tank",
    outer_length: 4.5,
    outer_width: 2.0,
    floor_height: 2.2,
    num_floors: 1,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 3.5,
    inner_wall_thickness_mm: 115,
    outer_door_count: 0,
    outer_door_size_m2: 0,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0.15,
    soil_type: "medium",
    excavation_depth: 2.60,
  },
  toilet_block: {
    typology: "toilet_block",
    outer_length: 6.0,
    outer_width: 4.0,
    floor_height: 3.0,
    num_floors: 1,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 16,
    inner_wall_thickness_mm: 115,
    outer_door_count: 4,
    outer_door_size_m2: 1.50,
    outer_window_count: 4,
    outer_window_size_m2: 0.36,
    inner_door_count: 4,
    inner_door_size_m2: 1.50,
    plinth_height: 0.45,
    soil_type: "medium",
    excavation_depth: 1.10,
  },
  modular_kitchen: {
    typology: "modular_kitchen",
    outer_length: 3.6,
    outer_width: 2.8,
    floor_height: 2.8,
    num_floors: 1,
    outer_wall_thickness_mm: 115,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 1,
    outer_door_size_m2: 1.89,
    outer_window_count: 1,
    outer_window_size_m2: 1.20,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0,
    soil_type: "soft",
    excavation_depth: 0,
  },
  bathroom_renovation: {
    typology: "bathroom_renovation",
    outer_length: 2.4,
    outer_width: 1.8,
    floor_height: 2.7,
    num_floors: 1,
    outer_wall_thickness_mm: 115,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 1,
    outer_door_size_m2: 1.68,
    outer_window_count: 1,
    outer_window_size_m2: 0.36,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0,
    soil_type: "soft",
    excavation_depth: 0,
  },
  false_ceiling: {
    typology: "false_ceiling",
    outer_length: 12,
    outer_width: 9,
    floor_height: 3.0,
    num_floors: 1,
    outer_wall_thickness_mm: 0,
    inner_wall_length: 0,
    inner_wall_thickness_mm: 0,
    outer_door_count: 0,
    outer_door_size_m2: 0,
    outer_window_count: 0,
    outer_window_size_m2: 0,
    inner_door_count: 0,
    inner_door_size_m2: 0,
    plinth_height: 0,
    soil_type: "soft",
    excavation_depth: 0,
  },
  vitrified_flooring: {
    typology: "vitrified_flooring",
    outer_length: 12,
    outer_width: 9,
    floor_height: 3.0,
    num_floors: 2,
    outer_wall_thickness_mm: 230,
    inner_wall_length: 36,
    inner_wall_thickness_mm: 115,
    outer_door_count: 2,
    outer_door_size_m2: 2.10,
    outer_window_count: 8,
    outer_window_size_m2: 1.44,
    inner_door_count: 6,
    inner_door_size_m2: 1.89,
    plinth_height: 0.60,
    soil_type: "soft",
    excavation_depth: 0,
  },
};

export const DEFAULT_PARAMS: BOQParameters = TYPOLOGY_PRESETS.g1_residential;

