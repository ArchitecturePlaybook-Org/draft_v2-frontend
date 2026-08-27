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
} from "lucide-react";
import { MasterMaterial } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { MaterialFormModal } from "@/components/inventory/MaterialFormModal";
import { MaterialDetailModal } from "@/components/inventory/MaterialDetailModal";

export default function MasterMaterialsPage() {
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedAlgo, setSelectedAlgo] = useState("ALL");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<MasterMaterial | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [materialToView, setMaterialToView] = useState<MasterMaterial | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getMaterials();
      setMaterials(data);
    } catch (err) {
      console.error("Failed to load master materials", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleOpenAddModal = () => {
    setMaterialToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (mat: MasterMaterial) => {
    setMaterialToEdit(mat);
    setIsFormModalOpen(true);
  };

  const handleOpenViewModal = (mat: MasterMaterial) => {
    setMaterialToView(mat);
    setIsDetailModalOpen(true);
  };

  const handleSavedMaterial = (saved: MasterMaterial) => {
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      if (exists) {
        return prev.map((m) => (m.id === saved.id ? saved : m));
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the catalog?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await inventoryApi.deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      console.error("Failed to delete material", err);
      alert(err?.message || "Cannot delete material with active stock or task requirements.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesCat = selectedCategory === "ALL" || m.category === selectedCategory;
    const matchesAlgo =
      selectedAlgo === "ALL"
        ? true
        : selectedAlgo === "NONE"
        ? !m.calc_algo_name
        : m.calc_algo_name === selectedAlgo;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.hsn_sac_code && m.hsn_sac_code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesAlgo && matchesSearch;
  });

  const activeCount = materials.filter((m) => m.is_active !== false).length;
  const calcAttachedCount = materials.filter((m) => Boolean(m.calc_algo_name)).length;

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
                  Master Materials Catalog
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {materials.length} Master Items
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Centralized registry of construction materials, procurement rates, inventory thresholds, and civil engineering calculation engines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMaterials}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/materials/categories"
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            Categories Master
          </Link>
          <Link
            href="/dashboard/materials/brands"
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Approved Brands
          </Link>
          <Link
            href="/dashboard/materials/calculator"
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-blue-500/40 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 flex items-center gap-1.5 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            Calc Engine Sandbox
          </Link>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add Master Material
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Total Catalog Materials</span>
          <div className="text-xl font-extrabold text-white tracking-tight">{materials.length} SKUs</div>
          <p className="text-[10px] text-zinc-500">Universal Central Registry</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Active for Procurement</span>
          <div className="text-xl font-extrabold text-emerald-400 tracking-tight">{activeCount} Active</div>
          <p className="text-[10px] text-emerald-500/80">Available across all projects & POs</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Dynamic Engines Attached</span>
          <div className="text-xl font-extrabold text-blue-400 tracking-tight">{calcAttachedCount} Items</div>
          <p className="text-[10px] text-blue-500/80">IS 2212 / IS 1077 / IS 456 / IS 1786</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Material Categories</span>
          <div className="text-xl font-extrabold text-purple-400 tracking-tight">10 Trades</div>
          <p className="text-[10px] text-purple-500/80">Cement, Sand, Rebar, Masonry, Finishing</p>
        </div>
      </div>

      {/* Materials Search, Filter, & Catalog Table */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <span>Registered Material Items</span>
            <span className="text-xs text-zinc-400 font-normal">
              (Showing {filteredMaterials.length} of {materials.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none min-w-[150px]"
            >
              <option value="ALL">All Categories</option>
              <option value="CEMENT">Cement & Binders</option>
              <option value="SAND_AGGREGATE">Sand & Aggregates</option>
              <option value="MASONRY">Masonry & Blocks</option>
              <option value="STRUCTURAL">Structural Steel & Rebar</option>
              <option value="FINISHING">Finishing & Tiles</option>
              <option value="WATERPROOFING">Waterproofing & Chemicals</option>
              <option value="MEP">MEP & Electrical</option>
              <option value="SAFETY">Safety & PPE</option>
              <option value="TOOLS">Tools & Formwork</option>
              <option value="CONSUMABLE">General Consumables</option>
            </select>

            {/* Algorithm Filter */}
            <select
              value={selectedAlgo}
              onChange={(e) => setSelectedAlgo(e.target.value)}
              className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none min-w-[140px]"
            >
              <option value="ALL">All Calculators</option>
              <option value="calculate_masonry_materials">Wall Masonry</option>
              <option value="calculate_concrete_materials">Concrete RCC</option>
              <option value="calculate_rebar_steel">Rebar Steel</option>
              <option value="calculate_plaster_materials">Plastering</option>
              <option value="calculate_flooring_materials">Flooring</option>
              <option value="calculate_paint_materials">Painting</option>
              <option value="NONE">Direct Qty (No Engine)</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                placeholder="Search code, name, HSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Master Catalog Table */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Item Code & Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Standard Rate</th>
                  <th className="py-3 px-4">Min / Reorder Stock</th>
                  <th className="py-3 px-4">HSN / GST</th>
                  <th className="py-3 px-4">Calc Engine</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      Loading master materials catalog...
                    </td>
                  </tr>
                ) : filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      No materials found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {m.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{m.item_code}</span>
                              {m.is_active === false && (
                                <span className="px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] uppercase font-bold">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 capitalize">
                          {m.category.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-zinc-200">{m.unit}</td>

                      <td className="py-3 px-4 font-bold text-emerald-400">
                        ₹{Number(m.standard_rate || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        <span>{Number(m.min_stock || 0)}</span> /{" "}
                        <span className="text-amber-400 font-semibold">
                          {Number(m.reorder_level || 0)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                        <div>{m.hsn_sac_code || "—"}</div>
                        <div className="text-[10px] text-blue-400">{Number(m.gst_rate || 18)}% GST</div>
                      </td>

                      <td className="py-3 px-4">
                        {m.calc_algo_name ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            {m.calc_algo_name.replace("calculate_", "").replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Direct Qty</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View Material Details"
                            onClick={() => handleOpenViewModal(m)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 border border-zinc-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Material"
                            onClick={() => handleOpenEditModal(m)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Material"
                            disabled={deletingId === m.id}
                            onClick={() => handleDeleteMaterial(m.id, m.name)}
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

      {/* Add / Edit Material Modal */}
      <MaterialFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleSavedMaterial}
        materialToEdit={materialToEdit}
      />

      {/* View Material Details Modal */}
      <MaterialDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        material={materialToView}
        onEdit={(mat) => handleOpenEditModal(mat)}
      />
    </div>
  );
}
