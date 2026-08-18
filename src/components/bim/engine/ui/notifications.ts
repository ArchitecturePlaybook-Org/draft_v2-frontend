// ── Notification, Toast, Loading & Hint Systems ──────────────────

export function showToast(message: string, duration = 3000) {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function setHint(text: string | null) {
  const hint = document.getElementById("tool-hint");
  if (hint) {
    hint.style.display = "none";
  }
}

export function showLoading(message = "Loading…") {
  const loadingOverlay = document.getElementById("loading-overlay");
  const loadingText = document.getElementById("loading-text");
  const progressBar = document.getElementById("progress-bar");
  const loadingPercent = document.getElementById("loading-percent");

  if (loadingOverlay) loadingOverlay.style.display = "flex";
  if (loadingText) loadingText.textContent = message;
  if (progressBar) progressBar.style.width = "0%";
  if (loadingPercent) loadingPercent.textContent = "0%";
}

export function updateProgress(percent: number, message?: string) {
  const progressBar = document.getElementById("progress-bar");
  const loadingPercent = document.getElementById("loading-percent");
  const loadingText = document.getElementById("loading-text");

  const pct = Math.min(Math.round(percent), 100);
  if (progressBar) progressBar.style.width = `${pct}%`;
  if (loadingPercent) loadingPercent.textContent = `${pct}%`;
  if (message && loadingText) loadingText.textContent = message;
}

export function hideLoading() {
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) loadingOverlay.style.display = "none";
}

export function showStatus(filename: string, numElements: number) {
  const statusModelName = document.getElementById("status-model-name");
  const statusElementCount = document.getElementById("status-element-count");
  const statusBar = document.getElementById("status-bar");

  if (statusModelName) statusModelName.textContent = filename;
  if (statusElementCount) statusElementCount.textContent = `${numElements.toLocaleString()} elements`;
  if (statusBar) statusBar.style.display = "flex";
}

export function hideStatus() {
  const statusBar = document.getElementById("status-bar");
  if (statusBar) statusBar.style.display = "none";
}

export function showUploadPanel() {
  const uploadPanel = document.getElementById("upload-panel");
  const appUi = document.getElementById("app-ui");
  const rightSidebar = document.getElementById("right-sidebar") || document.getElementById("sidebar-right");

  if (uploadPanel) {
    uploadPanel.style.display = "block";
    uploadPanel.style.animation = "panelAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) both";
  }
  if (appUi) appUi.style.display = "none";
  if (rightSidebar) rightSidebar.classList.remove("visible");
}

export function hideUploadPanel() {
  const uploadPanel = document.getElementById("upload-panel");
  const appUi = document.getElementById("app-ui");

  if (uploadPanel) uploadPanel.style.display = "none";
  if (appUi) appUi.style.display = "flex";
}
