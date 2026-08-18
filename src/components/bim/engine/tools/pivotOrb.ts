import * as THREE from "three";
import { state } from "../core/state";
import { wakeRenderer } from "../core/viewer";

let pivotOrbMesh: THREE.Mesh | null = null;
let orbFadeTimer: any = null;

export function updatePivotOrb() {
  if (!state.world?.camera?.controls) return;

  const target = state.world.camera.controls.target;
  if (!target) return;

  if (!pivotOrbMesh && state.world?.scene?.three) {
    const geo = new THREE.SphereGeometry(0.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    pivotOrbMesh = new THREE.Mesh(geo, mat);
    pivotOrbMesh.renderOrder = 9999;
    state.world.scene.three.add(pivotOrbMesh);
  }

  if (pivotOrbMesh) {
    pivotOrbMesh.position.copy(target);
    pivotOrbMesh.visible = true;
    wakeRenderer();
  }
}

export function resetOrbFadeTimer() {
  if (orbFadeTimer) clearTimeout(orbFadeTimer);
  orbFadeTimer = setTimeout(() => {
    if (pivotOrbMesh) pivotOrbMesh.visible = false;
    wakeRenderer();
  }, 1200);
}

export function removePivotOrb() {
  if (pivotOrbMesh && state.world?.scene?.three) {
    state.world.scene.three.remove(pivotOrbMesh);
    if (pivotOrbMesh.geometry) pivotOrbMesh.geometry.dispose();
    if (pivotOrbMesh.material) (pivotOrbMesh.material as THREE.Material).dispose();
    pivotOrbMesh = null;
  }
}

export function initPivotOrbDetector() {
  // Listener ready
}
