"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  Sparkles,
  RefreshCw,
  Calculator,
  Tag,
  Award,
  Building,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import { MaterialCategoryMaster } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { CategoryFormModal } from "@/components/inventory/CategoryFormModal";
import { CategoryDetailModal } from "@/components/inventory/CategoryDetailModal";

export default function MaterialCategoriesPage() {
  const [categories, setCategories] = useState<MaterialCategoryMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlgo, setSelectedAlgo] = useState("ALL");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<MaterialCategoryMaster | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [categoryToView, setCategoryToView] = useState<MaterialCategoryMaster | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getCategories(searchQuery);
      setCategories(data);
    } catch (err) {
      console.error("Failed to load material categories", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [searchQuery]);

  const handleOpenAddModal = () => {
    setCategoryToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cat: MaterialCategoryMaster) => {
    setCategoryToEdit(cat);
    setIsFormModalOpen(true);
  };

  const handleOpenViewModal = (cat: MaterialCategoryMaster) => {
    setCategoryToView(cat);
    setIsDetailModalOpen(true);
  };

  const handleSavedCategory = (saved: MaterialCategoryMaster) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [...prev, saved];
    });
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await inventoryApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error("Failed to delete category", err);
      alert(err?.message || "Cannot delete category with registered active materials.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const matchesAlgo =
      selectedAlgo === "ALL"
        ? true
        : selectedAlgo === "NONE"
        ? !c.calc_algo_name
        : c.calc_algo_name === selectedAlgo;
    return matchesAlgo;
  });

  const totalSKUs = categories.reduce((sum, c) => sum + (c.materials_count || 0), 0);
  const activeCategoriesCount = categories.filter((c) => c.is_active !== false).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Material Categories Master
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {categories.length} Categories
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Centralized registry of construction material trades, classification codes, default units of measurement, tax slabs, and civil calculation formulas.
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
            href="/dashboard/materials/brands"
            className="h-9 px-3.5 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Approved Brands
          </Link>
          <Link
            href="/dashboard/materials/calculator"
            className="h-9 px-3.5 text-xs font-semibold rounded-xl border border-blue-500/40 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 flex items-center gap-1.5 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            Calc Engine
          </Link>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add New Category
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Total Categories</span>
          <div className="text-xl font-extrabold text-white tracking-tight">{categories.length} Trades</div>
          <p className="text-[10px] text-zinc-500">Universal Construction Trades</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Active Status</span>
          <div className="text-xl font-extrabold text-emerald-400 tracking-tight">{activeCategoriesCount} Active</div>
          <p className="text-[10px] text-emerald-500/80">Available for catalog assignment</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Linked Catalog Materials</span>
          <div className="text-xl font-extrabold text-blue-400 tracking-tight">{totalSKUs} Items</div>
          <p className="text-[10px] text-blue-500/80">Active SKUs categorized</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Standard Tax Slabs</span>
          <div className="text-xl font-extrabold text-purple-400 tracking-tight">5%, 12%, 18%, 28%</div>
          <p className="text-[10px] text-purple-500/80">HSN & GST Slabs configured</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <span>Material Category List</span>
            <span className="text-xs text-zinc-400 font-normal">
              (Showing {filteredCategories.length} of {categories.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Calculation Engine Filter */}
            <select
              value={selectedAlgo}
              onChange={(e) => setSelectedAlgo(e.target.value)}
              className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none min-w-[150px]"
            >
              <option value="ALL">All Calc Engines</option>
              <option value="calculate_masonry_materials">Wall Masonry</option>
              <option value="calculate_concrete_materials">Concrete RCC</option>
              <option value="calculate_rebar_steel">Rebar Steel</option>
              <option value="calculate_plaster_materials">Plastering</option>
              <option value="calculate_flooring_materials">Flooring & Tiling</option>
              <option value="calculate_paint_materials">Painting</option>
              <option value="NONE">Direct Qty (No Engine)</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                placeholder="Search category name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={loadCategories}
              className="h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Category Code & Name</th>
                  <th className="py-3 px-4">Description & Scope</th>
                  <th className="py-3 px-4">Default Unit</th>
                  <th className="py-3 px-4">Default GST</th>
                  <th className="py-3 px-4">Calculation Engine</th>
                  <th className="py-3 px-4 text-center">Linked SKUs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      Loading categories master...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      No categories found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 group-hover:text-blue-300">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {c.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs text-zinc-400 text-[11px] truncate">
                        {c.description || "—"}
                      </td>

                      <td className="py-3 px-4 font-semibold text-zinc-200">
                        {c.default_unit || "NO"}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {Number(c.default_gst_rate || 18)}%
                      </td>

                      <td className="py-3 px-4">
                        {c.calc_algo_name ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            {c.calc_algo_name.replace("calculate_", "").replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Direct Qty</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-blue-300 font-mono font-bold text-[11px]">
                          {c.materials_count || 0}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {c.is_active !== false ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View Category Details"
                            onClick={() => handleOpenViewModal(c)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 border border-zinc-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Category"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Category"
                            disabled={deletingId === c.id}
                            onClick={() => handleDeleteCategory(c.id, c.name)}
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

      {/* Add / Edit Category Modal */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleSavedCategory}
        categoryToEdit={categoryToEdit}
      />

      {/* View Category Detail Modal */}
      <CategoryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        category={categoryToView}
        onEdit={(cat) => handleOpenEditModal(cat)}
      />
    </div>
  );
}
