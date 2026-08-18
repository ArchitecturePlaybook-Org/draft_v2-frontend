import * as THREE from "three";
import { state } from "../core/state";
import { showToast } from "../ui/notifications";

export function syncAllTreeCheckboxes() {
  document.querySelectorAll(".bim-tree .tree-node").forEach((node: any) => {
    const map = node._fragmentIdMap;
    const chk = node.querySelector(":scope > .tree-item .tree-checkbox");
    const item = node.querySelector(":scope > .tree-item");
    if (!chk || !map) return;

    let total = 0;
    let visibleCount = 0;

    for (const fragId in map) {
      const ids = map[fragId];
      if (ids instanceof Set || Array.isArray(ids)) {
        for (const id of ids) {
          total++;
          if (!state.hiddenExpressIDs.has(id)) visibleCount++;
        }
      }
    }

    if (total === 0) return;

    if (visibleCount === total) {
      chk.checked = true;
      chk.indeterminate = false;
      item?.classList.remove("is-hidden");
    } else if (visibleCount === 0) {
      chk.checked = false;
      chk.indeterminate = false;
      item?.classList.add("is-hidden");
    } else {
      chk.checked = false;
      chk.indeterminate = true;
      item?.classList.remove("is-hidden");
    }
  });
}

function _applyFragmentVisibility(fragmentIdMap: any, isVisible: boolean) {
  const fm = state.fragmentsManager;
  if (!fm?.list) return;
  for (const fragId in fragmentIdMap) {
    const fragment = fm.list.get(fragId);
    if (!fragment) continue;
    const ids = fragmentIdMap[fragId];
    if (typeof fragment.setVisibility === "function") {
      fragment.setVisibility(isVisible, ids instanceof Set ? ids : new Set(ids));
    } else if (fragment.mesh) {
      fragment.mesh.visible = isVisible;
    }
  }
}

export function applyVisibilityChange(fragmentIdMap: any, isVisible: boolean, notify = true) {
  if (!state.currentModel || !fragmentIdMap) return;

  if (state.hider) {
    state.hider.set(isVisible, fragmentIdMap);
  } else {
    _applyFragmentVisibility(fragmentIdMap, isVisible);
  }

  for (const fragId in fragmentIdMap) {
    const ids = fragmentIdMap[fragId];
    if (ids instanceof Set || Array.isArray(ids)) {
      for (const id of ids) {
        if (isVisible) state.hiddenExpressIDs.delete(id);
        else state.hiddenExpressIDs.add(id);
      }
    }
  }

  syncAllTreeCheckboxes();
  if (notify) showToast(isVisible ? "✅ Elements visible" : "🙈 Elements hidden");
}

export function isolateVisibility(fragmentIdMap: any) {
  if (!state.currentModel || !fragmentIdMap) return;

  if (state.hider) {
    state.hider.set(false);
    state.hider.set(true, fragmentIdMap);
  } else {
    const fm = state.fragmentsManager;
    if (fm?.list) {
      for (const [, fragment] of fm.list) {
        if (fragment?.mesh) fragment.mesh.visible = false;
      }
    }
    _applyFragmentVisibility(fragmentIdMap, true);
  }

  state.hiddenExpressIDs.clear();
  if (state.currentModel.data) {
    for (const [id] of state.currentModel.data) state.hiddenExpressIDs.add(id);
  }
  for (const fragId in fragmentIdMap) {
    const ids = fragmentIdMap[fragId];
    if (ids instanceof Set || Array.isArray(ids)) {
      for (const id of ids) state.hiddenExpressIDs.delete(id);
    }
  }

  state.isolationActive = true;
  const toolIsolate = document.getElementById("tool-isolate");
  if (toolIsolate) toolIsolate.classList.add("active");

  syncAllTreeCheckboxes();
  focusCameraOnElements(fragmentIdMap);
  showToast("🔍 Isolated selection");
}

export function showAllVisibility() {
  if (!state.currentModel) return;

  if (state.hider) {
    state.hider.set(true);
  } else {
    const fm = state.fragmentsManager;
    if (fm?.list) {
      for (const [, fragment] of fm.list) {
        if (fragment?.mesh) fragment.mesh.visible = true;
      }
    }
  }

  state.hiddenExpressIDs.clear();
  state.isolationActive = false;
  const toolIsolate = document.getElementById("tool-isolate");
  if (toolIsolate) toolIsolate.classList.remove("active");

  syncAllTreeCheckboxes();
  showToast("✅ All elements restored");
}

export async function focusCameraOnElements(fragmentIdMap: any, targetObj?: any) {
  if (!state.currentModel || !state.world?.camera?.controls) return;
  const box = new THREE.Box3();
  let found = false;

  if (targetObj) {
    box.expandByObject(targetObj);
    found = true;
  } else {
    for (const fragId in fragmentIdMap) {
      const fragment = state.fragmentsManager?.list?.get(fragId);
      if (fragment && fragment.mesh) {
        box.expandByObject(fragment.mesh);
        found = true;
      }
    }
  }

  if (found && !box.isEmpty()) {
    try {
      await state.world.camera.controls.fitToBox(box, false, {
        paddingLeft: 0.15, paddingRight: 0.15,
        paddingTop: 0.15, paddingBottom: 0.15,
      });
    } catch (e) {}
  }
}
