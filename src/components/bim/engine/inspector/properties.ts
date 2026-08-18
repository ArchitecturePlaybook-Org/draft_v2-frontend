import { state, escapeHtml } from "../core/state";
import { showToast } from "../ui/notifications";
import { updateMobilePeekCard, setBottomSheetState } from "../ui/bottomSheet";

export function formatEntityName(name: string): string {
  if (!name) return "Element";
  let clean = name.replace(/^IFC/i, "");
  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2");
  return clean || name;
}

export function formatPropertyValue(key: string, val: any) {
  if (val === null || val === undefined) return { text: "—", html: null };
  if (typeof val === "boolean") {
    return {
      text: val ? "True" : "False",
      html: val ? `<span class="prop-bool-true">YES</span>` : `<span class="prop-bool-false">NO</span>`,
    };
  }

  let strVal = String(val);
  const lk = key.toLowerCase();

  if (typeof val === "number") {
    if (lk.includes("thermal") || lk.includes("uvalue") || lk.includes("transmittance")) {
      return { text: `${val.toFixed(3)} W/(m²K)`, html: null };
    }
    if (lk.includes("length") || lk.includes("height") || lk.includes("elevation") || lk.includes("perimeter") || lk.includes("depth") || lk.includes("span")) {
      return { text: `${val.toFixed(2)} m`, html: null };
    }
    if (lk.includes("width") || lk.includes("thick") || lk.includes("radius") || lk.includes("diameter") || lk.includes("offset")) {
      return { text: `${(val * 1000).toFixed(1)} mm`, html: null };
    }
    if (lk.includes("area") || lk.includes("footprint")) {
      return { text: `${val.toFixed(2)} m²`, html: null };
    }
    if (lk.includes("volume")) {
      return { text: `${val.toFixed(2)} m³`, html: null };
    }
    if (lk.includes("weight") || lk.includes("mass")) {
      return { text: `${val.toFixed(1)} kg`, html: null };
    }
    if (Number.isInteger(val)) {
      return { text: String(val), html: null };
    }
    return { text: val.toFixed(2), html: null };
  }

  return { text: strVal, html: null };
}

export async function resolveDeepIfcProperties(model: any, expressID: number) {
  const result: any = {
    identity: {},
    psets: {},
    quantities: {},
    typeProperties: {},
    materials: {},
    other: {},
    raw: {},
  };

  const rawProps = await model.getProperties(expressID);
  if (!rawProps) return result;
  result.raw = rawProps;

  const idKeys = ["Name", "GlobalId", "Tag", "ObjectType", "PredefinedType", "Description", "type", "expressID"];
  for (const k of idKeys) {
    if (rawProps[k] !== undefined && rawProps[k] !== null) {
      const v = typeof rawProps[k] === "object" && rawProps[k].value !== undefined ? rawProps[k].value : rawProps[k];
      result.identity[k] = v;
    }
  }

  for (const [key, rawVal] of Object.entries(rawProps)) {
    if (rawVal === null || rawVal === undefined) continue;
    let val = typeof rawVal === "object" && (rawVal as any).value !== undefined ? (rawVal as any).value : (typeof rawVal !== "object" ? rawVal : null);
    if (val === null || val === undefined || val === "") continue;

    const lk = key.toLowerCase();

    if (key.startsWith("Pset_") || key.includes("Common") || key.startsWith("CPset_") || key.startsWith("ePset_")) {
      const psetName = key.split(".")[0] || "Pset_Common";
      const propName = key.includes(".") ? key.split(".")[1] : key;
      if (!result.psets[psetName]) result.psets[psetName] = {};
      result.psets[psetName][propName] = val;
    }
    else if (key.startsWith("Qto_") || lk.includes("basequantities") || lk.includes("netvolume") || lk.includes("grossarea")) {
      const qtoName = key.split(".")[0] || "Qto_BaseQuantities";
      const quantName = key.includes(".") ? key.split(".")[1] : key;
      if (!result.quantities[qtoName]) result.quantities[qtoName] = {};
      result.quantities[qtoName][quantName] = val;
    }
    else if (lk.includes("material") || lk.includes("layer") || lk.includes("finish")) {
      result.materials[key] = val;
    }
    else if (lk.startsWith("type") || lk.includes("typename") || lk.includes("family")) {
      result.typeProperties[key] = val;
    }
    else if (lk.includes("length") || lk.includes("height") || lk.includes("width") || lk.includes("area") || lk.includes("volume") || lk.includes("thick")) {
      if (!result.quantities["Qto_Dimensions"]) result.quantities["Qto_Dimensions"] = {};
      result.quantities["Qto_Dimensions"][key] = val;
    }
    else if (idKeys.includes(key)) {
    }
    else {
      result.other[key] = val;
    }
  }

  if (Object.keys(result.psets).length === 0) {
    const commonProps: any = {};
    for (const [k, v] of Object.entries(result.other)) {
      const lk = k.toLowerCase();
      if (lk.includes("load") || lk.includes("fire") || lk.includes("external") || lk.includes("combust") || lk.includes("acoustic") || lk.includes("thermal")) {
        commonProps[k] = v;
        delete result.other[k];
      }
    }
    if (Object.keys(commonProps).length > 0) {
      result.psets[`Pset_${formatEntityName(rawProps.type || "Element")}Common`] = commonProps;
    }
  }

  return result;
}

export async function showProperties(fragmentIdMap: any) {
  if (!state.currentModel) return;

  const expressID = (Object.values(fragmentIdMap)[0] as any)?.[0] as number | undefined;
  if (expressID === undefined) return;

  const propEmpty = document.getElementById("properties-empty");
  const propData = document.getElementById("properties-data");
  const propName = document.getElementById("prop-element-name");
  const propType = document.getElementById("prop-element-type");
  const propBreadcrumbs = document.getElementById("prop-breadcrumbs");
  const propPsets = document.getElementById("prop-psets-container");
  const propRaw = document.getElementById("prop-raw-data");
  const propSearch = document.getElementById("prop-search-input") as HTMLInputElement | null;
  const rightSidebar = document.getElementById("right-sidebar") || document.getElementById("sidebar-right");

  if (propEmpty) propEmpty.style.display = "none";
  if (propData) propData.style.display = "block";

  if (propName) propName.textContent = "Loading...";
  if (propType) propType.textContent = "Wait...";
  if (propPsets) propPsets.innerHTML = "";
  if (propRaw) propRaw.textContent = "";
  if (propSearch) propSearch.value = "";

  try {
    const resolved = await resolveDeepIfcProperties(state.currentModel, expressID);
    state.currentElementProperties = resolved;

    const name = resolved.identity.Name || `Element #${expressID}`;
    const type = resolved.identity.type || "IFCELEMENT";

    if (propName) propName.textContent = name;
    if (propType) propType.textContent = `${formatEntityName(type)} (${type})`;
    if (propBreadcrumbs) propBreadcrumbs.textContent = `Model > ${formatEntityName(type)} > #${expressID}`;
    if (propRaw) propRaw.textContent = JSON.stringify(resolved.raw, null, 2);

    updateMobilePeekCard(name, formatEntityName(type));
    updateCompactMaterialCard(resolved, fragmentIdMap);

    function createPsetCard(title: string, data: any, icon = "📋") {
      const keys = Object.keys(data);
      if (keys.length === 0) return null;

      const card = document.createElement("div");
      card.className = "pset-card";

      const header = document.createElement("div");
      header.className = "pset-header";
      header.innerHTML = `
        <span>${icon} ${title}</span>
        <svg class="section-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      `;
      header.addEventListener("click", () => card.classList.toggle("collapsed"));
      card.appendChild(header);

      const table = document.createElement("table");
      table.className = "prop-table";
      const tbody = document.createElement("tbody");

      keys.forEach((k) => {
        const val = data[k];
        const formatted = formatPropertyValue(k, val);
        const row = document.createElement("tr");
        row.className = "prop-row";
        row.dataset.propKey = k;
        row.dataset.propVal = formatted.text;
        row.title = `Click to copy "${formatted.text}"`;

        const valContent = formatted.html || escapeHtml(formatted.text);
        row.innerHTML = `
          <td>${escapeHtml(k)}</td>
          <td>
            <div class="prop-val-wrap">
              <span>${valContent}</span>
              <span class="prop-copy-hint">Copy</span>
            </div>
          </td>
        `;

        row.addEventListener("click", () => {
          navigator.clipboard.writeText(formatted.text);
          const hint = row.querySelector(".prop-copy-hint");
          if (hint) {
            hint.textContent = "Copied!";
            setTimeout(() => { hint.textContent = "Copy"; }, 1500);
          }
          showToast(`Copied ${k}: "${formatted.text}"`);
        });

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      card.appendChild(table);
      return card;
    }

    if (propPsets) {
      const idCard = createPsetCard("Identity & Attributes", resolved.identity, "🏷️");
      if (idCard) propPsets.appendChild(idCard);

      for (const [psetName, psetData] of Object.entries(resolved.psets)) {
        const psetCard = createPsetCard(psetName, psetData, "⚙️");
        if (psetCard) propPsets.appendChild(psetCard);
      }

      for (const [qtoName, qtoData] of Object.entries(resolved.quantities)) {
        const qtoCard = createPsetCard(qtoName, qtoData, "📐");
        if (qtoCard) propPsets.appendChild(qtoCard);
      }

      if (Object.keys(resolved.materials).length > 0) {
        const matCard = createPsetCard("Materials & Finishes", resolved.materials, "🧱");
        if (matCard) propPsets.appendChild(matCard);
      }

      if (Object.keys(resolved.typeProperties).length > 0) {
        const typeCard = createPsetCard("Type Properties", resolved.typeProperties, "📑");
        if (typeCard) propPsets.appendChild(typeCard);
      }

      if (Object.keys(resolved.other).length > 0) {
        const otherCard = createPsetCard("General Properties", resolved.other, "📋");
        if (otherCard) propPsets.appendChild(otherCard);
      }
    }

    const drawer = document.getElementById("inspector-drawer");
    if (drawer) drawer.style.display = "flex";

    if (window.innerWidth > 768 && rightSidebar && !rightSidebar.classList.contains("visible")) {
      rightSidebar.classList.add("visible");
    }
  } catch (error) {
    console.warn("Failed to load properties", error);
  }
}

export function updateCompactMaterialCard(resolved: any, fragmentIdMap: any) {
  const card = document.getElementById("compact-material-card");
  if (!card) return;

  const catBadge = document.getElementById("mat-card-category");
  const nameHeader = document.getElementById("mat-card-name");
  const dimVal = document.getElementById("mat-metric-dimensions");
  const matVal = document.getElementById("mat-metric-material");
  const elevVal = document.getElementById("mat-metric-elevation");
  const guidVal = document.getElementById("mat-metric-guid");

  const name = resolved.identity.Name || `Element #${resolved.identity.expressID || ""}`;
  const type = resolved.identity.type || "IFCELEMENT";

  if (catBadge) catBadge.textContent = formatEntityName(type);
  if (nameHeader) nameHeader.textContent = name;
  if (guidVal) guidVal.textContent = resolved.identity.GlobalId || resolved.identity.Tag || `ID #${resolved.identity.expressID}`;

  let l: any = null, w: any = null, h: any = null, thick: any = null;
  const searchObj = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number" || typeof v === "string") {
        const lk = k.toLowerCase();
        const num = parseFloat(v as string);
        if (!isNaN(num)) {
          if (!l && (lk.includes("length") || lk.includes("span"))) l = num;
          if (!w && (lk.includes("width") || lk.includes("depth") || lk.includes("breadth"))) w = num;
          if (!h && (lk.includes("height") || lk.includes("overallheight"))) h = num;
          if (!thick && (lk.includes("thick") || lk.includes("wallthickness"))) thick = num;
        }
      } else if (typeof v === "object") {
        searchObj(v);
      }
    }
  };

  searchObj(resolved.quantities);
  searchObj(resolved.psets);
  searchObj(resolved.raw);

  let dimStr = "";
  if (l !== null && w !== null && h !== null) {
    dimStr = `${l > 10 ? (l/1000).toFixed(2) : l.toFixed(2)}m × ${w > 10 ? (w/1000).toFixed(2) : w.toFixed(2)}m × ${h > 10 ? (h/1000).toFixed(2) : h.toFixed(2)}m`;
  } else if (l !== null && thick !== null) {
    dimStr = `L: ${l.toFixed(2)}m × Thk: ${(thick * 1000).toFixed(0)}mm`;
  } else if (h !== null && w !== null) {
    dimStr = `H: ${h.toFixed(2)}m × W: ${w.toFixed(2)}m`;
  } else if (l !== null) {
    dimStr = `Length: ${l.toFixed(2)}m`;
  } else if (h !== null) {
    dimStr = `Height: ${h.toFixed(2)}m`;
  } else {
    dimStr = "Standard Component Spec";
  }
  if (dimVal) dimVal.textContent = dimStr;

  let matStr = "Standard IFC Material";
  if (Object.keys(resolved.materials).length > 0) {
    matStr = Object.values(resolved.materials)[0] as string;
  } else {
    for (const [k, v] of Object.entries(resolved.raw)) {
      if (k.toLowerCase().includes("material") && typeof v === "string") {
        matStr = v;
        break;
      }
    }
  }
  if (matVal) matVal.textContent = String(matStr);

  let elev = resolved.raw?.Elevation || resolved.raw?.LevelElevation || resolved.identity?.Elevation;
  if (elev !== undefined && elev !== null && !isNaN(parseFloat(elev))) {
    const num = parseFloat(elev);
    if (elevVal) elevVal.textContent = `${num >= 0 ? "+" : ""}${num.toFixed(3)} m AFF`;
  } else {
    if (elevVal) elevVal.textContent = "Verified on Storey Datum";
  }

  card.style.display = "flex";
  card.classList.add("visible");

  const btnClose = document.getElementById("btn-mat-card-close");
  const handleBar = document.getElementById("material-card-handle");
  const btnIsolate = document.getElementById("btn-mat-isolate");
  const btnMeasure = document.getElementById("btn-mat-measure-clearance");
  const btnFullPsets = document.getElementById("btn-mat-all-details");

  if (btnClose) {
    btnClose.onclick = () => {
      card.style.display = "none";
      card.classList.remove("visible");
    };
  }
  if (handleBar) {
    handleBar.onclick = () => {
      card.style.display = "none";
      card.classList.remove("visible");
    };
  }
  if (btnIsolate && fragmentIdMap) {
    btnIsolate.onclick = () => {
      import("../explorer/visibility").then((m) => m.isolateVisibility(fragmentIdMap));
      showToast(`Isolated ${formatEntityName(type)}`);
    };
  }
  if (btnMeasure) {
    btnMeasure.onclick = () => {
      const btnToolMeasure = document.getElementById("tool-measure") || document.getElementById("radial-btn-measure");
      if (btnToolMeasure) btnToolMeasure.click();
      card.style.display = "none";
    };
  }
  if (btnFullPsets) {
    btnFullPsets.onclick = () => {
      const drawer = document.getElementById("inspector-drawer");
      const rightSidebar = document.getElementById("right-sidebar");
      if (drawer) drawer.style.display = "flex";
      if (rightSidebar) rightSidebar.classList.add("visible");
      card.style.display = "none";
    };
  }
}

export function clearProperties() {
  const drawer = document.getElementById("inspector-drawer");
  if (drawer) drawer.style.display = "none";

  const peekCard = document.getElementById("mobile-peek-card");
  if (peekCard) peekCard.style.display = "none";

  const matCard = document.getElementById("compact-material-card");
  if (matCard) {
    matCard.style.display = "none";
    matCard.classList.remove("visible");
  }

  if (window.innerWidth <= 768 && state.bottomSheetState === "peek") {
    setBottomSheetState("closed");
  }
}
