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

export const DEFAULT_PARAMS: BOQParameters = {
  typology: "g1_residential",
  outer_length: 10,
  outer_width: 10,
  floor_height: 3.0,
  num_floors: 1,
  outer_wall_thickness_mm: 230,
  inner_wall_length: 45,
  inner_wall_thickness_mm: 115,
  outer_door_count: 1,
  outer_door_size_m2: 1.80,
  outer_window_count: 4,
  outer_window_size_m2: 1.44,
  inner_door_count: 3,
  inner_door_size_m2: 1.68,
  plinth_height: 0.45,
  soil_type: "medium",
  excavation_depth: 1.20,
};
