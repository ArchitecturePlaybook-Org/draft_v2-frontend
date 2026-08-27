"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, AlertCircle, Save, Layers, Check } from "lucide-react";
import { MaterialCategoryMaster, MaterialUnit } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (category: MaterialCategoryMaster) => void;
  categoryToEdit?: MaterialCategoryMaster | null;
}

const UNITS: { value: MaterialUnit; label: string }[] = [
  { value: "BAG", label: "Bags (BAG)" },
  { value: "TON", label: "Metric Tons (TON)" },
  { value: "KG", label: "Kilograms (KG)" },
  { value: "M3", label: "Cubic Meters (M³)" },
  { value: "M2", label: "Square Meters (M²)" },
  { value: "CFT", label: "Cubic Feet (CFT)" },
  { value: "RUNNING_METER", label: "Running Meters (RMT)" },
  { value: "NOS", label: "Numbers (NOS)" },
  { value: "PIECE", label: "Pieces (PIECE)" },
  { value: "BOX", label: "Boxes (BOX)" },
  { value: "BUNDLE", label: "Bundles (BUNDLE)" },
  { value: "LITER", label: "Liters (LITER)" },
  { value: "PKT", label: "Packets (PKT)" },
  { value: "DRUM", label: "Drums (DRUM)" },
  { value: "ROLL", label: "Rolls (ROLL)" },
];

const ALGORITHMS: { value: string; label: string }[] = [
  { value: "", label: "Direct Quantity (No Calculation Engine)" },
  { value: "calculate_masonry_materials", label: "Wall Masonry Engine (IS 2212)" },
  { value: "calculate_concrete_materials", label: "Concrete RCC Engine (IS 456)" },
  { value: "calculate_rebar_steel", label: "Structural Steel & Rebar Engine (IS 1786)" },
  { value: "calculate_plaster_materials", label: "Plastering Mortar Engine (IS 1661)" },
  { value: "calculate_flooring_materials", label: "Flooring & Tiling Engine (IS 1443)" },
  { value: "calculate_paint_materials", label: "Paint & Surface Coating Engine" },
];

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  categoryToEdit,
}) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultUnit, setDefaultUnit] = useState<MaterialUnit>("BAG");
  const [defaultGstRate, setDefaultGstRate] = useState<number>(18.0);
  const [calcAlgoName, setCalcAlgoName] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(categoryToEdit);

  useEffect(() => {
    if (categoryToEdit) {
      setCode(categoryToEdit.code || "");
      setName(categoryToEdit.name || "");
      setDescription(categoryToEdit.description || "");
      setDefaultUnit(categoryToEdit.default_unit || "BAG");
      setDefaultGstRate(Number(categoryToEdit.default_gst_rate || 18.0));
      setCalcAlgoName(categoryToEdit.calc_algo_name || "");
      setIsActive(categoryToEdit.is_active !== false);
    } else {
      setCode("");
      setName("");
      setDescription("");
      setDefaultUnit("BAG");
      setDefaultGstRate(18.0);
      setCalcAlgoName("");
      setIsActive(true);
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !code) {
      const generatedCode = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 30);
      setCode(generatedCode);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category Name is required.");
      return;
    }
    if (!code.trim()) {
      setError("Category Code is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<MaterialCategoryMaster> = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      default_unit: defaultUnit,
      default_gst_rate: defaultGstRate,
      calc_algo_name: calcAlgoName,
      is_active: isActive,
    };

    try {
      let result: MaterialCategoryMaster;
      if (isEditing && categoryToEdit) {
        result = await inventoryApi.updateCategory(categoryToEdit.id, payload);
      } else {
        result = await inventoryApi.createCategory(payload);
      }
      onSaved(result);
      onClose();
    } catch (err: any) {
      console.error("Failed to save material category", err);
      setError(err?.message || "Failed to save category. Please ensure category code is unique.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isEditing ? `Edit Category: ${categoryToEdit?.name}` : "Create New Material Category"}
              </h2>
              <p className="text-xs text-zinc-400">
                Define construction category classification, default units, tax slabs, and linked calculation engines.
              </p>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cement & Binders"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Category Code (Unique) *</label>
              <input
                type="text"
                required
                placeholder="e.g. CEMENT, HVAC, SOLAR"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Description & Scope</label>
            <textarea
              rows={2}
              placeholder="e.g. Portland cements, slag binders, white cements, and micro-silica..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Default Unit of Measurement</label>
              <select
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value as MaterialUnit)}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Default GST Rate (%)</label>
              <select
                value={defaultGstRate}
                onChange={(e) => setDefaultGstRate(parseFloat(e.target.value))}
                className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={0}>0% (Tax Exempt / Nil)</option>
                <option value={5}>5% (Sand, Aggregates, Marble)</option>
                <option value={12}>12% (Clay Bricks, Fly Ash Blocks)</option>
                <option value={18}>18% (Standard Rate / Steel / Tiles / Pipes)</option>
                <option value={28}>28% (Cement, High-Gloss Paints)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Linked Civil Engineering Calculation Algorithm
            </label>
            <select
              value={calcAlgoName}
              onChange={(e) => setCalcAlgoName(e.target.value)}
              className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            >
              {ALGORITHMS.map((algo) => (
                <option key={algo.value} value={algo.value}>
                  {algo.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-zinc-300 font-semibold">Active Status</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Category"}
          </button>
        </div>
      </div>
    </div>
  );
};
