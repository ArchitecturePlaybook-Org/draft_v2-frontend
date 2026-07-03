export type TakeoffType = 'length' | 'area' | 'count' | 'line' | 'polygon' | 'point' | 'calibrate';

export interface Point {
  x: number;
  y: number;
}

export interface TakeoffItem {
  id: string; // Frontend UUID
  backendId?: number; // Backend DB ID
  item_code: string;
  description: string;
  type: TakeoffType;
  
  // Visual Properties
  points: Point[];
  color: string;
  
  // Math & Spreadsheets
  unit: string;
  gross_qty: number;        // Calculated from SVG points (pixels)
  multiplier: string;       // E.g., "1.05" (5% waste) or "=A1*2"
  net_qty: number;          // Evaluated qty (gross * multiplier)
  unit_cost: number;
  total_cost: number;
  
  // Hierarchy
  parentId?: string;        // For nested assemblies
}
