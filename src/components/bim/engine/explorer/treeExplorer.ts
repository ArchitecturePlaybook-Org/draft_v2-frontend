import { state, escapeHtml } from "../core/state";
import { applyVisibilityChange, isolateVisibility, focusCameraOnElements } from "./visibility";
import { showProperties, formatEntityName } from "../inspector/properties";

// ── BIM Tree Element Node Factory ─────────────────────────────

export function getFragmentMapCount(map: any): number {
  if (!map) return 0;
  let count = 0;
  for (const fragId in map) {
    const list = map[fragId];
    if (list instanceof Set) {
      count += list.size;
    } else if (Array.isArray(list)) {
      count += list.length;
    }
  }
  return count;
}

export function getEntityIcon(name: string): string {
  if (!name) return "📐";
  const n = name.toUpperCase();
  if (n.includes("WALL")) return "🧱";
  if (n.includes("DOOR")) return "🚪";
  if (n.includes("WINDOW")) return "🪟";
  if (n.includes("SLAB") || n.includes("FLOOR")) return "🔲";
  if (n.includes("COLUMN")) return "🏛️";
  if (n.includes("BEAM")) return "🏗️";
  if (n.includes("ROOF")) return "🏠";
  if (n.includes("STAIR") || n.includes("RAMP")) return "🪜";
  if (n.includes("RAILING")) return "🛡️";
  if (n.includes("SPACE")) return "📦";
  if (n.includes("FURNISH") || n.includes("FURNITURE")) return "🛋️";
  if (n.includes("FLOW") || n.includes("PIPE") || n.includes("DUCT") || n.includes("TERMINAL")) return "🔧";
  if (n.includes("SITE")) return "🏞️";
  if (n.includes("BUILDING")) return "🏢";
  if (n.includes("STOREY")) return "🏬";
  if (n.includes("PROJECT")) return "🌐";
  return "📐";
}

export function createBimTreeNode({ label, count = 0, fragmentIdMap = null, isBranch = false, expanded = false, children = [] }: any) {
  const node = document.createElement("div");
  node.className = "tree-node" + (expanded ? " expanded" : "");
  (node as any)._fragmentIdMap = fragmentIdMap;
  (node as any)._originalLabel = label;

  const item = document.createElement("div");
  item.className = "tree-item";

  const left = document.createElement("div");
  left.className = "tree-item-left";

  if (isBranch) {
    const toggle = document.createElement("div");
    toggle.className = "tree-toggle";
    toggle.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      node.classList.toggle("expanded");
    });
    left.appendChild(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.style.width = "14px";
    spacer.style.flexShrink = "0";
    left.appendChild(spacer);
  }

  const chk = document.createElement("input");
  chk.type = "checkbox";
  chk.className = "tree-checkbox";
  chk.checked = true;
  chk.title = "Toggle 3D Visibility";
  chk.addEventListener("change", (e) => {
    e.stopPropagation();
    if (fragmentIdMap) {
      applyVisibilityChange(fragmentIdMap, chk.checked, false);
    }
  });
  left.appendChild(chk);

  const labelEl = document.createElement("span");
  labelEl.className = "tree-label";
  labelEl.textContent = label;
  labelEl.title = label;
  left.appendChild(labelEl);

  if (count > 0) {
    const countEl = document.createElement("span");
    countEl.className = "tree-count";
    countEl.textContent = `[${count}]`;
    left.appendChild(countEl);
  }

  item.appendChild(left);

  const actions = document.createElement("div");
  actions.className = "tree-actions";

  const isoBtn = document.createElement("button");
  isoBtn.className = "tree-action-btn tree-btn-isolate";
  isoBtn.title = "Focus & Isolate (<>)";
  isoBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="7 9 2 12 7 15"></polyline><polyline points="17 9 22 12 17 15"></polyline></svg>`;
  isoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (fragmentIdMap) {
      document.querySelectorAll(".bim-tree .tree-item").forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");
      isolateVisibility(fragmentIdMap);
    }
  });
  actions.appendChild(isoBtn);

  const hideBtn = document.createElement("button");
  hideBtn.className = "tree-action-btn tree-btn-hide";
  hideBtn.title = "Hide / Show (✕)";
  hideBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  hideBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (fragmentIdMap) {
      const isCurrentlyHidden = item.classList.contains("is-hidden") || chk.checked === false;
      applyVisibilityChange(fragmentIdMap, isCurrentlyHidden, true);
    }
  });
  actions.appendChild(hideBtn);

  item.appendChild(actions);

  item.addEventListener("click", () => {
    document.querySelectorAll(".bim-tree .tree-item").forEach((el) => el.classList.remove("selected"));
    item.classList.add("selected");

    if (fragmentIdMap && state.outliner) {
      state.lastSelection = fragmentIdMap;
      state.outliner.clear("select");
      state.outliner.add("select", fragmentIdMap);
      showProperties(fragmentIdMap);
    }
  });

  node.appendChild(item);

  if (isBranch) {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";
    if (children && children.length > 0) {
      children.forEach((childEl: any) => childrenContainer.appendChild(childEl));
    }
    node.appendChild(childrenContainer);
  }

  return node;
}

// ── 4 Tree Mode Builders ─────────────────────────────────────────

export function buildModelsTree(model: any, container: HTMLElement) {
  container.innerHTML = "";
  const modelName = model.name || "BuildingBIMModel.ifc";
  let allModelMap = null;
  try {
    if (typeof model.getFragmentMap === "function") {
      allModelMap = model.getFragmentMap();
    }
  } catch (e) {}

  const modelNode = createBimTreeNode({
    label: modelName,
    count: getFragmentMapCount(allModelMap),
    fragmentIdMap: allModelMap,
    isBranch: false,
    expanded: false,
  });

  container.appendChild(modelNode);
}

export function buildObjectsTree(model: any, container: HTMLElement, spatialStructures: any, entities: any) {
  container.innerHTML = "";
  const modelName = model.name || "Project";
  let allModelMap = null;
  try {
    if (typeof model.getFragmentMap === "function") {
      allModelMap = model.getFragmentMap();
    }
  } catch (e) {}

  const rootNode = createBimTreeNode({
    label: modelName,
    count: 0,
    fragmentIdMap: allModelMap,
    isBranch: true,
    expanded: true,
    children: [],
  });

  const rootChildren = rootNode.querySelector(".tree-children");

  const siteNode = createBimTreeNode({
    label: "Site",
    count: 0,
    fragmentIdMap: allModelMap,
    isBranch: true,
    expanded: true,
    children: [],
  });

  const siteChildren = siteNode.querySelector(".tree-children");

  const buildingNode = createBimTreeNode({
    label: "Building",
    count: 0,
    fragmentIdMap: allModelMap,
    isBranch: true,
    expanded: true,
    children: [],
  });

  const buildingChildren = buildingNode.querySelector(".tree-children");

  const storyKeys = Object.keys(spatialStructures || {});
  if (storyKeys.length > 0) {
    storyKeys.forEach((key) => {
      const group = spatialStructures[key];
      const map = group?.map || group;
      const count = getFragmentMapCount(map);

      const storeyNode = createBimTreeNode({
        label: key,
        count: count,
        fragmentIdMap: map,
        isBranch: false,
      });
      if (buildingChildren) buildingChildren.appendChild(storeyNode);
    });
  } else if (entities && Object.keys(entities).length > 0) {
    for (const [typeName, entData] of Object.entries(entities)) {
      const map = (entData as any)?.map || entData;
      const count = getFragmentMapCount(map);
      const node = createBimTreeNode({
        label: `${getEntityIcon(typeName)} ${formatEntityName(typeName)}`,
        count: count,
        fragmentIdMap: map,
        isBranch: false,
      });
      if (buildingChildren) buildingChildren.appendChild(node);
    }
  }

  if (siteChildren) siteChildren.appendChild(buildingNode);
  if (rootChildren) rootChildren.appendChild(siteNode);
  container.appendChild(rootNode);
}

export function buildClassesTree(model: any, container: HTMLElement, entities: any) {
  container.innerHTML = "";
  if (!entities || Object.keys(entities).length === 0) {
    container.innerHTML = "<div class='empty-state'><p>No IFC classes found.</p></div>";
    return;
  }

  const sortedTypes = Object.keys(entities).sort();

  sortedTypes.forEach((typeName) => {
    const entGroup = entities[typeName];
    const map = entGroup?.map || entGroup;
    const count = getFragmentMapCount(map);
    const icon = getEntityIcon(typeName);
    const cleanName = formatEntityName(typeName);

    const classNode = createBimTreeNode({
      label: `${icon} ${cleanName}`,
      count: count,
      fragmentIdMap: map,
      isBranch: false,
    });

    container.appendChild(classNode);
  });
}

export function buildStoreysTree(model: any, container: HTMLElement, spatialStructures: any) {
  container.innerHTML = "";
  const modelName = model.name || "Building";
  let allModelMap = null;
  try {
    if (typeof model.getFragmentMap === "function") {
      allModelMap = model.getFragmentMap();
    }
  } catch (e) {}

  const rootNode = createBimTreeNode({
    label: modelName,
    count: 0,
    fragmentIdMap: allModelMap,
    isBranch: true,
    expanded: true,
    children: [],
  });

  const rootChildren = rootNode.querySelector(".tree-children");

  const buildingNode = createBimTreeNode({
    label: "Building",
    count: 0,
    fragmentIdMap: allModelMap,
    isBranch: true,
    expanded: true,
    children: [],
  });

  const buildingChildren = buildingNode.querySelector(".tree-children");

  const storyKeys = Object.keys(spatialStructures || {});
  if (storyKeys.length > 0) {
    const sortedStoryKeys = storyKeys.slice().sort((a, b) => {
      const la = a.toLowerCase();
      const lb = b.toLowerCase();
      if (la.includes("parapet")) return -1;
      if (lb.includes("parapet")) return 1;
      if (la.includes("roof")) return -1;
      if (lb.includes("roof")) return 1;
      if (la.includes("03") || la.includes("floor 3")) return -1;
      if (lb.includes("03") || lb.includes("floor 3")) return 1;
      if (la.includes("02") || la.includes("floor 2")) return -1;
      if (lb.includes("02") || lb.includes("floor 2")) return 1;
      if (la.includes("01") || la.includes("entry") || la.includes("ground")) return 1;
      if (lb.includes("01") || lb.includes("entry") || lb.includes("ground")) return -1;
      return a.localeCompare(b);
    });

    sortedStoryKeys.forEach((key) => {
      const group = spatialStructures[key];
      const map = group?.map || group;
      const count = getFragmentMapCount(map);

      const storeyNode = createBimTreeNode({
        label: key,
        count: count,
        fragmentIdMap: map,
        isBranch: false,
      });
      if (buildingChildren) buildingChildren.appendChild(storeyNode);
    });
  }

  if (rootChildren) rootChildren.appendChild(buildingNode);
  container.appendChild(rootNode);
}

export function getEntitiesClassification(model: any) {
  if (state.classifier) {
    try {
      state.classifier.byEntity(model);
    } catch (err) {
      console.warn("[BIM Tree] classifier.byEntity warning:", err);
    }
  }

  const listEntities = state.classifier?.list?.entities;
  if (listEntities && Object.keys(listEntities).length > 0) {
    return listEntities;
  }

  const fallbackEntities: any = {};
  if (model.data) {
    for (const [expressID, data] of model.data) {
      const type = data.type || "IFCELEMENT";
      if (!fallbackEntities[type]) {
        fallbackEntities[type] = { map: {} };
      }
      const entGroup = fallbackEntities[type];
      const keys = model.expressIDToKeyFragments?.get(expressID);
      if (keys && Array.isArray(keys)) {
        for (const key of keys) {
          const fragID = model.keyFragments.get(key);
          if (fragID) {
            if (!entGroup.map[fragID]) {
              entGroup.map[fragID] = new Set();
            }
            entGroup.map[fragID].add(expressID);
          }
        }
      }
    }
  }

  return fallbackEntities;
}

// ── Generic Three.js Hierarchy Tree Builder (GLTF / OBJ / STL / FBX / DAE / PLY) ────

export function buildGenericThreeTree(threeObject: any, container: HTMLElement) {
  container.innerHTML = "";

  function createThreeNode(obj: any) {
    const isMesh = obj.isMesh;
    const hasChildren = obj.children && obj.children.length > 0;
    const nodeName = obj.name || (isMesh ? `Mesh_${obj.id}` : `Group_${obj.id}`);

    const node = document.createElement("div");
    node.className = "tree-node" + (hasChildren ? " expanded" : "");

    const item = document.createElement("div");
    item.className = "tree-item";

    const left = document.createElement("div");
    left.className = "tree-item-left";

    if (hasChildren) {
      const toggle = document.createElement("div");
      toggle.className = "tree-toggle";
      toggle.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        node.classList.toggle("expanded");
      });
      left.appendChild(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.style.width = "14px";
      spacer.style.flexShrink = "0";
      left.appendChild(spacer);
    }

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "tree-checkbox";
    chk.checked = obj.visible !== false;
    chk.title = "Toggle 3D Visibility";
    chk.addEventListener("change", (e) => {
      e.stopPropagation();
      obj.visible = chk.checked;
      obj.traverse((child: any) => { child.visible = chk.checked; });
    });
    left.appendChild(chk);

    const labelEl = document.createElement("span");
    labelEl.className = "tree-label";
    labelEl.textContent = `${isMesh ? "🔷" : "📁"} ${nodeName}`;
    labelEl.title = nodeName;
    left.appendChild(labelEl);

    item.appendChild(left);

    const actions = document.createElement("div");
    actions.className = "tree-actions";

    const isoBtn = document.createElement("button");
    isoBtn.className = "tree-action-btn tree-btn-isolate";
    isoBtn.title = "Focus & Isolate (<>)";
    isoBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="7 9 2 12 7 15"></polyline><polyline points="17 9 22 12 17 15"></polyline></svg>`;
    isoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".bim-tree .tree-item").forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");

      if (state.currentModel) {
        state.currentModel.traverse((child: any) => { child.visible = false; });
        obj.visible = true;
        obj.traverse((child: any) => { child.visible = true; });
        focusCameraOnElements(null, obj);
      }
    });
    actions.appendChild(isoBtn);

    const hideBtn = document.createElement("button");
    hideBtn.className = "tree-action-btn tree-btn-hide";
    hideBtn.title = "Hide / Show (✕)";
    hideBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    hideBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextVis = !obj.visible;
      obj.visible = nextVis;
      obj.traverse((child: any) => { child.visible = nextVis; });
      chk.checked = nextVis;
      item.classList.toggle("is-hidden", !nextVis);
    });
    actions.appendChild(hideBtn);

    item.appendChild(actions);

    item.addEventListener("click", () => {
      document.querySelectorAll(".bim-tree .tree-item").forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");
      showProperties(obj);
    });

    node.appendChild(item);

    if (hasChildren) {
      const childContainer = document.createElement("div");
      childContainer.className = "tree-children";
      obj.children.forEach((child: any) => {
        childContainer.appendChild(createThreeNode(child));
      });
      node.appendChild(childContainer);
    }

    return node;
  }

  container.appendChild(createThreeNode(threeObject));
}

export async function renderBimTreeExplorer(model: any) {
  const treeModels = document.getElementById("tree-models");
  const treeObjects = document.getElementById("tree-objects");
  const treeClasses = document.getElementById("tree-classes");
  const treeStoreys = document.getElementById("tree-storeys");
  const searchInput = document.getElementById("explorer-search-input") as HTMLInputElement | null;
  const searchClear = document.getElementById("explorer-search-clear");

  if (!treeObjects || !treeClasses || !treeStoreys) return;

  const isIfcModel = Boolean(model.data || model.isFragmentsGroup || (model.fragments && model.fragments.size > 0));

  if (!isIfcModel) {
    if (treeModels) {
      treeModels.innerHTML = "";
      const modelNode = document.createElement("div");
      modelNode.className = "tree-node expanded";
      modelNode.innerHTML = `
        <div class="tree-item selected">
          <div class="tree-item-left">
            <span class="tree-label">📦 ${escapeHtml(model.name || "3D Model")}</span>
          </div>
        </div>
      `;
      treeModels.appendChild(modelNode);
    }

    buildGenericThreeTree(model, treeObjects);

    treeClasses.innerHTML = "<div class='empty-state'><p>IFC Classes are exclusive to BIM files (.ifc). Explore the full model hierarchy in the Objects tab.</p></div>";
    treeStoreys.innerHTML = "<div class='empty-state'><p>Spatial storeys are exclusive to BIM files (.ifc). Use section planes to inspect floors.</p></div>";
    return;
  }

  if (treeModels) treeModels.innerHTML = "<div class='empty-state'><p>Building Models List...</p></div>";
  treeObjects.innerHTML = "<div class='empty-state'><p>Building Objects Tree...</p></div>";
  treeClasses.innerHTML = "<div class='empty-state'><p>Building Classes Tree...</p></div>";
  treeStoreys.innerHTML = "<div class='empty-state'><p>Building Storeys Tree...</p></div>";

  if (state.relationsIndexer) {
    try {
      await state.relationsIndexer.process(model);
    } catch (err) {}
  }

  try {
    if (state.classifier) {
      await state.classifier.bySpatialStructure(model);
    }
  } catch (e) {}

  const entities = getEntitiesClassification(model);
  const spatialStructures = state.classifier?.list?.spatialStructures || {};

  if (treeModels) {
    try {
      buildModelsTree(model, treeModels);
    } catch (err) {}
  }

  try {
    buildObjectsTree(model, treeObjects, spatialStructures, entities);
  } catch (err) {}

  try {
    buildClassesTree(model, treeClasses, entities);
  } catch (err) {}

  try {
    buildStoreysTree(model, treeStoreys, spatialStructures);
  } catch (err) {}

  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = () => {
      const q = searchInput.value.trim().toLowerCase();
      if (searchClear) searchClear.style.display = q ? "inline-block" : "none";

      document.querySelectorAll(".bim-tree .tree-node").forEach((node: any) => {
        const labelEl = node.querySelector(":scope > .tree-item .tree-label");
        const origText = node._originalLabel || labelEl?.textContent || "";
        const rawText = origText.toLowerCase();

        if (!q) {
          node.style.display = "block";
          if (labelEl) labelEl.textContent = origText;
          return;
        }

        const idx = rawText.indexOf(q);
        const match = idx !== -1;

        if (match && labelEl) {
          const before = origText.slice(0, idx);
          const matched = origText.slice(idx, idx + q.length);
          const after = origText.slice(idx + q.length);
          labelEl.innerHTML = `${escapeHtml(before)}<span class="tree-highlight">${escapeHtml(matched)}</span>${escapeHtml(after)}`;
        } else if (labelEl) {
          labelEl.textContent = origText;
        }

        node.style.display = match ? "block" : "none";
        if (match) {
          let p = node.parentElement?.closest(".tree-node");
          while (p) {
            p.classList.add("expanded");
            p.style.display = "block";
            p = p.parentElement?.closest(".tree-node");
          }
        }
      });
    };
  }

  if (searchClear) {
    searchClear.onclick = () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input"));
      }
    };
  }
}
