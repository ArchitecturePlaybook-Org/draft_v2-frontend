"use client";
import React, { useEffect, useRef, useState } from "react";
import { projectsApi } from "@/domains/projects/api";
import { fetchCachedAssetImage, getCachedAssetImageUrl } from "@/lib/assetImageCache";

interface ProtectedFloorPlanViewerProps {
  assetId: number;
  versionKey?: string;
  lazy?: boolean;
  children: React.ReactNode;
}

/**
 * IP Protection Wrapper for Architectural Floor Plans.
 * - Fetches via secure-view once and caches the PNG blob in memory.
 * - Lazy-loads when scrolled into view (default).
 * - Blocks context menu and image dragging.
 */
export function ProtectedFloorPlanViewer({
  assetId,
  versionKey,
  lazy = false,
  children,
}: ProtectedFloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const secureUrl = projectsApi.getSecureAssetUrl(assetId);
  const cacheVersion = versionKey ?? String(assetId);
  const [imageUrl, setImageUrl] = useState<string | null>(() =>
    getCachedAssetImageUrl(assetId, cacheVersion)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      const existing = getCachedAssetImageUrl(assetId, cacheVersion);
      if (existing) {
        if (!cancelled) setImageUrl(existing);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const blobUrl = await fetchCachedAssetImage(assetId, secureUrl, cacheVersion);
        if (!cancelled) setImageUrl(blobUrl);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (!lazy) {
      void loadImage();
      return () => {
        cancelled = true;
      };
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          void loadImage();
        }
      },
      { rootMargin: "80px" }
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [assetId, secureUrl, cacheVersion, lazy]);

  return (
    <div
      ref={containerRef}
      className="relative select-none w-full h-full overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 z-20 pointer-events-none" />

      <div className="relative inline-block bg-surface-100 border-surface-200 shadow-2xl rounded-sm overflow-hidden border border-surface-200 min-w-[200px] min-h-[200px]">
        {isLoading && !imageUrl && (
          <div className="flex items-center justify-center w-full h-[400px] bg-surface-50">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {hasError && !imageUrl && (
          <div className="flex items-center justify-center w-full h-[400px] bg-surface-50 text-xs font-bold text-surface-400">
            Failed to load floor plan
          </div>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Architectural Floor Plan"
            className="block max-w-full max-h-[75vh] w-auto h-auto pointer-events-auto"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        )}

        {imageUrl && (
          <div className="absolute inset-0 z-30">
            {children}
          </div>
        )}
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
