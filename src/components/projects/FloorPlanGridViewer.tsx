"use client";
import React, { useState } from "react";
import { ProjectAsset } from "@/types/projects";
import { ProtectedFloorPlanViewer } from "./ProtectedFloorPlanViewer";
import { CellPhotoDrawer } from "./CellPhotoDrawer";

interface FloorPlanGridViewerProps {
  asset: ProjectAsset;
  onClose: () => void;
  onRefresh: () => void;
}

export function FloorPlanGridViewer({ asset, onClose, onRefresh }: FloorPlanGridViewerProps) {
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const rows = 8;
  const cols = 8;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 1), 5));
    if (zoom + delta <= 1) setOffset({ x: 0, y: 0 });
  };

  const getCellPhotos = (c: number, r: number) => {
    return asset.site_photos?.filter(p => p.grid_col === c && p.grid_row === r) || [];
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-900 flex flex-col no-print">
      {/* Header */}
      <div className="h-16 px-6 bg-white border-b border-surface-200 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-surface-50 rounded-xl transition-colors text-lg">←</button>
          <div>
            <h2 className="font-black text-primary text-sm uppercase tracking-tighter">{asset.title}</h2>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Site Survey Grid (8×8)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-100 p-1 rounded-xl">
            <button onClick={() => handleZoom(-0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all font-bold text-lg">－</button>
            <div className="px-3 flex items-center text-[10px] font-black text-primary uppercase">{(zoom * 100).toFixed(0)}%</div>
            <button onClick={() => handleZoom(0.5)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all font-bold text-lg">＋</button>
          </div>
          <button onClick={onClose} className="px-4 h-10 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-lg shadow-primary/20">Done Viewing</button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 relative overflow-hidden bg-surface-50">
        <div 
          className="w-full h-full flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            className="relative"
          >
            <ProtectedFloorPlanViewer assetId={asset.id}>
              {/* The Grid Overlay */}
              <div 
                className="absolute inset-0 grid grid-cols-8 grid-rows-8"
                style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}
              >
                {Array.from({ length: rows * cols }).map((_, i) => {
                  const r = Math.floor(i / cols);
                  const c = i % cols;
                  const cellPhotos = getCellPhotos(c, r);
                  const colLetter = String.fromCharCode(65 + c);
                  
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedCell({ col: c, row: r })}
                      className={`
                        relative border border-white/30 group cursor-pointer transition-all
                        hover:bg-accent/10 hover:border-accent/40
                        ${cellPhotos.length > 0 ? 'bg-accent/5' : ''}
                      `}
                    >
                      {/* Cell Label */}
                      <span className="absolute top-1 left-1 text-[8px] font-black text-white/40 group-hover:text-accent/60 uppercase tracking-tighter">
                        {colLetter}{r + 1}
                      </span>

                      {/* Content Indicator */}
                      {cellPhotos.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-accent/90 text-white p-1 rounded-lg shadow-lg flex flex-col items-center scale-75 group-hover:scale-100 transition-transform">
                            <span className="text-[10px]">📷</span>
                            <span className="text-[8px] font-black">{cellPhotos.length}</span>
                          </div>
                        </div>
                      )}

                      {/* Add Hint */}
                      {cellPhotos.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-accent text-lg font-light">+</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ProtectedFloorPlanViewer>
          </div>
        </div>

        {/* Legend / Tooltip */}
        <div className="absolute bottom-6 left-6 p-4 bg-white/80 backdrop-blur-md border border-white rounded-2xl shadow-xl z-40 max-w-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Instructions</p>
          <ul className="space-y-2 text-[10px] font-bold text-surface-500">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-accent rounded-full" /> Click any zone (A1–H8) to add site photos</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-accent rounded-full" /> Use ± or scroll to zoom for precision</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-accent rounded-full" /> Drag to pan when zoomed in</li>
          </ul>
        </div>
      </div>

      {/* Cell Detail Drawer */}
      {selectedCell && (
        <CellPhotoDrawer
          asset={asset}
          col={selectedCell.col}
          row={selectedCell.row}
          onClose={() => setSelectedCell(null)}
          onPhotoUploaded={() => {
            onRefresh();
            // We don't close the drawer so they can see the gallery update
          }}
        />
      )}
    </div>
  );
}
