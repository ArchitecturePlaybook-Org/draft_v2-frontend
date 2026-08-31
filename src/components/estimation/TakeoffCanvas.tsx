import React, { useState, useMemo, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { SvgDrawingLayer } from './SvgDrawingLayer';
import { Toolbar } from './Toolbar';
import { useEstimationStore } from '@/store/estimation-store';
import { 
  CalibrationUnit, 
  formatScaleValue, 
  getSecondaryScaleEquivalents 
} from '@/lib/estimation/units';
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, AlertTriangle, RefreshCw, Ruler } from 'lucide-react';

/**
 * Resolve an asset URL so it can be reliably loaded by a browser <img> tag.
 */
function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // 1. Amazon S3 URLs -> path-based proxy
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

  // 2. Full backend URLs (http://127.0.0.1:8000/media/... or http://localhost:8000/media/...)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 3. Relative /media/ or media/ path -> attach backend origin
  if (url.startsWith('/media/')) {
    return `${cleanBase}${url}`;
  }
  if (url.startsWith('media/')) {
    return `${cleanBase}/${url}`;
  }

  // 4. Other root-relative paths
  if (url.startsWith('/')) {
    return `${cleanBase}${url}`;
  }

  return url;
}

interface TakeoffCanvasProps {
  imageUrl: string;
  allowedTools?: Array<'select' | 'calibrate' | 'line' | 'polygon' | 'point'>;
  hideMaterials?: boolean;
  hideThickness?: boolean;
}

export const TakeoffCanvas: React.FC<TakeoffCanvasProps> = ({ 
  imageUrl,
  allowedTools,
  hideMaterials,
  hideThickness
}) => {
  const { 
    activeTool, 
    undo, 
    redo, 
    past, 
    future, 
    pixelToMeterScale, 
    displayScaleUnit, 
    setDisplayScaleUnit, 
    setActiveTool 
  } = useEstimationStore();
  const panningEnabled = activeTool === 'select';
  const [naturalSize, setNaturalSize] = useState({ w: 1000, h: 1000 });
  const [imgError, setImgError] = useState(false);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  const primaryUrl = useMemo(() => resolveImageUrl(imageUrl), [imageUrl]);
  const [currentSrc, setCurrentSrc] = useState(() => resolveImageUrl(imageUrl));

  useEffect(() => {
    const resolved = resolveImageUrl(imageUrl);
    setCurrentSrc(resolved);
    setImgError(false);
    setFallbackAttempted(false);
  }, [imageUrl]);

  const handleImageError = () => {
    // If primary failed (e.g. http://127.0.0.1:8000/media/...), attempt relative /media/... or vice versa
    if (!fallbackAttempted) {
      setFallbackAttempted(true);
      if (currentSrc.includes('/media/')) {
        const idx = currentSrc.indexOf('/media/');
        const alternative = currentSrc.startsWith('http')
          ? currentSrc.slice(idx) // try local Next.js rewrite /media/...
          : `http://127.0.0.1:8000${currentSrc.slice(idx)}`; // try direct Django backend
        if (alternative !== currentSrc) {
          setCurrentSrc(alternative);
          return;
        }
      }
    }
    setImgError(true);
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-surface-card text-foreground flex items-center justify-center rounded-2xl shadow-inner border border-surface-200 w-full h-full min-h-[400px]">
      {/* 🛠️ Floating Top-Center Drawing Toolbar (Overlaying Floor Plan Canvas) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-[94%] pointer-events-none">
        <Toolbar 
          allowedTools={allowedTools} 
          hideMaterials={hideMaterials} 
          hideThickness={hideThickness} 
        />
      </div>

      {imgError ? (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">Failed to load floor plan image</h3>
          <p className="text-xs text-surface-400 mb-3 break-all">{currentSrc || imageUrl || 'No URL provided'}</p>
          <button
            onClick={() => {
              setImgError(false);
              setFallbackAttempted(false);
              setCurrentSrc(primaryUrl);
            }}
            className="px-3 py-1.5 bg-accent text-background font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw size={12} /> Retry Load
          </button>
        </div>
      ) : !currentSrc ? (
        <div className="flex items-center justify-center p-8 text-surface-400 text-xs">
          Loading floor plan image...
        </div>
      ) : (
        <TransformWrapper
          key={currentSrc}
          initialScale={1}
          minScale={0.1}
          maxScale={10}
          disabled={!panningEnabled}
          panning={{ disabled: !panningEnabled }}
          doubleClick={{ disabled: true }}
          centerOnInit={true}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <React.Fragment>
              {/* ↩️ Solid Opaque Floating Undo & Redo Controls (Bottom-Left) */}
              <div className="absolute bottom-4 left-4 z-50 flex items-center gap-1.5 p-1 bg-surface-card dark:bg-surface-100 border-2 border-surface-300 dark:border-surface-200 rounded-xl shadow-2xl text-foreground">
                <button 
                  className="h-8.5 px-3 rounded-lg bg-surface-100 dark:bg-surface-200 hover:bg-accent hover:text-background border border-surface-200/80 text-foreground font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface-100 disabled:hover:text-foreground" 
                  onClick={() => undo()}
                  disabled={past.length === 0}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={15} />
                  <span className="text-xs font-black">Undo</span>
                </button>
                <button 
                  className="h-8.5 px-3 rounded-lg bg-surface-100 dark:bg-surface-200 hover:bg-accent hover:text-background border border-surface-200/80 text-foreground font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface-100 disabled:hover:text-foreground" 
                  onClick={() => redo()}
                  disabled={future.length === 0}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 size={15} />
                  <span className="text-xs font-black">Redo</span>
                </button>
              </div>

              {/* 📏 Solid Opaque Floating Scale & Unit Badge (Bottom-Center) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 h-8.5 bg-surface-card dark:bg-surface-100 border-2 border-surface-300 dark:border-surface-200 rounded-xl shadow-2xl text-foreground text-xs font-bold pointer-events-auto">
                <Ruler size={14} className="text-accent shrink-0" />
                {pixelToMeterScale === 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTool('calibrate')}
                    className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Click to calibrate drawing scale"
                  >
                    <span>Uncalibrated</span>
                    <span className="text-[9px] uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md font-black">
                      Calibrate
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-foreground">
                      1 px = {formatScaleValue(pixelToMeterScale, displayScaleUnit)} {displayScaleUnit}
                    </span>
                    <select
                      value={displayScaleUnit}
                      onChange={(e) => setDisplayScaleUnit(e.target.value as CalibrationUnit)}
                      className="bg-surface-100 dark:bg-surface-200/80 border border-surface-200/80 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase text-accent outline-none cursor-pointer hover:border-accent transition-all"
                      title="Switch display unit"
                    >
                      {(['m', 'mm', 'cm', 'ft', 'in', 'yd'] as const).map(u => (
                        <option key={u} value={u} className="bg-surface-card text-foreground">
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 🔍 Solid Opaque Floating Zoom Controls (Bottom-Right) */}
              <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1.5 p-1 bg-surface-card dark:bg-surface-100 border-2 border-surface-300 dark:border-surface-200 rounded-xl shadow-2xl text-foreground">
                <button 
                  className="w-8.5 h-8.5 rounded-lg bg-surface-100 dark:bg-surface-200 hover:bg-accent hover:text-background border border-surface-200/80 font-black text-foreground flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95" 
                  onClick={() => zoomIn()}
                  title="Zoom In (+)"
                >
                  <ZoomIn size={16} />
                </button>
                <button 
                  className="w-8.5 h-8.5 rounded-lg bg-surface-100 dark:bg-surface-200 hover:bg-accent hover:text-background border border-surface-200/80 text-foreground font-black flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95" 
                  onClick={() => zoomOut()}
                  title="Zoom Out (-)"
                >
                  <ZoomOut size={16} />
                </button>
                <button 
                  className="px-3.5 h-8.5 rounded-lg bg-surface-100 dark:bg-surface-200 hover:bg-accent hover:text-background border border-surface-200/80 text-foreground font-black text-[11px] uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95" 
                  onClick={() => resetTransform()}
                  title="Fit to Screen / Reset View"
                >
                  <Maximize2 size={13} className="mr-1.5" /> Reset
                </button>
              </div>
              
              <TransformComponent 
                wrapperStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <div className="relative w-full h-full flex items-center justify-center p-1 overflow-hidden">
                  <div 
                    className="relative flex items-center justify-center max-w-full max-h-full"
                    style={{
                      width: naturalSize.w >= naturalSize.h ? '100%' : 'auto',
                      height: naturalSize.h > naturalSize.w ? '100%' : 'auto',
                      maxHeight: '100%',
                      maxWidth: '100%',
                      aspectRatio: `${naturalSize.w} / ${naturalSize.h}`
                    }}
                  >
                    {currentSrc ? (
                      <img 
                        src={currentSrc} 
                        alt="Floor plan" 
                        className="w-full h-full object-contain pointer-events-none drop-shadow-md rounded-lg"
                        style={{ userSelect: 'none' }}
                        draggable={false}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          setNaturalSize({ w: img.naturalWidth || 1000, h: img.naturalHeight || 1000 });
                        }}
                        onError={handleImageError}
                      />
                    ) : null}
                    <SvgDrawingLayer width={naturalSize.w} height={naturalSize.h} />
                  </div>
                </div>
              </TransformComponent>
            </React.Fragment>
          )}
        </TransformWrapper>
      )}
    </div>
  );
};
