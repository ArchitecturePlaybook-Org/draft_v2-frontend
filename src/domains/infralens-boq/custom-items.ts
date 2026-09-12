import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MaterialRequirement, LabourRequirement, MachineryRequirement } from './types';

export interface CustomWorkItem {
  id: string;
  slug: string;
  name: string;
  group: string; // Section / Category name
  unit: string;
  description?: string;
  pricingMode: 'direct' | 'analysis';
  baseRate?: number; // Used when pricingMode is 'direct'
  materials?: MaterialRequirement[];
  labour?: LabourRequirement[];
  machinery?: MachineryRequirement[];
  isCustom: true;
  createdAt: string;
  updatedAt: string;
}

interface CustomItemsState {
  customSections: string[];
  customItems: CustomWorkItem[];
  
  // Actions
  addCustomSection: (name: string) => boolean;
  deleteCustomSection: (name: string) => void;
  addCustomItem: (item: Omit<CustomWorkItem, 'id' | 'slug' | 'isCustom' | 'createdAt' | 'updatedAt'> & { slug?: string }) => CustomWorkItem;
  updateCustomItem: (id: string, updates: Partial<Omit<CustomWorkItem, 'id' | 'isCustom'>>) => void;
  deleteCustomItem: (id: string) => void;
  duplicateCustomItem: (id: string) => CustomWorkItem | null;
  resetToDefaults: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const useCustomItemsStore = create<CustomItemsState>()(
  persist(
    (set, get) => ({
      customSections: [
        "Luxury Interior Finishes",
        "Solar & EV Infrastructure",
        "Custom Carpentry & Millwork"
      ],
      customItems: [
        {
          id: "custom-item-italian-marble",
          slug: "custom-italian-marble-flooring",
          name: "Italian Marble Flooring (Statuario / Dyna 18mm)",
          group: "Luxury Interior Finishes",
          unit: "sqm",
          description: "High-grade imported 18mm Italian marble slab with mirror polish and epoxy grout",
          pricingMode: "direct",
          baseRate: 3800,
          materials: [],
          labour: [],
          machinery: [],
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "custom-item-rooftop-solar",
          slug: "custom-rooftop-solar-pv-on-grid",
          name: "Rooftop Solar PV On-Grid System (per kWp)",
          group: "Solar & EV Infrastructure",
          unit: "set",
          description: "Tier-1 Mono-PERC panels with grid-tie inverter, cabling, earthing and net-metering setup",
          pricingMode: "direct",
          baseRate: 48000,
          materials: [],
          labour: [],
          machinery: [],
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],

      addCustomSection: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const exists = get().customSections.some(s => s.toLowerCase() === trimmed.toLowerCase());
        if (exists) return false;

        set(state => ({
          customSections: [...state.customSections, trimmed]
        }));
        return true;
      },

      deleteCustomSection: (name: string) => {
        set(state => ({
          customSections: state.customSections.filter(s => s !== name)
        }));
      },

      addCustomItem: (data) => {
        const id = `custom-${crypto.randomUUID()}`;
        const baseSlug = data.slug ? slugify(data.slug) : slugify(data.name);
        // Ensure unique slug
        let uniqueSlug = `custom-${baseSlug}`;
        let counter = 1;
        while (get().customItems.some(item => item.slug === uniqueSlug)) {
          uniqueSlug = `custom-${baseSlug}-${counter++}`;
        }

        const newItem: CustomWorkItem = {
          ...data,
          id,
          slug: uniqueSlug,
          isCustom: true,
          materials: data.materials || [],
          labour: data.labour || [],
          machinery: data.machinery || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Also add section to customSections if it doesn't already exist
        const trimmedGroup = data.group.trim();
        if (trimmedGroup && !get().customSections.some(s => s.toLowerCase() === trimmedGroup.toLowerCase())) {
          set(state => ({
            customSections: [...state.customSections, trimmedGroup],
            customItems: [newItem, ...state.customItems]
          }));
        } else {
          set(state => ({
            customItems: [newItem, ...state.customItems]
          }));
        }

        return newItem;
      },

      updateCustomItem: (id, updates) => {
        set(state => ({
          customItems: state.customItems.map(item => {
            if (item.id !== id) return item;
            return {
              ...item,
              ...updates,
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },

      deleteCustomItem: (id) => {
        set(state => ({
          customItems: state.customItems.filter(item => item.id !== id)
        }));
      },

      duplicateCustomItem: (id) => {
        const item = get().customItems.find(i => i.id === id);
        if (!item) return null;

        return get().addCustomItem({
          name: `${item.name} (Copy)`,
          group: item.group,
          unit: item.unit,
          description: item.description,
          pricingMode: item.pricingMode,
          baseRate: item.baseRate,
          materials: item.materials ? [...item.materials] : [],
          labour: item.labour ? [...item.labour] : [],
          machinery: item.machinery ? [...item.machinery] : []
        });
      },

      resetToDefaults: () => {
        set({
          customSections: [
            "Luxury Interior Finishes",
            "Solar & EV Infrastructure",
            "Custom Carpentry & Millwork"
          ],
          customItems: []
        });
      }
    }),
    {
      name: 'ap_custom_items_of_work_v1'
    }
  )
);
