import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CalibrationUnit } from '@/lib/estimation/units';
import type { BOQLineItem, BOQResult } from '@/domains/boq/types';
import type { RoomAssemblyType, RoomAssemblyToggles, FinishQuality } from '@/domains/boq/assemblies';

// ─── Geometry ─────────────────────────────────────────────────────────────────

export interface Point { x: number; y: number; }

// ─── Turnkey Room ─────────────────────────────────────────────────────────────

export interface TurnkeyRoom {
  id: string;
  name: string;
  roomType: RoomAssemblyType;
  points: Point[];
  areaM2: number;
  perimeterM: number;
  heightM?: number;
  finishQuality: FinishQuality;
  toggles: Partial<RoomAssemblyToggles>;
  boqItems: BOQLineItem[];
  color: string;
}

// ─── Shell Config ─────────────────────────────────────────────────────────────

export interface ShellConfig {
  numFloors: number;
  floorHeightM: number;
  soilType: 'soft' | 'medium' | 'hard';
  structureType: 'rcc_brick' | 'aac';
}

// ─── Merged BOQ ───────────────────────────────────────────────────────────────

export interface MergedBOQResult {
  shellItems: BOQLineItem[];
  roomItems: BOQLineItem[];
  allItems: BOQLineItem[];
  shellTotal: number;
  roomTotal: number;
  grandTotal: number;
  buaM2: number;
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface TurnkeyState {
  // Stage progression
  currentStage: 1 | 2 | 3 | 4;

  // Stage 1 — Calibration
  imageUrl: string | null;
  pixelToMeterScale: number;
  calibrationUnit: CalibrationUnit;
  calibrationDone: boolean;

  // Stage 2 — Building Shell
  footprintPoints: Point[];
  footprintAreaM2: number;
  footprintPerimeterM: number;
  boundingLengthM: number;
  boundingWidthM: number;
  shellConfig: ShellConfig;
  shellBOQ: BOQResult | null;
  shellDone: boolean;

  // Stage 3 — Room Assembly
  rooms: TurnkeyRoom[];
  roomsDone: boolean;

  // Stage 4 — Final
  finalBOQ: MergedBOQResult | null;

  // Persistence
  sessionId: number | null;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Actions: navigation
  setStage: (s: 1 | 2 | 3 | 4) => void;
  goNext: () => void;
  goBack: () => void;

  // Actions: Stage 1
  setCalibration: (scale: number, unit: CalibrationUnit, url: string) => void;
  setImageUrl: (url: string) => void;

  // Actions: Stage 2
  setFootprint: (points: Point[], areaM2: number, perimeterM: number, lengthM: number, widthM: number) => void;
  setShellConfig: (cfg: Partial<ShellConfig>) => void;
  setShellBOQ: (boq: BOQResult) => void;
  setShellDone: (done: boolean) => void;

  // Actions: Stage 3
  addRoom: (room: TurnkeyRoom) => void;
  updateRoom: (id: string, updates: Partial<TurnkeyRoom>) => void;
  deleteRoom: (id: string) => void;
  setRoomsDone: (done: boolean) => void;

  // Actions: Stage 4
  setFinalBOQ: (boq: MergedBOQResult) => void;

  // Persistence
  setSessionId: (id: number | null) => void;
  setSyncStatus: (s: 'idle' | 'saving' | 'saved' | 'error') => void;

  // Reset
  reset: () => void;
}

// ─── Room color palette (cycles through) ─────────────────────────────────────

const ROOM_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
];

const INITIAL_SHELL_CONFIG: ShellConfig = {
  numFloors: 2,
  floorHeightM: 3.0,
  soilType: 'medium',
  structureType: 'rcc_brick',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTurnkeyStore = create<TurnkeyState>()(
  persist(
    (set, get) => ({
      currentStage: 1,

      imageUrl: null,
      pixelToMeterScale: 1,
      calibrationUnit: 'm',
      calibrationDone: false,

      footprintPoints: [],
      footprintAreaM2: 0,
      footprintPerimeterM: 0,
      boundingLengthM: 0,
      boundingWidthM: 0,
      shellConfig: INITIAL_SHELL_CONFIG,
      shellBOQ: null,
      shellDone: false,

      rooms: [],
      roomsDone: false,

      finalBOQ: null,

      sessionId: null,
      syncStatus: 'idle',

      // ── Navigation ────────────────────────────────────────────────────────
      setStage: (s) => set({ currentStage: s }),

      goNext: () => set((state) => ({
        currentStage: Math.min(4, state.currentStage + 1) as 1 | 2 | 3 | 4,
      })),

      goBack: () => set((state) => ({
        currentStage: Math.max(1, state.currentStage - 1) as 1 | 2 | 3 | 4,
      })),

      // ── Stage 1 ───────────────────────────────────────────────────────────
      setCalibration: (scale, unit, url) => set({
        pixelToMeterScale: scale,
        calibrationUnit: unit,
        imageUrl: url,
        calibrationDone: true,
      }),

      setImageUrl: (url) => set({ imageUrl: url }),

      // ── Stage 2 ───────────────────────────────────────────────────────────
      setFootprint: (points, areaM2, perimeterM, lengthM, widthM) => set({
        footprintPoints: points,
        footprintAreaM2: areaM2,
        footprintPerimeterM: perimeterM,
        boundingLengthM: lengthM,
        boundingWidthM: widthM,
      }),

      setShellConfig: (cfg) => set((state) => ({
        shellConfig: { ...state.shellConfig, ...cfg },
      })),

      setShellBOQ: (boq) => set({ shellBOQ: boq }),
      setShellDone: (done) => set({ shellDone: done }),

      // ── Stage 3 ───────────────────────────────────────────────────────────
      addRoom: (room) => set((state) => {
        const colorIndex = state.rooms.length % ROOM_COLORS.length;
        return {
          rooms: [...state.rooms, { ...room, color: room.color || ROOM_COLORS[colorIndex] }],
        };
      }),

      updateRoom: (id, updates) => set((state) => ({
        rooms: state.rooms.map((r) => r.id === id ? { ...r, ...updates } : r),
      })),

      deleteRoom: (id) => set((state) => ({
        rooms: state.rooms.filter((r) => r.id !== id),
      })),

      setRoomsDone: (done) => set({ roomsDone: done }),

      // ── Stage 4 ───────────────────────────────────────────────────────────
      setFinalBOQ: (boq) => set({ finalBOQ: boq }),

      // ── Persistence ───────────────────────────────────────────────────────
      setSessionId: (id) => set({ sessionId: id }),
      setSyncStatus: (s) => set({ syncStatus: s }),

      // ── Reset ─────────────────────────────────────────────────────────────
      reset: () => set({
        currentStage: 1,
        imageUrl: null,
        pixelToMeterScale: 1,
        calibrationUnit: 'm',
        calibrationDone: false,
        footprintPoints: [],
        footprintAreaM2: 0,
        footprintPerimeterM: 0,
        boundingLengthM: 0,
        boundingWidthM: 0,
        shellConfig: INITIAL_SHELL_CONFIG,
        shellBOQ: null,
        shellDone: false,
        rooms: [],
        roomsDone: false,
        finalBOQ: null,
        sessionId: null,
        syncStatus: 'idle',
      }),
    }),
    {
      name: 'turnkey-studio-session',
      storage: createJSONStorage(() => sessionStorage), // session-scoped, clears on tab close
      partialize: (state) => ({
        currentStage: state.currentStage,
        imageUrl: state.imageUrl,
        pixelToMeterScale: state.pixelToMeterScale,
        calibrationUnit: state.calibrationUnit,
        calibrationDone: state.calibrationDone,
        footprintPoints: state.footprintPoints,
        footprintAreaM2: state.footprintAreaM2,
        footprintPerimeterM: state.footprintPerimeterM,
        boundingLengthM: state.boundingLengthM,
        boundingWidthM: state.boundingWidthM,
        shellConfig: state.shellConfig,
        rooms: state.rooms,
        sessionId: state.sessionId,
      }),
    }
  )
);
