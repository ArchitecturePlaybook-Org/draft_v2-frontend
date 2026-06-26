"use client";
import React, { useState, useEffect, useRef } from "react";
import { SitePhoto, ProjectAsset } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import exifr from "exifr";

interface CellPhotoDrawerProps {
  asset: ProjectAsset;
  col: number;
  row: number;
  onClose: () => void;
  onPhotoUploaded: () => void;
}

export function CellPhotoDrawer({ asset, col, row, onClose, onPhotoUploaded }: CellPhotoDrawerProps) {
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colLetter = String.fromCharCode(65 + col);
  const rowNum = row + 1;

  const fetchPhotos = async () => {
    try {
      const allPhotos = await projectsApi.getSitePhotos(asset.id);
      const cellPhotos = allPhotos.filter(p => p.grid_col === col && p.grid_row === row);
      setPhotos(cellPhotos);
    } catch (err) {
      console.error("Failed to fetch cell photos:", err);
    }
  };

  useEffect(() => {
    // Initial populate from asset props (for instant display)
    const cellPhotos = asset.site_photos?.filter(p => p.grid_col === col && p.grid_row === row) || [];
    setPhotos(cellPhotos);
    
    // Then fetch fresh data from backend
    fetchPhotos();
    captureGps();
  }, [asset.id, col, row]);

  const captureGps = (highAccuracy = true) => {
    if (!navigator.geolocation) return;
    setIsCapturingGps(true);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsData({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy
        });
        setIsCapturingGps(false);
      },
      (err) => {
        console.warn(`GPS capture failed (accuracy=${highAccuracy}):`, err.message);
        
        // If high accuracy failed and it's not a permission issue, try standard accuracy
        if (highAccuracy && err.code !== 1) {
          console.log("Retrying with standard accuracy...");
          captureGps(false);
        } else {
          setIsCapturingGps(false);
        }
      },
      { 
        enableHighAccuracy: highAccuracy, 
        timeout: highAccuracy ? 8000 : 15000,
        maximumAge: 30000 
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let lat = gpsData?.lat;
      let lng = gpsData?.lng;
      let source = gpsData ? "browser" : "none";
      let accuracy = gpsData?.acc;

      // If browser GPS failed, try EXIF safely
      if (!lat) {
        try {
          const exifGps = await exifr.gps(file);
          if (exifGps) {
            lat = exifGps.latitude;
            lng = exifGps.longitude;
            source = "exif";
          }
        } catch (exifErr) {
          console.warn("Could not read EXIF GPS data:", exifErr);
        }
      }

      await projectsApi.uploadSitePhoto({
        floor_plan: asset.id,
        image: file,
        grid_col: col,
        grid_row: row,
        latitude: lat,
        longitude: lng,
        gps_accuracy_m: accuracy,
        gps_source: source,
        caption: caption
      });

      setCaption("");
      await fetchPhotos();
      onPhotoUploaded();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (id: number) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      await projectsApi.deleteSitePhoto(id);
      onPhotoUploaded();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      
      <div 
        className="relative w-full max-w-md bg-surface-100 border-surface-200 h-full shadow-2xl flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideRight 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-black text-primary tracking-tight">Zone {colLetter}{rowNum}</h3>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mt-1">Site Survey Grid</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-50 rounded-lg text-surface-400 transition-colors">✕</button>
          </div>

          {/* GPS Status */}
          <div className={`p-4 rounded-xl border transition-all ${gpsData ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100' : 'bg-surface-50 border-surface-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isCapturingGps ? 'bg-amber-400 animate-pulse' : gpsData ? 'bg-emerald-500' : 'bg-surface-300'}`} />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-surface-500 text-surface-400 mb-1">GPS Attestation</p>
                {isCapturingGps ? (
                  <p className="text-sm font-bold text-primary">Capturing live coordinates...</p>
                ) : gpsData ? (
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-emerald-700">
                      {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-600">±{gpsData.acc.toFixed(0)}m accuracy</span>
                  </div>
                ) : (
                  <button onClick={() => captureGps()} className="text-sm font-bold text-accent hover:underline">GPS Unavailable - Try Again</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="p-6 bg-surface-50 border-b border-surface-100">
          <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 block mb-2">Add New Site Photo</label>
          <div className="space-y-3">
            <input 
              type="text"
              placeholder="Add a caption... (e.g. Pillar crack observed)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full h-11 px-4 bg-surface-100 border-surface-200 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm font-medium transition-all"
            />
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-12 bg-accent text-background font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isUploading ? "Uploading to Cloud..." : "📷 Take or Pick Photo"}
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-400">Previous Photos ({photos.length})</h4>
          
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-3 opacity-20">📂</span>
              <p className="text-sm font-bold text-surface-400">No photos in this zone yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {photos.map(photo => (
                <div key={photo.id} className="group relative bg-surface-100 border-surface-200 border border-surface-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all">
                  <div className="aspect-[4/3] bg-surface-100 relative">
                    <img src={photo.image} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="p-4">
                    {photo.caption && <p className="text-sm font-bold text-primary mb-2">"{photo.caption}"</p>}
                    <div className="flex justify-between items-center text-[10px] font-bold text-surface-400">
                      <span>{new Date(photo.created_at).toLocaleDateString()} at {new Date(photo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {photo.latitude && (
                      <div className="mt-2 pt-2 border-t border-surface-100 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        <span>📍</span> {Number(photo.latitude).toFixed(4)}, {Number(photo.longitude).toFixed(4)}
                        <span className="ml-auto text-surface-300">via {photo.gps_source}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
