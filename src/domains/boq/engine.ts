/**
 * Client-Side Reactive BOQ Calculation Engine
 * =============================================
 * Mirrors the Python boq_service.py for instant 0ms UI updates.
 * Implements IS 1200 measurement rules in TypeScript.
 *
 * Used for: live slider updates, range previews, and offline mode.
 * Backend API is called for final authoritative calculations and Excel export.
 */
import { BOQParameters, BOQLineItem, BOQResult } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CPWD DSR 2023 embedded rates (mirrors backend DSR_RATES dict)
// ─────────────────────────────────────────────────────────────────────────────
const DSR_RATES: Record<string, { desc: string; unit: string; rate: number; isRef: string }> = {
  "EW-1": { desc: "Earthwork in excavation — soft/medium soil", unit: "m³", rate: 260, isRef: "IS 1200 Pt1" },
  "EW-2": { desc: "Earthwork in excavation — hard soil/murrum", unit: "m³", rate: 380, isRef: "IS 1200 Pt1" },
  "EW-3": { desc: "Disposal of excavated earth (50m lead)", unit: "m³", rate: 95, isRef: "IS 1200 Pt1" },
  "CC-1": { desc: "PCC M10 (1:4:8) — foundation bed", unit: "m³", rate: 5800, isRef: "IS 456" },
  "CC-2": { desc: "PCC M15 (1:2:4) — plinth beam/slab", unit: "m³", rate: 6400, isRef: "IS 456" },
  "RC-1": { desc: "RCC M20 — columns, beams, slabs incl. shuttering", unit: "m³", rate: 9800, isRef: "IS 456, IS 13920" },
  "RC-2": { desc: "HYSD bars Fe415/500 — incl. wastage & binding wire", unit: "kg", rate: 92, isRef: "IS 1786" },
  "BW-1": { desc: "Brick masonry CM (1:6) — 230mm outer wall (First Class)", unit: "m³", rate: 5200, isRef: "IS 1200 Pt3" },
  "BW-2": { desc: "Brick masonry CM (1:6) — 115mm internal partition (First Class)", unit: "m³", rate: 5600, isRef: "IS 1200 Pt3" },
  "PL-1": { desc: "Cement plaster (1:6) 12mm — internal walls (2-coat)", unit: "m²", rate: 185, isRef: "IS 1200 Pt12" },
  "PL-2": { desc: "Cement plaster (1:4) 18mm — external face", unit: "m²", rate: 220, isRef: "IS 1200 Pt12" },
  "SL-1": { desc: "RCC Roof Slab M20 125mm thick incl. shuttering/centering", unit: "m²", rate: 1350, isRef: "IS 456" },
  "FL-1": { desc: "Vitrified tile flooring 600×600mm — 20mm CM bed", unit: "m²", rate: 680, isRef: "IS 1200 Pt11" },
  "FL-2": { desc: "Ceramic tile skirting 100mm height", unit: "m", rate: 120, isRef: "IS 1200 Pt11" },
  "PT-1": { desc: "Acrylic emulsion paint (2 coats) — internal walls", unit: "m²", rate: 95, isRef: "" },
  "PT-2": { desc: "Exterior grade emulsion paint (2 coats) — external", unit: "m²", rate: 115, isRef: "" },
  "DW-1": { desc: "Solid core flush door + frame + hardware — 900×2100mm", unit: "nos", rate: 12500, isRef: "IS 4021" },
  "DW-2": { desc: "UPVC window 3-track with mosquito mesh — 1200×1200mm", unit: "nos", rate: 9500, isRef: "IS 14610" },
};

function r2(val: number): number {
  return Math.round(val * 100) / 100;
}

function makeItem(code: string, quantity: number, stage: string, deductionsNote = ""): BOQLineItem {
  const meta = DSR_RATES[code];
  const qty = r2(quantity);
  return {
    item_code: code,
    description: meta.desc,
    unit: meta.unit,
    quantity: qty,
    rate: meta.rate,
    amount: r2(qty * meta.rate),
    stage,
    is_code_ref: meta.isRef,
    deductions_note: deductionsNote,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IS 1200 Deduction Helpers
// ─────────────────────────────────────────────────────────────────────────────

function masonryOpeningDeduction(
  doorCount: number, doorSize: number,
  windowCount: number, windowSize: number,
  wallThicknessM: number
): [number, string] {
  // IS 1200 Part 3 Cl 5.4.2: deduct openings >0.1 m²
  const totalOpeningArea = doorCount * doorSize + windowCount * windowSize;
  const deductVol = totalOpeningArea * wallThicknessM;
  const note = `IS 1200 Pt3: ${doorCount}D(${doorSize}m²) + ${windowCount}W(${windowSize}m²) = ${r2(totalOpeningArea)}m² × ${wallThicknessM}m = −${r2(deductVol)}m³`;
  return [deductVol, note];
}

function plasterDeduction(
  doorCount: number, doorSize: number,
  windowCount: number, windowSize: number,
  isInternal: boolean
): [number, string] {
  // IS 1200 Part 12: <0.5m²=no deduct, 0.5–3m²=1 face, >3m²=2 faces
  let deduction = 0;
  const rules: string[] = [];
  for (const [count, size, label] of [
    [doorCount, doorSize, "door"] as [number, number, string],
    [windowCount, windowSize, "window"] as [number, number, string],
  ]) {
    for (let i = 0; i < count; i++) {
      if (size < 0.5) continue;
      else if (size <= 3.0) {
        deduction += size * (isInternal ? 2 : 1);
        rules.push(`${label}(${size}m²):1-face`);
      } else {
        deduction += size * 2;
        rules.push(`${label}(${size}m²):2-face`);
      }
    }
  }
  return [r2(deduction), rules.length ? `IS 1200 Pt12: ${rules.join("; ")}` : ""];
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Calculators
// ─────────────────────────────────────────────────────────────────────────────

function calcExcavation(p: BOQParameters): BOQLineItem[] {
  const outerTM = p.outer_wall_thickness_mm / 1000;
  const innerTM = p.inner_wall_thickness_mm / 1000;
  const ws = 0.30;
  const perimeter = 2 * (p.outer_length + p.outer_width);
  const outerExcav = perimeter * (outerTM + 2 * ws) * p.excavation_depth;
  const innerExcav = p.inner_wall_length * (innerTM + 2 * ws) * (p.excavation_depth * 0.7);
  const total = outerExcav + innerExcav;
  const rateCode = p.soil_type === "hard" ? "EW-2" : "EW-1";
  return [
    makeItem(rateCode, total, "earthwork"),
    makeItem("EW-3", total * 0.85, "earthwork"),
  ];
}

function calcFoundation(p: BOQParameters): BOQLineItem[] {
  const outerTM = p.outer_wall_thickness_mm / 1000;
  const perimeter = 2 * (p.outer_length + p.outer_width);
  let pccVol = perimeter * (outerTM + 0.30) * 0.15;
  if (p.inner_wall_length > 0) {
    pccVol += p.inner_wall_length * (p.inner_wall_thickness_mm / 1000 + 0.20) * 0.10;
  }
  return [makeItem("CC-1", pccVol, "substructure")];
}

function calcMasonry(p: BOQParameters): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const outerTM = p.outer_wall_thickness_mm / 1000;
  const innerTM = p.inner_wall_thickness_mm / 1000;
  const perimeter = 2 * (p.outer_length + p.outer_width);
  const wallH = p.floor_height * p.num_floors + p.plinth_height;

  // Outer wall
  const grossOuter = perimeter * wallH * outerTM;
  const [outerDeduct, outerNote] = masonryOpeningDeduction(
    p.outer_door_count, p.outer_door_size_m2,
    p.outer_window_count, p.outer_window_size_m2,
    outerTM
  );
  items.push(makeItem("BW-1", Math.max(0, grossOuter - outerDeduct), "superstructure", outerNote));

  // Internal partition wall
  if (p.inner_wall_length > 0) {
    const partitionH = p.floor_height * p.num_floors;
    const grossInner = p.inner_wall_length * partitionH * innerTM;
    const [innerDeduct, innerNote] = masonryOpeningDeduction(
      p.inner_door_count, p.inner_door_size_m2, 0, 0, innerTM
    );
    items.push(makeItem("BW-2", Math.max(0, grossInner - innerDeduct), "superstructure", innerNote));
  }
  return items;
}

function calcRCC(p: BOQParameters): BOQLineItem[] {
  const floorArea = p.outer_length * p.outer_width;
  const numColumns = Math.max(4, Math.floor((floorArea / 15) * p.num_floors));
  const colVol = numColumns * 0.23 * 0.23 * p.floor_height;
  const beamLength = 2 * (p.outer_length + p.outer_width) + p.inner_wall_length * 0.5;
  const beamVol = beamLength * 0.23 * 0.30 * p.num_floors;
  const totalRCC = r2(colVol + beamVol);
  const slabArea = floorArea * p.num_floors;
  return [
    makeItem("RC-1", totalRCC, "rcc"),
    makeItem("RC-2", r2(totalRCC * 90), "rcc"),
    makeItem("SL-1", slabArea, "rcc"),
  ];
}

function calcPlaster(p: BOQParameters): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const perimeter = 2 * (p.outer_length + p.outer_width);
  const wallH = p.floor_height * p.num_floors;

  // External plaster
  const grossExt = perimeter * (wallH + p.plinth_height);
  const [extDeduct, extNote] = plasterDeduction(
    p.outer_door_count, p.outer_door_size_m2,
    p.outer_window_count, p.outer_window_size_m2, false
  );
  items.push(makeItem("PL-2", Math.max(0, grossExt - extDeduct), "plaster", extNote));

  // Internal plaster (both faces of outer walls + both faces of partition walls)
  const outerInternalFace = perimeter * wallH * 2;
  const [intDeduct, intNote] = plasterDeduction(
    p.outer_door_count, p.outer_door_size_m2,
    p.outer_window_count, p.outer_window_size_m2, true
  );
  let innerPartitionPlaster = 0;
  let innerIntDeduct = 0;
  if (p.inner_wall_length > 0) {
    innerPartitionPlaster = p.inner_wall_length * wallH * 2;
    const [d] = plasterDeduction(p.inner_door_count, p.inner_door_size_m2, 0, 0, true);
    innerIntDeduct = d;
  }
  const totalInt = outerInternalFace + innerPartitionPlaster - intDeduct - innerIntDeduct;
  items.push(makeItem("PL-1", Math.max(0, totalInt), "plaster", intNote));
  return items;
}

function calcFinishes(p: BOQParameters): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const floorArea = p.outer_length * p.outer_width * p.num_floors;
  const perimeter = 2 * (p.outer_length + p.outer_width);
  const wallH = p.floor_height * p.num_floors;

  items.push(makeItem("FL-1", floorArea, "flooring"));
  items.push(makeItem("FL-2", perimeter + p.inner_wall_length * 2, "flooring"));

  const intPaintArea = perimeter * wallH * 2 + p.inner_wall_length * wallH * 2;
  items.push(makeItem("PT-1", Math.max(0, intPaintArea), "painting"));
  items.push(makeItem("PT-2", perimeter * (wallH + p.plinth_height), "painting"));

  if (p.outer_door_count + p.inner_door_count > 0) {
    items.push(makeItem("DW-1", p.outer_door_count + p.inner_door_count, "doors_windows"));
  }
  if (p.outer_window_count > 0) {
    items.push(makeItem("DW-2", p.outer_window_count, "doors_windows"));
  }
  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

export function calculateBOQ(p: BOQParameters): BOQResult {
  const lineItems: BOQLineItem[] = [
    ...calcExcavation(p),
    ...calcFoundation(p),
    ...calcMasonry(p),
    ...calcRCC(p),
    ...calcPlaster(p),
    ...calcFinishes(p),
  ];

  const totalCost = r2(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const builtUpArea = r2(p.outer_length * p.outer_width * p.num_floors);

  const assumptions = [
    `Building: ${p.outer_length}m × ${p.outer_width}m × ${p.num_floors} floor(s), H=${p.floor_height}m`,
    `Outer walls: ${p.outer_wall_thickness_mm}mm | Inner partition walls: ${p.inner_wall_thickness_mm}mm (${p.inner_wall_length}m run)`,
    `Openings: ${p.outer_door_count} outer doors + ${p.outer_window_count} windows + ${p.inner_door_count} inner doors`,
    `Rates: CPWD DSR 2023 | Measurements: IS 1200 (Parts 1, 2, 3, 11, 12)`,
    p.inner_wall_length > 0
      ? `✓ Internal partition brickwork & plaster included (often omitted by basic BOQ tools)`
      : `⚠ Inner wall length = 0 — internal partition brickwork not calculated`,
  ];

  return { typology: p.typology, built_up_area: builtUpArea, total_cost: totalCost, assumptions, line_items: lineItems };
}

export function groupByStage(items: BOQLineItem[]): Record<string, BOQLineItem[]> {
  return items.reduce<Record<string, BOQLineItem[]>>((acc, item) => {
    if (!acc[item.stage]) acc[item.stage] = [];
    acc[item.stage].push(item);
    return acc;
  }, {});
}
