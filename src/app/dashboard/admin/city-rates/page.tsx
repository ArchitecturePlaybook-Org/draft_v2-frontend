"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Building2, 
  Search, 
  Download, 
  Upload, 
  Percent, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  ArrowLeft,
  Filter,
  Save
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { 
  CITIES, 
  MATERIAL_META, 
  RATE_CATEGORIES, 
  getItemCategory, 
  RateCategoryId, 
  resolveCityPrices,
  CITY_PRICES
} from "@/domains/infralens-boq/prices";
import { Interval } from "@/domains/infralens-boq/types";
import { useCityRatesStore } from "@/domains/infralens-boq/city-rates-store";
import { ImportRatesModal } from "@/components/estimation/ImportRatesModal";
import { CategoryMultiplierModal } from "@/components/estimation/CategoryMultiplierModal";
import { toast } from "sonner";

export default function AdminCityRatesPage() {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const isSuperAdmin = isAdmin || Boolean((user as any)?.is_superuser) || user?.email === "superadmin@ap.com";

  // City selection
  const [selectedCity, setSelectedCity] = useState<string>("bangalore");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<RateCategoryId>("all");

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isMultiplierModalOpen, setIsMultiplierModalOpen] = useState<boolean>(false);

  // Store state
  const { 
    cityOverrides, 
    updateItemRate, 
    applyCategoryMultiplier, 
    importCityRates, 
    resetCityToBenchmark 
  } = useCityRatesStore();

  const activeCityPrices = useMemo(() => {
    return resolveCityPrices(selectedCity, cityOverrides[selectedCity]?.prices);
  }, [selectedCity, cityOverrides]);

  const defaultCityPrices = useMemo(() => {
    return CITY_PRICES[selectedCity] || CITY_PRICES["delhi"] || {};
  }, [selectedCity]);

  const currentCityMeta = useMemo(() => {
    return CITIES.find((c) => c.slug === selectedCity) || { slug: selectedCity, label: selectedCity };
  }, [selectedCity]);

  const cityOverrideData = cityOverrides[selectedCity];
  const isCustomized = Boolean(cityOverrideData?.isCustomized && Object.keys(cityOverrideData.prices || {}).length > 0);
  const customizedItemCount = Object.keys(cityOverrideData?.prices || {}).length;
  const lastUpdated = cityOverrideData?.lastUpdated || "2026-08-12";

  // Filter items
  const filteredItems = useMemo(() => {
    const allIds = Object.keys(MATERIAL_META);
    return allIds
      .filter((id) => {
        const meta = MATERIAL_META[id];
        const category = getItemCategory(id);
        
        // Category filter
        if (selectedCategory !== "all" && category !== selectedCategory) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = meta.name.toLowerCase().includes(q);
          const matchCode = id.toLowerCase().includes(q);
          const matchUnit = meta.unit.toLowerCase().includes(q);
          return matchName || matchCode || matchUnit;
        }

        return true;
      })
      .map((id) => {
        const meta = MATERIAL_META[id];
        const activeRange = activeCityPrices[id] || [0, 0];
        const defaultRange = defaultCityPrices[id] || [0, 0];
        const isItemOverridden = Boolean(cityOverrideData?.prices?.[id]);
        return {
          id,
          name: meta.name,
          unit: meta.unit,
          category: getItemCategory(id),
          defaultRange,
          activeRange,
          isItemOverridden,
          midpoint: Math.round((activeRange[0] + activeRange[1]) / 2),
        };
      });
  }, [selectedCategory, searchQuery, activeCityPrices, defaultCityPrices, cityOverrideData]);

  // Export CSV
  const handleExportCSV = () => {
    const allIds = Object.keys(MATERIAL_META);
    const headers = ["code", "name", "category", "unit", "min_rate", "max_rate", "midpoint_rate"];
    const rows = allIds.map((id) => {
      const meta = MATERIAL_META[id];
      const range = activeCityPrices[id] || [0, 0];
      const mid = Math.round((range[0] + range[1]) / 2);
      const cat = getItemCategory(id);
      return [
        `"${id}"`,
        `"${meta.name.replace(/"/g, '""')}"`,
        `"${cat}"`,
        `"${meta.unit.replace(/"/g, '""')}"`,
        range[0],
        range[1],
        mid
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `city_rates_${selectedCity}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported rate card for ${currentCityMeta.label}`);
  };

  // Reset city
  const handleResetCity = () => {
    if (confirm(`Are you sure you want to restore ${currentCityMeta.label} to default CPWD benchmark rates? All custom overrides for this city will be cleared.`)) {
      resetCityToBenchmark(selectedCity);
      toast.success(`${currentCityMeta.label} rates restored to CPWD baseline`);
    }
  };

  // Access Control Guard
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Administrator Access Only</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Global City Market Rates define the baseline pricing benchmarks for all 50 cities across Architecture Playbook and can only be maintained by platform administrators.
          </p>
          <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground text-left">
            <span className="font-semibold text-foreground">Note:</span> To customize pricing for your specific project, please use the editable rates inside the <strong>Material Schedule</strong> and <strong>Labour Schedule</strong> within your project estimation workspace.
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Banner */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
                  Platform Admin
                </span>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Coins className="w-5 h-5 text-accent" />
                  City Market Rates Master
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Maintain regional benchmark price ranges for 50 cities across 94 materials and labour trades.
              </p>
            </div>
          </div>

          {/* City Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* City Dropdown */}
            <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-muted-foreground">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-sm font-bold text-foreground focus:outline-none cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug} className="bg-card text-foreground">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-muted/40 hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Download rates as CSV to edit in Excel or Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              Export CSV
            </button>

            {/* Import CSV */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Upload modified CSV to update city rates"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>

            {/* Batch Multiplier */}
            <button
              onClick={() => setIsMultiplierModalOpen(true)}
              className="px-3 py-1.5 bg-muted/40 hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Adjust an entire category by a percentage"
            >
              <Percent className="w-3.5 h-3.5 text-muted-foreground" />
              Batch Multiplier
            </button>

            {/* Reset Button */}
            {isCustomized && (
              <button
                onClick={handleResetCity}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Restore all items in this city to default CPWD benchmark"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset City
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 space-y-5">
        {/* City Status Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isCustomized ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            }`}>
              {isCustomized ? <Coins className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">{currentCityMeta.label} Rate Card</span>
                {isCustomized ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    ★ Admin Customized ({customizedItemCount} items modified)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    CPWD DSR Benchmark Baseline
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last updated on <span className="font-semibold text-foreground">{lastUpdated}</span> • Applied to all estimates set in {currentCityMeta.label}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-muted-foreground block">Total Catalog Items</span>
              <span className="font-bold text-foreground text-sm">{Object.keys(MATERIAL_META).length} Items</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <span className="text-muted-foreground block">Active Trade Categories</span>
              <span className="font-bold text-foreground text-sm">{RATE_CATEGORIES.length - 1} Categories</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full text-xs">
            {RATE_CATEGORIES.map((cat) => {
              const count = cat.id === "all" 
                ? Object.keys(MATERIAL_META).length 
                : Object.keys(MATERIAL_META).filter((k) => getItemCategory(k) === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id ? "bg-accent-foreground/20 text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search materials, labour, or codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Rates Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Material / Labour Item</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3 text-center">Benchmark Range (CPWD)</th>
                  <th className="px-4 py-3 text-center">Active Market Range [Min - Max]</th>
                  <th className="px-3 py-3 text-right">Midpoint</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No materials or labour trades match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <RateTableRow
                      key={item.id}
                      item={item}
                      city={selectedCity}
                      onUpdateRate={(min, max) => {
                        updateItemRate(selectedCity, item.id, min, max);
                        toast.success(`Updated rate for ${item.name}`);
                      }}
                      onResetRate={() => {
                        updateItemRate(selectedCity, item.id, item.defaultRange[0], item.defaultRange[1]);
                        toast.success(`Reset ${item.name} to benchmark`);
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ImportRatesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        city={selectedCity}
        cityLabel={currentCityMeta.label}
        onApply={(rates) => {
          importCityRates(selectedCity, rates);
          toast.success(`Imported ${Object.keys(rates).length} rates for ${currentCityMeta.label}`);
        }}
      />

      <CategoryMultiplierModal
        isOpen={isMultiplierModalOpen}
        onClose={() => setIsMultiplierModalOpen(false)}
        city={selectedCity}
        cityLabel={currentCityMeta.label}
        onApply={(itemIds, percent) => {
          applyCategoryMultiplier(selectedCity, itemIds, percent);
          toast.success(`Applied ${percent > 0 ? `+${percent}%` : `${percent}%`} to ${itemIds.length} items in ${currentCityMeta.label}`);
        }}
      />
    </div>
  );
}

interface RateTableRowProps {
  item: {
    id: string;
    name: string;
    unit: string;
    category: string;
    defaultRange: Interval;
    activeRange: Interval;
    isItemOverridden: boolean;
    midpoint: number;
  };
  city: string;
  onUpdateRate: (min: number, max: number) => void;
  onResetRate: () => void;
}

const RateTableRow: React.FC<RateTableRowProps> = ({
  item,
  onUpdateRate,
  onResetRate,
}) => {
  const [minVal, setMinVal] = useState<string>(item.activeRange[0].toString());
  const [maxVal, setMaxVal] = useState<string>(item.activeRange[1].toString());

  // Sync state if activeRange changes via external bulk update
  React.useEffect(() => {
    setMinVal(item.activeRange[0].toString());
    setMaxVal(item.activeRange[1].toString());
  }, [item.activeRange]);

  const handleBlur = () => {
    const min = parseFloat(minVal);
    const max = parseFloat(maxVal);
    if (!isNaN(min) && !isNaN(max) && min >= 0 && max >= min) {
      if (min !== item.activeRange[0] || max !== item.activeRange[1]) {
        onUpdateRate(min, max);
      }
    } else {
      // Restore previous on invalid
      setMinVal(item.activeRange[0].toString());
      setMaxVal(item.activeRange[1].toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <tr className={`hover:bg-muted/30 transition-colors ${
      item.isItemOverridden ? "bg-amber-500/5" : ""
    }`}>
      {/* Name & Code */}
      <td className="px-4 py-2.5 font-medium">
        <div className="text-foreground">{item.name}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{item.id}</div>
      </td>

      {/* Category */}
      <td className="px-3 py-2.5 text-muted-foreground capitalize">
        {item.category.replace("_", " ")}
      </td>

      {/* Unit */}
      <td className="px-3 py-2.5 text-muted-foreground">
        {item.unit}
      </td>

      {/* Benchmark Range */}
      <td className="px-3 py-2.5 text-center text-muted-foreground font-mono">
        ₹{item.defaultRange[0].toLocaleString("en-IN")} – ₹{item.defaultRange[1].toLocaleString("en-IN")}
      </td>

      {/* Active Range Inputs */}
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₹</span>
            <input
              type="number"
              value={minVal}
              onChange={(e) => setMinVal(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-20 pl-5 pr-1.5 py-1 text-xs bg-background border border-border rounded font-mono text-center focus:outline-none focus:ring-1 focus:ring-accent"
              title="Minimum Market Price"
            />
          </div>
          <span className="text-muted-foreground text-xs">–</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₹</span>
            <input
              type="number"
              value={maxVal}
              onChange={(e) => setMaxVal(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-20 pl-5 pr-1.5 py-1 text-xs bg-background border border-border rounded font-mono text-center focus:outline-none focus:ring-1 focus:ring-accent"
              title="Maximum Market Price"
            />
          </div>
        </div>
      </td>

      {/* Midpoint */}
      <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">
        ₹{item.midpoint.toLocaleString("en-IN")}
      </td>

      {/* Status */}
      <td className="px-3 py-2.5 text-center">
        {item.isItemOverridden ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Custom
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
            Default
          </span>
        )}
      </td>

      {/* Action */}
      <td className="px-3 py-2.5 text-right">
        {item.isItemOverridden ? (
          <button
            onClick={onResetRate}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="Reset this item to CPWD benchmark"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </td>
    </tr>
  );
};
