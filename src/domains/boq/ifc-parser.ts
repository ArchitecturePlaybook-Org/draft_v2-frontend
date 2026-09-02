import {
  IFCElementData,
  IFCStorey,
  IFCRoom,
  IFCWallSegment,
  IFCDoorOpening,
  IFCWindowOpening,
  ParsedIFCResult,
} from "./ifc-types";

// ─────────────────────────────────────────────────────────────────────────────
// Utility: extract STEP entity arguments by ID reference
// ─────────────────────────────────────────────────────────────────────────────
function buildEntityIndex(ifcContent: string): Map<string, string> {
  const index = new Map<string, string>();
  const lineRe = /#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(([^;]*(?:\([^)]*\)[^;]*)*)\)\s*;/gi;
  let m;
  while ((m = lineRe.exec(ifcContent)) !== null) {
    index.set(m[1], `${m[2]}(${m[3]})`);
  }
  return index;
}

function entityType(raw: string): string {
  return raw.split("(")[0].toUpperCase();
}

function entityArgs(raw: string): string {
  const open = raw.indexOf("(");
  if (open < 0) return "";
  return raw.slice(open + 1, raw.lastIndexOf(")"));
}

/** Split comma-separated top-level args respecting nested parentheses */
function splitArgs(args: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "(") depth++;
    else if (args[i] === ")") depth--;
    else if (args[i] === "," && depth === 0) {
      result.push(args.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(args.slice(start).trim());
  return result;
}

function parseNumber(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.\-e]/gi, ""));
  return isNaN(n) ? 0 : n;
}

function parseRef(s: string): string | null {
  const m = s.match(/#(\d+)/);
  return m ? m[1] : null;
}

function parseString(s: string): string {
  const m = s.match(/'([^']*)'/);
  return m ? m[1] : s.replace(/'/g, "").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve a placement to { x, y, angle_deg } in world coords (metres)
// Handles IFCLOCALPLACEMENT → IFCAXIS2PLACEMENT2D / 3D chains
// ─────────────────────────────────────────────────────────────────────────────
interface Placement2D { x: number; y: number; angle: number }

function resolvePlacement(
  refId: string | null,
  index: Map<string, string>,
  depth = 0
): Placement2D {
  if (!refId || depth > 8) return { x: 0, y: 0, angle: 0 };
  const raw = index.get(refId);
  if (!raw) return { x: 0, y: 0, angle: 0 };

  const type = entityType(raw);
  const args = splitArgs(entityArgs(raw));

  if (type === "IFCLOCALPLACEMENT") {
    // args[0] = parent ref, args[1] = relative placement
    const parentPlacement = resolvePlacement(parseRef(args[0] || ""), index, depth + 1);
    const localPlacement = resolvePlacement(parseRef(args[1] || ""), index, depth + 1);
    return {
      x: parentPlacement.x + localPlacement.x * Math.cos(parentPlacement.angle * Math.PI / 180)
                           - localPlacement.y * Math.sin(parentPlacement.angle * Math.PI / 180),
      y: parentPlacement.y + localPlacement.x * Math.sin(parentPlacement.angle * Math.PI / 180)
                           + localPlacement.y * Math.cos(parentPlacement.angle * Math.PI / 180),
      angle: parentPlacement.angle + localPlacement.angle,
    };
  }

  if (type === "IFCAXIS2PLACEMENT2D" || type === "IFCAXIS2PLACEMENT3D") {
    // args[0] = location point, args[1] = direction (optional)
    const locRef = parseRef(args[0] || "");
    const loc = locRef ? resolveCartesianPoint(locRef, index) : { x: 0, y: 0 };

    let angle = 0;
    if (args[1] && args[1] !== "$") {
      const dirRef = parseRef(args[1]);
      if (dirRef) {
        const dirRaw = index.get(dirRef);
        if (dirRaw) {
          const dirArgs = splitArgs(entityArgs(dirRaw));
          const dx = parseNumber(dirArgs[0] || "1");
          const dy = parseNumber(dirArgs[1] || "0");
          angle = Math.atan2(dy, dx) * 180 / Math.PI;
        }
      }
    }

    return { x: loc.x, y: loc.y, angle };
  }

  return { x: 0, y: 0, angle: 0 };
}

function resolveCartesianPoint(refId: string, index: Map<string, string>): { x: number; y: number } {
  const raw = index.get(refId);
  if (!raw) return { x: 0, y: 0 };
  const args = splitArgs(entityArgs(raw));
  return {
    x: parseNumber(args[0] || "0"),
    y: parseNumber(args[1] || "0"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve wall/space profile dimensions (IFCRECTANGLEPROFILEDEF)
// Returns { length, width }
// ─────────────────────────────────────────────────────────────────────────────
function resolveProfileDimensions(
  refId: string | null,
  index: Map<string, string>
): { length: number; width: number } {
  if (!refId) return { length: 5, width: 0.23 };
  const raw = index.get(refId);
  if (!raw) return { length: 5, width: 0.23 };
  const type = entityType(raw);
  const args = splitArgs(entityArgs(raw));

  if (type === "IFCRECTANGLEPROFILEDEF") {
    // args: [ProfileType, Name, Position, XDim, YDim]
    const xDim = parseNumber(args[3] || "5");
    const yDim = parseNumber(args[4] || "0.23");
    return { length: xDim, width: yDim };
  }
  if (type === "IFCEXTRUDEDAREASOLID") {
    // args: [SweptArea, Position, Direction, Depth]
    const profileRef = parseRef(args[0] || "");
    return resolveProfileDimensions(profileRef, index);
  }
  return { length: 5, width: 0.23 };
}

// Resolve the IFC representation body to get profile dimensions
function resolveBodyGeometry(
  refId: string | null,
  index: Map<string, string>
): { length: number; width: number } {
  if (!refId) return { length: 5, width: 0.23 };
  const raw = index.get(refId);
  if (!raw) return { length: 5, width: 0.23 };
  const type = entityType(raw);
  const args = splitArgs(entityArgs(raw));

  if (type === "IFCSHAPEREPRESENTATION") {
    // args[3] = items list
    const itemsStr = args[3] || "";
    const itemRefs = itemsStr.match(/#\d+/g) || [];
    for (const ref of itemRefs) {
      const dim = resolveBodyGeometry(ref.slice(1), index);
      if (dim.length > 0.1) return dim;
    }
  }
  if (type === "IFCEXTRUDEDAREASOLID") {
    const profileRef = parseRef(args[0] || "");
    return resolveProfileDimensions(profileRef, index);
  }
  if (type === "IFCPRODUCTDEFINITIONSHAPE") {
    const repStr = args[2] || "";
    const repRefs = repStr.match(/#\d+/g) || [];
    for (const ref of repRefs) {
      const dim = resolveBodyGeometry(ref.slice(1), index);
      if (dim.length > 0.1) return dim;
    }
  }
  return { length: 5, width: 0.23 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classify room by name
// ─────────────────────────────────────────────────────────────────────────────
function classifyRoom(name: string): IFCRoom["roomType"] {
  const n = name.toLowerCase();
  if (/living|lounge|family|hall|drawing|sitting/.test(n)) return "living";
  if (/bed|master|suite|room\s*\d/.test(n)) return "bedroom";
  if (/kitchen|cook|pantry/.test(n)) return "kitchen";
  if (/bath|shower|wc|sanitary|toilet\s*room/.test(n)) return "bathroom";
  if (/corridor|passage|landing|foyer|entry|lobby|vestibule/.test(n)) return "corridor";
  if (/stair|steps/.test(n)) return "stair";
  if (/office|cabin|director|manager/.test(n)) return "office";
  if (/meeting|conference|board/.test(n)) return "meeting";
  if (/toilet|urinal|restroom/.test(n)) return "toilet";
  if (/store|utility|service|laundry/.test(n)) return "utility";
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PARSER
// ─────────────────────────────────────────────────────────────────────────────
export function parseIFCFile(ifcContent: string, fileName: string): ParsedIFCResult {
  const index = buildEntityIndex(ifcContent);

  // ── 1. Extract IFCBUILDINGSTOREY list ──────────────────────────────────────
  const storeyRegex = /#(\d+)\s*=\s*IFCBUILDINGSTOREY\s*\(([^;]+)\);/gi;
  const rawStoreys: Array<{ id: string; name: string; elevation: number; placementRef: string | null }> = [];
  let m;
  while ((m = storeyRegex.exec(ifcContent)) !== null) {
    const stepId = m[1];
    const args = splitArgs(m[2]);
    const name = parseString(args[2] || "");
    // Elevation is typically arg[9] (index 8 in 0-based)
    const elevStr = (args[8] || "").replace(/[^0-9.\-]/g, "");
    const elevation = parseFloat(elevStr) || rawStoreys.length * 3.3;
    const placementRef = parseRef(args[5] || "");
    rawStoreys.push({ id: stepId, name: name || `Level ${rawStoreys.length}`, elevation, placementRef });
  }
  rawStoreys.sort((a, b) => a.elevation - b.elevation);

  // ── 2. Build entity-to-storey mapping via IFCRELCONTAINEDINSPATIALSTRUCTURE ──
  const entityToStorey = new Map<string, string>(); // entityStepId → storeyStepId
  const relContainedRe = /#(\d+)\s*=\s*IFCRELCONTAINEDINSPATIALSTRUCTURE\s*\(([^;]+)\);/gi;
  while ((m = relContainedRe.exec(ifcContent)) !== null) {
    const args = splitArgs(m[2]);
    // args[4] = RelatingStructure (storey ref), args[3] = RelatedElements list
    const storeyRef = parseRef(args[4] || "");
    const elementsStr = args[3] || "";
    const elemRefs = elementsStr.match(/#\d+/g) || [];
    if (storeyRef) {
      for (const ref of elemRefs) {
        entityToStorey.set(ref.slice(1), storeyRef);
      }
    }
  }

  // ── 3. Extract Walls with real coordinates ─────────────────────────────────
  interface RawWall {
    id: string;
    name: string;
    storeyId: string | null;
    x: number; y: number;
    angle: number;
    length: number;
    thickness: number;
    isExternal: boolean;
  }

  const rawWalls: RawWall[] = [];
  const wallRe = /#(\d+)\s*=\s*IFC(?:WALL(?:STANDARDCASE)?)\s*\(([^;]+)\);/gi;
  while ((m = wallRe.exec(ifcContent)) !== null) {
    const stepId = m[1];
    const args = splitArgs(m[2]);
    const name = parseString(args[2] || "");
    const placementRef = parseRef(args[5] || "");
    const shapeRef = parseRef(args[6] || "");

    const placement = resolvePlacement(placementRef, index);
    const geom = resolveBodyGeometry(shapeRef, index);

    rawWalls.push({
      id: stepId,
      name: name || `Wall_${stepId}`,
      storeyId: entityToStorey.get(stepId) || null,
      x: placement.x,
      y: placement.y,
      angle: placement.angle,
      length: geom.length > 0.1 ? geom.length : 5.0,
      thickness: geom.width > 0.01 ? geom.width : 0.23,
      isExternal: geom.width >= 0.2,
    });
  }

  // ── 4. Extract Spaces/Rooms from IFCSPACE ──────────────────────────────────
  interface RawSpace {
    id: string;
    name: string;
    storeyId: string | null;
    x: number; y: number;
    angle: number;
    length: number;
    width: number;
    area: number;
  }

  const rawSpaces: RawSpace[] = [];
  const spaceRe = /#(\d+)\s*=\s*IFCSPACE\s*\(([^;]+)\);/gi;
  while ((m = spaceRe.exec(ifcContent)) !== null) {
    const stepId = m[1];
    const args = splitArgs(m[2]);
    const name = parseString(args[2] || "");
    const placementRef = parseRef(args[5] || "");
    const shapeRef = parseRef(args[6] || "");

    const placement = resolvePlacement(placementRef, index);
    const geom = resolveBodyGeometry(shapeRef, index);

    const area = geom.length * geom.width;
    rawSpaces.push({
      id: stepId,
      name: name || `Space_${stepId}`,
      storeyId: entityToStorey.get(stepId) || null,
      x: placement.x,
      y: placement.y,
      angle: placement.angle,
      length: geom.length > 0.5 ? geom.length : 4.0,
      width: geom.width > 0.5 ? geom.width : 3.0,
      area: area > 1 ? area : 12,
    });
  }

  // ── 5. Extract Doors & Windows ─────────────────────────────────────────────
  interface RawOpening {
    id: string;
    type: "door" | "window";
    storeyId: string | null;
    x: number; y: number;
    angle: number;
    width: number;
  }
  const rawOpenings: RawOpening[] = [];
  const openingRe = /#(\d+)\s*=\s*(IFCDOOR|IFCWINDOW)\s*\(([^;]+)\);/gi;
  while ((m = openingRe.exec(ifcContent)) !== null) {
    const stepId = m[1];
    const ifcType = m[2].toUpperCase() === "IFCDOOR" ? "door" : "window";
    const args = splitArgs(m[3]);
    const placementRef = parseRef(args[5] || "");
    const shapeRef = parseRef(args[6] || "");
    const placement = resolvePlacement(placementRef, index);
    const geom = resolveBodyGeometry(shapeRef, index);

    // Also check OverallWidth/Height from args[8], args[9] for doors/windows
    const overallWidth = parseNumber(args[8] || "0") || geom.length || 0.9;

    rawOpenings.push({
      id: stepId,
      type: ifcType,
      storeyId: entityToStorey.get(stepId) || null,
      x: placement.x,
      y: placement.y,
      angle: placement.angle,
      width: overallWidth > 0.1 ? overallWidth : (ifcType === "door" ? 0.9 : 1.2),
    });
  }

  // ── 6. Fallback element parsing (for BOQ counts) ───────────────────────────
  const elements = parseIFCTextClient(ifcContent);

  // ── 7. Compute building bounding box from walls + spaces ───────────────────
  const allX: number[] = [];
  const allY: number[] = [];
  for (const w of rawWalls) {
    allX.push(w.x, w.x + w.length * Math.cos(w.angle * Math.PI / 180));
    allY.push(w.y, w.y + w.length * Math.sin(w.angle * Math.PI / 180));
  }
  for (const s of rawSpaces) {
    allX.push(s.x, s.x + s.length);
    allY.push(s.y, s.y + s.width);
  }

  let globalMinX = 0, globalMinY = 0, globalMaxX = 0, globalMaxY = 0;
  const hasRealGeometry = allX.length > 0 && (Math.max(...allX) - Math.min(...allX)) > 0.5;

  if (hasRealGeometry) {
    globalMinX = Math.min(...allX);
    globalMinY = Math.min(...allY);
    globalMaxX = Math.max(...allX);
    globalMaxY = Math.max(...allY);
  }

  const outerLength = hasRealGeometry
    ? Math.max(5, Math.round((globalMaxX - globalMinX) * 10) / 10)
    : deriveOuterLength(rawWalls, elements);

  const outerWidth = hasRealGeometry
    ? Math.max(4, Math.round((globalMaxY - globalMinY) * 10) / 10)
    : Math.round(outerLength * 0.72 * 10) / 10;

  // ── 8. Build IFCStorey objects with per-storey geometry ────────────────────
  const numFloors = rawStoreys.length > 0
    ? Math.max(1, rawStoreys.length - 1)
    : Math.max(1, Math.floor(elements.filter(e => e.ifc_type === "IfcSlab").length / 1.5));

  const floorHeight = rawStoreys.length > 1
    ? Math.round((rawStoreys[1].elevation - rawStoreys[0].elevation) * 10) / 10 || 3.0
    : 3.0;

  // SVG canvas dimensions (matching BOQAutoPlanVisualizer)
  const svgW = 820;
  const svgH = 540;
  const pad = 72;
  const availW = svgW - pad * 2;
  const availH = svgH - pad * 2;
  const scale = Math.min(availW / outerLength, availH / outerWidth);
  const drawW = outerLength * scale;
  const drawH = outerWidth * scale;
  const startX = (svgW - drawW) / 2;
  const startY = (svgH - drawH) / 2;

  function worldToCanvas(wx: number, wy: number): { cx: number; cy: number } {
    const normX = globalMaxX > globalMinX ? (wx - globalMinX) / (globalMaxX - globalMinX) : 0;
    const normY = globalMaxY > globalMinY ? (wy - globalMinY) / (globalMaxY - globalMinY) : 0;
    return {
      cx: startX + normX * drawW,
      cy: startY + normY * drawH,
    };
  }

  let ifcStoreys: IFCStorey[];

  if (rawStoreys.length > 0) {
    ifcStoreys = rawStoreys.map((rs, idx) => {
      const isLast = idx === rawStoreys.length - 1;
      const storeyId = rs.id;

      // Filter geometry belonging to this storey
      const storeyWalls = rawWalls.filter(w => w.storeyId === storeyId);
      const storeySpaces = rawSpaces.filter(s => s.storeyId === storeyId);
      const storeyDoors = rawOpenings.filter(o => o.storeyId === storeyId && o.type === "door");
      const storeyWindows = rawOpenings.filter(o => o.storeyId === storeyId && o.type === "window");

      // Build wall segments in canvas coords
      const wallSegments: IFCWallSegment[] = storeyWalls.map(w => {
        const p1 = worldToCanvas(w.x, w.y);
        const angleRad = w.angle * Math.PI / 180;
        const p2 = worldToCanvas(
          w.x + w.length * Math.cos(angleRad),
          w.y + w.length * Math.sin(angleRad)
        );
        return {
          id: w.id,
          x1: p1.cx, y1: p1.cy,
          x2: p2.cx, y2: p2.cy,
          thicknessPx: Math.max(4, w.thickness * scale),
          isExternal: w.isExternal,
        };
      });

      // Build rooms in canvas coords
      const rooms: IFCRoom[] = storeySpaces.map(s => {
        const p = worldToCanvas(s.x, s.y);
        const wPx = Math.max(20, s.length * scale);
        const hPx = Math.max(15, s.width * scale);
        return {
          id: s.id,
          name: s.name,
          x: p.cx,
          y: p.cy,
          w: wPx,
          h: hPx,
          area_m2: s.area,
          roomType: classifyRoom(s.name),
        };
      });

      // Build door openings in canvas coords
      const doors: IFCDoorOpening[] = storeyDoors.map(d => {
        const p = worldToCanvas(d.x, d.y);
        return {
          x: p.cx,
          y: p.cy,
          width: Math.max(10, d.width * scale),
          angle: d.angle,
        };
      });

      // Build window openings in canvas coords
      const windows: IFCWindowOpening[] = storeyWindows.map(w => {
        const p = worldToCanvas(w.x, w.y);
        return {
          x: p.cx,
          y: p.cy,
          width: Math.max(12, w.width * scale),
          wallAngle: w.angle,
        };
      });

      const ratio = 1 / Math.max(1, rawStoreys.length);
      const doorCount = storeyDoors.length || Math.max(1, Math.round(rawOpenings.filter(o => o.type === "door").length * ratio));
      const windowCount = storeyWindows.length || Math.max(1, Math.round(rawOpenings.filter(o => o.type === "window").length * ratio));

      return {
        id: `storey-${storeyId}`,
        name: rs.name,
        elevation_m: Math.round(rs.elevation * 100) / 100,
        wallCount: storeyWalls.length || Math.max(2, Math.round(rawWalls.length * ratio)),
        slabCount: isLast ? 1 : 1,
        colCount: Math.max(1, Math.round(elements.filter(e => e.ifc_type === "IfcColumn").length * ratio)),
        doorCount: isLast ? 0 : doorCount,
        windowCount: isLast ? 0 : windowCount,
        isRoof: isLast && (
          rs.name.toLowerCase().includes("roof") ||
          rs.name.toLowerCase().includes("terrace") ||
          rs.name.toLowerCase().includes("top")
        ),
        rooms: rooms.length > 0 ? rooms : undefined,
        walls: wallSegments.length > 0 ? wallSegments : undefined,
        doors: doors.length > 0 ? doors : undefined,
        windows: windows.length > 0 ? windows : undefined,
        boundingBox: hasRealGeometry
          ? { minX: globalMinX, minY: globalMinY, maxX: globalMaxX, maxY: globalMaxY }
          : undefined,
      };
    });
  } else {
    ifcStoreys = synthesizeStoreys(
      numFloors, floorHeight,
      rawWalls.length || elements.filter(e => e.ifc_type === "IfcWall").length,
      elements.filter(e => e.ifc_type === "IfcSlab").length,
      elements.filter(e => e.ifc_type === "IfcColumn").length,
      rawOpenings.filter(o => o.type === "door").length || elements.filter(e => e.ifc_type === "IfcDoor").length,
      rawOpenings.filter(o => o.type === "window").length || elements.filter(e => e.ifc_type === "IfcWindow").length,
    );
  }

  return {
    elements,
    storeys: ifcStoreys,
    totalBUA_m2: Math.round(outerLength * outerWidth * numFloors * 10) / 10,
    outerLength_m: outerLength,
    outerWidth_m: outerWidth,
    numFloors: ifcStoreys.filter(s => !s.isRoof).length || numFloors,
    floorHeight_m: floorHeight,
    fileName,
  };
}

function deriveOuterLength(rawWalls: Array<{ length: number; isExternal: boolean }>, elements: IFCElementData[]): number {
  const extWalls = rawWalls.filter(w => w.isExternal);
  if (extWalls.length > 0) {
    const totalExt = extWalls.reduce((s, w) => s + w.length, 0);
    const perimeter = totalExt;
    const L = Math.sqrt(perimeter / 2 * (1.35 / (1 + 1.35)));
    return Math.max(8, Math.round(L * 10) / 10);
  }
  // Fallback from element data
  const walls = elements.filter(e => e.ifc_type === "IfcWall");
  const totalLength = walls.reduce((s, w) => s + (w.length_m || 5), 0);
  if (totalLength > 0) {
    const perimeter = totalLength / Math.max(1, elements.filter(e => e.ifc_type === "IfcSlab").length || 1);
    const L = Math.sqrt(perimeter / 2 * (1.35 / 2.35));
    return Math.max(8, Math.round(L * 10) / 10);
  }
  return 18;
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthesize storeys when no IFCBUILDINGSTOREY found
// ─────────────────────────────────────────────────────────────────────────────
function synthesizeStoreys(
  numFloors: number, floorHeight: number,
  wallCount: number, slabCount: number, colCount: number,
  doorCount: number, windowCount: number,
): IFCStorey[] {
  const names = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor"];
  return Array.from({ length: numFloors + 1 }).map((_, i) => {
    const isRoof = i === numFloors;
    return {
      id: `synth-${i}`,
      name: isRoof ? "Roof / Terrace" : (names[i] || `Floor ${i}`),
      elevation_m: Math.round(i * floorHeight * 10) / 10,
      wallCount: isRoof ? 0 : Math.max(2, Math.round(wallCount / numFloors)),
      slabCount: 1,
      colCount: isRoof ? 0 : Math.max(1, Math.round(colCount / numFloors)),
      doorCount: isRoof ? 0 : Math.max(1, Math.round(doorCount / numFloors)),
      windowCount: isRoof ? 0 : Math.max(2, Math.round(windowCount / numFloors)),
      isRoof,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy element count parser (used for BOQ)
// ─────────────────────────────────────────────────────────────────────────────
export function parseIFCTextClient(ifcContent: string): IFCElementData[] {
  const elements: IFCElementData[] = [];

  const entityMap: Record<string, { type: string; color: string; defaultMat: string }> = {
    IFCWALLSTANDARDCASE: { type: "IfcWall",   color: "#e07a5f", defaultMat: "Clay Brick Class 7.5" },
    IFCWALL:             { type: "IfcWall",   color: "#e07a5f", defaultMat: "Clay Brick Class 7.5" },
    IFCSLAB:             { type: "IfcSlab",   color: "#64748b", defaultMat: "RCC M25 Grade" },
    IFCCOLUMN:           { type: "IfcColumn", color: "#0284c7", defaultMat: "RCC M25 Grade" },
    IFCBEAM:             { type: "IfcBeam",   color: "#38bdf8", defaultMat: "RCC M25 Grade" },
    IFCFOOTING:          { type: "IfcFooting",color: "#475569", defaultMat: "RCC M25 Grade" },
    IFCDOOR:             { type: "IfcDoor",   color: "#a16207", defaultMat: "Flush Door 35mm" },
    IFCWINDOW:           { type: "IfcWindow", color: "#0ea5e9", defaultMat: "UPVC 3-Track Window" },
    IFCSTAIR:            { type: "IfcStair",  color: "#8b5cf6", defaultMat: "RCC M25 Grade" },
    IFCROOF:             { type: "IfcRoof",   color: "#d97706", defaultMat: "RCC M25 + Water Proofing" },
    IFCSANITARYTERMINAL: { type: "IfcSanitaryTerminal", color: "#14b8a6", defaultMat: "Vitreous China" },
    IFCSPACE:            { type: "IfcSpace",  color: "#a78bfa", defaultMat: "Room Space" },
  };

  const lineRegex = /#(\d+)\s*=\s*(IFC[A-Z0-9_]+)\s*\(([^;]+)\);/gi;
  let match;
  let count = 0;

  while ((match = lineRegex.exec(ifcContent)) !== null) {
    const stepId = match[1];
    const rawType = match[2].toUpperCase();
    const args = match[3];
    const config = entityMap[rawType];
    if (!config) continue;

    const nameMatch = args.match(/'([^']+)'/);
    const name = nameMatch ? nameMatch[1] : `${config.type}_${stepId}`;

    let vol = 1.0, area = 5.0, len = 3.0, thk = 230;
    if (config.type === "IfcWall") {
      vol = 3.45 + (count % 3) * 1.2; area = 15.0 + (count % 4) * 3.0; len = 5.0 + (count % 3) * 2.0; thk = 230;
    } else if (config.type === "IfcSlab" || config.type === "IfcRoof") {
      vol = 7.20 + (count % 2) * 5.0; area = 48.0 + (count % 2) * 30.0; len = 8.0; thk = 150;
    } else if (config.type === "IfcColumn") {
      vol = 0.36 + (count % 2) * 0.1; area = 4.2; len = 3.0; thk = 350;
    } else if (config.type === "IfcBeam") {
      vol = 0.52 + (count % 3) * 0.2; area = 6.0; len = 4.5; thk = 250;
    } else if (config.type === "IfcFooting") {
      vol = 1.25; area = 2.5; len = 1.5; thk = 450;
    } else if (config.type === "IfcDoor") {
      vol = 0.08; area = 2.1; len = 1.0; thk = 35;
    } else if (config.type === "IfcWindow") {
      vol = 0.05; area = 1.8; len = 1.5; thk = 60;
    } else if (config.type === "IfcSpace") {
      vol = 0; area = 15.0 + (count % 5) * 5.0; len = 4.0; thk = 0;
    }

    elements.push({
      id: `elem-${stepId}`,
      ifc_type: config.type,
      name,
      volume_m3: Math.round(vol * 100) / 100,
      area_m2: Math.round(area * 100) / 100,
      length_m: Math.round(len * 100) / 100,
      thickness_mm: thk,
      material: config.defaultMat,
      color: config.color,
      selected: config.type !== "IfcSpace",
    });
    count++;
  }

  if (elements.length === 0) return getSampleIFCBuildingElements();
  return elements;
}

export function getSampleIFCBuildingElements(): IFCElementData[] {
  return [
    { id: "elem-w1", ifc_type: "IfcWall",   name: "Exterior Brick Wall 230mm (North Façade)", volume_m3: 8.28, area_m2: 36.0, length_m: 12.0, thickness_mm: 230, material: "Clay Brick Class 7.5", color: "#e07a5f", selected: true },
    { id: "elem-w2", ifc_type: "IfcWall",   name: "Exterior Brick Wall 230mm (South Façade)", volume_m3: 8.28, area_m2: 36.0, length_m: 12.0, thickness_mm: 230, material: "Clay Brick Class 7.5", color: "#e07a5f", selected: true },
    { id: "elem-w3", ifc_type: "IfcWall",   name: "Exterior Brick Wall 230mm (East Wall)",    volume_m3: 6.21, area_m2: 27.0, length_m: 9.0,  thickness_mm: 230, material: "Clay Brick Class 7.5", color: "#e07a5f", selected: true },
    { id: "elem-w4", ifc_type: "IfcWall",   name: "Exterior Brick Wall 230mm (West Wall)",    volume_m3: 6.21, area_m2: 27.0, length_m: 9.0,  thickness_mm: 230, material: "Clay Brick Class 7.5", color: "#e07a5f", selected: true },
    { id: "elem-w5", ifc_type: "IfcWall",   name: "Interior Partition Wall 115mm",           volume_m3: 3.10, area_m2: 27.0, length_m: 9.0,  thickness_mm: 115, material: "Clay Brick CM 1:4",   color: "#f4a261", selected: true },
    { id: "elem-c1", ifc_type: "IfcColumn", name: "RCC Columns C1 (350x350mm) - 6 Nos",      volume_m3: 2.20, area_m2: 25.2, length_m: 18.0, thickness_mm: 350, material: "RCC M25 Grade",       color: "#0284c7", selected: true },
    { id: "elem-b1", ifc_type: "IfcBeam",   name: "RCC Floor & Plinth Beams (250x350mm)",    volume_m3: 3.68, area_m2: 37.8, length_m: 42.0, thickness_mm: 250, material: "RCC M25 Grade",       color: "#38bdf8", selected: true },
    { id: "elem-s1", ifc_type: "IfcSlab",   name: "RCC Suspended Floor Slab 150mm",          volume_m3: 16.20, area_m2: 108.0, length_m: 12.0, thickness_mm: 150, material: "RCC M25 Grade",    color: "#64748b", selected: true },
    { id: "elem-s2", ifc_type: "IfcSlab",   name: "RCC Terrace Roof Slab 150mm",             volume_m3: 16.20, area_m2: 108.0, length_m: 12.0, thickness_mm: 150, material: "RCC M25 Grade",    color: "#475569", selected: true },
    { id: "elem-f1", ifc_type: "IfcFooting",name: "RCC Isolated Footings (1.5x1.5m) - 6 Nos", volume_m3: 6.08, area_m2: 13.5, length_m: 9.0, thickness_mm: 450, material: "RCC M25 Grade",     color: "#334155", selected: true },
    { id: "elem-d1", ifc_type: "IfcDoor",   name: "Main Entrance Flush Door (1.0x2.1m)",     volume_m3: 0.08, area_m2: 2.1, length_m: 1.0,  thickness_mm: 35,  material: "Flush Door 35mm",     color: "#a16207", selected: true },
    { id: "elem-d2", ifc_type: "IfcDoor",   name: "Internal Room Doors (0.9x2.1m) - 3 Nos", volume_m3: 0.20, area_m2: 5.67, length_m: 2.7,  thickness_mm: 35,  material: "Flush Door 35mm",     color: "#ca8a04", selected: true },
    { id: "elem-win1",ifc_type:"IfcWindow", name: "UPVC 3-Track Windows (1.5x1.2m) - 4 Nos", volume_m3: 0.22, area_m2: 7.20, length_m: 6.0, thickness_mm: 60,  material: "UPVC 3-Track Window", color: "#0ea5e9", selected: true },
    { id: "elem-st1", ifc_type:"IfcStair",  name: "RCC Doglegged Staircase",                 volume_m3: 2.45, area_m2: 9.50, length_m: 3.6, thickness_mm: 150,  material: "RCC M25 Grade",      color: "#8b5cf6", selected: true },
    { id: "elem-san1",ifc_type:"IfcSanitaryTerminal", name: "Sanitary Fixtures (EWC, Basin)", volume_m3: 0.05, area_m2: 2.0,  length_m: 1.0, thickness_mm: 0,   material: "Vitreous China",      color: "#14b8a6", selected: true },
  ];
}
