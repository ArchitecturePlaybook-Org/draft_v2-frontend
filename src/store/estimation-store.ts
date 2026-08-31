import { create } from 'zustand';
import { TakeoffItem } from '@/types/estimation.types';
import { CalibrationUnit } from '@/lib/estimation/units';

export interface MasterCatalogItem {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  unit_cost: number;
  multiplier: number;
  color: string;
}

export function recalculateItemQuantities(item: TakeoffItem, scale: number): TakeoffItem {
  const updated = { ...item };
  
  let geoLength = 0;
  let geoArea = 0;
  const geoCount = updated.points?.length || 0;

  if (updated.points && updated.points.length > 0) {
    if (updated.type === 'length') {
      for (let i = 1; i < updated.points.length; i++) {
        const dx = updated.points[i].x - updated.points[i-1].x;
        const dy = updated.points[i].y - updated.points[i-1].y;
        geoLength += Math.sqrt(dx * dx + dy * dy) * scale;
      }
      geoLength = parseFloat(geoLength.toFixed(2));
    } else if (updated.type === 'area') {
      let areaVal = 0;
      for (let i = 0; i < updated.points.length; i++) {
        const j = (i + 1) % updated.points.length;
        areaVal += updated.points[i].x * updated.points[j].y;
        areaVal -= updated.points[j].x * updated.points[i].y;
      }
      geoArea = Math.abs(areaVal / 2) * (scale * scale);
      geoArea = parseFloat(geoArea.toFixed(2));
    }
  }

  if (!updated.trace_data) {
    updated.trace_data = {};
  }
  
  // Set default trace data properties if not already set
  if (updated.trace_data.type !== updated.type) {
    updated.trace_data.type = updated.type;
  }
  if (updated.trace_data.points !== updated.points) {
    updated.trace_data.points = updated.points;
  }
  if (updated.trace_data.color !== updated.color) {
    updated.trace_data.color = updated.color;
  }
  if (updated.trace_data.multiplier !== updated.multiplier) {
    updated.trace_data.multiplier = updated.multiplier;
  }
  if (updated.trace_data.unit_cost !== updated.unit_cost) {
    updated.trace_data.unit_cost = updated.unit_cost;
  }

  const matType = updated.trace_data.material_type || 'generic';

  if (matType === 'brick') {
    const wallHeight = Number(updated.trace_data.wall_height ?? 3);
    const wallThickness = Number(updated.trace_data.wall_thickness ?? 0.23);
    const brickL = Number(updated.trace_data.brick_length ?? 0.19);
    const brickW = Number(updated.trace_data.brick_width ?? 0.09);
    const brickH = Number(updated.trace_data.brick_height ?? 0.09);
    const mortarJoint = Number(updated.trace_data.mortar_joint ?? 0.01);
    const sandRatio = Number(updated.trace_data.sand_ratio ?? 5);
    const wasteFactor = Number(updated.trace_data.waste_factor ?? 5) / 100;

    const wallVol = geoLength * wallHeight * wallThickness;

    const brickVolWithMortar = (brickL + mortarJoint) * brickW * (brickH + mortarJoint);
    const rawBricks = brickVolWithMortar > 0 ? wallVol / brickVolWithMortar : 0;
    const totalBricks = Math.ceil(rawBricks * (1 + wasteFactor));

    const singleBrickVol = brickL * brickW * brickH;
    const netMortarVol = Math.max(0, wallVol - (rawBricks * singleBrickVol)) * (1 + wasteFactor);
    const dryMortarVol = netMortarVol * 1.33;

    const mixSum = 1 + sandRatio;
    const cementVol = dryMortarVol / mixSum;
    const cementBags = Math.ceil(cementVol / 0.035);
    const sandVol = (dryMortarVol * sandRatio) / mixSum;

    updated.length = geoLength;
    updated.width = wallThickness;
    updated.depth_height = wallHeight;
    updated.no_of_items = totalBricks;
    updated.gross_qty = parseFloat(wallVol.toFixed(2));
    
    updated.trace_data.takeoff_breakdown = {
      wall_volume: parseFloat(wallVol.toFixed(2)),
      bricks_count: totalBricks,
      mortar_volume: parseFloat(netMortarVol.toFixed(3)),
      cement_bags: cementBags,
      sand_volume: parseFloat(sandVol.toFixed(2))
    };

    const billingUnit = updated.trace_data.billing_unit || 'vol';
    if (billingUnit === 'pcs') {
      updated.unit = 'pcs';
      updated.net_qty = totalBricks;
    } else {
      updated.unit = scale === 1 ? 'px3' : 'm3';
      const multiplierVal = parseFloat(updated.multiplier) || 1;
      updated.net_qty = parseFloat((updated.gross_qty * multiplierVal).toFixed(2));
    }

  } else if (matType === 'tile') {
    const tileL = Number(updated.trace_data.tile_length ?? 0.3);
    const tileW = Number(updated.trace_data.tile_width ?? 0.3);
    const groutW = Number(updated.trace_data.grout_width ?? 0.003);
    const groutDepth = Number(updated.trace_data.grout_depth ?? 0.006);
    const adhesiveThickness = Number(updated.trace_data.adhesive_thickness ?? 0.003);
    const wasteFactor = Number(updated.trace_data.waste_factor ?? 10) / 100;

    const tileAreaWithGrout = (tileL + groutW) * (tileW + groutW);
    const rawTiles = tileAreaWithGrout > 0 ? geoArea / tileAreaWithGrout : 0;
    const totalTiles = Math.ceil(rawTiles * (1 + wasteFactor));

    const groutVol = (tileL * tileW > 0) ? (geoArea * groutW * groutDepth * (tileL + tileW) / (tileL * tileW)) * (1 + wasteFactor) : 0;
    const groutWeightKg = groutVol * 1600;

    const adhesiveVol = geoArea * adhesiveThickness * (1 + wasteFactor);
    const adhesiveWeightKg = adhesiveVol * 1800;

    updated.length = tileL;
    updated.width = tileW;
    updated.depth_height = groutDepth;
    updated.no_of_items = totalTiles;
    updated.gross_qty = geoArea;

    updated.trace_data.takeoff_breakdown = {
      surface_area: geoArea,
      tiles_count: totalTiles,
      grout_weight_kg: parseFloat(groutWeightKg.toFixed(1)),
      adhesive_weight_kg: parseFloat(adhesiveWeightKg.toFixed(1))
    };

    const billingUnit = updated.trace_data.billing_unit || 'area';
    if (billingUnit === 'pcs') {
      updated.unit = 'pcs';
      updated.net_qty = totalTiles;
    } else {
      updated.unit = scale === 1 ? 'px2' : 'sqft';
      const multiplierVal = parseFloat(updated.multiplier) || 1;
      updated.net_qty = parseFloat((updated.gross_qty * multiplierVal).toFixed(2));
    }

  } else if (matType === 'concrete') {
    const slabThickness = Number(updated.trace_data.slab_thickness ?? 0.15);
    const sandRatio = Number(updated.trace_data.sand_ratio ?? 2);
    const aggregateRatio = Number(updated.trace_data.aggregate_ratio ?? 4);
    const wasteFactor = Number(updated.trace_data.waste_factor ?? 5) / 100;

    const wetVol = geoArea * slabThickness;
    const wetVolWithWaste = wetVol * (1 + wasteFactor);
    const dryVol = wetVolWithWaste * 1.54;

    const mixSum = 1 + sandRatio + aggregateRatio;
    const cementVol = dryVol / mixSum;
    const cementBags = Math.ceil(cementVol / 0.035);
    const sandVol = (dryVol * sandRatio) / mixSum;
    const aggregateVol = (dryVol * aggregateRatio) / mixSum;

    updated.length = undefined;
    updated.width = undefined;
    updated.depth_height = slabThickness;
    updated.no_of_items = undefined;
    updated.gross_qty = parseFloat(wetVol.toFixed(2));

    updated.trace_data.takeoff_breakdown = {
      surface_area: geoArea,
      concrete_volume: parseFloat(wetVolWithWaste.toFixed(2)),
      cement_bags: cementBags,
      sand_volume: parseFloat(sandVol.toFixed(2)),
      aggregate_volume: parseFloat(aggregateVol.toFixed(2))
    };

    updated.unit = scale === 1 ? 'px3' : 'm3';
    const multiplierVal = parseFloat(updated.multiplier) || 1;
    updated.net_qty = parseFloat((updated.gross_qty * multiplierVal).toFixed(2));

  } else if (updated.type === 'count') {
    updated.no_of_items = geoCount;
    updated.gross_qty = geoCount;
    updated.unit = updated.unit || 'ea';
    const multiplierVal = parseFloat(updated.multiplier) || 1;
    updated.net_qty = Math.ceil(geoCount * multiplierVal);

  } else {
    if (updated.type === 'length') {
      updated.gross_qty = geoLength;
      updated.unit = updated.unit || (scale === 1 ? 'px' : 'ft');
    } else if (updated.type === 'area') {
      updated.gross_qty = geoArea;
      updated.unit = updated.unit || (scale === 1 ? 'px2' : 'sqft');
    }
    const multiplierVal = parseFloat(updated.multiplier) || 1;
    updated.net_qty = parseFloat((updated.gross_qty * multiplierVal).toFixed(2));
  }

  const unitCostVal = Number(updated.unit_cost) || 0;
  updated.total_cost = parseFloat((updated.net_qty * unitCostVal).toFixed(2));

  return updated;
}

interface EstimationState {
  items: TakeoffItem[];
  past: TakeoffItem[][];
  future: TakeoffItem[][];
  
  activeTool: 'select' | 'line' | 'polygon' | 'point' | 'calibrate';
  selectedItemId: string | null;
  hoveredItemId: string | null;
  pixelToMeterScale: number; // 1 pixel = X meters
  calibrationUnit: CalibrationUnit; // preferred unit used during calibration
  displayScaleUnit: CalibrationUnit; // currently selected unit for scale display
  activeMaterial: MasterCatalogItem | null;
  globalLineWidth: number;
  
  // Persistence
  floorPlanId: number | null;
  lastSavedItems: TakeoffItem[];
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Project Settings
  floorLevel: 'ground' | 'upper';
  wallHeight: number;

  // Actions
  addItem: (item: TakeoffItem) => void;
  updateItem: (id: string, updates: Partial<TakeoffItem>) => void;
  deleteItem: (id: string) => void;
  setItems: (items: TakeoffItem[]) => void;
  setLastSavedItems: (items: TakeoffItem[]) => void;
  setFloorPlanId: (id: number | null) => void;
  setSyncStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  
  setFloorLevel: (level: 'ground' | 'upper') => void;
  setWallHeight: (height: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Interaction Actions
  setActiveTool: (tool: 'select' | 'line' | 'polygon' | 'point' | 'calibrate') => void;
  setSelection: (id: string | null) => void;
  setHover: (id: string | null) => void;
  setCalibrationScale: (scale: number, unit?: CalibrationUnit) => void;
  setDisplayScaleUnit: (unit: CalibrationUnit) => void;
  setActiveMaterial: (material: MasterCatalogItem | null) => void;
  setGlobalLineWidth: (width: number) => void;
}

export const useEstimationStore = create<EstimationState>((set, get) => ({
  items: [],
  past: [],
  future: [],
  activeTool: 'select',
  selectedItemId: null,
  hoveredItemId: null,
  pixelToMeterScale: 1,
  calibrationUnit: 'm',
  displayScaleUnit: 'm',
  activeMaterial: null,
  globalLineWidth: 2,
  floorPlanId: null,
  lastSavedItems: [],
  syncStatus: 'idle',
  floorLevel: 'ground',
  wallHeight: 3.0,

  saveHistory: () => set((state) => {
    const newPast = [...state.past, state.items].slice(-20);
    return { past: newPast, future: [] };
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return {};
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    return {
      past: newPast,
      future: [state.items, ...state.future],
      items: previous,
      selectedItemId: null
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, state.items],
      future: newFuture,
      items: next,
      selectedItemId: null
    };
  }),

  addItem: (item) => {
    get().saveHistory();
    set((state) => {
      const material = state.activeMaterial;
      if (material) {
        item.item_code = material.item_code;
        
        let desc = material.description;
        let matType = item.type;
        let params = {};
        
        try {
          const json = JSON.parse(material.description);
          if (json && json.material_type) {
            desc = json.text_description || '';
            matType = json.material_type;
            params = json.parameters || {};
          }
        } catch (e) {}

        item.description = desc;
        item.unit = material.unit;
        item.unit_cost = material.unit_cost;
        item.multiplier = material.multiplier.toString();
        item.color = material.color;
        
        item.trace_data = {
          ...(item.trace_data || {}),
          material_type: matType,
          ...params
        };
      }
      
      const recalculated = recalculateItemQuantities(item, state.pixelToMeterScale);
      return { items: [...state.items, recalculated] };
    });
  },
  
  updateItem: (id, updates) => {
    const isOnlyPoints = Object.keys(updates).length === 1 && updates.points;
    if (!isOnlyPoints) {
      get().saveHistory();
    }
    
    set((state) => {
      const newItems = state.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          return recalculateItemQuantities(updated, state.pixelToMeterScale);
        }
        return item;
      });
      return { items: newItems };
    });
  },

  deleteItem: (id) => {
    get().saveHistory();
    set((state) => ({
      items: state.items.filter(i => i.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      hoveredItemId: state.hoveredItemId === id ? null : state.hoveredItemId,
    }));
  },

  setItems: (items) => set({ items }),
  setLastSavedItems: (items) => set({ lastSavedItems: items }),
  setFloorPlanId: (id) => set({ floorPlanId: id }),

  setSyncStatus: (status) => set({ syncStatus: status }),

  setActiveTool: (tool) => set({ activeTool: tool, selectedItemId: null }),
  setSelection: (id) => set({ selectedItemId: id }),
  setHover: (id) => set({ hoveredItemId: id }),
  setCalibrationScale: (scale, unit) => set((state) => ({ 
    pixelToMeterScale: scale,
    ...(unit && { calibrationUnit: unit, displayScaleUnit: unit })
  })),
  setDisplayScaleUnit: (unit) => set({ displayScaleUnit: unit }),
  setActiveMaterial: (material) => set({ activeMaterial: material }),
  setGlobalLineWidth: (width) => set({ globalLineWidth: width }),
  setFloorLevel: (level) => set({ floorLevel: level }),
  setWallHeight: (height) => set({ wallHeight: height }),
}));
