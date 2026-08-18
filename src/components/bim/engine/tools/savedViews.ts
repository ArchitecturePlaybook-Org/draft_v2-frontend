import * as THREE from "three";
import { state } from "../core/state";
import { showToast } from "../ui/notifications";

export interface SavedView {
  id: string;
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  timestamp: Date;
}

export const savedViews: SavedView[] = [];

export function saveCurrentView(name: string) {
  if (!state.world?.camera?.controls) return;
  const position = new THREE.Vector3();
  const target = new THREE.Vector3();

  state.world.camera.controls.getPosition(position);
  state.world.camera.controls.getTarget(target);

  const view: SavedView = {
    id: `view_${Date.now()}`,
    name: name || `View ${savedViews.length + 1}`,
    position,
    target,
    timestamp: new Date(),
  };

  savedViews.push(view);
  showToast(`Saved view: "${view.name}"`);
  renderSavedViewsList();
}

export function restoreView(viewId: string) {
  const view = savedViews.find((v) => v.id === viewId);
  if (!view || !state.world?.camera?.controls) return;

  state.world.camera.controls.setLookAt(
    view.position.x, view.position.y, view.position.z,
    view.target.x, view.target.y, view.target.z,
    true
  );
  showToast(`Restored view: "${view.name}"`);
}

export function renderSavedViewsList() {
  const container = document.getElementById("saved-views-list");
  if (!container) return;

  container.innerHTML = "";
  if (savedViews.length === 0) {
    container.innerHTML = "<div class='empty-state'><p>No saved camera views yet.</p></div>";
    return;
  }

  savedViews.forEach((view) => {
    const item = document.createElement("div");
    item.className = "saved-view-item";
    item.innerHTML = `
      <span class="view-name">📷 ${view.name}</span>
      <button class="btn-restore-view" data-id="${view.id}">Restore</button>
    `;
    item.querySelector(".btn-restore-view")?.addEventListener("click", () => restoreView(view.id));
    container.appendChild(item);
  });
}

export function openSaveViewModal() {
  const name = prompt("Enter a name for this camera view:", `View ${savedViews.length + 1}`);
  if (name) {
    saveCurrentView(name);
  }
}

export function initSavedViewsControls() {
  renderSavedViewsList();
}
