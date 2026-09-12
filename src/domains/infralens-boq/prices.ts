import pricesData from './prices.json';
import { CityOption, Interval, MaterialMeta } from './types';
import { useCityRatesStore } from './city-rates-store';

export const CITIES: CityOption[] = pricesData.cities;

export const MATERIAL_META: Record<string, MaterialMeta> = pricesData.meta;

export const CITY_PRICES: Record<string, Record<string, Interval>> = pricesData.prices as unknown as Record<string, Record<string, Interval>>;

export const WATER_PCT: number = pricesData.waterPct || 0.01; // 1%
export const CPOH_PCT: number = pricesData.cpohPct || 0.15; // 15%
export const LAST_UPDATED: string = pricesData.lastUpdated || "2026-08-12";

export const RATE_CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "cement", label: "Cement & Ready-Mix" },
  { id: "steel", label: "Steel & Rebar" },
  { id: "sand_agg", label: "Sand & Aggregates" },
  { id: "masonry", label: "Bricks & Blocks" },
  { id: "finishes", label: "Flooring & Finishes" },
  { id: "painting", label: "Paints & Waterproofing" },
  { id: "wood", label: "Wood & Doors" },
  { id: "mep", label: "Plumbing & Electrical" },
  { id: "labour", label: "Labour Trades" },
] as const;

export type RateCategoryId = typeof RATE_CATEGORIES[number]["id"];

export function getItemCategory(id: string): RateCategoryId {
  const lower = id.toLowerCase();
  if (lower.startsWith('lab_')) return 'labour';
  if (lower.startsWith('opc') || lower.startsWith('ppc') || lower.startsWith('rmc') || lower.includes('cement')) return 'cement';
  if (lower.startsWith('tmt') || lower.includes('steel') || lower.includes('binding_wire')) return 'steel';
  if (lower.includes('sand') || lower.startsWith('agg') || lower.includes('boulder') || lower.includes('murrum')) return 'sand_agg';
  if (lower.includes('brick') || lower.includes('block') || lower.includes('aac')) return 'masonry';
  if (lower.includes('tile') || lower.includes('granite') || lower.includes('marble') || lower.includes('kota') || lower.includes('adhesive')) return 'finishes';
  if (lower.includes('paint') || lower.includes('putty') || lower.includes('primer') || lower.includes('waterproof') || lower.includes('distemper') || lower.includes('enamel')) return 'painting';
  if (lower.includes('plywood') || lower.includes('laminate') || lower.includes('wood') || lower.includes('door') || lower.includes('sunmica')) return 'wood';
  if (lower.includes('pipe') || lower.includes('wire') || lower.includes('mcb') || lower.includes('conduit') || lower.includes('wc_') || lower.includes('basin')) return 'mep';
  return 'finishes';
}

/**
 * Resolves active prices for a city, combining default prices with any admin custom overrides.
 */
export function resolveCityPrices(city: string, directOverrides?: Record<string, Interval>): Record<string, Interval> {
  const base = CITY_PRICES[city] || CITY_PRICES['delhi'] || {};
  if (directOverrides) {
    return { ...base, ...directOverrides };
  }

  // Check Zustand store if in browser
  try {
    if (typeof window !== 'undefined') {
      const storeOverrides = useCityRatesStore.getState().cityOverrides[city];
      if (storeOverrides && storeOverrides.prices) {
        return { ...base, ...storeOverrides.prices };
      }
    }
  } catch (e) {
    // Fallback to base
  }

  return base;
}
