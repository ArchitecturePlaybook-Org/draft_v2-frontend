"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Award,
  Globe,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Package,
  Edit,
  ExternalLink,
  RefreshCw,
  Layers,
} from "lucide-react";
import { MaterialBrandMaster, MasterMaterial } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

interface BrandDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: MaterialBrandMaster | null;
  onEdit?: (brand: MaterialBrandMaster) => void;
}

export const BrandDetailModal: React.FC<BrandDetailModalProps> = ({
  isOpen,
  onClose,
  brand,
  onEdit,
}) => {
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (brand && isOpen) {
      setLoading(true);
      inventoryApi
        .getMaterials(brand.primary_category)
        .then((all) => {
          // Filter materials that match brand name
          const matched = all.filter(
            (m) =>
              m.name.toLowerCase().includes(brand.name.toLowerCase()) ||
              (m.material_spec?.brand_approved &&
                JSON.stringify(m.material_spec.brand_approved)
                  .toLowerCase()
                  .includes(brand.name.toLowerCase()))
          );
          setMaterials(matched);
        })
        .catch((err) => console.error("Failed to load brand materials", err))
        .finally(() => setLoading(false));
    } else {
      setMaterials([]);
    }
  }, [brand, isOpen]);

  if (!isOpen || !brand) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{brand.name}</h2>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-amber-400 uppercase">
                  {brand.code}
                </span>
                {brand.is_approved ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Approved
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase">
                    Under Review
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">{brand.origin_country || "India"} • {brand.primary_category || "General Trade"}</p>
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Quality Tier</span>
              <div className="text-sm font-bold text-amber-400">{brand.quality_tier || "PREMIUM"}</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Trade Classification</span>
              <div className="text-sm font-bold text-white">{brand.primary_category || "General"}</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Active Catalog SKUs</span>
              <div className="text-sm font-bold text-blue-400">{materials.length} Materials</div>
            </div>
          </div>

          {/* Contact & Web Info */}
          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
            <span className="text-zinc-300 font-semibold block text-[11px]">Manufacturer Technical Information</span>
            <div className="grid grid-cols-2 gap-2.5 text-zinc-400">
              {brand.website && (
                <div className="flex items-center gap-1.5 truncate">
                  <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline truncate flex items-center gap-1"
                  >
                    {brand.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
              {brand.contact_person && (
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-zinc-300 truncate">{brand.contact_person}</span>
                </div>
              )}
              {brand.contact_email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-zinc-300 truncate">{brand.contact_email}</span>
                </div>
              )}
              {brand.contact_phone && (
                <div className="flex items-center gap-1.5 truncate">
                  <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-zinc-300 truncate">{brand.contact_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Specification Notes */}
          {brand.notes && (
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-zinc-400 font-semibold block text-[10px]">Specification Standards & Notes</span>
              <p className="text-zinc-300 text-[11px] leading-relaxed">{brand.notes}</p>
            </div>
          )}

          {/* Linked Materials Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                Approved Catalog Materials ({materials.length})
              </span>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="py-2 px-3">Item Code</th>
                    <th className="py-2 px-3">Material Name</th>
                    <th className="py-2 px-3">Unit</th>
                    <th className="py-2 px-3 text-right">Standard Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-zinc-500">
                        Loading materials...
                      </td>
                    </tr>
                  ) : materials.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-zinc-500">
                        No materials cataloged under {brand.name} yet.
                      </td>
                    </tr>
                  ) : (
                    materials.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-900/50">
                        <td className="py-2 px-3 font-mono text-[11px] text-amber-400 font-bold">
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
          <span className="text-[10px] text-zinc-500">Brand ID: {brand.id}</span>
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
                  onEdit(brand);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/20"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Brand
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
