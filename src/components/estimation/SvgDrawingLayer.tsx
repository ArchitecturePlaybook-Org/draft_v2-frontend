import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useEstimationStore } from '@/store/estimation-store';
import { Point } from '@/types/estimation.types';

export const SvgDrawingLayer = ({ width = 1000, height = 1000 }: { width?: number, height?: number }) => {
  const { activeTool, items, addItem, setSelection, setHover, selectedItemId, hoveredItemId, pixelToMeterScale, setCalibrationScale, setActiveTool, updateItem } = useEstimationStore();
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [calibrateInput, setCalibrateInput] = useState('');
  const [draggingVertex, setDraggingVertex] = useState<{ itemId: string, index: number } | null>(null);

  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
    
    // Auto-calculate geometry based on tool (rough mock for now)
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
      type: activeTool,
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
    const realWorldDistance = parseFloat(calibrateInput);
    if (isNaN(realWorldDistance) || realWorldDistance <= 0 || calibrationPoints.length < 2) return;

    // Calculate pixel distance
    const dx = calibrationPoints[1].x - calibrationPoints[0].x;
    const dy = calibrationPoints[1].y - calibrationPoints[0].y;
    const pixelDistance = Math.sqrt(dx*dx + dy*dy);

    // new scale: 1 pixel = realWorldDistance / pixelDistance meters (or feet)
    const newScale = realWorldDistance / pixelDistance;
    setCalibrationScale(newScale);
    
    // Retroactively update all existing takeoffs
    items.forEach(item => {
      let newGross = 0;
      if (item.type === 'line') {
        for(let i = 1; i < item.points.length; i++) {
          const dx2 = item.points[i].x - item.points[i-1].x;
          const dy2 = item.points[i].y - item.points[i-1].y;
          newGross += Math.sqrt(dx2*dx2 + dy2*dy2) * newScale;
        }
      } else if (item.type === 'polygon') {
        let area = 0;
        for (let i = 0; i < item.points.length; i++) {
          const j = (i + 1) % item.points.length;
          area += item.points[i].x * item.points[j].y;
          area -= item.points[j].x * item.points[i].y;
        }
        newGross = Math.abs(area / 2) * (newScale * newScale);
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
        style={{ pointerEvents: (activeTool === 'select' && !showCalibrateModal) ? 'auto' : 'auto' }} // Must be auto to catch moves, react-zoom-pan-pinch handles select mode panning when no stopPropagation
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
          {item.type === 'point' && item.points[0] && (
            <circle cx={item.points[0].x} cy={item.points[0].y} r={6} fill={item.color} 
              stroke={selectedItemId === item.id ? '#fff' : 'transparent'} strokeWidth={2} />
          )}

          {/* Invisible thick path for reliable hovering/clicking */}
          {item.type !== 'point' && (
            <path 
              d={drawPath(item.points, item.type === 'polygon')} 
              fill={item.type === 'polygon' ? "transparent" : "none"} 
              stroke="transparent" 
              strokeWidth={20} 
            />
          )}

          {item.type === 'line' && (
            <path 
              d={drawPath(item.points, false)} 
              fill="none" 
              stroke={item.color} 
              strokeWidth={selectedItemId === item.id ? 4 : 2} 
              className="pointer-events-none"
            />
          )}
          {item.type === 'polygon' && (
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
                  e.stopPropagation(); // Prevent deselecting
                  setDraggingVertex({ itemId: item.id, index: idx });
                }}
                onMouseDown={(e) => e.stopPropagation()} // Prevent react-zoom-pan-pinch from panning
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
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#f43f5e" />
          ))}
          {calibrationPoints.length === 2 && (
            <path d={`M ${calibrationPoints[0].x},${calibrationPoints[0].y} L ${calibrationPoints[1].x},${calibrationPoints[1].y}`} stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
          )}
        </g>
      )}
    </svg>

    {/* Calibration Modal */}
    {showCalibrateModal && calibrationPoints.length === 2 && typeof document !== 'undefined' && createPortal(
      <div 
        className="fixed z-[9999] pointer-events-none"
        style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${modalPos.x}px), calc(-50% + ${modalPos.y}px))` }}
      >
        <div 
          className="bg-surface-50 p-6 rounded-2xl shadow-2xl border border-surface-200 pointer-events-auto flex flex-col"
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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center flex-1">Set Known Distance</h4>
          </div>
          <form onSubmit={submitCalibration} className="flex gap-3" onPointerDown={e => e.stopPropagation()}>
            <input 
              type="number" 
              step="any"
              autoFocus
              value={calibrateInput}
              onChange={e => setCalibrateInput(e.target.value)}
              className="w-32 h-10 bg-surface-100 border border-surface-200 rounded-lg px-3 text-sm outline-none focus:border-accent text-primary cursor-text"
              placeholder="e.g. 10"
            />
            <button type="submit" className="h-10 px-4 bg-accent text-white text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-accent-light transition-colors cursor-pointer">
              Set
            </button>
            <button type="button" onClick={() => { setShowCalibrateModal(false); setCalibrationPoints([]); setActiveTool('select'); setModalPos({x:0, y:0}); }} className="h-10 px-4 bg-surface-200 text-surface-600 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-surface-300 transition-colors cursor-pointer">
              Cancel
            </button>
          </form>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};
