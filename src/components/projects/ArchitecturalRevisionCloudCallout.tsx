"use client";

import React, { useState } from "react";
import { DrawingMarkup } from "@/types/projects";

interface ArchitecturalRevisionCloudCalloutProps {
  markup: DrawingMarkup;
  index: number;
  isSelected?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function ArchitecturalRevisionCloudCallout({
  markup,
  index,
  isSelected,
  onClick,
}: ArchitecturalRevisionCloudCalloutProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isResolved = markup.status === "RESOLVED";

  // Use transparent background so blueprint underneath is 100% visible
  // Only the border is colored
  const borderColor = isResolved ? "border-emerald-500" : "border-red-500";
  const badgeBg = isResolved ? "bg-emerald-500" : "bg-red-500";
  const highlightRing = isSelected ? "ring-4 ring-accent scale-[1.04] z-40" : "hover:scale-[1.02] z-30";

  return (
    <div
      style={{
        left: `${markup.x_percent}%`,
        top: `${markup.y_percent}%`,
        width: `${markup.width_percent || 16}%`,
        height: `${markup.height_percent || 12}%`,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute border-[3px] border-dashed bg-transparent rounded-2xl cursor-pointer transition-all flex flex-col justify-between ${borderColor} ${highlightRing}`}
    >
      {/* Corner Pin Badge - Solid so it's readable, but small so it doesn't block the drawing */}
      <div className="absolute -top-3 -left-3 flex items-center gap-1">
        <div className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl text-white ${badgeBg}`}>
          <span className="text-xs">☁️</span>
          <span>Cloud #{index + 1}</span>
        </div>
      </div>

      {/* Hover Tooltip - Appears at the bottom of the bounding box when hovered */}
      {isHovered && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-surface-50 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border border-surface-100 shadow-2xl z-50">
          {markup.title}
        </div>
      )}
    </div>
  );
}
