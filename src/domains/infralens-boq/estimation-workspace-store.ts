import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BOQItemRow } from './types';
import { MeasuredShape } from '@/components/estimation/SimpleSvgLayer';
import { DEFAULT_EXAMPLE_SLUGS, RECIPES_MAP } from './recipes';
import { CalibrationUnit } from '@/lib/estimation/units';

export interface PlanWorkspaceState {
  scale: number;
  isCalibrated: boolean;
  unit?: CalibrationUnit;
  shapes: MeasuredShape[];
  boqItems: BOQItemRow[];
}

export interface ProjectWorkspaceData {
  selectedCity: string;
  customMaterialRates: Record<string, number>;
  customLabourRates: Record<string, number>;
  planStates: Record<number, PlanWorkspaceState>;
  lastSaved: string;
}

interface EstimationWorkspaceStore {
  projects: Record<string, ProjectWorkspaceData>;

  // Actions
  getOrCreateProjectData: (projectUid: string) => ProjectWorkspaceData;
  setPlanState: (projectUid: string, planId: number, state: Partial<PlanWorkspaceState>) => void;
  setPlanShapes: (projectUid: string, planId: number, shapes: MeasuredShape[]) => void;
  setPlanBoqItems: (projectUid: string, planId: number, boqItems: BOQItemRow[]) => void;
  setPlanScale: (projectUid: string, planId: number, scale: number, unit?: CalibrationUnit) => void;
  setPlanUnit: (projectUid: string, planId: number, unit: CalibrationUnit) => void;
  setSelectedCity: (projectUid: string, city: string) => void;
  setCustomMaterialRates: (projectUid: string, rates: Record<string, number>) => void;
  setCustomLabourRates: (projectUid: string, rates: Record<string, number>) => void;
  resetProjectToDefault: (projectUid: string) => void;
}

export function createDefaultBoqItems(): BOQItemRow[] {
  return DEFAULT_EXAMPLE_SLUGS.map((ex) => {
    const rec = RECIPES_MAP.get(ex.slug);
    return {
      id: crypto.randomUUID(),
      slug: ex.slug,
      name: rec?.name || ex.slug,
      group: rec?.group || "General",
      qty: ex.qty,
      unit: rec?.unit || "cum",
      sourceType: "manual" as const,
    };
  });
}

export const useEstimationWorkspaceStore = create<EstimationWorkspaceStore>()(
  persist(
    (set, get) => ({
      projects: {},

      getOrCreateProjectData: (projectUid: string) => {
        const existing = get().projects[projectUid];
        if (existing) return existing;

        const initial: ProjectWorkspaceData = {
          selectedCity: "delhi",
          customMaterialRates: {},
          customLabourRates: {},
          planStates: {},
          lastSaved: new Date().toISOString(),
        };

        set((state) => ({
          projects: {
            ...state.projects,
            [projectUid]: initial,
          },
        }));

        return initial;
      },

      setPlanState: (projectUid: string, planId: number, updates: Partial<PlanWorkspaceState>) => {
        const now = new Date().toISOString();
        set((state) => {
          const projectData = state.projects[projectUid] || {
            selectedCity: "delhi",
            customMaterialRates: {},
            customLabourRates: {},
            planStates: {},
            lastSaved: now,
          };

          const currentPlan = projectData.planStates[planId] || {
            scale: 0.025,
            isCalibrated: false,
            unit: 'm' as CalibrationUnit,
            shapes: [],
            boqItems: createDefaultBoqItems(),
          };

          return {
            projects: {
              ...state.projects,
              [projectUid]: {
                ...projectData,
                lastSaved: now,
                planStates: {
                  ...projectData.planStates,
                  [planId]: {
                    ...currentPlan,
                    ...updates,
                  },
                },
              },
            },
          };
        });
      },

      setPlanShapes: (projectUid: string, planId: number, shapes: MeasuredShape[]) => {
        get().setPlanState(projectUid, planId, { shapes });
      },

      setPlanBoqItems: (projectUid: string, planId: number, boqItems: BOQItemRow[]) => {
        get().setPlanState(projectUid, planId, { boqItems });
      },

      setPlanScale: (projectUid: string, planId: number, scale: number, unit?: CalibrationUnit) => {
        get().setPlanState(projectUid, planId, { 
          scale, 
          isCalibrated: true,
          ...(unit ? { unit } : {})
        });
      },

      setPlanUnit: (projectUid: string, planId: number, unit: CalibrationUnit) => {
        get().setPlanState(projectUid, planId, { unit });
      },

      setSelectedCity: (projectUid: string, city: string) => {
        const now = new Date().toISOString();
        set((state) => {
          const projectData = state.projects[projectUid] || {
            selectedCity: city,
            customMaterialRates: {},
            customLabourRates: {},
            planStates: {},
            lastSaved: now,
          };

          return {
            projects: {
              ...state.projects,
              [projectUid]: {
                ...projectData,
                selectedCity: city,
                lastSaved: now,
              },
            },
          };
        });
      },

      setCustomMaterialRates: (projectUid: string, rates: Record<string, number>) => {
        const now = new Date().toISOString();
        set((state) => {
          const projectData = state.projects[projectUid] || {
            selectedCity: "delhi",
            customMaterialRates: rates,
            customLabourRates: {},
            planStates: {},
            lastSaved: now,
          };

          return {
            projects: {
              ...state.projects,
              [projectUid]: {
                ...projectData,
                customMaterialRates: rates,
                lastSaved: now,
              },
            },
          };
        });
      },

      setCustomLabourRates: (projectUid: string, rates: Record<string, number>) => {
        const now = new Date().toISOString();
        set((state) => {
          const projectData = state.projects[projectUid] || {
            selectedCity: "delhi",
            customMaterialRates: {},
            customLabourRates: rates,
            planStates: {},
            lastSaved: now,
          };

          return {
            projects: {
              ...state.projects,
              [projectUid]: {
                ...projectData,
                customLabourRates: rates,
                lastSaved: now,
              },
            },
          };
        });
      },

      resetProjectToDefault: (projectUid: string) => {
        set((state) => {
          const next = { ...state.projects };
          delete next[projectUid];
          return { projects: next };
        });
      },
    }),
    {
      name: 'ap_estimation_workspace_v2',
    }
  )
);
