import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Interval } from './types';
import pricesData from './prices.json';

export interface CityOverrideData {
  lastUpdated: string;
  isCustomized: boolean;
  prices: Record<string, Interval>;
}

interface CityRatesStoreState {
  cityOverrides: Record<string, CityOverrideData>;

  // Actions
  updateItemRate: (city: string, priceId: string, minRate: number, maxRate: number) => void;
  applyCategoryMultiplier: (city: string, itemIds: string[], percent: number) => void;
  importCityRates: (city: string, importedRates: Record<string, Interval>) => void;
  resetCityToBenchmark: (city: string) => void;
  resetAllToBenchmark: () => void;
  getCityActivePrices: (city: string) => Record<string, Interval>;
  getCityStatus: (city: string) => { isCustomized: boolean; lastUpdated: string; customizedCount: number };
}

export const useCityRatesStore = create<CityRatesStoreState>()(
  persist(
    (set, get) => ({
      cityOverrides: {},

      getCityActivePrices: (city: string) => {
        const basePrices = (pricesData.prices as unknown as Record<string, Record<string, Interval>>)[city] || 
                           (pricesData.prices as unknown as Record<string, Record<string, Interval>>)['delhi'] || {};
        const override = get().cityOverrides[city];
        if (!override || !override.prices) {
          return basePrices;
        }
        return {
          ...basePrices,
          ...override.prices,
        };
      },

      getCityStatus: (city: string) => {
        const override = get().cityOverrides[city];
        const defaultDate = pricesData.lastUpdated || "2026-08-12";
        if (!override || !override.isCustomized) {
          return {
            isCustomized: false,
            lastUpdated: defaultDate,
            customizedCount: 0,
          };
        }
        return {
          isCustomized: true,
          lastUpdated: override.lastUpdated || defaultDate,
          customizedCount: Object.keys(override.prices || {}).length,
        };
      },

      updateItemRate: (city: string, priceId: string, minRate: number, maxRate: number) => {
        const validMin = Math.max(0, Math.round(minRate));
        const validMax = Math.max(validMin, Math.round(maxRate));
        const now = new Date().toISOString().split('T')[0];

        set((state) => {
          const currentCityData = state.cityOverrides[city] || {
            lastUpdated: now,
            isCustomized: true,
            prices: {},
          };

          return {
            cityOverrides: {
              ...state.cityOverrides,
              [city]: {
                lastUpdated: now,
                isCustomized: true,
                prices: {
                  ...currentCityData.prices,
                  [priceId]: [validMin, validMax],
                },
              },
            },
          };
        });
      },

      applyCategoryMultiplier: (city: string, itemIds: string[], percent: number) => {
        if (!itemIds.length || percent === 0) return;
        const multiplier = 1 + percent / 100;
        const now = new Date().toISOString().split('T')[0];
        const activePrices = get().getCityActivePrices(city);

        const newPrices: Record<string, Interval> = {};
        for (const id of itemIds) {
          const current = activePrices[id];
          if (current) {
            const newMin = Math.max(1, Math.round(current[0] * multiplier));
            const newMax = Math.max(newMin, Math.round(current[1] * multiplier));
            newPrices[id] = [newMin, newMax];
          }
        }

        set((state) => {
          const currentCityData = state.cityOverrides[city] || {
            lastUpdated: now,
            isCustomized: true,
            prices: {},
          };

          return {
            cityOverrides: {
              ...state.cityOverrides,
              [city]: {
                lastUpdated: now,
                isCustomized: true,
                prices: {
                  ...currentCityData.prices,
                  ...newPrices,
                },
              },
            },
          };
        });
      },

      importCityRates: (city: string, importedRates: Record<string, Interval>) => {
        const now = new Date().toISOString().split('T')[0];
        set((state) => {
          const currentCityData = state.cityOverrides[city] || {
            lastUpdated: now,
            isCustomized: true,
            prices: {},
          };

          return {
            cityOverrides: {
              ...state.cityOverrides,
              [city]: {
                lastUpdated: now,
                isCustomized: true,
                prices: {
                  ...currentCityData.prices,
                  ...importedRates,
                },
              },
            },
          };
        });
      },

      resetCityToBenchmark: (city: string) => {
        set((state) => {
          const next = { ...state.cityOverrides };
          delete next[city];
          return { cityOverrides: next };
        });
      },

      resetAllToBenchmark: () => {
        set({ cityOverrides: {} });
      },
    }),
    {
      name: 'ap_admin_city_market_rates_v1',
    }
  )
);
