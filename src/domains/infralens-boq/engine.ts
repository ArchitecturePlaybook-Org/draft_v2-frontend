import {
  BOQItemRow,
  ConsolidatedBOQResult,
  ConsolidatedLabourItem,
  ConsolidatedMaterialItem,
  Interval,
  WorkItemRecipe
} from './types';
import { RECIPES_MAP } from './recipes';
import { CITY_PRICES, resolveCityPrices, MATERIAL_META, WATER_PCT, CPOH_PCT } from './prices';
import { CustomWorkItem } from './custom-items';
import { findUnifiedItem } from './items-registry';

export const addInterval = (a: Interval, b: Interval): Interval => [a[0] + b[0], a[1] + b[1]];

export const multInterval = (a: Interval, scalar: number): Interval => [
  Math.round((a[0] * scalar) * 100) / 100,
  Math.round((a[1] * scalar) * 100) / 100
];

export const midpoint = (a: Interval): number => (a[0] + a[1]) / 2;

export const formatINR = (val: number): string => {
  return "₹" + Math.round(val).toLocaleString("en-IN");
};

export const formatRangeINR = (range: Interval): string => {
  if (range[0] === range[1]) return formatINR(range[0]);
  return `${formatINR(range[0])} – ${formatINR(range[1])}`;
};

/**
 * Calculates the unit rate and range for a single recipe in a specific city.
 * Rate = (Material + Labour + Machinery) * 1.01 (Water) * 1.15 (CPOH)
 */
export function calculateSingleRecipeRate(
  recipe: WorkItemRecipe,
  city: string,
  waterPct = WATER_PCT,
  cpohPct = CPOH_PCT,
  customMaterialRates?: Record<string, number>,
  customLabourRates?: Record<string, number>,
  cityPricesOverride?: Record<string, Interval>
): {
  materialCost: Interval;
  labourCost: Interval;
  machineryCost: Interval;
  subtotal: Interval;
  water: Interval;
  cpoh: Interval;
  total: Interval;
  midpointRate: number;
} {
  const cityPrices = resolveCityPrices(city, cityPricesOverride);

  let matCost: Interval = [0, 0];
  for (const m of recipe.materials) {
    const custom = customMaterialRates?.[m.priceId];
    const p = custom !== undefined && !isNaN(custom) ? [custom, custom] as Interval : (cityPrices[m.priceId] || [0, 0]);
    matCost = addInterval(matCost, multInterval(p, m.qty));
  }

  let labCost: Interval = [0, 0];
  for (const l of recipe.labour) {
    const custom = customLabourRates?.[l.priceId];
    const p = custom !== undefined && !isNaN(custom) ? [custom, custom] as Interval : (cityPrices[l.priceId] || [0, 0]);
    labCost = addInterval(labCost, multInterval(p, l.qty));
  }

  const machSum = recipe.machinery.reduce((acc, eq) => acc + eq.cost, 0);
  const machCost: Interval = [machSum, machSum];

  const subtotal = addInterval(addInterval(matCost, labCost), machCost);
  const water = multInterval(subtotal, waterPct);
  const subtotalWithWater = addInterval(subtotal, water);
  const cpoh = multInterval(subtotalWithWater, cpohPct);
  const total = addInterval(subtotalWithWater, cpoh);

  return {
    materialCost: matCost,
    labourCost: labCost,
    machineryCost: machCost,
    subtotal,
    water,
    cpoh,
    total,
    midpointRate: midpoint(total)
  };
}

/**
 * Consolidates all BOQ rows across all floor plans into:
 * 1. Material Schedule
 * 2. Labour Schedule
 * 3. Cost Summary Waterfall
 * 4. Overall Estimated Cost & Rate Adjustments
 */
export function calculateProjectBOQ(
  items: BOQItemRow[],
  city: string,
  waterPct = WATER_PCT,
  cpohPct = CPOH_PCT,
  customMaterialRates?: Record<string, number>,
  customLabourRates?: Record<string, number>,
  customItems?: CustomWorkItem[],
  cityPricesOverride?: Record<string, Interval>
): ConsolidatedBOQResult {
  const cityPrices = resolveCityPrices(city, cityPricesOverride);

  const consolidatedMaterials = new Map<string, number>();
  const consolidatedLabour = new Map<string, number>();
  let totalMachineryCost = 0;
  let directItemsBaseCost = 0;

  // Process rows and expand recipe requirements
  for (const row of items) {
    const qty = Number(row.qty) || 0;
    if (qty <= 0) continue;

    const recipe = findUnifiedItem(row.slug, customItems);
    if (!recipe) continue;

    // If custom item with direct rate, it contributes directly to base subtotal
    if (recipe.pricingMode === 'direct' && recipe.baseRate !== undefined && !isNaN(recipe.baseRate)) {
      directItemsBaseCost += Number(recipe.baseRate) * qty;
      continue;
    }

    if (recipe.materials) {
      for (const mat of recipe.materials) {
        consolidatedMaterials.set(
          mat.priceId,
          (consolidatedMaterials.get(mat.priceId) || 0) + mat.qty * qty
        );
      }
    }

    if (recipe.labour) {
      for (const lab of recipe.labour) {
        consolidatedLabour.set(
          lab.priceId,
          (consolidatedLabour.get(lab.priceId) || 0) + lab.qty * qty
        );
      }
    }

    if (recipe.machinery) {
      for (const eq of recipe.machinery) {
        totalMachineryCost += eq.cost * qty;
      }
    }
  }

  // 1. Consolidated Material Schedule with user overrides
  let marketMaterialTotal: Interval = [0, 0];
  const materials: ConsolidatedMaterialItem[] = Array.from(consolidatedMaterials.entries())
    .map(([priceId, totalQty]) => {
      const marketPriceRange = cityPrices[priceId] || [0, 0];
      const meta = MATERIAL_META[priceId] || { name: priceId, unit: "" };
      const roundedQty = Math.round(totalQty * 100) / 100;
      const hasOverride = customMaterialRates?.[priceId] !== undefined && !isNaN(customMaterialRates[priceId]);
      const customRate = hasOverride ? customMaterialRates![priceId] : undefined;
      const effectiveRate = hasOverride ? customRate! : Math.round(midpoint(marketPriceRange));
      const effectiveRange: Interval = hasOverride ? [customRate!, customRate!] : marketPriceRange;
      const cost = multInterval(effectiveRange, totalQty);
      const effectiveCost = Math.round(effectiveRate * totalQty);

      marketMaterialTotal = addInterval(marketMaterialTotal, multInterval(marketPriceRange, totalQty));

      return {
        priceId,
        label: meta.name,
        unit: meta.unit.replace(/^per /, ""),
        qty: roundedQty,
        rate: effectiveRange,
        marketRate: marketPriceRange,
        effectiveRate,
        cost,
        effectiveCost,
        isOverridden: hasOverride,
        customRate
      };
    })
    .sort((a, b) => b.effectiveCost - a.effectiveCost);

  const materialTotal = materials.reduce<Interval>(
    (acc, m) => addInterval(acc, m.cost),
    [0, 0]
  );

  // 2. Consolidated Labour Schedule with user overrides
  let marketLabourTotal: Interval = [0, 0];
  const labour: ConsolidatedLabourItem[] = Array.from(consolidatedLabour.entries())
    .map(([priceId, totalDays]) => {
      const marketPriceRange = cityPrices[priceId] || [0, 0];
      const meta = MATERIAL_META[priceId] || { name: priceId, unit: "per day" };
      const roundedDays = Math.round(totalDays * 10) / 10;
      const hasOverride = customLabourRates?.[priceId] !== undefined && !isNaN(customLabourRates[priceId]);
      const customRate = hasOverride ? customLabourRates![priceId] : undefined;
      const effectiveRate = hasOverride ? customRate! : Math.round(midpoint(marketPriceRange));
      const effectiveRange: Interval = hasOverride ? [customRate!, customRate!] : marketPriceRange;
      const cost = multInterval(effectiveRange, totalDays);
      const effectiveCost = Math.round(effectiveRate * totalDays);

      marketLabourTotal = addInterval(marketLabourTotal, multInterval(marketPriceRange, totalDays));

      return {
        priceId,
        label: meta.name,
        unit: "day",
        qty: roundedDays,
        rate: effectiveRange,
        marketRate: marketPriceRange,
        effectiveRate,
        cost,
        effectiveCost,
        isOverridden: hasOverride,
        customRate
      };
    })
    .sort((a, b) => b.effectiveCost - a.effectiveCost);

  const labourTotal = labour.reduce<Interval>(
    (acc, l) => addInterval(acc, l.cost),
    [0, 0]
  );

  // 3. Markups & Waterfall
  const machineryTotal: Interval = [totalMachineryCost, totalMachineryCost];
  const directTotal: Interval = [directItemsBaseCost, directItemsBaseCost];

  // Pure City Market Benchmark Waterfall (before user custom overrides):
  const marketBaseNoDirect = addInterval(addInterval(marketMaterialTotal, marketLabourTotal), machineryTotal);
  const marketSubtotal = addInterval(marketBaseNoDirect, directTotal);
  const marketWater = multInterval(marketSubtotal, waterPct);
  const marketSubtotalWithWater = addInterval(marketSubtotal, marketWater);
  const marketCpoh = multInterval(marketSubtotalWithWater, cpohPct);
  const marketTotal = addInterval(marketSubtotalWithWater, marketCpoh);

  // Active Total with materials & labour adjustments (Actual site procurement cost):
  const baseNoDirect = addInterval(addInterval(materialTotal, labourTotal), machineryTotal);
  const subtotal = addInterval(baseNoDirect, directTotal);
  const water = multInterval(subtotal, waterPct);
  const subtotalWithWater = addInterval(subtotal, water);
  const cpoh = multInterval(subtotalWithWater, cpohPct);
  const actualTotal = addInterval(subtotalWithWater, cpoh);
  const actualGrandTotal = Math.round(midpoint(actualTotal));
  const marketMidpoint = Math.round(midpoint(marketTotal));

  // 4. Line item calculation: Bill of Quantities (Estimated Expense)
  // Estimates are based on standard city market rates, unaffected by schedule procurement edits
  let estimatedBOQSum = 0;
  const lineItems = items.map((row) => {
    const qty = Number(row.qty) || 0;
    const recipe = findUnifiedItem(row.slug, customItems);
    let unitPriceRange: Interval = [0, 0];
    let autoRate = 0;

    if (recipe) {
      if (recipe.pricingMode === 'direct' && recipe.baseRate !== undefined && !isNaN(recipe.baseRate)) {
        const rate = Math.round(Number(recipe.baseRate));
        unitPriceRange = [rate, rate];
        autoRate = rate;
      } else {
        const unitRateCalc = calculateSingleRecipeRate(recipe, city, waterPct, cpohPct, undefined, undefined, cityPricesOverride);
        unitPriceRange = unitRateCalc.total;
        autoRate = Math.round(unitRateCalc.midpointRate);
      }
    }

    const isOverridden = row.customRate !== undefined && row.customRate !== null && !isNaN(row.customRate);
    const effectiveRate = isOverridden ? Number(row.customRate) : autoRate;
    const amount = Math.round(effectiveRate * qty);
    estimatedBOQSum += amount;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name || recipe?.name || row.slug,
      qty,
      unit: row.unit || recipe?.unit || "cum",
      unitPriceRange,
      autoRate,
      effectiveRate,
      amount,
      isOverridden,
      sourceType: row.sourceType
    };
  });

  const estimatedTotal = estimatedBOQSum > 0 ? estimatedBOQSum : marketMidpoint;
  const scheduleAdjustment = actualGrandTotal - marketMidpoint;
  const boqAdjustment = estimatedTotal - marketMidpoint;
  const rateAdjustment = scheduleAdjustment + boqAdjustment;

  return {
    lineItems,
    materials,
    labour,
    materialTotal,
    labourTotal,
    machineryTotal,
    subtotal,
    water,
    cpoh,
    marketMaterialTotal,
    marketLabourTotal,
    marketSubtotal,
    marketWater,
    marketCpoh,
    marketTotal,
    estimatedTotal,
    actualTotal,
    actualGrandTotal,
    userGrandTotal: estimatedTotal,
    rateAdjustment
  };
}
