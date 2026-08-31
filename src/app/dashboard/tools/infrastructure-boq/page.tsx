"use client";
/**
 * Infrastructure BOQ Calculator — Standalone Tool
 * Pre-selects the "infrastructure" sector in the wizard
 * so civil engineers land directly on roads / walls / drains / water.
 */
import { BOQWizard, type WizardResult } from "@/components/boq/BOQWizard";
import { BOQResultsPanel } from "@/components/boq/BOQResultsPanel";
import { useState, useMemo, useCallback } from "react";
import { calculateCompositeBOQ } from "@/domains/boq/engine";
import { DEFAULT_STAGE_SCOPES, type StageScopeFilters } from "@/domains/boq/types";

const QUALITY_MAP: Record<string, "economy" | "standard" | "luxury"> = {
  basic: "economy", good: "standard", premium: "luxury",
};

function toParams(w: WizardResult): { params: Record<string, Record<string, any>>; scopes: StageScopeFilters } {
  const slug  = w.buildingType;
  const scopes: StageScopeFilters = { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, finishes: false, openings: false };

  if (slug === "boundary-wall") {
    const Lm = (w.linearLength || 100) * 0.3048;
    const Hm = (w.linearHeight || 6)   * 0.3048;
    return { params: { [slug]: { wall_length_m: Lm, wall_height_m: Hm, wall_thickness_mm: 230, pillar_spacing_m: 3.0, has_coping: true } }, scopes: { ...scopes, mep: false } };
  }
  if (slug === "internal-road-bt" || slug === "internal-road-cc") {
    return { params: { [slug]: { road_length_m: w.linearLength || 100, road_width_m: w.linearWidth || 7, pavement_type: slug === "internal-road-cc" ? "cc" : "bt" } }, scopes: { ...scopes, mep: false } };
  }
  if (slug === "rcc-drain") {
    return { params: { [slug]: { drain_length_m: w.linearLength || 100, drain_width_m: w.linearWidth || 0.9, drain_depth_m: w.linearDepth || 1.2 } }, scopes: { ...scopes, mep: false } };
  }
  if (slug === "septic-tank") {
    return { params: { [slug]: { num_users: w.numUsers || 10 } }, scopes: { ...DEFAULT_STAGE_SCOPES, foundation: false, superstructure: false, finishes: false, openings: false, mep: true } };
  }
  if (slug === "ohsr-water-tank") {
    return { params: { [slug]: { capacity_kl: w.capacityKL || 50, staging_height_m: 12 } }, scopes: { ...scopes, mep: false } };
  }
  return { params: { [slug]: {} }, scopes };
}

export default function InfrastructureBOQPage() {
  const [wizardResult, setWizardResult] = useState<WizardResult | null>(null);

  const derived = useMemo(() => {
    if (!wizardResult) return null;
    const { params, scopes } = toParams(wizardResult);
    try {
      const boq = calculateCompositeBOQ([wizardResult.buildingType], params, scopes, 1, QUALITY_MAP[wizardResult.quality] as any);
      return { boq };
    } catch { return null; }
  }, [wizardResult]);

  const buaSqFt = useMemo(() => {
    if (!wizardResult) return 0;
    const w = wizardResult;
    if (["boundary-wall", "internal-road-bt", "internal-road-cc", "rcc-drain"].includes(w.buildingType))
      return (w.linearLength || 100) * (w.linearWidth || 1);
    return (w.capacityKL || 50) * 1000; // for water tank show in litres
  }, [wizardResult]);

  const handleExport = useCallback(() => {}, []);

  if (!wizardResult || !derived) {
    return <BOQWizard onComplete={setWizardResult} initialSector="infrastructure" />;
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
