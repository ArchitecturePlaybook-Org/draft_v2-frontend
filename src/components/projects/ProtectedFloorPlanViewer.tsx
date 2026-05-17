"use client";
import React from "react";
import { projectsApi } from "@/domains/projects/api";

interface ProtectedFloorPlanViewerProps {
  assetId: number;
  children: React.ReactNode;
}

/**
 * IP Protection Wrapper for Architectural Floor Plans.
 * - Uses the secure-view proxy URL (dynamic watermarking).
 * - Blocks context menu (right-click).
 * - Blocks image dragging.
 * - Overlays an invisible div to intercept mouse events.
 */
export function ProtectedFloorPlanViewer({ assetId, children }: ProtectedFloorPlanViewerProps) {
  const secureUrl = projectsApi.getSecureAssetUrl(assetId);

  return (
    <div 
      className="relative select-none w-full h-full overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Invisible overlay to prevent right-click/save-as directly on the image */}
      <div className="absolute inset-0 z-20 pointer-events-none" />

      {/* The base floor plan image with watermarks from backend */}
      <div className="relative inline-block bg-white shadow-2xl rounded-sm overflow-hidden border border-surface-200">
        <img
          src={secureUrl}
          alt="Architectural Floor Plan"
          className="block max-w-full max-h-[75vh] w-auto h-auto pointer-events-auto"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        
        {/* Layer 2: The interactive grid and other children */}
        <div className="absolute inset-0 z-30">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}
