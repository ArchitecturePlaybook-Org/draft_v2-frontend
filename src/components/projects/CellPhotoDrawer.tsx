"use client";

import React, { useState, useEffect } from "react";
import { ProjectAsset, SitePhoto } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface CellPhotoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: ProjectAsset;
  gridCol: number;
  gridRow: number;
  onPhotoAdded?: () => void;
  onPhotoDeleted?: () => void;
}

export function CellPhotoDrawer({ isOpen, onClose, asset, gridCol, gridRow, onPhotoAdded, onPhotoDeleted }: CellPhotoDrawerProps) {
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const colLetter = String.fromCharCode(65 + gridCol);
  const rowNum = gridRow + 1;
  const cellLabel = `${colLetter}${rowNum}`;

  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen, asset.id, gridCol, gridRow]);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      // For a real implementation, we could fetch all site_photos for the asset,
      // or filter directly from asset.site_photos if it's populated.
      const res = await projectsApi.getSitePhotos(asset.id);
      const filtered = res.filter(p => p.grid_col === gridCol && p.grid_row === gridRow);
      setPhotos(filtered);
    } catch (err) {
      console.error("Failed to load photos", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    
    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;
    let acc: number | undefined = undefined;
    let source: 'browser' | 'exif' | 'none' = 'none';

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by your browser."));
        } else {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        }
      });
      
      lat = position.coords.latitude;
      lng = position.coords.longitude;
      acc = position.coords.accuracy;
      source = 'browser';
    } catch (err: any) {
      console.warn("Geolocation failed or denied:", err);
      toast.warning("Could not attach location to photo.", {
        description: "Proceeding with upload without GPS coordinates."
      });
    }

    try {
      await projectsApi.uploadSitePhoto({
        floor_plan: asset.id,
        image: selectedFile,
        caption,
        grid_col: gridCol,
        grid_row: gridRow,
        gps_source: source,
        latitude: lat,
        longitude: lng,
        gps_accuracy_m: acc
      });
      setCaption("");
      setSelectedFile(null);
      await loadPhotos();
      toast.success("Photo uploaded successfully!");
      if (onPhotoAdded) onPhotoAdded();
    } catch (err) {
      console.error("Failed to upload photo", err);
      toast.error("Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: number) => {
    try {
      await projectsApi.deleteSitePhoto(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      if (onPhotoDeleted) onPhotoDeleted();
    } catch (err) {
      console.error("Failed to delete photo", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface-100 border-l border-surface-200 shadow-2xl z-[100] flex flex-col animate-fade-in-right">
      <div className="p-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
        <div>
          <h2 className="text-lg font-black text-surface-900">Zone {cellLabel}</h2>
          <p className="text-[10px] uppercase tracking-widest text-surface-500 text-surface-400 font-bold">Site Photos</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center hover:bg-surface-300 transition-colors">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Upload Form */}
        <form onSubmit={handleUpload} className="bg-surface-50 p-4 rounded-xl border border-surface-200 shadow-sm flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 text-surface-400 mb-1 block">Photo File</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 text-surface-400 mb-1 block">Caption</label>
            <input 
              type="text" 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-surface-100 border border-surface-300 rounded px-2 py-1.5 text-sm"
              placeholder="Describe this photo..."
            />
          </div>
          <button 
            type="submit" 
            disabled={!selectedFile || isUploading}
            className="w-full h-9 bg-primary text-background font-black text-[10px] uppercase tracking-widest rounded hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </form>

        {/* Photo List */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-surface-400 border-b border-surface-200 pb-1">
            Uploaded Photos ({photos.length})
          </h3>
          
          {isLoading ? (
            <div className="text-center text-surface-500 text-surface-400 text-xs py-4">Loading...</div>
          ) : photos.length === 0 ? (
            <div className="text-center text-surface-500 text-surface-400 text-xs py-4 italic">No photos in this zone yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="bg-surface-50 border border-surface-200 rounded-xl overflow-hidden shadow-sm group">
                  <div className="aspect-video relative bg-surface-200">
                    <img src={photo.image} alt={photo.caption} className="w-full h-full object-cover" />
                    {photo.latitude && photo.longitude && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded flex items-center gap-1 shadow-sm" title={`Lat: ${Number(photo.latitude).toFixed(6)}, Lng: ${Number(photo.longitude).toFixed(6)}`}>
                        <span className="text-[10px]">📍</span>
                      </div>
                    )}
                    <button 
                      onClick={() => handleDelete(photo.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                      title="Delete Photo"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-surface-800 mb-1">{photo.caption || "No caption"}</p>
                    <div className="flex justify-between items-center text-[10px] text-surface-500 text-surface-400">
                      <span>{photo.uploaded_by?.first_name} {photo.uploaded_by?.last_name}</span>
                      <span>{formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
