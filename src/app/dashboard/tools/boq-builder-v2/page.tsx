"use client";
/**
 * BOQ Builder V2 — Universal Construction Estimator
 * ==================================================
 * 4-step wizard → engine calculation → clean results
 * Supports 6 sectors × 24 building types.
 */

import React, { useState, useMemo, useCallback } from "react";
import { BOQWizard, type WizardResult } from "@/components/boq/BOQWizard";
import { BOQResultsPanel } from "@/components/boq/BOQResultsPanel";
import { calculateCompositeBOQ } from "@/domains/boq/engine";
import { DEFAULT_STAGE_SCOPES, type StageScopeFilters } from "@/domains/boq/types";

// ─── Quality map ─────────────────────────────────────────────────────────────

const QUALITY_MAP: Record<string, "economy" | "standard" | "luxury"> = {
  basic: "economy", good: "standard", premium: "luxury",
};

// ─── Derive module params from wizard result ──────────────────────────────────

function wizardToModuleParams(w: WizardResult): {
  params: Record<string, Record<string, any>>;
  scopes: StageScopeFilters;
} {
  const q = QUALITY_MAP[w.quality] || "standard";
  const slug = w.buildingType;
  const scopes: StageScopeFilters = { ...DEFAULT_STAGE_SCOPES };

  // ── Sq.ft → metre helpers ───────────────────────────────────────────────
  const sqm    = w.areaSqFt / 10.764;
  const side   = Math.sqrt(sqm / 1.5);
  const L      = parseFloat((side * 1.5).toFixed(1));
  const W      = parseFloat(side.toFixed(1));

  // ── Housing ──────────────────────────────────────────────────────────────
  if (slug === "g1-residential-house") {
    return {
      params: { [slug]: { length_m: L, width_m: W, num_floors: w.floors, height_m: 3.0,
        soil_type: "medium", masonry_type: "brick",
        outer_door_count: 2, inner_door_count: Math.max(3, w.floors * 3),
        window_count: Math.max(4, w.floors * 4),
        bathroom_count: Math.max(1, Math.floor(w.floors * 1.5)),
        finish_quality: q } },
      scopes,
    };
  }
  if (slug === "multi-storey-rcc-frame") {
    return {
      params: { [slug]: { length_m: L, width_m: W, num_floors: w.floors, height_m: 3.1,
        soil_type: "medium", column_spacing_m: 4.5, finish_quality: q } },
      scopes,
    };
  }
  if (slug === "pmay-g-rural-house") {
    return {
      params: { [slug]: { length_m: Math.max(5, L), width_m: Math.max(4, W), num_floors: 1,
        height_m: 3.0, finish_quality: q } },
      scopes,
    };
  }

  // ── Commercial ───────────────────────────────────────────────────────────
  if (slug === "commercial-office") {
    return {
      params: { "multi-storey-rcc-frame": { length_m: L, width_m: W, num_floors: w.floors,
        height_m: 3.3, soil_type: "medium", column_spacing_m: 6.0, finish_quality: q } },
      scopes,
    };
  }
  if (slug === "retail-showroom") {
    return {
      params: { "g1-residential-house": { length_m: L, width_m: W, num_floors: w.floors,
        height_m: 4.0, outer_door_count: 3, inner_door_count: 4, window_count: 8,
        bathroom_count: 2, finish_quality: q } },
      scopes,
    };
  }
  if (slug === "shopping-mall") {
    return {
      params: { "multi-storey-rcc-frame": { length_m: L, width_m: W, num_floors: w.floors,
        height_m: 5.5, soil_type: "medium", column_spacing_m: 9.0, finish_quality: q } },
      scopes,
    };
  }
  if (slug === "hotel-building") {
    return {
      params: { "multi-storey-rcc-frame": { length_m: L, width_m: W, num_floors: w.floors,
        height_m: 3.5, soil_type: "medium", column_spacing_m: 5.0, finish_quality: q } },
      scopes,
    };
  }
  if (slug === "petrol-pump-civil-works") {
    return {
      params: { [slug]: { canopy_span_m: 12, num_dispensers: 4, has_retail: true, finish_quality: q } },
      scopes,
    };
  }

  // ── Institutional ────────────────────────────────────────────────────────
  if (slug === "school-classroom-block" || slug === "anganwadi-centre" || slug === "public-building") {
    return {
      params: { [slug]: { length_m: L, width_m: W, num_floors: w.floors, finish_quality: q } },
      scopes,
    };
  }
  if (slug === "hospital-phc-building") {
    return {
      params: { [slug]: { length_m: L, width_m: W, num_floors: w.floors, finish_quality: q } },
      scopes,
    };
  }
  if (slug === "community-hall-bhawan") {
    return {
      params: { [slug]: { length_m: L, width_m: W, num_floors: 1, finish_quality: q } },
      scopes,
    };
  }

  // ── Industrial ───────────────────────────────────────────────────────────
  if (slug === "industrial-warehouse-shed" || slug === "factory-building") {
    return {
      params: { "industrial-warehouse-shed": { length_m: L, width_m: W,
        height_m: w.clearHeight || 6, finish_quality: q } },
      scopes: { ...scopes, finishes: false },
    };
  }

  // ── Interiors ────────────────────────────────────────────────────────────
  if (slug === "modular-kitchen") {
    const rft = w.runningFeet || 12;
    return {
      params: { [slug]: { kitchen_length_m: rft * 0.3048, kitchen_width_m: 2.5, finish_quality: q } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false },
    };
  }
  if (slug === "bathroom-renovation") {
    return {
      params: { [slug]: { length_m: L, width_m: W, finish_quality: q } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false },
    };
  }
  if (slug === "painting-full-home") {
    return {
      params: { [slug]: { floor_area_sqm: sqm, num_floors: w.floors || 1 } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, openings: false },
    };
  }
  if (slug === "vitrified-tile-flooring") {
    return {
      params: { [slug]: { floor_area_sqm: sqm, finish_quality: q } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, openings: false },
    };
  }
  if (slug === "upvc-aluminium-doors-windows") {
    return {
      params: { [slug]: { num_doors: Math.max(4, Math.round(sqm / 25)), num_windows: Math.max(6, Math.round(sqm / 15)), finish_quality: q } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, finishes: false },
    };
  }

  // ── Infrastructure ───────────────────────────────────────────────────────
  if (slug === "boundary-wall") {
    const wall_length_m = (w.linearLength || 100) * 0.3048; // rft → m
    const wall_height_m = (w.linearHeight || 6) * 0.3048;
    return {
      params: { [slug]: { wall_length_m, wall_height_m, wall_thickness_mm: 230,
        pillar_spacing_m: 3.0, has_coping: true } },
      scopes: { ...scopes, finishes: false, mep: false, openings: false },
    };
  }
  if (slug === "internal-road-bt" || slug === "internal-road-cc") {
    return {
      params: { [slug]: { road_length_m: w.linearLength || 100, road_width_m: w.linearWidth || 7,
        pavement_type: slug === "internal-road-cc" ? "cc" : "bt" } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, finishes: false, openings: false, mep: false },
    };
  }
  if (slug === "rcc-drain") {
    return {
      params: { [slug]: { drain_length_m: w.linearLength || 100,
        drain_width_m: w.linearWidth || 0.9, drain_depth_m: w.linearDepth || 1.2 } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, finishes: false, openings: false, mep: false },
    };
  }
  if (slug === "septic-tank") {
    return {
      params: { [slug]: { num_users: w.numUsers || 10 } },
      scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, finishes: false, openings: false, mep: true },
    };
  }
  if (slug === "ohsr-water-tank") {
    return {
      params: { [slug]: { capacity_kl: w.capacityKL || 50, staging_height_m: 12 } },
      scopes: { ...DEFAULT_STAGE_SCOPES, finishes: false, openings: false, mep: false },
    };
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  return {
    params: { [slug]: { length_m: L, width_m: W, num_floors: w.floors, finish_quality: q } },
    scopes,
  };
}

// ─── Derive the engine slug to pass to calculateCompositeBOQ ─────────────────

function getEngineSlug(buildingType: string): string {
  const MAP: Record<string, string> = {
    "commercial-office": "multi-storey-rcc-frame",
    "retail-showroom":   "g1-residential-house",
    "shopping-mall":     "multi-storey-rcc-frame",
    "hotel-building":    "multi-storey-rcc-frame",
    "factory-building":  "industrial-warehouse-shed",
  };
  return MAP[buildingType] || buildingType;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BOQBuilderV2Page() {
  const [wizardResult, setWizardResult] = useState<WizardResult | null>(null);
  const [exporting, setExporting]       = useState(false);

  const derived = useMemo(() => {
    if (!wizardResult) return null;
    const { params, scopes } = wizardToModuleParams(wizardResult);
    const engineSlug = getEngineSlug(wizardResult.buildingType);
    try {
      const boq = calculateCompositeBOQ(
        [engineSlug],
        params,
        scopes,
        1,
        QUALITY_MAP[wizardResult.quality] as any
      );
      return { boq, engineSlug };
    } catch (err) {
      console.error("BOQ calculation error:", err);
      return null;
    }
  }, [wizardResult]);

  // BUA in sq.ft
  const buaSqFt = useMemo(() => {
    if (!wizardResult || !derived?.boq) return 0;
    if (derived.boq.built_up_area > 0) return derived.boq.built_up_area * 10.764;
    // Fallback for linear/special types
    const w = wizardResult;
    if (["boundary-wall", "internal-road-bt", "internal-road-cc", "rcc-drain"].includes(w.buildingType))
      return (w.linearLength || 100) * (w.linearWidth || 1);
    if (w.buildingType === "modular-kitchen") return (w.runningFeet || 12) * 2;
    return w.areaSqFt * w.floors;
  }, [wizardResult, derived]);

  // CSV export
  const handleExport = useCallback(() => {
    if (!derived?.boq || !wizardResult) return;
    setExporting(true);
    try {
      const header = ["#", "DSR Code", "Description", "Qty", "Unit", "Rate (Rs)", "Amount (Rs)"];
      const rows = derived.boq.line_items.map((r, i) => [
        i + 1, r.item_code,
        `"${r.description.replace(/"/g, '""')}"`,
        r.quantity.toFixed(2), r.unit, r.rate.toFixed(2), r.amount.toFixed(2),
      ]);
      const csv = [header, ...rows].map((e) => e.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `BOQ_${wizardResult.buildingType}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }, [derived, wizardResult]);

  if (!wizardResult || !derived) {
    return <BOQWizard onComplete={setWizardResult} />;
  }

  return (
    <BOQResultsPanel
      wizard={wizardResult}
      boqResult={derived.boq}
      buaSqFt={buaSqFt}
      onReset={() => setWizardResult(null)}
      onExport={handleExport}
    />
  );
}
