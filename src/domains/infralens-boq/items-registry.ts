import { RECIPES, RECIPES_MAP, RecipeGroup } from './recipes';
import { WorkItemRecipe, Interval } from './types';
import { CustomWorkItem } from './custom-items';
import { calculateSingleRecipeRate } from './engine';
import { WATER_PCT, CPOH_PCT } from './prices';

export type UnifiedWorkItem = WorkItemRecipe & {
  id?: string;
  isCustom?: boolean;
  pricingMode?: 'direct' | 'analysis';
  baseRate?: number;
  description?: string;
};

export interface UnifiedRecipeGroup {
  group: string;
  isCustomSection: boolean;
  items: UnifiedWorkItem[];
}

/**
 * Combines built-in CPWD DSR recipes with user-created custom items.
 * Groups by section, preserving standard CPWD sections first, then custom sections.
 */
export function getUnifiedGroupedItems(
  customItems: CustomWorkItem[] = [],
  customSections: string[] = []
): UnifiedRecipeGroup[] {
  // Map of group name to list of items
  const groupMap = new Map<string, UnifiedWorkItem[]>();

  // 1. Seed standard CPWD recipes
  for (const recipe of RECIPES) {
    if (!groupMap.has(recipe.group)) {
      groupMap.set(recipe.group, []);
    }
    groupMap.get(recipe.group)!.push({
      ...recipe,
      isCustom: false
    });
  }

  // 2. Add custom sections so they appear even if they have 0 items yet
  for (const section of customSections) {
    if (!groupMap.has(section)) {
      groupMap.set(section, []);
    }
  }

  // 3. Insert custom items into their respective groups
  for (const custom of customItems) {
    if (!groupMap.has(custom.group)) {
      groupMap.set(custom.group, []);
    }
    const asUnified: UnifiedWorkItem = {
      id: custom.id,
      slug: custom.slug,
      name: custom.name,
      group: custom.group,
      unit: custom.unit as any,
      description: custom.description,
      pricingMode: custom.pricingMode,
      baseRate: custom.baseRate,
      materials: custom.materials || [],
      labour: custom.labour || [],
      machinery: custom.machinery || [],
      isCustom: true
    };
    groupMap.get(custom.group)!.push(asUnified);
  }

  // Identify which sections are standard CPWD vs custom
  const standardSectionNames = new Set(RECIPES.map(r => r.group));

  return Array.from(groupMap.entries()).map(([group, items]) => ({
    group,
    isCustomSection: !standardSectionNames.has(group),
    items
  }));
}

/**
 * Finds an item of work by its slug, checking custom items first, then standard CPWD recipes.
 */
export function findUnifiedItem(
  slug: string,
  customItems: CustomWorkItem[] = []
): UnifiedWorkItem | null {
  const custom = customItems.find(c => c.slug === slug);
  if (custom) {
    return {
      id: custom.id,
      slug: custom.slug,
      name: custom.name,
      group: custom.group,
      unit: custom.unit as any,
      description: custom.description,
      pricingMode: custom.pricingMode,
      baseRate: custom.baseRate,
      materials: custom.materials || [],
      labour: custom.labour || [],
      machinery: custom.machinery || [],
      isCustom: true
    };
  }

  const standard = RECIPES_MAP.get(slug);
  if (standard) {
    return {
      ...standard,
      isCustom: false
    };
  }

  return null;
}

/**
 * Calculates rate range and midpoint for an item of work (supports both CPWD rate analysis and Direct custom rate).
 */
export function calculateUnifiedItemRate(
  item: UnifiedWorkItem,
  city: string,
  waterPct = WATER_PCT,
  cpohPct = CPOH_PCT,
  customMaterialRates?: Record<string, number>,
  customLabourRates?: Record<string, number>
): { total: Interval; midpointRate: number; isDirectRate: boolean } {
  if (item.isCustom && item.pricingMode === 'direct' && item.baseRate !== undefined && !isNaN(item.baseRate)) {
    const rate = Number(item.baseRate);
    return {
      total: [rate, rate],
      midpointRate: rate,
      isDirectRate: true
    };
  }

  // CPWD Rate Analysis
  const recipeLike: WorkItemRecipe = {
    slug: item.slug,
    name: item.name,
    unit: item.unit,
    group: item.group,
    materials: item.materials || [],
    labour: item.labour || [],
    machinery: item.machinery || []
  };

  const calc = calculateSingleRecipeRate(
    recipeLike,
    city,
    waterPct,
    cpohPct,
    customMaterialRates,
    customLabourRates
  );

  return {
    total: calc.total,
    midpointRate: calc.midpointRate,
    isDirectRate: false
  };
}
