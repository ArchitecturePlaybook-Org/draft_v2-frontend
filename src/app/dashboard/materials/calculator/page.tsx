"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calculator,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Printer,
  ChevronRight,
  Info,
  CheckCircle2,
  ArrowRight,
  Building,
  Sliders,
  DollarSign,
  Package,
} from "lucide-react";
import {
  calculateMasonryMaterials,
  calculateConcreteMaterials,
  calculateRebarSteel,
  calculatePlasterMaterials,
  calculateFlooringMaterials,
  calculatePaintMaterials,
} from "@/domains/inventory/calc-engine";
import { WallOpening } from "@/domains/inventory/types";

export default function AdvancedMaterialCalcEnginePage() {
  const [activeTrade, setActiveTrade] = useState<
    "masonry" | "concrete" | "steel" | "plaster" | "flooring" | "paint"
  >("masonry");

  // 1. Wall Masonry States
  const [wallLength, setWallLength] = useState<number>(10.0);
  const [wallHeight, setWallHeight] = useState<number>(3.0);
  const [wallThicknessMm, setWallThicknessMm] = useState<number>(230);
  const [brickType, setBrickType] = useState<string>("standard_clay");
  const [mortarRatio, setMortarRatio] = useState<string>("1:6");
  const [masonryWastage, setMasonryWastage] = useState<number>(5.0);
  const [openings, setOpenings] = useState<WallOpening[]>([
    { name: "Main Door", type: "door", width: 1.0, height: 2.1, qty: 1 },
    { name: "Window W1", type: "window", width: 1.2, height: 1.5, qty: 2 },
  ]);

  // 2. Concrete RCC States
  const [concreteVol, setConcreteVol] = useState<number>(15.0);
  const [concreteGrade, setConcreteGrade] = useState<string>("M20");
  const [concreteWastage, setConcreteWastage] = useState<number>(3.0);

  // 3. Rebar Steel States
  const [steelRccVol, setSteelRccVol] = useState<number>(15.0);
  const [steelMember, setSteelMember] = useState<string>("beam");
  const [steelWastage, setSteelWastage] = useState<number>(4.0);

  // 4. Plastering States
  const [plasterArea, setPlasterArea] = useState<number>(100.0);
  const [plasterType, setPlasterType] = useState<string>("internal_12mm_1:6");
  const [plasterWastage, setPlasterWastage] = useState<number>(8.0);

  // 5. Flooring & Tiles States
  const [flooringArea, setFlooringArea] = useState<number>(80.0);
  const [tileSize, setTileSize] = useState<string>("600x600");
  const [fixingMethod, setFixingMethod] = useState<"mortar" | "adhesive">("adhesive");
  const [flooringWastage, setFlooringWastage] = useState<number>(8.0);

  // 6. Painting States
  const [paintArea, setPaintArea] = useState<number>(150.0);
  const [paintSystem, setPaintSystem] = useState<string>("interior_emulsion");

  // Output Result
  const [calcResult, setCalcResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Openings calculation
  const totalOpeningsArea = openings.reduce(
    (acc, o) => acc + (o.width || 0) * (o.height || 0) * (o.qty || 1),
    0
  );

  const addOpening = () => {
    setOpenings((prev) => [
      ...prev,
      { name: `Opening ${prev.length + 1}`, type: "window", width: 1.2, height: 1.2, qty: 1 },
    ]);
  };

  const removeOpening = (index: number) => {
    setOpenings((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOpening = (index: number, field: keyof WallOpening, val: any) => {
    setOpenings((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [field]: val } : o))
    );
  };

  // Re-calculate on any change
  useEffect(() => {
    if (activeTrade === "masonry") {
      setCalcResult(
        calculateMasonryMaterials(
          wallLength,
          wallHeight,
          wallThicknessMm,
          brickType,
          mortarRatio,
          totalOpeningsArea,
          masonryWastage
        )
      );
    } else if (activeTrade === "concrete") {
      setCalcResult(calculateConcreteMaterials(concreteVol, concreteGrade, concreteWastage));
    } else if (activeTrade === "steel") {
      setCalcResult(calculateRebarSteel(steelRccVol, steelMember, steelWastage));
    } else if (activeTrade === "plaster") {
      setCalcResult(calculatePlasterMaterials(plasterArea, plasterType, plasterWastage));
    } else if (activeTrade === "flooring") {
      setCalcResult(
        calculateFlooringMaterials(
          flooringArea,
          tileSize,
          fixingMethod,
          100,
          flooringWastage
        )
      );
    } else if (activeTrade === "paint") {
      setCalcResult(calculatePaintMaterials(paintArea, paintSystem));
    }
  }, [
    activeTrade,
    wallLength,
    wallHeight,
    wallThicknessMm,
    brickType,
    mortarRatio,
    totalOpeningsArea,
    masonryWastage,
    concreteVol,
    concreteGrade,
    concreteWastage,
    steelRccVol,
    steelMember,
    steelWastage,
    plasterArea,
    plasterType,
    plasterWastage,
    flooringArea,
    tileSize,
    fixingMethod,
    flooringWastage,
    paintArea,
    paintSystem,
  ]);

  const handleCopyBOM = () => {
    if (!calcResult) return;
    const lines = [
      `--- CIVIL ESTIMATION BOM: ${activeTrade.toUpperCase()} ---`,
      `Summary: ${calcResult.summary}`,
      `Estimated Cost: ₹${calcResult.total_estimated_cost?.toLocaleString("en-IN") || "0"}`,
      "",
      "ITEMIZED BILL OF MATERIALS:",
      ...calcResult.bom.map(
        (b: any) =>
          `- [${b.item_code}] ${b.name}: ${b.quantity} ${b.unit} @ ₹${b.rate}/unit = ₹${b.amount}`
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Civil Engineering Calculation Engine
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v2.0.0 Pro
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Auditable, IS-compliant construction material estimators with real-time Bill of Materials (BOM) generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/materials"
            className="h-9 px-3.5 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Back to Master Catalog
          </Link>
          <button
            type="button"
            onClick={handleCopyBOM}
            className="h-9 px-3.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                Copied BOM!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy BOM Breakdown
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trade Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { id: "masonry", label: "🧱 Wall Masonry", spec: "IS 2212 / IS 1077" },
          { id: "concrete", label: "🏗️ Concrete RCC", spec: "IS 456:2000" },
          { id: "steel", label: "🔩 Rebar Steel", spec: "IS 1786 / SP 34" },
          { id: "plaster", label: "🪜 Plastering", spec: "IS 1661 / IS 2402" },
          { id: "flooring", label: "📐 Flooring & Tiles", spec: "IS 1443 / Tile Fix" },
          { id: "paint", label: "🎨 Paint & Primer", spec: "IS 2395 Specification" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTrade(t.id as any)}
            className={`p-3 rounded-xl text-left border transition-all ${
              activeTrade === t.id
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800/90"
            }`}
          >
            <div className="font-bold text-xs">{t.label}</div>
            <div
              className={`text-[10px] mt-0.5 font-mono ${
                activeTrade === t.id ? "text-blue-100" : "text-zinc-500"
              }`}
            >
              {t.spec}
            </div>
          </button>
        ))}
      </div>

      {/* Main Calculation Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Engineering Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Trade Parameters & Geometry
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Dynamic Inputs</span>
            </div>

            {/* 1. MASONRY CONTROLS */}
            {activeTrade === "masonry" && (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                      Wall Length (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={wallLength}
                      onChange={(e) => setWallLength(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                      Wall Height (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={wallHeight}
                      onChange={(e) => setWallHeight(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                      Wall Thickness
                    </label>
                    <select
                      value={wallThicknessMm}
                      onChange={(e) => setWallThicknessMm(parseInt(e.target.value) || 230)}
                      className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value={100}>100mm (4" Partition)</option>
                      <option value={115}>115mm (4.5" Single Brick)</option>
                      <option value={150}>150mm (6" AAC / Solid Block)</option>
                      <option value={200}>200mm (8" Heavy Block)</option>
                      <option value={230}>230mm (9" Double Brick Wall)</option>
                      <option value={300}>300mm (12" Foundation Wall)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                      Brick / Block Type
                    </label>
                    <select
                      value={brickType}
                      onChange={(e) => setBrickType(e.target.value)}
                      className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value="standard_clay">Modular Red Clay (190x90x90)</option>
                      <option value="traditional_clay">Traditional Clay (230x115x75)</option>
                      <option value="aac_block_100">AAC Block 100mm (600x200x100)</option>
                      <option value="aac_block_150">AAC Block 150mm (600x200x150)</option>
                      <option value="aac_block_200">AAC Block 200mm (600x200x200)</option>
                      <option value="fly_ash_brick">Fly Ash Brick (230x110x70)</option>
                      <option value="solid_concrete_block">Solid Concrete Block (400x200x200)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                      Mortar Mix Ratio
                    </label>
                    <select
                      value={mortarRatio}
                      onChange={(e) => setMortarRatio(e.target.value)}
                      className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value="1:6">1:6 (Standard Masonry)</option>
                      <option value="1:5">1:5 (Medium Masonry)</option>
                      <option value="1:4">1:4 (Partition Wall)</option>
                      <option value="1:3">1:3 (Rich Water-tight)</option>
                      <option value="adhesive">Polymer Adhesive (3mm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                      Material Wastage %
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={masonryWastage}
                      onChange={(e) => setMasonryWastage(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                {/* Openings Section */}
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300">
                      Wall Openings & Cutouts ({openings.length})
                    </span>
                    <button
                      type="button"
                      onClick={addOpening}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5" /> Add Opening
                    </button>
                  </div>

                  {openings.map((op, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-1.5 items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-[11px]"
                    >
                      <input
                        className="col-span-4 h-7 px-1.5 bg-zinc-900 border border-zinc-700 rounded text-white text-[10px]"
                        value={op.name || ""}
                        onChange={(e) => updateOpening(idx, "name", e.target.value)}
                        placeholder="e.g. Door"
                      />
                      <input
                        type="number"
                        step="0.1"
                        className="col-span-2 h-7 px-1 bg-zinc-900 border border-zinc-700 rounded text-white font-mono text-[10px]"
                        value={op.width}
                        onChange={(e) => updateOpening(idx, "width", parseFloat(e.target.value) || 0)}
                        placeholder="W(m)"
                        title="Width in meters"
                      />
                      <input
                        type="number"
                        step="0.1"
                        className="col-span-2 h-7 px-1 bg-zinc-900 border border-zinc-700 rounded text-white font-mono text-[10px]"
                        value={op.height}
                        onChange={(e) => updateOpening(idx, "height", parseFloat(e.target.value) || 0)}
                        placeholder="H(m)"
                        title="Height in meters"
                      />
                      <input
                        type="number"
                        step="1"
                        className="col-span-2 h-7 px-1 bg-zinc-900 border border-zinc-700 rounded text-white font-mono text-[10px]"
                        value={op.qty}
                        onChange={(e) => updateOpening(idx, "qty", parseInt(e.target.value) || 1)}
                        placeholder="Qty"
                        title="Count"
                      />
                      <button
                        type="button"
                        onClick={() => removeOpening(idx)}
                        className="col-span-2 text-zinc-500 hover:text-red-400 p-1 flex justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. CONCRETE CONTROLS */}
            {activeTrade === "concrete" && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Wet Concrete Volume (m³)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={concreteVol}
                    onChange={(e) => setConcreteVol(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Grade of Concrete (IS 456)
                  </label>
                  <select
                    value={concreteGrade}
                    onChange={(e) => setConcreteGrade(e.target.value)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="M10">M10 (1:3:6 - Lean Concrete / Flooring Base)</option>
                    <option value="M15">M15 (1:2:4 - Plain Cement Concrete / Levelling)</option>
                    <option value="M20">M20 (1:1.5:3 - Standard Residential RCC)</option>
                    <option value="M25">M25 (1:1:2 - Commercial Heavy RCC)</option>
                    <option value="M30">M30 (Design Mix / Infrastructure Grade)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Handling Wastage %
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={concreteWastage}
                    onChange={(e) => setConcreteWastage(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* 3. STEEL CONTROLS */}
            {activeTrade === "steel" && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    RCC Concrete Volume (m³)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={steelRccVol}
                    onChange={(e) => setSteelRccVol(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Structural Member Type
                  </label>
                  <select
                    value={steelMember}
                    onChange={(e) => setSteelMember(e.target.value)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="footing">Isolated / Strip Footing (80 kg/m³)</option>
                    <option value="column">RCC Columns (160 kg/m³)</option>
                    <option value="beam">RCC Beams / Lintels (120 kg/m³)</option>
                    <option value="slab">RCC Floor / Roof Slabs (90 kg/m³)</option>
                    <option value="retaining_wall">Retaining Wall (110 kg/m³)</option>
                    <option value="raft">Raft Foundation (130 kg/m³)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Cutting & Lap Wastage %
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={steelWastage}
                    onChange={(e) => setSteelWastage(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* 4. PLASTER CONTROLS */}
            {activeTrade === "plaster" && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Plastering Surface Area (m²)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={plasterArea}
                    onChange={(e) => setPlasterArea(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Plaster Specification
                  </label>
                  <select
                    value={plasterType}
                    onChange={(e) => setPlasterType(e.target.value)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="internal_12mm_1:6">Internal Wall Plaster (12mm, 1:6)</option>
                    <option value="internal_12mm_1:4">Internal Ceiling / Rich (12mm, 1:4)</option>
                    <option value="external_15mm_1:5">External Rough Plaster (15mm, 1:5)</option>
                    <option value="external_20mm_1:4">External Double Coat Waterproof (20mm, 1:4)</option>
                    <option value="ceiling_6mm_1:3">Ceiling Direct Plaster (6mm, 1:3)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Mortar Wastage %
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={plasterWastage}
                    onChange={(e) => setPlasterWastage(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* 5. FLOORING CONTROLS */}
            {activeTrade === "flooring" && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Floor Area (m²)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={flooringArea}
                    onChange={(e) => setFlooringArea(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Tile Dimensions
                  </label>
                  <select
                    value={tileSize}
                    onChange={(e) => setTileSize(e.target.value)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="300x300">300x300mm (Ceramic / Bathroom)</option>
                    <option value="600x600">600x600mm (Double Charged Vitrified)</option>
                    <option value="800x800">800x800mm (Large Vitrified)</option>
                    <option value="1200x600">1200x600mm (Glazed Vitrified GVT)</option>
                    <option value="1200x1200">1200x1200mm (Slab Tile)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Fixing Medium
                  </label>
                  <select
                    value={fixingMethod}
                    onChange={(e) => setFixingMethod(e.target.value as any)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="adhesive">Polymer Tile Adhesive (Roff T02 / 20kg Bag)</option>
                    <option value="mortar">Cement Bedding Mortar (40mm 1:4 Mix)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 6. PAINT CONTROLS */}
            {activeTrade === "paint" && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Wall Surface Area (m²)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={paintArea}
                    onChange={(e) => setPaintArea(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Paint System
                  </label>
                  <select
                    value={paintSystem}
                    onChange={(e) => setPaintSystem(e.target.value)}
                    className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="interior_emulsion">
                      Interior (1 Coat Primer + 2 Coats Putty + 2 Coats Royale Emulsion)
                    </option>
                    <option value="exterior_weatherproof">
                      Exterior (1 Coat Exterior Primer + 2 Coats Apex Weatherproof)
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="font-bold text-zinc-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Civil Engineering Standard
            </div>
            <p>
              Calculated dynamically according to Indian Standard specifications. Dry mortar volume factor = 1.33, RCC wet-to-dry factor = 1.54, cement packaging = 50kg/bag.
            </p>
          </div>
        </div>

        {/* Right Column: Real-Time BOM Output & Audit Trail (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Summary & Cost Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-zinc-950 border border-blue-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Engineering Output
              </span>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block">Estimated Budget Cost</span>
                <span className="text-lg font-black text-emerald-400">
                  ₹{Number(calcResult?.total_estimated_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-sm font-semibold text-white leading-relaxed">
              {calcResult?.summary || "Calculating output..."}
            </p>
          </div>

          {/* Itemized BOM Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80 shadow-md">
            <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-200">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span>Generated Bill of Materials (BOM)</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-normal">
                {calcResult?.bom?.length || 0} Material SKUs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">SKU Code</th>
                    <th className="py-2.5 px-3">Material Name</th>
                    <th className="py-2.5 px-3">Required Qty</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-200 text-xs">
                  {calcResult?.bom?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-blue-400 font-bold">
                        {item.item_code}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">{item.name}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-300 font-mono">
                        {Number(item.quantity).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-zinc-400">{item.unit}</td>
                      <td className="py-2.5 px-3 text-zinc-300 font-mono">
                        ₹{Number(item.rate || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400 font-mono">
                        ₹{Number(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 15-Point Auditable Engineering Breakdown */}
          {calcResult?.breakdown && (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 text-xs">
              <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 font-bold text-zinc-300 flex items-center justify-between">
                <span>Auditable Calculation Basis & Step Breakdown</span>
                <span className="text-[10px] text-zinc-500 font-mono">IS Code Compliant</span>
              </div>
              <div className="p-3.5 space-y-1.5 text-zinc-300 font-mono text-[11px]">
                {Object.entries(calcResult.breakdown).map(([k, v]: any) => (
                  <div
                    key={k}
                    className="flex items-center justify-between py-1 border-b border-zinc-900 last:border-0"
                  >
                    <span className="text-zinc-400 capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="font-bold text-zinc-100">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
