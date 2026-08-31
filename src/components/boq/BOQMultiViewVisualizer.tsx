"use client";

import React, { useState, useMemo } from "react";
import { LayoutGrid, Maximize2, Layers } from "lucide-react";
import { BOQ_TEMPLATES } from "@/domains/boq/catalog";

interface Props {
  slug: string;
  params: Record<string, any>;
  className?: string;
}

type ViewMode = "plan" | "elevation" | "section" | "all";

export default function BOQMultiViewVisualizer({ slug, params, className = "" }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("plan");

  const length = Number(params.length_m ?? (params.wall_length_m ? Math.min(20, params.wall_length_m) : 6.0));
  const width = Number(params.width_m ?? (params.base_width_m ? params.base_width_m : 4.5));
  const height = Number(params.height_m ?? (params.wall_height_m ? params.wall_height_m : 2.7));
  const wallThkMm = Number(params.wall_thk_mm ?? 230);
  const wallThkM = wallThkMm / 1000;
  const roofType = params.roof_type ?? "rcc";
  const withVerandah = params.with_verandah ?? true;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. PLAN VIEW SVG
  // ───────────────────────────────────────────────────────────────────────────
  const planSvg = useMemo(() => {
    const svgW = 500;
    const svgH = 320;
    const pad = 40;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / length, availH / width);
    const drawW = length * scale;
    const drawH = width * scale;
    const startX = (svgW - drawW) / 2;
    const startY = (svgH - drawH) / 2;
    const wallPx = Math.max(4, wallThkM * scale);

    // Sub-room divisions
    const splitX = startX + drawW * 0.58;
    const midY = startY + drawH * 0.55;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto max-h-[300px] select-none">
        <defs>
          <pattern id="brickHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#166534" strokeWidth="0.75" opacity="0.3" />
          </pattern>
        </defs>

        {/* Outer Envelope Wall Fill */}
        <rect
          x={startX}
          y={startY}
          width={drawW}
          height={drawH}
          fill="url(#brickHatch)"
          stroke="#166534"
          strokeWidth={wallPx}
        />

        {/* Inner Clear Rooms */}
        {/* Room 1: Hall / Multi-purpose */}
        <rect
          x={startX + wallPx}
          y={startY + wallPx}
          width={splitX - startX - wallPx}
          height={drawH - wallPx * 2}
          fill="#f0fdf4"
          stroke="#166534"
          strokeWidth="1"
        />

        {/* Room 2: Kitchen */}
        <rect
          x={splitX}
          y={startY + wallPx}
          width={startX + drawW - splitX - wallPx}
          height={midY - startY - wallPx}
          fill="#f8fafc"
          stroke="#166534"
          strokeWidth="1"
        />

        {/* Room 3: Toilet / Wash */}
        <rect
          x={splitX}
          y={midY}
          width={startX + drawW - splitX - wallPx}
          height={startY + drawH - midY - wallPx}
          fill="#eff6ff"
          stroke="#166534"
          strokeWidth="1"
        />

        {/* Room Labels */}
        <text
          x={startX + (splitX - startX) / 2}
          y={startY + drawH / 2 - 6}
          textAnchor="middle"
          className="fill-slate-800 font-mono text-[11px] font-bold"
        >
          HALL / LIVING
        </text>
        <text
          x={startX + (splitX - startX) / 2}
          y={startY + drawH / 2 + 10}
          textAnchor="middle"
          className="fill-slate-500 font-sans text-[8.5px]"
        >
          ({(length * 0.58).toFixed(1)}m × {width.toFixed(1)}m)
        </text>

        <text
          x={splitX + (startX + drawW - splitX) / 2}
          y={startY + (midY - startY) / 2}
          textAnchor="middle"
          className="fill-slate-800 font-mono text-[10px] font-bold"
        >
          KITCHEN
        </text>

        <text
          x={splitX + (startX + drawW - splitX) / 2}
          y={midY + (startY + drawH - midY) / 2}
          textAnchor="middle"
          className="fill-slate-800 font-mono text-[10px] font-bold"
        >
          TOILET / BATH
        </text>

        {/* Door Swings */}
        <path
          d={`M ${startX + 18} ${startY + drawH - wallPx} A 16 16 0 0 1 ${startX + 34} ${startY + drawH - wallPx - 16}`}
          fill="none"
          stroke="#92400e"
          strokeWidth="1.2"
          strokeDasharray="2,2"
        />
        <line
          x1={startX + 18}
          y1={startY + drawH - wallPx}
          x2={startX + 34}
          y2={startY + drawH - wallPx - 16}
          stroke="#92400e"
          strokeWidth="1.5"
        />

        {/* Verandah Front Porch */}
        {withVerandah && (
          <g>
            <rect
              x={startX}
              y={startY + drawH}
              width={drawW}
              height={Math.max(14, scale * 1.2)}
              fill="#fef3c7"
              stroke="#b45309"
              strokeWidth="0.8"
              strokeDasharray="3,2"
            />
            <text
              x={startX + drawW / 2}
              y={startY + drawH + Math.max(10, scale * 0.8)}
              textAnchor="middle"
              className="fill-amber-800 font-bold text-[8.5px] uppercase tracking-wider"
            >
              FRONT VERANDAH (~5 m²)
            </text>
          </g>
        )}

        {/* Dimension Lines (Length & Width) */}
        {/* Top Length Dimension */}
        <line x1={startX} y1={startY - 12} x2={startX + drawW} y2={startY - 12} stroke="#166534" strokeWidth="1.2" />
        <line x1={startX} y1={startY - 18} x2={startX} y2={startY - 6} stroke="#166534" strokeWidth="1" />
        <line x1={startX + drawW} y1={startY - 18} x2={startX + drawW} y2={startY - 6} stroke="#166534" strokeWidth="1" />
        <text x={startX + drawW / 2} y={startY - 16} textAnchor="middle" className="fill-emerald-800 font-mono text-[10px] font-extrabold">
          {length.toFixed(2)} m
        </text>

        {/* Right Width Dimension */}
        <line x1={startX + drawW + 14} y1={startY} x2={startX + drawW + 14} y2={startY + drawH} stroke="#166534" strokeWidth="1.2" />
        <line x1={startX + drawW + 8} y1={startY} x2={startX + drawW + 20} y2={startY} stroke="#166534" strokeWidth="1" />
        <line x1={startX + drawW + 8} y1={startY + drawH} x2={startX + drawW + 20} y2={startY + drawH} stroke="#166534" strokeWidth="1" />
        <text
          x={startX + drawW + 22}
          y={startY + drawH / 2}
          textAnchor="start"
          dominantBaseline="middle"
          className="fill-emerald-800 font-mono text-[10px] font-extrabold"
        >
          {width.toFixed(2)} m
        </text>
      </svg>
    );
  }, [length, width, height, wallThkM, withVerandah]);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FRONT ELEVATION SVG
  // ───────────────────────────────────────────────────────────────────────────
  const elevationSvg = useMemo(() => {
    const svgW = 500;
    const svgH = 320;
    const pad = 40;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / length, availH / (height + 1.2));
    const drawW = length * scale;
    const drawH = height * scale;
    const plinthH = 0.45 * scale;
    const startX = (svgW - drawW) / 2;
    const glY = svgH - 50;
    const plinthY = glY - plinthH;
    const roofY = plinthY - drawH;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto max-h-[300px] select-none">
        {/* Ground Line */}
        <line x1="20" y1={glY} x2={svgW - 20} y2={glY} stroke="#64748b" strokeWidth="2" />
        <text x="30" y={glY + 16} className="fill-slate-500 font-mono text-[9px] font-bold">
          GL ±0.00
        </text>

        {/* Plinth Wall */}
        <rect x={startX} y={plinthY} width={drawW} height={plinthH} fill="#94a3b8" stroke="#475569" strokeWidth="1" />
        <text x={startX - 10} y={plinthY + plinthH / 2} textAnchor="end" className="fill-slate-600 font-mono text-[8.5px]">
          PL +0.45m
        </text>

        {/* Superstructure Wall */}
        <rect x={startX} y={roofY} width={drawW} height={drawH} fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />

        {/* Main Door */}
        <rect
          x={startX + drawW * 0.25}
          y={plinthY - 2.0 * scale}
          width={Math.max(16, 0.9 * scale)}
          height={2.0 * scale}
          fill="#78350f"
          stroke="#451a03"
          strokeWidth="1"
        />

        {/* Windows with Sunshades */}
        {/* Window 1 */}
        <g>
          {/* Chajja */}
          <rect
            x={startX + drawW * 0.60 - 4}
            y={plinthY - 2.1 * scale}
            width={1.2 * scale + 8}
            height={4}
            fill="#64748b"
          />
          {/* Frame & Glass */}
          <rect
            x={startX + drawW * 0.60}
            y={plinthY - 2.0 * scale}
            width={1.2 * scale}
            height={1.2 * scale}
            fill="#bae6fd"
            stroke="#0284c7"
            strokeWidth="1"
          />
          <line
            x1={startX + drawW * 0.60 + (1.2 * scale) / 2}
            y1={plinthY - 2.0 * scale}
            x2={startX + drawW * 0.60 + (1.2 * scale) / 2}
            y2={plinthY - 0.8 * scale}
            stroke="#0284c7"
            strokeWidth="1"
          />
        </g>

        {/* Roof Structure */}
        {roofType === "rcc" ? (
          <g>
            <rect x={startX - 8} y={roofY - 8} width={drawW + 16} height={8} fill="#475569" stroke="#1e293b" />
            <rect x={startX} y={roofY - 22} width={drawW} height={14} fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" />
            <text x={startX + drawW / 2} y={roofY - 12} textAnchor="middle" className="fill-amber-900 text-[8px] font-bold">
              PARAPET (0.9m)
            </text>
          </g>
        ) : (
          <g>
            <polygon
              points={`${startX - 12},${roofY} ${startX + drawW / 2},${roofY - 32} ${startX + drawW + 12},${roofY}`}
              fill="#d97706"
              stroke="#92400e"
              strokeWidth="1.5"
            />
            <text x={startX + drawW / 2} y={roofY - 8} textAnchor="middle" className="fill-white text-[8.5px] font-bold">
              GI SHEET ON MS TRUSS
            </text>
          </g>
        )}

        {/* Height Dimension Line */}
        <line x1={startX + drawW + 14} y1={plinthY} x2={startX + drawW + 14} y2={roofY} stroke="#b45309" strokeWidth="1.2" />
        <line x1={startX + drawW + 8} y1={plinthY} x2={startX + drawW + 20} y2={plinthY} stroke="#b45309" strokeWidth="1" />
        <line x1={startX + drawW + 8} y1={roofY} x2={startX + drawW + 20} y2={roofY} stroke="#b45309" strokeWidth="1" />
        <text
          x={startX + drawW + 24}
          y={roofY + drawH / 2}
          dominantBaseline="middle"
          className="fill-amber-900 font-mono text-[10px] font-extrabold"
        >
          H = {height.toFixed(2)} m
        </text>
      </svg>
    );
  }, [length, height, roofType]);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SECTION VIEW SVG (FOUNDATION TO ROOF)
  // ───────────────────────────────────────────────────────────────────────────
  const sectionSvg = useMemo(() => {
    const svgW = 500;
    const svgH = 320;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto max-h-[300px] select-none">
        {/* Ground Line */}
        <line x1="30" y1="180" x2="470" y2="180" stroke="#64748b" strokeWidth="2" strokeDasharray="6,3" />
        <text x="40" y="174" className="fill-slate-500 font-mono text-[9px] font-bold">
          GL ±0.00
        </text>

        {/* Trench Excavation & PCC Bed */}
        {/* Left Foundation */}
        <g transform="translate(80, 0)">
          {/* PCC 100mm */}
          <rect x="-35" y="240" width="70" height="15" fill="#94a3b8" stroke="#334155" />
          <text x="42" y="252" className="fill-slate-600 font-sans text-[8px]">
            PCC 1:4:8 (100mm)
          </text>

          {/* Stepped Brick Footing 1 */}
          <rect x="-26" y="222" width="52" height="18" fill="#d97706" stroke="#78350f" />
          {/* Stepped Brick Footing 2 */}
          <rect x="-18" y="202" width="36" height="20" fill="#d97706" stroke="#78350f" />
          {/* Plinth Wall */}
          <rect x="-11" y="150" width="22" height="52" fill="#d97706" stroke="#78350f" />

          {/* DPC 50mm Layer */}
          <rect x="-11" y="146" width="22" height="4" fill="#0f172a" stroke="#000" />
          <text x="-16" y="144" textAnchor="end" className="fill-slate-900 font-mono text-[8px] font-bold">
            DPC 50mm
          </text>

          {/* Main Wall Superstructure */}
          <rect x="-11" y="60" width="22" height="86" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
          {/* Lintel Beam */}
          <rect x="-11" y="86" width="22" height="10" fill="#475569" stroke="#1e293b" />
        </g>

        {/* Right Foundation */}
        <g transform="translate(400, 0)">
          {/* PCC 100mm */}
          <rect x="-35" y="240" width="70" height="15" fill="#94a3b8" stroke="#334155" />
          {/* Stepped Brick Footing 1 */}
          <rect x="-26" y="222" width="52" height="18" fill="#d97706" stroke="#78350f" />
          {/* Stepped Brick Footing 2 */}
          <rect x="-18" y="202" width="36" height="20" fill="#d97706" stroke="#78350f" />
          {/* Plinth Wall */}
          <rect x="-11" y="150" width="22" height="52" fill="#d97706" stroke="#78350f" />
          {/* DPC 50mm */}
          <rect x="-11" y="146" width="22" height="4" fill="#0f172a" stroke="#000" />
          {/* Main Wall */}
          <rect x="-11" y="60" width="22" height="86" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
          {/* Lintel */}
          <rect x="-11" y="86" width="22" height="10" fill="#475569" stroke="#1e293b" />
        </g>

        {/* Plinth Sand Filling & Floor Slab */}
        <rect x="91" y="150" width="298" height="30" fill="#fde68a" opacity="0.6" />
        <text x="240" y="170" textAnchor="middle" className="fill-amber-900 font-sans text-[8.5px] font-bold">
          COMPACTED PLINTH SAND FILLING
        </text>
        <rect x="91" y="146" width="298" height="4" fill="#64748b" />

        {/* RCC Roof Slab (100mm) */}
        <rect x="65" y="52" width="350" height="8" fill="#475569" stroke="#1e293b" />
        <text x="240" y="44" textAnchor="middle" className="fill-slate-800 font-mono text-[9px] font-bold">
          100mm RCC ROOF SLAB (M20)
        </text>
      </svg>
    );
  }, []);

  const template = BOQ_TEMPLATES[slug];

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs ${className}`}>
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers size={13} className="text-emerald-700 shrink-0" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">
            Visual Confirmation &middot; {template?.name || slug}
          </span>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("plan")}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === "plan"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setViewMode("elevation")}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === "elevation"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Elevation
          </button>
          <button
            type="button"
            onClick={() => setViewMode("section")}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === "section"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Section
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-0.5 ${
              viewMode === "all"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
            title="Grid view of all 3 engineering drawings"
          >
            <LayoutGrid size={10} /> All 3
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="p-3 bg-slate-50/50">
        {viewMode === "all" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Plan View</div>
              {planSvg}
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Front Elevation</div>
              {elevationSvg}
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Section Detail</div>
              {sectionSvg}
            </div>
          </div>
        ) : viewMode === "plan" ? (
          <div className="bg-white p-2 rounded-lg border border-slate-200">{planSvg}</div>
        ) : viewMode === "elevation" ? (
          <div className="bg-white p-2 rounded-lg border border-slate-200">{elevationSvg}</div>
        ) : (
          <div className="bg-white p-2 rounded-lg border border-slate-200">{sectionSvg}</div>
        )}
      </div>
    </div>
  );
}
