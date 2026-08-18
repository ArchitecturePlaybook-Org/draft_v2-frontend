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
import { fitCameraToModel } from "../core/viewer";
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
}
