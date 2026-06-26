import React, { useState } from "react";
import { Project } from "@/types/projects";
import { MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { projectsApi } from "@/domains/projects/api";

interface ProjectMapCardProps {
  project: Project;
  onLocationUpdated?: (project: Project) => void;
}

export default function ProjectMapCard({ project, onLocationUpdated }: ProjectMapCardProps) {
  const [loading, setLoading] = useState(false);

  // Web Mercator tile math (zoom level 14)
  const zoom = 14;
  let tileX = 0, tileY = 0, offsetX = 0, offsetY = 0;
  
  if (project.latitude && project.longitude) {
    const lat = Number(project.latitude);
    const lng = Number(project.longitude);
    
    // Calculate global X and Y (fractional tiles)
    const n = Math.pow(2, zoom);
    const globalX = ((lng + 180) / 360) * n;
    const globalY = (1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * n;
    
    // Integer tile coordinates
    tileX = Math.floor(globalX);
    tileY = Math.floor(globalY);
    
    // Fractional offsets within the 256x256 tile
    offsetX = (globalX - tileX) * 256;
    offsetY = (globalY - tileY) * 256;
  }

  const handleSetLocation = async () => {
    if (!project.location) {
      return toast.error("Please set a project address/location text first.");
    }
    
    setLoading(true);
    try {
      // 1. Geocode the address
      const geoRes = await fetchFromBff<{lat: number, lng: number}>("/api/v1/core/geocode/", {
        method: "POST",
        body: JSON.stringify({ address: project.location })
      });
      
      if (!geoRes.lat || !geoRes.lng) {
        throw new Error("Could not resolve coordinates");
      }
      
      // 2. Update the project with the coordinates
      const updatedProject = await projectsApi.updateProject(project.uid, {
        latitude: geoRes.lat,
        longitude: geoRes.lng
      });
      
      toast.success("Location coordinates updated successfully!");
      if (onLocationUpdated) {
        onLocationUpdated(updatedProject);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to geocode location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-100 border-surface-200 rounded-3xl border border-surface-200 shadow-sm overflow-hidden flex flex-col h-[280px]">
      <div className="p-4 border-b border-surface-100 flex justify-between items-center bg-surface-50">
        <div className="flex items-center gap-2 text-surface-600 text-surface-300">
          <MapPin size={16} />
          <h3 className="font-bold text-sm">Project Location</h3>
        </div>
        {!project.latitude && project.location && (
          <button 
            onClick={handleSetLocation} 
            disabled={loading}
            className="text-[10px] uppercase tracking-widest font-bold bg-accent text-background px-3 py-1 rounded-lg flex items-center gap-1 hover:opacity-90/90 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : "Set Coordinates"}
          </button>
        )}
      </div>
      
      <div className="flex-1 relative bg-surface-100 flex items-center justify-center">
        {project.latitude && project.longitude ? (
          <div className="relative w-full h-full overflow-hidden bg-[#E3E1E0]">
            {/* The Tile Image via Proxy */}
            <img 
              src={`/api/v1/core/tiles/${zoom}/${tileX}/${tileY}.png`} 
              alt="Map Tile"
              className="absolute w-[256px] h-[256px] object-cover pointer-events-none"
              style={{
                left: `calc(50% - ${offsetX}px)`,
                top: `calc(50% - ${offsetY}px)`,
              }}
              onError={(e) => {
                // If tile fails to load, just show gray background
                (e.target as HTMLImageElement).style.opacity = '0';
              }}
            />
            {/* Pin Marker */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[100%] text-accent drop-shadow-md">
              <MapPin size={32} strokeWidth={2.5} fill="white" />
            </div>
            
            {/* Attribution overlay */}
            <div className="absolute bottom-1 right-2 text-[8px] text-surface-500 text-surface-400 bg-surface-100 border-surface-200/70 px-1 rounded backdrop-blur-sm">
              © OpenStreetMap contributors, CartoDB
            </div>
          </div>
        ) : (
          <div className="text-center p-6 text-surface-400">
            <MapPin size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">
              {project.location ? "Coordinates not set yet." : "No location specified."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
