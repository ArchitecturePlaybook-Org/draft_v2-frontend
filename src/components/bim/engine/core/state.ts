import * as THREE from "three";

// ── Shared Application State ─────────────────────────────────────
export const state: any = {
  // Three.js / ThatOpen Core
  components: null,
  world: null,
  ifcLoader: null,
  fragmentsManager: null,
  hider: null,
  classifier: null,
  relationsIndexer: null,
  highlighter: null,
  outliner: null,
  clipper: null,
  measurement: null,
  labelRenderer: null,
  culler: null,
  sunLight: null,
  groundShadowPlane: null,
  materialCache: new Map(),

  // Model & Selection
  currentModel: null,
  lastSelection: null,
  currentElementProperties: null,

  // Active Tool & Mode State
  activeTool: "select", // "select" | "measure" | "clip"
  activeMeasureMode: "distance", // "distance" | "angle" | "area"
  snapFilters: {
    vertex: true,
    midpoint: true,
    edge: true,
    surface: true,
  },

  // Visibility & Display Modes
  isolationActive: false,
  materialOriginals: new Map(),
  hiddenExpressIDs: new Set(),

  // Active Section Plane & Live Slicing
  activeClipPlane: null,
  activeSectionPlane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 100000),
  isSectionActive: false,
  activeSectionAxis: "y",

  // Measurement State
  measurementUnit: (typeof window !== "undefined" && localStorage.getItem("bim_measure_unit")) || "m",
  measureStartPoint: null,
  currentSnapPoint: null,
  currentSnapType: null,
  measurePointsList: [],
  orthogonalDimensions: [],

  // Mobile Bottom Sheet
  bottomSheetState: "closed", // "closed" | "peek" | "half" | "full"

  // 5D Cost Estimation & Currency
  selectedCurrency: "INR",
  currencySymbols: { USD: "$", EUR: "€", GBP: "£", INR: "₹" },
  currencyRates: { USD: 1.0, EUR: 0.92, GBP: 0.79, INR: 83.5 },
  projectTotalCost: 0,
  cumulativeSpend: 0,
};

// ── Shared Helper Utilities ──────────────────────────────────────
export function getModelCenter(): THREE.Vector3 {
  if (!state.currentModel) return new THREE.Vector3(0, 0, 0);
  const box = new THREE.Box3().setFromObject(state.currentModel);
  return box.getCenter(new THREE.Vector3());
}

export function getModelSize(): number {
  if (!state.currentModel) return 50;
  const box = new THREE.Box3().setFromObject(state.currentModel);
  const size = box.getSize(new THREE.Vector3());
  return Math.max(size.x, size.y, size.z);
}

export function escapeHtml(str: any): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
