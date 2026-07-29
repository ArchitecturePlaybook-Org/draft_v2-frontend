"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { SketchBoard } from "@/components/sketch/SketchBoard";
import { Spinner } from "@/components/ui/Spinner";

export default function DedicatedSketchPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const assetIdParam = searchParams.get("assetId");

  const [initialData, setInitialData] = useState<any>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [currentAssetId, setCurrentAssetId] = useState<number | null>(
    assetIdParam ? Number(assetIdParam) : null
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadProject = async () => {
      try {
        const project = await projectsApi.getProjectDetails(id as string);
        setProjectId(project.id);
      } catch (err) {
        console.error("Failed to fetch project info:", err);
      }
    };

    const loadData = async () => {
      if (!assetIdParam) {
        setIsLoading(false);
        return;
      }
      try {
        // Fetch asset metadata by assetId to get latest file URL securely
        const assetDetails = await projectsApi.getProjectAssetDetails(Number(assetIdParam));
        const rawFileUrl = assetDetails?.file;
        
        if (rawFileUrl) {
          let fetchUrl = rawFileUrl;
          if (rawFileUrl.startsWith("/")) {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            fetchUrl = `${apiBaseUrl.replace(/\/$/, "")}${rawFileUrl}`;
          }

          const isS3Signed = fetchUrl.includes("X-Amz-Signature") || fetchUrl.includes("amazonaws.com");
          if (!isS3Signed && !fetchUrl.includes("t=")) {
            const delimiter = fetchUrl.includes("?") ? "&" : "?";
            fetchUrl = `${fetchUrl}${delimiter}t=${Date.now()}`;
          }

          try {
            const response = await fetch(fetchUrl);
            if (response.ok) {
              const data = await response.json();
              setInitialData(data);
            } else {
              console.warn(`Direct asset fetch returned status ${response.status}`);
            }
          } catch (fetchErr) {
            console.warn("Direct asset fetch failed:", fetchErr);
          }
        }
      } catch (err) {
        console.error("Failed to load sketch data by assetId:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    Promise.all([loadProject(), loadData()]);
  }, [id, assetIdParam]);

  const handleSave = async (json: string, title: string, thumbnail?: Blob) => {
    if (!projectId) {
      alert("Project context not loaded. Please wait.");
      return;
    }
    try {
      const fileName = `${title.replace(/\s+/g, '_')}.excalidraw`;
      const file = new File([json], fileName, { type: "application/json" });

      if (currentAssetId) {
        // Update existing asset revision to prevent duplicate cards
        const updated = await projectsApi.uploadRevision(
          currentAssetId, 
          file, 
          `Updated design sketch: ${title}`, 
          thumbnail
        );
        if (updated?.id) {
          setCurrentAssetId(updated.id);
        }
        alert("Design sketch revision saved successfully!");
      } else {
        // Create new asset for newly created sketch
        const newAsset = await projectsApi.uploadProjectAsset(projectId, "sketch", file, title, thumbnail);
        if (newAsset?.id) {
          setCurrentAssetId(newAsset.id);
        }
        alert("New design sketch committed to hub successfully!");
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(`Failed to commit sketch: ${err.message || "Unknown error"}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface-100 border-surface-200">
        <Spinner label="Opening Architectural Design Suite..." />
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <SketchBoard 
        initialData={initialData}
        onClose={() => window.close()}
        onSave={handleSave}
      />
    </div>
  );
}
