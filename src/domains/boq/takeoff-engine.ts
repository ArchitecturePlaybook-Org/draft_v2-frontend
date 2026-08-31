import { TakeoffItem } from "@/types/estimation.types";
import { BOQLineItem, BOQResult } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CPWD DSR 2023 Rate Schedule & Metadata
// ─────────────────────────────────────────────────────────────────────────────
export const CPWD_DSR_RATES: Record<
  string,
  { desc: string; unit: string; rate: number; isRef: string; stage: string }
> = {
  // Earthwork
  "EW-1": {
    desc: "Earthwork excavation in foundation trenches / soft-medium soil (lead 50m)",
    unit: "m³",
    rate: 260.30,
    isRef: "IS 1200 Pt 1",
    stage: "earthwork",
  },
  "EW-3": {
    desc: "Disposal of surplus excavated earth with mechanical transport (lead 50m)",
    unit: "m³",
    rate: 95.00,
    isRef: "IS 1200 Pt 1",
    stage: "earthwork",
  },
  "EW-BACKFILL": {
    desc: "Earth/Sand filling under plinth & foundation trenches with watering & compaction",
    unit: "m³",
    rate: 320.00,
    isRef: "CPWD 2.25",
    stage: "earthwork",
  },

  // Substructure & Foundation
  "CC-1": {
    desc: "PCC 1:4:8 (M10) foundation bed with 40mm graded stone aggregate",
    unit: "m³",
    rate: 5850.00,
    isRef: "IS 456",
    stage: "substructure",
  },
  "CC-2": {
    desc: "PCC 1:2:4 (M15) for plinth flooring bed / apron 100mm thick",
    unit: "m³",
    rate: 6450.00,
    isRef: "IS 456",
    stage: "substructure",
  },
  "DPC-1": {
    desc: "Damp Proof Course (DPC) 50mm thick in concrete 1:2:4 with waterproofing compound",
    unit: "m²",
    rate: 380.00,
    isRef: "CPWD 4.11",
    stage: "substructure",
  },
  "RC-FTG": {
    desc: "RCC M25 in isolated/strip footings excluding shuttering & steel",
    unit: "m³",
    rate: 9250.00,
    isRef: "IS 456",
    stage: "substructure",
  },
  "SH-1": {
    desc: "Centering and shuttering including strutting & propping for footings/columns",
    unit: "m²",
    rate: 540.00,
    isRef: "IS 1200 Pt 5",
    stage: "substructure",
  },

  // Superstructure Masonry
  "BW-1": {
    desc: "Brickwork with common burnt clay F.P.S. bricks class 7.5 in CM 1:6 (230mm main wall)",
    unit: "m³",
    rate: 5450.00,
    isRef: "IS 1200 Pt 3",
    stage: "superstructure",
  },
  "BW-2": {
    desc: "Half brick masonry with clay F.P.S. bricks in CM 1:4 with hoop iron (115mm partition)",
    unit: "m²",
    rate: 890.00,
    isRef: "IS 1200 Pt 3",
    stage: "superstructure",
  },

  // RCC Concrete & Steel
  "RC-1": {
    desc: "RCC M20/M25 in columns, plinth beams, tie beams & lintels complete",
    unit: "m³",
    rate: 9850.00,
    isRef: "IS 456, IS 13920",
    stage: "rcc",
  },
  "RC-SLAB": {
    desc: "RCC M25 in suspended floor & roof slabs (150mm thick)",
    unit: "m³",
    rate: 10450.00,
    isRef: "IS 456",
    stage: "rcc",
  },
  "SH-2": {
    desc: "Centering and shuttering for suspended slabs, beams and stairs",
    unit: "m²",
    rate: 620.00,
    isRef: "IS 1200 Pt 5",
    stage: "rcc",
  },
  "RC-2": {
    desc: "Thermo-Mechanically Treated (TMT) Fe500D steel rebar incl. binding & lap",
    unit: "kg",
    rate: 92.50,
    isRef: "IS 1786",
    stage: "rcc",
  },

  // Plastering & Pointing
  "PL-1": {
    desc: "12mm cement plaster (1:6) on internal walls (smooth trowel finish)",
    unit: "m²",
    rate: 195.00,
    isRef: "IS 1200 Pt 12",
    stage: "plaster",
  },
  "PL-2": {
    desc: "18mm cement plaster (1:4) two-coat rough cast / sand face on exterior",
    unit: "m²",
    rate: 245.00,
    isRef: "IS 1200 Pt 12",
    stage: "plaster",
  },

  // Flooring & Finishes
  "FL-1": {
    desc: "Vitrified tile flooring 600×600mm / 800×800mm with polymer adhesive bed",
    unit: "m²",
    rate: 750.00,
    isRef: "IS 1200 Pt 11",
    stage: "flooring",
  },
  "FL-2": {
    desc: "Matching vitrified tile skirting 100mm height",
    unit: "m",
    rate: 135.00,
    isRef: "IS 1200 Pt 11",
    stage: "flooring",
  },
  "FL-CERAMIC": {
    desc: "Ceramic anti-skid floor tiles 300×300mm in toilets/utility",
    unit: "m²",
    rate: 580.00,
    isRef: "IS 1200 Pt 11",
    stage: "flooring",
  },

  // Painting
  "PT-1": {
    desc: "Premium acrylic emulsion paint (2 coats) over primer and wall putty",
    unit: "m²",
    rate: 110.00,
    isRef: "CPWD 13.46",
    stage: "painting",
  },
  "PT-2": {
    desc: "Exterior weather-shield elastomeric emulsion (2 coats) over exterior primer",
    unit: "m²",
    rate: 130.00,
    isRef: "CPWD 13.48",
    stage: "painting",
  },

  // Doors & Windows
  "DW-1": {
    desc: "Solid core flush door (35mm) with hardwood frame, SS hinges & mortise lock",
    unit: "nos",
    rate: 11500.00,
    isRef: "IS 2202",
    stage: "doors_windows",
  },
  "DW-2": {
    desc: "UPVC 3-track sliding window with float glass and stainless steel mosquito mesh",
    unit: "nos",
    rate: 9200.00,
    isRef: "IS 14610",
    stage: "doors_windows",
  },
  "DW-GATE": {
    desc: "Mild steel structural entrance gate with primer & synthetic enamel paint",
    unit: "m²",
    rate: 3850.00,
    isRef: "CPWD 10.25",
    stage: "doors_windows",
  },

  // MEP & Sanitary
  "SAN-WC": {
    desc: "European water closet / Orissa pan with PVC cistern, seat & CP fixtures",
    unit: "nos",
    rate: 6800.00,
    isRef: "CPWD 17.1",
    stage: "mep",
  },
};

function r2(val: number): number {
  return Math.round(val * 100) / 100;
}

function makeDSRItem(
  code: string,
  quantity: number,
  deductionsNote = "",
  overrideDesc = ""
): BOQLineItem {
  const meta = CPWD_DSR_RATES[code] || {
    desc: overrideDesc || code,
    unit: "nos",
    rate: 100,
    isRef: "IS 1200",
    stage: "superstructure",
  };
  const qty = r2(quantity);
  return {
    item_code: code,
    description: overrideDesc || meta.desc,
    unit: meta.unit,
    quantity: qty,
    rate: meta.rate,
    amount: r2(qty * meta.rate),
    stage: meta.stage,
    is_code_ref: meta.isRef,
    deductions_note: deductionsNote,
  };
}

export function calculateTakeoffBOQ(
  items: TakeoffItem[],
  pixelToMeterScale: number = 1,
  isGroundFloor: boolean = true,
  wallHeight: number = 3.0
): BOQResult {
  if (!items || items.length === 0) {
    return {
      typology: "2d_takeoff",
      built_up_area: 0,
      total_cost: 0,
      assumptions: [
        "Select a material from the toolbar and trace elements on the floor plan.",
        "Rates: CPWD DSR 2023 (Delhi / National Schedule) | Measurements: IS 1200 / NBC 2016",
      ],
      line_items: [],
    };
  }

  let totalBuiltUpArea = 0;
  
  // Create a map to aggregate identical BOQ items
  const aggregatedItems: Record<string, BOQLineItem> = {};

  const pushItem = (code: string, qty: number, dedupeNote: string = "") => {
    if (qty <= 0) return;
    if (!aggregatedItems[code]) {
      aggregatedItems[code] = makeDSRItem(code, 0, dedupeNote);
    }
    aggregatedItems[code].quantity += qty;
    aggregatedItems[code].amount = r2(aggregatedItems[code].quantity * aggregatedItems[code].rate);
    aggregatedItems[code].deductions_note = dedupeNote; // Keep the latest note
  };

  items.forEach((item) => {
    const isLine = item.type === "length" || item.type === "line";
    const isPolygon = item.type === "area" || item.type === "polygon";
    const isPoint = item.type === "count" || item.type === "point";

    const matType = (item.trace_data as any)?.material_type || "";
    const code = item.item_code || "";

    // Calculate physical metrics
    let len = 0;
    let area = 0;
    let perim = 0;
    
    if (item.points && item.points.length > 1) {
      if (isLine) {
        for (let i = 1; i < item.points.length; i++) {
          const dx = item.points[i].x - item.points[i - 1].x;
          const dy = item.points[i].y - item.points[i - 1].y;
          len += Math.sqrt(dx * dx + dy * dy) * pixelToMeterScale;
        }
      } else if (isPolygon) {
        let a = 0;
        for (let i = 0; i < item.points.length; i++) {
          const j = (i + 1) % item.points.length;
          a += item.points[i].x * item.points[j].y;
          a -= item.points[j].x * item.points[i].y;
          const dx = item.points[j].x - item.points[i].x;
          const dy = item.points[j].y - item.points[i].y;
          perim += Math.sqrt(dx * dx + dy * dy) * pixelToMeterScale;
        }
        area = Math.abs(a / 2) * (pixelToMeterScale * pixelToMeterScale);
      }
    }

    const netQty = Number(item.net_qty) || (isLine ? len : isPolygon ? area : 1);
    const count = isPoint ? (item.points?.length || 1) : 1;

    // ASSEMBLY LOGIC
    if (code === "BW-1" || (isLine && matType === "brick")) {
      // 230mm Main Brick Wall Assembly
      const length = len || netQty;
      const thickness = 0.23;
      const vol = length * wallHeight * thickness;
      pushItem("BW-1", vol, `Main Wall Brickwork (${length.toFixed(1)}m × ${wallHeight}m × 0.23m)`);
      pushItem("PL-1", length * wallHeight * 2, "Internal Plaster both sides");
      pushItem("PT-1", length * wallHeight * 2, "Internal Paint both sides");
      
      if (isGroundFloor) {
        pushItem("EW-1", length * 0.8 * 1.2, "Foundation Trench Excavation");
        pushItem("EW-3", length * 0.8 * 1.2 * 0.7, "Surplus Earth Disposal");
        pushItem("CC-1", length * 0.6 * 0.1, "PCC under trench");
        pushItem("DPC-1", length * thickness, "Damp Proof Course");
        pushItem("RC-1", length * thickness * 0.35, "Plinth Beams");
        pushItem("RC-2", length * thickness * 0.35 * 95, "Plinth Beam Steel");
      }
    } else if (code === "BW-2" || matType === "partition") {
      // 115mm Partition Wall Assembly
      const length = len || netQty;
      const areaPart = length * wallHeight;
      pushItem("BW-2", areaPart, `Partition Wall (${length.toFixed(1)}m × ${wallHeight}m)`);
      pushItem("PL-1", areaPart * 2, "Internal Plaster both sides");
      pushItem("PT-1", areaPart * 2, "Internal Paint both sides");
    } else if (code === "FL-1" || (isPolygon && matType === "tile")) {
      // Flooring Assembly
      const flArea = area || netQty;
      totalBuiltUpArea += flArea;
      pushItem("FL-1", flArea, `Main Flooring Area (${flArea.toFixed(1)} m²)`);
      if (perim > 0) pushItem("FL-2", perim, "Skirting");
      
      if (isGroundFloor) {
        pushItem("EW-BACKFILL", flArea * 0.45, "Plinth Sand Filling");
        pushItem("CC-2", flArea * 0.1, "Base Apron PCC");
      }
    } else if (code === "RC-SLAB" || matType === "concrete") {
      // Slab Assembly
      const slArea = area || netQty;
      totalBuiltUpArea += slArea;
      const vol = slArea * 0.15;
      pushItem("RC-SLAB", vol, `Suspended Slab 150mm (${slArea.toFixed(1)} m²)`);
      pushItem("SH-2", slArea, "Slab Shuttering");
      pushItem("RC-2", vol * 95, "Slab Steel Reinforcement");
    } else if (code.includes("DW-1") || matType === "door") {
      pushItem("DW-1", count, "Solid Core Doors");
    } else if (code.includes("DW-2") || matType === "window") {
      pushItem("DW-2", count, "UPVC Windows");
    } else if (code.includes("SAN-") || matType === "sanitary") {
      pushItem("SAN-WC", count, "Sanitary Fixtures");
    } else {
      // Fallback direct map
      if (CPWD_DSR_RATES[code]) {
        pushItem(code, netQty, "Direct Takeoff Item");
      }
    }
  });

  const finalItems = Object.values(aggregatedItems).map(item => ({
    ...item,
    quantity: r2(item.quantity),
    amount: r2(item.amount)
  })).filter(i => i.quantity > 0);

  const totalCost = r2(finalItems.reduce((sum, i) => sum + i.amount, 0));

  const assumptions = [
    `Takeoff Mode: True Item-Based Assembly Engine`,
    `Floor Level: ${isGroundFloor ? "Ground Floor (Includes Foundation)" : "Upper Floor (Superstructure Only)"}`,
    `Wall Height: ${wallHeight.toFixed(2)}m`,
    `Rates: CPWD DSR 2023 (Delhi / National Schedule) | Measurements: IS 1200 / NBC 2016`,
  ];

  return {
    typology: "2d_takeoff",
    built_up_area: r2(totalBuiltUpArea),
    total_cost: totalCost,
    assumptions,
    line_items: finalItems,
  };
}
