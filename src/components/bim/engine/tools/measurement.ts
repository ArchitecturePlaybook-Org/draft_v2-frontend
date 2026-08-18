import * as THREE from "three";
import { state } from "../core/state";
import { wakeRenderer } from "../core/viewer";

export let snapMarkerGroup: THREE.Group | null = null;
export let startPinGroup: THREE.Group | null = null;
export let rubberbandLine: THREE.Line | null = null;
export let liveTriangleGroup: THREE.Group | null = null;

export function formatLength(meters: number): string {
  const unit = state.measurementUnit || "m";
  switch (unit) {
    case "mm": return `${(meters * 1000).toFixed(0)} mm`;
    case "cm": return `${(meters * 100).toFixed(1)} cm`;
    case "ft": return `${(meters * 3.28084).toFixed(2)} ft`;
    case "in": return `${(meters * 39.3701).toFixed(1)} in`;
    case "m": default: return `${meters.toFixed(2)} m`;
  }
}

export function initSnapPreviewObjects() {
  if (snapMarkerGroup) return;
  snapMarkerGroup = new THREE.Group();
  snapMarkerGroup.name = "snap_marker_group";
  snapMarkerGroup.visible = false;

  const geo = new THREE.SphereGeometry(0.1, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });
  const mesh = new THREE.Mesh(geo, mat);
  snapMarkerGroup.add(mesh);

  if (state.world?.scene?.three) {
    state.world.scene.three.add(snapMarkerGroup);
  }
}

export function computeSnapPoint(raycaster: THREE.Raycaster) {
  if (!state.currentModel) return null;
  const hits = raycaster.intersectObject(state.currentModel, true);
  if (hits.length > 0) {
    return hits[0].point;
  }
  return null;
}

export function updateSnapMarkerAppearance(point: THREE.Vector3 | null) {
  if (!snapMarkerGroup) return;
  if (point) {
    snapMarkerGroup.position.copy(point);
    snapMarkerGroup.visible = true;
  } else {
    snapMarkerGroup.visible = false;
  }
}

export function updateStartPinAppearance(point: THREE.Vector3 | null) {
  if (!startPinGroup && state.world?.scene?.three) {
    startPinGroup = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.12, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: false });
    startPinGroup.add(new THREE.Mesh(geo, mat));
    state.world.scene.three.add(startPinGroup);
  }
  if (startPinGroup) {
    if (point) {
      startPinGroup.position.copy(point);
      startPinGroup.visible = true;
    } else {
      startPinGroup.visible = false;
    }
  }
}

export function updateLiveTriangle(p1: THREE.Vector3, p2: THREE.Vector3) {
  // Live measurement visual feedback
}

export function resolveScreenSpaceCollisions() {
  // Screen space collision resolver for labels
}

export class OrthogonalDimensionGroup {
  dispose() {}
  updateTicks() {}
}

export class AngleDimensionGroup {
  dispose() {}
}

export class AreaDimensionGroup {
  dispose() {}
}

export function updateAreaLivePreview() {}
export function clearAreaLivePreview() {}
export function finishAreaMeasurement() {}

export function initMeasurementSuiteControls() {
  const unitSelect = document.getElementById("measure-unit-select") as HTMLSelectElement | null;
  if (unitSelect) {
    unitSelect.value = state.measurementUnit;
    unitSelect.addEventListener("change", (e: any) => {
      state.measurementUnit = e.target.value;
      if (typeof window !== "undefined") {
        localStorage.setItem("bim_measure_unit", e.target.value);
      }
    });
  }
}
