import { create } from 'zustand';
import { TakeoffItem } from '@/types/estimation.types';

export interface MasterCatalogItem {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  unit_cost: number;
  multiplier: number;
  color: string;
}

interface EstimationState {
  items: TakeoffItem[];
  activeTool: 'select' | 'line' | 'polygon' | 'point' | 'calibrate';
  selectedItemId: string | null;
  hoveredItemId: string | null;
  pixelToMeterScale: number; // 1 pixel = X meters
  activeMaterial: MasterCatalogItem | null;
  
  // Persistence
  floorPlanId: number | null;
  lastSavedItems: TakeoffItem[];
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Actions
  addItem: (item: TakeoffItem) => void;
  updateItem: (id: string, updates: Partial<TakeoffItem>) => void;
  deleteItem: (id: string) => void;
  setItems: (items: TakeoffItem[]) => void;
  setLastSavedItems: (items: TakeoffItem[]) => void;
  setFloorPlanId: (id: number | null) => void;
  setSyncStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  
  // Interaction Actions
  setActiveTool: (tool: 'select' | 'line' | 'polygon' | 'point' | 'calibrate') => void;
  setSelection: (id: string | null) => void;
  setHover: (id: string | null) => void;
  setCalibrationScale: (scale: number) => void;
  setActiveMaterial: (material: MasterCatalogItem | null) => void;
}

export const useEstimationStore = create<EstimationState>((set, get) => ({
  items: [],
  activeTool: 'select',
  selectedItemId: null,
  hoveredItemId: null,
  pixelToMeterScale: 1,
  activeMaterial: null,
  floorPlanId: null,
  lastSavedItems: [],
  syncStatus: 'idle',

  addItem: (item) => set((state) => {
    // Inject active material properties if one is selected
    const material = state.activeMaterial;
    if (material) {
      item.item_code = material.item_code;
      item.description = material.description;
      item.unit = material.unit;
      item.unit_cost = material.unit_cost;
      item.multiplier = material.multiplier.toString();
      item.color = material.color;
      
      let multiplierVal = 1;
      const num = parseFloat(item.multiplier);
      if (!isNaN(num)) multiplierVal = num;
      
      item.net_qty = item.gross_qty * multiplierVal;
      item.total_cost = item.net_qty * (item.unit_cost || 0);
    } else {
      item.total_cost = item.net_qty * (item.unit_cost || 0);
    }
    
    return { items: [...state.items, item] };
  }),
  
  updateItem: (id, updates) => set((state) => {
    const newItems = state.items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        
        // If points were updated, recalculate gross_qty
        if (updates.points) {
          let newGross = 0;
          if (updated.type === 'length') {
            for(let i = 1; i < updated.points.length; i++) {
              const dx2 = updated.points[i].x - updated.points[i-1].x;
              const dy2 = updated.points[i].y - updated.points[i-1].y;
              newGross += Math.sqrt(dx2*dx2 + dy2*dy2) * state.pixelToMeterScale;
            }
          } else if (updated.type === 'area') {
            let area = 0;
            for (let i = 0; i < updated.points.length; i++) {
              const j = (i + 1) % updated.points.length;
              area += updated.points[i].x * updated.points[j].y;
              area -= updated.points[j].x * updated.points[i].y;
            }
            newGross = Math.abs(area / 2) * (state.pixelToMeterScale * state.pixelToMeterScale);
          } else {
            newGross = updated.gross_qty;
          }
          updated.gross_qty = parseFloat(newGross.toFixed(2));
        }

        // Auto-calculate logic
        // 1. Evaluate multiplier (e.g., "1.05" or 1.05)
        let multiplierVal = 1;
        if (updated.multiplier) {
          const num = parseFloat(updated.multiplier);
          if (!isNaN(num)) multiplierVal = num;
        }
        
        updated.net_qty = updated.gross_qty * multiplierVal;
        updated.total_cost = updated.net_qty * (updated.unit_cost || 0);
        
        return updated;
      }
      return item;
    });
    return { items: newItems };
  }),

  deleteItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    hoveredItemId: state.hoveredItemId === id ? null : state.hoveredItemId,
  })),

  setItems: (items) => set({ items }),
  setLastSavedItems: (items) => set({ lastSavedItems: items }),
  setFloorPlanId: (id) => set({ floorPlanId: id }),
  setSyncStatus: (status) => set({ syncStatus: status }),

  setActiveTool: (tool) => set({ activeTool: tool, selectedItemId: null }),
  setSelection: (id) => set({ selectedItemId: id }),
  setHover: (id) => set({ hoveredItemId: id }),
  setCalibrationScale: (scale) => set({ pixelToMeterScale: scale }),
  setActiveMaterial: (material) => set({ activeMaterial: material }),
}));
