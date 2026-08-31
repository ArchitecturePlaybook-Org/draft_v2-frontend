/**
 * Formula Trace System - Transparent Calculation Audit Trail
 * Architects can click any line item and see the exact IS-code derivation.
 */

export interface FormulaStep {
  variable: string;
  formula: string;
  value: number;
  unit: string;
  isRef?: string;
}

export interface LineItemTrace {
  dsr_code: string;
  quantity: number;
  unit: string;
  steps: FormulaStep[];
  is_reference: string;
  verification_note: string;
}

export const formulaTraceRegistry: Map<string, LineItemTrace[]> = new Map();

export function registerTrace(
  slug: string, dsr_code: string, quantity: number, unit: string,
  steps: FormulaStep[], is_reference: string, verification_note: string
): void {
  const key = `${slug}::${dsr_code}`;
  const existing = formulaTraceRegistry.get(key) || [];
  existing.push({ dsr_code, quantity, unit, steps, is_reference, verification_note });
  formulaTraceRegistry.set(key, existing);
}

export function clearTraceRegistry(): void {
  formulaTraceRegistry.clear();
}

export function getTrace(slug: string, dsr_code: string): LineItemTrace[] {
  return formulaTraceRegistry.get(`${slug}::${dsr_code}`) || [];
}

export function getAllTracesForSlug(slug: string): Map<string, LineItemTrace[]> {
  const result = new Map<string, LineItemTrace[]>();
  formulaTraceRegistry.forEach((traces, key) => {
    if (key.startsWith(`${slug}::`)) {
      result.set(key.split("::")[1], traces);
    }
  });
  return result;
}

export function buildExcavationTrace(
  trenchLM: number, trenchWM: number, depth: number, note: string, finalQty: number
): FormulaStep[] {
  return [
    { variable: "Trench Length (Net Centreline)", formula: note, value: trenchLM, unit: "m", isRef: "IS 1200 Pt 1 Cl. 4.2" },
    { variable: "Trench Width (Wall Thk + 0.30m working space)", formula: "wall_thickness + 0.30", value: trenchWM, unit: "m" },
    { variable: "Excavation Depth", formula: "Per IS 1080 for soil type (soft=1.8m, medium=1.5m, hard=1.2m)", value: depth, unit: "m" },
    { variable: "\u2192 Net Excavation Volume", formula: `${trenchLM.toFixed(2)} \u00d7 ${trenchWM.toFixed(2)} \u00d7 ${depth.toFixed(2)}`, value: finalQty, unit: "m\u00b3", isRef: "IS 1200 Pt 1" },
  ];
}

export function buildMasonryTrace(
  grossArea: number, wallThkM: number, doorDed: number, winDed: number, netQty: number
): FormulaStep[] {
  return [
    { variable: "Gross Wall Area", formula: "Perimeter \u00d7 Wall Height \u00d7 No. of Floors", value: grossArea, unit: "m\u00b2" },
    { variable: "Wall Thickness", formula: "Per specification (230mm = 9-inch FPS brick)", value: wallThkM * 1000, unit: "mm" },
    { variable: "Opening Deductions", formula: "Door area + Window area \u00d7 wall thickness", value: doorDed + winDed, unit: "m\u00b3", isRef: "IS 1200 Pt 3 Cl. 4.3" },
    { variable: "\u2192 Net Brickwork Volume", formula: `${grossArea.toFixed(2)} \u00d7 ${wallThkM.toFixed(2)} \u2212 ${(doorDed + winDed).toFixed(2)}`, value: netQty, unit: "m\u00b3" },
  ];
}

export function buildRCCSlabTrace(
  buaM2: number, thkMm: number, slabVol: number, steelDensity: number, steelKg: number
): FormulaStep[] {
  return [
    { variable: "Total Built-up Area", formula: "L \u00d7 W \u00d7 No. of Floors", value: buaM2, unit: "m\u00b2" },
    { variable: "Slab Thickness", formula: "Min 125mm residential (IS 456 Cl. 23.1)", value: thkMm, unit: "mm", isRef: "IS 456 Cl. 23.1" },
    { variable: "\u2192 Slab Concrete Volume", formula: `${buaM2.toFixed(1)} \u00d7 ${(thkMm / 1000).toFixed(3)}`, value: slabVol, unit: "m\u00b3" },
    { variable: "Rebar Density (CPWD norm for residential slabs)", formula: "90 kg per m\u00b3 of slab concrete", value: steelDensity, unit: "kg/m\u00b3", isRef: "IS 456 Annex B" },
    { variable: "\u2192 Reinforcement (Fe 500D TMT)", formula: `${slabVol.toFixed(2)} \u00d7 ${steelDensity}`, value: steelKg, unit: "kg" },
  ];
}

export function buildPlasterTrace(
  totalArea: number, openingDed: number, netArea: number, context: string
): FormulaStep[] {
  return [
    { variable: "Total Wall + Ceiling Area", formula: context, value: totalArea, unit: "m\u00b2", isRef: "IS 1200 Pt 12" },
    { variable: "Opening Deductions (> 0.1 m\u00b2 each)", formula: "Doors + Windows areas per IS 1200 Pt 12 Cl. 4.2", value: openingDed, unit: "m\u00b2", isRef: "IS 1200 Pt 12 Cl. 4.2" },
    { variable: "\u2192 Net Plaster Area", formula: `${totalArea.toFixed(2)} \u2212 ${openingDed.toFixed(2)}`, value: netArea, unit: "m\u00b2" },
  ];
}
