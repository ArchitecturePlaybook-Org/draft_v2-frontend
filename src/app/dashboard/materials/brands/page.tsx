"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  Globe,
  Phone,
  Mail,
  ShieldCheck,
  RefreshCw,
  Package,
  Layers,
  Tag,
  Calculator,
  ExternalLink,
} from "lucide-react";
import { MaterialBrandMaster } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { BrandFormModal } from "@/components/inventory/BrandFormModal";
import { BrandDetailModal } from "@/components/inventory/BrandDetailModal";

export default function MaterialBrandsPage() {
  const [brands, setBrands] = useState<MaterialBrandMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<MaterialBrandMaster | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [brandToView, setBrandToView] = useState<MaterialBrandMaster | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getBrands({
        search: searchQuery,
        quality_tier: selectedTier,
        category: selectedCategory,
      });
      setBrands(data);
    } catch (err) {
      console.error("Failed to load brands", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, [searchQuery, selectedTier, selectedCategory]);

  const handleOpenAddModal = () => {
    setBrandToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (brand: MaterialBrandMaster) => {
    setBrandToEdit(brand);
    setIsFormModalOpen(true);
  };

  const handleOpenViewModal = (brand: MaterialBrandMaster) => {
    setBrandToView(brand);
    setIsDetailModalOpen(true);
  };

  const handleSavedBrand = (saved: MaterialBrandMaster) => {
    setBrands((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      if (exists) {
        return prev.map((b) => (b.id === saved.id ? saved : b));
      }
      return [...prev, saved];
    });
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete brand "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await inventoryApi.deleteBrand(id);
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      console.error("Failed to delete brand", err);
      alert(err?.message || "Cannot delete brand with active approved specifications.");
    } finally {
      setDeletingId(null);
    }
  };

  const approvedCount = brands.filter((b) => b.is_approved).length;
  const premiumCount = brands.filter((b) => b.quality_tier === "PREMIUM").length;
  const totalLinkedSKUs = brands.reduce((sum, b) => sum + (b.materials_count || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-600/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Approved Material Brands & Manufacturers
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {brands.length} Brands
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Centralized registry of approved construction material manufacturers, quality tiers, and institutional specifications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/materials"
            className="h-9 px-3.5 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-blue-400" />
            Master Catalog
          </Link>
          <Link
            href="/dashboard/materials/categories"
            className="h-9 px-3.5 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            Categories Master
          </Link>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            Register Brand
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Total Brands Cataloged</span>
          <div className="text-xl font-extrabold text-white tracking-tight">{brands.length} Manufacturers</div>
          <p className="text-[10px] text-zinc-500">Approved Vendor Ecosystem</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">BOQ Approved</span>
          <div className="text-xl font-extrabold text-emerald-400 tracking-tight">{approvedCount} Approved</div>
          <p className="text-[10px] text-emerald-500/80">Compliant with structural standards</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Premium Tier Brands</span>
          <div className="text-xl font-extrabold text-amber-400 tracking-tight">{premiumCount} Premium</div>
          <p className="text-[10px] text-amber-500/80">Architectural & High-Spec Grade</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Linked Catalog SKUs</span>
          <div className="text-xl font-extrabold text-blue-400 tracking-tight">{totalLinkedSKUs} Items</div>
          <p className="text-[10px] text-blue-500/80">Materials with Brand Specs</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <span>Approved Brand Registry</span>
            <span className="text-xs text-zinc-400 font-normal">
              (Showing {brands.length} brands)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quality Tier Filter */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none min-w-[130px]"
            >
              <option value="ALL">All Quality Tiers</option>
              <option value="PREMIUM">Premium Tier</option>
              <option value="STANDARD">Standard Tier</option>
              <option value="ECONOMY">Economy Tier</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none min-w-[140px]"
            >
              <option value="ALL">All Categories</option>
              <option value="CEMENT">Cement & Binders</option>
              <option value="STRUCTURAL">Structural Steel</option>
              <option value="MASONRY">Masonry Blocks</option>
              <option value="FINISHING">Finishing & Paints</option>
              <option value="WATERPROOFING">Waterproofing</option>
              <option value="MEP">MEP & Plumbing</option>
              <option value="SAFETY">Safety Equipment</option>
              <option value="TOOLS">Tools & Hardware</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                placeholder="Search brand name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="button"
              onClick={loadBrands}
              className="h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Brands Table */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Brand / Manufacturer</th>
                  <th className="py-3 px-4">Category Trade</th>
                  <th className="py-3 px-4">Quality Tier</th>
                  <th className="py-3 px-4">Origin</th>
                  <th className="py-3 px-4">Website & Contact</th>
                  <th className="py-3 px-4 text-center">Linked SKUs</th>
                  <th className="py-3 px-4">Specification Approval</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      Loading brands registry...
                    </td>
                  </tr>
                ) : brands.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      No brands found matching your search.
                    </td>
                  </tr>
                ) : (
                  brands.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 group-hover:text-amber-300">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-amber-400 transition-colors">
                              {b.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {b.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {b.primary_category || "General"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {b.quality_tier === "PREMIUM" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ⭐ Premium Spec
                          </span>
                        )}
                        {b.quality_tier === "STANDARD" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            🔹 Standard
                          </span>
                        )}
                        {b.quality_tier === "ECONOMY" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            🔸 Economy
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        {b.origin_country || "India"}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {b.website ? (
                          <a
                            href={b.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline flex items-center gap-1 text-[11px] truncate"
                          >
                            <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                            {b.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-amber-300 font-mono font-bold text-[11px]">
                          {b.materials_count || 0}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {b.is_approved ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3 h-3" /> Approved Spec
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Under Review
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View Brand Details"
                            onClick={() => handleOpenViewModal(b)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Brand"
                            onClick={() => handleOpenEditModal(b)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Brand"
                            disabled={deletingId === b.id}
                            onClick={() => handleDeleteBrand(b.id, b.name)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Brand Modal */}
      <BrandFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleSavedBrand}
        brandToEdit={brandToEdit}
      />

      {/* View Brand Detail Modal */}
      <BrandDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        brand={brandToView}
        onEdit={(brd) => handleOpenEditModal(brd)}
      />
    </div>
  );
}
