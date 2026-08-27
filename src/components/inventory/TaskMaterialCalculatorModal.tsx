"use client";

import React, { useState, useEffect } from "react";
import {
  Calculator,
  CheckCircle2,
  Layers,
  AlertCircle,
  Sparkles,
  X,
  Plus,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileSpreadsheet,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import {
  MasterMaterial,
  WallOpening,
  MasonryCalculationResult,
} from "@/domains/inventory/types";
import {
  calculateMasonryMaterials,
  calculateConcreteMaterials,
  calculateRebarSteel,
  calculatePlasterMaterials,
  calculateFlooringMaterials,
  calculatePaintMaterials,
} from "@/domains/inventory/calc-engine";

interface TaskMaterialCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle?: string;
  onSaved?: () => void;
}

export const TaskMaterialCalculatorModal: React.FC<TaskMaterialCalculatorModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onSaved,
}) => {
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Calculation Inputs
  const [calcType, setCalcType] = useState<string>("masonry");
  const [lengthM, setLengthM] = useState<number>(10);
  const [heightM, setHeightM] = useState<number>(3);
  const [wallThicknessMm, setWallThicknessMm] = useState<number>(230);
  const [brickType, setBrickType] = useState<string>("standard_clay");
  const [mortarRatio, setMortarRatio] = useState<string>("1:6");
  const [mortarJointMm, setMortarJointMm] = useState<number>(10);
  const [dryVolumeFactor, setDryVolumeFactor] = useState<number>(1.33);
  const [sandType, setSandType] = useState<string>("river_sand");
  const [sandDensityKgM3, setSandDensityKgM3] = useState<number>(1600);
  const [cementBagSizeKg, setCementBagSizeKg] = useState<number>(50);

  // Separate Wastages
  const [wastagePercent, setWastagePercent] = useState<number>(5.0);
  const [wastageBrick, setWastageBrick] = useState<number>(5.0);
  const [wastageCement, setWastageCement] = useState<number>(3.0);
  const [wastageSand, setWastageSand] = useState<number>(5.0);
  const [wastageAdhesive, setWastageAdhesive] = useState<number>(5.0);

  // Openings List
  const [openings, setOpenings] = useState<WallOpening[]>([
    { id: "1", name: "Door D1", type: "door", width: 1.0, height: 2.1, qty: 1, sill_height: 0.0 },
    { id: "2", name: "Window W1", type: "window", width: 1.2, height: 1.2, qty: 2, sill_height: 0.9 },
  ]);

  // Non-Masonry Inputs
  const [concreteVolM3, setConcreteVolM3] = useState<number>(10);
  const [concreteGrade, setConcreteGrade] = useState<string>("M20");
  const [steelMember, setSteelMember] = useState<string>("beam");
  const [tileSize, setTileSize] = useState<string>("600x600");
  const [plasterType, setPlasterType] = useState<string>("internal_12mm_1:6");

  // Dynamic Calculation Results
  const [masonryResult, setMasonryResult] = useState<MasonryCalculationResult | null>(null);
  const [otherCalcResult, setOtherCalcResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadMaterials();
    }
  }, [isOpen]);

  const loadMaterials = async () => {
    try {
      const data = await inventoryApi.getMaterials();
      setMaterials(data);
      if (data.length > 0 && !selectedMaterialId) {
        setSelectedMaterialId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load master materials", err);
    }
  };

  // Update Sand Density on Sand Type Change
  const handleSandTypeChange = (type: string) => {
    setSandType(type);
    if (type === "river_sand") setSandDensityKgM3(1600);
    else if (type === "m_sand") setSandDensityKgM3(1650);
    else if (type === "p_sand") setSandDensityKgM3(1550);
  };

  // Re-run Masonry & Other Calculations Reactively
  useEffect(() => {
    if (calcType === "masonry") {
      const res = calculateMasonryMaterials({
        lengthM,
        heightM,
        wallThicknessMm,
        brickType,
        mortarRatio,
        openings,
        mortarJointMm,
        dryVolumeFactor,
        sandDensityKgM3,
        cementBagSizeKg,
        wastagePercent,
        wastageBrick,
        wastageCement,
        wastageSand,
        wastageAdhesive,
        calcLintel: true,
      });
      setMasonryResult(res);
    } else if (calcType === "concrete") {
      const res = calculateConcreteMaterials(concreteVolM3, concreteGrade, wastagePercent);
      setOtherCalcResult(res);
    } else if (calcType === "steel") {
      const res = calculateRebarSteel(concreteVolM3, steelMember, wastagePercent);
      setOtherCalcResult(res);
    } else if (calcType === "plaster") {
      const area = lengthM * heightM;
      const res = calculatePlasterMaterials(area, plasterType, wastagePercent);
      setOtherCalcResult(res);
    } else if (calcType === "flooring") {
      const area = lengthM * heightM;
      const res = calculateFlooringMaterials(area, tileSize, "adhesive", 100, wastagePercent);
      setOtherCalcResult(res);
    } else if (calcType === "paint") {
      const area = lengthM * heightM;
      const res = calculatePaintMaterials(area, "interior_emulsion");
      setOtherCalcResult(res);
    }
  }, [
    calcType,
    lengthM,
    heightM,
    wallThicknessMm,
    brickType,
    mortarRatio,
    mortarJointMm,
    dryVolumeFactor,
    sandDensityKgM3,
    cementBagSizeKg,
    wastagePercent,
    wastageBrick,
    wastageCement,
    wastageSand,
    wastageAdhesive,
    openings,
    concreteVolM3,
    concreteGrade,
    steelMember,
    tileSize,
    plasterType,
  ]);

  // Auto-select corresponding material when work type changes
  useEffect(() => {
    if (materials.length === 0) return;
    let match = null;
    if (calcType === "masonry") {
      match = materials.find(
        (m) =>
          m.item_code.includes("BRK") ||
          m.item_code.includes("AAC") ||
          m.category === "MASONRY"
      );
    } else if (calcType === "concrete") {
      match = materials.find((m) => m.item_code.includes("CEM") || m.item_code.includes("AGG"));
    } else if (calcType === "steel") {
      match = materials.find((m) => m.item_code.includes("STL") || m.category === "STRUCTURAL");
    } else if (calcType === "plaster") {
      match = materials.find((m) => m.item_code.includes("SAND-PLASTER") || m.item_code.includes("CEM"));
    } else if (calcType === "flooring") {
      match = materials.find((m) => m.item_code.includes("TILE") || m.category === "FINISHING");
    } else if (calcType === "paint") {
      match = materials.find((m) => m.item_code.includes("PNT"));
    }
    if (match) {
      setSelectedMaterialId(match.id);
    }
  }, [calcType, materials]);

  // Openings Management Handlers
  const handleAddOpening = () => {
    const newId = String(Date.now());
    setOpenings([
      ...openings,
      {
        id: newId,
        name: `Opening #${openings.length + 1}`,
        type: "window",
        width: 1.2,
        height: 1.2,
        qty: 1,
        sill_height: 0.9,
      },
    ]);
  };

  const handleUpdateOpening = (index: number, field: keyof WallOpening, value: any) => {
    const updated = [...openings];
    updated[index] = { ...updated[index], [field]: value };
    setOpenings(updated);
  };

  const handleDeleteOpening = (index: number) => {
    setOpenings(openings.filter((_, i) => i !== index));
  };

  // Selected Material Details & Rate Multiplication
  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
  const plannedQuantity =
    calcType === "masonry"
      ? masonryResult?.units_required || 0
      : otherCalcResult?.units_required ||
        otherCalcResult?.cement_bags_50kg ||
        otherCalcResult?.total_steel_kg ||
        otherCalcResult?.tile_boxes_required ||
        otherCalcResult?.paint_liters ||
        0;

  const standardRate = selectedMaterial ? Number(selectedMaterial.standard_rate) || 0 : 0;
  const estimatedCost = plannedQuantity * standardRate;

  // Save to Backend Task Requirement (BOM)
  const handleSaveToTask = async () => {
    if (!selectedMaterialId) return;
    setSaving(true);
    try {
      let inputQty = lengthM * heightM;
      let inputUnit = "M2";
      let calcParams: Record<string, any> = {
        calc_type: calcType,
        calc_rule_version: "2.0.0",
        wastage_percent: wastagePercent,
      };

      if (calcType === "masonry") {
        inputQty = masonryResult?.wall_geometry.net_wall_area_m2 || lengthM * heightM;
        inputUnit = "M2";
        calcParams = {
          algo_name: "calculate_masonry_materials",
          length_m: lengthM,
          height_m: heightM,
          wall_thickness_mm: wallThicknessMm,
          brick_type: brickType,
          mortar_ratio: mortarRatio,
          mortar_joint_mm: mortarJointMm,
          dry_volume_factor: dryVolumeFactor,
          sand_density_kg_m3: sandDensityKgM3,
          cement_bag_size_kg: cementBagSizeKg,
          wastage_percent: wastagePercent,
          wastage_brick: wastageBrick,
          wastage_cement: wastageCement,
          wastage_sand: wastageSand,
          wastage_adhesive: wastageAdhesive,
          openings,
          calculation_result: masonryResult,
          calculation_breakdown: masonryResult?.calculation_breakdown,
          bom_items: masonryResult?.bom_items,
        };
      } else if (calcType === "concrete") {
        inputQty = concreteVolM3;
        inputUnit = "M3";
        calcParams = { grade: concreteGrade, wastage_percent: wastagePercent, algo_name: "calculate_concrete_materials" };
      } else if (calcType === "steel") {
        inputQty = concreteVolM3;
        inputUnit = "M3";
        calcParams = { member_type: steelMember, wastage_percent: wastagePercent, algo_name: "calculate_rebar_steel" };
      } else if (calcType === "plaster") {
        inputQty = lengthM * heightM;
        inputUnit = "M2";
        calcParams = { plaster_type: plasterType, wastage_percent: wastagePercent, algo_name: "calculate_plaster_materials" };
      } else if (calcType === "flooring") {
        inputQty = lengthM * heightM;
        inputUnit = "M2";
        calcParams = { tile_size_mm: tileSize, method: "adhesive", wastage_percent: wastagePercent, algo_name: "calculate_flooring_materials" };
      }

      await inventoryApi.calculateAndAttachTaskMaterial({
        task_id: taskId,
        material_id: selectedMaterialId,
        input_quantity: inputQty,
        input_unit: inputUnit,
        calc_params: calcParams,
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to attach material requirement to task", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Civil Engineering Construction Estimation Engine
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  IS 2212 / IS 1077
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Target: <span className="font-semibold text-zinc-200">Task #{taskId}</span> — {taskTitle || "Active Project Task"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trade Selector Tabs */}
        <div>
          <label className="text-xs font-semibold text-zinc-300">Construction Work Package / Trade</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1.5">
            {[
              { id: "masonry", label: "🧱 Masonry", desc: "Bricks & AAC" },
              { id: "concrete", label: "🏗️ Concrete", desc: "RCC Design Mix" },
              { id: "steel", label: "🔩 Rebar Steel", desc: "TMT Rebars" },
              { id: "plaster", label: "🪜 Plastering", desc: "Mortar 12-20mm" },
              { id: "flooring", label: "📐 Tiling", desc: "Vitrified / Tile" },
              { id: "paint", label: "🎨 Painting", desc: "Primer & Putty" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCalcType(t.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-all ${
                  calcType === t.id
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <span>{t.label}</span>
                <span className="text-[10px] opacity-75">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── MASONRY SPECIFIC UI ──────────────────────────────────────────────── */}
        {calcType === "masonry" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Top Toolbar for Advanced Settings */}
            <div className="flex items-center justify-between p-2 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Single Wall Estimation & Live BOM
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 transition-colors"
              >
                <Sliders className="w-3 h-3 text-blue-400" />
                {showAdvancedSettings ? "Hide Assumptions" : "Engineering Assumptions"}
              </button>
            </div>

            {/* Advanced Engineering Assumptions Panel */}
            {showAdvancedSettings && (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 text-xs animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    Civil Engineering Material & Mortar Assumptions
                  </span>
                  <span className="text-[10px] text-zinc-500">IS 2212 / IS 1077</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Mortar Joint Thickness</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        value={mortarJointMm}
                        onChange={(e) => setMortarJointMm(parseFloat(e.target.value) || 10)}
                        className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-xs"
                      />
                      <span className="text-zinc-500 text-xs">mm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Dry Mortar Factor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={dryVolumeFactor}
                      onChange={(e) => setDryVolumeFactor(parseFloat(e.target.value) || 1.33)}
                      className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Sand Type & Density</label>
                    <select
                      value={sandType}
                      onChange={(e) => handleSandTypeChange(e.target.value)}
                      className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-xs"
                    >
                      <option value="river_sand">River Sand (1600 kg/m³)</option>
                      <option value="m_sand">M-Sand (1650 kg/m³)</option>
                      <option value="p_sand">P-Sand (1550 kg/m³)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Cement Bag Packaging</label>
                    <select
                      value={cementBagSizeKg}
                      onChange={(e) => setCementBagSizeKg(parseFloat(e.target.value) || 50)}
                      className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-xs"
                    >
                      <option value={50}>50 kg Standard Bag</option>
                      <option value={25}>25 kg Small Bag</option>
                    </select>
                  </div>
                </div>
                {/* Independent Wastage Rates */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <span className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                    Independent Material Wastage Rates (%)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400">Brick / Block Waste %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={wastageBrick}
                        onChange={(e) => setWastageBrick(parseFloat(e.target.value) || 0)}
                        className="w-full h-7 px-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Cement Waste %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={wastageCement}
                        onChange={(e) => setWastageCement(parseFloat(e.target.value) || 0)}
                        className="w-full h-7 px-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Sand Waste %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={wastageSand}
                        onChange={(e) => setWastageSand(parseFloat(e.target.value) || 0)}
                        className="w-full h-7 px-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">AAC Adhesive Waste %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={wastageAdhesive}
                        onChange={(e) => setWastageAdhesive(parseFloat(e.target.value) || 0)}
                        className="w-full h-7 px-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wall Dimensions & Masonry Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
              {/* Left Column: Dimensions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  1. Wall Geometry
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Length (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={lengthM}
                      onChange={(e) => setLengthM(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Height (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={heightM}
                      onChange={(e) => setHeightM(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                    />
                  </div>
                </div>
                {/* Wall Thickness Selector */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Wall Thickness</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[100, 115, 150, 200, 230].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setWallThicknessMm(th)}
                        className={`h-7 rounded text-[11px] font-semibold border transition-all ${
                          wallThicknessMm === th
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        {th}mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Masonry Unit & Mortar */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  2. Masonry Unit & Mortar Mix
                </h4>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Brick / Block Type</label>
                  <select
                    value={brickType}
                    onChange={(e) => setBrickType(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="standard_clay">Modular Red Clay Brick (190x90x90mm)</option>
                    <option value="traditional_clay">Traditional Clay Brick (230x115x75mm)</option>
                    <option value="aac_block_200">AAC Block 200mm (600x200x200mm)</option>
                    <option value="aac_block_150">AAC Block 150mm (600x150x200mm)</option>
                    <option value="aac_block_100">AAC Block 100mm (600x100x200mm)</option>
                    <option value="fly_ash">Fly Ash Brick (230x110x75mm)</option>
                    <option value="solid_concrete_block">Solid Concrete Block (400x200x200mm)</option>
                  </select>
                </div>
                {!brickType.includes("aac") ? (
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Mortar Mix Ratio</label>
                    <select
                      value={mortarRatio}
                      onChange={(e) => setMortarRatio(e.target.value)}
                      className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                    >
                      <option value="1:6">1:6 (Standard 230mm Masonry - 1 Cement : 6 Sand)</option>
                      <option value="1:4">1:4 (115mm Partition Wall / Rich Mortar)</option>
                      <option value="1:3">1:3 (High-Strength / Foundation Mortar)</option>
                    </select>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                    ✨ AAC Blocks use thin-bed polymer adhesive (3.5 kg/m²). No site cement mortar needed.
                  </div>
                )}
              </div>
            </div>

            {/* Validation Warnings Alert */}
            {masonryResult?.warnings && masonryResult.warnings.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <div>{masonryResult.warnings.join(" ")}</div>
              </div>
            )}

            {/* Multiple Openings Manager (Doors / Windows / Vents) */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    3. Wall Openings Deduction
                    <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      Total Deduction: {masonryResult?.wall_geometry.total_opening_area_m2 || 0} m²
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Doors, windows, and vents are subtracted to calculate accurate net masonry volume.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOpening}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-blue-400 border border-zinc-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Opening
                </button>
              </div>

              {openings.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  No openings added. Gross wall volume is used.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-zinc-400 uppercase px-2">
                    <div className="col-span-3">Opening Name / Type</div>
                    <div className="col-span-2">Width (m)</div>
                    <div className="col-span-2">Height (m)</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Total Area</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>
                  {openings.map((op, idx) => (
                    <div
                      key={op.id || idx}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs"
                    >
                      <div className="col-span-3 flex items-center gap-1.5">
                        <select
                          value={op.type}
                          onChange={(e) => handleUpdateOpening(idx, "type", e.target.value)}
                          className="h-7 px-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-200"
                        >
                          <option value="door">🚪 Door</option>
                          <option value="window">🪟 Window</option>
                          <option value="ventilator">💨 Vent</option>
                          <option value="other">📦 Other</option>
                        </select>
                        <input
                          type="text"
                          value={op.name || ""}
                          placeholder="e.g. D1"
                          onChange={(e) => handleUpdateOpening(idx, "name", e.target.value)}
                          className="h-7 w-full px-2 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-100"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.1"
                          value={op.width}
                          onChange={(e) =>
                            handleUpdateOpening(idx, "width", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 w-full px-2 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-100"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.1"
                          value={op.height}
                          onChange={(e) =>
                            handleUpdateOpening(idx, "height", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 w-full px-2 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-100"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="1"
                          value={op.qty}
                          onChange={(e) =>
                            handleUpdateOpening(idx, "qty", parseInt(e.target.value) || 1)
                          }
                          className="h-7 w-full px-2 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-100"
                        />
                      </div>
                      <div className="col-span-2 text-xs font-semibold text-zinc-300">
                        {(op.width * op.height * op.qty).toFixed(2)} m²
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteOpening(idx)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Real-time Calculated Bill of Materials (BOM) Cards */}
            {masonryResult && (
              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-blue-950/40 via-zinc-900 to-zinc-950 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                    <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                      4. Calculated Bill of Materials (BOM Output)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAuditDetails(!showAuditDetails)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    {showAuditDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showAuditDetails ? "Hide Audit Derivations" : "View Calculation Details"}
                  </button>
                </div>

                {/* BOM Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Masonry Units</span>
                    <div className="text-base font-extrabold text-white">
                      {masonryResult.units_required.toLocaleString()} <span className="text-xs font-medium text-zinc-400">Nos</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">
                      Base: {masonryResult.theoretical_units} + {wastageBrick}% waste
                    </p>
                  </div>

                  {!brickType.includes("aac") ? (
                    <>
                      <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Cement Required</span>
                        <div className="text-base font-extrabold text-white">
                          {masonryResult.cement_bags_50kg} <span className="text-xs font-medium text-zinc-400">Bags</span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          {masonryResult.cement_kg} kg ({cementBagSizeKg}kg bags)
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Sand Volume & Weight</span>
                        <div className="text-base font-extrabold text-white">
                          {masonryResult.sand_tons} <span className="text-xs font-medium text-zinc-400">MT</span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          {masonryResult.sand_cft} CFT ({masonryResult.sand_m3} m³)
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">AAC Polymer Adhesive</span>
                      <div className="text-base font-extrabold text-white">
                        {masonryResult.adhesive_bags_40kg} <span className="text-xs font-medium text-zinc-400">Bags</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        {masonryResult.block_adhesive_kg} kg (40kg bag)
                      </p>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Lintel Concrete</span>
                    <div className="text-base font-extrabold text-white">
                      {masonryResult.lintel_concrete_volume_m3 || 0} <span className="text-xs font-medium text-zinc-400">m³</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">For opening lintels</p>
                  </div>
                </div>

                {/* Audit Trail Derivations (15-point step breakdown) */}
                {showAuditDetails && (
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs animate-in slide-in-from-top-2">
                    <h5 className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                      Step-by-Step Civil Engineering Audit Trail
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-zinc-300">
                      {Object.entries(masonryResult.calculation_breakdown || {}).map(([k, v]) => (
                        <div key={k} className="p-1.5 rounded bg-zinc-900/50 border border-zinc-800/50">
                          <span className="text-zinc-500 capitalize">{k.replace(/_/g, " ")}: </span>
                          <span className="font-mono text-zinc-200 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── NON-MASONRY TRADES (Concrete, Steel, Plaster, Flooring, Paint) ──── */}
        {calcType !== "masonry" && (
          <div className="space-y-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
            {calcType === "concrete" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Concrete Volume (m³)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={concreteVolM3}
                    onChange={(e) => setConcreteVolM3(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Concrete Grade</label>
                  <select
                    value={concreteGrade}
                    onChange={(e) => setConcreteGrade(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="M15">M15 (1:2:4)</option>
                    <option value="M20">M20 (1:1.5:3 - Standard RCC)</option>
                    <option value="M25">M25 (1:1:2 - Heavy Structural)</option>
                    <option value="M30">M30 (Design Mix)</option>
                  </select>
                </div>
              </div>
            )}

            {calcType === "steel" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Concrete Volume (m³)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={concreteVolM3}
                    onChange={(e) => setConcreteVolM3(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Structural Member</label>
                  <select
                    value={steelMember}
                    onChange={(e) => setSteelMember(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="beam">Beam (120 kg/m³)</option>
                    <option value="column">Column (160 kg/m³)</option>
                    <option value="slab">Slab (90 kg/m³)</option>
                    <option value="footing">Footing (80 kg/m³)</option>
                  </select>
                </div>
              </div>
            )}

            {calcType === "plaster" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Wall Area (m²)</label>
                  <input
                    type="number"
                    step="1"
                    value={lengthM * heightM}
                    onChange={(e) => setLengthM(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Plaster Spec</label>
                  <select
                    value={plasterType}
                    onChange={(e) => setPlasterType(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="internal_12mm_1:6">12mm Internal Plaster (1:6)</option>
                    <option value="external_15mm_1:4">15mm External Plaster (1:4)</option>
                    <option value="ceiling_6mm_1:3">6mm Ceiling Plaster (1:3)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Output Card */}
            {otherCalcResult && (
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs space-y-1 font-medium text-zinc-200">
                <span className="font-bold text-blue-300">BOM Output:</span> {otherCalcResult.summary}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION G & H: INVENTORY CATALOG LINKING & LIVE ESTIMATED COST ── */}
        <div className="space-y-3 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Link Master Material from Inventory Catalog
            </label>
            <span className="text-[11px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit">
              Attached to Task #{taskId}
            </span>
          </div>
          <select
            value={selectedMaterialId}
            onChange={(e) => setSelectedMaterialId(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.item_code}] {m.name} ({m.unit}) — ₹{Number(m.standard_rate).toFixed(2)}/unit
              </option>
            ))}
          </select>

          {/* Rate Engine & Cost Estimation Card */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">
                Material Rate & Cost Linkage
              </span>
              <div className="text-xs text-zinc-300">
                {plannedQuantity.toLocaleString()} {selectedMaterial?.unit || "units"} × ₹
                {standardRate.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Estimated Budget Cost</span>
              <div className="text-base font-extrabold text-emerald-400">
                ₹{estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
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
            type="button"
            onClick={handleSaveToTask}
            disabled={saving || !selectedMaterialId}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {saving ? "Saving BOM..." : "Save to Task BOM"}
          </button>
        </div>
      </div>
    </div>
  );
};
