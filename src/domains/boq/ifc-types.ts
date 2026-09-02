export interface IFCElementData {
  id: string;
  ifc_type: string;
  name: string;
  volume_m3: number;
  area_m2: number;
  length_m: number;
  thickness_mm?: number;
  material: string;
  selected: boolean;
  color?: string;
  custom_material_override?: string;
  storey_id?: string;
  // Real-world start/end coordinates from IFC geometry (metres)
  x1_m?: number;
  y1_m?: number;
  x2_m?: number;
  y2_m?: number;
  // For spaces/rooms: bounding box in real-world metres
  bbox?: { minX: number; minY: number; maxX: number; maxY: number };
}

// A room/space parsed from IFCSPACE entities
export interface IFCRoom {
  id: string;
  name: string;
  /** Canvas pixel coords after scaling */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Actual area in m² */
  area_m2: number;
  roomType:
    | "living" | "bedroom" | "kitchen" | "bathroom" | "corridor"
    | "stair"  | "office"  | "lobby"   | "meeting"  | "toilet"
    | "utility" | "unknown";
}

// A wall segment extracted from IFC geometry
export interface IFCWallSegment {
  id: string;
  // SVG canvas pixel coords (already scaled)
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thicknessPx: number;
  isExternal: boolean;
}

// A door opening from IFC
export interface IFCDoorOpening {
  x: number;
  y: number;
  width: number;
  angle: number; // degrees
}

// A window opening from IFC
export interface IFCWindowOpening {
  x: number;
  y: number;
  width: number;
  wallAngle: number;
}

export interface IFCStorey {
  id: string;
  name: string;
  elevation_m: number;
  wallCount: number;
  slabCount: number;
  colCount: number;
  doorCount: number;
  windowCount: number;
  isRoof: boolean;

  // Geometric data extracted from IFC (populated when IFC contains real coords)
  rooms?: IFCRoom[];
  walls?: IFCWallSegment[];
  doors?: IFCDoorOpening[];
  windows?: IFCWindowOpening[];

  // Real-world bounding box in metres for this storey
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface ParsedIFCResult {
  elements: IFCElementData[];
  storeys: IFCStorey[];
  totalBUA_m2: number;
  outerLength_m: number;
  outerWidth_m: number;
  numFloors: number;
  floorHeight_m: number;
  fileName: string;
}


export interface BOQLineItem {
  stage: string;
  stage_label: string;
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  base_rate: number;
  multiplier: number;
  amount: number;
  is_code_ref: string;
  labor_component: number;
  material_component: number;
}

export interface BIMBOQSummary {
  state_jurisdiction: string;
  elements_analyzed_count: number;
  total_rcc_volume_m3: number;
  total_steel_rebar_kg: number;
  total_openings_deducted_m2: number;
  total_estimated_cost: number;
  total_labor_cost: number;
  total_material_cost: number;
  stage_summary: Record<string, number>;
  line_items: BOQLineItem[];
}

export interface DeepSeekAuditResult {
  ai_provider: string;
  executive_summary: string;
  compliance_notes: string[];
  steel_intensity_ratio: string;
  value_engineering_recommendations: string[];
  api_notice?: string;
}

export interface BIMEstimationResponse {
  success: boolean;
  state_jurisdiction: string;
  elements: IFCElementData[];
  boq: BIMBOQSummary;
  audit: DeepSeekAuditResult;
}
