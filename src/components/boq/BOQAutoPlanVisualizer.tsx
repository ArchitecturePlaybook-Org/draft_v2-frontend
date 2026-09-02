"use client";

import React, { useState, useMemo, useEffect } from "react";
import { BOQParameters } from "@/domains/boq/types";
import { IFCStorey, IFCRoom, IFCWallSegment } from "@/domains/boq/ifc-types";
import {
  Layers, Eye, Maximize2, Minimize2, Sparkles, Compass, Ruler, Building,
  Grid3X3, Box, ZoomIn, ZoomOut, RotateCcw, Download, Printer, Palette,
  Armchair, Move, Check, Crosshair, ChevronDown, RefreshCw, Sun, Moon,
  Workflow, Cpu, Briefcase, Warehouse, Users, DoorOpen
} from "lucide-react";
import BOQ3DModelViewer from "./BOQ3DModelViewer";

interface Props {
  params: BOQParameters;
  ifcStoreys?: IFCStorey[];
}

type ViewMode = "plan" | "elevation" | "section" | "3d" | "all";
type ThemeMode = "presentation" | "blueprint" | "white" | "dark";

export default function BOQAutoPlanVisualizer({ params, ifcStoreys }: Props) {
  // Navigation & Viewport Modes
  const [viewMode, setViewMode] = useState<ViewMode>("plan");
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Pan & Zoom Engine for 2D Plan
  const [planZoom, setPlanZoom] = useState(1);
  const [planPan, setPlanPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // CAD Layer Visibility Toggles
  const [showDimensions, setShowDimensions] = useState(true);
  const [showRoomLabels, setShowRoomLabels] = useState(true);
  const [showFurniture, setShowFurniture] = useState(true);
  const [showColumnGrid, setShowColumnGrid] = useState(true);
  const [showBeams, setShowBeams] = useState(true);
  const [showHatching, setShowHatching] = useState(true);
  const [showCompass, setShowCompass] = useState(true);

  // Drawing Theme Mode
  const [drawingTheme, setDrawingTheme] = useState<ThemeMode>("presentation");

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  // Mouse wheel scroll zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setPlanZoom((prev) => {
      const next = Math.max(0.4, Math.min(4.5, prev * zoomFactor));
      return Number(next.toFixed(2));
    });
  };

  // Mouse drag pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - planPan.x, y: e.clientY - planPan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPlanPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setPlanZoom(1);
    setPlanPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setPlanZoom((prev) => Math.min(4.5, Number((prev + 0.2).toFixed(2))));
  };

  const handleZoomOut = () => {
    setPlanZoom((prev) => Math.max(0.4, Number((prev - 0.2).toFixed(2))));
  };

  // Export SVG utility
  const handleExportSVG = () => {
    const svgEl = document.getElementById("cad-floor-plan-svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Architectural_CAD_Plan_Level_${activeFloorIndex + 1}_${params.outer_length || 12}x${params.outer_width || 9}m.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print CAD Plan utility
  const handlePrintPlan = () => {
    const svgEl = document.getElementById("cad-floor-plan-svg");
    if (!svgEl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>2D CAD Architectural Floor Plan - Level ${activeFloorIndex + 1}</title>
          <style>
            body { margin: 0; padding: 24px; font-family: 'Inter', system-ui, sans-serif; background: white; color: black; display: flex; flex-direction: column; align-items: center; }
            .sheet-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; width: 100%; max-width: 960px; display: flex; justify-content: space-between; }
            .sheet-title { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; }
            .sheet-meta { font-size: 11px; color: #475569; margin-top: 4px; }
            .svg-wrap { width: 100%; max-width: 960px; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #0b132b; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            svg { width: 100%; height: auto; }
            .title-block { margin-top: 16px; width: 100%; max-width: 960px; border: 2px solid #000; padding: 14px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="sheet-header">
            <div>
              <div class="sheet-title">ARCHITECTURAL 2D CAD WORKING DRAWING</div>
              <div class="sheet-meta">Building Dimensions: ${params.outer_length || 12}m × ${params.outer_width || 9}m | Built-up Footprint: ${((params.outer_length || 12) * (params.outer_width || 9)).toFixed(1)} m²</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 900; font-size: 15px;">${ifcStoreys?.[activeFloorIndex]?.name || `Level ${activeFloorIndex + 1}`}</div>
              <div class="sheet-meta">Scale 1:100 @ A3 · IS 1200 / CPWD DSR 2023 Compliant</div>
            </div>
          </div>
          <div class="svg-wrap">
            ${svgEl.outerHTML}
          </div>
          <div class="title-block">
            <div><strong>Project:</strong> Commercial & Residential BIM Estimation Studio<br><span style="color:#64748b">Structural Framing & Architectural Layout Plan</span></div>
            <div><strong>Storey Level:</strong> +${(activeFloorIndex * (params.floor_height || 3.0)).toFixed(1)}m Elevation<br><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN")}</div>
            <div><strong>Drawing Status:</strong> APPROVED FOR EXECUTION<br><strong>Standard:</strong> NBC 2016 / CPWD</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const {
    outer_length: length = 12,
    outer_width: width = 9,
    floor_height: floorHeight = 3.0,
    num_floors: numFloors = 2,
    outer_wall_thickness_mm: outerWallMm = 230,
    inner_wall_thickness_mm: innerWallMm = 115,
    plinth_height: plinthHeight = 0.6,
    excavation_depth: excavationDepth = 1.5,
    typology = "g1_residential",
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

  // Typology classification
  const isCommercial = typology === "multi_storey_rcc" || footprintSqm >= 250;
  const isIndustrial = typology === "compound_wall" || typology === "retaining_wall" || typology === "internal_road_bt" || typology === "internal_road_cc" || typology === "rcc_drain";
  const isSanitary = typology === "toilet_block" || typology === "septic_tank" || typology === "bathroom_renovation";
  const isResidential = !isCommercial && !isIndustrial && !isSanitary;

  // Concrete & Steel volume thumb-rule estimate (NBC / IS 456)
  const estRccVolume = Number((totalBuaSqm * 0.165).toFixed(1));
  const estSteelTonnes = Number(((estRccVolume * 128) / 1000).toFixed(2));

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SMART ADAPTIVE ARCHITECTURAL & STRUCTURAL 2D PLAN ENGINE
  // ─────────────────────────────────────────────────────────────────────────
  const planSvg = useMemo(() => {
    const svgW = 820;
    const svgH = 540;
    const pad = 72;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / length, availH / width);
    const drawW = length * scale;
    const drawH = width * scale;
    const startX = (svgW - drawW) / 2;
    const startY = (svgH - drawH) / 2;

    const wallThkPx = Math.max(6, (outerWallMm / 1000) * scale);
    const innerWallThkPx = Math.max(3.5, (innerWallMm / 1000) * scale);
    const colSize = Math.max(12, 0.38 * scale);
    const beamThkPx = Math.max(5, 0.25 * scale); // 250mm beam width

    // Columns nodes
    const columns = [];
    for (let i = 0; i <= xBays; i++) {
      for (let j = 0; j <= yBays; j++) {
        const cx = startX + i * (drawW / xBays);
        const cy = startY + j * (drawH / yBays);
        columns.push({
          x: cx - colSize / 2,
          y: cy - colSize / 2,
          cx,
          cy,
          colIdx: `C${j + 1}-${i + 1}`,
        });
      }
    }

    // Theme palette mappings
    const isPresentation = drawingTheme === "presentation";
    const isBlueprint = drawingTheme === "blueprint";
    const isWhite = drawingTheme === "white";

    const themeBg = isPresentation ? "#0b132b" : isBlueprint ? "#0b132b" : isWhite ? "#ffffff" : "#090d16";
    const themeGrid = isPresentation ? "#1c2541" : isBlueprint ? "#1c2541" : isWhite ? "#e2e8f0" : "#1e293b";
    const themeWallStroke = isPresentation ? "#38bdf8" : isBlueprint ? "#38bdf8" : isWhite ? "#0f172a" : "#e2e8f0";
    const themeWallFill = isPresentation ? "#1e293b" : isBlueprint ? "#1e293b" : isWhite ? "#e2e8f0" : "#1e293b";
    const themeRoomFloor = isPresentation ? "#111c38" : isBlueprint ? "#0d1b2a" : isWhite ? "#f8fafc" : "#0d1117";
    const themeBedFloor = isPresentation ? "#162347" : isBlueprint ? "#102035" : isWhite ? "#f1f5f9" : "#111827";
    const themeBathFloor = isPresentation ? "#0e2a47" : isBlueprint ? "#0e2a47" : isWhite ? "#f0fdf4" : "#0b1c2d";
    const themeCorridorFloor = isPresentation ? "#1e293b" : isBlueprint ? "#132238" : isWhite ? "#f1f5f9" : "#131b26";
    const themeTextPrimary = isPresentation ? "#ffffff" : isBlueprint ? "#f0f9ff" : isWhite ? "#0f172a" : "#f8fafc";
    const themeTextSecondary = isPresentation ? "#94a3b8" : isBlueprint ? "#94a3b8" : isWhite ? "#64748b" : "#94a3b8";
    const themeAccent = isPresentation ? "#38bdf8" : isBlueprint ? "#38bdf8" : isWhite ? "#2563eb" : "#60a5fa";
    const themeFurniture = isPresentation ? "#93c5fd" : isBlueprint ? "#60a5fa" : isWhite ? "#475569" : "#a5d6ff";
    const themeBeam = isPresentation ? "#0284c7" : isBlueprint ? "#38bdf8" : isWhite ? "#0284c7" : "#38bdf8";

    const isRoof = activeFloorIndex >= numFloors;
    const isUpperFloor = activeFloorIndex > 0 && activeFloorIndex < numFloors;

    // Grid coordinates
    const bayW = drawW / xBays;
    const bayH = drawH / yBays;

    // Architectural division coordinates (for procedural fallback)
    const splitX = startX + drawW * 0.50;
    const midY = startY + drawH * 0.52;
    const stairX = startX + drawW * 0.74;

    // ── Check if current storey has REAL IFC geometry ──────────────────────
    const activeStorey: IFCStorey | undefined = ifcStoreys?.[activeFloorIndex];
    const ifcRooms   = activeStorey?.rooms   ?? [];
    const ifcWalls   = activeStorey?.walls   ?? [];
    const ifcDoors   = activeStorey?.doors   ?? [];
    const ifcWindows = activeStorey?.windows ?? [];
    const hasRealGeom = ifcRooms.length > 0 || ifcWalls.length > 0;

    // Room-type color map for IFC-extracted spaces
    const roomFillMap: Record<IFCRoom["roomType"], string> = {
      living:   isPresentation ? "#1a3a5c" : isWhite ? "#eff6ff" : "#1e3a5f",
      bedroom:  isPresentation ? "#1e3347" : isWhite ? "#f0fdf4" : "#1a2e3d",
      kitchen:  isPresentation ? "#2d2a1a" : isWhite ? "#fefce8" : "#2a2316",
      bathroom: isPresentation ? "#0f2e3a" : isWhite ? "#ecfdf5" : "#0d2530",
      corridor: isPresentation ? "#1a2030" : isWhite ? "#f8fafc" : "#151d28",
      stair:    isPresentation ? "#1f1a30" : isWhite ? "#faf5ff" : "#1b1728",
      office:   isPresentation ? "#1a2840" : isWhite ? "#eff6ff" : "#16243c",
      lobby:    isPresentation ? "#1f2535" : isWhite ? "#f8fafc" : "#1a2030",
      meeting:  isPresentation ? "#1e2d40" : isWhite ? "#eff6ff" : "#192638",
      toilet:   isPresentation ? "#0f2e3a" : isWhite ? "#ecfdf5" : "#0d2530",
      utility:  isPresentation ? "#1a1f2a" : isWhite ? "#f1f5f9" : "#151a24",
      unknown:  isPresentation ? "#151d2e" : isWhite ? "#f8fafc" : "#111827",
    };
    const roomIconMap: Record<IFCRoom["roomType"], string> = {
      living: "🛋", bedroom: "🛏", kitchen: "🍳", bathroom: "🚿",
      corridor: "↔", stair: "↕", office: "💼", lobby: "🏛",
      meeting: "📋", toilet: "🚻", utility: "🔧", unknown: "□",
    };

    return (
      <svg
        id="cad-floor-plan-svg"
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto select-none transition-colors duration-200"
        style={{ background: themeBg }}
      >
        <defs>
          <pattern id="cadGridAdv2" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={themeGrid} strokeWidth="0.75" />
          </pattern>
          <pattern id="brickHatchCADAdv2" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke={themeWallStroke} strokeOpacity="0.3" strokeWidth="1.2" />
          </pattern>
          <pattern id="marbleTilePattern2" width="36" height="18" patternUnits="userSpaceOnUse">
            <rect width="36" height="18" fill="none" stroke={themeGrid} strokeOpacity="0.45" strokeWidth="0.6" />
          </pattern>
          <pattern id="woodParquetPattern2" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 24 0 M 0 6 L 24 6 M 0 12 L 24 12 M 0 18 L 24 18 M 12 0 L 12 24" fill="none" stroke={themeGrid} strokeOpacity="0.4" strokeWidth="0.5" />
          </pattern>
          <pattern id="bathTilePattern2" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="none" stroke="#0284c7" strokeOpacity="0.25" strokeWidth="0.4" />
          </pattern>
          <pattern id="corridorPattern" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="none" stroke={themeGrid} strokeOpacity="0.3" strokeWidth="0.4" />
          </pattern>
          <linearGradient id="solarAdvGradient2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <filter id="furnitureGlow2" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ── Background Architectural Grid ── */}
        <rect width={svgW} height={svgH} fill="url(#cadGridAdv2)" />

        {/* ── Outer Perimeter Walls (230mm Masonry) ── */}
        <rect
          x={startX}
          y={startY}
          width={drawW}
          height={drawH}
          fill={showHatching ? "url(#brickHatchCADAdv2)" : themeWallFill}
          stroke={themeWallStroke}
          strokeWidth={wallThkPx}
          rx="2"
        />

        {/* ── IFC REAL GEOMETRY: Room fills from IFCSPACE ── */}
        {hasRealGeom && !isRoof && (
          <g>
            {ifcRooms.map((room) => {
              const fill = roomFillMap[room.roomType];
              const icon = roomIconMap[room.roomType];
              const labelW = Math.min(room.w - 6, 120);
              return (
                <g key={room.id}>
                  {/* Room floor fill */}
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.w}
                    height={room.h}
                    fill={fill}
                    stroke={themeWallStroke}
                    strokeWidth="0.5"
                    strokeOpacity="0.3"
                  />
                  {/* Tile/texture overlay */}
                  {room.roomType === "bathroom" || room.roomType === "toilet" ? (
                    <rect x={room.x} y={room.y} width={room.w} height={room.h} fill="url(#bathTilePattern2)" />
                  ) : room.roomType === "corridor" || room.roomType === "lobby" ? (
                    <rect x={room.x} y={room.y} width={room.w} height={room.h} fill="url(#corridorPattern)" />
                  ) : room.roomType === "bedroom" ? (
                    <rect x={room.x} y={room.y} width={room.w} height={room.h} fill="url(#woodParquetPattern2)" />
                  ) : (
                    <rect x={room.x} y={room.y} width={room.w} height={room.h} fill="url(#marbleTilePattern2)" />
                  )}
                  {/* Room name label */}
                  {showRoomLabels && room.w > 40 && room.h > 28 && (
                    <g transform={`translate(${room.x + room.w / 2}, ${room.y + room.h / 2})`}>
                      <rect
                        x={-labelW / 2}
                        y="-18"
                        width={labelW}
                        height="32"
                        fill={themeBg}
                        fillOpacity="0.82"
                        rx="4"
                        stroke={themeAccent}
                        strokeWidth="0.7"
                      />
                      <text textAnchor="middle" y="-5" fill={themeTextPrimary} fontSize="9" fontWeight="900">
                        {icon} {room.name.length > 18 ? room.name.slice(0, 17) + "…" : room.name}
                      </text>
                      <text textAnchor="middle" y="9" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">
                        {room.area_m2.toFixed(1)} m²
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* ── IFC REAL GEOMETRY: Wall segments from IFCWALL ── */}
        {hasRealGeom && !isRoof && (
          <g>
            {ifcWalls.map((wall) => {
              const dx = wall.x2 - wall.x1;
              const dy = wall.y2 - wall.y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len < 2) return null;
              const angle = Math.atan2(dy, dx) * 180 / Math.PI;
              const thk = wall.thicknessPx;
              return (
                <g key={wall.id} transform={`translate(${wall.x1},${wall.y1}) rotate(${angle})`}>
                  {/* Wall body */}
                  <rect
                    x={0}
                    y={-thk / 2}
                    width={len}
                    height={thk}
                    fill={wall.isExternal
                      ? (showHatching ? "url(#brickHatchCADAdv2)" : themeWallFill)
                      : themeWallFill}
                    stroke={themeWallStroke}
                    strokeWidth={wall.isExternal ? "1.6" : "1"}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* ── IFC REAL GEOMETRY: Door openings ── */}
        {hasRealGeom && !isRoof && (
          <g>
            {ifcDoors.map((door, idx) => (
              <g key={`ifc-door-${idx}`} transform={`translate(${door.x}, ${door.y}) rotate(${door.angle})`}>
                {/* Clear opening */}
                <rect x={0} y={-wallThkPx / 2} width={door.width} height={wallThkPx} fill={themeBg} />
                {/* Door leaf */}
                <line x1={0} y1={0} x2={0} y2={-door.width} stroke="#d97706" strokeWidth="2" />
                {/* Swing arc */}
                <path
                  d={`M 0 0 A ${door.width} ${door.width} 0 0 1 ${door.width} 0`}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="1"
                  strokeDasharray="3,2"
                />
                {/* Jamb blocks */}
                <rect x={-1} y={-wallThkPx / 2} width="3" height={wallThkPx} fill="#d97706" />
                <rect x={door.width - 2} y={-wallThkPx / 2} width="3" height={wallThkPx} fill="#d97706" />
              </g>
            ))}
          </g>
        )}

        {/* ── IFC REAL GEOMETRY: Window openings ── */}
        {hasRealGeom && !isRoof && (
          <g>
            {ifcWindows.map((win, idx) => (
              <g key={`ifc-win-${idx}`} transform={`translate(${win.x}, ${win.y}) rotate(${win.wallAngle})`}>
                {/* Clear opening */}
                <rect x={0} y={-wallThkPx / 2} width={win.width} height={wallThkPx} fill={themeBg} />
                {/* Glazing panes */}
                <rect x={0} y={-wallThkPx / 2} width={win.width} height={wallThkPx}
                  fill="#38bdf8" fillOpacity="0.22" stroke="#38bdf8" strokeWidth="1.6" />
                <line x1={win.width / 2} y1={-wallThkPx / 2} x2={win.width / 2} y2={wallThkPx / 2}
                  stroke="#38bdf8" strokeWidth="1" />
                {/* Exterior chajja dashed line */}
                <line x1={-4} y1={-wallThkPx / 2 - 5} x2={win.width + 4} y2={-wallThkPx / 2 - 5}
                  stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,2" />
              </g>
            ))}
          </g>
        )}

        {/* ── IFC geometry source badge ── */}
        {hasRealGeom && (
          <g transform={`translate(${startX + 8}, ${startY + 8})`}>
            <rect x="0" y="0" width="148" height="18" fill="#7c3aed" fillOpacity="0.85" rx="4" />
            <text x="74" y="12.5" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900">
              ✦ REAL IFC GEOMETRY · {ifcRooms.length} Rooms · {ifcWalls.length} Walls
            </text>
          </g>
        )}

        {/* ── STRUCTURAL BEAMS NETWORK (PRIMARY & SECONDARY RCC BEAMS) ── */}
        {showBeams && (
          <g opacity="0.85">
            {/* Horizontal Primary Beams PB along Y-Axes (Connecting Column Nodes) */}
            {Array.from({ length: yBays + 1 }).map((_, j) => {
              const yPos = startY + j * bayH;
              return (
                <g key={`h-beam-${j}`}>
                  <rect
                    x={startX}
                    y={yPos - beamThkPx / 2}
                    width={drawW}
                    height={beamThkPx}
                    fill={themeBeam}
                    fillOpacity="0.14"
                    stroke={themeBeam}
                    strokeWidth="0.9"
                    strokeDasharray="4,2"
                  />
                  {Array.from({ length: xBays }).map((_, i) => {
                    const bx = startX + (i + 0.5) * bayW;
                    return (
                      <text
                        key={`b-tag-h-${j}-${i}`}
                        x={bx}
                        y={yPos + 2.5}
                        textAnchor="middle"
                        fill={themeBeam}
                        fontSize="6"
                        fontWeight="900"
                      >
                        PB{j + 1} (250×450)
                      </text>
                    );
                  })}
                </g>
              );
            })}

            {/* Vertical Primary Beams PB along X-Axes (Connecting Column Nodes) */}
            {Array.from({ length: xBays + 1 }).map((_, i) => {
              const xPos = startX + i * bayW;
              return (
                <g key={`v-beam-${i}`}>
                  <rect
                    x={xPos - beamThkPx / 2}
                    y={startY}
                    width={beamThkPx}
                    height={drawH}
                    fill={themeBeam}
                    fillOpacity="0.14"
                    stroke={themeBeam}
                    strokeWidth="0.9"
                    strokeDasharray="4,2"
                  />
                  {Array.from({ length: yBays }).map((_, j) => {
                    const by = startY + (j + 0.5) * bayH;
                    return (
                      <text
                        key={`b-tag-v-${i}-${j}`}
                        x={xPos}
                        y={by}
                        textAnchor="middle"
                        fill={themeBeam}
                        fontSize="6"
                        fontWeight="900"
                        transform={`rotate(-90 ${xPos} ${by})`}
                      >
                        PB{i + 1} (250×450)
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </g>
        )}

        {/* ── DYNAMIC TYPOLOGY-SPECIFIC ARCHITECTURAL SPATIAL LAYOUTS ── */}
        {/* Only shown when no real IFC geometry has been extracted from the file */}
        {!isRoof && !hasRealGeom && (
          <g filter={isPresentation ? "url(#furnitureGlow2)" : undefined}>
            {isCommercial ? (
              /* ═════════════════════════════════════════════════════════════════
                 1. COMMERCIAL OFFICE / MULTI-STOREY CORPORATE FLOOR PLAN
                 ═════════════════════════════════════════════════════════════════ */
              <g>
                {/* Central Circulation Corridor */}
                <rect
                  x={startX + wallThkPx / 2}
                  y={startY + drawH * 0.40}
                  width={drawW - wallThkPx}
                  height={drawH * 0.20}
                  fill={themeCorridorFloor}
                />
                <rect
                  x={startX + wallThkPx / 2}
                  y={startY + drawH * 0.40}
                  width={drawW - wallThkPx}
                  height={drawH * 0.20}
                  fill="url(#corridorPattern)"
                />

                {/* Corridor Partition Walls */}
                <line x1={startX} y1={startY + drawH * 0.40} x2={startX + drawW} y2={startY + drawH * 0.40} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />
                <line x1={startX} y1={startY + drawH * 0.60} x2={startX + drawW} y2={startY + drawH * 0.60} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />

                {/* Vertical Partitions for Executive Cabins (Top Row) */}
                <line x1={startX + drawW * 0.32} y1={startY} x2={startX + drawW * 0.32} y2={startY + drawH * 0.40} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />
                <line x1={startX + drawW * 0.68} y1={startY} x2={startX + drawW * 0.68} y2={startY + drawH * 0.40} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />

                {/* Vertical Partitions for Core & Workstations (Bottom Row) */}
                <line x1={startX + drawW * 0.38} y1={startY + drawH * 0.60} x2={startX + drawW * 0.38} y2={startY + drawH} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />
                <line x1={startX + drawW * 0.70} y1={startY + drawH * 0.60} x2={startX + drawW * 0.70} y2={startY + drawH} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />

                {/* ── Commercial Interiors (Furniture) ── */}
                {showFurniture && (
                  <g>
                    {/* Cabin 1: Executive Director */}
                    <g transform={`translate(${startX + 20}, ${startY + 20})`}>
                      <rect x="0" y="0" width="48" height="24" fill={themeBg} stroke={themeFurniture} strokeWidth="1.2" rx="2" />
                      <circle cx="24" cy="34" r="5" fill={themeFurniture} opacity="0.6" />
                      <circle cx="12" cy="-6" r="4" fill={themeFurniture} opacity="0.4" />
                      <circle cx="36" cy="-6" r="4" fill={themeFurniture} opacity="0.4" />
                      <rect x="56" y="0" width="10" height="40" fill={themeFurniture} opacity="0.2" stroke={themeFurniture} strokeWidth="0.8" />
                    </g>

                    {/* Cabin 2: Main Boardroom / Conference (Top Mid) */}
                    <g transform={`translate(${startX + drawW * 0.36}, ${startY + 16})`}>
                      <rect width="110" height="42" fill={themeBg} stroke={themeFurniture} strokeWidth="1.4" rx="10" />
                      {/* Conference Chairs Around Table */}
                      {Array.from({ length: 5 }).map((_, i) => (
                        <circle key={`conf-t-${i}`} cx={16 + i * 20} cy="-6" r="4" fill={themeFurniture} opacity="0.5" />
                      ))}
                      {Array.from({ length: 5 }).map((_, i) => (
                        <circle key={`conf-b-${i}`} cx={16 + i * 20} cy="48" r="4" fill={themeFurniture} opacity="0.5" />
                      ))}
                      <rect x="25" y="14" width="60" height="14" fill={themeAccent} fillOpacity="0.15" stroke={themeAccent} strokeWidth="0.8" rx="2" />
                      <text x="55" y="24" textAnchor="middle" fill={themeAccent} fontSize="7" fontWeight="bold">AV SCREEN</text>
                    </g>

                    {/* Cabin 3: Server & IT Rack Room (Top Right) */}
                    <g transform={`translate(${startX + drawW * 0.72}, ${startY + 16})`}>
                      <rect x="0" y="0" width="22" height="38" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.2" rx="1" />
                      <line x1="0" y1="12" x2="22" y2="12" stroke="#0ea5e9" strokeWidth="0.6" />
                      <line x1="0" y1="24" x2="22" y2="24" stroke="#0ea5e9" strokeWidth="0.6" />
                      <circle cx="5" cy="6" r="1.5" fill="#10b981" />
                      <circle cx="5" cy="18" r="1.5" fill="#10b981" />
                      <rect x="28" y="0" width="22" height="38" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.2" rx="1" />
                    </g>

                    {/* Zone 4: Open Plan Modular Workstation Matrix (Bottom Left) */}
                    <g transform={`translate(${startX + 18}, ${startY + drawH * 0.64})`}>
                      {Array.from({ length: 3 }).map((_, row) => (
                        <g key={`wrow-${row}`} transform={`translate(0, ${row * 26})`}>
                          <rect width="88" height="18" fill={themeBg} stroke={themeFurniture} strokeWidth="1" rx="1" />
                          <line x1="44" y1="0" x2="44" y2="18" stroke={themeFurniture} strokeWidth="0.8" />
                          <circle cx="22" cy="9" r="3.5" fill={themeFurniture} opacity="0.6" />
                          <circle cx="66" cy="9" r="3.5" fill={themeFurniture} opacity="0.6" />
                        </g>
                      ))}
                    </g>

                    {/* Zone 5: Central Lift Core & Elevators (Bottom Mid) */}
                    <g transform={`translate(${startX + drawW * 0.42}, ${startY + drawH * 0.64})`}>
                      {/* Lift 1 */}
                      <rect x="0" y="0" width="34" height="42" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.4" rx="2" />
                      <line x1="0" y1="0" x2="34" y2="42" stroke="#f59e0b" strokeWidth="0.6" opacity="0.4" />
                      <line x1="34" y1="0" x2="0" y2="42" stroke="#f59e0b" strokeWidth="0.6" opacity="0.4" />
                      <text x="17" y="24" textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="bold">LIFT 1</text>

                      {/* Lift 2 */}
                      <rect x="40" y="0" width="34" height="42" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.4" rx="2" />
                      <line x1="40" y1="0" x2="74" y2="42" stroke="#f59e0b" strokeWidth="0.6" opacity="0.4" />
                      <line x1="74" y1="0" x2="40" y2="42" stroke="#f59e0b" strokeWidth="0.6" opacity="0.4" />
                      <text x="57" y="24" textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="bold">LIFT 2</text>
                    </g>

                    {/* Zone 6: Restroom Core (Bottom Right) */}
                    <g transform={`translate(${startX + drawW * 0.74}, ${startY + drawH * 0.64})`}>
                      <rect x="0" y="0" width="16" height="24" fill={themeBg} stroke="#10b981" strokeWidth="0.9" rx="1" />
                      <ellipse cx="8" cy="12" rx="5" ry="6" fill="none" stroke="#10b981" strokeWidth="0.8" />
                      <rect x="22" y="0" width="16" height="24" fill={themeBg} stroke="#10b981" strokeWidth="0.9" rx="1" />
                      <ellipse cx="30" cy="12" rx="5" ry="6" fill="none" stroke="#10b981" strokeWidth="0.8" />
                      <rect x="44" y="0" width="22" height="46" fill={themeBg} stroke="#10b981" strokeWidth="1" rx="2" />
                      <circle cx="55" cy="14" r="4" fill="none" stroke="#10b981" strokeWidth="0.7" />
                      <circle cx="55" cy="32" r="4" fill="none" stroke="#10b981" strokeWidth="0.7" />
                    </g>
                  </g>
                )}
              </g>
            ) : isSanitary ? (
              /* ═════════════════════════════════════════════════════════════════
                 2. SANITARY & TOILET BLOCK SPECIALIZED LAYOUT
                 ═════════════════════════════════════════════════════════════════ */
              <g>
                {/* Center Divider Wall between Gents & Ladies */}
                <line x1={startX + drawW * 0.50} y1={startY} x2={startX + drawW * 0.50} y2={startY + drawH} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />

                {/* Gents Cubicles (Left) */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <g key={`gents-cub-${i}`} transform={`translate(${startX + 16 + i * (drawW * 0.10)}, ${startY + 16})`}>
                    <rect width={drawW * 0.09} height={drawH * 0.32} fill={themeBg} stroke="#10b981" strokeWidth="1" rx="1" />
                    <ellipse cx={drawW * 0.045} cy={drawH * 0.16} rx="6" ry="8" fill="none" stroke="#10b981" strokeWidth="0.8" />
                  </g>
                ))}

                {/* Ladies Cubicles (Right) */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <g key={`ladies-cub-${i}`} transform={`translate(${startX + drawW * 0.54 + i * (drawW * 0.10)}, ${startY + 16})`}>
                    <rect width={drawW * 0.09} height={drawH * 0.32} fill={themeBg} stroke="#ec4899" strokeWidth="1" rx="1" />
                    <ellipse cx={drawW * 0.045} cy={drawH * 0.16} rx="6" ry="8" fill="none" stroke="#ec4899" strokeWidth="0.8" />
                  </g>
                ))}
              </g>
            ) : (
              /* ═════════════════════════════════════════════════════════════════
                 3. RESIDENTIAL VILLA / MULTI-ROOM APARTMENT LAYOUT
                 ═════════════════════════════════════════════════════════════════ */
              <g>
                {/* Main Spatial Partition Walls */}
                <line x1={splitX} y1={startY} x2={splitX} y2={startY + drawH} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />
                <line x1={splitX} y1={midY} x2={startX + drawW} y2={midY} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />
                <line x1={stairX} y1={midY} x2={stairX} y2={startY + drawH} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />
                <line x1={startX + drawW * 0.22} y1={startY + drawH} x2={startX + drawW * 0.22} y2={startY + drawH * 0.72} stroke={themeWallStroke} strokeWidth={innerWallThkPx} />

                {/* ── Residential Furniture ── */}
                {showFurniture && (
                  <g>
                    {/* Living Lounge */}
                    <g transform={`translate(${startX + 24}, ${startY + 26})`}>
                      <rect x="0" y="0" width="94" height="28" fill={themeBg} stroke={themeFurniture} strokeWidth="1.4" rx="3" />
                      <rect x="0" y="28" width="32" height="48" fill={themeBg} stroke={themeFurniture} strokeWidth="1.4" rx="3" />
                      <line x1="32" y1="0" x2="32" y2="28" stroke={themeFurniture} strokeWidth="0.7" opacity="0.5" />
                      <line x1="63" y1="0" x2="63" y2="28" stroke={themeFurniture} strokeWidth="0.7" opacity="0.5" />
                      <rect x="42" y="38" width="40" height="24" fill={themeBg} stroke={themeFurniture} strokeWidth="1.2" rx="3" />
                      <rect x="0" y="98" width="86" height="10" fill={themeFurniture} fillOpacity="0.2" stroke={themeFurniture} strokeWidth="1" rx="1" />
                      <rect x="12" y="101" width="62" height="4" fill={themeAccent} rx="1" />
                      <circle cx="-10" cy="103" r="7" fill="#10b981" opacity="0.7" />
                    </g>

                    {/* Dining Hall */}
                    <g transform={`translate(${startX + 28}, ${midY + 28})`}>
                      <rect x="12" y="10" width="68" height="34" fill={themeBg} stroke={themeFurniture} strokeWidth="1.4" rx="3" />
                      <circle cx="46" cy="27" r="5" fill="none" stroke={themeAccent} strokeWidth="0.8" />
                      <circle cx="46" cy="27" r="2" fill={themeAccent} />
                      <rect x="20" y="0" width="14" height="8" fill={themeFurniture} fillOpacity="0.3" stroke={themeFurniture} strokeWidth="0.8" rx="1.5" />
                      <rect x="52" y="0" width="14" height="8" fill={themeFurniture} fillOpacity="0.3" stroke={themeFurniture} strokeWidth="0.8" rx="1.5" />
                      <rect x="20" y="46" width="14" height="8" fill={themeFurniture} fillOpacity="0.3" stroke={themeFurniture} strokeWidth="0.8" rx="1.5" />
                      <rect x="52" y="46" width="14" height="8" fill={themeFurniture} fillOpacity="0.3" stroke={themeFurniture} strokeWidth="0.8" rx="1.5" />
                      <rect x="0" y="20" width="8" height="14" fill={themeFurniture} fillOpacity="0.3" stroke={themeFurniture} strokeWidth="0.8" rx="1.5" />
                      <rect x="84" y="20" width="8" height="14" fill={themeFurniture} fillOpacity="0.3" stroke={themeFurniture} strokeWidth="0.8" rx="1.5" />
                    </g>

                    {/* Master Suite Bed */}
                    <g transform={`translate(${splitX + 22}, ${startY + 24})`}>
                      <rect width="72" height="84" fill={themeBg} stroke={themeFurniture} strokeWidth="1.5" rx="3" />
                      <rect x="0" y="0" width="72" height="12" fill={themeFurniture} fillOpacity="0.35" stroke={themeFurniture} strokeWidth="1" />
                      <rect x="8" y="16" width="24" height="16" fill={themeBg} stroke={themeFurniture} strokeWidth="0.9" rx="2" />
                      <rect x="40" y="16" width="24" height="16" fill={themeBg} stroke={themeFurniture} strokeWidth="0.9" rx="2" />
                      <rect x="-14" y="6" width="12" height="16" fill={themeBg} stroke={themeFurniture} strokeWidth="1" rx="1.5" />
                      <rect x="74" y="6" width="12" height="16" fill={themeBg} stroke={themeFurniture} strokeWidth="1" rx="1.5" />
                      <rect x="0" y="104" width="80" height="16" fill={themeBg} stroke={themeFurniture} strokeWidth="1.2" rx="1" />
                      <text x="40" y="115" textAnchor="middle" fill={themeTextSecondary} fontSize="7" fontWeight="bold">WARDROBE</text>
                    </g>

                    {/* Kitchen */}
                    <g transform={`translate(${splitX + 16}, ${midY + 16})`}>
                      <rect x="0" y="0" width="80" height="22" fill={themeFurniture} fillOpacity="0.18" stroke={themeFurniture} strokeWidth="1.2" />
                      <rect x="58" y="22" width="22" height="48" fill={themeFurniture} fillOpacity="0.18" stroke={themeFurniture} strokeWidth="1.2" />
                      <rect x="8" y="3" width="22" height="16" fill={themeBg} stroke={themeAccent} strokeWidth="0.9" rx="1" />
                      <circle cx="19" cy="11" r="2.5" fill={themeAccent} />
                      <rect x="36" y="3" width="20" height="16" fill={themeBg} stroke="#f97316" strokeWidth="0.9" rx="1" />
                      <circle cx="41" cy="7" r="2" fill="#f97316" opacity="0.7" />
                      <circle cx="51" cy="7" r="2" fill="#f97316" opacity="0.7" />
                      <rect x="60" y="44" width="18" height="24" fill={themeBg} stroke={themeFurniture} strokeWidth="1.2" rx="2" />
                      <text x="69" y="58" textAnchor="middle" fill={themeTextSecondary} fontSize="6.5" fontWeight="900">FRIDGE</text>
                    </g>

                    {/* Bathroom */}
                    <g transform={`translate(${stairX - 38}, ${midY + 24})`}>
                      <rect x="0" y="0" width="24" height="24" fill="#0284c7" fillOpacity="0.15" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,1" />
                      <circle cx="12" cy="12" r="3" fill="#0284c7" />
                      <rect x="0" y="30" width="16" height="7" fill={themeBg} stroke="#10b981" strokeWidth="0.9" rx="1" />
                      <ellipse cx="8" cy="43" rx="7" ry="8" fill={themeBg} stroke="#10b981" strokeWidth="1" />
                      <rect x="0" y="58" width="20" height="15" fill={themeBg} stroke="#10b981" strokeWidth="1" rx="2" />
                    </g>
                  </g>
                )}
              </g>
            )}
          </g>
        )}

        {/* ── RCC Dog-Leg Staircase Flight with 18 Numbered Treads & Handrail ── */}
        {!isRoof && !isSanitary && !hasRealGeom && (
          <g opacity="0.92">
            <rect
              x={stairX + innerWallThkPx / 2}
              y={midY + innerWallThkPx / 2}
              width={startX + drawW - wallThkPx / 2 - stairX - innerWallThkPx / 2}
              height={startY + drawH - wallThkPx / 2 - midY - innerWallThkPx / 2}
              fill={themeFurniture}
              fillOpacity="0.08"
            />
            {[0.14, 0.25, 0.36, 0.47, 0.58, 0.69, 0.80, 0.91].map((ratio, idx) => {
              const stepY = midY + innerWallThkPx / 2 + (startY + drawH - wallThkPx / 2 - midY) * ratio;
              return (
                <g key={`stair-${idx}`}>
                  <line
                    x1={stairX + innerWallThkPx / 2}
                    y1={stepY}
                    x2={startX + drawW - wallThkPx / 2}
                    y2={stepY}
                    stroke={themeWallStroke}
                    strokeWidth="1.1"
                    strokeOpacity="0.5"
                  />
                  <text x={stairX + innerWallThkPx / 2 + 5} y={stepY - 2} fill={themeTextSecondary} fontSize="6" fontWeight="bold">
                    {idx + 1}
                  </text>
                </g>
              );
            })}
            <line
              x1={(stairX + startX + drawW) / 2}
              y1={midY + innerWallThkPx / 2}
              x2={(stairX + startX + drawW) / 2}
              y2={startY + drawH - wallThkPx / 2}
              stroke={themeAccent}
              strokeWidth="1.8"
            />
            <text
              x={(stairX + startX + drawW) / 2 + 16}
              y={(midY + startY + drawH) / 2 + 3}
              textAnchor="middle"
              fill={themeAccent}
              fontSize="8.5"
              fontWeight="900"
              letterSpacing="0.08em"
            >
              UP ▲
            </text>
          </g>
        )}

        {/* ── Windows on Exterior Walls (Cyan Glazing + Exterior Chajja Line) ── */}
        {!hasRealGeom && (
          <g>
            {Array.from({ length: xBays }).map((_, i) => {
              const wx = startX + (i + 0.3) * bayW;
              return (
                <g key={`win-top-${i}`}>
                  <rect
                    x={wx}
                    y={startY - 2}
                    width={bayW * 0.45}
                    height={wallThkPx + 4}
                    fill={themeBg}
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                  />
                  <line x1={wx + bayW * 0.225} y1={startY - 2} x2={wx + bayW * 0.225} y2={startY + wallThkPx + 2} stroke="#38bdf8" strokeWidth="1" />
                  <line x1={wx - 4} y1={startY - 8} x2={wx + bayW * 0.45 + 4} y2={startY - 8} stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,2" />
                </g>
              );
            })}
          </g>
        )}

        {/* ── Main Entrance Door with Jambs & 90° Swing Arc ── */}
        {!hasRealGeom && (
          <g>
            <rect
              x={startX + drawW * 0.24}
              y={startY + drawH - wallThkPx - 1}
              width={drawW * 0.14}
              height={wallThkPx + 2}
              fill={themeBg}
            />
            <rect x={startX + drawW * 0.24} y={startY + drawH - wallThkPx} width="3" height={wallThkPx} fill="#d97706" />
            <rect x={startX + drawW * 0.38 - 3} y={startY + drawH - wallThkPx} width="3" height={wallThkPx} fill="#d97706" />
            <line
              x1={startX + drawW * 0.24}
              y1={startY + drawH - wallThkPx}
              x2={startX + drawW * 0.24}
              y2={startY + drawH - wallThkPx - drawW * 0.14}
              stroke="#d97706"
              strokeWidth="2"
            />
            <path
              d={`M ${startX + drawW * 0.24} ${startY + drawH - wallThkPx - drawW * 0.14} A ${drawW * 0.14} ${drawW * 0.14} 0 0 1 ${startX + drawW * 0.38} ${startY + drawH - wallThkPx}`}
              fill="none"
              stroke="#d97706"
              strokeWidth="1"
              strokeDasharray="3,2"
            />
            <text x={startX + drawW * 0.31} y={startY + drawH + 12} textAnchor="middle" fill="#d97706" fontSize="7.5" fontWeight="bold">MAIN ENTRY (D1)</text>
          </g>
        )}

        {/* ── RCC Column Blocks (350x350mm) with Crosshairs ── */}
        {showColumnGrid && columns.map((col, idx) => (
          <g key={idx}>
            <rect
              x={col.x}
              y={col.y}
              width={colSize}
              height={colSize}
              fill="#0f172a"
              stroke={themeAccent}
              strokeWidth="1.4"
              rx="1.5"
            />
            <line x1={col.x} y1={col.y} x2={col.x + colSize} y2={col.y + colSize} stroke="#ffffff" strokeWidth="0.7" opacity="0.7" />
            <line x1={col.x + colSize} y1={col.y} x2={col.x} y2={col.y + colSize} stroke="#ffffff" strokeWidth="0.7" opacity="0.7" />
          </g>
        ))}

        {/* ── Adaptive Room Labels (Procedural Fallback) ── */}
        {showRoomLabels && !hasRealGeom && (
          <g>
            {isRoof ? (
              <g transform={`translate(${startX + drawW / 2}, ${startY + drawH / 2})`}>
                <rect x="-90" y="-18" width="180" height="38" fill={themeBg} fillOpacity="0.88" rx="5" stroke={themeAccent} strokeWidth="0.8" />
                <text textAnchor="middle" y="-3" fill={themeTextPrimary} fontSize="12" fontWeight="900">
                  OPEN TERRACE & SOLAR ROOF
                </text>
                <text textAnchor="middle" y="11" fill={themeTextSecondary} fontSize="8.5" fontWeight="bold">
                  {footprintSqm.toFixed(1)} m² [{footprintSqft.toFixed(0)} sqft] · Waterproofed
                </text>
              </g>
            ) : isCommercial ? (
              <>
                <g transform={`translate(${startX + drawW * 0.16}, ${startY + drawH * 0.20})`}>
                  <rect x="-60" y="-14" width="120" height="30" fill={themeBg} fillOpacity="0.88" rx="4" stroke={themeAccent} strokeWidth="0.8" />
                  <text textAnchor="middle" y="-1" fill={themeTextPrimary} fontSize="10" fontWeight="900">DIRECTOR CABIN</text>
                  <text textAnchor="middle" y="10" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">{(footprintSqm * 0.14).toFixed(1)} m²</text>
                </g>
                <g transform={`translate(${startX + drawW * 0.50}, ${startY + drawH * 0.20})`}>
                  <rect x="-68" y="-14" width="136" height="30" fill={themeBg} fillOpacity="0.88" rx="4" stroke={themeAccent} strokeWidth="0.8" />
                  <text textAnchor="middle" y="-1" fill={themeTextPrimary} fontSize="10" fontWeight="900">BOARDROOM / CONF</text>
                  <text textAnchor="middle" y="10" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">{(footprintSqm * 0.18).toFixed(1)} m² (12-Seater)</text>
                </g>
                <g transform={`translate(${startX + drawW * 0.84}, ${startY + drawH * 0.20})`}>
                  <rect x="-56" y="-14" width="112" height="30" fill={themeBg} fillOpacity="0.88" rx="4" stroke={themeAccent} strokeWidth="0.8" />
                  <text textAnchor="middle" y="-1" fill={themeTextPrimary} fontSize="10" fontWeight="900">SERVER & IT ROOM</text>
                  <text textAnchor="middle" y="10" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">{(footprintSqm * 0.10).toFixed(1)} m²</text>
                </g>
                <g transform={`translate(${startX + drawW * 0.20}, ${startY + drawH * 0.80})`}>
                  <rect x="-64" y="-14" width="128" height="30" fill={themeBg} fillOpacity="0.88" rx="4" stroke={themeAccent} strokeWidth="0.8" />
                  <text textAnchor="middle" y="-1" fill={themeTextPrimary} fontSize="10" fontWeight="900">WORKSTATION BAY</text>
                  <text textAnchor="middle" y="10" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">{(footprintSqm * 0.28).toFixed(1)} m² (Open Plan)</text>
                </g>
                <g transform={`translate(${startX + drawW * 0.55}, ${startY + drawH * 0.80})`}>
                  <rect x="-56" y="-14" width="112" height="30" fill={themeBg} fillOpacity="0.88" rx="4" stroke="#f59e0b" strokeWidth="0.8" />
                  <text textAnchor="middle" y="-1" fill="#f59e0b" fontSize="10" fontWeight="900">ELEVATOR LOBBY</text>
                  <text textAnchor="middle" y="10" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">Dual Lift Core</text>
                </g>
              </>
            ) : isSanitary ? (
              <>
                <g transform={`translate(${startX + drawW * 0.25}, ${startY + drawH * 0.60})`}>
                  <rect x="-60" y="-14" width="120" height="30" fill={themeBg} fillOpacity="0.88" rx="4" stroke="#10b981" strokeWidth="0.8" />
                  <text textAnchor="middle" y="-1" fill="#10b981" fontSize="10" fontWeight="900">GENTS RESTROOM</text>
                  <text textAnchor="middle" y="10" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">4 WCs + 4 Urinals</text>
                </g>
                <g transform={`translate(${startX + drawW * 0.75}, ${startY + drawH * 0.60})`}>
                  <rect x="-60" y="-14" width="120" height="30" fill={themeBg} fillOpacity="0.88" rx="4" stroke="#ec4899" strokeWidth="0.8" />
                  <text textAnchor="middle" y="-1" fill="#ec4899" fontSize="10" fontWeight="900">LADIES RESTROOM</text>
                  <text textAnchor="middle" y="10" fill={themeTextSecondary} fontSize="7.5" fontWeight="bold">5 Sanitary WCs</text>
                </g>
              </>
            ) : (
              /* Residential Room Tags */
              <>
                <g transform={`translate(${(startX + splitX) / 2}, ${(startY + startY + drawH) / 2})`}>
                  <rect x="-84" y="-18" width="168" height="38" fill={themeBg} fillOpacity="0.88" rx="5" stroke={themeAccent} strokeWidth="0.8" />
                  <text textAnchor="middle" y="-3" fill={themeTextPrimary} fontSize="12" fontWeight="900">
                    LIVING & DINING HALL
                  </text>
                  <text textAnchor="middle" y="11" fill={themeTextSecondary} fontSize="8.5" fontWeight="bold">
                    {(footprintSqm * 0.48).toFixed(1)} m² [{(footprintSqft * 0.48).toFixed(0)} sqft] · FFL +0.60m
                  </text>
                </g>
                <g transform={`translate(${(splitX + startX + drawW) / 2}, ${(startY + midY) / 2})`}>
                  <rect x="-74" y="-16" width="148" height="34" fill={themeBg} fillOpacity="0.88" rx="4" stroke={themeAccent} strokeWidth="0.8" />
                  <text textAnchor="middle" y="-2" fill={themeTextPrimary} fontSize="10.5" fontWeight="900">
                    MASTER BEDROOM SUITE
                  </text>
                  <text textAnchor="middle" y="11" fill={themeTextSecondary} fontSize="8" fontWeight="bold">
                    {(footprintSqm * 0.26).toFixed(1)} m² [{(footprintSqft * 0.26).toFixed(0)} sqft]
                  </text>
                </g>
                <g transform={`translate(${(splitX + stairX) / 2}, ${(midY + startY + drawH) / 2})`}>
                  <rect x="-60" y="-16" width="120" height="34" fill={themeBg} fillOpacity="0.88" rx="4" stroke={themeAccent} strokeWidth="0.8" />
                  <text textAnchor="middle" y="-2" fill={themeTextPrimary} fontSize="10" fontWeight="900">
                    MODULAR KITCHEN
                  </text>
                  <text textAnchor="middle" y="11" fill={themeTextSecondary} fontSize="8" fontWeight="bold">
                    {(footprintSqm * 0.15).toFixed(1)} m² · Granite Top
                  </text>
                </g>
              </>
            )}
          </g>
        )}

        {/* ── Exterior Dimension Strings ── */}
        {showDimensions && (
          <g>
            <g transform={`translate(0, ${startY + drawH + 28})`}>
              <line x1={startX} y1="0" x2={startX + drawW} y2="0" stroke={themeAccent} strokeWidth="1.4" />
              <line x1={startX} y1="-7" x2={startX} y2="7" stroke={themeAccent} strokeWidth="1.4" />
              <line x1={startX + drawW} y1="-7" x2={startX + drawW} y2="7" stroke={themeAccent} strokeWidth="1.4" />
              <rect x={startX + drawW / 2 - 46} y="-10" width="92" height="20" fill={themeBg} rx="4" stroke={themeAccent} strokeWidth="0.9" />
              <text x={startX + drawW / 2} y="3.5" textAnchor="middle" fill={themeAccent} fontSize="9.5" fontWeight="900">
                {length.toFixed(2)} m ({((length * 3.28084)).toFixed(1)} ft)
              </text>
            </g>

            <g transform={`translate(${startX + drawW + 28}, 0)`}>
              <line x1="0" y1={startY} x2="0" y2={startY + drawH} stroke={themeAccent} strokeWidth="1.4" />
              <line x1="-7" y1={startY} x2="7" y2={startY} stroke={themeAccent} strokeWidth="1.4" />
              <line x1="-7" y1={startY + drawH} x2="7" y2={startY + drawH} stroke={themeAccent} strokeWidth="1.4" />
              <rect x="-26" y={startY + drawH / 2 - 10} width="66" height="20" fill={themeBg} rx="4" stroke={themeAccent} strokeWidth="0.9" />
              <text x="7" y={startY + drawH / 2 + 3.5} textAnchor="middle" fill={themeAccent} fontSize="9.5" fontWeight="900">
                {width.toFixed(2)} m
              </text>
            </g>
          </g>
        )}

        {/* ── North Arrow Compass & Graphic Scale Bar ── */}
        {showCompass && (
          <g>
            <g transform={`translate(${svgW - 44}, 36)`}>
              <circle cx="0" cy="0" r="18" fill={themeBg} stroke={themeAccent} strokeWidth="1.2" />
              <polygon points="0,-14 5,0 0,-3 -5,0" fill="#ef4444" />
              <polygon points="0,14 5,0 0,3 -5,0" fill={themeAccent} opacity="0.6" />
              <text x="0" y="-18" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="900">N</text>
            </g>

            <g transform={`translate(28, ${svgH - 24})`}>
              <text x="0" y="-6" fill={themeTextSecondary} fontSize="8" fontWeight="bold">GRAPHIC SCALE 1:100 @ A3</text>
              <rect x="0" y="0" width="30" height="4" fill={themeAccent} />
              <rect x="30" y="0" width="30" height="4" fill={themeTextSecondary} />
              <rect x="60" y="0" width="30" height="4" fill={themeAccent} />
              <text x="0" y="12" fill={themeTextSecondary} fontSize="7">0m</text>
              <text x="30" y="12" fill={themeTextSecondary} fontSize="7">2.5m</text>
              <text x="60" y="12" fill={themeTextSecondary} fontSize="7">5m</text>
              <text x="90" y="12" fill={themeTextSecondary} fontSize="7">10m</text>
            </g>
          </g>
        )}
      </svg>
    );
  }, [
    length, width, outerWallMm, innerWallMm, xBays, yBays, footprintSqm, footprintSqft,
    showDimensions, showRoomLabels, showFurniture, showColumnGrid, showBeams, showHatching, showCompass,
    drawingTheme, activeFloorIndex, numFloors, typology, isCommercial, isIndustrial, isSanitary, isResidential
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. FRONT ELEVATION (2D FACADE SVG)
  // ─────────────────────────────────────────────────────────────────────────
  const elevationSvg = useMemo(() => {
    const svgW = 540;
    const svgH = 340;
    const totalHeightM = plinthHeight + numFloors * floorHeight + 1.0;
    const pad = 44;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / length, availH / totalHeightM);
    const drawW = length * scale;
    const startX = (svgW - drawW) / 2;
    const groundY = svgH - 45;
    const plinthH = plinthHeight * scale;
    const floorH = floorHeight * scale;
    const parapetH = 1.0 * scale;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none" style={{ maxHeight: "330px" }}>
        <line x1="16" y1={groundY} x2={svgW - 16} y2={groundY} stroke="#64748b" strokeWidth="1.5" />
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

        {/* Plinth Masonry */}
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

        {/* Floor Storeys */}
        {Array.from({ length: numFloors }).map((_, fIdx) => {
          const floorBottomY = groundY - plinthH - fIdx * floorH;
          const floorTopY = floorBottomY - floorH;
          const slabThkPx = Math.max(3, 0.15 * scale);

          return (
            <g key={fIdx}>
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
              <rect
                x={startX - 4}
                y={floorTopY}
                width={drawW + 8}
                height={slabThkPx}
                fill="#475569"
                stroke="var(--foreground)"
                strokeWidth="0.8"
              />
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
                  <rect
                    x={startX + drawW * 0.43}
                    y={floorBottomY - floorH * 0.72}
                    width={drawW * 0.14}
                    height={floorH * 0.72}
                    fill="#38bdf8"
                    fillOpacity="0.15"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    rx={1}
                  />
                </g>
              )}

              <text x={startX - 10} y={floorTopY + floorH / 2} textAnchor="end" className="text-[8px] font-black fill-accent">
                {fIdx === 0 ? "G" : `L${fIdx + 1}`} (+{((plinthHeight + (fIdx + 1) * floorHeight)).toFixed(1)}m)
              </text>
            </g>
          );
        })}

        {/* Parapet Wall */}
        <rect
          x={startX}
          y={groundY - plinthH - numFloors * floorH - parapetH}
          width={drawW}
          height={parapetH}
          fill="currentColor"
          fillOpacity="0.12"
          stroke="var(--foreground)"
          strokeWidth="1"
        />
      </svg>
    );
  }, [length, plinthHeight, numFloors, floorHeight]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. STRUCTURAL CROSS SECTION (2D SECTION SVG)
  // ─────────────────────────────────────────────────────────────────────────
  const sectionSvg = useMemo(() => {
    const svgW = 540;
    const svgH = 340;
    const totalHeightM = excavationDepth + plinthHeight + numFloors * floorHeight + 1.0;
    const pad = 44;
    const availW = svgW - pad * 2;
    const availH = svgH - pad * 2;

    const scale = Math.min(availW / length, availH / totalHeightM);
    const drawW = length * scale;
    const startX = (svgW - drawW) / 2;
    const groundY = svgH - 60;
    const plinthH = plinthHeight * scale;
    const floorH = floorHeight * scale;
    const footD = excavationDepth * scale;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none" style={{ maxHeight: "330px" }}>
        <line x1="16" y1={groundY} x2={svgW - 16} y2={groundY} stroke="#64748b" strokeWidth="1.5" />
        <text x="24" y={groundY - 6} className="text-[8.5px] font-black fill-surface-400">
          ±0.00 Ground Level (GL)
        </text>

        {/* Isolated Footings */}
        {Array.from({ length: xBays + 1 }).map((_, i) => {
          const colX = startX + i * (drawW / xBays);
          const footW = 1.4 * scale;
          const footH = 0.45 * scale;
          const pccH = 0.15 * scale;

          return (
            <g key={i}>
              <rect x={colX - footW / 2} y={groundY + footD - pccH} width={footW} height={pccH} fill="#94a3b8" fillOpacity="0.4" stroke="#94a3b8" strokeWidth="0.8" />
              <rect x={colX - footW * 0.4} y={groundY + footD - pccH - footH} width={footW * 0.8} height={footH} fill="#64748b" fillOpacity="0.6" stroke="var(--foreground)" strokeWidth="1" />
              <rect x={colX - 4} y={groundY - plinthH} width={8} height={footD + plinthH - pccH - footH} fill="#0284c7" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
            </g>
          );
        })}

        {/* Plinth Beam */}
        <rect x={startX - 4} y={groundY - plinthH} width={drawW + 8} height={plinthH * 0.4} fill="#0284c7" fillOpacity="0.5" stroke="#0284c7" strokeWidth="1.2" />

        {/* Floor Slabs & Columns */}
        {Array.from({ length: numFloors }).map((_, fIdx) => {
          const floorBottomY = groundY - plinthH - fIdx * floorH;
          const floorTopY = floorBottomY - floorH;

          return (
            <g key={fIdx}>
              {Array.from({ length: xBays + 1 }).map((_, cIdx) => {
                const colX = startX + cIdx * (drawW / xBays);
                return (
                  <rect key={cIdx} x={colX - 4} y={floorTopY} width={8} height={floorH} fill="#0284c7" fillOpacity="0.35" stroke="#0284c7" strokeWidth="1" />
                );
              })}
              <rect x={startX - 4} y={floorTopY} width={drawW + 8} height={Math.max(3, 0.15 * scale)} fill="#38bdf8" fillOpacity="0.7" stroke="var(--foreground)" strokeWidth="1" />
              <text x={startX + drawW + 8} y={floorTopY + 4} className="text-[8px] font-mono font-bold fill-surface-400">
                Slab +{((plinthHeight + (fIdx + 1) * floorHeight)).toFixed(2)}m
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [length, excavationDepth, plinthHeight, numFloors, floorHeight, xBays]);

  // Shared Toolbar Elements
  const renderFloorSelectDropdown = (isDark = false) => (
    <div className="flex items-center gap-2">
      <span className={`${isDark ? "text-slate-400" : "text-surface-500"} font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 whitespace-nowrap`}>
        <Building className="w-3.5 h-3.5 text-accent" />
        {ifcStoreys ? "BIM Storey:" : "Floor Plan:"}
      </span>
      <div className="relative inline-flex items-center">
        <select
          value={activeFloorIndex}
          onChange={(e) => setActiveFloorIndex(Number(e.target.value))}
          className={`h-8 pl-3 pr-8 rounded-lg text-xs font-black shadow-2xs focus:outline-none cursor-pointer appearance-none transition-colors ${
            isDark
              ? "bg-slate-900 border border-slate-700 text-white focus:border-accent"
              : "bg-surface-50 border border-surface-300 text-foreground focus:border-accent"
          }`}
        >
          {ifcStoreys
            ? ifcStoreys.map((storey, fIdx) => (
                <option key={storey.id} value={fIdx}>
                  {storey.isRoof ? "🧱 " : fIdx === 0 ? "🏢 " : "🏢 "}
                  {storey.name} (+{storey.elevation_m}m) {!storey.isRoof ? `• [${storey.doorCount} Doors, ${storey.windowCount} Windows]` : ""}
                </option>
              ))
            : Array.from({ length: numFloors + 1 }).map((_, fIdx) => {
                const isTerrace = fIdx === numFloors;
                const label = isTerrace
                  ? `🧱 Roof / Terrace (+${(numFloors * floorHeight).toFixed(1)}m)`
                  : fIdx === 0
                  ? `🏢 Ground Floor (±0.00m)`
                  : `🏢 ${fIdx}${fIdx === 1 ? "st" : fIdx === 2 ? "nd" : fIdx === 3 ? "rd" : "th"} Floor (+${(fIdx * floorHeight).toFixed(1)}m)`;
                return (
                  <option key={fIdx} value={fIdx}>
                    {label}
                  </option>
                );
              })}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-surface-400 absolute right-2.5 pointer-events-none" />
      </div>
    </div>
  );

  const renderLayerPills = (isDark = false) => (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-bold">
      <span className={`${isDark ? "text-slate-400" : "text-surface-400"} text-[9px] uppercase tracking-wider font-black mr-1 flex items-center gap-1`}>
        <Layers className="w-3 h-3 text-accent" /> CAD Layers:
      </span>
      <button
        onClick={() => setShowBeams(!showBeams)}
        className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
          showBeams
            ? "bg-sky-500/20 border-sky-500/40 text-sky-400 font-black"
            : isDark ? "bg-slate-900 border-slate-800 text-slate-500 opacity-60" : "bg-surface-100 border-surface-200 text-surface-400 opacity-60"
        }`}
        title="Toggle RCC Primary & Secondary Beams"
      >
        <Box className="w-3 h-3 text-sky-400" />
        <span>RCC Beams (PB/SB)</span>
      </button>
      <button
        onClick={() => setShowDimensions(!showDimensions)}
        className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
          showDimensions
            ? "bg-accent/15 border-accent/40 text-accent"
            : isDark ? "bg-slate-900 border-slate-800 text-slate-500 opacity-60" : "bg-surface-100 border-surface-200 text-surface-400 opacity-60"
        }`}
      >
        <Ruler className="w-3 h-3" />
        <span>Dimensions</span>
      </button>
      <button
        onClick={() => setShowRoomLabels(!showRoomLabels)}
        className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
          showRoomLabels
            ? "bg-accent/15 border-accent/40 text-accent"
            : isDark ? "bg-slate-900 border-slate-800 text-slate-500 opacity-60" : "bg-surface-100 border-surface-200 text-surface-400 opacity-60"
        }`}
      >
        <Eye className="w-3 h-3" />
        <span>Room Areas</span>
      </button>
      <button
        onClick={() => setShowFurniture(!showFurniture)}
        className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
          showFurniture
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
            : isDark ? "bg-slate-900 border-slate-800 text-slate-500 opacity-60" : "bg-surface-100 border-surface-200 text-surface-400 opacity-60"
        }`}
      >
        <Armchair className="w-3 h-3" />
        <span>Layout</span>
      </button>
      <button
        onClick={() => setShowColumnGrid(!showColumnGrid)}
        className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
          showColumnGrid
            ? "bg-purple-500/15 border-purple-500/40 text-purple-400"
            : isDark ? "bg-slate-900 border-slate-800 text-slate-500 opacity-60" : "bg-surface-100 border-surface-200 text-surface-400 opacity-60"
        }`}
      >
        <Grid3X3 className="w-3 h-3" />
        <span>Columns & Axes</span>
      </button>
      <button
        onClick={() => setShowHatching(!showHatching)}
        className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
          showHatching
            ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
            : isDark ? "bg-slate-900 border-slate-800 text-slate-500 opacity-60" : "bg-surface-100 border-surface-200 text-surface-400 opacity-60"
        }`}
      >
        <Building className="w-3 h-3" />
        <span>Hatch & Tiles</span>
      </button>
    </div>
  );

  const renderThemeSelector = (isDark = false) => (
    <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800" : "bg-surface-100 border-surface-200"}`}>
      <Palette className="w-3 h-3 text-surface-400 ml-1" />
      <button
        onClick={() => setDrawingTheme("presentation")}
        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
          drawingTheme === "presentation" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs" : "text-surface-400 hover:text-primary"
        }`}
      >
        🌟 Color Plan
      </button>
      <button
        onClick={() => setDrawingTheme("blueprint")}
        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
          drawingTheme === "blueprint" ? "bg-sky-600 text-white shadow-2xs" : "text-surface-400 hover:text-primary"
        }`}
      >
        Blueprint
      </button>
      <button
        onClick={() => setDrawingTheme("white")}
        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
          drawingTheme === "white" ? "bg-white text-slate-900 border border-slate-300 shadow-2xs" : "text-surface-400 hover:text-primary"
        }`}
      >
        White CAD
      </button>
      <button
        onClick={() => setDrawingTheme("dark")}
        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
          drawingTheme === "dark" ? "bg-zinc-800 text-white shadow-2xs" : "text-surface-400 hover:text-primary"
        }`}
      >
        Dark
      </button>
    </div>
  );

  return (
    <div className="bg-surface-card border border-surface-200 rounded-2xl overflow-hidden shadow-xs font-sans">
      {/* ── Studio Header & Primary Viewport Tabs ── */}
      <div className="p-3 bg-surface-50 border-b border-surface-200 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              2D/3D Architectural CAD Studio
            </h3>
            <p className="text-[10px] text-surface-500 font-medium">
              Adaptive Multi-Bay Plan & Structural Beams · IS 1200 / CPWD DSR 2023 Compliant
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-surface-200/50 p-0.5 rounded-lg border border-surface-300 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode("plan")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === "plan" ? "bg-accent text-background shadow-xs" : "text-surface-500 hover:text-foreground"
            }`}
          >
            2D Plan
          </button>
          <button
            type="button"
            onClick={() => setViewMode("elevation")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === "elevation" ? "bg-accent text-background shadow-xs" : "text-surface-500 hover:text-foreground"
            }`}
          >
            Elevation
          </button>
          <button
            type="button"
            onClick={() => setViewMode("section")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === "section" ? "bg-accent text-background shadow-xs" : "text-surface-500 hover:text-foreground"
            }`}
          >
            Section
          </button>
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === "3d" ? "bg-accent text-background shadow-xs" : "text-surface-500 hover:text-foreground"
            }`}
          >
            <span>🏛️ 3D Model</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === "all" ? "bg-accent text-background shadow-xs" : "text-surface-500 hover:text-foreground"
            }`}
          >
            All 4 Views
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-surface-500 hover:text-foreground hover:bg-surface-200 border border-surface-300 flex items-center gap-1 cursor-pointer transition-all ml-1"
            title="Expand to Fullscreen HD"
          >
            <Maximize2 className="w-3 h-3 text-accent" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* ── Key Engineering Metrics Ribbon ── */}
      <div className="px-3.5 py-2 bg-surface-50 border-b border-surface-200 flex items-center justify-between text-[10px] text-surface-600 font-bold flex-wrap gap-2">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span>Dimensions: <strong className="text-foreground">{length}m × {width}m</strong></span>
          <span>Footprint: <strong className="text-foreground">{footprintSqm.toFixed(1)} m²</strong> ({footprintSqft.toFixed(0)} sqft)</span>
          <span>Total BUA: <strong className="text-accent">{totalBuaSqm.toFixed(1)} m²</strong> (G+{numFloors - 1})</span>
          <span>Columns: <strong className="text-foreground">{totalColumns} nos</strong> (~4m grid)</span>
          <span>Typology: <strong className="text-sky-400 capitalize">{isCommercial ? "Commercial Office" : isSanitary ? "Toilet Block" : isIndustrial ? "Industrial Facility" : "Residential Plan"}</strong></span>
        </div>

        {/* CAD Drafting Theme Switcher */}
        {viewMode === "plan" && renderThemeSelector(false)}
      </div>

      {/* ── 2D Floor Storey Selector Bar (Dropdown Style) ── */}
      {(viewMode === "plan" || viewMode === "all") && (
        <div className="px-3.5 py-2 bg-surface-100/90 border-b border-surface-200 flex items-center justify-between gap-3 flex-wrap text-xs">
          {renderFloorSelectDropdown(false)}

          <div className="flex items-center gap-2 text-[11px] font-mono text-surface-500">
            {ifcStoreys && ifcStoreys[activeFloorIndex] ? (
              <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold">
                {ifcStoreys[activeFloorIndex].name} · +{ifcStoreys[activeFloorIndex].elevation_m}m Level
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent font-bold">
                {activeFloorIndex === numFloors ? "Terrace Deck" : `Storey Level ${activeFloorIndex + 1}`} · +{(activeFloorIndex * floorHeight).toFixed(1)}m
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── CAD Layer Visibility & Drawing Export Bar ── */}
      {viewMode === "plan" && (
        <div className="px-3.5 py-1.5 bg-surface-50/90 border-b border-surface-200 flex items-center justify-between gap-3 flex-wrap text-[10px]">
          {renderLayerPills(false)}

          {/* Export & Print CAD Sheet */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleExportSVG}
              className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-200 text-foreground text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="Download standalone SVG drawing"
            >
              <Download className="w-3 h-3 text-accent" />
              <span>Export SVG</span>
            </button>
            <button
              onClick={handlePrintPlan}
              className="px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/40 text-accent text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
              title="Print formatted CAD drawing sheet"
            >
              <Printer className="w-3 h-3" />
              <span>Print CAD Plan</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Interactive Viewport Canvas with Mouse Wheel Zoom & Pan Dragging ── */}
      <div className="relative bg-surface-card overflow-hidden min-h-[440px] flex items-center justify-center">
        {viewMode === "plan" && (
          <div
            className={`w-full h-[440px] overflow-hidden flex items-center justify-center cursor-${isDragging ? "grabbing" : "grab"}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Transform Canvas */}
            <div
              className="transition-transform duration-75 select-none"
              style={{
                transform: `translate(${planPan.x}px, ${planPan.y}px) scale(${planZoom})`,
                transformOrigin: "center center",
                width: "100%",
                maxWidth: "820px",
              }}
            >
              {planSvg}
            </div>

            {/* Floating Zoom & Pan HUD Overlay */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700 shadow-xl text-xs">
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Zoom Out (Scroll Down)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] text-slate-200 font-bold px-1.5 min-w-[42px] text-center">
                {Math.round(planZoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Zoom In (Scroll Up)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors ml-1 cursor-pointer"
                title="Reset Zoom & Center Pan"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Helper Tip Badge */}
            <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-700/60 text-[9px] text-slate-300 font-medium flex items-center gap-1.5 pointer-events-none">
              <Move className="w-3 h-3 text-accent" />
              <span>Scroll mouse wheel to Zoom · Click & Drag to Pan canvas</span>
            </div>
          </div>
        )}

        {viewMode === "elevation" && (
          <div className="w-full flex flex-col items-center p-4">
            <div className="w-full max-w-xl">{elevationSvg}</div>
            <p className="text-[9px] font-bold text-surface-400 text-center mt-1">
              Front Elevation · G+{numFloors - 1} Storeys ({floorHeight}m floor height, {plinthHeight}m plinth)
            </p>
          </div>
        )}

        {viewMode === "section" && (
          <div className="w-full flex flex-col items-center p-4">
            <div className="w-full max-w-xl">{sectionSvg}</div>
            <p className="text-[9px] font-bold text-surface-400 text-center mt-1">
              Structural Cross-Section · M25 Isolated Footings, Columns, Plinth & Slabs
            </p>
          </div>
        )}

        {viewMode === "3d" && (
          <div className="w-full h-[440px]">
            <BOQ3DModelViewer params={params} />
          </div>
        )}

        {viewMode === "all" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full p-3">
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
      {/* ── FULL SCREEN HD CAD VIEWPORT WITH COMPLETE CONTROL SUITE ── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/98 backdrop-blur-2xl flex flex-col p-3 md:p-5 select-none animate-in fade-in duration-150 font-sans">
          {/* Fullscreen Header Bar */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-sm font-black">
                📐
              </span>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Architectural Plan Studio</span>
                  <span className="px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30 text-[9px] font-black">
                    FULLSCREEN CAD HD
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  {length}m × {width}m · {numFloors} Floors · {totalBuaSqm.toFixed(1)} m² BUA · {isCommercial ? "Commercial Layout" : isSanitary ? "Sanitary Block" : "Residential Layout"}
                </p>
              </div>
            </div>

            {/* View Mode Switcher in Fullscreen */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode("plan")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === "plan" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  2D Plan
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("elevation")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === "elevation" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Elevation
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("section")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === "section" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Section
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === "3d" ? "bg-accent text-background shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  3D Model
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

              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit (ESC)</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Secondary Options Ribbon (Floor Select, Layers, Theme, Export) */}
          <div className="py-2 px-1 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
            {/* Storey Select Dropdown in Fullscreen */}
            {(viewMode === "plan" || viewMode === "all") && renderFloorSelectDropdown(true)}

            {/* Layer Visibility Toggles in Fullscreen */}
            {viewMode === "plan" && renderLayerPills(true)}

            {/* Theme & Export Tools in Fullscreen */}
            <div className="flex items-center gap-2 ml-auto">
              {viewMode === "plan" && renderThemeSelector(true)}

              <button
                onClick={handleExportSVG}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                title="Download standalone SVG drawing"
              >
                <Download className="w-3 h-3 text-accent" />
                <span>SVG</span>
              </button>
              <button
                onClick={handlePrintPlan}
                className="px-2.5 py-1 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                title="Print formatted CAD drawing sheet"
              >
                <Printer className="w-3 h-3" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Interactive Canvas */}
          <div
            className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 cursor-${isDragging ? "grabbing" : "grab"}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="transition-transform duration-75 select-none"
              style={{
                transform: `translate(${planPan.x}px, ${planPan.y}px) scale(${planZoom * 1.25})`,
                transformOrigin: "center center",
                width: "100%",
                maxWidth: "960px",
              }}
            >
              {viewMode === "plan" && planSvg}
              {viewMode === "elevation" && elevationSvg}
              {viewMode === "section" && sectionSvg}
              {viewMode === "3d" && <div className="h-[600px]"><BOQ3DModelViewer params={params} /></div>}
              {viewMode === "all" && (
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">{planSvg}</div>
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">{elevationSvg}</div>
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">{sectionSvg}</div>
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl h-[280px]"><BOQ3DModelViewer params={params} /></div>
                </div>
              )}
            </div>

            {/* Floating Zoom & Pan HUD Overlay in Fullscreen */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl text-xs">
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] text-slate-200 font-bold px-1.5 min-w-[42px] text-center">
                {Math.round(planZoom * 125)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors ml-1 cursor-pointer"
                title="Reset Zoom & Center Pan"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Helper Tip Badge in Fullscreen */}
            <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700/60 text-[9.5px] text-slate-300 font-medium flex items-center gap-1.5 pointer-events-none">
              <Move className="w-3.5 h-3.5 text-accent" />
              <span>Scroll mouse wheel to Zoom · Click & Drag to Pan canvas</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
