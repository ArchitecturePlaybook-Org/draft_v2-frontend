"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTurnkeyStore } from "@/store/turnkey-store";
import { useEstimationStore } from "@/store/estimation-store";
import { TakeoffCanvas } from "@/components/estimation/TakeoffCanvas";
import { calculateCompositeBOQ } from "@/domains/boq/engine";
import { DEFAULT_STAGE_SCOPES } from "@/domains/boq/types";
import { mergeShellAndRooms } from "@/domains/boq/turnkey-merger";
import { 
  Building2, 
  Layers, 
  Ruler, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Box, 
  ChevronRight, 
  ShieldCheck, 
  FastForward,
  Info
} from "lucide-react";

export function Stage2ShellExtractor() {
  const { 
    imageUrl, 
    pixelToMeterScale, 
    footprintPoints, 
    footprintAreaM2, 
    footprintPerimeterM, 
    boundingLengthM, 
    boundingWidthM, 
    shellConfig, 
    setFootprint, 
    setShellConfig, 
    setShellBOQ, 
    setShellDone, 
    setFinalBOQ,
    goNext, 
    setStage 
  } = useTurnkeyStore();

  const { items, activeTool, setActiveTool } = useEstimationStore();

  // Local config state
  const [numFloors, setNumFloors] = useState(shellConfig.numFloors || 2);
  const [floorHeightM, setFloorHeightM] = useState(shellConfig.floorHeightM || 3.0);
  const [soilType, setSoilType] = useState<'soft' | 'medium' | 'hard'>(shellConfig.soilType || 'medium');
  const [structureType, setStructureType] = useState<'rcc_brick' | 'aac'>(shellConfig.structureType || 'rcc_brick');
  const [isCalculating, setIsCalculating] = useState(false);

  // Auto-activate polygon tool when Stage 2 opens
  useEffect(() => {
    setActiveTool("polygon");
  }, [setActiveTool]);

  // Detect polygons drawn in estimation store
  useEffect(() => {
    const polygonItems = items.filter(item => (item.type === 'area' || (item as any).tool_type === 'polygon') && item.points && item.points.length >= 3);
    if (polygonItems.length > 0) {
      const latest = polygonItems[polygonItems.length - 1];
      const pts = latest.points;

      // 1. Calculate Shoelace area in pixels
      let areaPx = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        areaPx += pts[i].x * pts[j].y;
        areaPx -= pts[j].x * pts[i].y;
      }
      areaPx = Math.abs(areaPx) / 2;
      const areaM2 = parseFloat((areaPx * Math.pow(pixelToMeterScale, 2)).toFixed(2));

      // 2. Calculate perimeter in pixels
      let perimPx = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        perimPx += Math.sqrt(dx * dx + dy * dy);
      }
      const perimeterM = parseFloat((perimPx * pixelToMeterScale).toFixed(2));

      // 3. Bounding box length & width
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const spanXM = (maxX - minX) * pixelToMeterScale;
      const spanYM = (maxY - minY) * pixelToMeterScale;
      const lengthM = parseFloat(Math.max(spanXM, spanYM).toFixed(1));
      const widthM = parseFloat(Math.min(spanXM, spanYM).toFixed(1));

      if (areaM2 > 0) {
        setFootprint(pts, areaM2, perimeterM, lengthM, widthM);
      }
    }
  }, [items, pixelToMeterScale, setFootprint]);

  // Fallback / Preset footprint if user doesn't want to draw manually
  const hasFootprint = footprintAreaM2 > 0;
  const effectiveLength = hasFootprint ? boundingLengthM : 12.0;
  const effectiveWidth  = hasFootprint ? boundingWidthM  : 9.0;
  const effectiveAreaM2 = hasFootprint ? footprintAreaM2 : 108.0;
  const effectiveSqFt   = Math.round(effectiveAreaM2 * 10.7639);
  const totalBuaSqFt    = effectiveSqFt * numFloors;

  // Execute structural calculation using the composite engine
  const handleGenerateShell = (skipToFinal = false) => {
    setIsCalculating(true);
    try {
      setShellConfig({ numFloors, floorHeightM, soilType, structureType });

      const moduleParams = {
        length_m: effectiveLength,
        width_m: effectiveWidth,
        num_floors: numFloors,
        height_m: floorHeightM,
        soil_type: soilType,
        masonry_type: structureType === 'aac' ? 'aac' : 'brick',
        outer_door_count: Math.max(2, numFloors * 1),
        inner_door_count: Math.max(4, numFloors * 3),
        window_count: Math.max(6, numFloors * 4),
        bathroom_count: Math.max(1, numFloors * 2),
        finish_quality: 'standard' as const,
      };

      const boqResult = calculateCompositeBOQ(
        ['g1-residential-house'],
        { 'g1-residential-house': moduleParams },
        DEFAULT_STAGE_SCOPES,
        1,
        'standard'
      );

      setShellBOQ(boqResult);
      setShellDone(true);

      if (skipToFinal) {
        const merged = mergeShellAndRooms(boqResult, [], effectiveAreaM2 * numFloors);
        setFinalBOQ(merged);
        setStage(4);
      } else {
        goNext();
      }
    } catch (err) {
      console.error("Shell BOQ calculation error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-surface-50/50 dark:bg-surface-900/30 overflow-hidden relative">
      
      {/* ── Left/Main: Floor Plan Drawing Area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative border-r border-surface-200 dark:border-white/10">
        
        {/* Top Floating Instruction Banner */}
        <div className="px-4 py-2 bg-sky-500/10 border-b border-sky-500/20 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-black text-xs shrink-0">
              2
            </div>
            <p className="text-xs font-semibold text-foreground">
              <span className="font-black text-sky-500">Step 2:</span> Click corners to trace the <strong>outer building footprint</strong>. Double-click to close the polygon.
            </p>
          </div>

          {!hasFootprint && (
            <button
              onClick={() => {
                // Set a default rectangular footprint if user prefers instant calculation
                setFootprint(
                  [{ x: 100, y: 100 }, { x: 500, y: 100 }, { x: 500, y: 400 }, { x: 100, y: 400 }],
                  108.0,
                  42.0,
                  12.0,
                  9.0
                );
              }}
              className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              Use Standard 12m × 9m Footprint
            </button>
          )}
        </div>

        {/* The Interactive Canvas */}
        <div className="flex-1 relative min-h-0">
          <TakeoffCanvas 
            imageUrl={imageUrl || ""} 
            allowedTools={['select', 'polygon']}
            hideMaterials={true}
            hideThickness={false}
          />
        </div>
      </div>

      {/* ── Right Sidebar: Structural Configuration Panel ───────────────────── */}
      <div className="w-full md:w-96 bg-surface-card text-foreground border-t md:border-t-0 md:border-l border-surface-200 dark:border-white/10 flex flex-col justify-between shrink-0 overflow-y-auto p-5 space-y-6">
        
        <div className="space-y-5">
          
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider mb-2">
              <Building2 size={12} /> Structural Shell
            </div>
            <h2 className="text-lg font-black text-foreground tracking-tight">
              Building Specifications
            </h2>
            <p className="text-xs text-surface-400">
              Extracted from your floor plan trace. Controls foundation, RCC columns, beams & slabs.
            </p>
          </div>

          {/* Footprint Geometry Card */}
          <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/80 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-black text-foreground">
              <span className="flex items-center gap-1.5 text-surface-500">
                <Box size={14} className="text-sky-500" /> Ground Footprint
              </span>
              <span className="font-mono text-sky-600 dark:text-sky-400 text-sm">
                {effectiveSqFt} sq.ft
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-surface-200/60 dark:border-white/5">
              <div>
                <span className="text-surface-400 block text-[10px] uppercase font-bold">Dimensions</span>
                <span className="font-mono font-bold text-foreground">{effectiveLength}m × {effectiveWidth}m</span>
              </div>
              <div>
                <span className="text-surface-400 block text-[10px] uppercase font-bold">Perimeter</span>
                <span className="font-mono font-bold text-foreground">{footprintPerimeterM || (effectiveLength + effectiveWidth) * 2} m</span>
              </div>
              <div>
                <span className="text-surface-400 block text-[10px] uppercase font-bold">Total BUA</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalBuaSqFt} sq.ft</span>
              </div>
              <div>
                <span className="text-surface-400 block text-[10px] uppercase font-bold">Est. RCC Volume</span>
                <span className="font-mono font-bold text-foreground">~{((effectiveAreaM2 * numFloors) * 0.165).toFixed(1)} m³</span>
              </div>
            </div>
          </div>

          {/* 1. Number of Floors */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
              Number of Storeys
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 1, label: "G Only" },
                { val: 2, label: "G + 1" },
                { val: 3, label: "G + 2" },
                { val: 4, label: "G + 3" },
              ].map((f) => (
                <button
                  key={f.val}
                  type="button"
                  onClick={() => setNumFloors(f.val)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    numFloors === f.val
                      ? 'bg-accent text-background font-black border-accent shadow-xs'
                      : 'bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-white/10 text-foreground hover:border-surface-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Floor-to-Floor Clear Height */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
                Wall / Floor Height
              </label>
              <span className="text-xs font-mono font-black text-sky-600 dark:text-sky-400">
                {floorHeightM}m ({(floorHeightM * 3.28084).toFixed(1)} ft)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 2.7, label: "2.7m", desc: "9 ft" },
                { val: 3.0, label: "3.0m", desc: "10 ft Std" },
                { val: 3.3, label: "3.3m", desc: "11 ft" },
                { val: 3.6, label: "3.6m", desc: "12 ft High" },
              ].map((h) => (
                <button
                  key={h.val}
                  type="button"
                  onClick={() => setFloorHeightM(h.val)}
                  className={`p-1.5 text-center rounded-xl border transition-all cursor-pointer flex flex-col items-center ${
                    floorHeightM === h.val
                      ? 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400 font-black shadow-xs'
                      : 'bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-white/10 text-foreground hover:border-surface-300'
                  }`}
                >
                  <span className="text-xs font-bold">{h.label}</span>
                  <span className="text-[9px] opacity-70">{h.desc}</span>
                </button>
              ))}
            </div>
            <input 
              type="range"
              min="2.4"
              max="4.5"
              step="0.1"
              value={floorHeightM}
              onChange={(e) => setFloorHeightM(parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer mt-1"
            />
          </div>

          {/* 3. Foundation & Soil Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
              Foundation Soil Depth
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'hard', label: 'Hard / Moorum', depth: '1.2m' },
                { id: 'medium', label: 'Medium Soil', depth: '1.5m' },
                { id: 'soft', label: 'Soft / Clay', depth: '1.8m' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSoilType(s.id as any)}
                  className={`p-2 text-left rounded-xl border transition-all cursor-pointer flex flex-col ${
                    soilType === s.id
                      ? 'bg-accent/10 border-accent text-accent font-black shadow-xs'
                      : 'bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-white/10 text-foreground hover:border-surface-300'
                  }`}
                >
                  <span className="text-[11px] font-bold">{s.label}</span>
                  <span className="text-[10px] font-mono opacity-70">{s.depth} depth</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Structure & Masonry Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-surface-500">
              Wall & Masonry System
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStructureType('rcc_brick')}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                  structureType === 'rcc_brick'
                    ? 'bg-accent/10 border-accent text-accent font-black shadow-xs'
                    : 'bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-white/10 text-foreground'
                }`}
              >
                <div className="text-xs font-bold">Red Brick (230mm)</div>
                <div className="text-[10px] opacity-70">Traditional Clay Masonry</div>
              </button>

              <button
                type="button"
                onClick={() => setStructureType('aac')}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                  structureType === 'aac'
                    ? 'bg-accent/10 border-accent text-accent font-black shadow-xs'
                    : 'bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-white/10 text-foreground'
                }`}
              >
                <div className="text-xs font-bold">AAC Blocks (200mm)</div>
                <div className="text-[10px] opacity-70">Lightweight & Eco-friendly</div>
              </button>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t border-surface-200 dark:border-white/10">
          <button
            onClick={() => handleGenerateShell(false)}
            disabled={isCalculating}
            className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-background font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/25 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span>Generate Shell & Refine Rooms</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={() => handleGenerateShell(true)}
            disabled={isCalculating}
            className="w-full py-2 px-3 text-surface-500 hover:text-foreground hover:bg-surface-100 dark:hover:bg-surface-800 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FastForward size={13} />
            <span>Skip Room Trace → Instant Full BOQ</span>
          </button>
        </div>

      </div>
    </div>
  );
}
