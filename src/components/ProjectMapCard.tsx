"use client";

import React, { useState } from "react";
import { ProjectDetail } from "@/types/projects";
import { fetchFromBff } from "@/shared/api/fetchFromBff";

interface ProjectMapCardProps {
  project: ProjectDetail;
  onLocationUpdate?: () => void;
}

export const ProjectMapCard: React.FC<ProjectMapCardProps> = ({ project, onLocationUpdate }) => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCoords = project.latitude !== null && project.latitude !== undefined && project.longitude !== null && project.longitude !== undefined;

  let tileX = 0;
  let tileY = 0;
  let pinLeft = 50;
  let pinTop = 50;

  if (hasCoords) {
    const zoom = 14;
    const lat = Number(project.latitude);
    const lng = Number(project.longitude);
    
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    
    const xRaw = ((lng + 180.0) / 360.0) * n;
    const yRaw = ((1.0 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2.0) * n;
    
    tileX = Math.floor(xRaw);
    tileY = Math.floor(yRaw);
    
    pinLeft = (xRaw - tileX) * 100;
    pinTop = (yRaw - tileY) * 100;
  }

  const handleGeocode = async () => {
    if (!project.location) {
      setError("Please add an address to the project settings first.");
      return;
    }
    
    setIsGeocoding(true);
    setError(null);
    
    try {
      // Fetch lat/lng from backend GeocodingView
      const res = await fetch("/api/v1/core/geocode/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: project.location })
      });
      
      if (!res.ok) throw new Error("Geocoding failed. Try a more specific address.");
      
      const data = await res.json();
      
      // Update project with new coords
      const patchRes = await fetch(`/api/v1/projects/projects/${project.uid}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: data.lat,
          longitude: data.lng
        })
      });
      
      if (!patchRes.ok) throw new Error("Failed to save coordinates.");
      
      if (onLocationUpdate) onLocationUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="bg-surface-100 p-6 rounded-2xl border border-surface-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-extrabold text-primary tracking-tight">Project Location</h3>
          <p className="text-[10px] font-medium text-surface-500 mt-0.5 truncate max-w-[200px]">
            {project.location || "No address provided"}
          </p>
        </div>
        {hasCoords && (
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${project.latitude},${project.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-surface-50 hover:bg-surface-200 border border-surface-200 flex items-center justify-center text-primary transition-colors"
            title="Open in Google Maps"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      <div className="relative flex-1 bg-surface-100 rounded-xl overflow-hidden min-h-[160px] border border-surface-200 flex items-center justify-center">
        {hasCoords ? (
          <>
            <img 
              src={`/api/v1/core/tiles/14/${tileX}/${tileY}.png`}
              alt="Map Tile"
              className="absolute inset-0 w-full h-full object-cover filter contrast-125 saturate-50"
            />
            {/* The Pin */}
            <div 
              className="absolute z-10 flex flex-col items-center"
              style={{ left: `${pinLeft}%`, top: `${pinTop}%`, transform: 'translate(-50%, -100%)' }}
            >
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full blur-[2px] mt-1 opacity-50"></div>
            </div>
            
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded border border-surface-200 text-[8px] font-bold text-surface-500 tracking-widest uppercase shadow-sm">
              Static Proxy Mode
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            <span className="text-3xl opacity-30 mb-2 block">🌍</span>
            <p className="text-xs font-bold text-surface-500 mb-4">Coordinates not set.</p>
            <button
              onClick={handleGeocode}
              disabled={isGeocoding}
              className="px-4 py-2 bg-accent text-background text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-accent transition-all disabled:opacity-50 shadow-sm"
            >
              {isGeocoding ? "Geocoding..." : "Set Location"}
            </button>
            {error && <p className="text-[9px] text-red-500 mt-2 font-bold">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
