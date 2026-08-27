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
