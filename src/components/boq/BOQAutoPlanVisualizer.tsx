"use client";

import React, { useState, useMemo } from "react";
import { BOQParameters } from "@/domains/boq/types";
import { Layers, Eye, Maximize2, Minimize2, Sparkles, Compass, Ruler, Building, Grid3X3, Box, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import BOQ3DModelViewer from "./BOQ3DModelViewer";

interface Props {
  params: BOQParameters;
}

type ViewMode = "plan" | "elevation" | "section" | "3d" | "all";

export default function BOQAutoPlanVisualizer({ params }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("plan");
  const [showDimensions, setShowDimensions] = useState(true);
  const [showRoomLabels, setShowRoomLabels] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Handle ESC key to exit fullscreen
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const {
    outer_length: length = 12,
    outer_width: width = 9,
    floor_height: floorHeight = 3.0,
    num_floors: numFloors = 2,
    outer_wall_thickness_mm: outerWallMm = 230,
    inner_wall_thickness_mm: innerWallMm = 115,
    plinth_height: plinthHeight = 0.6,
    excavation_depth: excavationDepth = 1.5,
  } = params;

  // Key calculated geometry
  const footprintSqm = length * width;
  const footprintSqft = footprintSqm * 10.7639;
  const totalBuaSqm = footprintSqm * numFloors;
  const totalBuaSqft = totalBuaSqm * 10.7639;
  const perimeterM = 2 * (length + width);

  // Column count estimate (columns placed at corners and every <= 4m bay)
  const xBays = Math.max(2, Math.round(length / 4.0));
  const yBays = Math.max(2, Math.round(width / 4.0));
  const totalColumns = (xBays + 1) * (yBays + 1);

  // Concrete & Steel volume thumb-rule estimate (NBC / IS 456)
  const estRccVolume = Number((totalBuaSqm * 0.165).toFixed(1)); // ~0.165 m³ RCC per m² BUA
  const estSteelTonnes = Number(((estRccVolume * 128) / 1000).toFixed(2)); // ~128 kg steel per m³ RCC

  // ─────────────────────────────────────────────────────────────────────────
  // 1. FLOOR PLAN (2D ARCHITECTURAL SVG)
  // ─────────────────────────────────────────────────────────────────────────
  const planSvg = useMemo(() => {
    const svgW = 540;
    const svgH = 340;
    const pad = 44;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / length, availH / width);
    const drawW = length * scale;
    const drawH = width * scale;
    const startX = (svgW - drawW) / 2;
    const startY = (svgH - drawH) / 2;

    const wallThkPx = Math.max(5, (outerWallMm / 1000) * scale);
    const innerWallThkPx = Math.max(3, (innerWallMm / 1000) * scale);
    const colSize = Math.max(10, 0.3 * scale);

    // Columns positions
    const columns = [];
    for (let i = 0; i <= xBays; i++) {
      for (let j = 0; j <= yBays; j++) {
        const cx = startX + i * (drawW / xBays);
        const cy = startY + j * (drawH / yBays);
        columns.push({
          x: cx - colSize / 2,
          y: cy - colSize / 2,
        });
      }
    }

    // Room Layout Calculations (Parametric zoning)
    // Left side: Living & Dining
    // Right side top: Master Bed
    // Right side mid: Kitchen
    // Right side bottom: Bath & Stair
    const splitX = startX + drawW * 0.52;
    const midY = startY + drawH * 0.52;
    const stairX = startX + drawW * 0.76;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none" style={{ maxHeight: "330px" }}>
        <defs>
          <pattern id="planGrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
          </pattern>
          <pattern id="brickHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Blueprint background grid */}
        <rect width={svgW} height={svgH} fill="url(#planGrid)" />

        {/* Outer Perimeter Fill */}
        <rect
          x={startX}
          y={startY}
          width={drawW}
          height={drawH}
          fill="url(#brickHatch)"
          stroke="var(--foreground)"
          strokeWidth={wallThkPx}
          strokeOpacity="0.8"
          rx={2}
        />

        {/* Internal Room Floors */}
        <rect
          x={startX + wallThkPx / 2}
          y={startY + wallThkPx / 2}
          width={drawW - wallThkPx}
          height={drawH - wallThkPx}
          fill="currentColor"
          fillOpacity="0.03"
        />

        {/* ── Internal Partition Walls ── */}
        {/* Main Vertical Spine Divider */}
        <line
          x1={splitX}
          y1={startY + wallThkPx / 2}
          x2={splitX}
          y2={startY + drawH - wallThkPx / 2}
          stroke="var(--foreground)"
          strokeWidth={innerWallThkPx}
          strokeOpacity="0.75"
        />

        {/* Horizontal Divider (Bed 1 vs Kitchen/Dining) */}
        <line
          x1={splitX}
          y1={midY}
          x2={startX + drawW - wallThkPx / 2}
          y2={midY}
          stroke="var(--foreground)"
          strokeWidth={innerWallThkPx}
          strokeOpacity="0.75"
        />

        {/* Staircase Enclosure Wall */}
        <line
          x1={stairX}
          y1={midY}
          x2={stairX}
          y2={startY + drawH - wallThkPx / 2}
          stroke="var(--foreground)"
          strokeWidth={innerWallThkPx}
          strokeOpacity="0.75"
        />

        {/* ── RCC Dog-Leg Staircase Flight ── */}
        <g opacity="0.9">
          <rect
            x={stairX + innerWallThkPx / 2}
            y={midY + innerWallThkPx / 2}
            width={startX + drawW - wallThkPx / 2 - stairX - innerWallThkPx / 2}
            height={startY + drawH - wallThkPx / 2 - midY - innerWallThkPx / 2}
            fill="currentColor"
            fillOpacity="0.06"
          />
          {/* Stair Treads */}
          {[0.18, 0.32, 0.46, 0.60, 0.74, 0.88].map((ratio, idx) => {
            const stepY = midY + innerWallThkPx / 2 + (startY + drawH - wallThkPx / 2 - midY) * ratio;
            return (
              <line
                key={idx}
                x1={stairX + innerWallThkPx / 2}
                y1={stepY}
                x2={startX + drawW - wallThkPx / 2}
                y2={stepY}
                stroke="currentColor"
                strokeWidth="1"
                strokeOpacity="0.35"
              />
            );
          })}
          {/* Stair Direction Arrow */}
          <text
            x={(stairX + startX + drawW) / 2}
            y={(midY + startY + drawH) / 2 + 3}
            textAnchor="middle"
            className="text-[9px] font-black fill-accent uppercase tracking-wider"
          >
            STAIR ▲
          </text>
        </g>

        {/* ── Windows on Exterior Walls (Blue double-lines) ── */}
        {/* Front window */}
        <rect
          x={startX + drawW * 0.18}
          y={startY - 2}
          width={drawW * 0.2}
          height={wallThkPx + 4}
          fill="var(--background)"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
        {/* Master bed window */}
        <rect
          x={startX + drawW * 0.66}
          y={startY - 2}
          width={drawW * 0.18}
          height={wallThkPx + 4}
          fill="var(--background)"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
        {/* Living room side window */}
        <rect
          x={startX - 2}
          y={startY + drawH * 0.35}
          width={wallThkPx + 4}
          height={drawH * 0.22}
          fill="var(--background)"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
        {/* Kitchen window */}
        <rect
          x={startX + drawW - wallThkPx - 2}
          y={midY + drawH * 0.12}
          width={wallThkPx + 4}
          height={drawH * 0.18}
          fill="var(--background)"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />

        {/* ── Main Entrance Door Opening ── */}
        <g>
          {/* Door gap */}
          <rect
            x={startX + drawW * 0.22}
            y={startY + drawH - wallThkPx - 1}
            width={drawW * 0.14}
            height={wallThkPx + 2}
            fill="var(--background)"
          />
          {/* Door leaf & swing arc */}
          <line
            x1={startX + drawW * 0.22}
            y1={startY + drawH - wallThkPx}
            x2={startX + drawW * 0.22}
            y2={startY + drawH - wallThkPx - drawW * 0.14}
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <path
            d={`M ${startX + drawW * 0.22} ${startY + drawH - wallThkPx - drawW * 0.14} A ${drawW * 0.14} ${drawW * 0.14} 0 0 1 ${startX + drawW * 0.36} ${startY + drawH - wallThkPx}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            strokeDasharray="2,2"
            strokeOpacity="0.8"
          />
        </g>

        {/* ── RCC Column Blocks ── */}
        {columns.map((col, idx) => (
          <g key={idx}>
            <rect
              x={col.x}
              y={col.y}
              width={colSize}
              height={colSize}
              fill="#0f172a"
              stroke="var(--foreground)"
              strokeWidth="1"
              rx={1}
            />
            {/* Column Cross-hair center */}
            <line x1={col.x} y1={col.y} x2={col.x + colSize} y2={col.y + colSize} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.4" />
            <line x1={col.x + colSize} y1={col.y} x2={col.x} y2={col.y + colSize} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.4" />
          </g>
        ))}

        {/* ── Room Identification Labels ── */}
        {showRoomLabels && (
          <g>
            {/* Living & Dining */}
            <g transform={`translate(${(startX + splitX) / 2}, ${(startY + startY + drawH) / 2})`}>
              <text textAnchor="middle" y="-4" className="text-[11px] font-black fill-foreground tracking-tight">
                LIVING & DINING
              </text>
              <text textAnchor="middle" y="10" className="text-[9px] font-bold fill-surface-400">
                {(footprintSqm * 0.48).toFixed(1)} m² ({(footprintSqft * 0.48).toFixed(0)} sqft)
              </text>
            </g>

            {/* Master Bed 1 */}
            <g transform={`translate(${(splitX + startX + drawW) / 2}, ${(startY + midY) / 2})`}>
              <text textAnchor="middle" y="-4" className="text-[10px] font-black fill-foreground tracking-tight">
                MASTER BED
              </text>
              <text textAnchor="middle" y="10" className="text-[8.5px] font-bold fill-surface-400">
                {(footprintSqm * 0.26).toFixed(1)} m²
              </text>
            </g>

            {/* Kitchen */}
            <g transform={`translate(${(splitX + stairX) / 2}, ${(midY + startY + drawH) / 2})`}>
              <text textAnchor="middle" y="-4" className="text-[10px] font-black fill-foreground tracking-tight">
                KITCHEN
              </text>
              <text textAnchor="middle" y="10" className="text-[8.5px] font-bold fill-surface-400">
                {(footprintSqm * 0.15).toFixed(1)} m²
              </text>
            </g>
          </g>
        )}

        {/* ── Dimension Lines & CAD Ticks ── */}
        {showDimensions && (
          <g className="text-[10px] font-black fill-accent">
            {/* Bottom Length Dimension */}
            <g transform={`translate(0, ${startY + drawH + 20})`}>
              <line x1={startX} y1="0" x2={startX + drawW} y2="0" stroke="var(--accent)" strokeWidth="1.2" />
              {/* Ticks */}
              <line x1={startX} y1="-5" x2={startX} y2="5" stroke="var(--accent)" strokeWidth="1.2" />
              <line x1={startX + drawW} y1="-5" x2={startX + drawW} y2="5" stroke="var(--accent)" strokeWidth="1.2" />
              {/* Pill background */}
              <rect x={startX + drawW / 2 - 38} y="-9" width="76" height="18" fill="var(--surface-50)" rx="4" stroke="var(--border)" strokeWidth="0.5" />
              <text x={startX + drawW / 2} y="3" textAnchor="middle" className="text-[9.5px] font-black fill-accent">
                {length.toFixed(2)} m
              </text>
            </g>

            {/* Right Width Dimension */}
            <g transform={`translate(${startX + drawW + 20}, 0)`}>
              <line x1="0" y1={startY} x2="0" y2={startY + drawH} stroke="var(--accent)" strokeWidth="1.2" />
              {/* Ticks */}
              <line x1="-5" y1={startY} x2="5" y2={startY} stroke="var(--accent)" strokeWidth="1.2" />
              <line x1="-5" y1={startY + drawH} x2="5" y2={startY + drawH} stroke="var(--accent)" strokeWidth="1.2" />
              {/* Pill background */}
              <rect x="-18" y={startY + drawH / 2 - 9} width="50" height="18" fill="var(--surface-50)" rx="4" stroke="var(--border)" strokeWidth="0.5" />
              <text x="7" y={startY + drawH / 2 + 3} textAnchor="middle" className="text-[9.5px] font-black fill-accent">
                {width.toFixed(2)} m
              </text>
            </g>
          </g>
        )}
      </svg>
    );
  }, [length, width, outerWallMm, innerWallMm, xBays, yBays, footprintSqm, footprintSqft, showDimensions, showRoomLabels]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. FRONT ELEVATION (2D FACADE SVG)
  // ─────────────────────────────────────────────────────────────────────────
  const elevationSvg = useMemo(() => {
    const svgW = 540;
    const svgH = 340;
    const totalHeightM = plinthHeight + numFloors * floorHeight + 1.0; // 1.0m parapet
    const pad = 44;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / length, availH / totalHeightM);
    const drawW = length * scale;
    const drawTotalH = totalHeightM * scale;
    const startX = (svgW - drawW) / 2;
    const groundY = svgH - 45; // NGL line
    const plinthH = plinthHeight * scale;
    const floorH = floorHeight * scale;
    const parapetH = 1.0 * scale;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none" style={{ maxHeight: "330px" }}>
        {/* Natural Ground Line (NGL) with hatch */}
        <line x1="16" y1={groundY} x2={svgW - 16} y2={groundY} stroke="#64748b" strokeWidth="1.5" />
        {/* NGL Hash pattern */}
        {Array.from({ length: 26 }).map((_, i) => (
          <line
            key={i}
            x1={20 + i * 20}
            y1={groundY}
            x2={12 + i * 20}
            y2={groundY + 8}
            stroke="#64748b"
            strokeWidth="0.8"
            opacity="0.6"
          />
        ))}
        <text x="24" y={groundY - 6} className="text-[8.5px] font-black fill-surface-400">
          ±0.00 NGL
        </text>

        {/* ── Plinth Masonry & Steps ── */}
        <rect
          x={startX}
          y={groundY - plinthH}
          width={drawW}
          height={plinthH}
          fill="currentColor"
          fillOpacity="0.08"
          stroke="var(--foreground)"
          strokeWidth="1.2"
        />
        {/* Entrance Steps */}
        <rect
          x={startX + drawW * 0.42}
          y={groundY - plinthH / 2}
          width={drawW * 0.16}
          height={plinthH / 2}
          fill="currentColor"
          fillOpacity="0.15"
          stroke="var(--foreground)"
          strokeWidth="0.8"
        />

        {/* ── Floor Storeys ── */}
        {Array.from({ length: numFloors }).map((_, fIdx) => {
          const floorBottomY = groundY - plinthH - fIdx * floorH;
          const floorTopY = floorBottomY - floorH;
          const slabThkPx = Math.max(3, 0.15 * scale);

          return (
            <g key={fIdx}>
              {/* Floor Wall Block */}
              <rect
                x={startX}
                y={floorTopY}
                width={drawW}
                height={floorH}
                fill="currentColor"
                fillOpacity={fIdx % 2 === 0 ? "0.04" : "0.02"}
                stroke="var(--foreground)"
                strokeWidth="1.2"
              />

              {/* RCC Floor Slab Band */}
              <rect
                x={startX - 2}
                y={floorTopY}
                width={drawW + 4}
                height={slabThkPx}
                fill="#0f172a"
                stroke="var(--foreground)"
                strokeWidth="0.8"
              />

              {/* Windows on this floor */}
              <rect
                x={startX + drawW * 0.12}
                y={floorTopY + floorH * 0.28}
                width={drawW * 0.22}
                height={floorH * 0.48}
                fill="#38bdf8"
                fillOpacity="0.2"
                stroke="#38bdf8"
                strokeWidth="1"
                rx={1}
              />
              <rect
                x={startX + drawW * 0.66}
                y={floorTopY + floorH * 0.28}
                width={drawW * 0.22}
                height={floorH * 0.48}
                fill="#38bdf8"
                fillOpacity="0.2"
                stroke="#38bdf8"
                strokeWidth="1"
                rx={1}
              />

              {/* Ground Floor Main Door vs Upper Floor Balcony */}
              {fIdx === 0 ? (
                <rect
                  x={startX + drawW * 0.43}
                  y={floorBottomY - floorH * 0.72}
                  width={drawW * 0.14}
                  height={floorH * 0.72}
                  fill="var(--accent)"
                  fillOpacity="0.25"
                  stroke="var(--accent)"
                  strokeWidth="1.2"
                  rx={1}
                />
              ) : (
                /* Upper Floor Balcony Railing */
                <g>
                  <rect
                    x={startX + drawW * 0.40}
                    y={floorBottomY - floorH * 0.35}
                    width={drawW * 0.20}
                    height={floorH * 0.35}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1"
                    strokeDasharray="3,2"
                  />
                  {/* Glass French door */}
                  <rect
                    x={startX + drawW * 0.43}
                    y={floorBottomY - floorH * 0.72}
                    width={drawW * 0.14}
                    height={floorH * 0.72}
                    fill="#38bdf8"
                    fillOpacity="0.15"
                    stroke="#38bdf8"
                    strokeWidth="1"
                  />
                </g>
              )}

              {/* Floor Level Label */}
              <text x={startX + 6} y={floorTopY + 14} className="text-[8.5px] font-black fill-surface-400">
                {fIdx === 0 ? "GROUND FLOOR" : `FLOOR ${fIdx + 1} (G+${fIdx})`}
              </text>
            </g>
          );
        })}

        {/* ── Roof Parapet Wall ── */}
        {(() => {
          const roofY = groundY - plinthH - numFloors * floorH;
          return (
            <g>
              <rect
                x={startX}
                y={roofY - parapetH}
                width={drawW}
                height={parapetH}
                fill="currentColor"
                fillOpacity="0.06"
                stroke="var(--foreground)"
                strokeWidth="1.2"
              />
              <text x={startX + drawW / 2} y={roofY - parapetH / 2 + 3} textAnchor="middle" className="text-[8px] font-black fill-surface-400">
                ROOF PARAPET (1.0m)
              </text>
            </g>
          );
        })()}

        {/* ── Elevation Dimension Lines ── */}
        {showDimensions && (
          <g className="text-[10px] font-black fill-accent">
            {/* Total Height Dimension on Right */}
            {(() => {
              const roofY = groundY - plinthH - numFloors * floorH - parapetH;
              const dimX = startX + drawW + 18;
              return (
                <g>
                  <line x1={dimX} y1={groundY} x2={dimX} y2={roofY} stroke="var(--accent)" strokeWidth="1.2" />
                  <line x1={dimX - 4} y1={groundY} x2={dimX + 4} y2={groundY} stroke="var(--accent)" strokeWidth="1.2" />
                  <line x1={dimX - 4} y1={roofY} x2={dimX + 4} y2={roofY} stroke="var(--accent)" strokeWidth="1.2" />
                  <rect x={dimX - 18} y={(groundY + roofY) / 2 - 9} width="50" height="18" fill="var(--surface-50)" rx="4" stroke="var(--border)" strokeWidth="0.5" />
                  <text x={dimX + 7} y={(groundY + roofY) / 2 + 3} textAnchor="middle" className="text-[9.5px] font-black fill-accent">
                    {totalHeightM.toFixed(1)} m
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    );
  }, [length, numFloors, floorHeight, plinthHeight, showDimensions]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CROSS SECTION (STRUCTURAL RCC CUT SVG)
  // ─────────────────────────────────────────────────────────────────────────
  const sectionSvg = useMemo(() => {
    const svgW = 540;
    const svgH = 340;
    const totalH = excavationDepth + plinthHeight + numFloors * floorHeight + 1.0;
    const pad = 44;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / width, availH / totalH);
    const drawW = width * scale;
    const startX = (svgW - drawW) / 2;
    const groundY = 100 + plinthHeight * scale; // Fixed datum

    const pccH = Math.max(4, 0.1 * scale); // 100mm PCC
    const ftrH = Math.max(12, 0.4 * scale); // 400mm footing
    const colW = Math.max(8, 0.3 * scale);
    const floorH = floorHeight * scale;
    const plinthH = plinthHeight * scale;
    const parapetH = 1.0 * scale;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none" style={{ maxHeight: "330px" }}>
        {/* NGL Datum */}
        <line x1="16" y1={groundY} x2={svgW - 16} y2={groundY} stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,3" />
        <text x="24" y={groundY - 5} className="text-[8.5px] font-black fill-surface-400">
          ±0.00 NGL
        </text>

        {/* ── Substructure Foundations (2 Column Footings) ── */}
        {[startX + drawW * 0.15, startX + drawW * 0.85].map((cx, fIdx) => {
          const ftrBottomY = groundY + excavationDepth * scale;
          const ftrWidth = Math.max(28, 1.4 * scale); // 1.4m footing

          return (
            <g key={fIdx}>
              {/* Excavation Pit Outline */}
              <rect
                x={cx - ftrWidth / 2 - 6}
                y={groundY}
                width={ftrWidth + 12}
                height={excavationDepth * scale}
                fill="currentColor"
                fillOpacity="0.03"
                stroke="#64748b"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />

              {/* PCC Bed 1:4:8 */}
              <rect
                x={cx - ftrWidth / 2 - 4}
                y={ftrBottomY - pccH}
                width={ftrWidth + 8}
                height={pccH}
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="0.8"
              />

              {/* Trapezoidal RCC Footing M25 */}
              <polygon
                points={`
                  ${cx - ftrWidth / 2},${ftrBottomY - pccH}
                  ${cx + ftrWidth / 2},${ftrBottomY - pccH}
                  ${cx + colW / 2 + 4},${ftrBottomY - pccH - ftrH}
                  ${cx - colW / 2 - 4},${ftrBottomY - pccH - ftrH}
                `}
                fill="#0f172a"
                stroke="var(--foreground)"
                strokeWidth="1"
              />

              {/* Continuous RCC Column Shaft */}
              <rect
                x={cx - colW / 2}
                y={groundY - plinthH - numFloors * floorH}
                width={colW}
                height={excavationDepth * scale - pccH - ftrH + plinthH + numFloors * floorH}
                fill="#0f172a"
                stroke="var(--foreground)"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* ── Plinth Beam Band ── */}
        <rect
          x={startX}
          y={groundY - plinthH}
          width={drawW}
          height={Math.max(6, 0.3 * scale)}
          fill="#1e293b"
          stroke="var(--foreground)"
          strokeWidth="1"
        />

        {/* ── Floor Slabs & Roof Slab ── */}
        {Array.from({ length: numFloors }).map((_, fIdx) => {
          const slabY = groundY - plinthH - (fIdx + 1) * floorH;
          const slabThk = Math.max(3, 0.15 * scale);
          return (
            <g key={fIdx}>
              {/* Floor Slab Strip */}
              <rect
                x={startX}
                y={slabY}
                width={drawW}
                height={slabThk}
                fill="#0f172a"
                stroke="var(--foreground)"
                strokeWidth="1"
              />
              {/* Beam section drops */}
              <rect x={startX + drawW * 0.15 - colW / 2 - 2} y={slabY} width={colW + 4} height={slabThk * 2.4} fill="#0f172a" stroke="var(--foreground)" strokeWidth="0.8" />
              <rect x={startX + drawW * 0.85 - colW / 2 - 2} y={slabY} width={colW + 4} height={slabThk * 2.4} fill="#0f172a" stroke="var(--foreground)" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* ── Parapet ── */}
        {(() => {
          const roofY = groundY - plinthH - numFloors * floorH;
          return (
            <g>
              <rect x={startX} y={roofY - parapetH} width={colW} height={parapetH} fill="currentColor" fillOpacity="0.2" stroke="var(--foreground)" strokeWidth="1" />
              <rect x={startX + drawW - colW} y={roofY - parapetH} width={colW} height={parapetH} fill="currentColor" fillOpacity="0.2" stroke="var(--foreground)" strokeWidth="1" />
            </g>
          );
        })()}

        {/* Structural Callouts */}
        <g className="text-[8.5px] font-bold fill-surface-400">
          <text x={startX + drawW / 2} y={groundY + excavationDepth * scale - 6} textAnchor="middle">
            PCC 1:4:8 BED & M25 ISOLATED FOOTINGS
          </text>
          <text x={startX + drawW / 2} y={groundY - plinthH + 14} textAnchor="middle">
            PLINTH BEAM (230×300)
          </text>
          <text x={startX + drawW / 2} y={groundY - plinthH - floorH + 14} textAnchor="middle">
            150 mm RCC FLOOR SLAB
          </text>
        </g>
      </svg>
    );
  }, [width, numFloors, floorHeight, plinthHeight, excavationDepth]);

  return (
    <div className="w-full bg-surface-card border border-surface-300 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* ── Top Header & Tab Controls ── */}
      <div className="p-3 bg-surface-100/90 backdrop-blur-md border-b border-surface-300 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-accent/15 text-accent flex items-center justify-center text-xs font-black">
            📐
          </span>
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>Auto-Generated Architectural Plan</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 text-[8.5px] font-black">
                LIVE CAD
              </span>
            </h3>
          </div>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-1 bg-surface-200/60 p-0.5 rounded-lg border border-surface-300">
          <button
            type="button"
            onClick={() => setViewMode("plan")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${viewMode === "plan"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            2D Plan
          </button>
          <button
            type="button"
            onClick={() => setViewMode("elevation")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${viewMode === "elevation"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            Elevation
          </button>
          <button
            type="button"
            onClick={() => setViewMode("section")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${viewMode === "section"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            Section
          </button>
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${viewMode === "3d"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            <span>🏛️ 3D Model</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${viewMode === "all"
                ? "bg-accent text-background shadow-xs"
                : "text-surface-500 hover:text-foreground"
              }`}
          >
            All 4 Views
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-surface-500 hover:text-foreground hover:bg-surface-200 border border-surface-300 flex items-center gap-1 cursor-pointer transition-all ml-1"
            title="Expand to Fullscreen Mode"
          >
            <Maximize2 className="w-3 h-3 text-accent" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* ── Key Parameter Engineering Bar ── */}
      <div className="px-3.5 py-2 bg-surface-50 border-b border-surface-200 flex items-center justify-between text-[10px] text-surface-600 font-bold flex-wrap gap-2">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span>
            Dimensions: <strong className="text-foreground">{length}m × {width}m</strong>
          </span>
          <span>
            Footprint: <strong className="text-foreground">{footprintSqm.toFixed(1)} m²</strong> ({footprintSqft.toFixed(0)} sqft)
          </span>
          <span>
            Total BUA: <strong className="text-accent">{totalBuaSqm.toFixed(1)} m²</strong> (G+{numFloors - 1})
          </span>
          <span>
            Columns: <strong className="text-foreground">{totalColumns} nos</strong> (~4m grid)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {viewMode !== "3d" && (
            <label className="flex items-center gap-1 text-[9px] text-surface-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showDimensions}
                onChange={(e) => setShowDimensions(e.target.checked)}
                className="w-3 h-3 accent-accent cursor-pointer"
              />
              Dimensions
            </label>
          )}
        </div>
      </div>

      {/* ── Main Canvas Viewport ── */}
      <div className="p-3 bg-surface-card flex items-center justify-center min-h-[300px]">
        {viewMode === "plan" && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xl">{planSvg}</div>
            <p className="text-[9px] font-bold text-surface-400 text-center mt-1">
              Typical Floor Plan ({length}m × {width}m) · RCC Column Grid & Internal Partitions
            </p>
          </div>
        )}

        {viewMode === "elevation" && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xl">{elevationSvg}</div>
            <p className="text-[9px] font-bold text-surface-400 text-center mt-1">
              Front Elevation · G+{numFloors - 1} Storeys ({floorHeight}m floor height, {plinthHeight}m plinth)
            </p>
          </div>
        )}

        {viewMode === "section" && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xl">{sectionSvg}</div>
            <p className="text-[9px] font-bold text-surface-400 text-center mt-1">
              Structural Cross-Section · M25 Isolated Footings, Columns, Plinth & Slabs
            </p>
          </div>
        )}

        {viewMode === "3d" && (
          <div className="w-full">
            <BOQ3DModelViewer params={params} />
          </div>
        )}

        {viewMode === "all" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-lg space-y-1">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-surface-500">1. Floor Plan (2D CAD)</h4>
              {planSvg}
            </div>
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-lg space-y-1">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-surface-500">2. Front Elevation</h4>
              {elevationSvg}
            </div>
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-lg space-y-1">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-surface-500">3. Cross Section</h4>
              {sectionSvg}
            </div>
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-lg space-y-1">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-surface-500">4. 3D Axonometric Model</h4>
              <div className="h-[260px] rounded-lg overflow-hidden border border-surface-300">
                <BOQ3DModelViewer params={params} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Engineering Thumb-Rule Summary Footer ── */}
      <div className="px-3.5 py-2.5 bg-surface-100/70 border-t border-surface-200 flex items-center justify-between text-[10px] text-surface-500 font-semibold flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span>🏗️ Est. Concrete:</span>
            <strong className="text-foreground">{estRccVolume} m³</strong>
          </span>
          <span className="flex items-center gap-1">
            <span>⚡ Est. Steel (Fe500D):</span>
            <strong className="text-foreground">{estSteelTonnes} Tonnes</strong> (~128 kg/m³)
          </span>
          <span className="flex items-center gap-1">
            <span>🧱 Perimeter:</span>
            <strong className="text-foreground">{perimeterM.toFixed(1)} m</strong>
          </span>
        </div>
        <span className="text-[9px] text-surface-400">
          Per IS 456 + IS 1893 + NBC 2016
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── FULL SCREEN MODAL VIEWPORT ── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/98 backdrop-blur-2xl flex flex-col p-4 md:p-6 select-none animate-in fade-in duration-150">
          {/* Fullscreen Header Bar */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-surface-300 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-sm font-black">
                📐
              </span>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Architectural Plan & Elevation Studio</span>
                  <span className="px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30 text-[9px] font-black">
                    FULLSCREEN HD
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  {length}m × {width}m · {numFloors} Floors · {totalBuaSqm.toFixed(1)} m² BUA
                </p>
              </div>
            </div>

            {/* View Switcher in Fullscreen */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("plan")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === "plan" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                2D Floor Plan
              </button>
              <button
                type="button"
                onClick={() => setViewMode("elevation")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === "elevation" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                Front Elevation
              </button>
              <button
                type="button"
                onClick={() => setViewMode("section")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === "section" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                Cross Section
              </button>
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "3d" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🏛️ 3D Axonometric BIM</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === "all" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                All 4 Views
              </button>
            </div>

            {/* Exit Fullscreen & Zoom Tools */}
            <div className="flex items-center gap-2">
              {viewMode !== "3d" && (
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[10px] text-slate-300 px-1">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 text-slate-400 hover:text-white ml-1"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit Fullscreen (ESC)</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Main Content Canvas */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8">
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {viewMode === "plan" && (
                <div className="w-full max-w-4xl bg-slate-950/80 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center">
                  <div className="w-full">{planSvg}</div>
                  <p className="text-xs font-bold text-slate-400 text-center mt-3">
                    2D Floor Plan ({length}m × {width}m) · High Definition CAD View
                  </p>
                </div>
              )}

              {viewMode === "elevation" && (
                <div className="w-full max-w-4xl bg-slate-950/80 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center">
                  <div className="w-full">{elevationSvg}</div>
                  <p className="text-xs font-bold text-slate-400 text-center mt-3">
                    Front Elevation · G+{numFloors - 1} Storeys ({floorHeight}m floor height, {plinthHeight}m plinth)
                  </p>
                </div>
              )}

              {viewMode === "section" && (
                <div className="w-full max-w-4xl bg-slate-950/80 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center">
                  <div className="w-full">{sectionSvg}</div>
                  <p className="text-xs font-bold text-slate-400 text-center mt-3">
                    Structural Cross-Section · M25 Isolated Footings, Columns, Plinth & Slabs
                  </p>
                </div>
              )}

              {viewMode === "3d" && (
                <div className="w-full h-full max-w-6xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                  <BOQ3DModelViewer params={params} />
                </div>
              )}

              {viewMode === "all" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl">
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">1. Floor Plan (2D CAD)</h4>
                    {planSvg}
                  </div>
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">2. Front Elevation</h4>
                    {elevationSvg}
                  </div>
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">3. Cross Section</h4>
                    {sectionSvg}
                  </div>
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">4. 3D Axonometric Model</h4>
                    <div className="h-[320px] rounded-lg overflow-hidden border border-slate-800">
                      <BOQ3DModelViewer params={params} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
