"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Ruler, 
  X, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  Trash2,
  Spline,
  Square,
  Box,
  RotateCcw,
  Compass,
  Magnet
} from "lucide-react";
import {
  CalibrationUnit,
  CALIBRATION_UNITS,
  UNIT_LIST,
  COMMON_CALIBRATION_PRESETS,
  CalibrationPreset,
  parseArchitecturalDimension,
  formatScaleValue,
  getSecondaryScaleEquivalents,
  metersToUnit
} from "@/lib/estimation/units";
import {
  distanceBetween,
  calculateAngleDegrees,
  snapToOrtho,
  findSnapPoint,
  createRectanglePoints,
  calculatePolylineLength,
  calculatePolygonArea
} from "@/lib/estimation/geometry";

export interface Point {
  x: number;
  y: number;
}

export interface MeasuredShape {
  id: string;
  type: 'length' | 'area';
  points: Point[];
  value: number; // formatted value
  unit: string; // 'm', 'ft', 'sqm', 'sqft', etc.
  color: string;
  label: string;
}

interface SimpleSvgLayerProps {
  width: number;
  height: number;
  activeTool: 'select' | 'calibrate' | 'length' | 'area' | 'rectangle';
  scale: number; // meters per pixel
  zoomScale?: number; // active viewport magnification level from react-zoom-pan-pinch
  isCalibrated: boolean;
  displayUnit?: CalibrationUnit;
  shapes: MeasuredShape[];
  orthoEnabled?: boolean;
  snapEnabled?: boolean;
  isSpacePressed?: boolean;
  onAddShape: (shape: MeasuredShape) => void;
  onDeleteShape: (id: string) => void;
  onUpdateShape?: (id: string, updates: Partial<MeasuredShape>) => void;
  onCalibrate: (scaleInMetersPerPixel: number, unit?: CalibrationUnit) => void;
  onToolChange: (tool: 'select' | 'calibrate' | 'length' | 'area' | 'rectangle') => void;
  onActivePointsChange?: (count: number) => void;
}

export const SimpleSvgLayer: React.FC<SimpleSvgLayerProps> = ({
  width,
  height,
  activeTool,
  scale,
  zoomScale = 1,
  isCalibrated,
  displayUnit = 'm',
  shapes,
  orthoEnabled = false,
  snapEnabled = true,
  isSpacePressed = false,
  onAddShape,
  onDeleteShape,
  onUpdateShape,
  onCalibrate,
  onToolChange,
  onActivePointsChange
}) => {
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [hoverAngle, setHoverAngle] = useState<number | null>(null);
  const [activeSnap, setActiveSnap] = useState<{ snapPoint: Point } | null>(null);

  // Zoom-Invariant Annotation Scale Factor
  // Inversely scales labels, fonts, and handles so they stay at constant readable screen sizes
  const badgeScale = useMemo(() => {
    const s = zoomScale || 1;
    return Math.max(0.15, Math.min(3.0, 1 / s));
  }, [zoomScale]);
  const [isShiftDown, setIsShiftDown] = useState(false);

  // Selection & vertex dragging in select mode
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [draggingVertex, setDraggingVertex] = useState<{ shapeId: string; index: number } | null>(null);

  // Calibration modal state
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [calibrateInput, setCalibrateInput] = useState(displayUnit === 'ft' ? '10.0' : '3.0');
  const [selectedUnit, setSelectedUnit] = useState<CalibrationUnit>(displayUnit || 'm');
  const [presetCategory, setPresetCategory] = useState<'all' | 'metric' | 'imperial'>('all');
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hudTarget = isMounted && typeof document !== 'undefined'
    ? document.getElementById('takeoff-viewport-hud')
    : null;

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Inform parent of active points for undo/finish buttons in toolbar
  useEffect(() => {
    onActivePointsChange?.(currentPoints.length);
  }, [currentPoints.length, onActivePointsChange]);

  // Sync selectedUnit when displayUnit prop changes
  useEffect(() => {
    if (displayUnit) {
      setSelectedUnit(displayUnit);
      setCalibrateInput(displayUnit === 'ft' ? '10.0' : '3.0');
    }
  }, [displayUnit]);

  // Reset tool temporary points when tool switches
  useEffect(() => {
    setCurrentPoints([]);
    setHoverPoint(null);
    setActiveSnap(null);
    setDraggingVertex(null);
    if (activeTool !== 'select') {
      setSelectedShapeId(null);
    }
    if (activeTool === 'calibrate') {
      setCalibrationPoints([]);
    }
  }, [activeTool]);

  // Global Shift Key Listener for temporary Orthogonal Snap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(true);
      
      // Backspace or Ctrl+Z to undo last point while drawing
      if ((e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) && activeTool !== 'select') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        handleUndoPoint();
      }

      // Enter to finish shape
      if (e.key === 'Enter' && activeTool !== 'select' && activeTool !== 'calibrate') {
        finishCurrentShape();
      }

      // Escape to cancel shape
      if (e.key === 'Escape') {
        setCurrentPoints([]);
        setHoverPoint(null);
        setCalibrationPoints([]);
        setSelectedShapeId(null);
      }

      // Delete key in select mode
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeTool === 'select' && selectedShapeId) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        onDeleteShape(selectedShapeId);
        setSelectedShapeId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, currentPoints, selectedShapeId, onDeleteShape]);

  // Coordinate mapping using SVG CTM inverse transform
  const getCursorPoint = (e: React.PointerEvent<SVGSVGElement>): Point => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
  };

  // Measured calibration pixel distance
  const calPixelDistance = useMemo(() => {
    if (calibrationPoints.length < 2) return 0;
    const dx = calibrationPoints[1].x - calibrationPoints[0].x;
    const dy = calibrationPoints[1].y - calibrationPoints[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [calibrationPoints]);

  // Live pixel distance between Point 1 and cursor hover point
  const liveCalDistance = useMemo(() => {
    if (calibrationPoints.length !== 1 || !hoverPoint) return 0;
    const dx = hoverPoint.x - calibrationPoints[0].x;
    const dy = hoverPoint.y - calibrationPoints[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [calibrationPoints, hoverPoint]);

  // Dimension parsing for calibration modal
  const parsedDimension = useMemo(() => {
    if (!calibrateInput) return null;
    return parseArchitecturalDimension(calibrateInput, selectedUnit);
  }, [calibrateInput, selectedUnit]);

  // Preview scale in meters per pixel
  const previewScaleInMeters = useMemo(() => {
    if (!parsedDimension || calPixelDistance <= 0) return null;
    return parsedDimension.meters / calPixelDistance;
  }, [parsedDimension, calPixelDistance]);

  const filteredPresets = useMemo(() => {
    if (presetCategory === 'all') return COMMON_CALIBRATION_PRESETS;
    return COMMON_CALIBRATION_PRESETS.filter(p => p.category === presetCategory);
  }, [presetCategory]);

  // Dynamic badge formatting based on active displayUnit
  const formatShapeMeasurement = (shape: MeasuredShape): string => {
    const shapeScale = scale > 0 ? scale : 0.025;

    if (shape.type === 'length') {
      const lenMeters = calculatePolylineLength(shape.points, shapeScale);
      const converted = metersToUnit(lenMeters, displayUnit);
      return `${converted.toFixed(2)} ${displayUnit}`;
    }

    if (shape.type === 'area') {
      const sqmArea = calculatePolygonArea(shape.points, shapeScale);
      const isImperial = displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'yd';
      const converted = isImperial ? sqmArea * 10.76391 : sqmArea;
      const unitLabel = isImperial ? 'sqft' : 'sqm';
      return `${converted.toFixed(2)} ${unitLabel}`;
    }

    return `${shape.value} ${shape.unit}`;
  };

  // Undo the last placed point
  const handleUndoPoint = () => {
    if (activeTool === 'calibrate') {
      if (calibrationPoints.length > 0) {
        setCalibrationPoints(prev => prev.slice(0, -1));
        setShowCalibrateModal(false);
      }
      return;
    }
    if (currentPoints.length > 0) {
      setCurrentPoints(prev => prev.slice(0, -1));
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only process primary left clicks (e.button === 0)
    if (e.button !== 0) return;

    // If Spacebar is held, allow panning, don't place points
    if (isSpacePressed) return;

    const rawPt = getCursorPoint(e);

    // Apply snap if active
    let pt = activeSnap ? activeSnap.snapPoint : (hoverPoint || rawPt);

    // Double-click gesture to immediately finish polyline / polygon
    if (e.detail > 1) {
      if (activeTool === 'length' && currentPoints.length >= 2) {
        finishCurrentShape();
        return;
      }
      if (activeTool === 'area' && currentPoints.length >= 3) {
        finishCurrentShape();
        return;
      }
    }

    // 1. Select Mode
    if (activeTool === 'select') {
      // Check if clicked directly on empty canvas to deselect
      if (e.target === e.currentTarget) {
        setSelectedShapeId(null);
      }
      return;
    }

    // 2. Calibration Tool (2 clicks: Point 1, then Point 2)
    if (activeTool === 'calibrate') {
      if (calibrationPoints.length === 0) {
        setCalibrationPoints([pt]);
      } else if (calibrationPoints.length === 1) {
        const next = [calibrationPoints[0], pt];
        setCalibrationPoints(next);
        setShowCalibrateModal(true);
      }
      return;
    }

    // 3. Measuring Length (Polyline)
    if (activeTool === 'length') {
      // If clicking on or right next to the last placed point (within 16px), finish length run
      if (currentPoints.length >= 2) {
        const last = currentPoints[currentPoints.length - 1];
        if (distanceBetween(pt, last) < 16) {
          finishCurrentShape();
          return;
        }
      }
      setCurrentPoints(prev => [...prev, pt]);
      return;
    }

    // 4. Measuring Area (Polygon)
    if (activeTool === 'area') {
      // If clicking close to starting point (within 20px) or snapping to start, close polygon
      if (currentPoints.length >= 3) {
        const start = currentPoints[0];
        const dist = distanceBetween(pt, start);
        if (dist < 20 || (activeSnap && activeSnap.snapPoint.x === start.x && activeSnap.snapPoint.y === start.y)) {
          finishCurrentShape();
          return;
        }
      }
      setCurrentPoints(prev => [...prev, pt]);
      return;
    }

    // 5. Measuring Rectangle (2 Clicks)
    if (activeTool === 'rectangle') {
      if (currentPoints.length === 0) {
        setCurrentPoints([pt]);
      } else if (currentPoints.length === 1) {
        const rectPts = createRectanglePoints(currentPoints[0], pt);
        const shapeScale = scale > 0 ? scale : 0.025;
        const isImperial = displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'yd';
        const sqmArea = calculatePolygonArea(rectPts, shapeScale);
        const convertedVal = isImperial ? sqmArea * 10.76391 : sqmArea;
        const areaUnitLabel = isImperial ? 'sqft' : 'sqm';
        const roundedVal = Math.round(convertedVal * 100) / 100;

        onAddShape({
          id: crypto.randomUUID(),
          type: 'area',
          points: rectPts,
          value: roundedVal,
          unit: areaUnitLabel,
          color: '#0891b2', // Cyan / Teal
          label: `Room Box (${roundedVal} ${areaUnitLabel})`
        });

        setCurrentPoints([]);
        setHoverPoint(null);
        onToolChange('select');
      }
      return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isSpacePressed) return;
    const rawPt = getCursorPoint(e);

    // If dragging a vertex in select mode:
    if (draggingVertex && onUpdateShape) {
      const targetShape = shapes.find(s => s.id === draggingVertex.shapeId);
      if (targetShape) {
        let newPt = rawPt;
        if (snapEnabled) {
          const snap = findSnapPoint(rawPt, shapes.filter(s => s.id !== targetShape.id));
          if (snap) newPt = snap.snapPoint;
        }
        const updatedPoints = targetShape.points.map((p, idx) => idx === draggingVertex.index ? newPt : p);
        const shapeScale = scale > 0 ? scale : 0.025;
        const isImperial = displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'yd';
        
        let newVal = targetShape.value;
        if (targetShape.type === 'length') {
          const lenM = calculatePolylineLength(updatedPoints, shapeScale);
          newVal = Math.round(metersToUnit(lenM, displayUnit) * 100) / 100;
        } else if (targetShape.type === 'area') {
          const areaM = calculatePolygonArea(updatedPoints, shapeScale);
          const areaConv = isImperial ? areaM * 10.76391 : areaM;
          newVal = Math.round(areaConv * 100) / 100;
        }

        onUpdateShape(targetShape.id, { points: updatedPoints, value: newVal });
      }
      return;
    }

    if (activeTool === 'select') {
      setHoverPoint(null);
      setActiveSnap(null);
      return;
    }

    let finalPt = rawPt;
    let snapMatch: { snapPoint: Point; targetShapeId?: string; pointIndex?: number } | null = null;

    // 1. Magnetic Point Snap
    if (snapEnabled) {
      snapMatch = findSnapPoint(rawPt, shapes, currentPoints, 16);
      if (snapMatch) {
        finalPt = snapMatch.snapPoint;
      }
    }
    setActiveSnap(snapMatch);

    // 2. Orthogonal Snap (Shift key or orthoEnabled)
    const isOrtho = orthoEnabled || isShiftDown;
    let computedAngle: number | null = null;

    if (isOrtho && !snapMatch) {
      if (activeTool === 'calibrate' && calibrationPoints.length === 1) {
        const ortho = snapToOrtho(calibrationPoints[0], finalPt);
        finalPt = ortho.point;
        computedAngle = ortho.angle;
      } else if (activeTool === 'length' && currentPoints.length > 0) {
        const lastPt = currentPoints[currentPoints.length - 1];
        const ortho = snapToOrtho(lastPt, finalPt);
        finalPt = ortho.point;
        computedAngle = ortho.angle;
      } else if (activeTool === 'area' && currentPoints.length > 0) {
        const lastPt = currentPoints[currentPoints.length - 1];
        const ortho = snapToOrtho(lastPt, finalPt);
        finalPt = ortho.point;
        computedAngle = ortho.angle;
      }
    }

    setHoverPoint(finalPt);
    setHoverAngle(computedAngle);
  };

  const handlePointerUp = () => {
    if (draggingVertex) {
      setDraggingVertex(null);
    }
  };

  const finishCurrentShape = () => {
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      setHoverPoint(null);
      return;
    }

    const shapeScale = scale > 0 ? scale : 0.025;
    const isImperial = displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'yd';

    if (activeTool === 'length') {
      const lengthMeters = calculatePolylineLength(currentPoints, shapeScale);
      const convertedVal = metersToUnit(lengthMeters, displayUnit);
      const roundedVal = Math.round(convertedVal * 100) / 100;

      onAddShape({
        id: crypto.randomUUID(),
        type: 'length',
        points: currentPoints,
        value: roundedVal,
        unit: displayUnit,
        color: '#2563eb', // Blue
        label: `Wall Run (${roundedVal} ${displayUnit})`
      });
    } else if (activeTool === 'area' && currentPoints.length >= 3) {
      const sqmArea = calculatePolygonArea(currentPoints, shapeScale);
      const convertedVal = isImperial ? sqmArea * 10.76391 : sqmArea;
      const areaUnitLabel = isImperial ? 'sqft' : 'sqm';
      const roundedVal = Math.round(convertedVal * 100) / 100;

      onAddShape({
        id: crypto.randomUUID(),
        type: 'area',
        points: currentPoints,
        value: roundedVal,
        unit: areaUnitLabel,
        color: '#16a34a', // Emerald green
        label: `Room/Floor (${roundedVal} ${areaUnitLabel})`
      });
    }

    setCurrentPoints([]);
    setHoverPoint(null);
    onToolChange('select');
  };

  const applyCalibration = () => {
    if (!previewScaleInMeters || previewScaleInMeters <= 0) return;
    onCalibrate(previewScaleInMeters, selectedUnit);
    setShowCalibrateModal(false);
    setCalibrationPoints([]);
    setHoverPoint(null);
    onToolChange('length');
  };

  const cancelCalibration = () => {
    setShowCalibrateModal(false);
    setCalibrationPoints([]);
    setHoverPoint(null);
    onToolChange('select');
  };

  // Live HUD measurement text
  const liveHUDText = useMemo(() => {
    if (!hoverPoint) return null;
    const shapeScale = scale > 0 ? scale : 0.025;
    const isImperial = displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'yd';

    if (activeTool === 'length' && currentPoints.length > 0) {
      const last = currentPoints[currentPoints.length - 1];
      const segPx = distanceBetween(last, hoverPoint);
      const segVal = metersToUnit(segPx * shapeScale, displayUnit).toFixed(2);
      const angle = hoverAngle ?? calculateAngleDegrees(last, hoverPoint);
      return `${segVal} ${displayUnit} • ${angle.toFixed(0)}°`;
    }

    if (activeTool === 'rectangle' && currentPoints.length === 1) {
      const rectPts = createRectanglePoints(currentPoints[0], hoverPoint);
      const sqm = calculatePolygonArea(rectPts, shapeScale);
      const conv = isImperial ? sqm * 10.76391 : sqm;
      const uLabel = isImperial ? 'sqft' : 'sqm';
      return `Box: ${conv.toFixed(2)} ${uLabel}`;
    }

    if (activeTool === 'area' && currentPoints.length >= 2) {
      const previewPts = [...currentPoints, hoverPoint];
      const sqm = calculatePolygonArea(previewPts, shapeScale);
      const conv = isImperial ? sqm * 10.76391 : sqm;
      const uLabel = isImperial ? 'sqft' : 'sqm';
      return `Area: ${conv.toFixed(2)} ${uLabel}`;
    }

    if (activeTool === 'calibrate' && calibrationPoints.length === 1) {
      const px = distanceBetween(calibrationPoints[0], hoverPoint);
      return `${Math.round(px)} px`;
    }

    return null;
  }, [activeTool, currentPoints, hoverPoint, hoverAngle, scale, displayUnit, calibrationPoints]);

  // Live running cumulative total measurement for the Viewport Drawing HUD
  const liveTotalText = useMemo(() => {
    if (currentPoints.length === 0) return null;
    const shapeScale = scale > 0 ? scale : 0.025;
    const isImperial = displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'yd';

    if (activeTool === 'length') {
      const allPts = hoverPoint ? [...currentPoints, hoverPoint] : currentPoints;
      if (allPts.length < 2) return null;
      const lengthMeters = calculatePolylineLength(allPts, shapeScale);
      const convertedVal = metersToUnit(lengthMeters, displayUnit);
      return `${convertedVal.toFixed(2)} ${displayUnit}`;
    }

    if (activeTool === 'area') {
      const allPts = hoverPoint ? [...currentPoints, hoverPoint] : currentPoints;
      if (allPts.length < 3) return null;
      const sqmArea = calculatePolygonArea(allPts, shapeScale);
      const convertedVal = isImperial ? sqmArea * 10.76391 : sqmArea;
      const areaUnitLabel = isImperial ? 'sqft' : 'sqm';
      return `${convertedVal.toFixed(2)} ${areaUnitLabel}`;
    }

    if (activeTool === 'rectangle' && currentPoints.length === 1 && hoverPoint) {
      const rectPts = createRectanglePoints(currentPoints[0], hoverPoint);
      const sqmArea = calculatePolygonArea(rectPts, shapeScale);
      const convertedVal = isImperial ? sqmArea * 10.76391 : sqmArea;
      const areaUnitLabel = isImperial ? 'sqft' : 'sqm';
      return `${convertedVal.toFixed(2)} ${areaUnitLabel}`;
    }

    return null;
  }, [activeTool, currentPoints, hoverPoint, scale, displayUnit]);

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={(e) => {
          if ((activeTool === 'length' && currentPoints.length >= 2) || (activeTool === 'area' && currentPoints.length >= 3)) {
            e.preventDefault();
            e.stopPropagation();
            finishCurrentShape();
          }
        }}
        onContextMenu={(e) => {
          if ((activeTool === 'length' && currentPoints.length >= 2) || (activeTool === 'area' && currentPoints.length >= 3)) {
            e.preventDefault();
            e.stopPropagation();
            finishCurrentShape();
          }
        }}
        className={`absolute inset-0 z-10 select-none ${
          isSpacePressed
            ? 'cursor-grab active:cursor-grabbing pointer-events-none'
            : activeTool === 'select'
            ? 'cursor-default'
            : 'cursor-crosshair'
        }`}
        style={{
          touchAction: isSpacePressed ? 'auto' : 'none',
          pointerEvents: isSpacePressed ? 'none' : 'auto'
        }}
      >
        <defs>
          <filter id="shape-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* ── Render Existing Completed Shapes ────────────────────────────── */}
        {shapes.map((shape) => {
          const isHovered = hoveredShapeId === shape.id;
          const isSelected = selectedShapeId === shape.id;

          if (shape.type === 'length') {
            const pointsStr = shape.points.map(p => `${p.x},${p.y}`).join(' ');
            const midIdx = Math.floor(shape.points.length / 2);
            const midPt = shape.points[midIdx] || { x: 0, y: 0 };

            return (
              <g 
                key={shape.id} 
                onMouseEnter={() => setHoveredShapeId(shape.id)} 
                onMouseLeave={() => setHoveredShapeId(null)}
                onClick={(e) => {
                  if (activeTool === 'select') {
                    e.stopPropagation();
                    setSelectedShapeId(shape.id);
                  }
                }}
                className="pointer-events-auto cursor-pointer"
              >
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={shape.color}
                  strokeWidth={isSelected ? 4 : isHovered ? 3.5 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-150"
                />
                {shape.points.map((p, idx) => (
                  <circle 
                    key={idx} 
                    cx={p.x} 
                    cy={p.y} 
                    r={(isSelected ? 6 : isHovered ? 4 : 3) * badgeScale} 
                    fill={isSelected ? "#3b82f6" : "#ffffff"} 
                    stroke={shape.color} 
                    strokeWidth={isSelected ? 2.5 : 2} 
                    onPointerDown={(e) => {
                      if (activeTool === 'select' && isSelected) {
                        e.stopPropagation();
                        setDraggingVertex({ shapeId: shape.id, index: idx });
                      }
                    }}
                    className={isSelected ? "cursor-grab active:cursor-grabbing hover:scale-125 transition-transform" : ""}
                  />
                ))}
                {/* Length Badge (Zoom-Invariant) */}
                <g transform={`translate(${midPt.x}, ${midPt.y - 14 * badgeScale}) scale(${badgeScale})`} filter="url(#shape-shadow)">
                  <rect 
                    x="-42" 
                    y="-11" 
                    width="84" 
                    height="20" 
                    rx="5" 
                    fill="#0f172a" 
                    fillOpacity="0.9" 
                    stroke={isSelected ? "#3b82f6" : shape.color} 
                    strokeWidth={isSelected ? 2 : 1} 
                  />
                  <text x="0" y="0" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                    {formatShapeMeasurement(shape)}
                  </text>
                </g>
              </g>
            );
          }

          if (shape.type === 'area') {
            const pointsStr = shape.points.map(p => `${p.x},${p.y}`).join(' ');
            const centerPt = shape.points.reduce(
              (acc, p) => ({ x: acc.x + p.x / shape.points.length, y: acc.y + p.y / shape.points.length }),
              { x: 0, y: 0 }
            );

            return (
              <g 
                key={shape.id} 
                onMouseEnter={() => setHoveredShapeId(shape.id)} 
                onMouseLeave={() => setHoveredShapeId(null)}
                onClick={(e) => {
                  if (activeTool === 'select') {
                    e.stopPropagation();
                    setSelectedShapeId(shape.id);
                  }
                }}
                className="pointer-events-auto cursor-pointer"
              >
                <polygon
                  points={pointsStr}
                  fill={shape.color}
                  fillOpacity={isSelected ? 0.45 : isHovered ? 0.38 : 0.25}
                  stroke={shape.color}
                  strokeWidth={isSelected ? 3.5 : isHovered ? 3 : 2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-150"
                />
                {shape.points.map((p, idx) => (
                  <circle 
                    key={idx} 
                    cx={p.x} 
                    cy={p.y} 
                    r={(isSelected ? 6 : isHovered ? 4 : 3) * badgeScale} 
                    fill={isSelected ? "#10b981" : "#ffffff"} 
                    stroke={shape.color} 
                    strokeWidth={isSelected ? 2.5 : 2} 
                    onPointerDown={(e) => {
                      if (activeTool === 'select' && isSelected) {
                        e.stopPropagation();
                        setDraggingVertex({ shapeId: shape.id, index: idx });
                      }
                    }}
                    className={isSelected ? "cursor-grab active:cursor-grabbing hover:scale-125 transition-transform" : ""}
                  />
                ))}
                {/* Area Badge (Zoom-Invariant) */}
                <g transform={`translate(${centerPt.x}, ${centerPt.y}) scale(${badgeScale})`} filter="url(#shape-shadow)">
                  <rect 
                    x="-48" 
                    y="-12" 
                    width="96" 
                    height="22" 
                    rx="6" 
                    fill="#0f172a" 
                    fillOpacity="0.9" 
                    stroke={isSelected ? "#10b981" : shape.color} 
                    strokeWidth={isSelected ? 2 : 1} 
                  />
                  <text x="0" y="0" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                    {formatShapeMeasurement(shape)}
                  </text>
                </g>
              </g>
            );
          }

          return null;
        })}

        {/* ── Active Drawing Preview: Length, Area, or Rectangle ─────────── */}
        {currentPoints.length > 0 && (
          <g>
            {activeTool === 'length' && (
              <>
                <polyline
                  points={[...currentPoints, ...(hoverPoint ? [hoverPoint] : [])].map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {currentPoints.map((p, idx) => {
                  const isLast = idx === currentPoints.length - 1;
                  const canFinish = currentPoints.length >= 2;
                  return (
                    <g key={idx}>
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={(isLast && canFinish ? 6.5 : 4.5) * badgeScale} 
                        fill={isLast && canFinish ? "#10b981" : "#2563eb"} 
                        stroke="#ffffff" 
                        strokeWidth={2} 
                        className={isLast && canFinish ? "cursor-pointer animate-pulse" : ""}
                        onClick={(e) => {
                          if (isLast && canFinish) {
                            e.stopPropagation();
                            finishCurrentShape();
                          }
                        }}
                      />
                      {isLast && canFinish && (
                        <g 
                          transform={`translate(${p.x}, ${p.y - 14 * badgeScale}) scale(${badgeScale})`} 
                          className="cursor-pointer pointer-events-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            finishCurrentShape();
                          }}
                          filter="url(#shape-shadow)"
                        >
                          <rect x="-38" y="-10" width="76" height="18" rx="5" fill="#059669" stroke="#ffffff" strokeWidth={1} />
                          <text x="0" y="0" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                            ✓ Click to Finish
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {activeTool === 'area' && (
              <>
                <polygon
                  points={[...currentPoints, ...(hoverPoint ? [hoverPoint] : [])].map(p => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(22, 163, 74, 0.2)"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  vectorEffect="non-scaling-stroke"
                />
                {currentPoints.map((p, idx) => {
                  const isStart = idx === 0;
                  const canClose = currentPoints.length >= 3;
                  return (
                    <g key={idx}>
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={(isStart && canClose ? 6.5 : 4.5) * badgeScale} 
                        fill={isStart && canClose ? "#10b981" : "#16a34a"} 
                        stroke="#ffffff" 
                        strokeWidth={2} 
                        className={isStart && canClose ? "cursor-pointer animate-pulse" : ""}
                        onClick={(e) => {
                          if (isStart && canClose) {
                            e.stopPropagation();
                            finishCurrentShape();
                          }
                        }}
                      />
                      {isStart && canClose && (
                        <g 
                          transform={`translate(${p.x}, ${p.y - 14 * badgeScale}) scale(${badgeScale})`} 
                          className="cursor-pointer pointer-events-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            finishCurrentShape();
                          }}
                          filter="url(#shape-shadow)"
                        >
                          <rect x="-36" y="-10" width="72" height="18" rx="5" fill="#059669" stroke="#ffffff" strokeWidth={1} />
                          <text x="0" y="0" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                            ✓ Close Loop
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {activeTool === 'rectangle' && currentPoints.length === 1 && hoverPoint && (
              <>
                {(() => {
                  const rectPts = createRectanglePoints(currentPoints[0], hoverPoint);
                  return (
                    <>
                      <polygon
                        points={rectPts.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="rgba(8, 145, 178, 0.2)"
                        stroke="#0891b2"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        vectorEffect="non-scaling-stroke"
                      />
                      {rectPts.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r={4 * badgeScale} fill="#0891b2" stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </>
                  );
                })()}
              </>
            )}
          </g>
        )}

        {/* ── Magnetic Snapping Target Indicator ──────────────────────────── */}
        {activeSnap && (
          <g transform={`translate(${activeSnap.snapPoint.x}, ${activeSnap.snapPoint.y}) scale(${badgeScale})`}>
            <circle r={12} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" className="animate-spin" />
            <circle r={4} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} />
            <path d="M -8 0 L 8 0 M 0 -8 L 0 8" stroke="#f59e0b" strokeWidth={1.5} />
          </g>
        )}

        {/* ── Live Heads-Up Dimension Tooltip (HUD) ──────────────────────── */}
        {hoverPoint && liveHUDText && !isSpacePressed && (
          <g transform={`translate(${hoverPoint.x + 14 * badgeScale}, ${hoverPoint.y + 14 * badgeScale}) scale(${badgeScale})`} filter="url(#shape-shadow)">
            <rect
              x="-6"
              y="-12"
              width={Math.max(80, liveHUDText.length * 7.5)}
              height="20"
              rx="5"
              fill="#0f172a"
              fillOpacity="0.95"
              stroke="#3b82f6"
              strokeWidth={1.2}
            />
            <text x="3" y="2" fill="#ffffff" fontSize="10" fontWeight="bold" dominantBaseline="middle">
              {liveHUDText}
            </text>
          </g>
        )}

        {/* ── Active Calibration Feedback ─────────────────────────────────── */}
        {activeTool === 'calibrate' && (
          <g>
            {calibrationPoints.length >= 1 && (
              <g>
                <circle 
                  cx={calibrationPoints[0].x} 
                  cy={calibrationPoints[0].y} 
                  r={8 * badgeScale} 
                  fill="#f43f5e" 
                  stroke="#ffffff" 
                  strokeWidth={2.5} 
                  className="animate-pulse"
                />
                <circle 
                  cx={calibrationPoints[0].x} 
                  cy={calibrationPoints[0].y} 
                  r={14 * badgeScale} 
                  fill="none" 
                  stroke="#f43f5e" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                />
                <g transform={`translate(${calibrationPoints[0].x + 10 * badgeScale}, ${calibrationPoints[0].y - 10 * badgeScale}) scale(${badgeScale})`} filter="url(#shape-shadow)">
                  <rect x="0" y="-8" width="26" height="16" rx="4" fill="#f43f5e" />
                  <text x="13" y="2" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                    P1
                  </text>
                </g>
              </g>
            )}

            {calibrationPoints.length === 1 && hoverPoint && (
              <g>
                <line
                  x1={calibrationPoints[0].x}
                  y1={calibrationPoints[0].y}
                  x2={hoverPoint.x}
                  y2={hoverPoint.y}
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={hoverPoint.x} cy={hoverPoint.y} r={5 * badgeScale} fill="#f43f5e" stroke="#ffffff" strokeWidth={2} />
                <g 
                  transform={`translate(${(calibrationPoints[0].x + hoverPoint.x) / 2}, ${(calibrationPoints[0].y + hoverPoint.y) / 2 - 12 * badgeScale}) scale(${badgeScale})`} 
                  filter="url(#shape-shadow)"
                >
                  <rect x="-35" y="-10" width="70" height="18" rx="4" fill="#0f172a" fillOpacity="0.9" stroke="#f43f5e" strokeWidth={1} />
                  <text x="0" y="0" fill="#f43f5e" fontSize="9" fontWeight="black" textAnchor="middle" dominantBaseline="middle">
                    {Math.round(liveCalDistance)} px
                  </text>
                </g>
              </g>
            )}

            {calibrationPoints.length === 2 && (
              <g>
                <line
                  x1={calibrationPoints[0].x}
                  y1={calibrationPoints[0].y}
                  x2={calibrationPoints[1].x}
                  y2={calibrationPoints[1].y}
                  stroke="#f43f5e"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={calibrationPoints[1].x} cy={calibrationPoints[1].y} r={8 * badgeScale} fill="#f43f5e" stroke="#ffffff" strokeWidth={2.5} />
                <g transform={`translate(${calibrationPoints[1].x + 10 * badgeScale}, ${calibrationPoints[1].y - 10 * badgeScale}) scale(${badgeScale})`} filter="url(#shape-shadow)">
                  <rect x="0" y="-8" width="26" height="16" rx="4" fill="#f43f5e" />
                  <text x="13" y="2" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                    P2
                  </text>
                </g>
                <g 
                  transform={`translate(${(calibrationPoints[0].x + calibrationPoints[1].x) / 2}, ${(calibrationPoints[0].y + calibrationPoints[1].y) / 2 - 14 * badgeScale}) scale(${badgeScale})`} 
                  filter="url(#shape-shadow)"
                >
                  <rect x="-40" y="-12" width="80" height="20" rx="5" fill="#0f172a" stroke="#f43f5e" strokeWidth={1.5} />
                  <text x="0" y="0" fill="#ffffff" fontSize="10" fontWeight="black" textAnchor="middle" dominantBaseline="middle">
                    {calPixelDistance.toFixed(1)} px
                  </text>
                </g>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* ── Viewport-Fixed Active Drawing & Measurement HUD (PORTALED) ────────── */}
      {currentPoints.length >= 1 && activeTool !== 'select' && activeTool !== 'calibrate' && (() => {
        const canFinish = currentPoints.length >= (activeTool === 'length' ? 2 : activeTool === 'area' ? 3 : 2);
        
        const hudContent = (
          <div className="flex items-center gap-2 sm:gap-3 bg-surface-card/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 px-3 rounded-2xl border-2 border-accent/40 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none">
            {/* Active Tool Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 rounded-xl border border-accent/30 text-accent text-xs font-black">
              {activeTool === 'length' ? (
                <Ruler className="w-3.5 h-3.5" />
              ) : activeTool === 'area' ? (
                <Spline className="w-3.5 h-3.5" />
              ) : (
                <Box className="w-3.5 h-3.5" />
              )}
              <span className="capitalize">{activeTool === 'length' ? 'Wall Run' : activeTool === 'area' ? 'Room Area' : 'Box Room'}</span>
            </div>

            {/* Points Counter */}
            <span className="text-xs font-bold text-text-secondary whitespace-nowrap">
              {currentPoints.length} {currentPoints.length === 1 ? 'pt' : 'pts'}
            </span>

            {/* Live Cumulative Total Measurement */}
            {liveTotalText && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-100 dark:bg-slate-800 rounded-xl border border-surface-200 dark:border-slate-700 text-xs font-black font-mono text-foreground whitespace-nowrap">
                <span className="text-[10px] uppercase font-bold text-text-secondary">Live:</span>
                <span>{liveTotalText}</span>
              </div>
            )}

            <div className="h-4 w-px bg-surface-200 dark:bg-slate-700 hidden sm:block" />

            {/* Undo Last Point */}
            <button
              type="button"
              onClick={handleUndoPoint}
              className="flex items-center gap-1 px-2.5 py-1 bg-surface-100 dark:bg-slate-800 hover:bg-surface-200 dark:hover:bg-slate-700 text-foreground text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="Undo last placed point (Backspace)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-text-secondary" />
              <span className="hidden md:inline">Undo</span>
            </button>

            {/* Prominent Finish Button */}
            {canFinish && (
              <button
                type="button"
                onClick={finishCurrentShape}
                className="flex items-center gap-1.5 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                title="Finish and calculate measurement (Enter, Double-Click, or Right-Click)"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish (Enter)</span>
              </button>
            )}

            {/* Cancel Drawing */}
            <button
              type="button"
              onClick={() => { setCurrentPoints([]); setHoverPoint(null); }}
              className="p-1.5 text-surface-400 hover:text-red-500 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cancel drawing (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );

        return hudTarget ? createPortal(hudContent, hudTarget) : (
          <div className="absolute top-3 right-3 z-30">{hudContent}</div>
        );
      })()}

      {/* ── Viewport-Fixed Element Selection Floater (PORTALED) ──────────────── */}
      {activeTool === 'select' && selectedShapeId && (() => {
        const selectionContent = (
          <div className="flex items-center gap-2.5 bg-surface-card/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 px-3.5 rounded-2xl border-2 border-blue-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Element Selected (Drag vertices to edit)
            </span>
            <button
              type="button"
              onClick={() => {
                onDeleteShape(selectedShapeId);
                setSelectedShapeId(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="Delete selected element (Delete or Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedShapeId(null)}
              className="p-1 text-surface-400 hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );

        return hudTarget ? createPortal(selectionContent, hudTarget) : (
          <div className="absolute top-3 right-3 z-30">{selectionContent}</div>
        );
      })()}

      {/* 📐 ARCHITECTURAL CALIBRATION MODAL (PORTALED) */}
      {showCalibrateModal && calibrationPoints.length === 2 && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="bg-surface-card text-foreground p-5 sm:p-6 rounded-2xl shadow-2xl border-2 border-surface-300 dark:border-surface-200 w-[440px] max-w-[94vw] flex flex-col space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Ruler size={19} />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground tracking-tight">Calibrate Drawing Scale</h3>
                  <p className="text-[11px] text-surface-400 font-medium">Set real-world distance between reference points</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={cancelCalibration} 
                className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center text-surface-400 hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Pixel Distance pill */}
            <div className="flex items-center justify-between bg-surface-100 p-2.5 px-3.5 rounded-xl text-xs">
              <span className="text-surface-400 font-medium">Measured Blueprint Distance:</span>
              <span className="font-mono font-black text-foreground">{calPixelDistance.toFixed(1)} px</span>
            </div>

            {/* Real World Distance Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Known Real-World Distance</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={calibrateInput}
                    onChange={(e) => setCalibrateInput(e.target.value)}
                    placeholder={selectedUnit === 'ft' ? "e.g. 10.0 or 10'6\"" : "e.g. 3.0 or 3000"}
                    autoFocus
                    className="w-full h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-sm font-bold text-foreground outline-none focus:border-accent transition-colors"
                  />
                  {parsedDimension && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary font-mono">
                      ≈ {parsedDimension.meters.toFixed(3)} m
                    </div>
                  )}
                </div>

                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value as CalibrationUnit)}
                  className="h-10 px-3 bg-surface-100 border border-surface-200 rounded-xl text-xs font-black text-foreground outline-none cursor-pointer"
                >
                  {UNIT_LIST.map(u => (
                    <option key={u.unit} value={u.unit}>
                      {u.label} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Architectural Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Sparkles size={13} className="text-accent" />
                  Common Presets
                </span>
                <div className="flex gap-1">
                  {(['all', 'metric', 'imperial'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPresetCategory(cat)}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md transition-colors ${
                        presetCategory === cat 
                          ? 'bg-accent/15 text-accent border border-accent/30' 
                          : 'text-surface-400 hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCalibrateInput(String(preset.value));
                      setSelectedUnit(preset.unit);
                    }}
                    className="flex flex-col items-start p-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 transition-colors text-left group"
                  >
                    <span className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors leading-tight">
                      {preset.label}
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary mt-0.5">
                      {preset.value} {preset.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Scale Preview */}
            {previewScaleInMeters && (
              <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-accent">Computed Plan Scale:</span>
                  <span className="font-mono font-black text-foreground">
                    {formatScaleValue(previewScaleInMeters, selectedUnit)}
                  </span>
                </div>
                <div className="text-[10px] text-text-secondary font-mono">
                  1 pixel = {(previewScaleInMeters * 1000).toFixed(2)} mm • {getSecondaryScaleEquivalents(previewScaleInMeters, selectedUnit)}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200">
              <button
                type="button"
                onClick={cancelCalibration}
                className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-foreground hover:bg-surface-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!previewScaleInMeters || previewScaleInMeters <= 0}
                onClick={applyCalibration}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent text-background font-black text-xs rounded-xl shadow-sm hover:scale-102 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <CheckCircle2 size={15} />
                <span>Apply Calibration</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
