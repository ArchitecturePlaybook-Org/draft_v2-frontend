"use client";

import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { SketchBoard, SketchSaveMode } from "@/components/sketch/SketchBoard";
import { CreateSketchModal } from "@/components/projects/CreateSketchModal";
import { Spinner } from "@/components/ui/Spinner";
import { invalidateBffCache } from "@/lib/bffCache";
import { Button } from "@/components/ui/Button";
import { ProjectAsset } from "@/types/projects";
import { toast } from "sonner";

function readUrlAssetId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("assetId");
}

function emptyCanvas() {
  return {
    type: "excalidraw",
    version: 2,
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  };
}

function parseExcalidrawScene(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return emptyCanvas();
  }
}

function normalizeScene(raw: any) {
  if (!raw || typeof raw !== "object") return emptyCanvas();
  const { _revision_meta: _meta, ...rest } = raw;
  return {
    type: rest.type || "excalidraw",
    version: rest.version ?? 2,
    elements: Array.isArray(rest.elements) ? rest.elements : [],
    appState: rest.appState || { viewBackgroundColor: "#ffffff" },
    files: rest.files || {},
  };
}

function SketchPageContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectUid = id as string;

  const assetIdFromUrl = searchParams.get("assetId") || readUrlAssetId();
  const hasAssetParams = Boolean(assetIdFromUrl);

  const [sceneData, setSceneData] = useState<any>(null);
  const [initialTitle, setInitialTitle] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [currentAssetId, setCurrentAssetId] = useState<number | null>(
    assetIdFromUrl ? Number(assetIdFromUrl) : null,
  );
  const [canonicalUid, setCanonicalUid] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number>(1);
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(hasAssetParams);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(!hasAssetParams);
  const [sceneKey, setSceneKey] = useState(0);
  const [latestAssetId, setLatestAssetId] = useState<number | null>(null);

  /** Skip one URL-driven reload after openVersion already loaded the asset */
  const skipUrlLoadRef = useRef(false);
  const loadedAssetIdRef = useRef<number | null>(null);

  const sketchId = canonicalUid || (currentAssetId ? String(currentAssetId) : null);

  const loadAssetById = useCallback(async (assetId: number) => {
    await invalidateBffCache(
      `/api/v1/projects/assets/${assetId}`,
      `/api/v1/projects/assets/${assetId}/scene`,
    );

    const [assetDetails, rawScene] = await Promise.all([
      projectsApi.getProjectAssetDetails(assetId, { skipCache: true }),
      projectsApi.getAssetScene(assetId),
    ]);

    if (assetDetails.id !== assetId) {
      throw new Error(`Asset mismatch: requested ${assetId}, got ${assetDetails.id}`);
    }

    const scene = normalizeScene(rawScene);
    const meta = rawScene?._revision_meta;
    const resolvedVersion = meta?.version_number ?? assetDetails.version_number ?? 1;
    const resolvedIsLatest = meta?.is_latest ?? assetDetails.is_latest === true;

    setCurrentAssetId(assetDetails.id);
    setCanonicalUid(String(assetDetails.canonical_uid || ""));
    setInitialTitle(assetDetails.title);
    setVersionNumber(resolvedVersion);
    setIsLatestVersion(resolvedIsLatest);
    setSceneData(scene);
    setSceneKey((k) => k + 1);
    loadedAssetIdRef.current = assetDetails.id;

    try {
      const history = await projectsApi.getAssetHistory(assetId);
      const latest = history.find((v) => v.is_latest);
      setLatestAssetId(latest?.id ?? (resolvedIsLatest ? assetId : null));
    } catch {
      setLatestAssetId(resolvedIsLatest ? assetId : null);
    }

    return assetDetails;
  }, []);

  const loadSketchFromUrl = useCallback(async () => {
    if (!assetIdFromUrl) {
      setShowCreateModal(true);
      setIsInitialLoading(false);
      setLoadError(null);
      return;
    }

    const assetId = Number(assetIdFromUrl);
    if (Number.isNaN(assetId)) {
      setLoadError("Invalid sketch link.");
      setIsInitialLoading(false);
      return;
    }

    // openVersion already loaded this asset — don't wipe the canvas
    if (loadedAssetIdRef.current === assetId && sceneData) {
      return;
    }

    setShowCreateModal(false);
    setIsInitialLoading(true);
    setLoadError(null);

    try {
      if (!projectId) {
        const project = await projectsApi.getProjectDetails(projectUid);
        setProjectId(project.id);
      }
      await loadAssetById(assetId);
    } catch (err) {
      console.error("Failed to load sketch:", err);
      setLoadError("Could not load this sketch. Please try again.");
    } finally {
      setIsInitialLoading(false);
    }
  }, [assetIdFromUrl, projectUid, projectId, loadAssetById, sceneData]);

  useEffect(() => {
    if (skipUrlLoadRef.current) {
      skipUrlLoadRef.current = false;
      return;
    }
    void loadSketchFromUrl();
  }, [assetIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const openVersion = useCallback(
    async (version: Pick<ProjectAsset, "id"> & Partial<Pick<ProjectAsset, "canonical_uid" | "is_latest" | "version_number">>) => {
      if (loadedAssetIdRef.current === version.id && sceneData) {
        skipUrlLoadRef.current = true;
        router.replace(`/dashboard/projects/${projectUid}/sketch?assetId=${version.id}`);
        return;
      }

      setIsSwitchingVersion(true);
      setLoadError(null);

      if (version.version_number) setVersionNumber(version.version_number);
      if (typeof version.is_latest === "boolean") setIsLatestVersion(version.is_latest);

      try {
        if (!projectId) {
          const project = await projectsApi.getProjectDetails(projectUid);
          setProjectId(project.id);
        }
        await loadAssetById(version.id);
        skipUrlLoadRef.current = true;
        router.replace(`/dashboard/projects/${projectUid}/sketch?assetId=${version.id}`);
      } catch (err) {
        console.error("Failed to open version:", err);
        setLoadError("Could not open that version.");
        toast.error("Could not open that version.");
        throw err;
      } finally {
        setIsSwitchingVersion(false);
      }
    },
    [loadAssetById, projectUid, projectId, router, sceneData],
  );

  const openLatestVersion = useCallback(async () => {
    if (latestAssetId) {
      await openVersion({ id: latestAssetId, is_latest: true });
      return;
    }
    if (!currentAssetId) return;
    try {
      const history = await projectsApi.getAssetHistory(currentAssetId);
      const latest = history.find((v) => v.is_latest);
      if (latest) await openVersion(latest);
    } catch (err) {
      console.error("Failed to open current version:", err);
      toast.error("Could not open the current version.");
    }
  }, [latestAssetId, currentAssetId, openVersion]);

  const navigateToSketch = (asset: { id: number; canonical_uid?: string }) => {
    loadedAssetIdRef.current = null;
    router.replace(`/dashboard/projects/${projectUid}/sketch?assetId=${asset.id}`);
  };

  const handleSave = async (
    json: string,
    title: string,
    mode: SketchSaveMode,
    thumbnail?: Blob,
    versionNotes?: string,
  ) => {
    if (!projectId) throw new Error("Project not loaded yet");
    if (!currentAssetId) throw new Error("No sketch loaded");

    const parsedScene = parseExcalidrawScene(json);
    const fileName = `${title.replace(/\s+/g, "_")}.excalidraw`;
    const file = new File([json], fileName, { type: "application/json" });

    if (mode === "overwrite") {
      await projectsApi.overwriteAsset(currentAssetId, file, thumbnail, `Updated: ${title}`);
      if (title.trim()) {
        await projectsApi.updateProjectAsset(currentAssetId, { title: title.trim() });
      }
      setSceneData(parsedScene);
      setSceneKey((k) => k + 1);
    } else {
      const previousAssetId = currentAssetId;
      const updated = await projectsApi.uploadRevision(
        currentAssetId,
        file,
        versionNotes || `Version: ${title}`,
        thumbnail,
      );
      if (!updated?.id) throw new Error("Failed to create new version");

      if (title.trim()) {
        await projectsApi.updateProjectAsset(updated.id, { title: title.trim() });
      }

      await invalidateBffCache(
        `/api/v1/projects/projects/${projectUid}`,
        "/api/v1/projects/assets/",
        `/api/v1/projects/assets/${previousAssetId}`,
        `/api/v1/projects/assets/${updated.id}`,
        `/api/v1/projects/assets/${previousAssetId}/scene`,
        `/api/v1/projects/assets/${updated.id}/scene`,
      );

      loadedAssetIdRef.current = null;
      await openVersion(updated);
    }

    await invalidateBffCache(
      `/api/v1/projects/projects/${projectUid}`,
      "/api/v1/projects/assets/",
      `/api/v1/projects/assets/${currentAssetId}`,
      `/api/v1/projects/assets/${currentAssetId}/scene`,
    );
  };

  const handleCloseTab = () => {
    try {
      window.close();
    } catch {
      // Ignore if blocked by browser
    }
    setTimeout(() => {
      router.push(`/dashboard/projects/${projectUid}`);
    }, 100);
  };

  if (showCreateModal && !hasAssetParams) {
    return (
      <CreateSketchModal
        isOpen
        projectUid={projectUid}
        onClose={handleCloseTab}
        onSuccess={() => {}}
        onCreated={navigateToSketch}
        openInSameTab
      />
    );
  }

  if (isInitialLoading && !sceneData) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Spinner label="Opening Creative Sketch…" />
      </div>
    );
  }

  if (loadError && !sceneData) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
        <div className="text-4xl">✏️</div>
        <h1 className="text-lg font-black text-primary">{loadError}</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCloseTab}>
            Back to project
          </Button>
          <Button onClick={() => void loadSketchFromUrl()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!sceneData || !sketchId || !currentAssetId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Spinner label="Opening Creative Sketch…" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {isSwitchingVersion && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <Spinner label="Loading version…" />
        </div>
      )}
      <SketchBoard
        key={`${currentAssetId}-v${versionNumber}-${sceneKey}`}
        projectUid={projectUid}
        sketchId={sketchId}
        assetId={currentAssetId}
        versionNumber={versionNumber}
        isLatestVersion={isLatestVersion}
        initialTitle={initialTitle}
        initialData={sceneData}
        sceneKey={sceneKey}
        latestAssetId={latestAssetId}
        onClose={handleCloseTab}
        onSave={handleSave}
        onOpenVersion={openVersion}
        onOpenLatest={openLatestVersion}
        onVersionRestored={async () => {
          loadedAssetIdRef.current = null;
          const history = await projectsApi.getAssetHistory(currentAssetId);
          const latest = history.find((v) => v.is_latest);
          if (latest) await openVersion(latest);
        }}
      />
    </div>
  );
}

export default function DedicatedSketchPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <Spinner label="Loading sketch editor…" />
        </div>
      }
    >
      <SketchPageContent />
    </Suspense>
  );
}
