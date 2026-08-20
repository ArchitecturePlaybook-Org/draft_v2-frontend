import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { state } from "../core/state";
import { showToast, setHint } from "../ui/notifications";
import { renderLabels, wakeRenderer } from "../core/viewer";

// ── Preview Object Initializers & Ticks ──────────────────────────
export let snapMarkerGroup: THREE.Group | null = null;
export let startPinGroup: THREE.Group | null = null;
export let rubberbandLine: THREE.Line | null = null;
export let liveTriangleGroup: THREE.Group | null = null;
export let liveHLine: THREE.Line | null = null;
export let liveVLine: THREE.Line | null = null;
export let liveRightAngle: THREE.Line | null = null;
export let areaPreviewGroup: THREE.Group | null = null;
export let areaPreviewLine: THREE.Line | null = null;
export let areaPreviewMesh: THREE.Mesh | null = null;
export const areaPreviewPins: THREE.Group[] = [];

// ── Architectural Green Hatch Pattern & UV Generator ────────────
let _sharedHatchTexture: THREE.CanvasTexture | null = null;

export function getCADGreenHatchTexture(): THREE.CanvasTexture {
  if (_sharedHatchTexture) return _sharedHatchTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Emerald translucent fill background
    ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
    ctx.fillRect(0, 0, 64, 64);

    // 45-degree crisp architectural hatch lines
    ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";

    ctx.beginPath();
    // Wrap-around seamless diagonal lines
    ctx.moveTo(-16, 48); ctx.lineTo(48, -16);
    ctx.moveTo(0, 64);   ctx.lineTo(64, 0);
    ctx.moveTo(16, 80);  ctx.lineTo(80, 16);
    ctx.moveTo(-16, 16); ctx.lineTo(16, -16);
    ctx.moveTo(48, 80);  ctx.lineTo(80, 48);
    ctx.stroke();
  }

  _sharedHatchTexture = new THREE.CanvasTexture(canvas);
  _sharedHatchTexture.wrapS = THREE.RepeatWrapping;
  _sharedHatchTexture.wrapT = THREE.RepeatWrapping;
  return _sharedHatchTexture;
}

export function computePolygonUVs(points: THREE.Vector3[], normal: THREE.Vector3, hatchDensity: number = 1.0): number[] {
  const norm = normal.clone().normalize();
  const uDir = new THREE.Vector3();
  if (Math.abs(norm.y) < 0.9) {
    uDir.crossVectors(norm, new THREE.Vector3(0, 1, 0)).normalize();
  } else {
    uDir.crossVectors(norm, new THREE.Vector3(1, 0, 0)).normalize();
  }
  const vDir = new THREE.Vector3().crossVectors(norm, uDir).normalize();

  const uvs: number[] = [];
  for (const p of points) {
    const u = p.dot(uDir) * hatchDensity;
    const v = p.dot(vDir) * hatchDensity;
    uvs.push(u, v);
  }
  return uvs;
}

export function initSnapPreviewObjects() {
  if (snapMarkerGroup || !state.world || !state.world.scene) return;

  // 1. Hover Snap Marker
  snapMarkerGroup = new THREE.Group();
  snapMarkerGroup.visible = false;

  const innerGeom = new THREE.SphereGeometry(0.35, 16, 16);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const innerMesh = new THREE.Mesh(innerGeom, innerMat);
  innerMesh.name = "innerDot";
  innerMesh.renderOrder = 9999;
  snapMarkerGroup.add(innerMesh);

  const outerGeom = new THREE.RingGeometry(0.55, 0.9, 24);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x6366f1,
    depthTest: false,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const outerMesh = new THREE.Mesh(outerGeom, outerMat);
  outerMesh.name = "outerRing";
  outerMesh.renderOrder = 9999;
  snapMarkerGroup.add(outerMesh);

  state.world.scene.three.add(snapMarkerGroup);

  // 2. Point 1 Locked Indicator Pin
  startPinGroup = new THREE.Group();
  startPinGroup.visible = false;

  const startInnerGeom = new THREE.SphereGeometry(0.35, 16, 16);
  const startInnerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const startInnerMesh = new THREE.Mesh(startInnerGeom, startInnerMat);
  startInnerMesh.name = "startInnerDot";
  startInnerMesh.renderOrder = 9999;
  startPinGroup.add(startInnerMesh);

  const startOuterGeom = new THREE.RingGeometry(0.55, 0.9, 24);
  const startOuterMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const startOuterMesh = new THREE.Mesh(startOuterGeom, startOuterMat);
  startOuterMesh.name = "startOuterRing";
  startOuterMesh.renderOrder = 9999;
  startPinGroup.add(startOuterMesh);

  state.world.scene.three.add(startPinGroup);

  // 3. Live Rubberband Line
  const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const lineMat = new THREE.LineDashedMaterial({
    color: 0x000000,
    dashSize: 0.25,
    gapSize: 0.12,
    depthTest: false,
  });
  rubberbandLine = new THREE.Line(lineGeom, lineMat);
  rubberbandLine.renderOrder = 9998;
  rubberbandLine.visible = false;

  state.world.scene.three.add(rubberbandLine);

  // 4. Live Orthogonal Preview Triangle
  liveTriangleGroup = new THREE.Group();
  liveTriangleGroup.visible = false;

  const liveHGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const liveHMat = new THREE.LineDashedMaterial({
    color: 0x000000,
    dashSize: 0.22,
    gapSize: 0.12,
    depthTest: false,
  });
  liveHLine = new THREE.Line(liveHGeom, liveHMat);
  liveHLine.renderOrder = 9998;
  liveTriangleGroup.add(liveHLine);

  const liveVGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const liveVMat = new THREE.LineDashedMaterial({
    color: 0x000000,
    dashSize: 0.22,
    gapSize: 0.12,
    depthTest: false,
  });
  liveVLine = new THREE.Line(liveVGeom, liveVMat);
  liveVLine.renderOrder = 9998;
  liveTriangleGroup.add(liveVLine);

  const liveCornerGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const liveCornerMat = new THREE.LineBasicMaterial({
    color: 0x000000,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  });
  liveRightAngle = new THREE.Line(liveCornerGeom, liveCornerMat);
  liveRightAngle.renderOrder = 9998;
  liveTriangleGroup.add(liveRightAngle);

  state.world.scene.three.add(liveTriangleGroup);

  // 5. Live Area Measurement Polygon & Vertex Pins Preview
  areaPreviewGroup = new THREE.Group();
  areaPreviewGroup.visible = false;

  const areaLineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const areaLineMat = new THREE.LineBasicMaterial({
    color: 0x10b981,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  areaPreviewLine = new THREE.Line(areaLineGeom, areaLineMat);
  areaPreviewLine.renderOrder = 9998;
  areaPreviewGroup.add(areaPreviewLine);

  const areaMeshGeom = new THREE.BufferGeometry();
  const areaMeshMat = new THREE.MeshBasicMaterial({
    map: getCADGreenHatchTexture(),
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  areaPreviewMesh = new THREE.Mesh(areaMeshGeom, areaMeshMat);
  areaPreviewMesh.renderOrder = 9997;
  areaPreviewGroup.add(areaPreviewMesh);

  state.world.scene.three.add(areaPreviewGroup);
}

export function createArchitecturalSlashTick(position: THREE.Vector3, color: number = 0x000000): THREE.Line {
  const arm = 0.45;
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-arm, -arm, 0),
    new THREE.Vector3(arm, arm, 0),
  ]);
  const mat = new THREE.LineBasicMaterial({
    color: color,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.Line(geom, mat);
  line.position.copy(position);
  line.renderOrder = 9999;
  return line;
}

export function createSolidDimensionLine(pA: THREE.Vector3, pB: THREE.Vector3, color: number = 0x000000): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
  const mat = new THREE.LineBasicMaterial({
    color: color,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.Line(geom, mat);
  line.renderOrder = 9999;
  return line;
}

export function createDashedLine(pA: THREE.Vector3, pB: THREE.Vector3, color: number = 0x000000): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
  const mat = new THREE.LineDashedMaterial({
    color: color,
    dashSize: 0.22,
    gapSize: 0.12,
    depthTest: false,
  });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  line.renderOrder = 9998;
  return line;
}

export function createRightAngleIndicator(corner: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3): THREE.Line {
  const dir1 = new THREE.Vector3().subVectors(p1, corner).normalize();
  const dir2 = new THREE.Vector3().subVectors(p2, corner).normalize();

  const armLength = Math.min(
    0.22,
    corner.distanceTo(p1) * 0.25,
    corner.distanceTo(p2) * 0.25
  );

  const pt1 = corner.clone().addScaledVector(dir1, armLength);
  const ptCorner = corner.clone().addScaledVector(dir1, armLength).addScaledVector(dir2, armLength);
  const pt2 = corner.clone().addScaledVector(dir2, armLength);

  const geom = new THREE.BufferGeometry().setFromPoints([pt1, ptCorner, pt2]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  });
  const line = new THREE.Line(geom, mat);
  line.renderOrder = 9998;
  return line;
}

export function createAngularArcIndicator(apex: THREE.Vector3, pHoriz: THREE.Vector3, pHypot: THREE.Vector3): THREE.Line | null {
  const dirH = new THREE.Vector3().subVectors(pHoriz, apex).normalize();
  const dirHyp = new THREE.Vector3().subVectors(pHypot, apex).normalize();

  const totalAngle = dirH.angleTo(dirHyp);
  if (totalAngle < 0.05) return null;

  const normal = new THREE.Vector3().crossVectors(dirH, dirHyp).normalize();
  if (normal.lengthSq() < 0.0001) normal.set(0, 1, 0);

  const radius = Math.min(0.35, apex.distanceTo(pHoriz) * 0.35, apex.distanceTo(pHypot) * 0.35);
  const arcSegments = 16;
  const arcPoints: THREE.Vector3[] = [];

  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = t * totalAngle;
    const pt = dirH.clone().applyAxisAngle(normal, angle).multiplyScalar(radius).add(apex);
    arcPoints.push(pt);
  }

  const geom = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const mat = new THREE.LineBasicMaterial({
    color: 0xa855f7,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  });
  const line = new THREE.Line(geom, mat);
  line.renderOrder = 9998;
  return line;
}

// ── Multi-Unit Conversion & Formatting Helpers ───────────────────

export function formatArchitecturalFeetInches(meters: number): string {
  const totalInches = meters * 39.37007874;
  let feet = Math.floor(totalInches / 12);
  let inches = totalInches - feet * 12;

  const fraction16ths = Math.round((inches - Math.floor(inches)) * 16);
  let wholeInches = Math.floor(inches);

  if (fraction16ths === 16) {
    wholeInches += 1;
    if (wholeInches === 12) {
      feet += 1;
      wholeInches = 0;
    }
  }

  let fractionStr = "";
  if (fraction16ths > 0 && fraction16ths < 16) {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(fraction16ths, 16);
    fractionStr = ` ${fraction16ths / divisor}/${16 / divisor}`;
  }

  const inchStr = `${wholeInches}${fractionStr}"`;
  return `${feet}'-${inchStr}`;
}

export function formatLength(meters: number, unit = state.measurementUnit): { valueStr: string; unitStr: string; fullStr: string } {
  if (meters === undefined || meters === null || isNaN(meters)) {
    return { valueStr: "0.00", unitStr: "m", fullStr: "0.00 m" };
  }
  const u = unit || state.measurementUnit || "m";
  switch (u) {
    case "mm": {
      const val = meters * 1000;
      const str = val >= 100 ? Math.round(val).toLocaleString() : val.toFixed(1);
      return { valueStr: str, unitStr: "mm", fullStr: `${str} mm` };
    }
    case "cm": {
      const val = meters * 100;
      const str = val.toFixed(1);
      return { valueStr: str, unitStr: "cm", fullStr: `${str} cm` };
    }
    case "ft": {
      const val = meters * 3.280839895;
      const str = val.toFixed(2);
      return { valueStr: str, unitStr: "ft", fullStr: `${str} ft` };
    }
    case "in": {
      const val = meters * 39.37007874;
      const str = val.toFixed(1);
      return { valueStr: str, unitStr: "in", fullStr: `${str} in` };
    }
    case "ft-in": {
      const formatted = formatArchitecturalFeetInches(meters);
      return { valueStr: formatted, unitStr: "", fullStr: formatted };
    }
    case "m":
    default: {
      const str = meters.toFixed(2);
      return { valueStr: str, unitStr: "m", fullStr: `${str} m` };
    }
  }
}

export function formatArea(sqMeters: number, unit = state.measurementUnit): { valueStr: string; unitStr: string; fullStr: string } {
  if (sqMeters === undefined || sqMeters === null || isNaN(sqMeters)) {
    return { valueStr: "0.00", unitStr: "m²", fullStr: "0.00 m²" };
  }
  const u = unit || state.measurementUnit || "m";
  switch (u) {
    case "mm": {
      const val = sqMeters * 1000000;
      const str = Math.round(val).toLocaleString();
      return { valueStr: str, unitStr: "mm²", fullStr: `${str} mm²` };
    }
    case "cm": {
      const val = sqMeters * 10000;
      const str = Math.round(val).toLocaleString();
      return { valueStr: str, unitStr: "cm²", fullStr: `${str} cm²` };
    }
    case "ft":
    case "ft-in": {
      const val = sqMeters * 10.7639104;
      const str = val.toFixed(2);
      return { valueStr: str, unitStr: "sq ft", fullStr: `${str} sq ft` };
    }
    case "in": {
      const val = sqMeters * 1550.0031;
      const str = Math.round(val).toLocaleString();
      return { valueStr: str, unitStr: "sq in", fullStr: `${str} sq in` };
    }
    case "m":
    default: {
      const str = sqMeters.toFixed(2);
      return { valueStr: str, unitStr: "m²", fullStr: `${str} m²` };
    }
  }
}

export function setMeasurementUnit(unit: string) {
  state.measurementUnit = unit;
  try {
    localStorage.setItem("bim_measure_unit", unit);
  } catch (e) {}
  updateAllMeasurementBadges();

  const select = document.getElementById("measure-unit-select") as HTMLSelectElement | null;
  if (select && select.value !== unit) {
    select.value = unit;
  }
}

export function updateAllMeasurementBadges() {
  if (state.orthogonalDimensions && state.orthogonalDimensions.length > 0) {
    for (const group of state.orthogonalDimensions) {
      if (group && typeof group.updateBadges === "function") {
        group.updateBadges();
      }
    }
    resolveScreenSpaceCollisions();
    renderLabels();
    wakeRenderer();
  }
}

export function createCADBadge(prefix: string, valueStr: string, unit: string, position: THREE.Vector3, extraClass: string = "", onDelete: (() => void) | null = null, subtitle: string | null = null): CSS2DObject {
  const badge = document.createElement("div");
  badge.className = `cad-dimension-badge ${extraClass}`;
  badge.style.display = "flex";
  badge.style.alignItems = "center";
  badge.style.gap = "6px";
  badge.style.cursor = "pointer";
  badge.style.pointerEvents = "auto";

  let _currentVal = valueStr;
  let _currentUnit = unit;

  const content = document.createElement("div");
  content.className = "cad-badge-content";
  content.innerHTML = `
    <span class="cad-badge-prefix">${prefix}</span>
    <span class="cad-badge-value">${valueStr}</span>
    <span class="cad-badge-unit">${unit}</span>
    ${subtitle ? `<span class="cad-badge-sub" style="font-size:0.6rem; opacity:0.8; margin-left:4px;">${subtitle}</span>` : ""}
  `;
  badge.appendChild(content);

  badge.addEventListener("pointerdown", (e) => e.stopPropagation());
  badge.addEventListener("mousedown", (e) => e.stopPropagation());
  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    const copyText = `${_currentVal}${_currentUnit ? " " + _currentUnit : ""}`.trim();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(copyText);
    }
    showToast(`Copied measurement: "${copyText}"`);
  });

  if (onDelete) {
    const delBtn = document.createElement("button");
    delBtn.className = "dim-badge-delete";
    delBtn.title = "Delete this measurement";
    delBtn.innerHTML = `&times;`;
    delBtn.style.background = "transparent";
    delBtn.style.border = "none";
    delBtn.style.color = "#f87171";
    delBtn.style.fontSize = "1rem";
    delBtn.style.lineHeight = "1";
    delBtn.style.cursor = "pointer";
    delBtn.style.padding = "0 3px";
    delBtn.style.marginLeft = "3px";
    delBtn.style.pointerEvents = "auto";

    const triggerDelete = (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      onDelete();
    };

    delBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    delBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    delBtn.addEventListener("click", triggerDelete);
    badge.appendChild(delBtn);
  }

  const label = new CSS2DObject(badge);
  label.position.copy(position);
  label.name = "cadBadge";
  label.renderOrder = 9999;

  (label as any).updateContent = (newPrefix: string, newValStr: string, newUnitStr: string, newSubtitle: string | null = null) => {
    _currentVal = newValStr;
    _currentUnit = newUnitStr;
    const prefixEl = content.querySelector(".cad-badge-prefix");
    const valEl = content.querySelector(".cad-badge-value");
    const unitEl = content.querySelector(".cad-badge-unit");
    let subEl = content.querySelector(".cad-badge-sub");

    if (prefixEl) prefixEl.textContent = newPrefix;
    if (valEl) valEl.textContent = newValStr;
    if (unitEl) unitEl.textContent = newUnitStr;

    if (newSubtitle) {
      if (!subEl) {
        const newSubEl = document.createElement("span");
        newSubEl.className = "cad-badge-sub";
        newSubEl.style.fontSize = "0.6rem";
        newSubEl.style.opacity = "0.8";
        newSubEl.style.marginLeft = "4px";
        content.appendChild(newSubEl);
        subEl = newSubEl;
      }
      subEl.textContent = newSubtitle;
    } else if (subEl) {
      subEl.remove();
    }
  };

  return label;
}

// ── Dimension Group Classes ──────────────────────────────────────

export class OrthogonalDimensionGroup {
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  objects: any[] = [];
  ticks: THREE.Line[] = [];
  badges: CSS2DObject[] = [];
  mainBadge: CSS2DObject | null = null;
  hBadge: CSS2DObject | null = null;
  vBadge: CSS2DObject | null = null;
  xBadge: CSS2DObject | null = null;
  zBadge: CSS2DObject | null = null;
  D: number = 0;
  dx: number = 0;
  dy: number = 0;
  dz: number = 0;
  distH: number = 0;
  distV: number = 0;
  mode: string = "simple";
  angleTag: string = "";

  constructor(p1: THREE.Vector3, p2: THREE.Vector3) {
    this.p1 = p1.clone();
    this.p2 = p2.clone();

    const D = this.p1.distanceTo(this.p2);
    if (D < 0.001) return;

    this.D = D;
    const dx = Math.abs(this.p2.x - this.p1.x);
    const dy = Math.abs(this.p2.y - this.p1.y);
    const dz = Math.abs(this.p2.z - this.p1.z);
    this.dx = dx;
    this.dy = dy;
    this.dz = dz;

    const eps = 0.05;
    const activeX = dx > eps;
    const activeY = dy > eps;
    const activeZ = dz > eps;
    const activeCount = (activeX ? 1 : 0) + (activeY ? 1 : 0) + (activeZ ? 1 : 0);

    const handleDelete = () => {
      this.dispose();
      const idx = state.orthogonalDimensions.indexOf(this);
      if (idx !== -1) state.orthogonalDimensions.splice(idx, 1);
      const toolDeleteMeasurements = document.getElementById("tool-delete-measurements");
      if (state.orthogonalDimensions.length === 0 && toolDeleteMeasurements) {
        toolDeleteMeasurements.style.display = "none";
      }
      resolveScreenSpaceCollisions();
      renderLabels();
      wakeRenderer();
      showToast("Measurement deleted");
    };

    // 1. Hypotenuse Solid Line & Ticks
    const mainLine = createSolidDimensionLine(this.p1, this.p2, 0x818cf8);
    state.world.scene.three.add(mainLine);
    this.objects.push(mainLine);

    const tick1 = createArchitecturalSlashTick(this.p1, 0x818cf8);
    const tick2 = createArchitecturalSlashTick(this.p2, 0x818cf8);
    state.world.scene.three.add(tick1, tick2);
    this.objects.push(tick1, tick2);
    this.ticks.push(tick1, tick2);

    const formattedD = formatLength(this.D);

    if (activeCount <= 1) {
      this.mode = "simple";
      const midDirect = new THREE.Vector3().addVectors(this.p1, this.p2).multiplyScalar(0.5);
      this.mainBadge = createCADBadge("D:", formattedD.valueStr, formattedD.unitStr, midDirect, "cad-badge-hypotenuse", handleDelete);
      state.world.scene.three.add(this.mainBadge);
      this.objects.push(this.mainBadge);
      this.badges.push(this.mainBadge);
      this.updateTicks();
      renderLabels();
      return;
    }

    if (activeY && (activeX || activeZ)) {
      this.mode = "tri_y";
      const pCorner = new THREE.Vector3(this.p2.x, this.p1.y, this.p2.z);
      const distH = Math.sqrt(dx * dx + dz * dz);
      const distV = dy;
      this.distH = distH;
      this.distV = distV;
      const angleRad = Math.atan2(distV, distH);
      const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);
      this.angleTag = `∠ ${angleDeg}°`;

      const midDirect = new THREE.Vector3().addVectors(this.p1, this.p2).multiplyScalar(0.5);
      const dirHypOut = new THREE.Vector3().subVectors(midDirect, pCorner).normalize();
      const posDirect = midDirect.clone().addScaledVector(dirHypOut, 0.18);
      this.mainBadge = createCADBadge("D:", formattedD.valueStr, formattedD.unitStr, posDirect, "cad-badge-hypotenuse", handleDelete, this.angleTag);
      state.world.scene.three.add(this.mainBadge);
      this.objects.push(this.mainBadge);
      this.badges.push(this.mainBadge);

      const hLine = createDashedLine(this.p1, pCorner, 0x38bdf8);
      state.world.scene.three.add(hLine);
      this.objects.push(hLine);

      const hTick = createArchitecturalSlashTick(pCorner, 0x38bdf8);
      state.world.scene.three.add(hTick);
      this.objects.push(hTick);
      this.ticks.push(hTick);

      const midH = new THREE.Vector3().addVectors(this.p1, pCorner).multiplyScalar(0.5);
      const posH = midH.clone().add(new THREE.Vector3(0, -0.18, 0));
      const formattedH = formatLength(distH);
      this.hBadge = createCADBadge("ΔH:", formattedH.valueStr, formattedH.unitStr, posH, "cad-badge-horizontal", handleDelete);
      state.world.scene.three.add(this.hBadge);
      this.objects.push(this.hBadge);
      this.badges.push(this.hBadge);

      const vLine = createDashedLine(pCorner, this.p2, 0xf59e0b);
      state.world.scene.three.add(vLine);
      this.objects.push(vLine);

      const midV = new THREE.Vector3().addVectors(pCorner, this.p2).multiplyScalar(0.5);
      const dirVOut = new THREE.Vector3().subVectors(pCorner, this.p1).setY(0).normalize();
      const posV = midV.clone().addScaledVector(dirVOut, 0.18);
      const formattedV = formatLength(distV);
      this.vBadge = createCADBadge("ΔV:", formattedV.valueStr, formattedV.unitStr, posV, "cad-badge-vertical", handleDelete);
      state.world.scene.three.add(this.vBadge);
      this.objects.push(this.vBadge);
      this.badges.push(this.vBadge);

      const arc = createAngularArcIndicator(this.p1, pCorner, this.p2);
      if (arc) {
        state.world.scene.three.add(arc);
        this.objects.push(arc);
      }

      const cornerSymbol = createRightAngleIndicator(pCorner, this.p1, this.p2);
      state.world.scene.three.add(cornerSymbol);
      this.objects.push(cornerSymbol);
    } else if (!activeY && activeX && activeZ) {
      this.mode = "tri_xz";
      const pCorner = new THREE.Vector3(this.p2.x, this.p1.y, this.p1.z);
      this.distH = dx;
      this.distV = dz;
      const angleRad = Math.atan2(dz, dx);
      const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);
      this.angleTag = `∠ ${angleDeg}°`;

      const midDirect = new THREE.Vector3().addVectors(this.p1, this.p2).multiplyScalar(0.5);
      const dirHypOut = new THREE.Vector3().subVectors(midDirect, pCorner).normalize();
      const posDirect = midDirect.clone().addScaledVector(dirHypOut, 0.18);
      this.mainBadge = createCADBadge("D:", formattedD.valueStr, formattedD.unitStr, posDirect, "cad-badge-hypotenuse", handleDelete, this.angleTag);
      state.world.scene.three.add(this.mainBadge);
      this.objects.push(this.mainBadge);
      this.badges.push(this.mainBadge);

      const xLine = createDashedLine(this.p1, pCorner, 0x38bdf8);
      state.world.scene.three.add(xLine);
      this.objects.push(xLine);

      const midX = new THREE.Vector3().addVectors(this.p1, pCorner).multiplyScalar(0.5);
      const dirXOut = new THREE.Vector3().subVectors(pCorner, this.p2).normalize();
      const posX = midX.clone().addScaledVector(dirXOut, 0.18);
      const formattedX = formatLength(dx);
      this.xBadge = createCADBadge("ΔX:", formattedX.valueStr, formattedX.unitStr, posX, "cad-badge-horizontal", handleDelete);
      state.world.scene.three.add(this.xBadge);
      this.objects.push(this.xBadge);
      this.badges.push(this.xBadge);

      const zLine = createDashedLine(pCorner, this.p2, 0xf59e0b);
      state.world.scene.three.add(zLine);
      this.objects.push(zLine);

      const midZ = new THREE.Vector3().addVectors(pCorner, this.p2).multiplyScalar(0.5);
      const dirZOut = new THREE.Vector3().subVectors(pCorner, this.p1).normalize();
      const posZ = midZ.clone().addScaledVector(dirZOut, 0.18);
      const formattedZ = formatLength(dz);
      this.zBadge = createCADBadge("ΔZ:", formattedZ.valueStr, formattedZ.unitStr, posZ, "cad-badge-vertical", handleDelete);
      state.world.scene.three.add(this.zBadge);
      this.objects.push(this.zBadge);
      this.badges.push(this.zBadge);

      const arc = createAngularArcIndicator(this.p1, pCorner, this.p2);
      if (arc) {
        state.world.scene.three.add(arc);
        this.objects.push(arc);
      }

      const cornerSymbol = createRightAngleIndicator(pCorner, this.p1, this.p2);
      state.world.scene.three.add(cornerSymbol);
      this.objects.push(cornerSymbol);
    }

    this.updateTicks();
    renderLabels();
  }

  updateBadges() {
    const formattedD = formatLength(this.D);
    if (this.mode === "simple") {
      (this.mainBadge as any)?.updateContent("D:", formattedD.valueStr, formattedD.unitStr);
    } else if (this.mode === "tri_y") {
      (this.mainBadge as any)?.updateContent("D:", formattedD.valueStr, formattedD.unitStr, this.angleTag);
      if (this.hBadge) {
        const fh = formatLength(this.distH);
        (this.hBadge as any).updateContent("ΔH:", fh.valueStr, fh.unitStr);
      }
      if (this.vBadge) {
        const fv = formatLength(this.distV);
        (this.vBadge as any).updateContent("ΔV:", fv.valueStr, fv.unitStr);
      }
    } else if (this.mode === "tri_xz") {
      (this.mainBadge as any)?.updateContent("D:", formattedD.valueStr, formattedD.unitStr, this.angleTag);
      if (this.xBadge) {
        const fx = formatLength(this.dx);
        (this.xBadge as any).updateContent("ΔX:", fx.valueStr, fx.unitStr);
      }
      if (this.zBadge) {
        const fz = formatLength(this.dz);
        (this.zBadge as any).updateContent("ΔZ:", fz.valueStr, fz.unitStr);
      }
    }
  }

  updateTicks() {
    if (!state.world || !state.world.camera || !state.world.camera.three) return;
    const camQuat = state.world.camera.three.quaternion;
    for (const tick of this.ticks) {
      tick.quaternion.copy(camQuat);
      const scale = getScreenScaleFactor(tick.position, 16);
      tick.scale.setScalar(scale);
    }
  }

  dispose() {
    for (const obj of this.objects) {
      if (obj.isCSS2DObject || obj instanceof CSS2DObject) {
        state.world?.scene?.three?.remove(obj);
        obj.removeFromParent();
        if (obj.element && obj.element.parentNode) {
          obj.element.parentNode.removeChild(obj.element);
        } else if (obj.element && obj.element.remove) {
          obj.element.remove();
        }
      } else {
        state.world?.scene?.three?.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        obj.removeFromParent();
      }
    }
    this.objects = [];
    this.ticks = [];
    this.badges = [];
    this.mainBadge = null;
    this.hBadge = null;
    this.vBadge = null;
    this.xBadge = null;
    this.zBadge = null;
    renderLabels();
    wakeRenderer();
  }
}

export class AngleDimensionGroup {
  pA: THREE.Vector3;
  pApex: THREE.Vector3;
  pB: THREE.Vector3;
  objects: any[] = [];
  ticks: THREE.Line[] = [];
  badges: CSS2DObject[] = [];
  badge: CSS2DObject | null = null;

  constructor(pA: THREE.Vector3, pApex: THREE.Vector3, pB: THREE.Vector3) {
    this.pA = pA.clone();
    this.pApex = pApex.clone();
    this.pB = pB.clone();

    const handleDelete = () => {
      this.dispose();
      const idx = state.orthogonalDimensions.indexOf(this);
      if (idx !== -1) state.orthogonalDimensions.splice(idx, 1);
      const toolDeleteMeasurements = document.getElementById("tool-delete-measurements");
      if (state.orthogonalDimensions.length === 0 && toolDeleteMeasurements) {
        toolDeleteMeasurements.style.display = "none";
      }
      resolveScreenSpaceCollisions();
      renderLabels();
      wakeRenderer();
      showToast("Angle measurement deleted");
    };

    const dirA = new THREE.Vector3().subVectors(this.pA, this.pApex).normalize();
    const dirB = new THREE.Vector3().subVectors(this.pB, this.pApex).normalize();
    const dot = THREE.MathUtils.clamp(dirA.dot(dirB), -1, 1);
    const angleDeg = (Math.acos(dot) * 180 / Math.PI).toFixed(1);

    const lineA = createSolidDimensionLine(this.pApex, this.pA, 0x8b5cf6);
    const lineB = createSolidDimensionLine(this.pApex, this.pB, 0x8b5cf6);
    state.world.scene.three.add(lineA, lineB);
    this.objects.push(lineA, lineB);

    const arc = createAngularArcIndicator(this.pApex, this.pA, this.pB);
    if (arc) {
      state.world.scene.three.add(arc);
      this.objects.push(arc);
    }

    const midDir = new THREE.Vector3().addVectors(dirA, dirB).normalize();
    const badgePos = this.pApex.clone().addScaledVector(midDir, 0.4);
    this.badge = createCADBadge("∠", angleDeg, "°", badgePos, "cad-badge-hypotenuse", handleDelete);
    state.world.scene.three.add(this.badge);
    this.objects.push(this.badge);
    this.badges.push(this.badge);
    renderLabels();
  }

  updateBadges() {}
  updateTicks() {}

  dispose() {
    for (const obj of this.objects) {
      if (obj.isCSS2DObject || obj instanceof CSS2DObject) {
        state.world?.scene?.three?.remove(obj);
        obj.removeFromParent();
        if (obj.element && obj.element.parentNode) {
          obj.element.parentNode.removeChild(obj.element);
        } else if (obj.element && obj.element.remove) {
          obj.element.remove();
        }
      } else {
        state.world?.scene?.three?.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        obj.removeFromParent();
      }
    }
    this.objects = [];
    this.ticks = [];
    this.badges = [];
    this.badge = null;
    renderLabels();
    wakeRenderer();
  }
}

export class AreaDimensionGroup {
  points: THREE.Vector3[];
  objects: any[] = [];
  ticks: THREE.Line[] = [];
  badges: CSS2DObject[] = [];
  badge: CSS2DObject | null = null;
  area: number = 0;
  perimeter: number = 0;

  constructor(points: THREE.Vector3[]) {
    this.points = points.map((p) => p.clone());

    const handleDelete = () => {
      this.dispose();
      const idx = state.orthogonalDimensions.indexOf(this);
      if (idx !== -1) state.orthogonalDimensions.splice(idx, 1);
      const toolDeleteMeasurements = document.getElementById("tool-delete-measurements");
      if (state.orthogonalDimensions.length === 0 && toolDeleteMeasurements) {
        toolDeleteMeasurements.style.display = "none";
      }
      resolveScreenSpaceCollisions();
      renderLabels();
      wakeRenderer();
      showToast("Area measurement deleted");
    };

    const n = this.points.length;
    const normal = new THREE.Vector3();
    let perimeter = 0;
    const center = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
      const pCurrent = this.points[i];
      const pNext = this.points[(i + 1) % n];
      center.add(pCurrent);
      perimeter += pCurrent.distanceTo(pNext);

      normal.x += (pCurrent.y - pNext.y) * (pCurrent.z + pNext.z);
      normal.y += (pCurrent.z - pNext.z) * (pCurrent.x + pNext.x);
      normal.z += (pCurrent.x - pNext.x) * (pCurrent.y + pNext.y);
    }
    center.divideScalar(n);
    const area = 0.5 * normal.length();

    this.area = area;
    this.perimeter = perimeter;

    const loopPoints = [...this.points, this.points[0]];
    const loopGeom = new THREE.BufferGeometry().setFromPoints(loopPoints);
    const loopMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const loopLine = new THREE.Line(loopGeom, loopMat);
    loopLine.renderOrder = 9999;
    state.world.scene.three.add(loopLine);
    this.objects.push(loopLine);

    try {
      const positions: number[] = [];
      for (const p of this.points) {
        positions.push(p.x, p.y, p.z);
      }
      const indices: number[] = [];
      for (let i = 1; i < n - 1; i++) {
        indices.push(0, i, i + 1);
      }
      const polyGeom = new THREE.BufferGeometry();
      polyGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const uvs = computePolygonUVs(this.points, normal, 1.2);
      polyGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      polyGeom.setIndex(indices);
      polyGeom.computeVertexNormals();

      const polyMat = new THREE.MeshBasicMaterial({
        map: getCADGreenHatchTexture(),
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const polyMesh = new THREE.Mesh(polyGeom, polyMat);
      polyMesh.renderOrder = 9997;
      state.world.scene.three.add(polyMesh);
      this.objects.push(polyMesh);
    } catch (e) {}

    const formattedArea = formatArea(area);
    const formattedPerim = formatLength(perimeter);

    this.badge = createCADBadge("Area:", formattedArea.valueStr, formattedArea.unitStr, center, "cad-badge-horizontal", handleDelete, `Perim: ${formattedPerim.fullStr}`);
    state.world.scene.three.add(this.badge);
    this.objects.push(this.badge);
    this.badges.push(this.badge);
    renderLabels();
  }

  updateBadges() {
    if (!this.badge) return;
    const formattedArea = formatArea(this.area);
    const formattedPerim = formatLength(this.perimeter);
    (this.badge as any).updateContent("Area:", formattedArea.valueStr, formattedArea.unitStr, `Perim: ${formattedPerim.fullStr}`);
  }

  updateTicks() {}

  dispose() {
    for (const obj of this.objects) {
      if (obj.isCSS2DObject || obj instanceof CSS2DObject) {
        state.world?.scene?.three?.remove(obj);
        obj.removeFromParent();
        if (obj.element && obj.element.parentNode) {
          obj.element.parentNode.removeChild(obj.element);
        } else if (obj.element && obj.element.remove) {
          obj.element.remove();
        }
      } else {
        state.world?.scene?.three?.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        obj.removeFromParent();
      }
    }
    this.objects = [];
    this.ticks = [];
    this.badges = [];
    renderLabels();
    wakeRenderer();
  }
}

// ── Screen-Space Zero-Collision Engine ───────────────────────────
const _vec3Temp = new THREE.Vector3();

export function resolveScreenSpaceCollisions() {
  const viewerContainer = document.getElementById("viewer-container");
  if (!state.world || !state.world.camera || !state.world.camera.three || !viewerContainer) return;

  const camera = state.world.camera.three;
  const width = viewerContainer.clientWidth || window.innerWidth || 800;
  const height = viewerContainer.clientHeight || window.innerHeight || 600;

  const activeBadges: any[] = [];
  for (const group of state.orthogonalDimensions) {
    if (!group.badges) continue;
    for (const badgeObj of group.badges) {
      if (badgeObj && badgeObj.element && badgeObj.visible !== false) {
        _vec3Temp.copy(badgeObj.position);
        _vec3Temp.project(camera);

        if (_vec3Temp.z < 1) {
          const screenX = ((_vec3Temp.x + 1) / 2) * width;
          const screenY = ((-_vec3Temp.y + 1) / 2) * height;
          const rect = badgeObj.element.getBoundingClientRect();
          const w = rect.width > 0 ? rect.width : 110;
          const h = rect.height > 0 ? rect.height : 28;

          activeBadges.push({
            obj: badgeObj,
            el: badgeObj.element,
            x: screenX,
            y: screenY,
            w: w,
            h: h,
            offsetX: 0,
            offsetY: 0,
          });
        }
      }
    }
  }

  const iterations = 3;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < activeBadges.length; i++) {
      for (let j = i + 1; j < activeBadges.length; j++) {
        const b1 = activeBadges[i];
        const b2 = activeBadges[j];

        const x1 = b1.x + b1.offsetX;
        const y1 = b1.y + b1.offsetY;
        const x2 = b2.x + b2.offsetX;
        const y2 = b2.y + b2.offsetY;

        const deltaX = x1 - x2;
        const deltaY = y1 - y2;
        const padX = (b1.w + b2.w) / 2 + 8;
        const padY = (b1.h + b2.h) / 2 + 6;

        if (Math.abs(deltaX) < padX && Math.abs(deltaY) < padY) {
          const overlapX = padX - Math.abs(deltaX);
          const overlapY = padY - Math.abs(deltaY);

          if (overlapX < overlapY) {
            const sign = deltaX >= 0 ? 1 : -1;
            const push = (overlapX / 2) * sign;
            b1.offsetX += push;
            b2.offsetX -= push;
          } else {
            const sign = deltaY >= 0 ? 1 : -1;
            const push = (overlapY / 2) * sign;
            b1.offsetY += push;
            b2.offsetY -= push;
          }
        }
      }
    }
  }

  for (const b of activeBadges) {
    if (Math.abs(b.offsetX) > 0.5 || Math.abs(b.offsetY) > 0.5) {
      b.el.style.transform = `translate(calc(-50% + ${b.offsetX.toFixed(1)}px), calc(-50% + ${b.offsetY.toFixed(1)}px))`;
    } else {
      b.el.style.transform = `translate(-50%, -50%)`;
    }
  }
}

// ── 3D Snapping Geometry Calculation ─────────────────────────────
const _lineAB = new THREE.Line3();
const _lineBC = new THREE.Line3();
const _lineCA = new THREE.Line3();

export function getHitTriangleVertices(hit: any): THREE.Vector3[] | null {
  const obj = hit.object;
  const geom = obj.geometry;
  const face = hit.face;
  if (!face || !geom || !geom.attributes.position) return null;

  const pos = geom.attributes.position;
  const vA = new THREE.Vector3().fromBufferAttribute(pos, face.a);
  const vB = new THREE.Vector3().fromBufferAttribute(pos, face.b);
  const vC = new THREE.Vector3().fromBufferAttribute(pos, face.c);

  if (obj.isInstancedMesh && hit.instanceId !== undefined) {
    const instMatrix = new THREE.Matrix4();
    obj.getMatrixAt(hit.instanceId, instMatrix);
    vA.applyMatrix4(instMatrix);
    vB.applyMatrix4(instMatrix);
    vC.applyMatrix4(instMatrix);
  }

  vA.applyMatrix4(obj.matrixWorld);
  vB.applyMatrix4(obj.matrixWorld);
  vC.applyMatrix4(obj.matrixWorld);

  return [vA, vB, vC];
}

export function computeSnapPoint(hit: any, vertexThreshold: number = 0.55, edgeThreshold: number = 0.45): { point: THREE.Vector3; type: string } {
  const isMobile = typeof window !== "undefined" && (window.innerWidth <= 768 || window.matchMedia("(pointer: coarse)").matches);
  const vThresh = isMobile ? vertexThreshold * 1.8 : vertexThreshold;
  const eThresh = isMobile ? edgeThreshold * 1.6 : edgeThreshold;

  const tri = getHitTriangleVertices(hit);
  if (!tri) return { point: hit.point.clone(), type: "surface" };

  const [vA, vB, vC] = tri;
  const hitPoint = hit.point;

  // 1. Vertex (Corner)
  if (state.snapFilters?.vertex) {
    const distA = hitPoint.distanceTo(vA);
    const distB = hitPoint.distanceTo(vB);
    const distC = hitPoint.distanceTo(vC);
    const minDistVertex = Math.min(distA, distB, distC);

    if (minDistVertex < vThresh) {
      if (isMobile && typeof navigator !== "undefined" && (navigator as any).vibrate && state.currentSnapType !== "vertex") {
        try { (navigator as any).vibrate(10); } catch(e) {}
      }
      if (minDistVertex === distA) return { point: vA.clone(), type: "vertex" };
      if (minDistVertex === distB) return { point: vB.clone(), type: "vertex" };
      return { point: vC.clone(), type: "vertex" };
    }
  }

  // 2. Midpoint
  if (state.snapFilters?.midpoint) {
    const midAB = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
    const midBC = new THREE.Vector3().addVectors(vB, vC).multiplyScalar(0.5);
    const midCA = new THREE.Vector3().addVectors(vC, vA).multiplyScalar(0.5);

    const distMidAB = hitPoint.distanceTo(midAB);
    const distMidBC = hitPoint.distanceTo(midBC);
    const distMidCA = hitPoint.distanceTo(midCA);
    const minDistMid = Math.min(distMidAB, distMidBC, distMidCA);

    if (minDistMid < (vThresh * 0.8)) {
      if (minDistMid === distMidAB) return { point: midAB, type: "midpoint" };
      if (minDistMid === distMidBC) return { point: midBC, type: "midpoint" };
      return { point: midCA, type: "midpoint" };
    }
  }

  // 3. Edge
  if (state.snapFilters?.edge) {
    _lineAB.set(vA, vB);
    _lineBC.set(vB, vC);
    _lineCA.set(vC, vA);

    const ptOnAB = new THREE.Vector3();
    const ptOnBC = new THREE.Vector3();
    const ptOnCA = new THREE.Vector3();

    _lineAB.closestPointToPoint(hitPoint, true, ptOnAB);
    _lineBC.closestPointToPoint(hitPoint, true, ptOnBC);
    _lineCA.closestPointToPoint(hitPoint, true, ptOnCA);

    const distAB = hitPoint.distanceTo(ptOnAB);
    const distBC = hitPoint.distanceTo(ptOnBC);
    const distCA = hitPoint.distanceTo(ptOnCA);
    const minDistEdge = Math.min(distAB, distBC, distCA);

    if (minDistEdge < eThresh) {
      if (minDistEdge === distAB) return { point: ptOnAB, type: "edge" };
      if (minDistEdge === distBC) return { point: ptOnBC, type: "edge" };
      return { point: ptOnCA, type: "edge" };
    }
  }

  // 4. Surface Fallback
  return { point: hitPoint.clone(), type: "surface" };
}

export function getScreenScaleFactor(worldPos: THREE.Vector3, targetPixels: number = 18): number {
  const viewerContainer = document.getElementById("viewer-container");
  if (!state.world || !state.world.camera || !state.world.camera.three || !viewerContainer) return 0.05;

  const camera = state.world.camera.three;
  const height = viewerContainer.clientHeight || window.innerHeight || 800;

  if (camera.isPerspectiveCamera) {
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const dist = Math.max(camPos.distanceTo(worldPos), 0.05);
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov || 60);
    const worldHeightAtDist = 2 * Math.tan(fov / 2) * dist;
    return (worldHeightAtDist / height) * targetPixels;
  } else if ((camera as any).isOrthographicCamera) {
    const ortho = camera as THREE.OrthographicCamera;
    const worldHeight = (ortho.top - ortho.bottom) / (ortho.zoom || 1);
    return (worldHeight / height) * targetPixels;
  }
  return 0.05;
}

export function updateSnapMarkerAppearance(type: string) {
  if (!snapMarkerGroup || !snapMarkerGroup.visible) return;
  const outerRing = snapMarkerGroup.getObjectByName("outerRing") as THREE.Mesh;
  const innerDot = snapMarkerGroup.getObjectByName("innerDot") as THREE.Mesh;
  if (!outerRing || !innerDot) return;

  if (state.world && state.world.camera && state.world.camera.three) {
    snapMarkerGroup.quaternion.copy(state.world.camera.three.quaternion);
  }

  const baseScale = getScreenScaleFactor(snapMarkerGroup.position, 18);

  if (type === "vertex") {
    (outerRing.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
    (innerDot.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    snapMarkerGroup.scale.setScalar(baseScale * 1.25);
  } else if (type === "midpoint") {
    (outerRing.material as THREE.MeshBasicMaterial).color.setHex(0x06b6d4);
    (innerDot.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    snapMarkerGroup.scale.setScalar(baseScale * 1.15);
  } else if (type === "edge") {
    (outerRing.material as THREE.MeshBasicMaterial).color.setHex(0x6366f1);
    (innerDot.material as THREE.MeshBasicMaterial).color.setHex(0x818cf8);
    snapMarkerGroup.scale.setScalar(baseScale * 1.0);
  } else {
    (outerRing.material as THREE.MeshBasicMaterial).color.setHex(0x94a3b8);
    (innerDot.material as THREE.MeshBasicMaterial).color.setHex(0x64748b);
    snapMarkerGroup.scale.setScalar(baseScale * 0.85);
  }
}

export function updateStartPinAppearance() {
  if (!startPinGroup || !startPinGroup.visible) return;
  if (state.world && state.world.camera && state.world.camera.three) {
    startPinGroup.quaternion.copy(state.world.camera.three.quaternion);
  }
  const scale = getScreenScaleFactor(startPinGroup.position, 18);
  startPinGroup.scale.setScalar(scale * 1.25);
}

export function updateLiveTriangle(p1: THREE.Vector3, p2: THREE.Vector3): { isDiagonal: boolean; D: number; dx?: number; dy?: number; dz?: number; label1?: string; label2?: string } {
  if (!liveTriangleGroup || !liveHLine || !liveVLine || !liveRightAngle) return { isDiagonal: false, D: 0, dx: 0, dy: 0, dz: 0 };

  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  const dz = Math.abs(p2.z - p1.z);
  const D = p1.distanceTo(p2);

  const eps = 0.05;
  const activeX = dx > eps;
  const activeY = dy > eps;
  const activeZ = dz > eps;

  if (activeY && (activeX || activeZ)) {
    const pCorner = new THREE.Vector3(p2.x, p1.y, p2.z);
    const distH = Math.sqrt(dx * dx + dz * dz);
    const distV = dy;

    const posH = liveHLine.geometry.attributes.position as THREE.BufferAttribute;
    posH.setXYZ(0, p1.x, p1.y, p1.z);
    posH.setXYZ(1, pCorner.x, pCorner.y, pCorner.z);
    posH.needsUpdate = true;
    liveHLine.computeLineDistances();
    liveHLine.visible = true;

    const posV = liveVLine.geometry.attributes.position as THREE.BufferAttribute;
    posV.setXYZ(0, pCorner.x, pCorner.y, pCorner.z);
    posV.setXYZ(1, p2.x, p2.y, p2.z);
    posV.needsUpdate = true;
    liveVLine.computeLineDistances();
    liveVLine.visible = true;

    const arm = Math.min(0.25, distH * 0.25, distV * 0.25);
    const dir1 = new THREE.Vector3().subVectors(p1, pCorner).normalize();
    const dir2 = new THREE.Vector3().subVectors(p2, pCorner).normalize();
    const pt1 = pCorner.clone().addScaledVector(dir1, arm);
    const ptCorner = pCorner.clone().addScaledVector(dir1, arm).addScaledVector(dir2, arm);
    const pt2 = pCorner.clone().addScaledVector(dir2, arm);

    const posC = liveRightAngle.geometry.attributes.position as THREE.BufferAttribute;
    posC.setXYZ(0, pt1.x, pt1.y, pt1.z);
    posC.setXYZ(1, ptCorner.x, ptCorner.y, ptCorner.z);
    posC.setXYZ(2, pt2.x, pt2.y, pt2.z);
    posC.needsUpdate = true;
    liveRightAngle.visible = true;

    liveTriangleGroup.visible = true;
    const fH = formatLength(distH);
    const fV = formatLength(distV);
    return { isDiagonal: true, D, label1: `ΔH: ${fH.fullStr}`, label2: `ΔV: ${fV.fullStr}` };
  } else if (!activeY && activeX && activeZ) {
    const pCorner = new THREE.Vector3(p2.x, p1.y, p1.z);
    const posH = liveHLine.geometry.attributes.position as THREE.BufferAttribute;
    posH.setXYZ(0, p1.x, p1.y, p1.z);
    posH.setXYZ(1, pCorner.x, pCorner.y, pCorner.z);
    posH.needsUpdate = true;
    liveHLine.computeLineDistances();
    liveHLine.visible = true;

    const posV = liveVLine.geometry.attributes.position as THREE.BufferAttribute;
    posV.setXYZ(0, pCorner.x, pCorner.y, pCorner.z);
    posV.setXYZ(1, p2.x, p2.y, p2.z);
    posV.needsUpdate = true;
    liveVLine.computeLineDistances();
    liveVLine.visible = true;

    liveRightAngle.visible = false;
    liveTriangleGroup.visible = true;
    const fX = formatLength(dx);
    const fZ = formatLength(dz);
    return { isDiagonal: true, D, label1: `ΔX: ${fX.fullStr}`, label2: `ΔZ: ${fZ.fullStr}` };
  } else {
    liveTriangleGroup.visible = false;
    return { isDiagonal: false, D, dx, dy, dz };
  }
}

export function initMeasurementSuiteControls() {
  const btnDist = document.getElementById("btn-measure-mode-distance");
  const btnAngle = document.getElementById("btn-measure-mode-angle");
  const btnArea = document.getElementById("btn-measure-mode-area");

  const setMeasureMode = (mode: string, activeBtn: HTMLElement | null) => {
    state.activeMeasureMode = mode;
    [btnDist, btnAngle, btnArea].forEach((b) => b?.classList.remove("active"));
    if (activeBtn) activeBtn.classList.add("active");
    state.measureStartPoint = null;
    state.measurePointsList.length = 0;
    if (startPinGroup) startPinGroup.visible = false;
    if (rubberbandLine) rubberbandLine.visible = false;
    if (liveTriangleGroup) liveTriangleGroup.visible = false;
    clearAreaLivePreview();

    if (mode === "distance") {
      setHint("📐 Distance — Click Point 1, then Point 2 to measure distance with ΔH/ΔV.");
    } else if (mode === "angle") {
      setHint("📐 Angle — Click Point 1 (Arm A), Point 2 (Apex), Point 3 (Arm B).");
    } else if (mode === "area") {
      setHint("📐 Area — Click vertices to form a polygon. Double-click or click Point 1 to finish.");
    }
  };

  if (btnDist) btnDist.addEventListener("click", () => setMeasureMode("distance", btnDist));
  if (btnAngle) btnAngle.addEventListener("click", () => setMeasureMode("angle", btnAngle));
  if (btnArea) btnArea.addEventListener("click", () => setMeasureMode("area", btnArea));

  const bindSnapFilter = (id: string, key: "vertex" | "midpoint" | "edge" | "surface") => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      state.snapFilters[key] = !state.snapFilters[key];
      btn.classList.toggle("active", state.snapFilters[key]);
      showToast(`${key.toUpperCase()} Snap: ${state.snapFilters[key] ? "ON" : "OFF"}`);
    });
  };

  bindSnapFilter("snap-filter-vertex", "vertex");
  bindSnapFilter("snap-filter-midpoint", "midpoint");
  bindSnapFilter("snap-filter-edge", "edge");
  bindSnapFilter("snap-filter-surface", "surface");

  // Unit Selector dropdown binding
  const unitSelect = document.getElementById("measure-unit-select") as HTMLSelectElement | null;
  if (unitSelect) {
    unitSelect.value = state.measurementUnit || "m";
    unitSelect.addEventListener("change", (e: any) => {
      setMeasurementUnit(e.target.value);
      showToast(`Measurement unit: ${e.target.options[e.target.selectedIndex].text}`);
    });
  }
}

// ── Live Area Polygon & Placed Pin Preview ───────────────────────

export function updateAreaLivePreview(hoverPoint?: THREE.Vector3) {
  if (!areaPreviewGroup || !state.world?.scene) {
    initSnapPreviewObjects();
  }
  if (!areaPreviewGroup) return;

  const pts: THREE.Vector3[] = state.measurePointsList || [];
  if (pts.length === 0) {
    clearAreaLivePreview();
    return;
  }

  areaPreviewGroup.visible = true;

  // 1. Ensure enough vertex pin markers
  while (areaPreviewPins.length < pts.length) {
    const pinGroup = new THREE.Group();
    const innerGeom = new THREE.SphereGeometry(0.3, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    innerMesh.renderOrder = 9999;
    pinGroup.add(innerMesh);

    const outerGeom = new THREE.RingGeometry(0.45, 0.75, 24);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    outerMesh.renderOrder = 9999;
    pinGroup.add(outerMesh);

    areaPreviewGroup.add(pinGroup);
    areaPreviewPins.push(pinGroup);
  }

  // 2. Position pins and orient toward camera
  const camQuat = state.world?.camera?.three?.quaternion;
  areaPreviewPins.forEach((pin, i) => {
    if (i < pts.length) {
      pin.position.copy(pts[i]);
      if (camQuat) pin.quaternion.copy(camQuat);
      const scale = getScreenScaleFactor(pts[i], 16);
      pin.scale.setScalar(scale);
      pin.visible = true;
    } else {
      pin.visible = false;
    }
  });

  // 3. Connect lines from Point 1 -> ... -> hoverPoint
  const allPoints = [...pts];
  if (hoverPoint) allPoints.push(hoverPoint);

  if (allPoints.length >= 2 && areaPreviewLine) {
    areaPreviewLine.geometry.setFromPoints(allPoints);
    areaPreviewLine.visible = true;
  } else if (areaPreviewLine) {
    areaPreviewLine.visible = false;
  }

  // 4. Live Triangulated Mesh Face Fill with CAD Green Hatch
  if (allPoints.length >= 3 && areaPreviewMesh) {
    const n = allPoints.length;
    const positions: number[] = [];
    const norm = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const pCurrent = allPoints[i];
      const pNext = allPoints[(i + 1) % n];
      positions.push(pCurrent.x, pCurrent.y, pCurrent.z);
      norm.x += (pCurrent.y - pNext.y) * (pCurrent.z + pNext.z);
      norm.y += (pCurrent.z - pNext.z) * (pCurrent.x + pNext.x);
      norm.z += (pCurrent.x - pNext.x) * (pCurrent.y + pNext.y);
    }
    const indices: number[] = [];
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i, i + 1);
    }
    const uvs = computePolygonUVs(allPoints, norm, 1.2);
    areaPreviewMesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    areaPreviewMesh.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    areaPreviewMesh.geometry.setIndex(indices);
    areaPreviewMesh.geometry.computeVertexNormals();
    areaPreviewMesh.visible = true;
  } else if (areaPreviewMesh) {
    areaPreviewMesh.visible = false;
  }

  wakeRenderer();
}

export function clearAreaLivePreview() {
  if (areaPreviewGroup) {
    areaPreviewGroup.visible = false;
    areaPreviewPins.forEach((p) => (p.visible = false));
    if (areaPreviewLine) areaPreviewLine.visible = false;
    if (areaPreviewMesh) areaPreviewMesh.visible = false;
  }
}

export function finishAreaMeasurement() {
  if (!state.measurePointsList || state.measurePointsList.length < 3) {
    showToast("Need at least 3 points for an area");
    return;
  }

  const areaGroup = new AreaDimensionGroup(state.measurePointsList);
  state.orthogonalDimensions.push(areaGroup);
  resolveScreenSpaceCollisions();
  clearAreaLivePreview();

  const count = state.measurePointsList.length;
  state.measurePointsList.length = 0;

  const toolDeleteMeasurements = document.getElementById("tool-delete-measurements");
  if (toolDeleteMeasurements) toolDeleteMeasurements.style.display = "flex";

  showToast(`✅ Polygon Area created (${count} vertices)!`);
  setHint("📐 Area — Polygon created! Click to start another area, or Double-Click to close.");
}
