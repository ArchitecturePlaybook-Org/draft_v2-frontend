import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { SvgDrawingLayer } from './SvgDrawingLayer';
import { useEstimationStore } from '@/store/estimation-store';
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2 } from 'lucide-react';

interface TakeoffCanvasProps {
  imageUrl: string;
}

export const TakeoffCanvas: React.FC<TakeoffCanvasProps> = ({ imageUrl }) => {
  const { activeTool, undo, redo, past, future } = useEstimationStore();
  const panningEnabled = activeTool === 'select';
  const [naturalSize, setNaturalSize] = useState({ w: 1000, h: 1000 });

  return (
    <div className="flex-1 relative overflow-hidden bg-surface-card text-foreground flex items-center justify-center rounded-2xl shadow-inner border border-surface-200 w-full h-full min-h-[500px]">
      <TransformWrapper
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
                  <img 
                    src={imageUrl} 
                    alt="Floor plan" 
                    className="w-full h-full object-contain pointer-events-none drop-shadow-md rounded-lg"
                    style={{ userSelect: 'none' }}
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                  />
                  <SvgDrawingLayer width={naturalSize.w} height={naturalSize.h} />
                </div>
              </div>
            </TransformComponent>
          </React.Fragment>
        )}
      </TransformWrapper>
    </div>
  );
};
