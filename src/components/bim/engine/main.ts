import "../bim-viewer.css";
import { state } from "./core/state";
import { initEngine, load3DModel, loadIfcFile, cleanupModelMemory } from "./core/viewer";
import { setupUIListeners } from "./ui/toolbar";
import { setBottomSheetState } from "./ui/bottomSheet";
import { clearProperties } from "./inspector/properties";
import { showToast, showUploadPanel } from "./ui/notifications";
import { initThemeController } from "./ui/theme";

async function bootstrapApp() {
  const viewerContainer = document.getElementById("viewer-container");
  if (!viewerContainer) return;

  await initEngine(viewerContainer);
  initThemeController();
  setupUIListeners();

  const fileInput = (document.getElementById("ifc-file-input") || document.getElementById("file-input")) as HTMLInputElement | null;
  const dropZone = document.getElementById("upload-panel") || document.getElementById("drop-zone");
  const btnReset = document.getElementById("btn-reset");
  const btnSample = document.getElementById("btn-load-sample") || document.getElementById("btn-sample");

  if (fileInput) {
    fileInput.addEventListener("change", async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;
      const arrayBuffer = await file.arrayBuffer();
      await load3DModel(arrayBuffer, file.name);
      fileInput.value = "";
    });
  }

  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-active");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-active");
    });

    dropZone.addEventListener("drop", async (e: any) => {
      e.preventDefault();
      dropZone.classList.remove("drag-active");
      const file = e.dataTransfer.files[0];
      if (file) {
        const ext = file.name.split(".").pop().toLowerCase();
        const validExtensions = ["ifc", "glb", "gltf", "obj", "stl", "fbx", "dae", "ply", "skp"];
        if (validExtensions.includes(ext)) {
          const arrayBuffer = await file.arrayBuffer();
          await load3DModel(arrayBuffer, file.name);
        } else {
          showToast("Supported formats: .ifc, .glb, .gltf, .obj, .stl, .fbx, .dae, .ply, .skp");
        }
      }
    });
  }

  if (btnSample) {
    btnSample.addEventListener("click", async () => {
      try {
        showToast("Loading demo BIM model…");
        let response = await fetch("/static/models/sample.ifc");
        if (!response.ok) {
          response = await fetch("https://thatopen.github.io/engine_components/resources/small.ifc");
        }
        if (!response.ok) throw new Error("Could not fetch sample model");
        const arrayBuffer = await response.arrayBuffer();
        await loadIfcFile(arrayBuffer, "sample_building.ifc");
      } catch (err) {
        console.warn("Sample model fetch failed, prompting file upload:", err);
        showToast("Could not load sample model online. Please choose an IFC file.");
        if (fileInput) fileInput.click();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      cleanupModelMemory();

      const toolDeleteClips = document.getElementById("tool-delete-clips");
      const toolDeleteMeasurements = document.getElementById("tool-delete-measurements");
      if (toolDeleteClips) toolDeleteClips.style.display = "none";
      if (toolDeleteMeasurements) toolDeleteMeasurements.style.display = "none";

      if (window.innerWidth <= 768) {
        setBottomSheetState("closed");
      }
      showUploadPanel();
      showToast("Viewer reset");
    });
  }

  console.log("[BIM Viewer] Modular Architecture ready.");
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapApp);
  } else {
    bootstrapApp();
  }
}
