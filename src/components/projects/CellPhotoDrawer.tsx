"use client";

import React, { useState, useEffect, useRef } from "react";
import exifr from "exifr";
import { ProjectAsset, SitePhoto } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { 
  Upload, 
  Camera, 
  X, 
  Trash2, 
  MapPin, 
  ImageIcon, 
  Loader2, 
  Maximize2,
  FileImage,
  CheckCircle2
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";

interface CellPhotoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: ProjectAsset;
  gridCol: number;
  gridRow: number;
  onPhotoAdded?: () => void;
  onPhotoDeleted?: () => void;
}

// Helper to watermark metadata directly INSIDE the uploaded image file
async function stampMetadataOnImage(
  file: File,
  meta: {
    lat?: number;
    lng?: number;
    timestamp: string;
    uploaderName: string;
    zoneLabel: string;
  }
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const bannerH = Math.max(36, Math.round(img.height * 0.055));
      const fontSz = Math.max(12, Math.round(bannerH * 0.36));

      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, img.height - bannerH, img.width, bannerH);

      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(0, img.height - bannerH, img.width, Math.max(2, Math.round(bannerH * 0.05)));

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSz}px sans-serif`;
      ctx.textBaseline = "middle";

      const timeStr = `🕒 ${new Date(meta.timestamp).toLocaleString()}`;
      const gpsStr = meta.lat && meta.lng ? `📍 ${meta.lat.toFixed(5)}, ${meta.lng.toFixed(5)}` : "";
      const userStr = `👤 ${meta.uploaderName}`;
      const zoneStr = `Zone ${meta.zoneLabel}`;

      const textLine = [zoneStr, timeStr, gpsStr, userStr].filter(Boolean).join("  •  ");
      ctx.fillText(textLine, Math.max(12, Math.round(img.width * 0.02)), img.height - (bannerH / 2));

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const stampedFile = new File([blob], file.name, {
          type: file.type || "image/jpeg",
          lastModified: Date.now()
        });
        resolve(stampedFile);
      }, file.type || "image/jpeg", 0.92);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export function CellPhotoDrawer({ isOpen, onClose, asset, gridCol, gridRow, onPhotoAdded, onPhotoDeleted }: CellPhotoDrawerProps) {
  const { user } = useAuthStore();
  const userRealName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || user.email
    : "Site Surveyor";

  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Extracted EXIF metadata preview state
  const [exifTimestamp, setExifTimestamp] = useState<string | null>(null);
  const [extractedGps, setExtractedGps] = useState<{ lat: number; lng: number; source: 'exif' | 'browser' | 'none' } | null>(null);

  // Lightbox view state
  const [viewingPhoto, setViewingPhoto] = useState<SitePhoto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const colLetter = String.fromCharCode(65 + gridCol);
  const rowNum = gridRow + 1;
  const cellLabel = `${colLetter}${rowNum}`;

  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen, asset.id, gridCol, gridRow]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setExifTimestamp(null);
      setExtractedGps(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Extract EXIF Timestamp and GPS metadata automatically
    (async () => {
      try {
        const exifData = await exifr.parse(selectedFile, {
          gps: true,
          pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude']
        });

        if (exifData) {
          if (exifData.DateTimeOriginal) {
            setExifTimestamp(new Date(exifData.DateTimeOriginal).toISOString());
          } else if (exifData.CreateDate) {
            setExifTimestamp(new Date(exifData.CreateDate).toISOString());
          }

          if (typeof exifData.latitude === 'number' && typeof exifData.longitude === 'number') {
            setExtractedGps({ lat: exifData.latitude, lng: exifData.longitude, source: 'exif' });
          }
        }
      } catch (e) {
        console.warn("EXIF extraction skipped:", e);
      }
    })();

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const res = await projectsApi.getSitePhotos(asset.id);
      const filtered = res.filter(p => p.grid_col === gridCol && p.grid_row === gridRow);
      setPhotos(filtered);
    } catch (err) {
      console.error("Failed to load photos", err);
      toast.error("Failed to load photos for this zone.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
      } else {
        toast.error("Invalid file format. Please upload an image (PNG, JPG, WEBP).");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setExifTimestamp(null);
    setExtractedGps(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    
    let capturedAt: string = exifTimestamp || new Date().toISOString();
    let lat: number | undefined = extractedGps?.lat;
    let lng: number | undefined = extractedGps?.lng;
    let acc: number | undefined = undefined;
    let source: 'browser' | 'exif' | 'none' = extractedGps?.source || 'none';

    // Fallback to browser Geolocation if EXIF GPS missing
    if (!lat || !lng) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser."));
          } else {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 4000,
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
      }
    }

    // Stamp metadata permanently INSIDE the image file before upload
    const stampedFile = await stampMetadataOnImage(selectedFile, {
      lat,
      lng,
      timestamp: capturedAt,
      uploaderName: userRealName || "Demo User",
      zoneLabel: cellLabel
    });

    try {
      await projectsApi.uploadSitePhoto({
        floor_plan: asset.id,
        image: stampedFile,
        caption,
        grid_col: gridCol,
        grid_row: gridRow,
        gps_source: source,
        latitude: lat,
        longitude: lng,
        gps_accuracy_m: acc,
        captured_at: capturedAt
      });
      setCaption("");
      clearSelectedFile();
      await loadPhotos();
      toast.success("Photo uploaded with metadata stamped inside image!");
      if (onPhotoAdded) onPhotoAdded();
    } catch (err) {
      console.error("Failed to upload photo", err);
      toast.error("Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: number) => {
    setDeletingId(photoId);
    try {
      await projectsApi.deleteSitePhoto(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success("Photo removed");
      if (onPhotoDeleted) onPhotoDeleted();
    } catch (err) {
      console.error("Failed to delete photo", err);
      toast.error("Failed to delete photo");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-96 sm:w-[420px] bg-surface-100/95 backdrop-blur-xl border-l border-surface-200 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 sm:p-5 border-b border-surface-200/80 flex justify-between items-center bg-surface-50/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black text-sm shadow-inner">
              {cellLabel}
            </div>
            <div>
              <h2 className="text-base font-black text-surface-900 tracking-tight">Zone {cellLabel}</h2>
              <p className="text-[10px] uppercase tracking-widest text-surface-500 font-bold flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-accent" />
                Site Inspection Photos
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-surface-200/60 hover:bg-surface-300/80 flex items-center justify-center text-surface-600 hover:text-surface-900 transition-all active:scale-95"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          <form onSubmit={handleUpload} className="bg-surface-50/90 border border-surface-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-accent" />
                Upload New Photo
              </span>
              {selectedFile && (
                <button 
                  type="button" 
                  onClick={clearSelectedFile}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!selectedFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 ${
                  isDragging 
                    ? "border-accent bg-accent/5 scale-[0.99]" 
                    : "border-surface-300 hover:border-accent/60 hover:bg-surface-100/60"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-200/70 group-hover:bg-accent/10 text-surface-600 group-hover:text-accent flex items-center justify-center transition-colors shadow-sm">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-surface-800">
                    <span className="text-accent underline underline-offset-2">Click to select photo</span> or drag & drop
                  </p>
                  <p className="text-[10px] text-surface-400 font-medium">
                    Supports PNG, JPG, WEBP (Stamps GPS & Timestamp in Image)
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative border border-surface-200 rounded-xl bg-surface-100 overflow-hidden shadow-inner flex flex-col gap-2 p-2">
                <div className="aspect-video relative rounded-lg overflow-hidden bg-black/5 group">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Selected preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-surface-400">
                      <FileImage className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="p-2 bg-surface-50 rounded-lg border border-surface-200 text-[10px] space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-surface-500">Photo Timestamp:</span>
                    <span className="text-foreground">{exifTimestamp ? new Date(exifTimestamp).toLocaleString() : new Date().toLocaleString()}</span>
                  </div>
                  {extractedGps && (
                    <div className="flex items-center justify-between font-bold text-emerald-600">
                      <span className="flex items-center gap-1">📍 EXIF GPS:</span>
                      <span>{extractedGps.lat.toFixed(5)}, {extractedGps.lng.toFixed(5)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Photo caption / inspection note..."
              className="w-full bg-surface-100 border border-surface-200 rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-accent"
            />

            <button 
              type="submit" 
              disabled={!selectedFile || isUploading}
              className="w-full h-10 bg-accent text-background font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Stamping & Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload to Zone {cellLabel}</span>
                </>
              )}
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-surface-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-surface-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-surface-500" />
                Uploaded Photos ({photos.length})
              </h3>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-surface-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <span className="text-xs font-medium">Loading photos...</span>
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-10 px-4 bg-surface-50/50 border border-dashed border-surface-200 rounded-2xl space-y-2">
                <div className="w-10 h-10 rounded-full bg-surface-200/50 text-surface-400 flex items-center justify-center mx-auto">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-surface-600">No photos in Zone {cellLabel}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {photos.map(photo => (
                  <div 
                    key={photo.id} 
                    className="bg-surface-50 border border-surface-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="aspect-video relative bg-surface-200/50 overflow-hidden cursor-pointer" onClick={() => setViewingPhoto(photo)}>
                      <img 
                        src={photo.image} 
                        alt={photo.caption || `Zone ${cellLabel} photo`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Glassmorphic Data Banner OVERLAID INSIDE THE PHOTO IMAGE */}
                      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white text-[9.5px] flex flex-col gap-0.5 pointer-events-none z-10">
                        <div className="flex items-center justify-between font-black tracking-tight drop-shadow-md">
                          <span className="flex items-center gap-1 text-emerald-400">
                            📍 {photo.latitude && photo.longitude ? `${Number(photo.latitude).toFixed(5)}, ${Number(photo.longitude).toFixed(5)}` : 'Zone ' + cellLabel}
                          </span>
                          <span className="text-amber-300 flex items-center gap-1">
                            👤 {photo.uploaded_by?.first_name || photo.uploaded_by?.email ? `${photo.uploaded_by?.first_name || ''} ${photo.uploaded_by?.last_name || ''}`.trim() || photo.uploaded_by?.email : (userRealName || 'Demo User')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[8.5px] text-surface-200 font-semibold drop-shadow-md">
                          <span>🕒 {new Date(photo.captured_at || photo.created_at).toLocaleString()}</span>
                          <span className="uppercase text-amber-400 font-black tracking-widest">Zone {cellLabel}</span>
                        </div>
                      </div>

                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button
                          onClick={() => setViewingPhoto(photo)}
                          className="w-8 h-8 bg-surface-900/80 hover:bg-surface-900 text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95"
                          title="Expand Photo"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                          disabled={deletingId === photo.id}
                          className="w-8 h-8 bg-red-500/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50"
                          title="Delete Photo"
                        >
                          {deletingId === photo.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <p className="text-xs font-bold text-surface-900 leading-snug">
                        {photo.caption || <span className="text-surface-400 italic font-normal">No caption provided</span>}
                      </p>

                      <div className="flex flex-col gap-1 text-[10px] text-surface-500 pt-1.5 border-t border-surface-200/60">
                        {/* Uploader User Name Badge */}
                        <div className="flex items-center justify-between font-extrabold text-foreground">
                          <span className="flex items-center gap-1 text-accent">
                            👤 Uploaded by:
                          </span>
                          <span className="bg-surface-200/60 dark:bg-surface-800 px-2 py-0.5 rounded-md text-[9px]">
                            {photo.uploaded_by?.first_name || photo.uploaded_by?.email ? (
                              `${photo.uploaded_by?.first_name || ''} ${photo.uploaded_by?.last_name || ''}`.trim() || photo.uploaded_by?.email
                            ) : (
                              userRealName || 'Demo User'
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-0.5">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            🕒 {new Date(photo.captured_at || photo.created_at).toLocaleString()}
                          </span>
                          <span className="text-surface-400 font-semibold">
                            ({formatDistanceToNow(new Date(photo.captured_at || photo.created_at), { addSuffix: true })})
                          </span>
                        </div>

                        {photo.latitude && photo.longitude && (
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              📍 GPS: {Number(photo.latitude).toFixed(5)}, {Number(photo.longitude).toFixed(5)}
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${photo.latitude},${photo.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[9px] font-black uppercase tracking-wider text-accent hover:underline flex items-center gap-0.5"
                            >
                              🗺️ Map
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewingPhoto && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setViewingPhoto(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-900/90 border-b border-surface-800 flex justify-between items-center text-white">
              <div>
                <h4 className="font-bold text-sm text-surface-100">Zone {cellLabel} Inspection Photo</h4>
                {viewingPhoto.caption && (
                  <p className="text-xs text-surface-400">{viewingPhoto.caption}</p>
                )}
              </div>
              <button 
                onClick={() => setViewingPhoto(null)}
                className="w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center p-2 overflow-hidden">
              <img 
                src={viewingPhoto.image} 
                alt={viewingPhoto.caption || "Full resolution site photo"}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-xl"
              />
            </div>
            {viewingPhoto.latitude && viewingPhoto.longitude && (
              <div className="p-3 bg-surface-900 border-t border-surface-800 text-[11px] text-surface-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Captured at Lat: {Number(viewingPhoto.latitude).toFixed(6)}, Lng: {Number(viewingPhoto.longitude).toFixed(6)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
