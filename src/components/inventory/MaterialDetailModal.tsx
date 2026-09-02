"use client";

import React from "react";
import {
  X,
  Layers,
  DollarSign,
  Package,
  ShieldCheck,
  Edit,
  Tag,
  Hash,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { MasterMaterial } from "@/domains/inventory/types";

interface MaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: MasterMaterial | null;
  onEdit?: (material: MasterMaterial) => void;
}

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  isOpen,
  onClose,
  material,
  onEdit,
}) => {
  if (!isOpen || !material) return null;

  const spec = material.material_spec || {};
  const brands = Array.isArray(spec.brand_approved)
    ? spec.brand_approved
    : spec.brand
    ? [spec.brand]
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {material.item_code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    material.is_active !== false
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {material.is_active !== false ? "Active Catalog Item" : "Inactive"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                {material.name}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(material);
                }}
                className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
              >
                <Edit className="w-3.5 h-3.5 text-blue-400" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 1: Pricing & Classification Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Standard Rate</span>
            <div className="text-lg font-extrabold text-emerald-400">
              ₹{Number(material.standard_rate || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-zinc-500">Per {material.unit}</p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Category</span>
            <div className="text-sm font-bold text-zinc-200 capitalize">
              {material.category.toLowerCase().replace(/_/g, " ")}
            </div>
            <p className="text-[10px] text-zinc-500">UOM: {material.unit}</p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">GST / Tax</span>
            <div className="text-sm font-bold text-blue-400">
              {Number(material.gst_rate || 18)}% GST
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">HSN: {material.hsn_sac_code || "N/A"}</p>
          </div>
        </div>

        {/* Section 3: Engineering Spec & Calculation Algorithm */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3 text-xs">
          <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Civil Engineering Specifications & Calculation Engine
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Calculation Engine</span>
              <div className="font-semibold text-blue-300">
                {material.calc_algo_name ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    {material.calc_algo_name.replace(/_/g, " ")}
                  </span>
                ) : (
                  <span className="text-zinc-400">Direct Quantity Entry (No Algorithm)</span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Technical Grade</span>
              <div className="font-semibold text-zinc-200">
                {spec.grade || "Standard Construction Grade"}
              </div>
            </div>
          </div>

          {brands.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Approved Brands:</span>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((b: string) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-medium"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {spec.density_kg_m3 && (
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300">
              <span className="text-zinc-500">Bulk Density: </span>
              <span className="font-mono font-bold text-zinc-200">{spec.density_kg_m3} kg/m³</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-zinc-500">
          <div>
            Created: {material.created_at ? new Date(material.created_at).toLocaleDateString() : "N/A"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
