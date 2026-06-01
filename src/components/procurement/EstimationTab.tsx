"use client";

import React, { useEffect, useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { useParams } from "next/navigation";

interface EstimationItem {
  item_code: string;
  description: string;
  unit: string;
  total_net_qty: number;
  unit_cost: number;
  total_cost: number;
}

interface EstimationSummary {
  items: EstimationItem[];
  grand_total: number;
}

interface EstimationTabProps {
  onPushToBoq?: () => void;
}

export default function EstimationTab({ onPushToBoq }: EstimationTabProps) {
  const params = useParams();
  const projectId = params.id as string;
  const [data, setData] = useState<EstimationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPushing, setIsPushing] = useState(false);

  // Local state for tracking unsaved edits
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const summary = await projectsApi.getEstimationSummary(projectId);
      setData(summary);
      
      // Initialize editing costs
      const initialCosts: Record<string, string> = {};
      summary.items.forEach(item => {
        initialCosts[item.item_code] = item.unit_cost.toString();
      });
      setEditingCosts(initialCosts);
      
    } catch (err) {
      toast.error("Failed to load estimation summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const handlePushToBoq = async () => {
    if (!confirm("Are you sure you want to push this estimate to the BOQ Builder? Existing items with the same code will be updated.")) return;
    
    setIsPushing(true);
    try {
      const res = await projectsApi.pushEstimationToBoq(projectId);
      toast.success(`Successfully pushed ${res.pushed_items} items to BOQ!`);
      if (onPushToBoq) onPushToBoq();
    } catch (err: any) {
      toast.error("Failed to push to BOQ");
    } finally {
      setIsPushing(false);
    }
  };

  const handleCostChange = (itemCode: string, value: string) => {
    setEditingCosts(prev => ({ ...prev, [itemCode]: value }));
  };

  const handleCostBlur = async (itemCode: string) => {
    const cost = parseFloat(editingCosts[itemCode]) || 0;
    
    // Quick optimistic update for UI calculation
    if (data) {
      const newItems = data.items.map(i => {
        if (i.item_code === itemCode) {
          return { ...i, unit_cost: cost, total_cost: cost * i.total_net_qty };
        }
        return i;
      });
      const newTotal = newItems.reduce((acc, i) => acc + i.total_cost, 0);
      setData({ items: newItems, grand_total: newTotal });
    }

    try {
      await projectsApi.updateEstimationPricing(projectId, itemCode, cost);
    } catch (err) {
      toast.error("Failed to save unit cost");
    }
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-surface-500 font-bold">Loading Estimate...</div>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="p-16 text-center text-surface-500 bg-white rounded-3xl border border-surface-200">
        <p className="text-4xl mb-4">📐</p>
        <p className="font-black text-xl text-primary">No Take-Off Data Found</p>
        <p className="mt-2 text-sm max-w-md mx-auto">
          Start measuring from your floor plans in the Take-Off tab. The quantities will automatically aggregate here for pricing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-surface-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-primary uppercase tracking-tight">Master Estimate</h2>
          <p className="text-xs text-surface-500 font-bold mt-1">Aggregated quantities from all floor plans</p>
        </div>
        <button
          onClick={handlePushToBoq}
          disabled={isPushing}
          className="bg-accent text-white px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-accent-dark transition-all shadow-md disabled:opacity-50"
        >
          {isPushing ? "Pushing..." : "Push Estimate to BOQ ↗"}
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                <th className="py-4 px-6 w-32">Item Code</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 w-32 text-right">Total Net Qty</th>
                <th className="py-4 px-6 w-16">Unit</th>
                <th className="py-4 px-6 w-40 text-right">Unit Cost ($)</th>
                <th className="py-4 px-6 w-48 text-right text-emerald-600">Total Cost ($)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={`${item.item_code}-${index}`} className="border-b border-surface-100 hover:bg-surface-50 group">
                  <td className="py-2 px-6 font-black text-primary text-sm">{item.item_code}</td>
                  <td className="py-2 px-6 font-bold text-surface-600 text-sm truncate max-w-xs" title={item.description}>
                    {item.description}
                  </td>
                  <td className="py-2 px-6 font-black tabular-nums text-right text-surface-800 text-sm">
                    {item.total_net_qty}
                  </td>
                  <td className="py-2 px-6 font-bold text-surface-400 text-xs">
                    {item.unit}
                  </td>
                  <td className="py-2 px-6">
                    <div className="relative flex items-center justify-end">
                      <span className="absolute left-3 text-surface-400 font-bold text-xs pointer-events-none">$</span>
                      <input 
                        type="number"
                        value={editingCosts[item.item_code] || ""}
                        onChange={(e) => handleCostChange(item.item_code, e.target.value)}
                        onBlur={() => handleCostBlur(item.item_code)}
                        className="w-full h-9 pl-7 pr-3 text-right border border-surface-200 rounded-lg text-sm font-black text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all group-hover:bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-6 font-black tabular-nums text-right text-emerald-600 text-base">
                    ${item.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-surface-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-4 px-12 z-20 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-surface-500">Project Master Estimate</p>
        </div>
        <div className="pointer-events-auto text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-0.5">Grand Total Estimated Cost</p>
          <p className="text-3xl font-black text-emerald-600 tabular-nums tracking-tight">
            ${data.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}
