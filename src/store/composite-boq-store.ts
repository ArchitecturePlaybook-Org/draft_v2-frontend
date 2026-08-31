import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BOQ_TEMPLATES, ARCHETYPE_PRESETS } from '@/domains/boq/catalog';
import { StageScopeFilters, DEFAULT_STAGE_SCOPES } from '@/domains/boq/types';
import { FinishQuality } from '@/domains/boq/assemblies';
import { TakeoffItem } from '@/types/estimation.types';
import type { RoomCard } from '@/components/boq/RoomComposerPanel';

export type FloorLevelType = 'foundation' | 'ground' | 'upper' | 'terrace' | 'site' | 'interior';
export type StudioMode = 'composer' | 'sliders' | 'canvas_trace';

export interface DrawingContext {
  floorLevel: FloorLevelType;
  floorMultiplier: number;
  wallHeight: number;
}

interface CompositeBOQState {
  // Studio Mode & Finish Quality
  studioMode: StudioMode;
  finishQuality: FinishQuality;

  // Room Composer State (replaces sliders)
  roomCards: RoomCard[];
  numFloors: number;

  // Modules state
  activeModuleSlugs: string[];
  moduleParamsMap: Record<string, Record<string, any>>;
  focusedModuleSlug: string;
  activeArchetypeId: string | null;

  // Drawing & Level Context
  drawingContext: DrawingContext;

  // Stage Opt-In / Opt-Out Filters
  activeScopes: StageScopeFilters;

  // Actions
  setStudioMode: (mode: StudioMode) => void;
  setFinishQuality: (quality: FinishQuality) => void;
  setRoomCards: (rooms: RoomCard[]) => void;
  setNumFloors: (n: number) => void;
  setSingleActiveTypology: (slug: string) => void;
  setArchetype: (archetypeId: string) => void;
  addModule: (slug: string) => void;
  removeModule: (slug: string) => void;
  setFocusedModule: (slug: string) => void;
  updateModuleParam: (slug: string, key: string, value: any) => void;
  setDrawingContext: (context: Partial<DrawingContext>) => void;
  setFloorLevel: (level: FloorLevelType) => void;
  toggleScope: (scopeKey: keyof StageScopeFilters) => void;
  setScope: (scopeKey: keyof StageScopeFilters, value: boolean) => void;
  resetToDefaultScopes: () => void;

  // Two-way Takeoff Sync
  syncTakeoffItemsToModules: (items: TakeoffItem[], pixelToMeterScale: number) => void;
}

const defaultPmayParams: Record<string, any> = {};
BOQ_TEMPLATES['pmay-g-rural-house']?.parameters.forEach((p) => {
  defaultPmayParams[p.key] = p.default;
});

export const useCompositeBOQStore = create<CompositeBOQState>()(
  persist(
    (set, get) => ({
      studioMode: 'composer',
      finishQuality: 'standard',

      roomCards: [
        { id: 'default-living', type: 'living', name: 'Living Room', widthFt: 14, lengthFt: 18, height: 3.0, falseCeiling: true, dadoTiles: false, flooring: true, paint: true },
        { id: 'default-bed1', type: 'master_bed', name: 'Master Bedroom', widthFt: 12, lengthFt: 14, height: 3.0, falseCeiling: true, dadoTiles: false, flooring: true, paint: true },
        { id: 'default-bed2', type: 'bed', name: 'Bedroom 2', widthFt: 10, lengthFt: 12, height: 3.0, falseCeiling: false, dadoTiles: false, flooring: true, paint: true },
        { id: 'default-toilet', type: 'toilet', name: 'Common Toilet', widthFt: 5, lengthFt: 7, height: 3.0, falseCeiling: false, dadoTiles: true, flooring: true, paint: false },
        { id: 'default-kitchen', type: 'kitchen', name: 'Kitchen', widthFt: 9, lengthFt: 11, height: 3.0, falseCeiling: true, dadoTiles: true, flooring: true, paint: true },
      ],
      numFloors: 2,

      activeModuleSlugs: ['g1-residential-house'],
      moduleParamsMap: {
        'g1-residential-house': {
          length_m: 12.0,
          width_m: 9.0,
          num_floors: 2,
          height_m: 3.0,
          soil_type: 'medium',
          masonry_type: 'brick',
          outer_door_count: 2,
          inner_door_count: 6,
          window_count: 8,
        },
      },
      focusedModuleSlug: 'g1-residential-house',
      activeArchetypeId: 'complete-residential-villa',

      drawingContext: {
        floorLevel: 'ground',
        floorMultiplier: 1,
        wallHeight: 3.0,
      },

      activeScopes: { ...DEFAULT_STAGE_SCOPES },

      setStudioMode: (mode: StudioMode) => set({ studioMode: mode }),
      setFinishQuality: (quality: FinishQuality) => set({ finishQuality: quality }),
      setRoomCards: (rooms: RoomCard[]) => set({ roomCards: rooms }),
      setNumFloors: (n: number) => set({ numFloors: n }),

      setSingleActiveTypology: (slug: string) => {
        const { moduleParamsMap } = get();
        const template = BOQ_TEMPLATES[slug];
        const defaults: Record<string, any> = {};
        template?.parameters.forEach((p) => {
          defaults[p.key] = p.default;
        });

        set({
          activeModuleSlugs: [slug],
          focusedModuleSlug: slug,
          activeArchetypeId: null,
          moduleParamsMap: {
            ...moduleParamsMap,
            [slug]: moduleParamsMap[slug] || defaults,
          },
        });
      },

      setArchetype: (archetypeId: string) => {
        const archetype = ARCHETYPE_PRESETS.find((a) => a.id === archetypeId);
        if (!archetype) return;

        const newSlugs: string[] = [];
        const newParamsMap: Record<string, Record<string, any>> = {};

        archetype.modules.forEach((mod) => {
          newSlugs.push(mod.slug);
          const template = BOQ_TEMPLATES[mod.slug];
          const defaults: Record<string, any> = {};
          template?.parameters.forEach((p) => {
            defaults[p.key] = p.default;
          });
          newParamsMap[mod.slug] = {
            ...defaults,
            ...(mod.params || {}),
          };
        });

        set({
          activeModuleSlugs: newSlugs,
          moduleParamsMap: newParamsMap,
          focusedModuleSlug: newSlugs[0] || 'g1-residential-house',
          activeArchetypeId: archetypeId,
        });
      },

      addModule: (slug: string) => {
        const { activeModuleSlugs, moduleParamsMap } = get();
        if (activeModuleSlugs.includes(slug)) {
          set({ focusedModuleSlug: slug });
          return;
        }

        const template = BOQ_TEMPLATES[slug];
        const defaults: Record<string, any> = {};
        template?.parameters.forEach((p) => {
          defaults[p.key] = p.default;
        });

        set({
          activeModuleSlugs: [...activeModuleSlugs, slug],
          moduleParamsMap: {
            ...moduleParamsMap,
            [slug]: defaults,
          },
          focusedModuleSlug: slug,
          activeArchetypeId: null,
        });
      },

      removeModule: (slug: string) => {
        const { activeModuleSlugs, focusedModuleSlug } = get();
        if (activeModuleSlugs.length <= 1) return;

        const nextSlugs = activeModuleSlugs.filter((s) => s !== slug);
        const nextFocused = focusedModuleSlug === slug ? nextSlugs[0] : focusedModuleSlug;

        set({
          activeModuleSlugs: nextSlugs,
          focusedModuleSlug: nextFocused,
          activeArchetypeId: null,
        });
      },

      setFocusedModule: (slug: string) => {
        set({ focusedModuleSlug: slug });
      },

      updateModuleParam: (slug: string, key: string, value: any) => {
        const { moduleParamsMap } = get();
        const currentParams = moduleParamsMap[slug] || {};
        set({
          moduleParamsMap: {
            ...moduleParamsMap,
            [slug]: {
              ...currentParams,
              [key]: value,
            },
          },
        });
      },

      setDrawingContext: (contextUpdate) => {
        const { drawingContext, activeScopes } = get();
        const updated = { ...drawingContext, ...contextUpdate };

        const newScopes = { ...activeScopes };
        if (updated.floorLevel === 'upper' || updated.floorLevel === 'terrace') {
          newScopes.foundation = false;
          newScopes.earthwork = false;
        } else if (updated.floorLevel === 'foundation') {
          newScopes.superstructure = false;
          newScopes.finishes = false;
          newScopes.openings = false;
        }

        set({
          drawingContext: updated,
          activeScopes: newScopes,
        });
      },

      setFloorLevel: (level: FloorLevelType) => {
        get().setDrawingContext({ floorLevel: level });
      },

      toggleScope: (scopeKey) => {
        const { activeScopes } = get();
        set({
          activeScopes: {
            ...activeScopes,
            [scopeKey]: !activeScopes[scopeKey],
          },
        });
      },

      setScope: (scopeKey, value) => {
        const { activeScopes } = get();
        set({
          activeScopes: {
            ...activeScopes,
            [scopeKey]: value,
          },
        });
      },

      resetToDefaultScopes: () => {
        set({ activeScopes: { ...DEFAULT_STAGE_SCOPES } });
      },

      // ── Two-Way Takeoff Synchronization ─────────────────────────────────────
      syncTakeoffItemsToModules: (items: TakeoffItem[], pixelToMeterScale: number) => {
        if (!items || items.length === 0 || pixelToMeterScale <= 0) return;

        const { activeModuleSlugs, moduleParamsMap } = get();
        const updatedParamsMap = { ...moduleParamsMap };

        let totalPolygonArea = 0;
        let totalLineLength = 0;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let doorCount = 0;
        let windowCount = 0;

        items.forEach((item) => {
          const isLine = item.type === "length" || item.type === "line";
          const isPolygon = item.type === "area" || item.type === "polygon";
          const isPoint = item.type === "count" || item.type === "point";

          const matType = (item.trace_data as any)?.material_type || "";
          const code = item.item_code || "";

          if (isPoint || matType === "door" || code.includes("DW-1")) {
            doorCount += item.points?.length || 1;
          } else if (matType === "window" || code.includes("DW-2")) {
            windowCount += item.points?.length || 1;
          }

          if (item.points && item.points.length > 0) {
            item.points.forEach((pt) => {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.y > maxY) maxY = pt.y;
            });

            if (isLine) {
              for (let i = 1; i < item.points.length; i++) {
                const dx = item.points[i].x - item.points[i - 1].x;
                const dy = item.points[i].y - item.points[i - 1].y;
                totalLineLength += Math.sqrt(dx * dx + dy * dy) * pixelToMeterScale;
              }
            } else if (isPolygon) {
              let a = 0;
              for (let i = 0; i < item.points.length; i++) {
                const j = (i + 1) % item.points.length;
                a += item.points[i].x * item.points[j].y;
                a -= item.points[j].x * item.points[i].y;
              }
              totalPolygonArea += Math.abs(a / 2) * (pixelToMeterScale * pixelToMeterScale);
            }
          }
        });

        const envelopeWidthM = isFinite(minX) && isFinite(maxX) ? (maxX - minX) * pixelToMeterScale : 0;
        const envelopeHeightM = isFinite(minY) && isFinite(maxY) ? (maxY - minY) * pixelToMeterScale : 0;

        if (activeModuleSlugs.includes("g1-residential-house") && envelopeWidthM > 4 && envelopeHeightM > 4) {
          const current = updatedParamsMap["g1-residential-house"] || {};
          updatedParamsMap["g1-residential-house"] = {
            ...current,
            length_m: Number(Math.max(envelopeWidthM, envelopeHeightM).toFixed(1)),
            width_m: Number(Math.min(envelopeWidthM, envelopeHeightM).toFixed(1)),
            outer_door_count: Math.max(1, Math.min(4, Math.floor(doorCount / 3))),
            inner_door_count: Math.max(2, doorCount),
            window_count: Math.max(4, windowCount),
          };
        } else if (activeModuleSlugs.includes("pmay-g-rural-house") && envelopeWidthM > 2 && envelopeHeightM > 2) {
          const current = updatedParamsMap["pmay-g-rural-house"] || {};
          updatedParamsMap["pmay-g-rural-house"] = {
            ...current,
            length_m: Math.max(4.0, Math.min(10.0, Number(Math.max(envelopeWidthM, envelopeHeightM).toFixed(1)))),
            width_m: Math.max(3.5, Math.min(8.0, Number(Math.min(envelopeWidthM, envelopeHeightM).toFixed(1)))),
          };
        }

        if (activeModuleSlugs.includes("boundary-wall") && totalLineLength > 5) {
          const current = updatedParamsMap["boundary-wall"] || {};
          updatedParamsMap["boundary-wall"] = {
            ...current,
            wall_length_m: Number(totalLineLength.toFixed(1)),
          };
        }

        set({ moduleParamsMap: updatedParamsMap });
      },
    }),
    {
      name: 'ap-composite-boq-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
