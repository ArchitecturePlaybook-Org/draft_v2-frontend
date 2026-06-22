"use client";

import React, { useEffect, useRef, useState } from "react";
// In a real implementation: import { Viewer, DefaultViewerParams, ObjectExtension } from '@speckle/viewer';

interface SpeckleViewerProps {
  streamId: string;
  objectId?: string;
  selectedTaskElementIds?: string[];
  onElementSelect?: (elementIds: string[]) => void;
  dimOverlays?: any[]; // For rendering DIM pipeline results
}

export function SpeckleViewer({
  streamId,
  objectId,
  selectedTaskElementIds = [],
  onElementSelect,
  dimOverlays = []
}: SpeckleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Mock initialization for 10X plan
    let mockViewer = {
      loadObject: async (url: string) => {
        return new Promise((resolve) => setTimeout(resolve, 1000));
      },
      selectObjects: (ids: string[]) => {
        console.log("Speckle isolating/highlighting objects:", ids);
      },
      addDimOverlay: (overlays: any[]) => {
        console.log("Speckle rendering DIM overlays:", overlays);
      },
      on: (event: string, callback: any) => {
        // mock event listener
      }
    };

    setViewer(mockViewer);
    
    mockViewer.loadObject(`https://speckle.xyz/streams/${streamId}/objects/${objectId}`)
      .then(() => {
        setIsLoading(false);
      });

  }, [streamId, objectId]);

  // Bi-directional highlighting
  useEffect(() => {
    if (viewer && selectedTaskElementIds.length > 0) {
      viewer.selectObjects(selectedTaskElementIds);
    }
  }, [viewer, selectedTaskElementIds]);

  // Render DIM Overlays
  useEffect(() => {
    if (viewer && dimOverlays.length > 0) {
      viewer.addDimOverlay(dimOverlays);
    }
  }, [viewer, dimOverlays]);

  return (
    <div className="relative w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 text-white">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-semibold text-slate-300">Loading Immersive 3D BIM (Speckle)...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      
      {!isLoading && (
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span>Speckle Viewer Active</span>
        </div>
      )}
    </div>
  );
}
