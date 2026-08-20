import * as THREE from "three";
import { state, getModelCenter, getModelSize } from "../core/state";
import { showToast, setHint } from "./notifications";
import { initBottomSheetController, setBottomSheetState } from "./bottomSheet";
import { initSectionPlaneControls, setActiveClipPlane, createInstantSection, populateSectionStoreys, updateSectionGizmo } from "../tools/section";
import {
  initMeasurementSuiteControls,
  initSnapPreviewObjects,
  computeSnapPoint,
  updateSnapMarkerAppearance,
  updateStartPinAppearance,
  updateLiveTriangle,
  resolveScreenSpaceCollisions,
  formatLength,
  OrthogonalDimensionGroup,
  AngleDimensionGroup,
  AreaDimensionGroup,
  updateAreaLivePreview,
  clearAreaLivePreview,
  finishAreaMeasurement,
  snapMarkerGroup,
  startPinGroup,
  rubberbandLine,
  liveTriangleGroup,
} from "../tools/measurement";
import { applyVisibilityChange, isolateVisibility, showAllVisibility } from "../explorer/visibility";
import { clearProperties } from "../inspector/properties";
import { fitCameraToModel, load3DModel } from "../core/viewer";
import { initSavedViewsControls, openSaveViewModal } from "../tools/savedViews";
import { initCostDashboardControls } from "../tools/costEstimation";
import { initPivotOrbDetector } from "../tools/pivotOrb";

// ── Tool Mode Switching ──────────────────────────────────────────

export function setTool(toolName: string) {
  const viewerContainer = document.getElementById("viewer-container");
  const toolSelect = document.getElementById("tool-select");
  const toolMeasure = document.getElementById("tool-measure");
  const toolClip = document.getElementById("tool-clip");
  const measureCard = document.getElementById("measure-control-card");
  const secCard = document.getElementById("section-control-card");
  const centerHud = document.getElementById("center-measure-hud");
  const mobileMeasurePill = document.getElementById("mobile-measure-action-pill");
  const labelSetPoint = document.getElementById("label-mobile-set-point");
  const btnSetPoint = document.getElementById("btn-mobile-set-point");

  if (state.activeTool === "measure" && toolName !== "measure") {
    state.measureStartPoint = null;
    state.currentSnapPoint = null;
    if (snapMarkerGroup) snapMarkerGroup.visible = false;
    if (startPinGroup) startPinGroup.visible = false;
    if (rubberbandLine) rubberbandLine.visible = false;
    if (liveTriangleGroup) liveTriangleGroup.visible = false;
  }

  state.activeTool = toolName;
  if (viewerContainer) viewerContainer.style.cursor = "default";
  setHint(null);

  [toolSelect, toolMeasure, toolClip].forEach((btn) => btn?.classList.remove("active"));

  if (state.highlighter) {
    state.highlighter.enabled = toolName === "select";
    state.highlighter.hoverEnabled = toolName === "select";
  }
  if (state.measurement) state.measurement.enabled = toolName === "measure";
  if (state.clipper) state.clipper.enabled = toolName === "clip";

  if (measureCard) {
    measureCard.style.display = (toolName === "measure" && window.innerWidth > 768) ? "flex" : "none";
  }

  if (centerHud) {
    centerHud.style.display = (toolName === "measure" && window.innerWidth <= 768) ? "flex" : "none";
  }

  if (mobileMeasurePill) {
    mobileMeasurePill.style.display = (toolName === "measure" && window.innerWidth <= 768) ? "flex" : "none";
    if (labelSetPoint) labelSetPoint.textContent = "Set Point 1";
    if (btnSetPoint) btnSetPoint.classList.remove("point2-active");
  }

  if (secCard) {
    secCard.style.display = toolName === "clip" ? "flex" : "none";
  }

  if (toolName === "select") {
    if (toolSelect) toolSelect.classList.add("active");
    if (viewerContainer) viewerContainer.style.cursor = "default";
    setActiveClipPlane(null);
    updateSectionGizmo(false);
  } else if (toolName === "measure") {
    if (toolMeasure) toolMeasure.classList.add("active");
    if (viewerContainer) viewerContainer.style.cursor = "crosshair";
    initSnapPreviewObjects();
    setActiveClipPlane(null);
    updateSectionGizmo(false);
  } else if (toolName === "clip") {
    if (toolClip) toolClip.classList.add("active");
    if (viewerContainer) viewerContainer.style.cursor = "cell";
    if (state.activeClipPlane) {
      updateSectionGizmo(true);
    } else {
      createInstantSection("y");
    }
  }
}

// ── Set View Presets ─────────────────────────────────────────────

export async function setCameraView(viewName: string) {
  if (!state.world?.camera?.controls || !state.currentModel) return;
  const center = getModelCenter();
  const dist = getModelSize() * 1.5;

  const viewBtns = ["btn-view-iso", "btn-view-top", "btn-view-front", "btn-view-right"];
  viewBtns.forEach((id) => document.getElementById(id)?.classList.remove("active-view"));

  switch (viewName) {
    case "iso":
      document.getElementById("btn-view-iso")?.classList.add("active-view");
      await state.world.camera.controls.setLookAt(
        center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist * 0.7,
        center.x, center.y, center.z, false
      );
      break;
    case "top":
      document.getElementById("btn-view-top")?.classList.add("active-view");
      await state.world.camera.controls.setLookAt(
        center.x, center.y + dist * 1.2, center.z + 0.001,
        center.x, center.y, center.z, false
      );
      break;
    case "front":
      document.getElementById("btn-view-front")?.classList.add("active-view");
      await state.world.camera.controls.setLookAt(
        center.x, center.y, center.z + dist * 1.2,
        center.x, center.y, center.z, false
      );
      break;
    case "right":
      document.getElementById("btn-view-right")?.classList.add("active-view");
      await state.world.camera.controls.setLookAt(
        center.x + dist * 1.2, center.y, center.z,
        center.x, center.y, center.z, false
      );
      break;
  }
}

// ── UI Listeners Initializer ──────────────────────────────────────

export function setupUIListeners() {
  const toolSelect = document.getElementById("tool-select");
  const toolMeasure = document.getElementById("tool-measure");
  const toolClip = document.getElementById("tool-clip");
  const toolIsolate = document.getElementById("tool-isolate");
  const toolHide = document.getElementById("tool-hide");
  const toolShowAll = document.getElementById("tool-show-all");

  if (toolSelect) toolSelect.onclick = () => setTool("select");
  if (toolMeasure) toolMeasure.onclick = () => setTool("measure");
  if (toolClip) toolClip.onclick = () => setTool("clip");

  if (toolIsolate) {
    toolIsolate.onclick = () => {
      if (state.lastSelection) {
        isolateVisibility(state.lastSelection);
      } else {
        showToast("⚠️ Select an element first to isolate");
      }
    };
  }

  if (toolHide) {
    toolHide.onclick = () => {
      if (state.lastSelection) {
        applyVisibilityChange(state.lastSelection, false, true);
        clearProperties();
        state.lastSelection = null;
      } else {
        showToast("⚠️ Select an element first to hide");
      }
    };
  }

  if (toolShowAll) {
    toolShowAll.onclick = () => showAllVisibility();
  }

  const btnIso = document.getElementById("btn-view-iso");
  const btnTop = document.getElementById("btn-view-top");
  const btnFront = document.getElementById("btn-view-front");
  const btnRight = document.getElementById("btn-view-right");
  const btnFit = document.getElementById("btn-fit");

  if (btnIso) btnIso.onclick = () => setCameraView("iso");
  if (btnTop) btnTop.onclick = () => setCameraView("top");
  if (btnFront) btnFront.onclick = () => setCameraView("front");
  if (btnRight) btnRight.onclick = () => setCameraView("right");
  if (btnFit) {
    btnFit.onclick = () => {
      if (state.currentModel) fitCameraToModel(state.currentModel);
    };
  }

  // Sidebar Tab Switcher
  const tabBtns = document.querySelectorAll(".sidebar-header.tree-tabs .tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const targetTabId = btn.getAttribute("data-tab");
      document.querySelectorAll(".sidebar-content .tab-content").forEach((tab) => {
        tab.classList.remove("active");
      });

      if (targetTabId) {
        const targetEl = document.getElementById(targetTabId);
        if (targetEl) targetEl.classList.add("active");
      }
    });
  });

  const btnCloseSidebar = document.getElementById("btn-close-sidebar");
  const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
  const rightSidebar = document.getElementById("right-sidebar") || document.getElementById("sidebar-right");

  if (btnCloseSidebar && rightSidebar) {
    btnCloseSidebar.onclick = () => {
      rightSidebar.classList.remove("visible");
      setBottomSheetState("closed");
    };
  }

  if (btnToggleSidebar && rightSidebar) {
    btnToggleSidebar.onclick = () => {
      const isVisible = rightSidebar.classList.contains("visible");
      if (isVisible) {
        rightSidebar.classList.remove("visible");
        setBottomSheetState("closed");
      } else {
        rightSidebar.classList.add("visible");
        setBottomSheetState("half");
      }
    };
  }

  const btnTreeClose = document.getElementById("btn-tree-close");
  const leftSidebar = document.getElementById("left-sidebar") || document.getElementById("sidebar-left");
  if (btnTreeClose && leftSidebar) {
    btnTreeClose.onclick = () => {
      leftSidebar.classList.remove("visible");
    };
  }

  const btnCloseInspector = document.getElementById("btn-close-inspector");
  const inspectorDrawer = document.getElementById("inspector-drawer");
  if (btnCloseInspector && inspectorDrawer) {
    btnCloseInspector.onclick = () => {
      inspectorDrawer.style.display = "none";
    };
  }

  initSectionPlaneControls();
  initMeasurementSuiteControls();
  initSavedViewsControls();
  initCostDashboardControls();
  initBottomSheetController();
  initPivotOrbDetector();

  const btnSample = document.getElementById("btn-load-sample") || document.getElementById("btn-sample");
  if (btnSample) {
    btnSample.onclick = async () => {
      showToast("⚡ Loading demo sample model...");
      setHint("Loading demo sample model...");
      try {
        const res = await fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb");
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          await load3DModel(buffer, "DemoModel.glb");
          const uploadPanel = document.getElementById("upload-panel");
          if (uploadPanel) uploadPanel.style.display = "none";
          const appUi = document.getElementById("app-ui");
          if (appUi) appUi.style.display = "block";
          showToast("✅ Demo sample model loaded!");
        } else {
          showToast("Please choose an IFC or 3D model file to view");
        }
      } catch (err) {
        showToast("Please choose an IFC or 3D model file to view");
      }
    };
  }

  const btnReset = document.getElementById("btn-reset");
  if (btnReset) {
    btnReset.onclick = () => {
      const uploadPanel = document.getElementById("upload-panel");
      if (uploadPanel) uploadPanel.style.display = "flex";
      const appUi = document.getElementById("app-ui");
      if (appUi) appUi.style.display = "none";
      showToast("Reset viewer for new file");
    };
  }

  // ── Raycasting & 3D Snapping Event Listeners for Measurement Engine ──
  const viewerContainer = document.getElementById("viewer-container");
  if (!viewerContainer) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let pointerDownPos = { x: 0, y: 0 };
  let isPointerMoved = false;

  viewerContainer.addEventListener("pointerdown", (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
    isPointerMoved = false;
  });

  viewerContainer.addEventListener("pointermove", (e) => {
    if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 6) {
      isPointerMoved = true;
    }

    const touchLoupe = document.getElementById("touch-reticle-loupe");
    const reticleBadge = document.getElementById("reticle-snap-badge");

    if (state.activeTool !== "measure" || !state.currentModel) {
      if (snapMarkerGroup) snapMarkerGroup.visible = false;
      if (touchLoupe) touchLoupe.style.display = "none";
      return;
    }

    const rect = viewerContainer.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, state.world.camera.three);
    const hits = raycaster.intersectObject(state.currentModel, true);

    if (hits.length > 0) {
      const snap = computeSnapPoint(hits[0]);
      state.currentSnapPoint = snap.point;
      state.currentSnapType = snap.type;

      if (!snapMarkerGroup) initSnapPreviewObjects();
      if (snapMarkerGroup) {
        snapMarkerGroup.position.copy(state.currentSnapPoint);
        updateSnapMarkerAppearance(state.currentSnapType);
        snapMarkerGroup.visible = true;
      }

      const snapLabel = state.currentSnapType === "vertex" ? "Corner ◆" : (state.currentSnapType === "midpoint" ? "Midpoint ▰" : (state.currentSnapType === "edge" ? "Edge ━" : "Surface ●"));

      if (touchLoupe && (e.pointerType === "touch" || window.innerWidth <= 768)) {
        touchLoupe.style.display = "flex";
        touchLoupe.style.left = `${e.clientX}px`;
        touchLoupe.style.top = `${e.clientY - 45}px`;
        if (reticleBadge) reticleBadge.textContent = snapLabel;
      }

      if (state.activeMeasureMode === "distance") {
        if (state.measureStartPoint && rubberbandLine) {
          updateStartPinAppearance();
          const positions = rubberbandLine.geometry.attributes.position as THREE.BufferAttribute;
          positions.setXYZ(0, state.measureStartPoint.x, state.measureStartPoint.y, state.measureStartPoint.z);
          positions.setXYZ(1, state.currentSnapPoint.x, state.currentSnapPoint.y, state.currentSnapPoint.z);
          positions.needsUpdate = true;
          rubberbandLine.computeLineDistances();
          rubberbandLine.visible = true;

          const triInfo = updateLiveTriangle(state.measureStartPoint, state.currentSnapPoint);
          const fD = formatLength(triInfo.D);
          if (triInfo.isDiagonal) {
            setHint(`📐 Diagonal — Direct: ${fD.fullStr} | ${triInfo.label1} | ${triInfo.label2} (${snapLabel}). Click to lock.`);
          } else {
            setHint(`📐 Axis-Aligned — Distance: ${fD.fullStr} (${snapLabel}). Click to lock.`);
          }
        } else {
          setHint(`📐 Distance — Snapped to ${snapLabel}. Click to lock Point 1.`);
        }
      } else if (state.activeMeasureMode === "angle") {
        if (state.measurePointsList.length === 1) {
          setHint(`📐 Angle — Point 1 (Arm A) set. Hover over vertex apex (${snapLabel}) and click.`);
        } else if (state.measurePointsList.length === 2) {
          const dirA = new THREE.Vector3().subVectors(state.measurePointsList[0], state.measurePointsList[1]).normalize();
          const dirB = new THREE.Vector3().subVectors(state.currentSnapPoint, state.measurePointsList[1]).normalize();
          const dot = THREE.MathUtils.clamp(dirA.dot(dirB), -1, 1);
          const angleDeg = (Math.acos(dot) * 180 / Math.PI).toFixed(1);
          setHint(`📐 Angle — Live: ∠ ${angleDeg}° (${snapLabel}). Click Point 3 to finish.`);
        } else {
          setHint(`📐 Angle — Snapped to ${snapLabel}. Click Point 1 (Arm A).`);
        }
      } else if (state.activeMeasureMode === "area") {
        if (state.measurePointsList.length >= 1) {
          updateAreaLivePreview(state.currentSnapPoint);
          const firstPt = state.measurePointsList[0];
          const isNearFirst = firstPt && state.currentSnapPoint.distanceTo(firstPt) < 0.5;
          if (isNearFirst && state.measurePointsList.length >= 3) {
            setHint(`🎯 Close Loop — Click Point 1 or Double-Click to FINISH Polygon Area.`);
          } else {
            setHint(`📐 Area — ${state.measurePointsList.length} points set (${snapLabel}). Click next point, or Double-Click to finish.`);
          }
        } else {
          setHint(`📐 Area — Snapped to ${snapLabel}. Click to start polygon.`);
        }
      }
    } else {
      state.currentSnapPoint = null;
      if (snapMarkerGroup) snapMarkerGroup.visible = false;
      if (touchLoupe) touchLoupe.style.display = "none";
      if (state.measureStartPoint && rubberbandLine) {
        rubberbandLine.visible = false;
        if (liveTriangleGroup) liveTriangleGroup.visible = false;
      }
    }
  });

  const toolDeleteMeasurements = document.getElementById("tool-delete-measurements");
  if (toolDeleteMeasurements) {
    toolDeleteMeasurements.addEventListener("click", () => {
      state.orthogonalDimensions.forEach((dim: any) => dim.dispose());
      state.orthogonalDimensions.length = 0;
      toolDeleteMeasurements.style.display = "none";
      showToast("All measurements cleared");
    });
  }

  viewerContainer.addEventListener("dblclick", (e) => {
    if (state.activeTool === "measure" && state.activeMeasureMode === "area") {
      e.preventDefault();
      e.stopPropagation();
      if (state.measurePointsList.length >= 3) {
        finishAreaMeasurement();
      } else {
        showToast("Need at least 3 points to form an area");
      }
    }
  });

  window.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement | null;
    const isTyping = target ? target.matches("input, textarea, select") : false;

    if (e.key === "Enter" && state.activeTool === "measure" && state.activeMeasureMode === "area") {
      if (state.measurePointsList.length >= 3) {
        finishAreaMeasurement();
      }
    } else if (e.key === "Escape" && state.activeTool === "measure") {
      state.measurePointsList.length = 0;
      state.measureStartPoint = null;
      clearAreaLivePreview();
      if (startPinGroup) startPinGroup.visible = false;
      if (rubberbandLine) rubberbandLine.visible = false;
      if (liveTriangleGroup) liveTriangleGroup.visible = false;
      showToast("Measurement cancelled");
    } else if ((e.key === "f" || e.key === "F") && !isTyping && !e.ctrlKey && !e.metaKey) {
      if (state.currentModel) {
        fitCameraToModel(state.currentModel);
        showToast("Zoom Extents (Fit)");
      }
    }
  });

  viewerContainer.addEventListener("click", (e) => {
    if (isPointerMoved) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("#section-control-card") || target?.closest("#measurement-control-card") || target?.closest(".radial-menu-container")) {
      return;
    }

    if (state.activeTool === "clip") {
      if (!state.currentModel) return;

      const rect = viewerContainer.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, state.world.camera.three);

      const hits = raycaster.intersectObject(state.currentModel, true);
      if (hits.length > 0 && hits[0].face) {
        const hit = hits[0];
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        const worldNormal = hit.face!.normal.clone().applyMatrix3(normalMatrix).normalize();

        state.activeSectionPlane.setFromNormalAndCoplanarPoint(worldNormal, hit.point);
        state.isSectionActive = true;
        setActiveClipPlane(true);
        showToast("Section aligned to surface");
      }
    } else if (state.activeTool === "measure") {
      if (!state.currentSnapPoint) return;

      if (state.activeMeasureMode === "distance") {
        if (!state.measureStartPoint) {
          state.measureStartPoint = state.currentSnapPoint.clone();
          if (!startPinGroup) initSnapPreviewObjects();
          if (startPinGroup) {
            startPinGroup.position.copy(state.measureStartPoint);
            updateStartPinAppearance();
            startPinGroup.visible = true;
          }
          showToast("Point 1 locked — now hover and click Point 2");
        } else {
          const measureEndPoint = state.currentSnapPoint.clone();
          const dimGroup = new OrthogonalDimensionGroup(state.measureStartPoint, measureEndPoint);
          state.orthogonalDimensions.push(dimGroup);
          resolveScreenSpaceCollisions();

          const dist = state.measureStartPoint.distanceTo(measureEndPoint);
          const fDist = formatLength(dist);
          showToast(`Distance: ${fDist.fullStr}`);

          state.measureStartPoint = null;
          if (startPinGroup) startPinGroup.visible = false;
          if (rubberbandLine) rubberbandLine.visible = false;
          if (liveTriangleGroup) liveTriangleGroup.visible = false;
          if (toolDeleteMeasurements) toolDeleteMeasurements.style.display = "flex";
          setHint("📐 Distance — Measurement created! Click to start another.");
        }
      } else if (state.activeMeasureMode === "angle") {
        if (state.measurePointsList.length === 0) {
          state.measurePointsList.push(state.currentSnapPoint.clone());
          showToast("Point 1 (Side A) locked — Click Point 2 (Vertex Apex)");
        } else if (state.measurePointsList.length === 1) {
          state.measurePointsList.push(state.currentSnapPoint.clone());
          showToast("Point 2 (Apex) locked — Click Point 3 (Side B)");
        } else if (state.measurePointsList.length === 2) {
          const pA = state.measurePointsList[0];
          const pApex = state.measurePointsList[1];
          const pB = state.currentSnapPoint.clone();

          const angleGroup = new AngleDimensionGroup(pA, pApex, pB);
          state.orthogonalDimensions.push(angleGroup);
          resolveScreenSpaceCollisions();

          const dirA = new THREE.Vector3().subVectors(pA, pApex).normalize();
          const dirB = new THREE.Vector3().subVectors(pB, pApex).normalize();
          const dot = THREE.MathUtils.clamp(dirA.dot(dirB), -1, 1);
          const angleDeg = (Math.acos(dot) * 180 / Math.PI).toFixed(1);

          showToast(`Angle: ∠ ${angleDeg}°`);
          state.measurePointsList.length = 0;
          if (toolDeleteMeasurements) toolDeleteMeasurements.style.display = "flex";
        }
      } else if (state.activeMeasureMode === "area") {
        state.measurePointsList.push(state.currentSnapPoint.clone());
        const count = state.measurePointsList.length;
        showToast(`Vertex ${count} added`);
        if (count >= 3 && toolDeleteMeasurements) {
          toolDeleteMeasurements.style.display = "flex";
        }
      }
    }
  });
}
