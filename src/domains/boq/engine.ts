/**
 * Client-Side Reactive BOQ Calculation Engine
 * =============================================
 * Mirrors CPWD DSR 2023 rates and IS 1200 / NBC 2016 measurement rules.
 * Dynamically computes accurate Bill of Quantities across all 15 typologies:
 * - Residential & Multi-Storey RCC Buildings
 * - Boundary & Compound Walls
 * - Cantilever Retaining Walls
 * - Bituminous & Concrete PQC Roads
 * - RCC Storm Drains
 * - Septic Tanks (IS 2470)
 * - Community Toilet Blocks (SBM-G)
 * - Interior Packages (Modular Kitchen, Bathrooms, False Ceiling, Vitrified Flooring)
 */
import { BOQParameters, BOQLineItem, BOQResult } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CPWD DSR 2023 Rate Schedule
// ─────────────────────────────────────────────────────────────────────────────
const DSR_RATES: Record<string, { desc: string; unit: string; rate: number; isRef: string }> = {
  // Earthwork
  "EW-1": { desc: "Earthwork in excavation in trenches/foundations — soft/medium soil (lead up to 50m)", unit: "m³", rate: 260.30, isRef: "IS 1200 Pt 1" },
  "EW-2": { desc: "Earthwork in excavation — hard soil / rocky strata / murrum", unit: "m³", rate: 385.50, isRef: "IS 1200 Pt 1" },
  "EW-3": { desc: "Disposal of surplus excavated earth with mechanical transport (lead 50m)", unit: "m³", rate: 95.00, isRef: "IS 1200 Pt 1" },
  "EW-BACKFILL": { desc: "Earth/Sand filling under plinth & foundation trenches with watering and compaction", unit: "m³", rate: 320.00, isRef: "CPWD 2.25" },

  // Concrete & Foundation
  "CC-1": { desc: "PCC 1:4:8 (M10) foundation bed with 40mm graded stone aggregate", unit: "m³", rate: 5850.00, isRef: "IS 456" },
  "CC-2": { desc: "PCC 1:2:4 (M15) for plinth flooring bed / apron", unit: "m³", rate: 6450.00, isRef: "IS 456" },
  "RC-FTG": { desc: "RCC M25 in isolated/strip footings excluding shuttering & steel", unit: "m³", rate: 9250.00, isRef: "IS 456" },
  "RC-1": { desc: "RCC M20/M25 in columns, plinth beams, tie beams & lintels", unit: "m³", rate: 9850.00, isRef: "IS 456, IS 13920" },
  "RC-SLAB": { desc: "RCC M25 in suspended floor & roof slabs up to floor 5", unit: "m³", rate: 10450.00, isRef: "IS 456" },
  "RC-2": { desc: "Thermo-Mechanically Treated (TMT) Fe500D steel rebar incl. binding & lap", unit: "kg", rate: 92.50, isRef: "IS 1786" },
  "SH-1": { desc: "Centering and shuttering including strutting & propping (footings & columns)", unit: "m²", rate: 540.00, isRef: "IS 1200 Pt 5" },
  "SH-2": { desc: "Centering and shuttering for suspended slabs, beams and stairs", unit: "m²", rate: 620.00, isRef: "IS 1200 Pt 5" },

  // Masonry
  "BW-1": { desc: "Brickwork with common burnt clay F.P.S. bricks class 7.5 in CM 1:6 (230mm outer wall)", unit: "m³", rate: 5450.00, isRef: "IS 1200 Pt 3" },
  "BW-2": { desc: "Half brick masonry with clay F.P.S. bricks in CM 1:4 with hoop iron (115mm partition)", unit: "m²", rate: 890.00, isRef: "IS 1200 Pt 3" },
  "DPC-1": { desc: "Damp Proof Course (DPC) 50mm thick in concrete 1:2:4 with waterproofing compound", unit: "m²", rate: 380.00, isRef: "CPWD 4.11" },

  // Plastering & Pointing
  "PL-1": { desc: "12mm cement plaster (1:6) on internal walls (smooth trowel finish)", unit: "m²", rate: 195.00, isRef: "IS 1200 Pt 12" },
  "PL-2": { desc: "18mm cement plaster (1:4) two-coat rough cast / sand face on exterior", unit: "m²", rate: 245.00, isRef: "IS 1200 Pt 12" },
  "PL-WP": { desc: "15mm cement plaster (1:3) mixed with integral waterproofing compound", unit: "m²", rate: 310.00, isRef: "IS 2645" },

  // Flooring & Finishes
  "FL-1": { desc: "Vitrified tile flooring 600×600mm / 800×800mm with polymer adhesive bed", unit: "m²", rate: 750.00, isRef: "IS 1200 Pt 11" },
  "FL-2": { desc: "Matching vitrified tile skirting 100mm height", unit: "m", rate: 135.00, isRef: "IS 1200 Pt 11" },
  "FL-CERAMIC": { desc: "Ceramic anti-skid floor tiles 300×300mm in toilets/utility", unit: "m²", rate: 580.00, isRef: "IS 1200 Pt 11" },
  "FL-DADO": { desc: "Glazed ceramic wall tiles (dado) up to 2.1m height in CM 1:3", unit: "m²", rate: 640.00, isRef: "IS 1200 Pt 11" },

  // Painting
  "PT-1": { desc: "Premium acrylic emulsion paint (2 coats) over primer and wall putty", unit: "m²", rate: 110.00, isRef: "CPWD 13.46" },
  "PT-2": { desc: "Exterior weather-shield elastomeric emulsion (2 coats) over exterior primer", unit: "m²", rate: 130.00, isRef: "CPWD 13.48" },

  // Openings
  "DW-1": { desc: "Solid core flush door (35mm) with hardwood frame, SS hinges & mortise lock", unit: "nos", rate: 11500.00, isRef: "IS 2202" },
  "DW-2": { desc: "UPVC 3-track sliding window with float glass and stainless steel mosquito mesh", unit: "nos", rate: 9200.00, isRef: "IS 14610" },
  "DW-GATE": { desc: "Mild steel structural entrance gate with primer & synthetic enamel paint", unit: "m²", rate: 3850.00, isRef: "CPWD 10.25" },

  // Infrastructure: Road Works
  "RD-SUBGRADE": { desc: "Preparation of sub-grade, scarifying, watering & rolling with 8-10T roller", unit: "m²", rate: 45.00, isRef: "MoRTH 301" },
  "RD-GSB": { desc: "Granular Sub-Base (GSB) with graded crushed stone 150mm thick compacted", unit: "m³", rate: 1850.00, isRef: "MoRTH 401" },
  "RD-WMM": { desc: "Wet Mix Macadam (WMM) 150mm thick mechanically spread and compacted", unit: "m³", rate: 2200.00, isRef: "MoRTH 406" },
  "RD-TACK": { desc: "Applying bituminous prime/tack coat with emulsion @ 0.75 kg/sqm", unit: "m²", rate: 42.00, isRef: "MoRTH 502" },
  "RD-DBM": { desc: "Dense Bituminous Macadam (DBM) 50mm compacted with paver", unit: "m³", rate: 8400.00, isRef: "MoRTH 505" },
  "RD-BC": { desc: "Bituminous Concrete (BC) 30mm thick wearing course with 60/70 grade bitumen", unit: "m³", rate: 9600.00, isRef: "MoRTH 507" },
  "RD-DLC": { desc: "Dry Lean Concrete (DLC) M10 grade 100mm thick over GSB", unit: "m³", rate: 4600.00, isRef: "IRC SP 49" },
  "RD-PQC": { desc: "Pavement Quality Concrete (PQC) M30 200mm thick with dowel bars & joints", unit: "m³", rate: 8200.00, isRef: "IRC 58" },
  "RD-KERB": { desc: "Precast cement concrete kerb stone 300x200x450mm bedded on M10 concrete", unit: "m", rate: 480.00, isRef: "CPWD 16.5" },

  // Drainage & Retaining Wall
  "DR-EXCAV": { desc: "Excavation for storm drains / septic tank in all soils", unit: "m³", rate: 280.00, isRef: "IS 1200 Pt 1" },
  "DR-PCC": { desc: "PCC M15 (1:2:4) for drain base / retaining wall apron", unit: "m³", rate: 6450.00, isRef: "IS 456" },
  "DR-RCC": { desc: "RCC M20 in drain walls / bed slab with formwork & reinforcement", unit: "m³", rate: 12500.00, isRef: "IS 456" },
  "DR-COVER": { desc: "SFRC / Cast iron heavy duty drain cover grating with frame", unit: "m", rate: 1450.00, isRef: "IS 12592" },
  "RW-STEM": { desc: "RCC M25 in cantilever retaining wall stem and base slab complete with rebar", unit: "m³", rate: 14200.00, isRef: "IS 456" },
  "RW-WEEP": { desc: "PVC weep holes 100mm dia with non-woven geotextile wrap and gravel filter", unit: "nos", rate: 350.00, isRef: "IS 14458" },

  // Septic Tank & Sanitation
  "ST-WALL": { desc: "Brickwork in CM 1:4 with waterproof additive for septic tank & baffles", unit: "m³", rate: 6200.00, isRef: "IS 2470" },
  "ST-SLAB": { desc: "Precast RCC M25 cover slabs 100mm thick with MS lifting hooks", unit: "m²", rate: 1650.00, isRef: "IS 2470" },
  "ST-SOAK": { desc: "Soak pit 1.5m dia, 3.0m deep lined with dry brickwork & brick aggregate", unit: "nos", rate: 18500.00, isRef: "IS 2470" },
  "SAN-WC": { desc: "Orissa pan / European water closet with PVC cistern, seat & CP fixtures", unit: "nos", rate: 6800.00, isRef: "CPWD 17.1" },
  "SAN-URINAL": { desc: "Half stall urinal with auto flushing cistern and CP waste coupling", unit: "nos", rate: 4500.00, isRef: "CPWD 17.4" },
  "SAN-PIPE": { desc: "CPVC water supply & PVC SWR drainage pipe package with fittings", unit: "m", rate: 380.00, isRef: "IS 13592" },

  // Interior Packages
  "INT-CARCASS": { desc: "BWP Marine ply (IS 710) carcass with anti-termite treatment & acrylic shutters", unit: "m²", rate: 3800.00, isRef: "IS 710" },
  "INT-COUNTER": { desc: "20mm thick Granite / Quartz kitchen counter with machine polished edge & sink cutout", unit: "m²", rate: 2600.00, isRef: "CPWD 8.2" },
  "INT-SINK": { desc: "304 grade stainless steel double bowl sink with swan-neck swivel tap", unit: "nos", rate: 7500.00, isRef: "IS 13983" },
  "INT-FC-GRID": { desc: "GI channel framing & suspension system for false ceiling (per NBC)", unit: "m²", rate: 480.00, isRef: "IS 2095" },
  "INT-FC-BOARD": { desc: "12.5mm Gypsum / PVC ceiling board with taped joints and 2-coat primer/paint", unit: "m²", rate: 620.00, isRef: "IS 2095" },
  "INT-BATH-WP": { desc: "Polymer modified cementitious 2-coat waterproofing on bathroom sunken slabs", unit: "m²", rate: 340.00, isRef: "IS 3067" },
  "INT-BATH-CP": { desc: "Premium CP bathroom package: diverter, rain shower, basin mixer & health faucet", unit: "nos", rate: 16500.00, isRef: "IS 8931" },
};

function r2(val: number): number {
  return Math.round(val * 100) / 100;
}

function makeItem(code: string, quantity: number, stage: string, deductionsNote = ""): BOQLineItem {
  const meta = DSR_RATES[code] || { desc: code, unit: "nos", rate: 100, isRef: "IS 1200" };
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
// Specialized Typology Engines
// ─────────────────────────────────────────────────────────────────────────────

// 1. Residential & Multi-Storey RCC Buildings
function calcBuildingBOQ(p: BOQParameters): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const outerTM = (p.outer_wall_thickness_mm || 230) / 1000;
  const innerTM = (p.inner_wall_thickness_mm || 115) / 1000;
  const perimeter = 2 * (p.outer_length + p.outer_width);
  const floorArea = p.outer_length * p.outer_width;
  const totalBua = floorArea * p.num_floors;

  // Earthwork
  const excavVol = perimeter * (outerTM + 0.6) * (p.excavation_depth || 1.5);
  items.push(makeItem(p.soil_type === "hard" ? "EW-2" : "EW-1", excavVol, "earthwork"));
  items.push(makeItem("EW-3", excavVol * 0.75, "earthwork", "Surplus disposal"));
  items.push(makeItem("EW-BACKFILL", excavVol * 0.4, "earthwork", "Trench & plinth backfill"));

  // Foundation & PCC
  const pccVol = perimeter * (outerTM + 0.3) * 0.1;
  items.push(makeItem("CC-1", pccVol, "substructure"));

  // Columns & Footings (approx bay <= 4.0m)
  const xBays = Math.max(2, Math.round(p.outer_length / 4.0));
  const yBays = Math.max(2, Math.round(p.outer_width / 4.0));
  const numColumns = (xBays + 1) * (yBays + 1);

  const footingVol = numColumns * (1.4 * 1.4 * 0.45);
  items.push(makeItem("RC-FTG", footingVol, "substructure"));
  items.push(makeItem("SH-1", numColumns * (1.4 * 4 * 0.45), "substructure"));

  // Superstructure RCC: Columns + Beams + Slabs
  const colVol = numColumns * 0.35 * 0.35 * (p.floor_height * p.num_floors);
  const beamLength = (perimeter + (p.inner_wall_length || 0) * 0.5) * p.num_floors;
  const beamVol = beamLength * 0.25 * 0.35;
  const slabVol = totalBua * 0.15;
  const totalSuperRcc = colVol + beamVol + slabVol;

  items.push(makeItem("RC-1", colVol + beamVol, "rcc"));
  items.push(makeItem("RC-SLAB", slabVol, "rcc"));
  items.push(makeItem("SH-2", totalBua + beamLength * 0.7, "rcc"));
  items.push(makeItem("RC-2", (footingVol + totalSuperRcc) * 125, "rcc", "Fe500D rebar @ 125 kg/m³"));

  // DPC
  items.push(makeItem("DPC-1", perimeter * outerTM, "substructure"));

  // Masonry Walls (Outer & Inner)
  const wallH = p.floor_height * p.num_floors;
  const grossOuterMasonry = perimeter * wallH * outerTM;
  const doorDeduct = (p.outer_door_count || 2) * (p.outer_door_size_m2 || 2.1) * outerTM;
  const winDeduct = (p.outer_window_count || 8) * (p.outer_window_size_m2 || 1.44) * outerTM;
  const netOuterMasonry = Math.max(0, grossOuterMasonry - doorDeduct - winDeduct);
  items.push(makeItem("BW-1", netOuterMasonry, "superstructure"));

  if (p.inner_wall_length > 0) {
    const innerPartitionArea = p.inner_wall_length * wallH;
    const innerDoorDeduct = (p.inner_door_count || 4) * (p.inner_door_size_m2 || 1.89);
    items.push(makeItem("BW-2", Math.max(0, innerPartitionArea - innerDoorDeduct), "superstructure"));
  }

  // Plastering
  const extPlasterArea = perimeter * (wallH + (p.plinth_height || 0.6));
  items.push(makeItem("PL-2", extPlasterArea, "plaster"));
  const intPlasterArea = (perimeter * 2 + (p.inner_wall_length || 0) * 2) * wallH;
  items.push(makeItem("PL-1", intPlasterArea, "plaster"));

  // Flooring & Finishes
  items.push(makeItem("FL-1", totalBua * 0.82, "flooring"));
  items.push(makeItem("FL-CERAMIC", totalBua * 0.18, "flooring", "Toilets & balcony"));
  items.push(makeItem("FL-2", perimeter + (p.inner_wall_length || 0), "flooring"));

  // Painting
  items.push(makeItem("PT-1", intPlasterArea, "painting"));
  items.push(makeItem("PT-2", extPlasterArea, "painting"));

  // Doors & Windows
  if (p.outer_door_count + p.inner_door_count > 0) {
    items.push(makeItem("DW-1", p.outer_door_count + p.inner_door_count, "doors_windows"));
  }
  if (p.outer_window_count > 0) {
    items.push(makeItem("DW-2", p.outer_window_count, "doors_windows"));
  }

  return items;
}

// 2. Boundary & Compound Walls
function calcWallBOQ(p: BOQParameters): BOQLineItem[] {
  const len = p.outer_length || 60;
  const h = p.floor_height || 2.1;
  const thk = (p.outer_wall_thickness_mm || 230) / 1000;
  const numColumns = Math.max(2, Math.floor(len / 3.0) + 1);

  const excavVol = len * (thk + 0.4) * (p.excavation_depth || 0.9);
  const pccVol = len * (thk + 0.2) * 0.1;
  const colRccVol = numColumns * (0.23 * 0.23 * (h + (p.excavation_depth || 0.9)));
  const copingBeamVol = len * 0.23 * 0.15;
  const brickVol = len * h * thk;
  const plasterArea = len * h * 2;

  return [
    makeItem("EW-1", excavVol, "earthwork"),
    makeItem("EW-3", excavVol * 0.5, "earthwork"),
    makeItem("CC-1", pccVol, "substructure"),
    makeItem("RC-1", colRccVol + copingBeamVol, "rcc"),
    makeItem("RC-2", (colRccVol + copingBeamVol) * 110, "rcc"),
    makeItem("SH-1", numColumns * (0.23 * 4 * h) + len * 0.3, "rcc"),
    makeItem("BW-1", brickVol, "superstructure"),
    makeItem("PL-2", plasterArea, "plaster"),
    makeItem("PT-2", plasterArea, "painting"),
    ...(p.outer_door_count > 0 ? [makeItem("DW-GATE", p.outer_door_count * (p.outer_door_size_m2 || 3.6), "doors_windows")] : []),
  ];
}

// 3. Cantilever Retaining Wall
function calcRetainingWallBOQ(p: BOQParameters): BOQLineItem[] {
  const len = p.outer_length || 30;
  const h = p.floor_height || 3.5;
  const baseW = h * 0.6; // Base slab width ~ 0.6 H
  const stemThkAvg = 0.35;
  const baseThk = 0.4;

  const excavVol = len * (baseW + 0.6) * (p.excavation_depth || 1.8);
  const pccVol = len * baseW * 0.1;
  const stemRccVol = len * h * stemThkAvg;
  const baseRccVol = len * baseW * baseThk;
  const totalRcc = stemRccVol + baseRccVol;
  const rebarKg = totalRcc * 135;
  const numWeepholes = Math.floor(len / 1.5) * Math.floor(h / 1.2);

  return [
    makeItem("EW-2", excavVol, "earthwork", "Hard strata / rock excavation"),
    makeItem("EW-3", excavVol * 0.8, "earthwork"),
    makeItem("CC-1", pccVol, "substructure"),
    makeItem("RW-STEM", totalRcc, "rcc", "M25 RCC stem & base slab complete"),
    makeItem("RC-2", rebarKg, "rcc", "Fe500D heavy retaining rebar"),
    makeItem("SH-2", len * h * 2 + len * baseThk * 2, "rcc"),
    makeItem("RW-WEEP", numWeepholes, "external", "100mm PVC weep holes with filter"),
    makeItem("EW-BACKFILL", len * h * 1.2, "earthwork", "Graded gravel backfill behind wall"),
  ];
}

// 4. Roads (Bituminous BT & Concrete CC / PQC)
function calcRoadBOQ(p: BOQParameters): BOQLineItem[] {
  const len = p.outer_length || 100;
  const w = p.outer_width || 7.0;
  const roadArea = len * w;
  const isConcrete = p.typology === "internal_road_cc";

  if (isConcrete) {
    const gsbVol = roadArea * 0.15;
    const dlcVol = roadArea * 0.10;
    const pqcVol = roadArea * 0.20;
    return [
      makeItem("RD-SUBGRADE", roadArea, "earthwork"),
      makeItem("RD-GSB", gsbVol, "substructure", "150mm Granular Sub-Base"),
      makeItem("RD-DLC", dlcVol, "substructure", "100mm Dry Lean Concrete M10"),
      makeItem("RD-PQC", pqcVol, "rcc", "200mm PQC M30 with dowel & tie bars"),
      makeItem("RD-KERB", len * 2, "external", "Precast kerb stones along road edges"),
    ];
  } else {
    // Bituminous Road
    const gsbVol = roadArea * 0.15;
    const wmmVol = roadArea * 0.15;
    const dbmVol = roadArea * 0.05;
    const bcVol = roadArea * 0.03;
    return [
      makeItem("RD-SUBGRADE", roadArea, "earthwork"),
      makeItem("RD-GSB", gsbVol, "substructure", "150mm GSB"),
      makeItem("RD-WMM", wmmVol, "substructure", "150mm WMM"),
      makeItem("RD-TACK", roadArea * 2, "superstructure", "Prime coat & Tack coat"),
      makeItem("RD-DBM", dbmVol, "superstructure", "50mm Dense Bituminous Macadam"),
      makeItem("RD-BC", bcVol, "superstructure", "30mm Bituminous Concrete wearing course"),
      makeItem("RD-KERB", len * 2, "external"),
    ];
  }
}

// 5. RCC Storm Drain
function calcDrainBOQ(p: BOQParameters): BOQLineItem[] {
  const len = p.outer_length || 100;
  const w = p.outer_width || 1.0;
  const depth = p.floor_height || 1.2;
  const wallThk = 0.15;

  const excavVol = len * (w + 0.4) * (depth + 0.2);
  const pccVol = len * (w + 0.2) * 0.1;
  const rccVol = len * (w * wallThk + depth * wallThk * 2);

  return [
    makeItem("DR-EXCAV", excavVol, "earthwork"),
    makeItem("EW-3", excavVol * 0.8, "earthwork"),
    makeItem("DR-PCC", pccVol, "substructure"),
    makeItem("DR-RCC", rccVol, "rcc", "M20 RCC bed & side walls"),
    makeItem("RC-2", rccVol * 95, "rcc"),
    makeItem("PL-WP", len * (w + depth * 2), "plaster", "Waterproof plaster inside drain"),
    makeItem("DR-COVER", len, "external", "SFRC / Cast Iron grating covers"),
  ];
}

// 6. Septic Tank (IS 2470)
function calcSepticTankBOQ(p: BOQParameters): BOQLineItem[] {
  const len = p.outer_length || 4.5;
  const w = p.outer_width || 2.0;
  const depth = p.floor_height || 2.2;
  const wallThk = 0.23;

  const excavVol = (len + 1.0) * (w + 1.0) * (depth + 0.4);
  const pccVol = (len + 0.6) * (w + 0.6) * 0.1;
  const baseRccVol = (len + 0.4) * (w + 0.4) * 0.15;
  const brickVol = 2 * (len + w) * depth * wallThk + w * depth * 0.115; // with baffle
  const coverSlabArea = len * w;
  const plasterArea = 2 * (len + w) * depth + len * w;

  return [
    makeItem("DR-EXCAV", excavVol, "earthwork"),
    makeItem("EW-3", excavVol * 0.7, "earthwork"),
    makeItem("CC-1", pccVol, "substructure"),
    makeItem("RC-1", baseRccVol, "rcc", "RCC M25 bottom base slab"),
    makeItem("RC-2", baseRccVol * 110, "rcc"),
    makeItem("ST-WALL", brickVol, "superstructure", "Brickwork in CM 1:4 with waterproof additive"),
    makeItem("PL-WP", plasterArea, "plaster", "Waterproof plaster with neat cement punning"),
    makeItem("ST-SLAB", coverSlabArea, "rcc", "Precast RCC cover slabs with lifting hooks"),
    makeItem("ST-SOAK", 1, "external", "Soak pit 1.5m dia, 3m deep with aggregate filter"),
  ];
}

// 7. Community Toilet Block (SBM-G)
function calcToiletBlockBOQ(p: BOQParameters): BOQLineItem[] {
  const len = p.outer_length || 6.0;
  const w = p.outer_width || 4.0;
  const area = len * w;
  const baseItems = calcBuildingBOQ(p);

  return [
    ...baseItems,
    makeItem("SAN-WC", 4, "mep", "European / Indian WCs complete"),
    makeItem("SAN-URINAL", 2, "mep", "Urinals with auto flush"),
    makeItem("SAN-PIPE", len * 3, "mep", "CPVC water supply & drainage lines"),
    makeItem("FL-DADO", (len * 2 + w * 2) * 2.1, "flooring", "Full height ceramic wall tiles"),
  ];
}

// 8. Interior & Renovation Packages
function calcInteriorBOQ(p: BOQParameters): BOQLineItem[] {
  const len = p.outer_length;
  const w = p.outer_width;
  const area = len * w * (p.num_floors || 1);
  const perimeter = 2 * (len + w);

  switch (p.typology) {
    case "modular_kitchen":
      return [
        makeItem("INT-CARCASS", len * 2.2, "superstructure", "BWP Marine ply base & wall cabinets"),
        makeItem("INT-COUNTER", len * 0.65, "flooring", "20mm Granite / Quartz counter"),
        makeItem("INT-SINK", 1, "mep", "SS 304 double bowl sink with faucet"),
        makeItem("FL-DADO", len * 0.6, "flooring", "Kitchen backsplash tile dado"),
        makeItem("PT-1", (perimeter * p.floor_height), "painting"),
      ];

    case "bathroom_renovation":
      return [
        makeItem("INT-BATH-WP", area, "substructure", "2-coat polymer waterproofing on sunken slab"),
        makeItem("FL-CERAMIC", area, "flooring", "Anti-skid floor tiles"),
        makeItem("FL-DADO", perimeter * p.floor_height, "flooring", "Full-height glazed wall tiles"),
        makeItem("INT-BATH-CP", 1, "mep", "CP fittings package: diverter, shower & mixer"),
        makeItem("SAN-WC", 1, "mep", "Wall hung WC with concealed cistern"),
        makeItem("SAN-PIPE", 12, "mep", "CPVC/UPVC concealed pipe replacement"),
      ];

    case "false_ceiling":
      return [
        makeItem("INT-FC-GRID", area, "superstructure", "GI perimeter & ceiling suspension grid"),
        makeItem("INT-FC-BOARD", area, "superstructure", "12.5mm Gypsum board with taped joint finish"),
        makeItem("PT-1", area, "painting", "2 coats ceiling emulsion paint over primer"),
      ];

    case "vitrified_flooring":
      return [
        makeItem("FL-1", area, "flooring", "800×800mm double charged vitrified tiles with adhesive"),
        makeItem("FL-2", perimeter * p.num_floors, "flooring", "Matching skirting 100mm"),
      ];

    default:
      return calcBuildingBOQ(p);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Engine Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export function calculateBOQ(p: BOQParameters): BOQResult {
  let lineItems: BOQLineItem[] = [];

  switch (p.typology) {
    case "boundary_wall":
    case "compound_wall":
      lineItems = calcWallBOQ(p);
      break;

    case "retaining_wall":
      lineItems = calcRetainingWallBOQ(p);
      break;

    case "internal_road_bt":
    case "internal_road_cc":
      lineItems = calcRoadBOQ(p);
      break;

    case "rcc_drain":
      lineItems = calcDrainBOQ(p);
      break;

    case "septic_tank":
      lineItems = calcSepticTankBOQ(p);
      break;

    case "toilet_block":
      lineItems = calcToiletBlockBOQ(p);
      break;

    case "modular_kitchen":
    case "bathroom_renovation":
    case "false_ceiling":
    case "vitrified_flooring":
      lineItems = calcInteriorBOQ(p);
      break;

    case "g1_residential":
    case "multi_storey_rcc":
    case "villa":
    default:
      lineItems = calcBuildingBOQ(p);
      break;
  }

  const totalCost = r2(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const builtUpArea = r2(p.outer_length * p.outer_width * p.num_floors);

  const assumptions = [
    `Structure: ${p.typology.toUpperCase()} | Length: ${p.outer_length}m × Width: ${p.outer_width}m × ${p.num_floors} Floor(s)`,
    `Rates: CPWD DSR 2023 Vol 1 & Vol 2 | Measurements: IS 1200 / NBC 2016`,
    p.inner_wall_length > 0
      ? `✓ Internal partition walls (${p.inner_wall_length}m) calculated with deductions`
      : `✓ Typology specific sub-grade, structural and finish items included`,
  ];

  return {
    typology: p.typology,
    built_up_area: builtUpArea,
    total_cost: totalCost,
    assumptions,
    line_items: lineItems,
  };
}

export function groupByStage(items: BOQLineItem[]): Record<string, BOQLineItem[]> {
  return items.reduce<Record<string, BOQLineItem[]>>((acc, item) => {
    if (!acc[item.stage]) acc[item.stage] = [];
    acc[item.stage].push(item);
    return acc;
  }, {});
}
