/**
 * Physics-Based & IS 1200 Compliant Multi-Module BOQ Calculation Engine
 * ====================================================================
 * Encodes actual civil construction sequences, net centerline with T-junction
 * deductions, strict opening deductions (IS 1200 Pt 3), plastering rules (IS 1200 Pt 12),
 * disjoint concrete accounting (IS 456), element-wise rebar densities, and stage opt-in/opt-out.
 */

import { BOQParameters, BOQLineItem, BOQResult, StageScopeFilters, DEFAULT_STAGE_SCOPES, STAGE_LABELS } from "./types";
import { BOQ_TEMPLATES } from "./catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Official CPWD DSR 2023 Rate Schedule & Metadata
// ─────────────────────────────────────────────────────────────────────────────
export const DSR_RATES: Record<
  string,
  { desc: string; unit: string; rate: number; isRef: string; stage: string; chapter: string }
> = {
  // ── Chapter 2: Earthwork ──
  "2.8.1": {
    desc: "Earth work in excavation by mechanical/manual means in foundation trenches (not exceeding 1.5m width or 10 sqm on plan), incl. dressing & ramming — All kinds of soil",
    unit: "m³",
    rate: 260.30,
    isRef: "IS 1200 Pt 1",
    stage: "earthwork",
    chapter: "2.0 Earthwork",
  },
  "2.8.2": {
    desc: "Earth work in excavation in foundation trenches in ordinary rock / hard strata (lead up to 50m)",
    unit: "m³",
    rate: 385.50,
    isRef: "IS 1200 Pt 1",
    stage: "earthwork",
    chapter: "2.0 Earthwork",
  },
  "2.25": {
    desc: "Filling available excavated earth (excluding rock) in trenches, plinth, sides of foundations etc. in layers not exceeding 20cm in depth, consolidating each deposited layer by ramming and watering",
    unit: "m³",
    rate: 320.00,
    isRef: "CPWD 2.25",
    stage: "earthwork",
    chapter: "2.0 Earthwork",
  },
  "2.26": {
    desc: "Extra for disposal of surplus excavated soil with mechanical transport (lead 50m)",
    unit: "m³",
    rate: 95.00,
    isRef: "IS 1200 Pt 1",
    stage: "earthwork",
    chapter: "2.0 Earthwork",
  },
  "2.34": {
    desc: "Diluting and injecting chemical emulsion for post/pre-construction anti-termite treatment @ 5 L/sqm",
    unit: "m²",
    rate: 185.00,
    isRef: "IS 6313 Pt 2",
    stage: "earthwork",
    chapter: "2.0 Earthwork",
  },

  // ── Chapter 4: Concrete Work & Foundation ──
  "4.1.8": {
    desc: "Providing and laying in position cement concrete 1:4:8 (1 cement : 4 coarse sand : 8 graded stone aggregate 40mm nominal size) in foundation bed up to plinth level",
    unit: "m³",
    rate: 6812.00,
    isRef: "IS 456",
    stage: "substructure",
    chapter: "4.0 Concrete Work",
  },
  "4.1.3": {
    desc: "Providing and laying in position cement concrete 1:2:4 (1 cement : 2 coarse sand : 4 graded stone aggregate 20mm) for plinth apron & bed",
    unit: "m³",
    rate: 7450.00,
    isRef: "IS 456",
    stage: "substructure",
    chapter: "4.0 Concrete Work",
  },
  "4.10": {
    desc: "Providing and laying Damp Proof Course (DPC) 50mm thick with cement concrete 1:2:4 (1 cement : 2 coarse sand : 4 graded stone aggregate 12.5mm) with integral waterproofing compound",
    unit: "m²",
    rate: 380.00,
    isRef: "CPWD 4.10",
    stage: "substructure",
    chapter: "4.0 Concrete Work",
  },
  "4.17": {
    desc: "Making plinth protection 50mm thick of cement concrete 1:3:6 over 75mm bed of dry brick ballast 40mm nominal size, consolidated and finished smooth",
    unit: "m²",
    rate: 749.30,
    isRef: "CPWD 4.17",
    stage: "substructure",
    chapter: "4.0 Concrete Work",
  },

  // ── Chapter 5: RCC & Steel ──
  "5.1.2": {
    desc: "Reinforced cement concrete work in isolated / strip footings, raft and foundation beams up to plinth level with 1:1.5:3 (M20/M25)",
    unit: "m³",
    rate: 9850.00,
    isRef: "IS 456",
    stage: "substructure",
    chapter: "5.0 RCC Work",
  },
  "5.2": {
    desc: "Reinforced cement concrete work in columns, plinth beams, tie beams & lintels complete up to floor five level with 1:1.5:3",
    unit: "m³",
    rate: 10850.00,
    isRef: "IS 456, IS 13920",
    stage: "rcc",
    chapter: "5.0 RCC Work",
  },
  "5.3": {
    desc: "Reinforced cement concrete work in beams, suspended floors, roof slabs having slope up to 15°, balconies, chajjas, lintels and staircases with 1:1.5:3",
    unit: "m³",
    rate: 11505.50,
    isRef: "IS 456",
    stage: "rcc",
    chapter: "5.0 RCC Work",
  },
  "5.9.1": {
    desc: "Centering and shuttering including strutting, propping etc. for foundations, footings, bases of columns",
    unit: "m²",
    rate: 540.00,
    isRef: "IS 1200 Pt 5",
    stage: "substructure",
    chapter: "5.0 RCC Work",
  },
  "5.9.2": {
    desc: "Centering and shuttering for columns, pillars, piers, posts and struts",
    unit: "m²",
    rate: 680.00,
    isRef: "IS 1200 Pt 5",
    stage: "rcc",
    chapter: "5.0 RCC Work",
  },
  "5.9.3": {
    desc: "Centering and shuttering including strutting, propping and removal of form for suspended floors, roofs, landings, balconies and access platforms",
    unit: "m²",
    rate: 927.25,
    isRef: "IS 1200 Pt 5",
    stage: "rcc",
    chapter: "5.0 RCC Work",
  },
  "5.9.5": {
    desc: "Centering and shuttering for beams, plinth beams, girders, bressummers and cantilevers",
    unit: "m²",
    rate: 620.00,
    isRef: "IS 1200 Pt 5",
    stage: "rcc",
    chapter: "5.0 RCC Work",
  },
  "5.22.6": {
    desc: "Steel reinforcement for R.C.C. work including straightening, cutting, bending, placing in position and binding all complete — Thermo-Mechanically Treated (TMT) bars Fe-500D",
    unit: "kg",
    rate: 107.85,
    isRef: "IS 1786",
    stage: "rcc",
    chapter: "5.0 RCC Work",
  },

  // ── Chapter 6: Masonry Work ──
  "6.1.2": {
    desc: "Brick work with common burnt clay F.P.S. (non modular) bricks of class designation 7.5 in foundation and plinth in Cement mortar 1:6 (1 cement : 6 coarse sand)",
    unit: "m³",
    rate: 7650.00,
    isRef: "IS 1200 Pt 3",
    stage: "substructure",
    chapter: "6.0 Masonry",
  },
  "6.4.2": {
    desc: "Brick work with common burnt clay F.P.S. bricks class 7.5 in superstructure above plinth level up to floor V level in Cement mortar 1:6 (230mm main walls)",
    unit: "m³",
    rate: 9105.95,
    isRef: "IS 1200 Pt 3, IS 1905",
    stage: "superstructure",
    chapter: "6.0 Masonry",
  },
  "6.13": {
    desc: "Half brick masonry with clay F.P.S. bricks in cement mortar 1:4 with 2 nos 6mm dia M.S. bars / hoop iron reinforcement at every 3rd course (115mm partition walls)",
    unit: "m²",
    rate: 945.00,
    isRef: "IS 1200 Pt 3",
    stage: "superstructure",
    chapter: "6.0 Masonry",
  },
  "6.28": {
    desc: "Autoclaved Aerated Concrete (AAC) block masonry with 200mm blocks in superstructure with polymer modified thin bed adhesive",
    unit: "m³",
    rate: 6850.00,
    isRef: "IS 2185 Pt 3",
    stage: "superstructure",
    chapter: "6.0 Masonry",
  },

  // ── Chapter 9 & 10: Woodwork, Steel & Aluminium ──
  "9.5.1.1": {
    desc: "Providing and fixing panelled or panelled & glazed shutters for doors (35mm thick) with second class teak wood / hardwood frame, butt hinges & brass fittings",
    unit: "m²",
    rate: 4111.95,
    isRef: "IS 2202",
    stage: "doors_windows",
    chapter: "9.0 Woodwork",
  },
  "9.21.1": {
    desc: "Providing and fixing 35mm thick solid core flush door shutters (commercial type) with hardwood lipping and SS mortise lock with lever handles",
    unit: "m²",
    rate: 2850.00,
    isRef: "IS 2202 Pt 1",
    stage: "doors_windows",
    chapter: "9.0 Woodwork",
  },
  "10.31": {
    desc: "Providing and fixing mild steel angle iron / tube frames for doors, windows and ventilators (35x35x5 mm) with dash fasteners & priming coat",
    unit: "kg",
    rate: 130.50,
    isRef: "CPWD 10.31",
    stage: "doors_windows",
    chapter: "10.0 Steel Work",
  },
  "10.25": {
    desc: "Mild steel structural work in entrance gates, railings, roof trusses and framework with gusset plates, welding and red oxide primer",
    unit: "kg",
    rate: 145.00,
    isRef: "IS 800",
    stage: "doors_windows",
    chapter: "10.0 Steel Work",
  },
  "10.28": {
    desc: "Mild steel safety window grills with square/flat bars welded to angle frame @ 12-15 kg/sqm with anti-corrosive primer",
    unit: "kg",
    rate: 135.00,
    isRef: "CPWD 10.28",
    stage: "doors_windows",
    chapter: "10.0 Steel Work",
  },
  "12.1.2": {
    desc: "Providing corrugated G.I. sheet roofing 0.63mm thick fixed with polymer coated J or L hooks, limpet washers and bitumen washers",
    unit: "m²",
    rate: 850.00,
    isRef: "IS 277",
    stage: "rcc",
    chapter: "12.0 Roofing",
  },

  // ── Chapter 11: Flooring ──
  "11.39": {
    desc: "Providing and laying rectified glazed ceramic floor tiles 300x300mm conforming to IS 15622 over 20mm cement mortar 1:4 with cement slurry & grouting",
    unit: "m²",
    rate: 1330.00,
    isRef: "IS 1200 Pt 11",
    stage: "flooring",
    chapter: "11.0 Flooring",
  },
  "11.41": {
    desc: "Providing and laying polished vitrified floor tiles 600x600mm / 800x800mm (group Bla) conforming to IS 15622 on 20mm cement mortar 1:4",
    unit: "m²",
    rate: 1540.00,
    isRef: "IS 1200 Pt 11",
    stage: "flooring",
    chapter: "11.0 Flooring",
  },
  "11.42": {
    desc: "Providing matching vitrified tile skirting 100mm height embedded in cement mortar with neat cement slurry",
    unit: "m",
    rate: 145.00,
    isRef: "IS 1200 Pt 11",
    stage: "flooring",
    chapter: "11.0 Flooring",
  },
  "11.45": {
    desc: "Ceramic glazed wall tiles (dado) 300x450mm in toilets and kitchen up to 2.1m height over 12mm cement plaster 1:3",
    unit: "m²",
    rate: 1250.00,
    isRef: "IS 1200 Pt 11",
    stage: "flooring",
    chapter: "11.0 Flooring",
  },

  // ── Chapter 13: Plastering & Painting ──
  "13.1.2": {
    desc: "12 mm cement plaster of mix 1:6 (1 cement : 6 fine sand) on internal brick walls with smooth trowel finish",
    unit: "m²",
    rate: 333.35,
    isRef: "IS 1200 Pt 12",
    stage: "plaster",
    chapter: "13.0 Finishing",
  },
  "13.5.2": {
    desc: "15 mm to 18 mm cement plaster on rough side of external walls of mix 1:6 (1 cement : 6 coarse sand) with sand face finish",
    unit: "m²",
    rate: 395.35,
    isRef: "IS 1200 Pt 12",
    stage: "plaster",
    chapter: "13.0 Finishing",
  },
  "13.41.1": {
    desc: "Distempering with 1st quality acrylic washable distemper (two or more coats) over priming coat with cement primer",
    unit: "m²",
    rate: 185.65,
    isRef: "CPWD 13.41",
    stage: "painting",
    chapter: "13.0 Finishing",
  },
  "13.46.1": {
    desc: "Finishing walls with Acrylic Smooth exterior weather-shield paint of required shade (Two or more coats over exterior primer)",
    unit: "m²",
    rate: 160.60,
    isRef: "CPWD 13.46",
    stage: "painting",
    chapter: "13.0 Finishing",
  },
  "13.60": {
    desc: "Applying two coats of wall care putty (1.5mm thickness) to provide smooth white leveling surface before painting",
    unit: "m²",
    rate: 95.00,
    isRef: "CPWD 13.60",
    stage: "painting",
    chapter: "13.0 Finishing",
  },

  // ── Chapter 17 & 19: Sanitary & Drainage ──
  "17.1.1": {
    desc: "Providing and fixing white vitreous china water closet (Orissa pan / European WC) with PVC low level cistern, seat cover & CP fittings",
    unit: "nos",
    rate: 6850.00,
    isRef: "IS 2556",
    stage: "mep",
    chapter: "17.0 Sanitary",
  },
  "17.7.1": {
    desc: "Providing and fixing wash basin 550x400mm with single hole pillar tap, CP brass waste coupling & PVC bottle trap",
    unit: "nos",
    rate: 3450.00,
    isRef: "IS 2556",
    stage: "mep",
    chapter: "17.0 Sanitary",
  },
  "19.1.1": {
    desc: "Constructing brick masonry septic tank 5-50 users with 230mm brickwork in CM 1:4, precast RCC slab cover, baffle wall & ventilation pipe",
    unit: "nos",
    rate: 28500.00,
    isRef: "IS 2470 Pt 1",
    stage: "mep",
    chapter: "19.0 Drainage",
  },
  "19.2.1": {
    desc: "Constructing soak pit 1.5m dia and 3.0m deep lined with dry brickwork and filled with brick bats & 40mm aggregate complete",
    unit: "nos",
    rate: 14500.00,
    isRef: "IS 2470 Pt 2",
    stage: "mep",
    chapter: "19.0 Drainage",
  },

  // ── Specialized Infrastructure & Interiors ──
  "INT-KIT-CARCASS": {
    desc: "Providing and fixing modular kitchen base & wall carcass with 16mm Boiling Water Proof (IS 710 BWP) Marine Ply & 0.8mm liner",
    unit: "m²",
    rate: 3800.00,
    isRef: "IS 710",
    stage: "finishes",
    chapter: "Interiors",
  },
  "INT-KIT-TOP": {
    desc: "Providing and fixing 20mm thick polished Jet Black Granite countertop with machine-molded nosing, sink and hob cutouts",
    unit: "m²",
    rate: 2850.00,
    isRef: "CPWD 8.2",
    stage: "finishes",
    chapter: "Interiors",
  },
  "INT-FC-GYP": {
    desc: "Providing and fixing suspended false ceiling with ultra-light GI framework, 12.5mm gypsum board, jointing compound, paper tape & primer",
    unit: "m²",
    rate: 1150.00,
    isRef: "IS 2095",
    stage: "finishes",
    chapter: "Interiors",
  },
  "DR-U-DRAIN": {
    desc: "Constructing RCC roadside U-storm drain with M20/M25 concrete, formwork, rebar and precast heavy-duty SFRC cover slabs complete",
    unit: "m",
    rate: 3450.00,
    isRef: "IS 4111",
    stage: "external",
    chapter: "Infrastructure",
  },
};

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function makeDSRItem(
  code: string,
  quantity: number,
  deductionsNote = "",
  overrideDesc = "",
  sourceModuleSlug = "",
  sourceModuleName = ""
): BOQLineItem {
  const meta = DSR_RATES[code] || {
    desc: overrideDesc || code,
    unit: "nos",
    rate: 100,
    isRef: "IS 1200",
    stage: "superstructure",
    chapter: "General",
  };
  const qty = round2(quantity);
  return {
    item_code: code,
    description: overrideDesc || meta.desc,
    unit: meta.unit,
    quantity: qty,
    rate: meta.rate,
    amount: round2(qty * meta.rate),
    stage: meta.stage,
    is_code_ref: meta.isRef,
    deductions_note: deductionsNote,
    source_module: sourceModuleSlug,
    source_module_name: sourceModuleName,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Physical Calculations by Calculator Module
// ─────────────────────────────────────────────────────────────────────────────

export function calculateModuleBOQ(
  slug: string,
  params: Record<string, any>,
  scopes: StageScopeFilters = DEFAULT_STAGE_SCOPES,
  floorMultiplier: number = 1
): BOQLineItem[] {
  const template = BOQ_TEMPLATES[slug];
  const items: BOQLineItem[] = [];
  const modName = template?.name || slug;

  const push = (code: string, qty: number, note: string = "", overrideDesc: string = "") => {
    if (qty <= 0) return;
    const rateInfo = DSR_RATES[code];
    const stage = rateInfo?.stage || "superstructure";

    // Stage Opt-Out Check
    if (stage === "earthwork" && !scopes.earthwork) return;
    if (stage === "substructure" && !scopes.foundation) return;
    if (stage === "superstructure" && !scopes.superstructure) return;
    if (stage === "rcc" && !scopes.rcc) return;
    if (stage === "plaster" && !scopes.finishes) return;
    if (stage === "flooring" && !scopes.finishes) return;
    if (stage === "painting" && !scopes.finishes) return;
    if (stage === "doors_windows" && !scopes.openings) return;
    if (stage === "mep" && !scopes.mep) return;

    items.push(makeDSRItem(code, qty, note, overrideDesc, slug, modName));
  };

  // ── 1. PMAY-G Rural House (1BHK, 25 m²) ──
  if (slug === "pmay-g-rural-house") {
    const L = Number(params.length_m ?? 6.0);
    const W = Number(params.width_m ?? 4.5);
    const H = Number(params.height_m ?? 2.7);
    const wallThkMm = Number(params.wall_thk_mm ?? 230);
    const wallThkM = wallThkMm / 1000;
    const roofType = params.roof_type ?? "rcc";
    const withVerandah = params.with_verandah ?? true;
    const withFinishes = params.with_finishes ?? true;

    // Derived Physical Metrics
    const footprintM2 = L * W + (withVerandah ? 5.0 : 0);
    const perimeterM = 2 * (L + W);
    const nIntWalls = 2; // 1 hall partition + 1 bath/toilet partition
    const intWallLenM = nIntWalls * W * 0.7; // ~6.3m
    const trenchLM = perimeterM + intWallLenM - (4 * 0.3); // net centerline with T-junction deduction
    const trenchWM = wallThkM + 0.30;
    const foundationDM = 0.75;
    const plinthHM = 0.45;

    // Earthwork & Foundation
    const excavVolM3 = trenchLM * trenchWM * (foundationDM + 0.10);
    const pccVolM3 = trenchLM * (wallThkM + 0.15) * 0.10;
    const brickFoundVolM3 = trenchLM * wallThkM * (foundationDM + plinthHM);
    const dpcAreaM2 = (perimeterM - 0.9) * wallThkM; // excludes door opening

    push("2.8.1", excavVolM3, `Net Centerline (${trenchLM.toFixed(1)}m × ${trenchWM.toFixed(2)}m × 0.85m depth)`);
    push("4.1.8", pccVolM3, `Foundation Base PCC 1:4:8 M10 (100mm thick)`);
    push("6.1.2", brickFoundVolM3, `Stepped Brick Foundation & Plinth in CM 1:6`);
    push("4.10", dpcAreaM2, `50mm DPC with Waterproof Compound (excluding doors)`);

    // Superstructure Masonry (with IS 1200 deductions)
    const grossExtBrick = perimeterM * wallThkM * H;
    const grossIntBrick = intWallLenM * 0.115 * H;
    const doorDeduction = 3 * (0.85 * 2.0 * wallThkM); // 3 doors
    const winDeduction = 4 * (1.2 * 1.0 * wallThkM); // 4 windows
    const netBrickAboveM3 = grossExtBrick + grossIntBrick - (doorDeduction + winDeduction);
    push("6.4.2", netBrickAboveM3, `Net Superstructure Brickwork (IS 1200 Opening Deductions: -${(doorDeduction + winDeduction).toFixed(2)}m³)`);

    // Roof & Structure
    if (roofType === "rcc") {
      const slabAreaM2 = (L + 0.3) * (W + 0.3);
      const rccSlabVolM3 = slabAreaM2 * 0.10;
      const steelKg = rccSlabVolM3 * 80;
      push("5.3", rccSlabVolM3, `RCC Roof Slab 100mm (M20 1:1.5:3)`);
      push("5.9.3", slabAreaM2, `Roof Slab Centering & Shuttering`);
      push("5.22.6", steelKg, `Fe500D TMT Rebar (80 kg/m³ slab concrete)`);
    } else {
      const giRoofAreaM2 = footprintM2 * 1.15;
      const msTrussKg = footprintM2 * 8.0;
      push("10.31", msTrussKg, `MS Angle Roof Truss & Purlins`);
      push("12.1.2", giRoofAreaM2, `Corrugated GI Sheet Roofing 0.63mm`);
    }

    // Finishes (Plaster, Paint, Flooring, Doors/Windows)
    if (withFinishes) {
      const intPlasterM2 = (perimeterM + intWallLenM * 2) * H + footprintM2 - (3 * 0.85 * 2.0 + 4 * 1.2 * 1.0);
      const extPlasterM2 = perimeterM * (H + plinthHM) - (3 * 0.85 * 2.0 + 4 * 1.2 * 1.0);
      push("13.1.2", intPlasterM2, `12mm Internal Cement Plaster (1:6)`);
      push("13.5.2", extPlasterM2, `15mm External Sand-Face Plaster (1:6)`);
      push("13.41.1", intPlasterM2, `Internal Distemper (2 Coats over Primer)`);
      push("13.46.1", extPlasterM2, `External Weather-Shield Acrylic Paint`);
      push("11.39", footprintM2, `Glazed Ceramic Floor Tiles 300x300mm`);
      push("9.5.1.1", 3 * 0.85 * 2.0, `Solid Teak/Hardwood Panelled Doors (3 Nos)`);
      push("10.31", 4 * 14.0, `MS Angle Window Frames with Safety Grills (4 Nos)`);
      push("4.17", perimeterM * 0.60, `50mm CC Plinth Protection Apron with 1:25 slope`);
    }
  }

  // ── 2. Residential Villa / Multi-Storey RCC Frame (G+1 to G+5) ──
  else if (slug === "g1-residential-house" || slug === "multi-storey-rcc-frame") {
    const isMultiStorey = slug === "multi-storey-rcc-frame";
    const defaultFloors = isMultiStorey ? 4 : 2;
    const defaultLength = isMultiStorey ? 24.0 : 12.0;
    const defaultWidth = isMultiStorey ? 15.0 : 9.0;
    const L = Number(params.length_m ?? defaultLength);
    const W = Number(params.width_m ?? defaultWidth);
    const numFloors = Math.max(1, Number(params.num_floors ?? defaultFloors)) * floorMultiplier;
    const H = Number(params.height_m ?? (isMultiStorey ? 3.15 : 3.0));
    const soil = params.soil_type ?? "medium";
    const masonry = params.masonry_type ?? "brick";

    const outerTM = 0.23;
    const innerTM = 0.115;
    const perimeter = 2 * (L + W);
    const floorArea = L * W;
    const totalBua = floorArea * numFloors;
    const excavDepth = soil === "hard" ? 1.2 : soil === "soft" ? 1.8 : 1.5;

    // Columns & Footings layout (<= 4.0m bays)
    const xBays = Math.max(2, Math.round(L / 4.0));
    const yBays = Math.max(2, Math.round(W / 4.0));
    const numColumns = (xBays + 1) * (yBays + 1);

    // Earthwork & Foundation
    const footingPitVol = numColumns * (1.5 * 1.5 * excavDepth);
    const plinthTrenchVol = perimeter * 0.6 * 0.6;
    const totalExcav = footingPitVol + plinthTrenchVol;
    push("2.8.1", totalExcav, `Excavation for ${numColumns} Footings & Plinth Beams`);
    push("2.25", totalExcav * 0.40, `Backfilling around footings & plinth consolidation`);
    push("2.26", totalExcav * 0.60, `Surplus soil mechanical disposal`);

    const pccVol = numColumns * (1.5 * 1.5 * 0.10) + perimeter * 0.5 * 0.10;
    push("4.1.8", pccVol, `PCC 1:4:8 M10 Footing & Plinth Bed`);

    const footingConcrete = numColumns * (1.3 * 1.3 * 0.40);
    push("5.1.2", footingConcrete, `[Footings] RCC M25 Stepped/Trapezoidal Footings (${numColumns} Nos × 1.3×1.3×0.40m)`);
    push("5.9.1", numColumns * (1.3 * 4 * 0.40), `[Footing Shutt.] Footing Formwork ${numColumns} Nos`);
    push("5.22.6", footingConcrete * 85, `[Footing Steel] Fe500D TMT Rebar 85 kg/m³ × ${footingConcrete.toFixed(1)} m³ footings`);

    // RCC Frame (Columns, Plinth Beams, Floor Slabs)
    const totalColConcrete = numColumns * (0.23 * 0.38) * (H * numFloors + 1.2);
    push("5.2", totalColConcrete, `[Columns] RCC M25 Columns (${numColumns} Nos × 230×380mm)`);
    push("5.9.2", numColumns * 2 * (0.23 + 0.38) * (H * numFloors), `[Col Shuttering] Column Formwork`);
    push("5.22.6", totalColConcrete * 145, `[Col Steel] Fe500D TMT Rebar 145 kg/m³ × ${totalColConcrete.toFixed(1)} m³ columns (IS 13920 confinement)`);

    const plinthBeamVol = (perimeter + (xBays - 1) * W + (yBays - 1) * L) * (0.23 * 0.35);
    push("5.2", plinthBeamVol, `[Plinth Beams] RCC M25 Plinth Beams (230×350mm)`);
    push("5.9.5", plinthBeamVol / 0.35 * 0.70, `[Beam Shuttering] Plinth Beam Side Formwork`);
    push("5.22.6", plinthBeamVol * 115, `[Beam Steel] Fe500D TMT Rebar 115 kg/m³ × ${plinthBeamVol.toFixed(1)} m³ beams`);

    const slabVol = totalBua * 0.125;
    push("5.3", slabVol, `[Slab] RCC M25 Suspended Slabs 125mm (${totalBua.toFixed(0)} m² BUA)`);
    push("5.9.3", totalBua, `[Slab] Soffit Centering & Shuttering`);
    push("5.22.6", slabVol * 90, `[Slab Steel] Fe500D TMT Rebar 90 kg/m³ × ${slabVol.toFixed(1)} m³ slab`);

    // Masonry (Deducting openings & embedded columns)
    const extWallArea = perimeter * H * numFloors;
    const intWallArea = (perimeter * 0.65) * H * numFloors;
    const doorCount = Number(params.outer_door_count ?? 2) + Number(params.inner_door_count ?? 6);
    const winCount = Number(params.window_count ?? 8);
    const openingArea = doorCount * 1.8 + winCount * 1.44;

    const netExtBrickVol = (extWallArea - openingArea * 0.7) * outerTM;
    const netIntBrickArea = intWallArea - openingArea * 0.3;

    if (masonry === "aac") {
      push("6.28", netExtBrickVol + netIntBrickArea * innerTM, `AAC Block Masonry 200mm in Superstructure`);
    } else {
      push("6.4.2", netExtBrickVol, `230mm Main Brickwork (IS 1200 Openings Deducted)`);
      push("6.13", netIntBrickArea, `115mm Partition Brickwork with Hoop Iron`);
    }

    // Finishes (Plaster, Vitrified Tiles, Doors, Paint)
    const intPlasterArea = (extWallArea + intWallArea * 2 + totalBua) - openingArea;
    const extPlasterArea = extWallArea - openingArea;

    push("13.1.2", intPlasterArea, `12mm Internal Plaster 1:6`);
    push("13.5.2", extPlasterArea, `18mm External Sand-Face Waterproof Plaster 1:6`);
    push("13.60", intPlasterArea, `Wall Putty 2-Coats Internal`);
    push("13.41.1", intPlasterArea, `Premium Washable Acrylic Emulsion Paint`);
    push("13.46.1", extPlasterArea, `Exterior Weather-Shield Elastomeric Paint`);
    
    // Flooring — respects finish_quality setting
    const fq = params.finish_quality ?? "standard";
    const floorTileCode = fq === "economy" ? "11.39" : "11.41";
    const floorTileDesc = fq === "economy"
      ? `Glazed Ceramic Floor Tiles 300x300mm (Economy Grade) ${(totalBua * 0.85).toFixed(1)} m²`
      : fq === "luxury"
        ? `Large Format Polished Vitrified Tiles 800x800mm (Luxury) ${(totalBua * 0.85).toFixed(1)} m²`
        : `Polished Vitrified Floor Tiles 600x600mm (Standard) ${(totalBua * 0.85).toFixed(1)} m²`;
    push(floorTileCode, totalBua * 0.85, floorTileDesc);
    
    // Skirting: linear perimeter of all rooms = approx (perimeter + internal wall runs) × floors × 0.9
    const skirtingLm = (perimeter + intWallArea / (H * numFloors)) * numFloors * 0.9;
    push("11.42", skirtingLm, `Matching Vitrified Tile Skirting 100mm (${skirtingLm.toFixed(1)} lin.m)`);
    push("9.21.1", doorCount * 1.89, `35mm Flush Doors with Hardwood Frame & Mortise Lock`);
    push("10.28", winCount * 18.0, `MS Safety Window Grills with Enamel Paint`);

    // Luxury extras
    if (fq === "luxury") {
      push("INT-FC-GYP", totalBua * 0.60, `Gypsum False Ceiling in Living & Bedrooms (Luxury)`);
      push("INT-KIT-TOP", 3.0, `20mm Granite Kitchen Countertop (Luxury)`);
    }

    // MEP & Sanitary
    const bathCount = Math.max(1, Number(params.bathroom_count ?? Math.max(2, Math.floor(numFloors * 2))));
    push("17.1.1", bathCount, `Water Closets (European WC / Orissa Pan) in ${bathCount} Toilets`);
    push("17.7.1", bathCount, `Wash Basins with CP Pillar Taps in ${bathCount} Bathrooms`);
    push("19.1.1", 1, `Brick Masonry Septic Tank (15 Users per IS 2470)`);
    push("19.2.1", 1, `Connected Soak Pit 1.5m dia, 3m depth`);
  }

  // ── 3. Boundary Wall ──
  else if (slug === "boundary-wall") {
    const len = Number(params.wall_length_m ?? 60.0);
    const h = Number(params.wall_height_m ?? 2.1);
    const wallThk = Number(params.wall_thk_mm ?? 230) / 1000;
    const withGate = params.with_gate_opening ?? true;
    const netLen = withGate ? Math.max(1, len - 3.5) : len;

    const trenchW = wallThk + 0.35;
    const excavVol = netLen * trenchW * 0.75;
    push("2.8.1", excavVol, `Trench Excavation for ${netLen.toFixed(1)}m Boundary Wall`);
    push("4.1.8", netLen * trenchW * 0.10, `PCC 1:4:8 M10 Foundation Bed 100mm`);
    push("6.1.2", netLen * wallThk * 0.60, `Brick Masonry in Foundation & Plinth`);
    push("4.10", netLen * wallThk, `50mm Damp Proof Course with Bitumen Coating`);

    // Columns spaced @ 3.0m
    const numCols = Math.ceil(netLen / 3.0) + 1;
    const colVol = numCols * (0.23 * 0.23) * (h + 0.6);
    push("5.2", colVol, `RCC M20 Stiffener Columns (${numCols} Nos @ 3m c/c)`);
    push("5.22.6", colVol * 110, `Column Rebar Fe500D (110 kg/m³)`);

    const brickVol = netLen * wallThk * h - colVol;
    push("6.4.2", brickVol, `230mm Brick Wall Superstructure`);
    push("13.5.2", netLen * h * 2, `15mm Plaster on Both Sides (1:6)`);
    push("13.46.1", netLen * h * 2, `Exterior Weather-Shield Paint on Both Sides`);
  }

  // ── 4. Cantilever Retaining Wall ──
  else if (slug === "cantilever-retaining-wall") {
    const len = Number(params.wall_length_m ?? 25.0);
    const h = Number(params.retained_height_m ?? 3.5);
    const baseW = Number(params.base_width_m ?? 2.4);

    const excavVol = len * (baseW + 0.6) * 1.5;
    push("2.8.1", excavVol, `Retaining Wall Trench Excavation`);
    push("4.1.8", len * baseW * 0.10, `PCC M10 Leveling Bed`);

    const baseSlabVol = len * baseW * 0.40;
    const stemAvgThk = 0.35;
    const stemVol = len * stemAvgThk * h;
    const totalRcc = baseSlabVol + stemVol;

    push("5.1.2", totalRcc, `RCC M25 in Retaining Wall Stem & Base Slab`);
    push("5.9.1", len * 2 * (h + baseW), `Formwork for Stem & Base Slab`);
    push("5.22.6", totalRcc * 110, `TMT Fe500D Rebar (110 kg/m³)`);
    push("2.25", len * (baseW - stemAvgThk) * h * 0.8, `Graded Filter Sand/Gravel Backfilling`);
  }

  // ── 5. Septic Tank (IS 2470) ──
  else if (slug === "septic-tank") {
    const users = Number(params.users_count ?? 10);
    const L = Number(params.length_m ?? 2.3);
    const W = Number(params.width_m ?? 1.1);
    const D = Number(params.liquid_depth_m ?? 1.4) + 0.3; // +0.3m freeboard
    const withSoak = params.with_soak_pit ?? true;

    const pitL = L + 0.8;
    const pitW = W + 0.8;
    const pitD = D + 0.4;
    push("2.8.1", pitL * pitW * pitD, `Excavation for ${users}-User Septic Tank Pit`);
    push("4.1.8", pitL * pitW * 0.10, `PCC M10 Base Bed 100mm`);
    push("6.1.2", (2 * (L + W) + W) * 0.23 * D, `Brickwork in CM 1:4 with Baffle Wall`);
    push("13.1.2", (2 * (L + W) * D + L * W) * 1.2, `15mm Waterproof Plaster (1:3) with Neat Cement Floating`);
    push("5.3", L * W * 0.10, `Precast RCC M25 Cover Slabs with Lifting Hooks`);
    push("5.22.6", L * W * 0.10 * 85, `Cover Slab Steel Rebar`);

    if (withSoak) {
      push("19.2.1", 1, `Connected Soak Pit (1.5m dia, 3m depth with brick bats)`);
    }
  }

  // ── 6. Modular Kitchen ──
  else if (slug === "modular-kitchen") {
    const rft = Number(params.running_length_rft ?? 18.0);
    const mLen = rft * 0.3048; // convert to metres
    const hasOverhead = params.has_overhead_cabinets ?? true;
    const hasGranite = params.has_granite_top ?? true;

    const baseCarcassM2 = mLen * 0.85; // base unit
    const wallCarcassM2 = hasOverhead ? mLen * 0.60 : 0;
    push("INT-KIT-CARCASS", baseCarcassM2 + wallCarcassM2, `BWP Marine Ply (IS 710) Kitchen Cabinets (${rft} Rft)`);

    if (hasGranite) {
      push("INT-KIT-TOP", mLen * 0.65, `20mm Polished Jet Black Granite Countertop`);
    }
    push("11.45", mLen * 0.60, `Kitchen Dado Ceramic Wall Tiles 300x450mm`);
    push("17.7.1", 1, `SS304 Double Bowl Sink with Swivel CP Tap`);
  }

  // ── 7. False Ceiling ──
  else if (slug === "false-ceiling-package") {
    const area = Number(params.ceiling_area_m2 ?? 120.0);
    const cove = Number(params.cove_perimeter_m ?? 48.0);

    push("INT-FC-GYP", area, `12.5mm Gypsum False Ceiling on GI Suspension Grid`);
    push("13.60", area + cove * 0.4, `Joint Taping & Wall Putty on False Ceiling`);
    push("13.41.1", area + cove * 0.4, `2-Coat Ceiling Acrylic Emulsion Paint`);
  }

  // ── 8. Full Home Painting ──
  else if (slug === "painting-full-home") {
    const carpet = Number(params.carpet_area_sqft ?? 1200.0);
    const carpetM2 = carpet * 0.0929;
    const intPaintArea = carpetM2 * 3.5;
    const extPaintArea = params.include_exterior ? carpetM2 * 1.2 : 0;
    const nos = Number(params.doors_windows_nos ?? 10);

    push("13.60", intPaintArea, `Full Internal Wall Putty Surface Preparation`);
    push("13.41.1", intPaintArea, `Internal Premium Acrylic Washable Emulsion`);
    if (extPaintArea > 0) {
      push("13.46.1", extPaintArea, `Exterior Weather-Shield Elastomeric Emulsion`);
    }
    push("10.28", nos * 15.0, `Synthetic Enamel Paint on Window Grills & Gates`);
  }

  // ── 9. RCC Storm Drain ──
  else if (slug === "rcc-drain") {
    const len = Number(params.drain_length_m ?? 100.0);
    const w = Number(params.internal_width_m ?? 0.60);
    const d = Number(params.internal_depth_m ?? 0.75);

    const totalW = w + 0.30;
    const totalD = d + 0.25;
    push("2.8.1", len * totalW * totalD, `Excavation for Storm Drain Trench`);
    push("4.1.8", len * totalW * 0.10, `PCC M10 Base Bed 100mm`);

    const rccVol = len * (totalW * 0.15 + 2 * d * 0.15);
    push("5.2", rccVol, `RCC M25 in Drain Bed & Wall Sections`);
    push("5.9.1", len * 2 * (d + 0.15), `Formwork for Drain Walls`);
    push("5.22.6", rccVol * 95, `Drain Steel Reinforcement Fe500D`);
    push("DR-U-DRAIN", len, `Precast Heavy Duty SFRC Drain Cover Grating Slabs`);
  }

  // ── Generic Family Fallback (only fires when no matching slug found) ──
  else if (items.length === 0) {
    const family = template?.family || "residential";
    if (family === "residential" || family === "institutional" || family === "specialty") {
      const L = Number(params.length_m ?? 15.0);
      const W = Number(params.width_m ?? 10.0);
      const fl = Math.max(1, Number(params.num_floors ?? 2)) * floorMultiplier;
      const H = Number(params.height_m ?? 3.15);
      const bua = L * W * fl;
      const perim = 2 * (L + W);

      push("2.8.1", perim * 0.7 * 1.2, `Trench Excavation for ${modName}`);
      push("4.1.8", perim * 0.7 * 0.10, `PCC 1:4:8 M10 Foundation Bed`);
      push("5.1.2", bua * 0.04, `RCC Footings & Foundation`);
      push("5.2", bua * 0.06, `RCC Columns & Plinth Beams`);
      push("5.3", bua * 0.125, `RCC Floor & Roof Slabs (125mm)`);
      push("5.22.6", bua * 0.225 * 115, `Fe500D TMT Reinforcement (115 kg/m³)`);
      push("6.4.2", perim * H * fl * 0.23 * 0.75, `230mm Masonry Walls`);
      push("13.1.2", bua * 2.8, `12mm Internal Cement Plaster`);
      push("13.5.2", perim * H * fl * 0.9, `18mm External Sand Face Plaster`);
      push("11.41", bua * 0.85, `Vitrified Floor Tile Flooring`);
      push("13.41.1", bua * 2.8, `Internal Acrylic Emulsion Paint`);
      push("17.1.1", Math.max(2, Math.round(fl * 2)), `Sanitary Water Closets`);
      push("17.7.1", Math.max(2, Math.round(fl * 2)), `Wash Basins with CP Fittings`);
    } else if (family === "walls") {
      const len = Number(params.wall_length_m ?? 50.0);
      const h = Number(params.wall_height_m ?? 2.1);
      push("2.8.1", len * 0.6 * 0.75, `Trench Excavation for ${modName}`);
      push("4.1.8", len * 0.6 * 0.10, `PCC 1:4:8 Base Bed`);
      push("6.1.2", len * 0.23 * 0.60, `Foundation Brickwork`);
      push("6.4.2", len * 0.23 * h, `Superstructure Masonry`);
      push("13.5.2", len * h * 2, `15mm Plaster on Both Sides`);
    } else if (family === "interiors") {
      const area = Number(params.ceiling_area_m2 ?? (params.carpet_area_sqft ? params.carpet_area_sqft * 0.0929 : 100));
      push("11.41", area, `Flooring / Interior Package in ${modName}`);
      push("INT-FC-GYP", area, `Suspended Ceiling in ${modName}`);
      push("13.41.1", area * 2.5, `Premium Painting in ${modName}`);
    }
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite Engine: Aggregates multiple active modules into a Master BOQ
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCompositeBOQ(
  activeModuleSlugs: string[],
  moduleParamsMap: Record<string, Record<string, any>>,
  scopes: StageScopeFilters = DEFAULT_STAGE_SCOPES,
  floorMultiplier: number = 1,
  finishQuality: "economy" | "standard" | "luxury" = "standard"
): BOQResult {
  if (!activeModuleSlugs || activeModuleSlugs.length === 0) {
    return {
      typology: "composite",
      built_up_area: 0,
      total_cost: 0,
      assumptions: ["No active calculators selected. Choose an archetype or add modules above."],
      line_items: [],
      module_totals: {},
      stage_totals: {},
    };
  }

  const allItems: BOQLineItem[] = [];
  const moduleTotals: Record<string, { name: string; amount: number; count: number }> = {};
  const stageTotals: Record<string, number> = {};
  let totalBua = 0;

  activeModuleSlugs.forEach((slug) => {
    const params = { ...(moduleParamsMap[slug] || {}), finish_quality: finishQuality };
    const template = BOQ_TEMPLATES[slug];
    const modItems = calculateModuleBOQ(slug, params, scopes, floorMultiplier);

    const modName = template?.name || slug;
    let modSum = 0;

    modItems.forEach((item) => {
      allItems.push(item);
      modSum += item.amount;
      stageTotals[item.stage] = (stageTotals[item.stage] || 0) + item.amount;
    });

    moduleTotals[slug] = {
      name: modName,
      amount: round2(modSum),
      count: modItems.length,
    };

    // Aggregate BUA if building module (cast to any to avoid TS2339 from spread inference)
    const anyParams = params as Record<string, any>;
    if (slug === "pmay-g-rural-house") {
      const L = Number(anyParams.length_m ?? 6.0);
      const W = Number(anyParams.width_m ?? 4.5);
      totalBua += L * W;
    } else if (slug === "g1-residential-house" || slug === "multi-storey-rcc-frame") {
      const L = Number(anyParams.length_m ?? 12.0);
      const W = Number(anyParams.width_m ?? 9.0);
      const fl = Math.max(1, Number(anyParams.num_floors ?? 2)) * floorMultiplier;
      totalBua += L * W * fl;
    }
  });

  const grandTotal = round2(allItems.reduce((sum, item) => sum + item.amount, 0));

  const assumptions = [
    `Rates: CPWD DSR 2023 (Delhi Schedule of Rates) & State PWD references`,
    `Measurements: IS 1200 (Part 1 Earthwork, Part 2 Concrete, Part 3 Brickwork, Part 5 Formwork, Part 11 Flooring, Part 12 Plaster, Part 13 Paint)`,
    `Active Construction Scopes: ${Object.entries(scopes).filter(([_, on]) => on).map(([k]) => k.toUpperCase()).join(", ")}`,
    `Active Calculators (${activeModuleSlugs.length}): ${activeModuleSlugs.map(s => BOQ_TEMPLATES[s]?.name || s).join(" + ")}`,
  ];

  return {
    typology: activeModuleSlugs.length === 1 ? activeModuleSlugs[0] : "composite",
    built_up_area: round2(totalBua),
    total_cost: grandTotal,
    assumptions,
    line_items: allItems,
    module_totals: moduleTotals,
    stage_totals: stageTotals,
  };
}

export function groupByStage(items: BOQLineItem[]): Record<string, BOQLineItem[]> {
  const grouped: Record<string, BOQLineItem[]> = {};
  Object.keys(STAGE_LABELS).forEach((stage) => {
    grouped[stage] = [];
  });

  items.forEach((item) => {
    const st = item.stage || "superstructure";
    if (!grouped[st]) grouped[st] = [];
    grouped[st].push(item);
  });

  // Remove empty stages
  Object.keys(grouped).forEach((key) => {
    if (grouped[key].length === 0) {
      delete grouped[key];
    }
  });

  return grouped;
}

export function groupByModule(items: BOQLineItem[]): Record<string, { name: string; items: BOQLineItem[]; total: number }> {
  const grouped: Record<string, { name: string; items: BOQLineItem[]; total: number }> = {};

  items.forEach((item) => {
    const slug = item.source_module || "other";
    const name = item.source_module_name || slug;
    if (!grouped[slug]) {
      grouped[slug] = { name, items: [], total: 0 };
    }
    grouped[slug].items.push(item);
    grouped[slug].total = round2(grouped[slug].total + item.amount);
  });

  return grouped;
}

export function calculateBOQ(params: BOQParameters): BOQResult {
  const slug = params.typology === "multi_storey_rcc" ? "g1-residential-house"
    : params.typology === "boundary_wall" || params.typology === "compound_wall" ? "boundary-wall"
    : params.typology === "retaining_wall" ? "cantilever-retaining-wall"
    : params.typology === "septic_tank" ? "septic-tank"
    : params.typology === "modular_kitchen" ? "modular-kitchen"
    : params.typology === "false_ceiling" ? "false-ceiling-package"
    : params.typology === "rcc_drain" ? "rcc-drain"
    : "g1-residential-house";

  const moduleParams: Record<string, any> = {
    length_m: params.outer_length || 12,
    width_m: params.outer_width || 9,
    num_floors: params.num_floors || 2,
    height_m: params.floor_height || 3.0,
    wall_length_m: params.outer_length || 60,
    wall_height_m: params.floor_height || 2.1,
    outer_door_count: params.outer_door_count || 2,
    inner_door_count: params.inner_door_count || 6,
    window_count: params.outer_window_count || 8,
    soil_type: params.soil_type || "medium",
  };

  return calculateCompositeBOQ([slug], { [slug]: moduleParams }, DEFAULT_STAGE_SCOPES, 1);
}


