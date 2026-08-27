"use client";

import React, { useState, useEffect } from "react";
import { X, Layers, Sparkles, Edit, Tag, CheckCircle2, Box, Package, RefreshCw } from "lucide-react";
import { MaterialCategoryMaster, MasterMaterial } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: MaterialCategoryMaster | null;
  onEdit?: (category: MaterialCategoryMaster) => void;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  isOpen,
  onClose,
  category,
  onEdit,
}) => {
  const [linkedMaterials, setLinkedMaterials] = useState<MasterMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category && isOpen) {
      setLoading(true);
      inventoryApi
        .getMaterials(category.code)
        .then((mats) => setLinkedMaterials(mats))
        .catch((err) => console.error("Failed to load category materials", err))
        .finally(() => setLoading(false));
    } else {
      setLinkedMaterials([]);
    }
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{category.name}</h2>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-blue-400 uppercase">
                  {category.code}
                </span>
                {category.is_active !== false ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">{category.description || "No description provided."}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Default Unit</span>
              <div className="text-sm font-bold text-white">{category.default_unit || "—"}</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Default GST Rate</span>
              <div className="text-sm font-bold text-emerald-400">{category.default_gst_rate || 18}%</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Registered SKUs</span>
              <div className="text-sm font-bold text-blue-400">{linkedMaterials.length} Materials</div>
            </div>
          </div>

          {/* Linked Calculation Engine */}
          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Civil Engineering Calculation Algorithm
            </div>
            {category.calc_algo_name ? (
              <div className="text-xs font-mono font-bold text-blue-300">
                {category.calc_algo_name}
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Direct Quantity (No automated civil formula)</div>
            )}
          </div>

          {/* Linked Materials Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                Materials in this Category ({linkedMaterials.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  inventoryApi
                    .getMaterials(category.code)
                    .then((mats) => setLinkedMaterials(mats))
                    .finally(() => setLoading(false));
                }}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Material Name</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Standard Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-500">
                        Loading materials...
                      </td>
                    </tr>
                  ) : linkedMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-500">
                        No materials registered under this category yet.
                      </td>
                    </tr>
                  ) : (
                    linkedMaterials.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-900/50">
                        <td className="py-2 px-3 font-mono text-[11px] text-blue-400 font-bold">
                          {m.item_code}
                        </td>
                        <td className="py-2 px-3 text-white">{m.name}</td>
                        <td className="py-2 px-3 text-zinc-400">{m.unit}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400 font-mono">
                          ₹{Number(m.standard_rate || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60">
          <span className="text-[10px] text-zinc-500">
            Category ID: {category.id}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-colors"
            >
              Close
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(category);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Category
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
