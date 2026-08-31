import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEstimationStore } from '@/store/estimation-store';
import { Point } from '@/types/estimation.types';
import { 
  CalibrationUnit, 
  CALIBRATION_UNITS, 
  UNIT_LIST, 
  COMMON_CALIBRATION_PRESETS, 
  parseArchitecturalDimension, 
  formatScaleValue, 
  getSecondaryScaleEquivalents 
} from '@/lib/estimation/units';
import { Move, Ruler, Check, X, Sparkles } from 'lucide-react';

export const SvgDrawingLayer = ({ width = 1000, height = 1000 }: { width?: number, height?: number }) => {
  const { 
    activeTool, 
    items, 
    addItem, 
    setSelection, 
    setHover, 
    selectedItemId, 
    hoveredItemId, 
    pixelToMeterScale, 
    calibrationUnit, 
    setCalibrationScale, 
    setActiveTool, 
    updateItem 
  } = useEstimationStore();

  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [calibrateInput, setCalibrateInput] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<CalibrationUnit>(calibrationUnit || 'm');
  const [presetCategory, setPresetCategory] = useState<'all' | 'metric' | 'imperial'>('all');
  const [draggingVertex, setDraggingVertex] = useState<{ itemId: string, index: number } | null>(null);

  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const pixelDistance = useMemo(() => {
    if (calibrationPoints.length < 2) return 0;
    const dx = calibrationPoints[1].x - calibrationPoints[0].x;
    const dy = calibrationPoints[1].y - calibrationPoints[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [calibrationPoints]);

  const parsedDimension = useMemo(() => {
    if (!calibrateInput) return null;
    return parseArchitecturalDimension(calibrateInput, selectedUnit);
  }, [calibrateInput, selectedUnit]);

  const previewScaleInMeters = useMemo(() => {
    if (!parsedDimension || pixelDistance <= 0) return null;
    return parsedDimension.meters / pixelDistance;
  }, [parsedDimension, pixelDistance]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === 'select') return;
    
    // Use SVG CTM for robust coordinate mapping regardless of CSS scaling
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const x = cursorPt.x;
    const y = cursorPt.y;

    if (activeTool === 'calibrate') {
      const newPoints = [...calibrationPoints, { x, y }];
      if (newPoints.length === 1) {
         setCalibrationPoints(newPoints);
      } else if (newPoints.length === 2) {
         setCalibrationPoints(newPoints);
         setSelectedUnit(calibrationUnit || 'm');
         setShowCalibrateModal(true);
      }
      return;
    }

    if (activeTool === 'point') {
      // Immediate add for count
      addItem({
        id: crypto.randomUUID(),
        item_code: `ITEM-${items.length + 1}`,
        description: `New Count takeoff`,
        type: 'count',
        points: [{ x, y }],
        color: '#D4AF37',
        unit: 'ea',
        gross_qty: 1,
        multiplier: "1",
        net_qty: 1,
        unit_cost: 0,
        total_cost: 0
      });
      return;
    }

    setCurrentPoints([...currentPoints, { x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingVertex) {
      const svg = e.currentTarget;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const cursorPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      
      const item = items.find(i => i.id === draggingVertex.itemId);
      if (item) {
        const newPoints = [...item.points];
        newPoints[draggingVertex.index] = { x: cursorPt.x, y: cursorPt.y };
        updateItem(item.id, { points: newPoints });
      }
    }
  };

  const handlePointerUp = () => {
    if (draggingVertex) {
      setDraggingVertex(null);
    }
  };

  const handleDoubleClick = () => {
    if (activeTool === 'select' || activeTool === 'point') return;
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      return;
    }
    
    // Auto-calculate geometry based on tool
    let gross_qty = 0;
    if (activeTool === 'line') {
      // Calculate total length
      for(let i = 1; i < currentPoints.length; i++) {
        const dx = currentPoints[i].x - currentPoints[i-1].x;
        const dy = currentPoints[i].y - currentPoints[i-1].y;
        gross_qty += Math.sqrt(dx*dx + dy*dy) * pixelToMeterScale;
      }
    } else if (activeTool === 'polygon') {
      // Calculate area using Shoelace formula
      let area = 0;
      for (let i = 0; i < currentPoints.length; i++) {
        const j = (i + 1) % currentPoints.length;
        area += currentPoints[i].x * currentPoints[j].y;
        area -= currentPoints[j].x * currentPoints[i].y;
      }
      gross_qty = Math.abs(area / 2) * (pixelToMeterScale * pixelToMeterScale);
    }
    
    addItem({
      id: crypto.randomUUID(),
      item_code: `ITEM-${items.length + 1}`,
      description: `New ${activeTool} takeoff`,
      type: activeTool === 'polygon' ? 'area' : 'length',
      points: currentPoints,
      color: '#D4AF37',
      unit: activeTool === 'polygon' ? 'sqft' : 'ft',
      gross_qty: parseFloat(gross_qty.toFixed(2)),
      multiplier: "1",
      net_qty: parseFloat(gross_qty.toFixed(2)),
      unit_cost: 0,
      total_cost: 0
    });
    
    setCurrentPoints([]);
  };

  const submitCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedDimension || parsedDimension.meters <= 0 || pixelDistance <= 0) return;

    // Canonical scale: 1 pixel = newScaleInMeters meters
    const newScaleInMeters = parsedDimension.meters / pixelDistance;
    const finalUnit = parsedDimension.detectedUnit || selectedUnit;

    setCalibrationScale(newScaleInMeters, finalUnit);
    
    // Retroactively update all existing takeoffs with new scale
    items.forEach(item => {
      let newGross = 0;
      if (item.type === 'length') {
        for(let i = 1; i < item.points.length; i++) {
          const dx2 = item.points[i].x - item.points[i-1].x;
          const dy2 = item.points[i].y - item.points[i-1].y;
          newGross += Math.sqrt(dx2*dx2 + dy2*dy2) * newScaleInMeters;
        }
      } else if (item.type === 'area') {
        let area = 0;
        for (let i = 0; i < item.points.length; i++) {
          const j = (i + 1) % item.points.length;
          area += item.points[i].x * item.points[j].y;
          area -= item.points[j].x * item.points[i].y;
        }
        area = Math.abs(area / 2) * (newScaleInMeters * newScaleInMeters);
        newGross = area;
      } else {
        newGross = item.gross_qty;
      }
      
      updateItem(item.id, { gross_qty: parseFloat(newGross.toFixed(2)) });
    });

    setShowCalibrateModal(false);
    setCalibrationPoints([]);
    setCalibrateInput('');
    setActiveTool('select');
  };

  const drawPath = (points: Point[], close: boolean) => {
    if (points.length === 0) return '';
    const d = `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
    return close ? d + ' Z' : d;
  };

  const filteredPresets = useMemo(() => {
    if (presetCategory === 'all') return COMMON_CALIBRATION_PRESETS;
    return COMMON_CALIBRATION_PRESETS.filter(p => p.category === presetCategory);
  }, [presetCategory]);

  return (
    <>
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        className={`absolute inset-0 w-full h-full z-10 ${activeTool !== 'select' ? 'cursor-crosshair' : (draggingVertex ? 'cursor-grabbing' : '')}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ pointerEvents: (activeTool === 'select' && !showCalibrateModal) ? 'auto' : 'auto' }}
      >
      {/* Completed Items */}
      {items.map(item => (
        <g 
          key={item.id}
          className="cursor-pointer pointer-events-auto"
          onClick={(e) => {
            if (activeTool !== 'select') return;
            e.stopPropagation();
            setSelection(item.id);
          }}
          onMouseEnter={() => setHover(item.id)}
          onMouseLeave={() => setHover(null)}
          style={{ opacity: hoveredItemId === item.id || selectedItemId === item.id ? 1 : 0.7 }}
        >
          {item.type === 'count' && item.points[0] && (
            <circle cx={item.points[0].x} cy={item.points[0].y} r={6} fill={item.color} 
              stroke={selectedItemId === item.id ? '#fff' : 'transparent'} strokeWidth={2} />
          )}

          {/* Invisible thick path for reliable hovering/clicking */}
          {item.type !== 'count' && (
            <path 
              d={drawPath(item.points, item.type === 'area')} 
              fill={item.type === 'area' ? "transparent" : "none"} 
              stroke="transparent" 
              strokeWidth={20} 
            />
          )}

          {item.type === 'length' && (
            <path 
              d={drawPath(item.points, false)} 
              fill="none" 
              stroke={item.color} 
              strokeWidth={selectedItemId === item.id ? 4 : 2} 
              className="pointer-events-none"
            />
          )}
          {item.type === 'area' && (
            <path 
              d={drawPath(item.points, true)} 
              fill={item.color} fillOpacity={0.2}
              stroke={item.color} 
              strokeWidth={selectedItemId === item.id ? 4 : 2} 
              className="pointer-events-none"
            />
          )}

          {/* Interactive Drag Handles */}
          {selectedItemId === item.id && activeTool === 'select' && (
            item.points.map((pt, idx) => (
              <circle
                key={`handle-${item.id}-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={8}
                fill="#fff"
                stroke={item.color}
                strokeWidth={3}
                className="cursor-grab"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingVertex({ itemId: item.id, index: idx });
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
            ))
          )}
        </g>
      ))}
      
      {/* Draft Shape */}
      {currentPoints.length > 0 && (
        <path 
          d={drawPath(currentPoints, activeTool === 'polygon')} 
          fill={activeTool === 'polygon' ? 'rgba(212, 175, 55, 0.2)' : 'none'} 
          stroke="#D4AF37" 
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      )}
      
      {/* Calibration Line */}
      {calibrationPoints.length > 0 && (
        <g>
          {calibrationPoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={6} fill="#f43f5e" stroke="#ffffff" strokeWidth={2} />
              <text x={p.x + 8} y={p.y - 8} fill="#f43f5e" fontSize={11} fontWeight="bold">
                P{i + 1}
              </text>
            </g>
          ))}
          {calibrationPoints.length === 2 && (
            <g>
              <path 
                d={`M ${calibrationPoints[0].x},${calibrationPoints[0].y} L ${calibrationPoints[1].x},${calibrationPoints[1].y}`} 
                stroke="#f43f5e" 
                strokeWidth={3} 
                strokeDasharray="5 5" 
              />
              <circle 
                cx={(calibrationPoints[0].x + calibrationPoints[1].x) / 2} 
                cy={(calibrationPoints[0].y + calibrationPoints[1].y) / 2} 
                r={4} 
                fill="#f43f5e" 
              />
            </g>
          )}
        </g>
      )}
    </svg>

    {/* 📐 Enhanced Architectural Calibration Modal */}
    {showCalibrateModal && calibrationPoints.length === 2 && typeof document !== 'undefined' && createPortal(
      <div 
        className="fixed z-[9999] pointer-events-none"
        style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${modalPos.x}px), calc(-50% + ${modalPos.y}px))` }}
      >
        <div 
          className="bg-surface-card text-foreground p-5 rounded-2xl shadow-2xl border-2 border-surface-300 dark:border-surface-200 w-[420px] max-w-[94vw] pointer-events-auto flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150"
          onPointerDown={(e) => {
            setIsDraggingModal(true);
            setDragStart({ x: e.clientX - modalPos.x, y: e.clientY - modalPos.y });
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (isDraggingModal) {
              setModalPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }
          }}
          onPointerUp={(e) => {
            setIsDraggingModal(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          style={{ cursor: isDraggingModal ? 'grabbing' : 'grab' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
                <Ruler size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground tracking-tight">Calibrate Drawing Scale</h3>
                <p className="text-[10px] text-surface-400 font-medium">Set real-world distance between reference points</p>
              </div>
            </div>
            <button 
              type="button" 
              onPointerDown={e => e.stopPropagation()} 
              onClick={() => { 
                setShowCalibrateModal(false); 
                setCalibrationPoints([]); 
                setActiveTool('select'); 
                setModalPos({ x: 0, y: 0 }); 
              }} 
              className="w-7 h-7 rounded-lg hover:bg-surface-100 flex items-center justify-center text-surface-400 hover:text-foreground cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={submitCalibration} className="space-y-4" onPointerDown={e => e.stopPropagation()}>
            {/* Reference Line Pixel Status */}
            <div className="flex items-center justify-between px-3 py-2 bg-surface-50 dark:bg-surface-100/40 rounded-xl border border-surface-200 text-xs">
              <span className="text-[11px] font-bold text-surface-500 dark:text-surface-400">Measured Line:</span>
              <span className="font-mono font-black text-rose-500 dark:text-rose-400">{pixelDistance.toFixed(1)} px</span>
            </div>

            {/* Distance Input & Unit Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-surface-400">
                  Known Real-World Distance
                </label>
                <span className="text-[10px] text-surface-400 font-medium">
                  e.g. 10, 3000mm, 10' 6", 120in
                </span>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={calibrateInput}
                  onChange={e => setCalibrateInput(e.target.value)}
                  className="flex-1 h-10 bg-surface-50 dark:bg-surface-100/50 border-2 border-surface-200 focus:border-accent rounded-xl px-3 text-sm font-bold font-mono outline-none text-foreground cursor-text transition-all placeholder:text-surface-400/60"
                  placeholder={selectedUnit === 'mm' ? 'e.g. 3000' : selectedUnit === 'ft' ? 'e.g. 10 or 10\' 6"' : selectedUnit === 'in' ? 'e.g. 120' : 'e.g. 3.0'}
                />

                {/* Unit Selector Dropdown */}
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value as CalibrationUnit)}
                  className="h-10 px-3 bg-surface-50 dark:bg-surface-100/50 border-2 border-surface-200 focus:border-accent rounded-xl text-xs font-bold text-foreground cursor-pointer outline-none transition-all shadow-2xs"
                >
                  {UNIT_LIST.map(u => (
                    <option key={u.unit} value={u.unit} className="bg-surface-card text-foreground">
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Architectural Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-accent" /> Quick Architectural Presets
                </span>
                <div className="flex gap-1">
                  {(['all', 'metric', 'imperial'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPresetCategory(cat)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        presetCategory === cat 
                          ? 'bg-accent text-background font-black' 
                          : 'text-surface-400 hover:text-foreground hover:bg-surface-100'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 max-h-24 overflow-y-auto no-scrollbar pr-0.5">
                {filteredPresets.map(preset => (
                  <button
                    key={`${preset.value}-${preset.unit}-${preset.label}`}
                    type="button"
                    onClick={() => {
                      setCalibrateInput(preset.value.toString());
                      setSelectedUnit(preset.unit);
                    }}
                    className="flex flex-col items-start px-2 py-1.5 bg-surface-50 dark:bg-surface-100/30 hover:bg-accent/10 border border-surface-200 hover:border-accent/40 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <span className="text-[11px] font-bold font-mono text-foreground group-hover:text-accent">
                      {preset.label}
                    </span>
                    {preset.note && (
                      <span className="text-[8px] text-surface-400 truncate w-full">
                        {preset.note}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 📊 Live Scale Preview Box */}
            {previewScaleInMeters ? (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                <div className="flex items-center justify-between text-xs font-black text-foreground">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Calculated Scale:</span>
                  <span className="font-mono">
                    1 px = {formatScaleValue(previewScaleInMeters, selectedUnit)} {CALIBRATION_UNITS[selectedUnit].symbol}
                  </span>
                </div>
                <div className="text-[10px] text-surface-400 font-mono flex items-center justify-between border-t border-accent/20 pt-1">
                  <span>Equivalents:</span>
                  <span className="font-medium text-foreground">
                    {getSecondaryScaleEquivalents(previewScaleInMeters, selectedUnit)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-surface-50 dark:bg-surface-100/20 border border-dashed border-surface-200 rounded-xl text-center text-[10px] text-surface-400">
                Enter a distance above or select a preset to preview calibration scale
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button 
                type="button" 
                onClick={() => { 
                  setShowCalibrateModal(false); 
                  setCalibrationPoints([]); 
                  setActiveTool('select'); 
                  setModalPos({ x: 0, y: 0 }); 
                }} 
                className="flex-1 h-9 bg-surface-100 dark:bg-surface-200/60 hover:bg-surface-200 text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={!previewScaleInMeters || previewScaleInMeters <= 0}
                className="flex-1 h-9 bg-accent text-background text-xs font-black rounded-xl hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-accent/20 active:scale-95"
              >
                <Check size={14} className="stroke-[3px]" /> Apply Calibration
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};
