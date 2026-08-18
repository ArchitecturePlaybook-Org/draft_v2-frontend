import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { state, delay } from "./state";
import { showLoading, updateProgress, hideLoading, showStatus, hideUploadPanel, showToast } from "../ui/notifications";
import { renderBimTreeExplorer } from "../explorer/treeExplorer";
import { showProperties, clearProperties } from "../inspector/properties";
import { setBottomSheetState } from "../ui/bottomSheet";
import { resolveScreenSpaceCollisions } from "../tools/measurement";
import { populateSectionStoreys, removeSectionGizmo } from "../tools/section";
import { updatePivotOrb, resetOrbFadeTimer, removePivotOrb } from "../tools/pivotOrb";

// ── Shared PBR Material Palette Cache ────────────────────────────

export function getSharedPBRMaterial(mat: any) {
  if (!mat) return mat;

  // If already a standard material with custom image maps, reuse directly
  if ((mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) && mat.map) {
    mat.roughness = Math.max(mat.roughness ?? 0.5, 0.45);
    mat.envMapIntensity = 0.35;
    mat.needsUpdate = true;
    return mat;
  }

  const colorHex = mat.color ? mat.color.getHexString() : "cccccc";
  const opacity = mat.opacity !== undefined ? Math.round(mat.opacity * 100) / 100 : 1.0;
  const isGlass = opacity < 0.9 || Boolean(mat.transparent);
  const transparent = isGlass;
  const side = mat.side ?? THREE.FrontSide;
  const vertexColors = Boolean(mat.vertexColors);

  const cacheKey = `${colorHex}_${opacity}_${transparent}_${side}_${vertexColors}_${isGlass}`;
  if (state.materialCache.has(cacheKey)) {
    const cached = state.materialCache.get(cacheKey);
    // Carry over any map if present
    if (mat.map && !cached.map) cached.map = mat.map;
    return cached;
  }

  const stdMat = new THREE.MeshStandardMaterial({
    color: mat.color ? mat.color.clone() : new THREE.Color(0xcccccc),
    opacity: opacity,
    transparent: transparent,
    side: side,
    roughness: isGlass ? 0.12 : 0.65,
    metalness: isGlass ? 0.15 : 0.08,
    envMapIntensity: 0.35,
    vertexColors: vertexColors,
    depthWrite: !transparent,
    clippingPlanes: [state.activeSectionPlane],
    clipShadows: true,
  });

  if (mat.map) stdMat.map = mat.map;
  if (mat.alphaMap) stdMat.alphaMap = mat.alphaMap;
  if (mat.aoMap) stdMat.aoMap = mat.aoMap;
  if (mat.normalMap) stdMat.normalMap = mat.normalMap;

  state.materialCache.set(cacheKey, stdMat);
  return stdMat;
}

// ── WebGL Deep Buffer & Memory Disposal ──────────────────────────

export function disposeObject3D(obj: any) {
  if (!obj) return;

  obj.traverse((child: any) => {
    // 1. Dispose Geometry & Buffers
    if (child.geometry) {
      child.geometry.dispose();
    }

    // 2. Dispose Materials & Attached Textures (skip shared cached materials)
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        let isShared = false;
        for (const cached of state.materialCache.values()) {
          if (cached === m) {
            isShared = true;
            break;
          }
        }
        if (!isShared) {
          const textureKeys = [
            "map", "lightMap", "bumpMap", "normalMap", "specularMap",
            "envMap", "alphaMap", "aoMap", "roughnessMap", "metalnessMap",
          ];
          textureKeys.forEach((key) => {
            if (m[key] && typeof m[key].dispose === "function") {
              m[key].dispose();
            }
          });
          if (typeof m.dispose === "function") m.dispose();
        }
      });
    }
  });

  if (obj.removeFromParent) {
    obj.removeFromParent();
  }
}

export function cleanupModelMemory() {
  if (state.currentModel) {
    state.orthogonalDimensions.forEach((d: any) => d.dispose());
    state.orthogonalDimensions.length = 0;

    disposeObject3D(state.currentModel);

    // Dispose cached shared materials
    state.materialCache.forEach((m: any) => {
      if (m && typeof m.dispose === "function") m.dispose();
    });
    state.materialCache.clear();

    try {
      state.clipper?.deleteAll();
    } catch (e) {}

    try {
      state.measurement?.deleteAll();
    } catch (e) {}

    removeSectionGizmo();
    removePivotOrb();

    state.world?.meshes?.clear();

    if (state.world?.renderer?.three?.renderLists) {
      state.world.renderer.three.renderLists.dispose();
    }

    clearProperties();
    state.hiddenExpressIDs.clear();
    state.currentModel = null;
    state.isolationActive = false;
    state.materialOriginals.clear();
  }
}

export function destroyEngine() {
  // Full teardown — resets init guard so a fresh initEngine can run
  cleanupModelMemory();
  try { state.components?.dispose?.(); } catch (e) {}
  
  // Explicitly remove zombie canvases that might cause transparency overlay issues
  const viewerContainer = document.getElementById("viewer-container");
  if (viewerContainer) {
    viewerContainer.innerHTML = "";
  }

  state.components = null;
  state.world = null;
  state.highlighter = null;
  state.outliner = null;
  state.clipper = null;
  state.measurement = null;
  state.labelRenderer = null;
  state.ifcLoader = null;
  state.fragmentsManager = null;
  state.hider = null;
  state.classifier = null;
  state.relationsIndexer = null;
  isEngineInitialized = false;
}

// ── Adaptive Dynamic Resolution & Idle Render Throttling ────────
let idleTimer: any = null;
export let isIdle = false;
let isInteracting = false;
let interactionEndTimer: any = null;
let isEngineInitialized = false;

export function setDynamicResolution(moving: boolean) {
  if (!state.world?.renderer?.three) return;
  const r = state.world.renderer.three;
  const targetRatio = moving ? 1.0 : Math.min(window.devicePixelRatio || 1, 2.0);
  if (Math.abs(r.getPixelRatio() - targetRatio) > 0.05) {
    r.setPixelRatio(targetRatio);
    if (state.world.renderer.resize) state.world.renderer.resize();
  }
}

export function updateShadows() {
  if (state.sunLight && state.sunLight.shadow) {
    state.sunLight.shadow.needsUpdate = true;
    wakeRenderer();
  }
}

export function renderLabels() {
  if (state.labelRenderer && state.world?.scene?.three && state.world?.camera?.three) {
    state.labelRenderer.render(state.world.scene.three, state.world.camera.three);
  }
}

export function wakeRenderer() {
  if (isIdle) {
    isIdle = false;
    if (state.world?.renderer?.postproduction) {
      state.world.renderer.postproduction.enabled = true;
    }
  }

  renderLabels();

  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    isIdle = true;
    setDynamicResolution(false); // restore ultra-crisp resolution when still
  }, 2500);
}

// ── Three.js / ThatOpen Engine Initializer ───────────────────────

export async function initEngine(viewerContainer: HTMLElement) {
  // Guard against React Strict Mode double-invocation
  if (isEngineInitialized && state.world?.renderer) {
    console.log("[BIM Viewer] Engine already initialized, skipping.");
    return;
  }
  isEngineInitialized = true;

  state.components = new OBC.Components();
  const worlds = state.components.get(OBC.Worlds);

  state.world = worlds.create();
  state.world.scene = new OBC.SimpleScene(state.components);
  state.world.renderer = new OBCF.PostproductionRenderer(state.components, viewerContainer);

  // ── CSS2D Label Renderer for CAD Dimension Badges ────────────────
  state.labelRenderer = new CSS2DRenderer();
  state.labelRenderer.setSize(viewerContainer.clientWidth || window.innerWidth, viewerContainer.clientHeight || window.innerHeight);
  state.labelRenderer.domElement.style.position = "absolute";
  state.labelRenderer.domElement.style.top = "0px";
  state.labelRenderer.domElement.style.left = "0px";
  state.labelRenderer.domElement.style.width = "100%";
  state.labelRenderer.domElement.style.height = "100%";
  state.labelRenderer.domElement.style.pointerEvents = "none";
  state.labelRenderer.domElement.style.zIndex = "10";
  viewerContainer.appendChild(state.labelRenderer.domElement);

  state.world.camera = new OBC.OrthoPerspectiveCamera(state.components);
  await state.world.camera.controls.setLookAt(30, 20, 30, 0, 0, 0);

  if (state.world.camera && state.world.camera.controls) {
    state.world.camera.controls.addEventListener("controlstart", () => {
      isInteracting = true;
      setDynamicResolution(true); // 60 FPS performance mode during motion
      resetOrbFadeTimer();
      wakeRenderer();
    });

    state.world.camera.controls.addEventListener("update", () => {
      wakeRenderer();
      for (const d of state.orthogonalDimensions) {
        if (typeof d.updateTicks === "function") d.updateTicks();
      }
      renderLabels();
      resolveScreenSpaceCollisions();
      updatePivotOrb();
    });

    state.world.camera.controls.addEventListener("controlend", () => {
      isInteracting = false;
      resetOrbFadeTimer();
      if (interactionEndTimer) clearTimeout(interactionEndTimer);
      interactionEndTimer = setTimeout(() => {
        setDynamicResolution(false); // Razor-sharp native resolution when stationary
        wakeRenderer();
      }, 100);
    });
  }

  state.components.init();
  state.world.renderer.postproduction.enabled = true;
  if (state.world.renderer?.three) {
    state.world.renderer.three.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // WebGL Context Loss & Recovery Handlers
  const canvas = viewerContainer.querySelector("canvas") || state.world.renderer?.three?.domElement;
  if (canvas) {
    canvas.addEventListener("webglcontextlost", (event: any) => {
      event.preventDefault();
      console.warn("[WebGL] Context lost due to OS / GPU memory pressure.");
      showToast("⚠️ GPU Context paused (freeing memory)");
    }, false);

    canvas.addEventListener("webglcontextrestored", () => {
      console.info("[WebGL] Context restored.");
      showToast("✅ GPU Context restored");
      if (state.world?.renderer?.resize) state.world.renderer.resize();
      if (state.world?.camera?.updateAspect) state.world.camera.updateAspect();
      wakeRenderer();
    }, false);
  }

  // Wake renderer on user interaction
  ["pointerdown", "pointermove", "wheel", "touchstart", "keydown"].forEach((evt) => {
    window.addEventListener(evt, wakeRenderer, { passive: true });
  });

  // ── Scene Background: bright architectural sky ───────────────────
  state.world.scene.three.background = new THREE.Color(0xf0eff4);
  state.world.scene.three.fog = new THREE.FogExp2(0xf0eff4, 0.0015);

  state.ifcLoader = state.components.get(OBC.IfcLoader);
  await state.ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: "https://unpkg.com/web-ifc@0.0.68/",
      absolute: true,
    },
  });

  state.fragmentsManager = state.components.get(OBC.FragmentsManager);

  // ── Professional 4-Light Architectural Rig ───────────────────────

  // 1. Hemisphere: sky (cool blue-white) / ground (warm beige) — key to realism
  const hemiLight = new THREE.HemisphereLight(0xd4e8ff, 0xc8b89a, 1.25);
  state.world.scene.three.add(hemiLight);

  // 2. Key / Sun light — warm directional with on-demand shadow mapping
  const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.2);
  sunLight.position.set(60, 100, 50);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.camera.left = -80;
  sunLight.shadow.camera.right = 80;
  sunLight.shadow.camera.top = 80;
  sunLight.shadow.camera.bottom = -80;
  sunLight.shadow.bias = -0.0015;
  sunLight.shadow.normalBias = 0.04;
  sunLight.shadow.autoUpdate = false; // Only update when scene changes (huge GPU speedup)
  state.world.scene.three.add(sunLight);
  state.sunLight = sunLight;

  // 3. Ground Contact Shadow Receiver
  const groundGeom = new THREE.PlaneGeometry(4000, 4000);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.16 });
  state.groundShadowPlane = new THREE.Mesh(groundGeom, groundMat);
  state.groundShadowPlane.rotation.x = -Math.PI / 2;
  state.groundShadowPlane.receiveShadow = true;
  state.groundShadowPlane.position.y = -0.01;
  state.world.scene.three.add(state.groundShadowPlane);

  // 4. Fill light — cool blue from opposite side
  const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.9);
  fillLight.position.set(-50, 60, -40);
  state.world.scene.three.add(fillLight);

  // 5. Rim / back light — warm accent from behind for edge definition
  const rimLight = new THREE.DirectionalLight(0xffe8c0, 0.4);
  rimLight.position.set(0, -10, -70);
  state.world.scene.three.add(rimLight);

  // 6. Low ambient — prevents pure-black occlusion in indoor spaces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.28);
  state.world.scene.three.add(ambientLight);

  // ── Renderer: Physically-Correct Output ──────────────────────────
  if (state.world.renderer?.three) {
    const r = state.world.renderer.three;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.12;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
  }

  // Features Setup
  initFeatures();

  window.addEventListener("resize", () => {
    if (!state.world) return;
    if (state.world.renderer) state.world.renderer.resize();
    if (state.world.camera) state.world.camera.updateAspect();
    if (state.labelRenderer && viewerContainer) {
      state.labelRenderer.setSize(viewerContainer.clientWidth || window.innerWidth, viewerContainer.clientHeight || window.innerHeight);
    }
    renderLabels();
    resolveScreenSpaceCollisions();
    wakeRenderer();
  });

  wakeRenderer();
  console.log("[BIM Viewer] Engine initialized with Performance & Memory enhancements.");

  // ── PostProduction: Edge Outlines & AO Config ───────────────────
  const pp = state.world.renderer.postproduction;
  if (pp) {
    pp.enabled = true;
    const customEffects = pp.customEffects;
    if (customEffects) {
      customEffects.outlineEnabled = true;
      // Dark charcoal edge outlines that work on a light background
      if (customEffects.outlineColor !== undefined) customEffects.outlineColor = 0x333333;
      if (customEffects.outlineThickness !== undefined) customEffects.outlineThickness = 0.002;
    }
    // Attempt to enable GTAO ambient occlusion if available
    if (pp.settings) {
      try { pp.settings.ao = true; } catch (e) {}
    }
    if (pp.ao) {
      try { pp.ao.enabled = true; } catch (e) {}
    }
  }
}

export function initFeatures() {
  state.highlighter = state.components.get(OBCF.Highlighter);
  try {
    state.highlighter.setup({ world: state.world });
  } catch (e) {
    // Already set up (e.g. Strict Mode double mount) — safe to continue
    console.warn("[BIM Viewer] Highlighter already set up:", e);
  }
  state.highlighter.hoverEnabled = true;

  state.outliner = state.components.get(OBCF.Outliner);
  state.outliner.world = state.world;
  state.outliner.enabled = true;

  try {
    state.outliner.create("select", new THREE.MeshBasicMaterial({ color: 0x6366f1, depthTest: false }));
  } catch (e) {}
  try {
    state.outliner.create("hover", new THREE.MeshBasicMaterial({
      color: 0xffffff, depthTest: false, transparent: true, opacity: 0.4,
    }));
  } catch (e) {}

  state.highlighter.events.hover.onHighlight.add((fragmentIdMap: any) => {
    wakeRenderer();
    if (state.activeTool !== "select") return;
    state.outliner.clear("hover");
    state.outliner.add("hover", fragmentIdMap);
  });

  state.highlighter.events.hover.onClear.add(() => {
    state.outliner.clear("hover");
  });

  state.highlighter.events.select.onHighlight.add((fragmentIdMap: any) => {
    wakeRenderer();
    if (state.activeTool !== "select") return;
    state.lastSelection = fragmentIdMap;
    state.outliner.clear("select");
    state.outliner.add("select", fragmentIdMap);
    showProperties(fragmentIdMap);
  });

  state.highlighter.events.select.onClear.add(() => {
    state.lastSelection = null;
    state.outliner.clear("select");
    clearProperties();
  });

  state.clipper = state.components.get(OBC.Clipper);
  state.clipper.enabled = false;
  state.clipper.visible = false;

  state.measurement = state.components.get(OBCF.LengthMeasurement);
  state.measurement.world = state.world;
  state.measurement.enabled = false;
  state.measurement.color = new THREE.Color(0x000000); // black dimension lines

  state.classifier = state.components.get(OBC.Classifier);
  state.relationsIndexer = state.components.get(OBC.IfcRelationsIndexer);

  // Initialize Hider — the proper ThatOpen visibility engine
  // This MUST be registered via components.get() before any hide/show calls
  state.hider = state.components.get(OBC.Hider);
}

export async function fitCameraToModel(model: any) {
  if (!model || !state.world || !state.world.camera || !state.world.camera.controls) return;

  const boundingBox = new THREE.Box3().setFromObject(model);
  if (boundingBox.isEmpty()) return;

  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 1.5;

  // FIX: Use enableTransition=false so setLookAt resolves immediately.
  // When enableTransition=true the promise only resolves after the camera
  // animation completes — but if the render loop is idle-throttled the
  // animation callback never fires and the promise hangs forever (stuck at 90%).
  const TIMEOUT_MS = 3000;
  try {
    await Promise.race([
      state.world.camera.controls.setLookAt(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7,
        center.x,
        center.y,
        center.z,
        false   // enableTransition=false: resolves immediately
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("setLookAt timeout")), TIMEOUT_MS)
      ),
    ]);
  } catch (e) {
    // Timeout or error: force-set position without animation as fallback
    state.world.camera.controls.setLookAt(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7,
      center.x, center.y, center.z,
      false
    );
  }
  wakeRenderer();
}

// ── Common Post-Processing for Loaded 3D Models ─────────────────

async function setupLoadedModelCommon(model: any, fileName: string, elementCount = 0, formatTag = "3D") {
  model.name = fileName;
  state.currentModel = model;
  state.world.scene.three.add(model);

  // Configure clipping and shadow casting across all meshes
  const enableShadows = elementCount < 4000;
  state.world.meshes.clear();

  model.traverse((child: any) => {
    if (child.isMesh) {
      state.world.meshes.add(child);

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        if (m) {
          m.clippingPlanes = state.isSectionActive ? [state.activeSectionPlane] : [];
          m.clipShadows = true;
          m.needsUpdate = true;
        }
      });

      if (enableShadows) {
        child.castShadow = true;
        child.receiveShadow = true;
      } else {
        child.receiveShadow = true;
      }
    }
  });

  // Dynamic Shadow Camera Fitting & Ground Plane Alignment
  const bbox = new THREE.Box3().setFromObject(model);
  if (!bbox.isEmpty()) {
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 10);

    if (state.groundShadowPlane) {
      state.groundShadowPlane.position.set(center.x, bbox.min.y - 0.02, center.z);
      state.groundShadowPlane.visible = true;
    }

    if (state.sunLight) {
      state.sunLight.position.set(center.x + maxDim * 1.2, center.y + maxDim * 1.8, center.z + maxDim * 1.2);
      state.sunLight.target.position.copy(center);
      state.sunLight.target.updateMatrixWorld();

      state.sunLight.shadow.camera.left = -maxDim * 1.1;
      state.sunLight.shadow.camera.right = maxDim * 1.1;
      state.sunLight.shadow.camera.top = maxDim * 1.1;
      state.sunLight.shadow.camera.bottom = -maxDim * 1.1;
      state.sunLight.shadow.camera.near = 0.5;
      state.sunLight.shadow.camera.far = maxDim * 6;
      state.sunLight.shadow.camera.updateProjectionMatrix();
    }
  }
  updateShadows();

  await renderBimTreeExplorer(model);
  populateSectionStoreys();

  updateProgress(90, "Fitting camera…");
  wakeRenderer();
  await fitCameraToModel(model);

  updateProgress(100, "Complete!");
  await delay(300);

  hideLoading();
  hideUploadPanel();
  showStatus(fileName, elementCount);

  if (window.innerWidth <= 768) {
    setBottomSheetState("half");
  } else {
    const rightSidebar = document.getElementById("right-sidebar") || document.getElementById("sidebar-right");
    if (rightSidebar) rightSidebar.classList.add("visible");
  }

  wakeRenderer();
}

// ── Format-Specific Loaders ──────────────────────────────────────

export async function loadIfcFile(arrayBuffer: ArrayBuffer, fileName = "Model") {
  try {
    showLoading("Parsing IFC model…");
    updateProgress(10, "Reading file data…");

    cleanupModelMemory();
    updateProgress(25, "Converting to Fragments…");

    const buffer = new Uint8Array(arrayBuffer);
    const model = await state.ifcLoader.load(buffer);
    const elementCount = model.data ? model.data.size : 0;

    updateProgress(80, "Adding model to scene…");
    await setupLoadedModelCommon(model, fileName, elementCount, "IFC");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load IFC file:", error);
    hideLoading();
    alert(`Failed to load IFC file: ${error.message || error}`);
  }
}

export async function loadGltfFile(arrayBuffer: ArrayBuffer, fileName = "Model") {
  try {
    showLoading("Loading glTF / GLB model…");
    updateProgress(15, "Initializing glTF Loader…");

    cleanupModelMemory();
    updateProgress(35, "Parsing glTF geometry & materials…");

    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const gltf: any = await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, "", resolve, reject);
    });

    const model = gltf.scene || gltf.scenes[0];
    let meshCount = 0;
    model.traverse((c: any) => { if (c.isMesh) meshCount++; });

    updateProgress(80, "Finalizing scene…");
    await setupLoadedModelCommon(model, fileName, meshCount, "GLTF");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load GLTF/GLB file:", error);
    hideLoading();
    alert(`Failed to load GLTF/GLB file: ${error.message || error}`);
  }
}

export async function loadObjFile(textOrBuffer: ArrayBuffer | string, fileName = "Model") {
  try {
    showLoading("Loading OBJ model…");
    updateProgress(20, "Initializing OBJ Loader…");

    cleanupModelMemory();
    updateProgress(40, "Parsing Wavefront OBJ vertices & faces…");

    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    const loader = new OBJLoader();

    let text = "";
    if (typeof textOrBuffer === "string") {
      text = textOrBuffer;
    } else {
      text = new TextDecoder().decode(textOrBuffer);
    }

    const model = loader.parse(text);

    // Apply default materials if missing
    let meshCount = 0;
    model.traverse((child: any) => {
      if (child.isMesh) {
        meshCount++;
        if (!child.material || child.material.length === 0) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xb0bec5,
            roughness: 0.5,
            metalness: 0.1,
          });
        }
      }
    });

    updateProgress(80, "Finalizing scene…");
    await setupLoadedModelCommon(model, fileName, meshCount, "OBJ");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load OBJ file:", error);
    hideLoading();
    alert(`Failed to load OBJ file: ${error.message || error}`);
  }
}

export async function loadStlFile(arrayBuffer: ArrayBuffer, fileName = "Model") {
  try {
    showLoading("Loading STL model…");
    updateProgress(20, "Initializing STL Loader…");

    cleanupModelMemory();
    updateProgress(40, "Parsing STL stereolithography mesh…");

    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x90a4ae,
      roughness: 0.45,
      metalness: 0.25,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = fileName;

    const model = new THREE.Group();
    model.name = fileName;
    model.add(mesh);

    updateProgress(80, "Finalizing scene…");
    await setupLoadedModelCommon(model, fileName, 1, "STL");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load STL file:", error);
    hideLoading();
    alert(`Failed to load STL file: ${error.message || error}`);
  }
}

export async function loadFbxFile(arrayBuffer: ArrayBuffer, fileName = "Model") {
  try {
    showLoading("Loading FBX model…");
    updateProgress(20, "Initializing FBX Loader…");

    cleanupModelMemory();
    updateProgress(40, "Parsing Autodesk FBX hierarchy & meshes…");

    const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
    const loader = new FBXLoader();
    const model = loader.parse(arrayBuffer, "");

    let meshCount = 0;
    model.traverse((child: any) => {
      if (child.isMesh) {
        meshCount++;
        if (!child.material || child.material.length === 0) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.5,
            metalness: 0.15,
          });
        }
      }
    });

    updateProgress(80, "Finalizing scene…");
    await setupLoadedModelCommon(model, fileName, meshCount, "FBX");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load FBX file:", error);
    hideLoading();
    alert(`Failed to load FBX file: ${error.message || error}`);
  }
}

export async function loadDaeFile(textOrBuffer: ArrayBuffer | string, fileName = "Model") {
  try {
    showLoading("Loading Collada DAE model…");
    updateProgress(20, "Initializing Collada Loader…");

    cleanupModelMemory();
    updateProgress(40, "Parsing Collada XML scene graph…");

    const { ColladaLoader } = await import("three/examples/jsm/loaders/ColladaLoader.js");
    const loader = new ColladaLoader();

    let text = "";
    if (typeof textOrBuffer === "string") {
      text = textOrBuffer;
    } else {
      text = new TextDecoder().decode(textOrBuffer);
    }

    const collada: any = loader.parse(text, "");
    const model = collada.scene || collada.scenes?.[0] || new THREE.Group();

    let meshCount = 0;
    model.traverse((child: any) => { if (child.isMesh) meshCount++; });

    updateProgress(80, "Finalizing scene…");
    await setupLoadedModelCommon(model, fileName, meshCount, "DAE");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load DAE file:", error);
    hideLoading();
    alert(`Failed to load DAE file: ${error.message || error}`);
  }
}

export async function loadPlyFile(arrayBuffer: ArrayBuffer, fileName = "Model") {
  try {
    showLoading("Loading PLY scan…");
    updateProgress(20, "Initializing PLY Loader…");

    cleanupModelMemory();
    updateProgress(40, "Parsing PLY polygon & vertex data…");

    const { PLYLoader } = await import("three/examples/jsm/loaders/PLYLoader.js");
    const loader = new PLYLoader();
    const geometry = loader.parse(arrayBuffer);
    geometry.computeVertexNormals();

    let material: any;
    if (geometry.hasAttribute("color")) {
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.5,
        metalness: 0.1,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: 0x60a5fa,
        roughness: 0.45,
        metalness: 0.2,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = fileName;

    const model = new THREE.Group();
    model.name = fileName;
    model.add(mesh);

    updateProgress(80, "Finalizing scene…");
    await setupLoadedModelCommon(model, fileName, 1, "PLY");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load PLY file:", error);
    hideLoading();
    alert(`Failed to load PLY file: ${error.message || error}`);
  }
}

export async function loadSkpFile(arrayBuffer: ArrayBuffer, fileName = "SketchUp Model") {
  try {
    showLoading("Unpacking SketchUp model…");
    updateProgress(20, "Inspecting .SKP archive structure…");

    cleanupModelMemory();

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    let zipData: any;
    try {
      zipData = await zip.loadAsync(arrayBuffer);
    } catch (e) {
      throw new Error("This .skp file uses a legacy binary format. In SketchUp, click File > Export > 3D Model and save as Collada (.dae), IFC (.ifc), or OBJ (.obj) to open here.");
    }

    updateProgress(45, "Extracting embedded 3D scene data…");

    // Search for embedded DAE or 3D stream within the SketchUp package
    let daeFile: any = null;
    for (const relativePath in zipData.files) {
      const lower = relativePath.toLowerCase();
      if (lower.endsWith(".dae") || lower.includes("doc_data") || lower.includes("model")) {
        daeFile = zipData.files[relativePath];
        break;
      }
    }

    if (!daeFile) {
      for (const relativePath in zipData.files) {
        if (relativePath.toLowerCase().endsWith(".xml")) {
          daeFile = zipData.files[relativePath];
          break;
        }
      }
    }

    if (!daeFile) {
      throw new Error("Could not find embedded geometry in this .skp file. Please export from SketchUp as Collada (.dae) or OBJ.");
    }

    const daeText = await daeFile.async("string");
    updateProgress(65, "Parsing SketchUp Collada geometry…");

    const { ColladaLoader } = await import("three/examples/jsm/loaders/ColladaLoader.js");
    const loader = new ColladaLoader();
    const collada: any = loader.parse(daeText, "");
    const model = collada.scene || collada.scenes?.[0] || new THREE.Group();

    let meshCount = 0;
    model.traverse((child: any) => { if (child.isMesh) meshCount++; });

    updateProgress(85, "Finalizing scene…");
    await setupLoadedModelCommon(model, fileName, meshCount, "SKP");
  } catch (error: any) {
    console.error("[BIM Viewer] Failed to load SKP file:", error);
    hideLoading();
    alert(`SketchUp (.skp) Loader: ${error.message || error}`);
  }
}

// ── Unified 3D Model Dispatcher ──────────────────────────────────

export async function load3DModel(arrayBuffer: ArrayBuffer, fileName = "Model") {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "ifc") {
    return loadIfcFile(arrayBuffer, fileName);
  } else if (ext === "glb" || ext === "gltf") {
    return loadGltfFile(arrayBuffer, fileName);
  } else if (ext === "obj") {
    return loadObjFile(arrayBuffer, fileName);
  } else if (ext === "stl") {
    return loadStlFile(arrayBuffer, fileName);
  } else if (ext === "fbx") {
    return loadFbxFile(arrayBuffer, fileName);
  } else if (ext === "dae") {
    return loadDaeFile(arrayBuffer, fileName);
  } else if (ext === "ply") {
    return loadPlyFile(arrayBuffer, fileName);
  } else if (ext === "skp") {
    return loadSkpFile(arrayBuffer, fileName);
  } else {
    // Default fallback to IFC parser
    return loadIfcFile(arrayBuffer, fileName);
  }
}
