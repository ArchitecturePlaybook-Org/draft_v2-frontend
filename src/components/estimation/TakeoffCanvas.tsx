import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { SvgDrawingLayer } from './SvgDrawingLayer';
import { useEstimationStore } from '@/store/estimation-store';

interface TakeoffCanvasProps {
  imageUrl: string;
}

export const TakeoffCanvas: React.FC<TakeoffCanvasProps> = ({ imageUrl }) => {
  const { activeTool } = useEstimationStore();
  const panningEnabled = activeTool === 'select';
  const [naturalSize, setNaturalSize] = useState({ w: 1000, h: 1000 });

  return (
    <div className="flex-1 relative overflow-hidden bg-surface-100 flex items-center justify-center rounded-2xl shadow-inner border-2 border-surface-200">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={10}
        disabled={!panningEnabled}
        panning={{ disabled: !panningEnabled }}
        doubleClick={{ disabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <React.Fragment>
            <div className="absolute bottom-4 right-4 z-50 flex gap-2">
              <button className="w-8 h-8 bg-white dark:bg-surface-200 rounded-lg shadow flex items-center justify-center font-bold" onClick={() => zoomIn()}>+</button>
              <button className="w-8 h-8 bg-white dark:bg-surface-200 rounded-lg shadow flex items-center justify-center font-bold" onClick={() => zoomOut()}>-</button>
              <button className="px-3 h-8 bg-white dark:bg-surface-200 rounded-lg shadow flex items-center justify-center font-bold text-xs" onClick={() => resetTransform()}>Reset</button>
            </div>
            
            <TransformComponent wrapperClass="w-full h-full flex items-center justify-center" contentClass="w-full h-full flex items-center justify-center relative">
              <div className="relative flex items-center justify-center" style={{ maxWidth: '90%', maxHeight: '90%', aspectRatio: `${naturalSize.w} / ${naturalSize.h}` }}>
                <img 
                  src={imageUrl} 
                  alt="Floor plan" 
                  className="w-full h-full object-contain pointer-events-none"
                  style={{ userSelect: 'none' }}
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                />
                <SvgDrawingLayer width={naturalSize.w} height={naturalSize.h} />
              </div>
            </TransformComponent>
          </React.Fragment>
        )}
      </TransformWrapper>
    </div>
  );
};
