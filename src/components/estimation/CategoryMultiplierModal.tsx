"use client";

import React, { useState } from "react";
import { X, Percent, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { RATE_CATEGORIES, getItemCategory, MATERIAL_META, resolveCityPrices } from "@/domains/infralens-boq/prices";

interface CategoryMultiplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  cityLabel: string;
  onApply: (itemIds: string[], percent: number) => void;
}

export const CategoryMultiplierModal: React.FC<CategoryMultiplierModalProps> = ({
  isOpen,
  onClose,
  city,
  cityLabel,
  onApply,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [percent, setPercent] = useState<string>("5");

  if (!isOpen) return null;

  const currentPrices = resolveCityPrices(city);
  const numericPercent = parseFloat(percent) || 0;

  // Find all items matching category
  const allItemIds = Object.keys(MATERIAL_META);
  const matchingItemIds = allItemIds.filter((id) => {
    if (selectedCategory === "all") return true;
    return getItemCategory(id) === selectedCategory;
  });

  // Calculate sample preview
  const previewItems = matchingItemIds.slice(0, 5).map((id) => {
    const meta = MATERIAL_META[id];
    const current = currentPrices[id] || [0, 0];
    const multiplier = 1 + numericPercent / 100;
    const newMin = Math.max(1, Math.round(current[0] * multiplier));
    const newMax = Math.max(newMin, Math.round(current[1] * multiplier));
    return {
      id,
      name: meta?.name || id,
      unit: meta?.unit || "-",
      current,
      newMin,
      newMax,
    };
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericPercent === 0 || matchingItemIds.length === 0) return;
    onApply(matchingItemIds, numericPercent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Percent className="w-5 h-5 text-accent" />
              Batch Category Multiplier — {cityLabel}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Apply inflation or regional cost adjustment across an entire trade.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Select Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {RATE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Percentage Shift (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                placeholder="e.g. 5 or -3.5"
                className="w-full pl-3 pr-10 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Positive values (e.g. +5) inflate rates; negative values (e.g. -3) discount rates.
            </p>
          </div>

          {/* Impact Banner */}
          <div className="p-3 bg-muted/30 border border-border rounded-lg flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Affected Items in {cityLabel}:</span>
            <span className="text-xs font-bold text-foreground">
              {matchingItemIds.length} materials / trades
            </span>
          </div>

          {/* Sample Preview */}
          {previewItems.length > 0 && numericPercent !== 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Preview of First Few Items:
              </span>
              <div className="border border-border rounded-lg divide-y divide-border text-xs bg-muted/10 overflow-hidden">
                {previewItems.map((item) => (
                  <div key={item.id} className="p-2 flex items-center justify-between">
                    <div className="truncate max-w-[200px]">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">({item.unit})</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-muted-foreground">
                        ₹{item.current[0]}–{item.current[1]}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span
                        className={
                          numericPercent > 0
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : "text-emerald-600 dark:text-emerald-400 font-semibold"
                        }
                      >
                        ₹{item.newMin}–{item.newMax}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={numericPercent === 0 || matchingItemIds.length === 0}
              className="px-5 py-2 text-sm font-semibold text-accent-foreground bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {numericPercent >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              Apply {numericPercent > 0 ? `+${numericPercent}%` : `${numericPercent}%`} to {matchingItemIds.length} Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
