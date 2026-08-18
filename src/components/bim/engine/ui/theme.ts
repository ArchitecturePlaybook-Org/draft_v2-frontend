import * as THREE from "three";
import { state } from "../core/state";
import { wakeRenderer } from "../core/viewer";
import { showToast } from "./notifications";

const THEME_STORAGE_KEY = "bim_viewer_theme_preference";

export function getCurrentTheme(): string {
  return (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "dark";
}

export function applyTheme(themeName: string, showNotification = false) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isLight = themeName === "light";

  root.setAttribute("data-theme", isLight ? "light" : "dark");
  localStorage.setItem(THEME_STORAGE_KEY, isLight ? "light" : "dark");

  if (state.world?.scene?.three) {
    const bgColorHex = isLight ? "#f5f6fa" : "#07090e";
    const bgColor = new THREE.Color(bgColorHex);
    state.world.scene.three.background = bgColor;

    if (state.world.scene.three.fog) {
      state.world.scene.three.fog.color = bgColor;
    } else {
      state.world.scene.three.fog = new THREE.FogExp2(bgColor, 0.0015);
    }

    const wrapper = document.querySelector(".fixed.inset-0.z-\\[9999\\]") as HTMLElement;
    if (wrapper) wrapper.style.background = bgColorHex;
  }

  const btnToggle = document.getElementById("btn-theme-toggle");
  if (btnToggle) {
    btnToggle.innerHTML = isLight
      ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    btnToggle.title = isLight ? "Switch to Dark Mode (Black & Gold)" : "Switch to Light Mode (White & Gold)";
  }

  wakeRenderer();

  if (showNotification) {
    showToast(isLight ? "Theme: White & Gold (Light)" : "Theme: Black & Gold (Dark)");
  }
}

export function toggleTheme(showNotification = true) {
  const current = getCurrentTheme();
  const next = current === "light" ? "dark" : "light";
  applyTheme(next, showNotification);
}

export function initThemeController() {
  const savedTheme = (typeof window !== "undefined" && localStorage.getItem(THEME_STORAGE_KEY)) || "dark";
  applyTheme(savedTheme, false);

  const btnToggle = document.getElementById("btn-theme-toggle");
  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      toggleTheme(true);
    });
  }
}
