import * as THREE from "three";
import { state, getModelCenter, getModelSize } from "../core/state";
import { showToast } from "../ui/notifications";
import { updateShadows, wakeRenderer } from "../core/viewer";

let sectionGizmoGroup: THREE.Group | null = null;
let probeHandleGroup: THREE.Group | null = null;
let probeRingMesh: THREE.Mesh | null = null;
let probeCoreMesh: THREE.Mesh | null = null;
let probeArrowPlus: THREE.Mesh | null = null;
let probeArrowMinus: THREE.Mesh | null = null;

let isDraggingProbe = false;
const dragStartPoint = new THREE.Vector3();
const dragStartPlane = new THREE.Plane();
const dragVirtualPlane = new THREE.Plane();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initSectionGizmo() {
  if (!state.world?.scene?.three) return;
  if (sectionGizmoGroup) return;

  sectionGizmoGroup = new THREE.Group();
  sectionGizmoGroup.name = "BIM_Section_Gizmo";
  sectionGizmoGroup.visible = false;
  sectionGizmoGroup.renderOrder = 999;

  const modelSize = getModelSize();
  const handleRadius = Math.min(Math.max(modelSize * 0.035, 0.75), 2.2);

  probeHandleGroup = new THREE.Group();
  probeHandleGroup.name = "probe_handle_group";

  const coreGeo = new THREE.SphereGeometry(handleRadius * 0.45, 24, 24);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x6366f1,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    clippingPlanes: [],
  });
  probeCoreMesh = new THREE.Mesh(coreGeo, coreMat);
  probeHandleGroup.add(probeCoreMesh);

  const ringGeo = new THREE.TorusGeometry(handleRadius, handleRadius * 0.09, 16, 36);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    depthTest: false,
    clippingPlanes: [],
  });
  probeRingMesh = new THREE.Mesh(ringGeo, ringMat);
  probeHandleGroup.add(probeRingMesh);

  const coneGeo = new THREE.ConeGeometry(handleRadius * 0.28, handleRadius * 0.65, 16);
  const arrowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    depthTest: false,
    clippingPlanes: [],
  });

  const conePlus = new THREE.Mesh(coneGeo, arrowMat);
  conePlus.position.z = handleRadius * 0.75;
  conePlus.rotateX(Math.PI / 2);
  probeHandleGroup.add(conePlus);

  const coneMinus = new THREE.Mesh(coneGeo, arrowMat);
  coneMinus.position.z = -handleRadius * 0.75;
  coneMinus.rotateX(-Math.PI / 2);
  probeHandleGroup.add(coneMinus);

  probeArrowPlus = conePlus;
  probeArrowMinus = coneMinus;

  sectionGizmoGroup.add(probeHandleGroup);
  state.world.scene.three.add(sectionGizmoGroup);
}

export function updateSectionGizmo(visible: boolean | null = null) {
  if (!sectionGizmoGroup && state.world?.scene?.three) {
    initSectionGizmo();
  }
  if (!sectionGizmoGroup) return;

  const shouldShow = visible !== null ? visible : (state.isSectionActive && state.activeTool === "clip" && state.currentModel !== null);
  sectionGizmoGroup.visible = Boolean(shouldShow);

  if (!sectionGizmoGroup.visible || !state.currentModel) return;

  const center = getModelCenter();
  const targetPos = state.activeSectionPlane.projectPoint(center, new THREE.Vector3());
  sectionGizmoGroup.position.copy(targetPos);

  const normal = state.activeSectionPlane.normal.clone().normalize();
  sectionGizmoGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  wakeRenderer();
}

function setProbeHoverState(isHovered: boolean) {
  if (!probeRingMesh || !probeCoreMesh) return;
  if (isHovered) {
    (probeRingMesh.material as THREE.MeshBasicMaterial).color.setHex(0x67e8f9);
    (probeCoreMesh.material as THREE.MeshBasicMaterial).color.setHex(0x818cf8);
    if (probeArrowPlus) (probeArrowPlus.material as THREE.MeshBasicMaterial).color.setHex(0x67e8f9);
    if (probeArrowMinus) (probeArrowMinus.material as THREE.MeshBasicMaterial).color.setHex(0x67e8f9);
  } else {
    (probeRingMesh.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
    (probeCoreMesh.material as THREE.MeshBasicMaterial).color.setHex(0x6366f1);
    if (probeArrowPlus) (probeArrowPlus.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
    if (probeArrowMinus) (probeArrowMinus.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
  }
  wakeRenderer();
}

export function removeSectionGizmo() {
  if (sectionGizmoGroup && state.world?.scene?.three) {
    state.world.scene.three.remove(sectionGizmoGroup);
    sectionGizmoGroup.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => m.dispose());
      }
    });
    sectionGizmoGroup = null;
    probeHandleGroup = null;
    probeRingMesh = null;
    probeCoreMesh = null;
    probeArrowPlus = null;
    probeArrowMinus = null;
  }
}

export function applySectionPlane() {
  if (!state.world?.renderer?.three) return;
  const r = state.world.renderer.three;
  r.localClippingEnabled = true;

  if (state.isSectionActive) {
    r.clippingPlanes = [state.activeSectionPlane];

    if (state.currentModel) {
      state.currentModel.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            if (!m.clippingPlanes || m.clippingPlanes.length === 0 || m.clippingPlanes[0] !== state.activeSectionPlane) {
              m.clippingPlanes = [state.activeSectionPlane];
              m.clipShadows = true;
              m.needsUpdate = true;
            }
          });
        }
      });
    }

    state.materialCache.forEach((mat: any) => {
      if (!mat.clippingPlanes || mat.clippingPlanes.length === 0 || mat.clippingPlanes[0] !== state.activeSectionPlane) {
        mat.clippingPlanes = [state.activeSectionPlane];
        mat.clipShadows = true;
        mat.needsUpdate = true;
      }
    });
  } else {
    state.activeSectionPlane.set(new THREE.Vector3(0, -1, 0), 100000);
    r.clippingPlanes = [];
    if (state.currentModel) {
      state.currentModel.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            if (m.clippingPlanes && m.clippingPlanes.length > 0) {
              m.clippingPlanes = [];
              m.needsUpdate = true;
            }
          });
        }
      });
    }
    state.materialCache.forEach((mat: any) => {
      mat.clippingPlanes = [];
      mat.needsUpdate = true;
    });
  }

  updateShadows();
  updateSectionGizmo();
  wakeRenderer();
}

export function setActiveClipPlane(active: boolean | null) {
  state.isSectionActive = Boolean(active);
  const card = document.getElementById("section-control-card");
  const toolDeleteClips = document.getElementById("tool-delete-clips");

  if (!state.isSectionActive) {
    if (card) card.style.display = "none";
    if (toolDeleteClips) toolDeleteClips.style.display = "none";
    applySectionPlane();
    updateSectionGizmo(false);
    return;
  }

  if (card) card.style.display = "flex";
  if (toolDeleteClips) toolDeleteClips.style.display = "flex";

  const secOffsetSlider = document.getElementById("sec-offset-slider") as HTMLInputElement | null;

  if (state.currentModel && secOffsetSlider) {
    const size = getModelSize();
    const halfSpan = Math.max(size * 0.8, 25);
    secOffsetSlider.min = (-halfSpan).toFixed(1);
    secOffsetSlider.max = halfSpan.toFixed(1);
  }

  applySectionPlane();
  updateSectionGizmo(true);
}

export function createInstantSection(axis = "y") {
  if (!state.currentModel) return;

  state.activeSectionAxis = axis;
  state.isSectionActive = true;

  const center = getModelCenter();
  let norm = new THREE.Vector3(0, -1, 0);

  if (axis === "z") {
    norm = new THREE.Vector3(0, 0, -1);
  } else if (axis === "x") {
    norm = new THREE.Vector3(-1, 0, 0);
  }

  state.activeSectionPlane.setFromNormalAndCoplanarPoint(norm, center);
  setActiveClipPlane(true);

  const secOffsetSlider = document.getElementById("sec-offset-slider") as HTMLInputElement | null;
  const secOffsetVal = document.getElementById("sec-offset-val");
  if (secOffsetSlider) secOffsetSlider.value = "0.0";
  if (secOffsetVal) secOffsetVal.textContent = "0.0m";

  const btnY = document.getElementById("btn-sec-preset-y");
  const btnZ = document.getElementById("btn-sec-preset-z");
  const btnX = document.getElementById("btn-sec-preset-x");
  [btnY, btnZ, btnX].forEach((b) => b?.classList.remove("active"));

  if (axis === "y" && btnY) btnY.classList.add("active");
  if (axis === "z" && btnZ) btnZ.classList.add("active");
  if (axis === "x" && btnX) btnX.classList.add("active");

  const label = axis === "y" ? "Floor Plan (Y)" : axis === "z" ? "Front (Z)" : "Side (X)";
  showToast(`Section: ${label}`);
}

export function setSectionAxis(axis: any) {
  createInstantSection(axis);
}

export function toggleSectionClipping(enabled?: boolean) {
  setActiveClipPlane(enabled ?? !state.isSectionActive);
}

export function populateSectionStoreys() {
  const select = document.getElementById("sec-storey-select");
  if (!select || !state.currentModel) return;

  select.innerHTML = '<option value="">Snap to Level…</option>';

  try {
    const spatial = state.classifier?.list?.spatialStructures;
    if (spatial) {
      Object.keys(spatial).forEach((key) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key.replace(/_/g, " ");
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.warn("Could not load storeys for section dropdown", e);
  }
}

export function sliceAtStorey(storeyKey: string) {
  if (!storeyKey || !state.currentModel) return;

  try {
    const spatial = state.classifier?.list?.spatialStructures;
    if (!spatial || !spatial[storeyKey]) return;

    const box = new THREE.Box3();
    state.currentModel.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        box.expandByObject(child);
      }
    });

    const modelCenter = getModelCenter();
    const storeyY = box.isEmpty() ? modelCenter.y : (box.min.y + (box.max.y - box.min.y) * 0.5);

    const cutElevation = storeyY + 1.2;
    state.activeSectionAxis = "y";
    state.isSectionActive = true;
    const norm = new THREE.Vector3(0, -1, 0);
    const point = new THREE.Vector3(modelCenter.x, cutElevation, modelCenter.z);
    state.activeSectionPlane.setFromNormalAndCoplanarPoint(norm, point);

    setActiveClipPlane(true);

    const btnY = document.getElementById("btn-sec-preset-y");
    const btnZ = document.getElementById("btn-sec-preset-z");
    const btnX = document.getElementById("btn-sec-preset-x");
    [btnY, btnZ, btnX].forEach((b) => b?.classList.remove("active"));
    if (btnY) btnY.classList.add("active");

    const offsetVal = cutElevation - modelCenter.y;
    const secOffsetSlider = document.getElementById("sec-offset-slider") as HTMLInputElement | null;
    const secOffsetVal = document.getElementById("sec-offset-val");
    if (secOffsetSlider) secOffsetSlider.value = offsetVal.toFixed(1);
    if (secOffsetVal) secOffsetVal.textContent = `${offsetVal >= 0 ? "+" : ""}${offsetVal.toFixed(1)}m`;

    showToast(`Snapped to ${storeyKey.replace(/_/g, " ")}`);
  } catch (err) {
    console.warn("Error slicing at storey:", err);
  }
}

export function initSectionPlaneControls() {
  const btnSecCloseCard = document.getElementById("btn-sec-close-card");
  const btnSecFlip = document.getElementById("btn-sec-flip");
  const btnSecDeleteActive = document.getElementById("btn-sec-delete-active");
  const secOffsetSlider = document.getElementById("sec-offset-slider") as HTMLInputElement | null;
  const secOffsetVal = document.getElementById("sec-offset-val");
  const btnPresetY = document.getElementById("btn-sec-preset-y");
  const btnPresetZ = document.getElementById("btn-sec-preset-z");
  const btnPresetX = document.getElementById("btn-sec-preset-x");
  const secStoreySelect = document.getElementById("sec-storey-select") as HTMLSelectElement | null;
  const toolDeleteClips = document.getElementById("tool-delete-clips");
  const card = document.getElementById("section-control-card");
  const viewerContainer = document.getElementById("viewer-container");

  if (card) {
    ["click", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend"].forEach((ev) => {
      card.addEventListener(ev, (e) => e.stopPropagation());
    });
  }

  if (btnSecCloseCard) {
    btnSecCloseCard.addEventListener("click", (e) => {
      e.stopPropagation();
      if (card) card.style.display = "none";
    });
  }

  if (btnPresetY) {
    btnPresetY.addEventListener("click", (e) => {
      e.stopPropagation();
      createInstantSection("y");
    });
  }
  if (btnPresetZ) {
    btnPresetZ.addEventListener("click", (e) => {
      e.stopPropagation();
      createInstantSection("z");
    });
  }
  if (btnPresetX) {
    btnPresetX.addEventListener("click", (e) => {
      e.stopPropagation();
      createInstantSection("x");
    });
  }

  if (secStoreySelect) {
    secStoreySelect.addEventListener("change", (e: any) => {
      if (e.target.value) {
        sliceAtStorey(e.target.value);
      }
    });
  }

  if (btnSecFlip) {
    btnSecFlip.addEventListener("click", () => {
      if (!state.isSectionActive) return;
      state.activeSectionPlane.normal.negate();
      state.activeSectionPlane.constant = -state.activeSectionPlane.constant;
      applySectionPlane();
      updateSectionGizmo(true);
      showToast("Section cut direction flipped");
    });
  }

  if (secOffsetSlider) {
    secOffsetSlider.addEventListener("input", (e: any) => {
      if (!state.isSectionActive || !state.currentModel) return;
      const offsetVal = parseFloat(e.target.value);
      const center = getModelCenter();
      const targetPoint = center.clone().addScaledVector(state.activeSectionPlane.normal, -offsetVal);
      state.activeSectionPlane.setFromNormalAndCoplanarPoint(state.activeSectionPlane.normal, targetPoint);

      if (secOffsetVal) secOffsetVal.textContent = `${offsetVal >= 0 ? "+" : ""}${offsetVal.toFixed(1)}m`;
      applySectionPlane();
      updateSectionGizmo(true);
    });
  }

  if (btnSecDeleteActive) {
    btnSecDeleteActive.addEventListener("click", () => {
      setActiveClipPlane(false);
      showToast("Section cut cleared");
    });
  }

  if (toolDeleteClips) {
    toolDeleteClips.addEventListener("click", () => {
      setActiveClipPlane(false);
      showToast("Section cut cleared");
    });
  }

  if (viewerContainer) {
    viewerContainer.addEventListener("pointerdown", (e: any) => {
      if (!state.isSectionActive || state.activeTool !== "clip" || !state.currentModel || !sectionGizmoGroup?.visible) return;
      if (!probeHandleGroup) return;
      if (e.target.closest("#section-control-card") || e.target.closest(".toolbar") || e.target.closest(".sidebar")) return;

      const rect = viewerContainer.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, state.world.camera.three);
      const hits = raycaster.intersectObjects([probeHandleGroup], true);

      if (hits.length > 0) {
        isDraggingProbe = true;
        if (state.world.camera?.controls) {
          state.world.camera.controls.enabled = false;
        }

        const cameraDir = new THREE.Vector3();
        state.world.camera.three.getWorldDirection(cameraDir);
        dragVirtualPlane.setFromNormalAndCoplanarPoint(cameraDir.negate(), hits[0].point);

        const intersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragVirtualPlane, intersect)) {
          dragStartPoint.copy(intersect);
        } else {
          dragStartPoint.copy(hits[0].point);
        }
        dragStartPlane.copy(state.activeSectionPlane);

        viewerContainer.style.cursor = "grabbing";
        setProbeHoverState(true);
        e.stopPropagation();
      }
    });

    window.addEventListener("pointermove", (e: any) => {
      if (!sectionGizmoGroup?.visible || state.activeTool !== "clip") return;

      const rect = viewerContainer.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, state.world.camera.three);

      if (isDraggingProbe) {
        const currentPt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragVirtualPlane, currentPt)) {
          const delta = currentPt.clone().sub(dragStartPoint);
          const distAlongNormal = delta.dot(dragStartPlane.normal);

          state.activeSectionPlane.constant = dragStartPlane.constant - distAlongNormal;

          const center = getModelCenter();
          const currentOffset = state.activeSectionPlane.constant + state.activeSectionPlane.normal.dot(center);

          if (secOffsetSlider) {
            secOffsetSlider.value = currentOffset.toFixed(1);
          }
          if (secOffsetVal) {
            secOffsetVal.textContent = `${currentOffset >= 0 ? "+" : ""}${currentOffset.toFixed(1)}m`;
          }

          applySectionPlane();
          updateSectionGizmo(true);
        }
        return;
      }

      if (probeHandleGroup) {
        const hits = raycaster.intersectObjects([probeHandleGroup], true);
        if (hits.length > 0) {
          viewerContainer.style.cursor = "grab";
          setProbeHoverState(true);
        } else {
          setProbeHoverState(false);
          if (viewerContainer.style.cursor === "grab") {
            viewerContainer.style.cursor = "default";
          }
        }
      }
    });

    window.addEventListener("pointerup", () => {
      if (isDraggingProbe) {
        isDraggingProbe = false;
        if (state.world.camera?.controls) {
          state.world.camera.controls.enabled = true;
        }
        viewerContainer.style.cursor = "default";
        setProbeHoverState(false);
      }
    });
  }
}
