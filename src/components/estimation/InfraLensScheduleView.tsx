"use client";

import React, { useMemo } from 'react';
import { CITIES, LAST_UPDATED, WATER_PCT, CPOH_PCT } from '@/domains/infralens-boq/prices';
import { calculateProjectBOQ, formatINR, formatRangeINR, midpoint } from '@/domains/infralens-boq/engine';
import { BOQItemRow, Interval } from '@/domains/infralens-boq/types';
import { useCustomItemsStore } from '@/domains/infralens-boq/custom-items';
import { useCityRatesStore } from '@/domains/infralens-boq/city-rates-store';
import { 
  Calculator, 
  Download, 
  MapPin, 
  Layers, 
  HardHat, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { exportProjectBOQToExcel, exportProjectBOQToCSV } from '@/lib/estimation/boqExporter';

interface InfraLensScheduleViewProps {
  allBoqItems: BOQItemRow[];
  selectedCity: string;
  onSelectCity: (city: string) => void;
  projectName?: string;
  customMaterialRates?: Record<string, number>;
  customLabourRates?: Record<string, number>;
  onUpdateMaterialRate?: (priceId: string, rate: number | undefined) => void;
  onUpdateLabourRate?: (priceId: string, rate: number | undefined) => void;
  onResetMaterialRates?: () => void;
  onResetLabourRates?: () => void;
}

const PriceCell: React.FC<{ r: Interval }> = ({ r }) => {
  return (
    <div className="inline-flex flex-col items-end">
      <span className="font-mono font-bold text-foreground">{formatINR(midpoint(r))}</span>
      {r[0] !== r[1] && (
        <span className="text-[9px] font-mono text-text-secondary">{formatRangeINR(r)}</span>
      )}
    </div>
  );
};

export const InfraLensScheduleView: React.FC<InfraLensScheduleViewProps> = ({
  allBoqItems,
  selectedCity,
  onSelectCity,
  projectName = "Floor Plan Estimate",
  customMaterialRates = {},
  customLabourRates = {},
  onUpdateMaterialRate,
  onUpdateLabourRate,
  onResetMaterialRates,
  onResetLabourRates,
}) => {
  const { customItems } = useCustomItemsStore();
  const { cityOverrides } = useCityRatesStore();

  const cityPriceOverrides = cityOverrides[selectedCity]?.prices;
  const cityOverrideData = cityOverrides[selectedCity];
  const verifiedDate = cityOverrideData?.lastUpdated || LAST_UPDATED;
  const isCityCustomized = Boolean(cityOverrideData?.isCustomized && Object.keys(cityOverrideData.prices || {}).length > 0);

  const result = useMemo(() => {
    return calculateProjectBOQ(
      allBoqItems, 
      selectedCity, 
      WATER_PCT, 
      CPOH_PCT, 
      customMaterialRates, 
      customLabourRates,
      customItems,
      cityPriceOverrides
    );
  }, [allBoqItems, selectedCity, customMaterialRates, customLabourRates, customItems, cityPriceOverrides]);

  const cityLabel = CITIES.find(c => c.slug === selectedCity)?.label || selectedCity;

  const customizedMaterialsCount = Object.keys(customMaterialRates).length;
  const customizedLabourCount = Object.keys(customLabourRates).length;

  const [isExportingExcel, setIsExportingExcel] = React.useState(false);
  const [isExportingCsv, setIsExportingCsv] = React.useState(false);

  // Export consolidated bill of quantities to multi-tab Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportProjectBOQToExcel({
        projectName,
        cityLabel,
        verifiedDate,
        result,
        allBoqItems,
      });
      toast.success("Excel workbook (.xlsx) downloaded successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Failed to export Excel workbook:", err);
      toast.error("Failed to export Excel: " + message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export consolidated bill of quantities to RFC 4180 UTF-8 CSV
  const handleExportCSV = () => {
    try {
      setIsExportingCsv(true);
      exportProjectBOQToCSV({
        projectName,
        cityLabel,
        verifiedDate,
        result,
        allBoqItems,
      });
      toast.success("CSV spreadsheet (.csv) downloaded successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Failed to export CSV spreadsheet:", err);
      toast.error("Failed to export CSV: " + message);
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="w-full bg-surface-card rounded-3xl border border-surface-200 p-4 sm:p-6 shadow-md space-y-6 mt-6">
      {/* Top Header & City Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Project Consolidated Schedule & Cost Summary
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Consolidated across all floor plans. Click and edit any Material or Labour rate to customize costs for your project.
          </p>
        </div>

        {/* City Selector */}
        <div className="flex items-center gap-2.5 bg-surface-50 border border-surface-200 px-3 py-1.5 rounded-2xl">
          <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <label htmlFor="city-select" className="text-[9px] font-black uppercase tracking-wider text-surface-400">
                City Market Rates
              </label>
              {isCityCustomized ? (
                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Admin Verified ({verifiedDate})
                </span>
              ) : (
                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  CPWD Baseline ({verifiedDate})
                </span>
              )}
            </div>
            <select
              id="city-select"
              value={selectedCity}
              onChange={(e) => onSelectCity(e.target.value)}
              className="bg-transparent text-xs font-black text-foreground outline-none cursor-pointer"
            >
              {CITIES.map(c => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. Executive Grand Total Card */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-surface-50 to-surface-50 border-2 border-emerald-600/30 rounded-2xl p-4 sm:p-6 flex flex-wrap items-baseline justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Estimated Total Project Cost
            </span>
            {(customizedMaterialsCount > 0 || customizedLabourCount > 0) && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                {customizedMaterialsCount + customizedLabourCount} Custom Rates Active
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-3 mt-1">
            <div className="text-2xl sm:text-4xl font-mono font-black text-foreground tracking-tight">
              {formatINR(result.estimatedTotal)}
            </div>
            {result.rateAdjustment !== 0 && (
              <div className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border ${
                result.rateAdjustment > 0 
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              }`}>
                <span>{result.rateAdjustment > 0 ? '▲' : '▼'}</span>
                <span>Rate adjustments: {result.rateAdjustment > 0 ? '+' : ''}{formatINR(result.rateAdjustment)}</span>
                <span className="text-[10px] font-medium opacity-80">
                  ({result.rateAdjustment > 0 ? '+' : ''}{Math.round((result.rateAdjustment / Math.max(1, midpoint(result.marketTotal))) * 1000) / 10}% vs market midpoint)
                </span>
              </div>
            )}
          </div>
          {(customizedMaterialsCount > 0 || customizedLabourCount > 0) && (
            <div className="mt-1.5 text-xs text-text-secondary font-medium">
              Actual Site Cost (with edited rates): <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatINR(result.actualGrandTotal)}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs text-text-secondary font-medium">Market Benchmark Range for {cityLabel}:</span>
          <div className="text-sm sm:text-base font-mono font-bold text-surface-600 dark:text-surface-300 mt-0.5">
            {formatRangeINR(result.marketTotal)}
          </div>
        </div>
      </div>

      {/* 2. Material Schedule (Editable Rates) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              Material Schedule
            </h3>
            {customizedMaterialsCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {customizedMaterialsCount} customized
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {customizedMaterialsCount > 0 && onResetMaterialRates && (
              <button
                type="button"
                onClick={onResetMaterialRates}
                className="flex items-center gap-1 text-[11px] font-bold text-text-secondary hover:text-amber-600 transition-colors"
                title="Reset all material rates to city market rates"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Material Rates</span>
              </button>
            )}
            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
              Total Material: {formatINR(midpoint(result.materialTotal))}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-100 text-[10px] font-black uppercase tracking-wider text-surface-400 border-b border-surface-200">
                <th className="py-2.5 px-3 w-[38%]">Material</th>
                <th className="py-2.5 px-3 text-right w-[14%]">Quantity</th>
                <th className="py-2.5 px-3 w-[10%]">Unit</th>
                <th className="py-2.5 px-3 text-right w-[20%]">Rate (₹) <span className="lowercase font-medium opacity-80">(editable)</span></th>
                <th className="py-2.5 px-3 text-right w-[18%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {result.materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-secondary">
                    No materials required yet. Add BOQ items above to calculate material requirements.
                  </td>
                </tr>
              ) : (
                result.materials.map(m => (
                  <tr 
                    key={m.priceId} 
                    className={`transition-colors ${
                      m.isOverridden 
                        ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                        : 'hover:bg-surface-50'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{m.label}</span>
                        {m.isOverridden && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Custom Rate Applied" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {m.qty.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 font-mono text-text-secondary uppercase">{m.unit}</td>
                    
                    {/* Editable Material Rate */}
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-text-secondary">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={m.isOverridden ? m.customRate : m.effectiveRate}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              onUpdateMaterialRate?.(m.priceId, val);
                            }}
                            className={`w-24 px-2 py-1 text-xs font-mono font-bold text-right rounded-lg border outline-none transition-all ${
                              m.isOverridden
                                ? 'border-amber-400 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-2xs'
                                : 'border-surface-200 bg-surface-50 hover:border-surface-300 focus:border-accent text-foreground'
                            }`}
                            placeholder={String(Math.round(midpoint(m.marketRate)))}
                          />
                          {m.isOverridden && onUpdateMaterialRate && (
                            <button
                              type="button"
                              onClick={() => onUpdateMaterialRate(m.priceId, undefined)}
                              className="p-1 text-surface-400 hover:text-amber-600 rounded hover:bg-surface-100 transition-colors"
                              title="Reset to market rate"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {/* Market Benchmark Indicator */}
                        <span className="text-[9px] font-mono text-text-secondary pr-1">
                          {m.isOverridden ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              market: {formatRangeINR(m.marketRate)}
                            </span>
                          ) : (
                            formatRangeINR(m.marketRate)
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-mono font-black text-foreground">
                      {formatINR(m.effectiveCost)}
                    </td>
                  </tr>
                ))
              )}
              {result.materials.length > 0 && (
                <tr className="bg-surface-50 font-black border-t-2 border-surface-300">
                  <td colSpan={4} className="py-2.5 px-3 text-foreground uppercase tracking-wider text-[11px]">
                    Total Material Cost
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-foreground text-sm">
                    {formatINR(midpoint(result.materialTotal))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Labour Schedule (Editable Rates) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200 pb-2">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              Labour Schedule
            </h3>
            {customizedLabourCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {customizedLabourCount} customized
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {customizedLabourCount > 0 && onResetLabourRates && (
              <button
                type="button"
                onClick={onResetLabourRates}
                className="flex items-center gap-1 text-[11px] font-bold text-text-secondary hover:text-amber-600 transition-colors"
                title="Reset all labour rates to city market rates"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Labour Rates</span>
              </button>
            )}
            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
              Total Labour: {formatINR(midpoint(result.labourTotal))}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-100 text-[10px] font-black uppercase tracking-wider text-surface-400 border-b border-surface-200">
                <th className="py-2.5 px-3 w-[40%]">Trade / Craft</th>
                <th className="py-2.5 px-3 text-right w-[18%]">Man-Days</th>
                <th className="py-2.5 px-3 text-right w-[22%]">Rate / Day (₹) <span className="lowercase font-medium opacity-80">(editable)</span></th>
                <th className="py-2.5 px-3 text-right w-[20%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {result.labour.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-secondary">
                    No labour requirements calculated yet.
                  </td>
                </tr>
              ) : (
                result.labour.map(l => (
                  <tr 
                    key={l.priceId} 
                    className={`transition-colors ${
                      l.isOverridden 
                        ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                        : 'hover:bg-surface-50'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{l.label}</span>
                        {l.isOverridden && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Custom Rate Applied" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                      {l.qty.toLocaleString('en-IN')}
                    </td>
                    
                    {/* Editable Labour Rate */}
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-text-secondary">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.isOverridden ? l.customRate : l.effectiveRate}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              onUpdateLabourRate?.(l.priceId, val);
                            }}
                            className={`w-24 px-2 py-1 text-xs font-mono font-bold text-right rounded-lg border outline-none transition-all ${
                              l.isOverridden
                                ? 'border-amber-400 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-2xs'
                                : 'border-surface-200 bg-surface-50 hover:border-surface-300 focus:border-accent text-foreground'
                            }`}
                            placeholder={String(Math.round(midpoint(l.marketRate)))}
                          />
                          {l.isOverridden && onUpdateLabourRate && (
                            <button
                              type="button"
                              onClick={() => onUpdateLabourRate(l.priceId, undefined)}
                              className="p-1 text-surface-400 hover:text-amber-600 rounded hover:bg-surface-100 transition-colors"
                              title="Reset to market rate"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {/* Market Benchmark Indicator */}
                        <span className="text-[9px] font-mono text-text-secondary pr-1">
                          {l.isOverridden ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              market: {formatRangeINR(l.marketRate)}
                            </span>
                          ) : (
                            formatRangeINR(l.marketRate)
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-mono font-black text-foreground">
                      {formatINR(l.effectiveCost)}
                    </td>
                  </tr>
                ))
              )}
              {result.labour.length > 0 && (
                <tr className="bg-surface-50 font-black border-t-2 border-surface-300">
                  <td colSpan={3} className="py-2.5 px-3 text-foreground uppercase tracking-wider text-[11px]">
                    Total Labour Cost
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-foreground text-sm">
                    {formatINR(midpoint(result.labourTotal))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Cost Summary Waterfall */}
      <div className="space-y-3">
        <div className="border-b border-surface-200 pb-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
            Cost Summary Waterfall
          </h3>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-100 text-[10px] font-black uppercase tracking-wider text-surface-400 border-b border-surface-200">
                <th className="py-2.5 px-3 w-[50%]">Cost Component</th>
                <th className="py-2.5 px-3 text-right w-[25%]">Calculation Basis</th>
                <th className="py-2.5 px-3 text-right w-[25%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              <tr>
                <td className="py-2 px-3 font-semibold text-foreground">Material Total</td>
                <td className="py-2 px-3 text-right text-text-secondary">Consolidated materials requirement</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                  <PriceCell r={result.marketMaterialTotal} />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-foreground">Labour Total</td>
                <td className="py-2 px-3 text-right text-text-secondary">Consolidated trades requirement</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                  <PriceCell r={result.marketLabourTotal} />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-foreground">Machinery & Sundries</td>
                <td className="py-2 px-3 text-right text-text-secondary">Mixers, vibrators, hoists, tools</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                  <PriceCell r={result.machineryTotal} />
                </td>
              </tr>
              <tr className="bg-surface-50 font-bold border-t border-surface-200">
                <td className="py-2 px-3 text-foreground">Base Sub-Total</td>
                <td className="py-2 px-3 text-right text-text-secondary">Material + Labour + Machinery</td>
                <td className="py-2 px-3 text-right font-mono text-foreground">
                  <PriceCell r={result.marketSubtotal} />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-text-secondary font-medium">+ Water Charges (1%)</td>
                <td className="py-2 px-3 text-right text-text-secondary">1.0% on Base Subtotal</td>
                <td className="py-2 px-3 text-right font-mono text-text-secondary">
                  <PriceCell r={result.marketWater} />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-text-secondary font-medium">+ Contractor Profit & Overheads (15%)</td>
                <td className="py-2 px-3 text-right text-text-secondary">15.0% on Subtotal with Water</td>
                <td className="py-2 px-3 text-right font-mono text-text-secondary">
                  <PriceCell r={result.marketCpoh} />
                </td>
              </tr>
              {(result.rateAdjustment !== 0 || customizedMaterialsCount > 0 || customizedLabourCount > 0) && (
                <tr className={`font-bold border-t transition-colors ${
                  result.rateAdjustment > 0
                    ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30'
                    : result.rateAdjustment < 0
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30'
                    : 'bg-surface-50 border-surface-200'
                }`}>
                  <td className={`py-2.5 px-3 flex items-center gap-2 ${
                    result.rateAdjustment > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : result.rateAdjustment < 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-text-secondary'
                  }`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      result.rateAdjustment > 0 ? 'bg-amber-500' : result.rateAdjustment < 0 ? 'bg-emerald-500' : 'bg-surface-400'
                    }`} />
                    Rate adjustments (your edited rates vs market midpoint)
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-text-secondary font-medium">
                    {result.rateAdjustment > 0 
                      ? "Actual custom rates higher than market midpoint" 
                      : result.rateAdjustment < 0
                      ? "Actual custom rates discounted below market midpoint"
                      : "Matches market midpoint benchmark"}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-black text-sm ${
                    result.rateAdjustment > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : result.rateAdjustment < 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-foreground'
                  }`}>
                    {result.rateAdjustment > 0 ? `+${formatINR(result.rateAdjustment)}` : formatINR(result.rateAdjustment)}
                  </td>
                </tr>
              )}
              <tr className="bg-emerald-500/10 dark:bg-emerald-950/40 font-black text-sm border-t-2 border-emerald-500">
                <td className="py-3 px-3 text-emerald-900 dark:text-emerald-200">
                  Estimated Total Project Cost
                </td>
                <td className="py-3 px-3 text-right text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                  Standard CPWD Rate Waterfall
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-900 dark:text-emerald-200 text-base">
                  <div>{formatINR(result.estimatedTotal)}</div>
                  <div className="text-[10px] font-normal text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    market range {formatRangeINR(result.marketTotal)}
                  </div>
                </td>
              </tr>
              {(customizedMaterialsCount > 0 || customizedLabourCount > 0) && (
                <tr className="bg-amber-500/5 dark:bg-amber-950/20 font-bold text-xs border-t border-amber-500/20">
                  <td className="py-2.5 px-3 text-amber-900 dark:text-amber-200">
                    Actual Site Procurement Cost (with your edited rates)
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Consolidated materials & labour at custom rates
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900 dark:text-amber-200 text-sm">
                    {formatINR(result.actualGrandTotal)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Actions & Notes */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200">
        <p className="text-[11px] text-text-secondary max-w-xl leading-relaxed">
          <strong>Analysis of Rates Method:</strong> Each item is expanded into material, labour, and machinery coefficients based on CPWD standard analysis of rates, priced at live {cityLabel} market ranges, plus 1% water charges and 15% contractor profit & overheads. GST is extra.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isExportingExcel}
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Download multi-tab Microsoft Excel (.xlsx) workbook with Cost Summary, BOQ, Material & Labour schedules"
          >
            {isExportingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            {isExportingExcel ? "Generating Excel..." : "Export Excel (.xlsx)"}
          </button>

          <button
            type="button"
            disabled={isExportingCsv}
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-surface-card hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed text-text-primary border border-surface-300 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Download UTF-8 formatted CSV spreadsheet compatible with Microsoft Excel and Google Sheets"
          >
            {isExportingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            ) : (
              <FileText className="w-4 h-4 text-accent" />
            )}
            {isExportingCsv ? "Generating CSV..." : "Export CSV (.csv)"}
          </button>
        </div>
      </div>
    </div>
  );
};
