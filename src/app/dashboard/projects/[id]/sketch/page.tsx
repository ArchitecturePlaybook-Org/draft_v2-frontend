"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { SketchBoard } from "@/components/sketch/SketchBoard";
import { Spinner } from "@/components/ui/Spinner";

export default function DedicatedSketchPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const assetUrl = searchParams.get("assetUrl");
  const [initialData, setInitialData] = useState<any>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
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
      if (!assetUrl) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${assetUrl}?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setInitialData(data);
      } catch (err) {
        console.error("Failed to load sketch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    Promise.all([loadProject(), loadData()]);
  }, [id, assetUrl]);

  const handleSave = async (json: string, title: string, thumbnail?: Blob) => {
    if (!projectId) {
      alert("Project context not loaded. Please wait.");
      return;
    }
    try {
      const file = new File([json], `${title.replace(/\s+/g, '_')}.excalidraw`, { type: "application/json" });
      await projectsApi.uploadProjectAsset(projectId, "sketch", file, title, thumbnail);
      alert("Design committed to hub successfully!");
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(`Failed to commit sketch: ${err.message || "Unknown error"}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
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
