"use client";

import React, { useState, useMemo } from 'react';
import { formatINR, formatRangeINR } from '@/domains/infralens-boq/engine';
import { BOQItemRow } from '@/domains/infralens-boq/types';
import { useCustomItemsStore } from '@/domains/infralens-boq/custom-items';
import { 
  getUnifiedGroupedItems, 
  findUnifiedItem, 
  calculateUnifiedItemRate 
} from '@/domains/infralens-boq/items-registry';
import { CustomItemModal } from './CustomItemModal';
import { Plus, RotateCcw, Trash2, X, Link as LinkIcon, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface BOQItemsTableProps {
  items: BOQItemRow[];
  selectedCity: string;
  onUpdateItem: (id: string, updates: Partial<BOQItemRow>) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onResetToExample: () => void;
  onClearAll: () => void;
  customMaterialRates?: Record<string, number>;
  customLabourRates?: Record<string, number>;
}

export const BOQItemsTable: React.FC<BOQItemsTableProps> = ({
  items,
  selectedCity,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onResetToExample,
  onClearAll
}) => {
  const { customItems, customSections } = useCustomItemsStore();
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Grouped items combining standard CPWD recipes and custom items
  const groupedItems = useMemo(() => {
    return getUnifiedGroupedItems(customItems, customSections);
  }, [customItems, customSections]);

  return (
    <div className="w-full bg-surface-card rounded-2xl border border-surface-200 overflow-hidden shadow-xs mt-3">
      {/* Table Header */}
      <div className="p-3 sm:px-4 border-b border-surface-200 flex flex-wrap items-center justify-between gap-2 bg-surface-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-primary">
            📋 Bill of Quantities (Items of Work)
          </span>
          <span className="text-[10px] font-black font-mono bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded-md">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Create a custom item of work"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>+ Custom Item</span>
          </button>

          <Link
            href="/dashboard/items-of-work"
            target="_blank"
            className="flex items-center gap-1 text-[11px] font-bold text-text-secondary hover:text-foreground px-2 py-1 rounded-lg border border-surface-200 hover:bg-surface-100 transition-colors"
            title="Open Items of Work Catalog in new tab"
          >
            <BookOpen className="w-3 h-3 text-accent" />
            <span>Catalog</span>
          </Link>

          <button
            type="button"
            onClick={onResetToExample}
            className="flex items-center gap-1 text-[11px] font-bold text-text-secondary hover:text-foreground px-2 py-1 rounded-lg border border-surface-200 hover:bg-surface-100 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-100/50 text-[10px] font-black uppercase tracking-wider text-surface-400">
              <th className="py-2.5 px-3 w-[36%]">Item of Work</th>
              <th className="py-2.5 px-3 text-right w-[14%]">Quantity</th>
              <th className="py-2.5 px-3 w-[10%]">Unit</th>
              <th className="py-2.5 px-3 text-right w-[20%]">Rate (editable)</th>
              <th className="py-2.5 px-3 text-right w-[15%]">Amount</th>
              <th className="py-2.5 px-2 text-center w-[5%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-secondary">
                  No items added yet. Click &quot;+ Add item&quot; or measure on the floor plan above.
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const recipe = findUnifiedItem(row.slug, customItems);
                const rateInfo = recipe 
                  ? calculateUnifiedItemRate(recipe, selectedCity) 
                  : null;
                const autoRate = rateInfo ? Math.round(rateInfo.midpointRate) : 0;
                const isOverridden = row.customRate !== undefined && row.customRate !== null && !isNaN(row.customRate);
                const effectiveRate = isOverridden ? Number(row.customRate) : autoRate;
                const qty = Number(row.qty) || 0;
                const amount = effectiveRate * qty;

                return (
                  <tr key={row.id} className="hover:bg-surface-50/50 transition-colors group">
                    {/* Item of Work Selector */}
                    <td className="py-2 px-3">
                      <div className="space-y-0.5">
                        <select
                          value={row.slug}
                          onChange={(e) => {
                            const newRecipe = findUnifiedItem(e.target.value, customItems);
                            onUpdateItem(row.id, {
                              slug: e.target.value,
                              name: newRecipe?.name || e.target.value,
                              unit: newRecipe?.unit || 'cum',
                              customRate: undefined
                            });
                          }}
                          className="w-full bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-xs font-bold text-foreground outline-none focus:border-accent cursor-pointer truncate"
                        >
                          {groupedItems.map(({ group, isCustomSection, items: groupItems }) => (
                            <optgroup 
                              key={group} 
                              label={`${group}${isCustomSection ? ' ★ (Custom Section)' : ''}`}
                            >
                              {groupItems.map(item => (
                                <option key={item.slug} value={item.slug}>
                                  {item.isCustom ? '★ ' : ''}{item.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        {row.sourceType && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-accent">
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>
                              {row.sourceType === 'length' ? 'From Wall Length' : 'From Room Area'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Quantity Input */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.qty === 0 ? '' : row.qty}
                        onChange={(e) => onUpdateItem(row.id, { qty: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-20 bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-right text-foreground outline-none focus:border-accent"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3 text-xs font-bold font-mono text-text-secondary uppercase">
                      {row.unit || recipe?.unit}
                    </td>

                    {/* Rate Input (Editable) */}
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <input
                          type="number"
                          min="0"
                          value={isOverridden ? row.customRate : autoRate || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            onUpdateItem(row.id, { customRate: val });
                          }}
                          placeholder={String(autoRate)}
                          className={`w-24 border rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-right outline-none transition-colors ${
                            isOverridden
                              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 text-amber-900 dark:text-amber-200'
                              : 'bg-surface-50 border-surface-200 text-foreground focus:border-accent'
                          }`}
                        />

                        {rateInfo && rateInfo.total[0] !== rateInfo.total[1] && (
                          <span className="text-[9px] font-mono text-surface-400 mt-0.5">
                            range {formatRangeINR(rateInfo.total)}
                          </span>
                        )}

                        {isOverridden && (
                          <button
                            type="button"
                            onClick={() => onUpdateItem(row.id, { customRate: undefined })}
                            className="text-[9px] font-bold text-amber-600 hover:text-amber-700 underline mt-0.5"
                          >
                            ↺ market rate
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-mono font-black text-xs text-foreground">
                      {qty > 0 && effectiveRate > 0 ? formatINR(amount) : '—'}
                    </td>

                    {/* Remove Action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteItem(row.id)}
                        className="text-surface-400 hover:text-red-500 p-1 transition-colors rounded"
                        title="Remove Item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Item Row Button */}
      <div className="p-3 border-t border-surface-100 dark:border-surface-800 bg-surface-50/40 flex justify-between items-center">
        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item of Work</span>
        </button>
      </div>

      {/* Quick Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onItemSaved={(newItem) => {
          // Auto add this new item to the BOQ table!
          const newRow: BOQItemRow = {
            id: crypto.randomUUID(),
            slug: newItem.slug,
            name: newItem.name,
            group: newItem.group,
            qty: 1,
            unit: newItem.unit as any,
            sourceType: 'manual'
          };
          onUpdateItem(newRow.id, newRow);
        }}
      />
    </div>
  );
};
