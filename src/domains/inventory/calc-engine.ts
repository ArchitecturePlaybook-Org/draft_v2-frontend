/**
 * Client-side Civil Engineering Dynamic Material Calculator Engine
 */

import {
  WallOpening,
  MasonryBOMItem,
  MasonryGeometry,
  MasonryCalculationResult,
  MultiWallConfig,
} from "./types";

export interface MasonryCalculationParams {
  lengthM: number;
  heightM: number;
  wallThicknessMm?: number;
  brickType?: string;
  mortarRatio?: string;
  openings?: WallOpening[];
  openingsAreaM2?: number;
  mortarJointMm?: number;
  dryVolumeFactor?: number;
  sandDensityKgM3?: number;
  cementBagSizeKg?: number;
  wastagePercent?: number;
  wastageBrick?: number;
  wastageCement?: number;
  wastageSand?: number;
  wastageAdhesive?: number;
  calcLintel?: boolean;
  lintelBearingMm?: number;
  lintelDepthMm?: number;
}

export function calculateMasonryMaterials(
  params: MasonryCalculationParams | number,
  heightMParam?: number,
  wallThicknessMmParam: number = 230,
  brickTypeParam: string = "standard_clay",
  mortarRatioParam: string = "1:6",
  openingsAreaM2Param: number = 0,
  wastagePercentParam: number = 5.0
): MasonryCalculationResult {
  // Support both object params and legacy positional arguments
  const p: MasonryCalculationParams =
    typeof params === "object"
      ? params
      : {
          lengthM: params,
          heightM: heightMParam || 0,
          wallThicknessMm: wallThicknessMmParam,
          brickType: brickTypeParam,
          mortarRatio: mortarRatioParam,
          openingsAreaM2: openingsAreaM2Param,
          wastagePercent: wastagePercentParam,
        };

  const lengthM = Math.max(0, p.lengthM || 0);
  const heightM = Math.max(0, p.heightM || 0);
  const wallThicknessMm = Math.max(10, p.wallThicknessMm ?? 230);
  const wallThicknessM = wallThicknessMm / 1000.0;
  const brickType = p.brickType || "standard_clay";
  const mortarRatio = p.mortarRatio || "1:6";

  const dryVolumeFactor = p.dryVolumeFactor ?? 1.33;
  const sandDensityKgM3 = p.sandDensityKgM3 ?? 1600.0;
  const cementBagSizeKg = p.cementBagSizeKg ?? 50.0;
  const wastageGen = p.wastagePercent ?? 5.0;

  const wBrick = p.wastageBrick ?? wastageGen;
  const wCement = p.wastageCement ?? wastageGen;
  const wSand = p.wastageSand ?? wastageGen;
  const wAdhesive = p.wastageAdhesive ?? wastageGen;

  // 1. Gross Wall Geometry
  const grossWallArea = +(lengthM * heightM).toFixed(4);
  const grossWallVolume = +(grossWallArea * wallThicknessM).toFixed(4);

  // 2. Openings Processing
  const openingsList = p.openings || [];
  let totalOpeningArea = 0;
  let totalLintelVolumeM3 = 0;
  const processedOpenings: any[] = [];

  const lintelBearingM = (p.lintelBearingMm ?? 150) / 1000.0;
  const lintelDepthM = (p.lintelDepthMm ?? 150) / 1000.0;
  const calcLintel = p.calcLintel ?? true;

  if (openingsList.length > 0) {
    openingsList.forEach((op, idx) => {
      const opType = (op.type || "other").toLowerCase();
      const opName = op.name || `${opType.toUpperCase()} #${idx + 1}`;
      const opW = Math.max(0, op.width || 0);
      const opH = Math.max(0, op.height || 0);
      const opQty = Math.max(1, op.qty || 1);
      const opSill = op.sill_height ?? (opType === "window" ? 0.9 : 0.0);

      const areaSingle = +(opW * opH).toFixed(4);
      const areaTotal = +(areaSingle * opQty).toFixed(4);
      totalOpeningArea += areaTotal;

      const lintelLen = +(opW + 2 * lintelBearingM).toFixed(3);
      const lintelVol = +(lintelLen * wallThicknessM * lintelDepthM * opQty).toFixed(4);
      if (calcLintel && ["door", "window", "ventilator"].includes(opType)) {
        totalLintelVolumeM3 += lintelVol;
      }

      processedOpenings.push({
        name: opName,
        type: opType,
        width_m: opW,
        height_m: opH,
        qty: opQty,
        sill_height_m: opSill,
        area_per_unit_m2: areaSingle,
        total_area_m2: areaTotal,
        lintel_length_m: lintelLen,
        lintel_volume_m3: lintelVol,
      });
    });
  } else {
    totalOpeningArea = +(p.openingsAreaM2 || 0).toFixed(4);
  }

  // 3. Net Wall Geometry
  const netWallArea = +Math.max(0, grossWallArea - totalOpeningArea).toFixed(4);
  const netMasonryVolume = +(netWallArea * wallThicknessM).toFixed(4);

  // 4. Brick/Block Specification
  const isAac = brickType.toLowerCase().includes("aac");
  const defaultJointMm = isAac ? 3.0 : 10.0;
  const jointMm = p.mortarJointMm ?? defaultJointMm;
  const jointM = jointMm / 1000.0;

  const brickSpecs: Record<
    string,
    {
      actual: [number, number, number];
      label: string;
      unit: string;
      suggestedThicknesses: number[];
    }
  > = {
    standard_clay: {
      actual: [0.19, 0.09, 0.09],
      label: "Modular Red Clay Brick (190x90x90mm)",
      unit: "NOS",
      suggestedThicknesses: [100, 200, 230],
    },
    traditional_clay: {
      actual: [0.23, 0.115, 0.075],
      label: "Traditional Clay Brick (230x115x75mm)",
      unit: "NOS",
      suggestedThicknesses: [115, 230],
    },
    aac_block_200: {
      actual: [0.6, 0.2, 0.2],
      label: "AAC Block 200mm (600x200x200mm)",
      unit: "NOS",
      suggestedThicknesses: [200],
    },
    aac_block_150: {
      actual: [0.6, 0.15, 0.2],
      label: "AAC Block 150mm (600x150x200mm)",
      unit: "NOS",
      suggestedThicknesses: [150],
    },
    aac_block_100: {
      actual: [0.6, 0.1, 0.2],
      label: "AAC Block 100mm (600x100x200mm)",
      unit: "NOS",
      suggestedThicknesses: [100],
    },
    fly_ash: {
      actual: [0.23, 0.11, 0.075],
      label: "Fly Ash Brick (230x110x75mm)",
      unit: "NOS",
      suggestedThicknesses: [115, 230],
    },
    solid_concrete_block: {
      actual: [0.39, 0.19, 0.19],
      label: "Solid Concrete Block (400x200x200mm)",
      unit: "NOS",
      suggestedThicknesses: [200],
    },
  };

  const spec = brickSpecs[brickType] || brickSpecs.standard_clay;
  const [actL, actW, actH] = spec.actual;
  const actVol = actL * actW * actH;

  const nomL = actL + jointM;
  const nomW = actW + jointM;
  const nomH = actH + jointM;
  const nomVol = nomL * nomW * nomH;

  // Validation Warnings
  const warnings: string[] = [];
  if (totalOpeningArea >= grossWallArea && grossWallArea > 0) {
    warnings.push(`Total opening area (${totalOpeningArea} m²) equals or exceeds gross wall area (${grossWallArea} m²).`);
  }
  if (!spec.suggestedThicknesses.includes(Math.round(wallThicknessMm))) {
    warnings.push(
      `Wall thickness ${Math.round(wallThicknessMm)}mm is non-standard for ${spec.label} (recommended: ${spec.suggestedThicknesses.join(", ")}mm).`
    );
  }

  // 5. Units Calculation
  const theoreticalUnits = nomVol > 0 ? netMasonryVolume / nomVol : 0;
  const wastageUnitsQty = theoreticalUnits * (wBrick / 100.0);
  const plannedUnits = Math.ceil(theoreticalUnits + wastageUnitsQty);

  const bomItems: MasonryBOMItem[] = [];

  const wallGeometry: MasonryGeometry = {
    length_m: lengthM,
    height_m: heightM,
    thickness_mm: wallThicknessMm,
    gross_wall_area_m2: grossWallArea,
    gross_wall_volume_m3: grossWallVolume,
    total_opening_area_m2: +totalOpeningArea.toFixed(4),
    net_wall_area_m2: netWallArea,
    net_masonry_volume_m3: netMasonryVolume,
  };

  if (isAac) {
    const baseAdhesiveKg = +(netWallArea * 3.5).toFixed(2);
    const wasteAdhesiveKg = +(baseAdhesiveKg * (wAdhesive / 100.0)).toFixed(2);
    const plannedAdhesiveKg = +(baseAdhesiveKg + wasteAdhesiveKg).toFixed(2);
    const adhesiveBags40kg = Math.ceil(plannedAdhesiveKg / 40.0);

    bomItems.push({
      material_type: "MASONRY_UNIT",
      item_name: spec.label,
      unit: "NOS",
      base_quantity: +theoreticalUnits.toFixed(2),
      wastage_percent: wBrick,
      wastage_quantity: +wastageUnitsQty.toFixed(2),
      planned_quantity: plannedUnits,
      assumptions: `Nominal: ${Math.round(nomL * 1000)}x${Math.round(nomW * 1000)}x${Math.round(nomH * 1000)}mm (with ${jointMm}mm thin-bed joint)`,
    });
    bomItems.push({
      material_type: "AAC_BLOCK_ADHESIVE",
      item_name: "AAC Block Polymer Thin-Bed Adhesive (40kg Bag)",
      unit: "BAG",
      base_quantity: +(baseAdhesiveKg / 40.0).toFixed(2),
      wastage_percent: wAdhesive,
      wastage_quantity: +(wasteAdhesiveKg / 40.0).toFixed(2),
      planned_quantity: adhesiveBags40kg,
      weight_kg: plannedAdhesiveKg,
      assumptions: `3.5 kg/m² net wall area (${netWallArea} m²), 40kg bag packaging`,
    });

    return {
      calculator: "calculate_masonry_materials",
      rule_version: "2.0.0",
      wall_geometry: wallGeometry,
      openings: processedOpenings,
      warnings,
      units_required: plannedUnits,
      theoretical_units: +theoreticalUnits.toFixed(2),
      unit_type: spec.label,
      block_adhesive_kg: plannedAdhesiveKg,
      adhesive_bags_40kg: adhesiveBags40kg,
      cement_bags_50kg: 0,
      cement_kg: 0,
      sand_m3: 0,
      sand_cft: 0,
      sand_tons: 0,
      lintel_concrete_volume_m3: +totalLintelVolumeM3.toFixed(3),
      bom_items: bomItems,
      summary: `${plannedUnits} ${spec.label} (${Math.round(theoreticalUnits)} base + ${wBrick}% waste), ${adhesiveBags40kg} bags AAC Adhesive (40kg)`,
      calculation_breakdown: {
        gross_wall_area: `${lengthM}m x ${heightM}m = ${grossWallArea} m²`,
        total_opening_area: `${totalOpeningArea.toFixed(2)} m² (${processedOpenings.length} openings deducted)`,
        net_wall_area: `${grossWallArea} - ${totalOpeningArea.toFixed(2)} = ${netWallArea} m²`,
        net_masonry_volume: `${netWallArea} m² x ${wallThicknessM}m = ${netMasonryVolume} m³`,
        nominal_unit_size: `${Math.round(nomL * 1000)}x${Math.round(nomW * 1000)}x${Math.round(nomH * 1000)}mm`,
        theoretical_units: `${netMasonryVolume} m³ / ${nomVol.toFixed(6)} m³ = ${theoreticalUnits.toFixed(2)} Nos`,
        brick_wastage: `${theoreticalUnits.toFixed(2)} x ${wBrick}% = ${wastageUnitsQty.toFixed(2)} Nos`,
        final_units: `ceil(${theoreticalUnits.toFixed(2)} + ${wastageUnitsQty.toFixed(2)}) = ${plannedUnits} Nos`,
        adhesive_formula: `${netWallArea} m² x 3.5 kg/m² = ${baseAdhesiveKg} kg (+${wAdhesive}% waste = ${plannedAdhesiveKg} kg / 40kg = ${adhesiveBags40kg} bags)`,
        lintel_volume: `${totalLintelVolumeM3.toFixed(3)} m³ concrete for opening lintels`,
      },
    };
  }

  // 6. Traditional & Modular Brick Mortar Calculations
  const actualUnitsSolidVol = theoreticalUnits * actVol;
  const wetMortarVol = Math.max(0, netMasonryVolume - actualUnitsSolidVol);
  const dryMortarVol = wetMortarVol * dryVolumeFactor;

  const parts = mortarRatio.split(":").map((p) => parseFloat(p.trim()) || 1);
  const cementParts = parts[0] || 1;
  const sandParts = parts[1] || 6;
  const totalParts = cementParts + sandParts;

  const cementVolM3 = totalParts > 0 ? dryMortarVol * (cementParts / totalParts) : 0;
  const sandVolM3 = totalParts > 0 ? dryMortarVol * (sandParts / totalParts) : 0;

  // Cement (1440 kg/m3)
  const baseCementKg = cementVolM3 * 1440.0;
  const wasteCementKg = baseCementKg * (wCement / 100.0);
  const plannedCementKg = +(baseCementKg + wasteCementKg).toFixed(2);
  const cementBags = Math.ceil(plannedCementKg / cementBagSizeKg);

  // Sand (CFT = 35.3147)
  const baseSandM3 = sandVolM3;
  const wasteSandM3 = baseSandM3 * (wSand / 100.0);
  const plannedSandM3 = +(baseSandM3 + wasteSandM3).toFixed(4);
  const sandCft = +(plannedSandM3 * 35.3147).toFixed(2);
  const sandTons = +((plannedSandM3 * sandDensityKgM3) / 1000.0).toFixed(2);

  bomItems.push({
    material_type: "MASONRY_UNIT",
    item_name: spec.label,
    unit: "NOS",
    base_quantity: +theoreticalUnits.toFixed(2),
    wastage_percent: wBrick,
    wastage_quantity: +wastageUnitsQty.toFixed(2),
    planned_quantity: plannedUnits,
    assumptions: `Actual: ${Math.round(actL * 1000)}x${Math.round(actW * 1000)}x${Math.round(actH * 1000)}mm, Nominal: ${Math.round(nomL * 1000)}x${Math.round(nomW * 1000)}x${Math.round(nomH * 1000)}mm (with ${jointMm}mm joint)`,
  });
  bomItems.push({
    material_type: "CEMENT",
    item_name: `Cement (${Math.round(cementBagSizeKg)}kg Bag)`,
    unit: "BAG",
    base_quantity: +(baseCementKg / cementBagSizeKg).toFixed(2),
    wastage_percent: wCement,
    wastage_quantity: +(wasteCementKg / cementBagSizeKg).toFixed(2),
    planned_quantity: cementBags,
    weight_kg: plannedCementKg,
    assumptions: `Mix ${mortarRatio}, Density 1440 kg/m³, Dry Factor ${dryVolumeFactor}, ${Math.round(cementBagSizeKg)}kg bag`,
  });
  bomItems.push({
    material_type: "SAND",
    item_name: `Sand (${sandCft} CFT / ${sandTons} MT)`,
    unit: "TON",
    base_quantity: +((baseSandM3 * sandDensityKgM3) / 1000.0).toFixed(2),
    wastage_percent: wSand,
    wastage_quantity: +((wasteSandM3 * sandDensityKgM3) / 1000.0).toFixed(2),
    planned_quantity: sandTons,
    volume_m3: plannedSandM3,
    volume_cft: sandCft,
    assumptions: `Bulk density ${sandDensityKgM3} kg/m³, 1 m³ = 35.3147 CFT`,
  });

  return {
    calculator: "calculate_masonry_materials",
    rule_version: "2.0.0",
    wall_geometry: wallGeometry,
    openings: processedOpenings,
    warnings,
    units_required: plannedUnits,
    theoretical_units: +theoreticalUnits.toFixed(2),
    unit_type: spec.label,
    wet_mortar_vol_m3: +wetMortarVol.toFixed(4),
    dry_mortar_vol_m3: +dryMortarVol.toFixed(4),
    cement_vol_m3: +cementVolM3.toFixed(4),
    sand_vol_m3: +sandVolM3.toFixed(4),
    cement_bags_50kg: cementBags,
    cement_kg: plannedCementKg,
    sand_m3: plannedSandM3,
    sand_cft: sandCft,
    sand_tons: sandTons,
    lintel_concrete_volume_m3: +totalLintelVolumeM3.toFixed(3),
    bom_items: bomItems,
    summary: `${plannedUnits} ${spec.label} (${Math.round(theoreticalUnits)} base + ${wBrick}% waste), ${cementBags} bags Cement (${Math.round(cementBagSizeKg)}kg), ${sandTons} tons Sand (${sandCft} CFT)`,
    calculation_breakdown: {
      gross_wall_area: `${lengthM}m x ${heightM}m = ${grossWallArea} m²`,
      total_opening_area: `${totalOpeningArea.toFixed(2)} m² (${processedOpenings.length} openings deducted)`,
      net_wall_area: `${grossWallArea} - ${totalOpeningArea.toFixed(2)} = ${netWallArea} m²`,
      net_masonry_volume: `${netWallArea} m² x ${wallThicknessM}m = ${netMasonryVolume} m³`,
      actual_unit_dimensions: `${Math.round(actL * 1000)}x${Math.round(actW * 1000)}x${Math.round(actH * 1000)}mm`,
      nominal_unit_dimensions: `${Math.round(nomL * 1000)}x${Math.round(nomW * 1000)}x${Math.round(nomH * 1000)}mm (mortar joint = ${jointMm}mm)`,
      theoretical_units: `${netMasonryVolume} m³ / ${nomVol.toFixed(6)} m³ = ${theoreticalUnits.toFixed(2)} Nos`,
      brick_wastage: `${theoreticalUnits.toFixed(2)} x ${wBrick}% = ${wastageUnitsQty.toFixed(2)} Nos`,
      final_units: `ceil(${theoreticalUnits.toFixed(2)} + ${wastageUnitsQty.toFixed(2)}) = ${plannedUnits} Nos`,
      wet_mortar_volume: `${netMasonryVolume} m³ - (${theoreticalUnits.toFixed(2)} x ${actVol.toFixed(6)} m³) = ${wetMortarVol.toFixed(4)} m³`,
      dry_mortar_volume: `${wetMortarVol.toFixed(4)} m³ x ${dryVolumeFactor} (dry factor) = ${dryMortarVol.toFixed(4)} m³`,
      mortar_mix_ratio: `Mix ${mortarRatio} -> Cement: ${cementParts}/${totalParts}, Sand: ${sandParts}/${totalParts}`,
      cement_volume: `${dryMortarVol.toFixed(4)} x (${cementParts}/${totalParts}) = ${cementVolM3.toFixed(4)} m³`,
      cement_weight_and_bags: `${cementVolM3.toFixed(4)} m³ x 1440 kg/m³ = ${baseCementKg.toFixed(1)} kg (+${wCement}% waste = ${plannedCementKg} kg / ${Math.round(cementBagSizeKg)}kg = ${cementBags} bags)`,
      sand_volume_and_weight: `${dryMortarVol.toFixed(4)} x (${sandParts}/${totalParts}) = ${baseSandM3.toFixed(4)} m³ (+${wSand}% waste = ${plannedSandM3} m³ = ${sandCft} CFT = ${sandTons} MT @ ${sandDensityKgM3} kg/m³)`,
      lintel_volume: `${totalLintelVolumeM3.toFixed(3)} m³ concrete for opening lintels (${lintelDepthM * 1000}mm depth, ${lintelBearingM * 1000}mm bearing)`,
    },
  };
}

export function calculateMultiWallMasonryMaterials(
  walls: MultiWallConfig[],
  defaultDryVolumeFactor: number = 1.33,
  defaultSandDensityKgM3: number = 1600.0,
  defaultCementBagSizeKg: number = 50.0
) {
  let totalGrossArea = 0;
  let totalOpeningArea = 0;
  let totalNetArea = 0;
  let totalNetVolume = 0;
  const totalUnitsDict: Record<string, number> = {};
  let totalCementBags = 0;
  let totalCementKg = 0;
  let totalSandM3 = 0;
  let totalSandCft = 0;
  let totalSandTons = 0;
  let totalAdhesiveBags = 0;
  let totalLintelVolumeM3 = 0;
  const wallResults: any[] = [];

  (walls || []).forEach((wCfg, idx) => {
    const res = calculateMasonryMaterials({
      lengthM: wCfg.length_m,
      heightM: wCfg.height_m,
      wallThicknessMm: wCfg.wall_thickness_mm,
      brickType: wCfg.brick_type,
      mortarRatio: wCfg.mortar_ratio,
      openings: wCfg.openings,
      dryVolumeFactor: defaultDryVolumeFactor,
      sandDensityKgM3: defaultSandDensityKgM3,
      cementBagSizeKg: defaultCementBagSizeKg,
      wastagePercent: wCfg.wastage_percent ?? 5.0,
    });

    const wallName = wCfg.name || `Wall #${idx + 1}`;
    wallResults.push({
      id: wCfg.id || String(idx + 1),
      name: wallName,
      room: wCfg.room || "General",
      result: res,
    });

    const geom = res.wall_geometry;
    totalGrossArea += geom.gross_wall_area_m2;
    totalOpeningArea += geom.total_opening_area_m2;
    totalNetArea += geom.net_wall_area_m2;
    totalNetVolume += geom.net_masonry_volume_m3;
    totalLintelVolumeM3 += res.lintel_concrete_volume_m3 || 0;

    const unitType = res.unit_type;
    totalUnitsDict[unitType] = (totalUnitsDict[unitType] || 0) + res.units_required;

    totalCementBags += res.cement_bags_50kg || 0;
    totalCementKg += res.cement_kg || 0;
    totalSandM3 += res.sand_m3 || 0;
    totalSandCft += res.sand_cft || 0;
    totalSandTons += res.sand_tons || 0;
    totalAdhesiveBags += res.adhesive_bags_40kg || 0;
  });

  const totalBlockCount = Object.values(totalUnitsDict).reduce((a, b) => a + b, 0);

  return {
    calculator: "calculate_multi_wall_masonry_materials",
    rule_version: "2.0.0",
    wall_count: wallResults.length,
    walls: wallResults,
    aggregated_geometry: {
      total_gross_area_m2: +totalGrossArea.toFixed(2),
      total_opening_area_m2: +totalOpeningArea.toFixed(2),
      total_net_area_m2: +totalNetArea.toFixed(2),
      total_net_volume_m3: +totalNetVolume.toFixed(3),
      total_lintel_volume_m3: +totalLintelVolumeM3.toFixed(3),
    },
    aggregated_bom: {
      masonry_units: totalUnitsDict,
      total_cement_bags: totalCementBags,
      total_cement_kg: +totalCementKg.toFixed(1),
      total_sand_m3: +totalSandM3.toFixed(3),
      total_sand_cft: +totalSandCft.toFixed(2),
      total_sand_tons: +totalSandTons.toFixed(2),
      total_adhesive_bags_40kg: totalAdhesiveBags,
    },
    summary: `Aggregated ${wallResults.length} walls -> ${totalNetArea.toFixed(2)} m² Net Area (${totalNetVolume.toFixed(3)} m³ Vol), ${totalBlockCount} Total Blocks/Bricks, ${totalCementBags} bags Cement, ${totalSandTons.toFixed(2)}t Sand`,
  };
}


export function calculateConcreteMaterials(
  volumeM3: number,
  grade: string = "M20",
  wastagePercent: number = 3.0
) {
  const gradeCoeffs: Record<string, { cementBags: number; sandM3: number; aggM3: number; ratio: string }> = {
    "M7.5": { cementBags: 3.4, sandM3: 0.46, aggM3: 0.92, ratio: "1:4:8" },
    M10: { cementBags: 4.4, sandM3: 0.44, aggM3: 0.88, ratio: "1:3:6" },
    M15: { cementBags: 6.3, sandM3: 0.42, aggM3: 0.84, ratio: "1:2:4" },
    M20: { cementBags: 8.1, sandM3: 0.40, aggM3: 0.80, ratio: "1:1.5:3" },
    M25: { cementBags: 11.1, sandM3: 0.37, aggM3: 0.74, ratio: "1:1:2" },
    M30: { cementBags: 8.0, sandM3: 0.44, aggM3: 0.78, ratio: "Design Mix (400kg/m³)" },
  };

  const c = gradeCoeffs[grade.toUpperCase()] || gradeCoeffs.M20;
  const w = 1.0 + wastagePercent / 100.0;

  const cementBags = Math.ceil(volumeM3 * c.cementBags * w);
  const sandM3 = +(volumeM3 * c.sandM3 * w).toFixed(3);
  const aggM3 = +(volumeM3 * c.aggM3 * w).toFixed(3);

  return {
    calculator: "calculate_concrete_materials",
    concrete_volume_m3: +volumeM3.toFixed(3),
    grade: grade.toUpperCase(),
    nominal_ratio: c.ratio,
    cement_bags_50kg: cementBags,
    cement_kg: cementBags * 50,
    sand_m3: sandM3,
    sand_cft: +(sandM3 * 35.3147).toFixed(2),
    sand_tons: +(sandM3 * 1.6).toFixed(2),
    coarse_aggregate_m3: aggM3,
    coarse_aggregate_cft: +(aggM3 * 35.3147).toFixed(2),
    coarse_aggregate_tons: +(aggM3 * 1.55).toFixed(2),
    summary: `${volumeM3} m³ ${grade.toUpperCase()} Concrete -> ${cementBags} bags Cement, ${+(sandM3 * 1.6).toFixed(1)}t Sand, ${+(aggM3 * 1.55).toFixed(1)}t Aggregate (20mm)`,
  };
}

export function calculateRebarSteel(
  volumeM3: number,
  memberType: string = "beam",
  wastagePercent: number = 4.0
) {
  const densities: Record<string, number> = {
    footing: 80.0,
    column: 160.0,
    beam: 120.0,
    slab: 90.0,
    staircase: 110.0,
    lintel: 100.0,
  };

  const kgPerM3 = densities[memberType.toLowerCase()] || 110.0;
  const w = 1.0 + wastagePercent / 100.0;

  const totalSteelKg = +(volumeM3 * kgPerM3 * w).toFixed(2);
  const totalSteelTons = +(totalSteelKg / 1000.0).toFixed(3);
  const bindingWireKg = +(totalSteelKg * 0.01).toFixed(2);
  const coverBlocksNos = Math.ceil(volumeM3 * 15.0);

  return {
    calculator: "calculate_rebar_steel",
    member_type: memberType.charAt(0).toUpperCase() + memberType.slice(1),
    concrete_volume_m3: +volumeM3.toFixed(3),
    density_kg_m3: kgPerM3,
    total_steel_kg: totalSteelKg,
    total_steel_tons: totalSteelTons,
    binding_wire_kg: bindingWireKg,
    cover_blocks_nos: coverBlocksNos,
    summary: `${totalSteelTons} MT (${totalSteelKg} kg) TMT Rebar Steel, ${bindingWireKg} kg Binding Wire, ${coverBlocksNos} Cover Blocks`,
  };
}

export function calculatePlasterMaterials(
  areaM2: number,
  plasterType: string = "internal_12mm_1:6",
  wastagePercent: number = 8.0
) {
  const configs: Record<string, { thicknessM: number; ratio: [number, number] }> = {
    "ceiling_6mm_1:3": { thicknessM: 0.006, ratio: [1, 3] },
    "internal_12mm_1:6": { thicknessM: 0.012, ratio: [1, 6] },
    "internal_12mm_1:4": { thicknessM: 0.012, ratio: [1, 4] },
    "external_15mm_1:4": { thicknessM: 0.015, ratio: [1, 4] },
    "external_20mm_1:4": { thicknessM: 0.020, ratio: [1, 4] },
  };

  const cfg = configs[plasterType] || configs["internal_12mm_1:6"];
  const wetVol = areaM2 * cfg.thicknessM;
  const dryVol = wetVol * 1.33;

  const [cParts, sParts] = cfg.ratio;
  const totalParts = cParts + sParts;
  const w = 1.0 + wastagePercent / 100.0;

  const cementVol = dryVol * (cParts / totalParts);
  const sandVol = dryVol * (sParts / totalParts);

  const cementBags = Math.ceil(cementVol * 28.8 * w);
  const sandCft = +(sandVol * 35.3147 * w).toFixed(2);
  const sandTons = +(sandVol * 1.6 * w).toFixed(2);

  return {
    calculator: "calculate_plaster_materials",
    area_m2: +areaM2.toFixed(2),
    cement_bags_50kg: cementBags,
    sand_m3: +(sandVol * w).toFixed(3),
    sand_cft: sandCft,
    sand_tons: sandTons,
    summary: `${cementBags} bags Cement (50kg), ${sandTons} tons Sand (${sandCft} CFT)`,
  };
}

export function calculateFlooringMaterials(
  floorAreaM2: number,
  tileSizeMm: string = "600x600",
  method: string = "adhesive",
  skirtingHeightMm: number = 100,
  wastagePercent: number = 8.0
) {
  const tileDims: Record<string, { areaM2: number; tilesPerBox: number; boxAreaM2: number }> = {
    "300x300": { areaM2: 0.09, tilesPerBox: 10, boxAreaM2: 0.9 },
    "600x600": { areaM2: 0.36, tilesPerBox: 4, boxAreaM2: 1.44 },
    "1200x600": { areaM2: 0.72, tilesPerBox: 2, boxAreaM2: 1.44 },
    "800x800": { areaM2: 0.64, tilesPerBox: 3, boxAreaM2: 1.92 },
  };

  const td = tileDims[tileSizeMm] || tileDims["600x600"];
  const effArea = floorAreaM2 * 1.1;
  const w = 1.0 + wastagePercent / 100.0;
  const totalAreaWithWaste = effArea * w;

  const boxesRequired = Math.ceil(totalAreaWithWaste / td.boxAreaM2);
  const totalTiles = boxesRequired * td.tilesPerBox;
  const adhesiveBags = Math.ceil((floorAreaM2 * w) / 5.0);
  const groutKg = +(floorAreaM2 * 0.2 * w).toFixed(2);

  return {
    calculator: "calculate_flooring_materials",
    floor_area_m2: +floorAreaM2.toFixed(2),
    tile_size: tileSizeMm,
    tile_boxes_required: boxesRequired,
    total_tiles_nos: totalTiles,
    tile_adhesive_bags_20kg: adhesiveBags,
    grout_kg: groutKg,
    summary: `${boxesRequired} boxes (${totalTiles} Nos) ${tileSizeMm} Tiles, ${adhesiveBags} bags Tile Adhesive (20kg), ${groutKg} kg Grout`,
  };
}

export function calculatePaintMaterials(
  surfaceAreaM2: number,
  paintType: string = "interior_emulsion"
) {
  const rates: Record<string, { paintL: number; primerL: number; puttyKg: number }> = {
    interior_emulsion: { paintL: 0.14, primerL: 0.08, puttyKg: 0.8 },
    exterior_emulsion: { paintL: 0.16, primerL: 0.1, puttyKg: 1.0 },
    enamel_paint: { paintL: 0.12, primerL: 0.07, puttyKg: 0.0 },
  };

  const cfg = rates[paintType] || rates.interior_emulsion;
  const paintL = +(surfaceAreaM2 * cfg.paintL * 1.05).toFixed(1);
  const primerL = +(surfaceAreaM2 * cfg.primerL * 1.05).toFixed(1);
  const puttyKg = +(surfaceAreaM2 * cfg.puttyKg * 1.05).toFixed(1);

  return {
    calculator: "calculate_paint_materials",
    surface_area_m2: +surfaceAreaM2.toFixed(2),
    paint_liters: paintL,
    primer_liters: primerL,
    putty_kg: puttyKg,
    paint_buckets_20L: Math.ceil(paintL / 20.0),
    summary: `${paintL} L Paint (${Math.ceil(paintL / 20.0)} buckets 20L), ${primerL} L Primer, ${puttyKg} kg Putty`,
  };
}
