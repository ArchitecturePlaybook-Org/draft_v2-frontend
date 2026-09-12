export type Interval = [number, number];

export interface MaterialRequirement {
  priceId: string;
  qty: number;
  display?: string;
}

export interface LabourRequirement {
  priceId: string;
  qty: number; // Man-days per unit of work
}

export interface MachineryRequirement {
  name: string;
  cost: number;
}

export interface WorkItemRecipe {
  slug: string;
  name: string;
  unit: "cum" | "sqm" | "tonne" | "piece" | "point" | "metre" | "set";
  group: string;
  materials: MaterialRequirement[];
  labour: LabourRequirement[];
  machinery: MachineryRequirement[];
}

export interface MaterialMeta {
  name: string;
  unit: string;
}

export interface CityOption {
  slug: string;
  label: string;
}

export interface BOQItemRow {
  id: string; // unique frontend UUID
  slug: string; // recipe slug
  name: string;
  group: string;
  qty: number;
  unit: string;
  customRate?: number; // User overridden rate
  sourceType?: 'manual' | 'length' | 'area';
  sourceShapeId?: string;
}

export interface ConsolidatedMaterialItem {
  priceId: string;
  label: string;
  unit: string;
  qty: number;
  rate: Interval;
  marketRate: Interval;
  effectiveRate: number;
  cost: Interval;
  effectiveCost: number;
  isOverridden: boolean;
  customRate?: number;
}

export interface ConsolidatedLabourItem {
  priceId: string;
  label: string;
  unit: string;
  qty: number;
  rate: Interval;
  marketRate: Interval;
  effectiveRate: number;
  cost: Interval;
  effectiveCost: number;
  isOverridden: boolean;
  customRate?: number;
}

export interface ConsolidatedBOQResult {
  lineItems: {
    id: string;
    slug: string;
    name: string;
    qty: number;
    unit: string;
    unitPriceRange: Interval;
    autoRate: number;
    effectiveRate: number;
    amount: number;
    isOverridden: boolean;
    sourceType?: 'manual' | 'length' | 'area';
  }[];
  materials: ConsolidatedMaterialItem[];
  labour: ConsolidatedLabourItem[];
  materialTotal: Interval;
  labourTotal: Interval;
  machineryTotal: Interval;
  subtotal: Interval;
  water: Interval;
  cpoh: Interval;
  marketMaterialTotal: Interval;
  marketLabourTotal: Interval;
  marketSubtotal: Interval;
  marketWater: Interval;
  marketCpoh: Interval;
  marketTotal: Interval;
  estimatedTotal: number;
  actualTotal: Interval;
  actualGrandTotal: number;
  userGrandTotal: number;
  rateAdjustment: number;
}
