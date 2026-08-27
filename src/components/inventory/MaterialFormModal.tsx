"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Layers, AlertCircle, Sparkles, Hash, DollarSign } from "lucide-react";
import { MasterMaterial, MaterialCategory, MaterialUnit } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (material: MasterMaterial) => void;
  materialToEdit?: MasterMaterial | null;
}

const CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: "CEMENT", label: "Cement & Binders (OPC, PPC, Slag, White Cement)" },
  { value: "SAND_AGGREGATE", label: "Sand & Aggregates (River Sand, M-Sand, 10mm, 20mm)" },
  { value: "MASONRY", label: "Masonry (Bricks, AAC Blocks, Fly Ash)" },
  { value: "STRUCTURAL", label: "Structural (Rebar Steel, Structural Steel, Mesh)" },
  { value: "FINISHING", label: "Finishing (Tiles, Paint, Putty, False Ceiling)" },
  { value: "MEP", label: "MEP (Pipes, Fittings, Cables, Conduits)" },
  { value: "WATERPROOFING", label: "Waterproofing & Chemicals (Admixtures, Sealants)" },
  { value: "SAFETY", label: "Safety Equipment & PPE (Helmets, Harness, Boots)" },
  { value: "TOOLS", label: "Tools & Hardware (Binding Wire, Spacers, Nails)" },
  { value: "CONSUMABLE", label: "General Consumables & Site Supplies" },
  { value: "OTHER", label: "Other Materials" },
];

const UNITS: { value: MaterialUnit; label: string }[] = [
  { value: "BAG", label: "Bags (BAG)" },
  { value: "KG", label: "Kilograms (KG)" },
  { value: "TON", label: "Metric Tons (TON)" },
  { value: "M3", label: "Cubic Meters (M³)" },
  { value: "M2", label: "Square Meters (M²)" },
  { value: "CFT", label: "Cubic Feet (CFT)" },
  { value: "RUNNING_METER", label: "Running Meters (RMT)" },
  { value: "PIECE", label: "Pieces (PIECE)" },
  { value: "BUNDLE", label: "Bundles (BUNDLE)" },
  { value: "LITER", label: "Liters (LITER)" },
  { value: "BOX", label: "Boxes (BOX)" },
  { value: "SET", label: "Sets (SET)" },
  { value: "NO", label: "Numbers (NO)" },
  { value: "NOS", label: "Numbers (NOS)" },
];

const CALC_ENGINES = [
  { value: "", label: "None (Direct Quantity Entry)" },
  { value: "calculate_masonry_materials", label: "Wall Masonry Engine (IS 2212 / IS 1077)" },
  { value: "calculate_concrete_materials", label: "Concrete RCC Engine (IS 456 M15-M30)" },
  { value: "calculate_rebar_steel", label: "TMT Rebar Steel Engine (IS 1786)" },
  { value: "calculate_plaster_materials", label: "Plastering Engine (12-20mm 1:3/1:4/1:6)" },
  { value: "calculate_flooring_materials", label: "Tiling & Flooring Engine" },
  { value: "calculate_paint_materials", label: "Painting & Primer Engine" },
];

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  materialToEdit,
}) => {
  const isEditing = Boolean(materialToEdit);

  const [name, setName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [category, setCategory] = useState<MaterialCategory>("CONSUMABLE");
  const [unit, setUnit] = useState<MaterialUnit>("BAG");
  const [standardRate, setStandardRate] = useState<string>("0.00");
  const [minStock, setMinStock] = useState<string>("0.000");
  const [maxStock, setMaxStock] = useState<string>("0.000");
  const [reorderLevel, setReorderLevel] = useState<string>("0.000");
  const [hsnSacCode, setHsnSacCode] = useState("");
  const [gstRate, setGstRate] = useState<string>("18.00");
  const [calcAlgoName, setCalcAlgoName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [brandApproved, setBrandApproved] = useState("");
  const [gradeSpec, setGradeSpec] = useState("");
  const [densityKgM3, setDensityKgM3] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (materialToEdit) {
      setName(materialToEdit.name || "");
      setItemCode(materialToEdit.item_code || "");
      setCategory(materialToEdit.category || "CONSUMABLE");
      setUnit(materialToEdit.unit || "BAG");
      setStandardRate(String(materialToEdit.standard_rate ?? "0.00"));
      setMinStock(String(materialToEdit.min_stock ?? "0.000"));
      setMaxStock(String(materialToEdit.max_stock ?? "0.000"));
      setReorderLevel(String(materialToEdit.reorder_level ?? "0.000"));
      setHsnSacCode(materialToEdit.hsn_sac_code || "");
      setGstRate(String(materialToEdit.gst_rate ?? "18.00"));
      setCalcAlgoName(materialToEdit.calc_algo_name || "");
      setIsActive(materialToEdit.is_active !== false);

      const spec = materialToEdit.material_spec || {};
      setBrandApproved(Array.isArray(spec.brand_approved) ? spec.brand_approved.join(", ") : spec.brand || "");
      setGradeSpec(spec.grade || "");
      setDensityKgM3(spec.density_kg_m3 ? String(spec.density_kg_m3) : "");
    } else {
      // Default blank values
      setName("");
      setItemCode("");
      setCategory("CONSUMABLE");
      setUnit("BAG");
      setStandardRate("0.00");
      setMinStock("10.000");
      setMaxStock("1000.000");
      setReorderLevel("25.000");
      setHsnSacCode("");
      setGstRate("18.00");
      setCalcAlgoName("");
      setIsActive(true);
      setBrandApproved("");
      setGradeSpec("");
      setDensityKgM3("");
    }
    setError(null);
  }, [materialToEdit, isOpen]);

  // Auto-generate item code suggestion if empty when creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !itemCode) {
      const prefix = category.substring(0, 3).toUpperCase();
      const cleanName = val
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 6)
        .toUpperCase();
      if (cleanName) {
        setItemCode(`MAT-${prefix}-${cleanName}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !itemCode.trim()) {
      setError("Please provide both Material Name and Item Code.");
      return;
    }

    setSaving(true);
    setError(null);

    const specPayload: Record<string, any> = {};
    if (brandApproved.trim()) {
      specPayload.brand_approved = brandApproved.split(",").map((b) => b.trim()).filter(Boolean);
    }
    if (gradeSpec.trim()) {
      specPayload.grade = gradeSpec.trim();
    }
    if (densityKgM3) {
      specPayload.density_kg_m3 = parseFloat(densityKgM3);
    }

    const payload: Partial<MasterMaterial> = {
      name: name.trim(),
      item_code: itemCode.trim().toUpperCase(),
      category,
      unit,
      standard_rate: parseFloat(standardRate) || 0,
      min_stock: parseFloat(minStock) || 0,
      max_stock: parseFloat(maxStock) || 0,
      reorder_level: parseFloat(reorderLevel) || 0,
      hsn_sac_code: hsnSacCode.trim(),
      gst_rate: parseFloat(gstRate) || 18,
      calc_algo_name: calcAlgoName,
      is_active: isActive,
      material_spec: specPayload,
    };

    try {
      let savedMat: MasterMaterial;
      if (isEditing && materialToEdit) {
        savedMat = await inventoryApi.updateMaterial(materialToEdit.id, payload);
      } else {
        savedMat = await inventoryApi.createMaterial(payload);
      }
      onSaved(savedMat);
      onClose();
    } catch (err: any) {
      console.error("Failed to save material", err);
      setError(err?.message || "Failed to save material. Ensure item code is unique.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isEditing ? "Edit Master Material" : "Add New Master Material to Catalog"}
              </h3>
              <p className="text-xs text-zinc-400">
                {isEditing
                  ? `Updating [${materialToEdit?.item_code}] ${materialToEdit?.name}`
                  : "Register a standardized construction item with units, rates, and calculation norms."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Basic Identifiers */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              1. Basic Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Material Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Pozzolana Portland Cement (PPC)"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Item Code / SKU <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="MAT-CEM-PPC"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full h-8 pl-8 pr-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-mono text-xs uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Unit of Measurement (UOM)</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as MaterialUnit)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Stock Control */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              2. Procurement Rates & Stock Levels
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Standard Rate (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="350.00"
                  value={standardRate}
                  onChange={(e) => setStandardRate(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Min Stock Level</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="10"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Max Stock Level</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="1000"
                  value={maxStock}
                  onChange={(e) => setMaxStock(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Reorder Threshold</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="25"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500 text-amber-400 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">HSN / SAC Code</label>
                <input
                  type="text"
                  placeholder="e.g. 252329"
                  value={hsnSacCode}
                  onChange={(e) => setHsnSacCode(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">GST Tax Rate (%)</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="0.00">0% Exempt</option>
                  <option value="5.00">5% Reduced</option>
                  <option value="12.00">12% Standard</option>
                  <option value="18.00">18% Standard Construction</option>
                  <option value="28.00">28% High Rate (Paints/Luxury)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Engineering Spec & Calculation Algorithm */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              3. Civil Engineering Norms & Specifications
            </h4>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Dynamic Calculation Engine</label>
              <select
                value={calcAlgoName}
                onChange={(e) => setCalcAlgoName(e.target.value)}
                className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500 font-medium text-blue-300"
              >
                {CALC_ENGINES.map((eng) => (
                  <option key={eng.value} value={eng.value}>
                    {eng.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Approved Brands</label>
                <input
                  type="text"
                  placeholder="e.g. UltraTech, ACC, Ambuja"
                  value={brandApproved}
                  onChange={(e) => setBrandApproved(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Technical Grade / Spec</label>
                <input
                  type="text"
                  placeholder="e.g. OPC 53, Fe-500D, Class 1"
                  value={gradeSpec}
                  onChange={(e) => setGradeSpec(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Bulk Density (kg/m³)</label>
                <input
                  type="number"
                  placeholder="e.g. 1440, 1600, 7850"
                  value={densityKgM3}
                  onChange={(e) => setDensityKgM3(e.target.value)}
                  className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0"
              />
              <label htmlFor="is_active" className="text-[11px] text-zinc-300 font-medium cursor-pointer">
                Material is Active in Procurement & Task BOM Catalogs
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? "Saving Material..." : isEditing ? "Update Material" : "Add Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
