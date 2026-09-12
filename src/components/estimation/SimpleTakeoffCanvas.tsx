"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TransformWrapper, 
  TransformComponent, 
  MiniMap, 
  ReactZoomPanPinchRef 
} from 'react-zoom-pan-pinch';
import { SimpleSvgLayer, MeasuredShape } from './SimpleSvgLayer';
import { CalibrationUnit } from '@/lib/estimation/units';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  Ruler, 
  MousePointer2, 
  Spline, 
  Square, 
  Box,
  Compass,
  Magnet,
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Mouse,
  Map as MapIcon,
  X
} from 'lucide-react';

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  if (url.includes('.amazonaws.com/')) {
    try {
      const p = new URL(url);
      return `/s3-assets${p.pathname}${p.search}`;
    } catch {
      return url;
    }
  }
  if (url.startsWith('/s3-assets/')) return url;

  const backendBase =
    process.env.NEXT_PUBLIC_DJANGO_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000';
  const cleanBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase;

  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/media/')) return `${cleanBase}${url}`;
  if (url.startsWith('media/')) return `${cleanBase}/${url}`;
  if (url.startsWith('/')) return `${cleanBase}${url}`;

  return url;
}

interface SimpleTakeoffCanvasProps {
  imageUrl: string;
  planTitle?: string;
  shapes: MeasuredShape[];
  scale: number;
  isCalibrated: boolean;
  displayUnit?: CalibrationUnit;
  onUnitChange?: (unit: CalibrationUnit) => void;
  onAddShape: (shape: MeasuredShape) => void;
  onDeleteShape: (id: string) => void;
  onUpdateShape?: (id: string, updates: Partial<MeasuredShape>) => void;
  onClearShapes: () => void;
  onCalibrate: (scaleInMeters: number, unit?: CalibrationUnit) => void;
}

export const SimpleTakeoffCanvas: React.FC<SimpleTakeoffCanvasProps> = ({
  imageUrl,
  planTitle,
  shapes,
  scale,
  isCalibrated,
  displayUnit = 'm',
  onUnitChange,
  onAddShape,
  onDeleteShape,
  onUpdateShape,
  onClearShapes,
  onCalibrate,
}) => {
  const [activeTool, setActiveTool] = useState<'select' | 'calibrate' | 'length' | 'area' | 'rectangle'>(
    isCalibrated ? 'select' : 'calibrate'
  );
  const [naturalSize, setNaturalSize] = useState({ w: 1200, h: 800 });
  const [imgError, setImgError] = useState(false);
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [activePointsCount, setActivePointsCount] = useState(0);

  // Pan & Zoom Enhancements
  const [currentScale, setCurrentScale] = useState(1);
  const [directWheelZoom, setDirectWheelZoom] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [isMiddleMouseDown, setIsMiddleMouseDown] = useState(false);

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const middleDragStartRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number } | null>(null);

  const resolvedUrl = useMemo(() => resolveImageUrl(imageUrl), [imageUrl]);

  // When calibration changes to true, switch default tool to length
  useEffect(() => {
    if (isCalibrated && activeTool === 'calibrate') {
      setActiveTool('length');
    }
  }, [isCalibrated]);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleGlobalPointerUp = () => {
      setIsMiddleMouseDown(false);
      middleDragStartRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, []);

  // Middle-Mouse button drag to Pan handler
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1) { // Middle click / scroll wheel press
      e.preventDefault();
      setIsMiddleMouseDown(true);
      if (transformRef.current?.state) {
        const { positionX, positionY } = transformRef.current.state;
        middleDragStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          posX: positionX,
          posY: positionY
        };
      }
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMiddleMouseDown && middleDragStartRef.current && transformRef.current) {
      const dx = e.clientX - middleDragStartRef.current.clientX;
      const dy = e.clientY - middleDragStartRef.current.clientY;
      const newX = middleDragStartRef.current.posX + dx;
      const newY = middleDragStartRef.current.posY + dy;
      const { scale: currentS } = transformRef.current.state;
      transformRef.current.setTransform(newX, newY, currentS, 0);
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || isMiddleMouseDown) {
      setIsMiddleMouseDown(false);
      middleDragStartRef.current = null;
    }
  };

  return (
    <div className="w-full flex flex-col bg-surface-100 rounded-2xl border border-surface-200 overflow-hidden shadow-sm transition-all duration-300">
      {/* Canvas Top Bar */}
      <div className="h-12 bg-surface-card border-b border-surface-200 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2">
        {/* Left: Takeoff Tools & Snapping Controls */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {/* 1. Pan / Select Mode */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTool === 'select'
                ? 'bg-accent text-background shadow-xs'
                : 'bg-surface-100 hover:bg-surface-200 text-foreground'
            }`}
            title="Pan / Select Mode (Space or Middle-Click to Pan anytime)"
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Select</span>
          </button>

          {/* 2. Calibrate Scale */}
          <button
            type="button"
            onClick={() => setActiveTool('calibrate')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTool === 'calibrate'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-surface-100 hover:bg-surface-200 text-foreground'
            }`}
            title="Calibrate Scale (Click 2 reference points)"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Calibrate</span>
          </button>

          <div className="h-5 w-px bg-surface-200 mx-1" />

          {/* 3. Length Tool (Polyline) */}
          <button
            type="button"
            disabled={!isCalibrated}
            onClick={() => setActiveTool('length')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTool === 'length'
                ? 'bg-blue-600 text-white shadow-xs'
                : isCalibrated
                ? 'bg-surface-100 hover:bg-surface-200 text-foreground'
                : 'opacity-40 cursor-not-allowed text-surface-400 bg-surface-100'
            }`}
            title="Measure Line/Wall Run"
          >
            <Spline className="w-3.5 h-3.5" />
            <span>Length</span>
          </button>

          {/* 4. Area Tool (Polygon) */}
          <button
            type="button"
            disabled={!isCalibrated}
            onClick={() => setActiveTool('area')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTool === 'area'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isCalibrated
                ? 'bg-surface-100 hover:bg-surface-200 text-foreground'
                : 'opacity-40 cursor-not-allowed text-surface-400 bg-surface-100'
            }`}
            title="Measure Freeform Polygon Area"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Area</span>
          </button>

          {/* 5. Rectangle Tool (2-Click Box) */}
          <button
            type="button"
            disabled={!isCalibrated}
            onClick={() => setActiveTool('rectangle')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTool === 'rectangle'
                ? 'bg-cyan-600 text-white shadow-xs'
                : isCalibrated
                ? 'bg-surface-100 hover:bg-surface-200 text-foreground'
                : 'opacity-40 cursor-not-allowed text-surface-400 bg-surface-100'
            }`}
            title="Measure Rectangular Room (2 Clicks: Corner 1 to Corner 2)"
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Box Room</span>
          </button>

          <div className="h-5 w-px bg-surface-200 mx-1" />

          {/* 6. Ortho Snap Toggle (0°/90°/180°/270°) */}
          <button
            type="button"
            onClick={() => setOrthoEnabled(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              orthoEnabled
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                : 'bg-surface-100 border-surface-200 text-text-secondary hover:text-foreground'
            }`}
            title="Orthogonal 90° Angle Lock (Hold Shift while drawing)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="text-[11px]">Ortho</span>
          </button>

          {/* 7. Magnetic Vertex Snapping Toggle */}
          <button
            type="button"
            onClick={() => setSnapEnabled(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              snapEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-surface-100 border-surface-200 text-text-secondary hover:text-foreground'
            }`}
            title="Magnetic Snap to Corner Vertices"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="text-[11px]">Snap</span>
          </button>

          <div className="h-5 w-px bg-surface-200 mx-1 hidden sm:block" />

          {/* Display Unit Switcher */}
          <div className="flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-lg px-2 py-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Unit:</span>
            <select
              value={displayUnit}
              onChange={(e) => onUnitChange?.(e.target.value as CalibrationUnit)}
              className="bg-transparent text-xs font-black text-foreground outline-none cursor-pointer"
            >
              <option value="m">Meters (m / sqm)</option>
              <option value="ft">Feet (ft / sqft)</option>
              <option value="mm">Millimeters (mm)</option>
              <option value="in">Inches (in / sqft)</option>
            </select>
          </div>
        </div>

        {/* Right: Scale Status & Clear */}
        <div className="flex items-center gap-2">
          {isCalibrated ? (
            <button
              type="button"
              onClick={() => setActiveTool('calibrate')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 rounded-full text-[10px] font-black text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
              title="Click to recalibrate scale"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>
                {displayUnit === 'ft'
                  ? `Scale: 1ft = ${(0.3048 / scale).toFixed(1)}px`
                  : displayUnit === 'in'
                  ? `Scale: 1in = ${(0.0254 / scale).toFixed(1)}px`
                  : `Scale: 1m = ${Math.round(1 / scale)}px`}
              </span>
              <span className="text-[9px] uppercase tracking-wider bg-emerald-500/20 px-1.5 py-0.2 rounded font-black">
                Change
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTool('calibrate')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-300 dark:border-amber-800 rounded-full text-[10px] font-black text-amber-700 dark:text-amber-300 animate-pulse cursor-pointer transition-colors"
              title="Click to calibrate scale"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Calibrate Plan First</span>
            </button>
          )}

          {shapes.length > 0 && (
            <button
              type="button"
              onClick={onClearShapes}
              className="p-1.5 text-surface-400 hover:text-red-500 rounded-lg hover:bg-surface-100 transition-colors"
              title="Clear all drawings on this plan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div 
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        className={`relative w-full ${isExpanded ? 'h-[760px]' : 'h-[500px]'} transition-[height] duration-300 bg-[url('/grid-pattern.svg')] bg-[length:24px_24px] dark:bg-[url('/grid-pattern-dark.svg')] overflow-hidden select-none ${
          isMiddleMouseDown ? 'cursor-grabbing' : ''
        }`}
      >
        <TransformWrapper
          ref={transformRef}
          smooth={false}
          limitToBounds={false}
          centerZoomedOut={false}
          disabled={activeTool !== 'select' && !isSpacePressed && !isMiddleMouseDown}
          panning={{ 
            disabled: activeTool !== 'select' && !isSpacePressed && !isMiddleMouseDown,
            velocityDisabled: true
          }}
          wheel={{ 
            step: 0.06, 
            activationKeys: directWheelZoom ? [] : ['Control', 'Meta'] 
          }}
          pinch={{ step: 3 }}
          doubleClick={{ disabled: true }}
          initialScale={1}
          minScale={0.1}
          maxScale={25}
          onInit={(ref) => {
            ref.centerView(1);
          }}
          onTransform={(ref: ReactZoomPanPinchRef) => {
            setCurrentScale(ref.state.scale);
          }}
        >
          {({ zoomIn, zoomOut, resetTransform, centerView }) => (
            <>
              {/* Viewport-Fixed Drawing & Measurement HUD Portal Target (Top-Center) */}
              <div 
                id="takeoff-viewport-hud" 
                className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center justify-center max-w-[94vw]" 
              />

              {/* Comprehensive CAD Zoom & Navigation Controls Overlay (Bottom-Right) */}
              <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 bg-surface-card/95 backdrop-blur-md p-1.5 rounded-xl border border-surface-200 shadow-xl">
                {/* 1. Direct Wheel Zoom Toggle */}
                <button
                  type="button"
                  onClick={() => setDirectWheelZoom(prev => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                    directWheelZoom
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-surface-100 border-surface-200 text-text-secondary hover:text-foreground'
                  }`}
                  title={directWheelZoom ? "Wheel: Direct Zoom Active (Click to require Ctrl)" : "Wheel: Ctrl+Zoom Required"}
                >
                  <Mouse className="w-3 h-3" />
                  <span className="hidden sm:inline">{directWheelZoom ? 'Direct Zoom' : 'Ctrl+Zoom'}</span>
                </button>

                <div className="h-3 w-px bg-surface-200" />

                {/* 2. Minimap Toggle */}
                <button
                  type="button"
                  onClick={() => setShowMiniMap(prev => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                    showMiniMap
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                      : 'bg-surface-100 border-surface-200 text-text-secondary hover:text-foreground'
                  }`}
                  title="Toggle Blueprint Overview Navigator (Minimap)"
                >
                  <MapIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Overview</span>
                </button>

                <div className="h-3 w-px bg-surface-200" />

                {/* 3. Quick Zoom Presets */}
                <div className="flex items-center gap-0.5 bg-surface-100 p-0.5 rounded-lg border border-surface-200">
                  <button
                    type="button"
                    onClick={() => resetTransform()}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-text-secondary hover:text-foreground hover:bg-surface-200 rounded transition-colors"
                    title="Fit to Screen"
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => centerView(0.5)}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-text-secondary hover:text-foreground hover:bg-surface-200 rounded transition-colors"
                    title="Zoom to 50%"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => centerView(1)}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-text-secondary hover:text-foreground hover:bg-surface-200 rounded transition-colors"
                    title="Zoom to 100%"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => centerView(1.5)}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-text-secondary hover:text-foreground hover:bg-surface-200 rounded transition-colors"
                    title="Zoom to 150%"
                  >
                    150%
                  </button>
                  <button
                    type="button"
                    onClick={() => centerView(2)}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-text-secondary hover:text-foreground hover:bg-surface-200 rounded transition-colors"
                    title="Zoom to 200%"
                  >
                    200%
                  </button>
                </div>

                {/* 4. Live Zoom Indicator */}
                <span className="text-[10px] font-mono font-black text-foreground px-1.5 py-0.5 bg-surface-100 rounded-md border border-surface-200 min-w-[42px] text-center">
                  {Math.round(currentScale * 100)}%
                </span>

                <div className="h-3 w-px bg-surface-200" />

                {/* 5. Zoom Buttons */}
                <button
                  type="button"
                  onClick={() => zoomOut(0.15)}
                  className="p-1.5 text-foreground hover:bg-surface-100 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => zoomIn(0.15)}
                  className="p-1.5 text-foreground hover:bg-surface-100 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <div className="h-3 w-px bg-surface-200" />

                {/* 6. Expand / Collapse Canvas Workstation Viewport */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(prev => !prev)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isExpanded 
                      ? 'bg-accent text-background' 
                      : 'text-foreground hover:bg-surface-100'
                  }`}
                  title={isExpanded ? "Collapse Viewport to standard height" : "Expand Viewport to large workstation mode (760px)"}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Central Transform Component (no conflicting flex items-center justify-center) */}
              <TransformComponent
                wrapperClass="!w-full !h-full overflow-hidden"
                contentClass="cursor-default"
              >
                <div
                  className="relative inline-block"
                  style={{ width: naturalSize.w, height: naturalSize.h }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedUrl}
                    alt={planTitle || "Floor Plan"}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                      }
                      setImgError(false);
                    }}
                    onError={() => setImgError(true)}
                    className="max-w-none block pointer-events-none select-none"
                    style={{ width: naturalSize.w, height: naturalSize.h }}
                  />

                  {/* SVG Overlay */}
                  <SimpleSvgLayer
                    width={naturalSize.w}
                    height={naturalSize.h}
                    activeTool={activeTool}
                    scale={scale}
                    zoomScale={currentScale}
                    isCalibrated={isCalibrated}
                    displayUnit={displayUnit}
                    shapes={shapes}
                    orthoEnabled={orthoEnabled}
                    snapEnabled={snapEnabled}
                    isSpacePressed={isSpacePressed || isMiddleMouseDown}
                    onAddShape={onAddShape}
                    onDeleteShape={onDeleteShape}
                    onUpdateShape={onUpdateShape}
                    onCalibrate={onCalibrate}
                    onToolChange={setActiveTool}
                    onActivePointsChange={setActivePointsCount}
                  />
                </div>
              </TransformComponent>

              {/* 7. Collapsible Overview Navigator (Minimap) */}
              {showMiniMap && (
                <div className="absolute bottom-14 left-3 z-30 p-2 bg-surface-card/95 backdrop-blur-md rounded-2xl border border-surface-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-200 text-[10px] font-black text-text-secondary">
                    <span className="flex items-center gap-1 text-foreground">
                      <MapIcon className="w-3 h-3 text-accent" />
                      Plan Navigator
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowMiniMap(false)} 
                      className="text-surface-400 hover:text-foreground p-0.5 rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-surface-200 bg-surface-200/50">
                    <MiniMap 
                      width={140} 
                      height={95} 
                      borderColor="#3b82f6" 
                      panning 
                      previewStyle={{ border: '2px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolvedUrl}
                        alt="Overview"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    </MiniMap>
                  </div>
                  <p className="text-[9px] text-text-secondary mt-1 text-center font-medium">
                    Drag box to navigate
                  </p>
                </div>
              )}
            </>
          )}
        </TransformWrapper>

        {/* Helpful Keyboard Shortcuts Hint Bar (Bottom Left) */}
        {!showMiniMap && (
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-surface-card/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-surface-200/80 shadow-md text-[10px] text-text-secondary pointer-events-none select-none">
            <span className="font-bold text-foreground">Nav:</span>
            <span>Wheel: Zoom</span>
            <span>•</span>
            <span><kbd className="px-1 py-0.5 bg-surface-200 rounded font-mono font-bold text-foreground">Space</kbd> / Middle-Click: Pan</span>
            <span>•</span>
            <span><kbd className="px-1 py-0.5 bg-surface-200 rounded font-mono font-bold text-foreground">Shift</kbd>: Ortho</span>
          </div>
        )}

        {/* Calibration Instruction Banner */}
        {activeTool === 'calibrate' && (
          <div className="absolute top-3 left-3 z-20 bg-amber-500 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 pointer-events-none animate-in fade-in duration-150">
            <Ruler className="w-4 h-4 shrink-0" />
            <span>Click 2 points across a known dimension (e.g. 0.9m door or 3.0m wall)</span>
          </div>
        )}

        {/* Rectangle Instruction Banner */}
        {activeTool === 'rectangle' && activePointsCount === 0 && (
          <div className="absolute top-3 left-3 z-20 bg-cyan-600 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 pointer-events-none animate-in fade-in duration-150">
            <Box className="w-4 h-4 shrink-0" />
            <span>Click Corner 1 of the room, then click opposite Corner 2</span>
          </div>
        )}
      </div>
    </div>
  );
};
