"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import { SketchVersionPanel } from "./SketchVersionPanel";
import { ProjectAsset } from "@/types/projects";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <Spinner label="Calibrating sketching engine…" />
      </div>
    ),
  },
);

let serializeAsJSON: any;
let exportToBlob: any;
if (typeof window !== "undefined") {
  import("@excalidraw/excalidraw").then((mod) => {
    serializeAsJSON = mod.serializeAsJSON;
    exportToBlob = mod.exportToBlob;
  });
}

export type SketchSaveMode = "overwrite" | "version";

interface SketchBoardProps {
  projectUid: string;
  sketchId: string;
  assetId?: number | null;
  versionNumber?: number;
  isLatestVersion?: boolean;
  latestAssetId?: number | null;
  initialTitle?: string;
  onSave: (
    json: string,
    title: string,
    mode: SketchSaveMode,
    thumbnail?: Blob,
    versionNotes?: string,
  ) => Promise<void>;
  onClose: () => void;
  onOpenVersion?: (
    version: Pick<ProjectAsset, "id"> & Partial<Pick<ProjectAsset, "canonical_uid" | "is_latest" | "version_number">>,
  ) => void | Promise<void>;
  onOpenLatest?: () => void | Promise<void>;
  onVersionRestored?: () => void;
  initialData?: any;
  sceneKey?: number;
}

function useAppTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function buildExcalidrawData(scene: any, appTheme: "light" | "dark") {
  return {
    type: "excalidraw" as const,
    version: scene?.version ?? 2,
    elements: scene?.elements ?? [],
    appState: {
      ...(scene?.appState ?? {}),
      viewBackgroundColor:
        scene?.appState?.viewBackgroundColor ||
        (appTheme === "dark" ? "#1e1e1e" : "#ffffff"),
    },
    files: scene?.files ?? {},
  };
}

export const SketchBoard: React.FC<SketchBoardProps> = ({
  projectUid,
  assetId,
  versionNumber = 1,
  isLatestVersion = true,
  latestAssetId,
  initialTitle,
  onSave,
  onClose,
  onOpenVersion,
  onOpenLatest,
  onVersionRestored,
  initialData,
  sceneKey = 0,
}) => {
  const appTheme = useAppTheme();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [title, setTitle] = useState(
    initialTitle || `Concept Sketch ${new Date().toLocaleDateString()}`,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showVersionNotes, setShowVersionNotes] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const excalidrawInitialData = useMemo(
    () => buildExcalidrawData(initialData, appTheme),
    [initialData, appTheme],
  );

  const editorInstanceKey = `${assetId}-v${versionNumber}-s${sceneKey}`;

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setExcalidrawAPI(null);
  }, [editorInstanceKey]);

  const exportSketch = async () => {
    if (!excalidrawAPI || !serializeAsJSON) {
      throw new Error("Sketching engine not ready");
    }
    const elements = excalidrawAPI.getSceneElements();
    if (!elements || elements.length === 0) {
      throw new Error("Please draw something before saving");
    }
    const json = serializeAsJSON(
      elements,
      excalidrawAPI.getAppState(),
      excalidrawAPI.getFiles(),
      "local",
    );
    let thumbnailBlob: Blob | undefined;
    try {
      thumbnailBlob = await exportToBlob({
        elements,
        mimeType: "image/png",
        appState: {
          ...excalidrawAPI.getAppState(),
          exportWithBlurryBackground: false,
          exportBackground: true,
        },
        files: excalidrawAPI.getFiles(),
      });
    } catch (err) {
      console.warn("Thumbnail generation failed:", err);
    }
    return { json, thumbnailBlob };
  };

  const runSave = async (mode: SketchSaveMode) => {
    if (isSaving || !isLatestVersion) return;
    setIsSaving(true);
    setSaveStatus(mode === "overwrite" ? "Saving…" : "Saving new version…");
    try {
      const { json, thumbnailBlob } = await exportSketch();
      await onSave(json, title, mode, thumbnailBlob, mode === "version" ? versionNotes : undefined);
      setSaveStatus(mode === "overwrite" ? "Saved" : "Version saved");
      toast.success(mode === "overwrite" ? "Sketch saved" : "New version saved");
      if (mode === "version") {
        setShowVersionNotes(false);
        setVersionNotes("");
      }
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
      setSaveStatus(null);
    } finally {
      setIsSaving(false);
    }
  };

  const showReadOnlyBanner = !isLatestVersion;

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="h-16 border-b border-border flex justify-between items-center px-4 sm:px-8 bg-background shrink-0 shadow-sm gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-xl shrink-0">
            ✏️
          </div>
          <div className="min-w-0 flex-1 max-w-xs sm:max-w-md">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!isLatestVersion}
              className="bg-transparent border-none outline-none font-bold text-primary text-sm w-full focus:ring-1 focus:ring-accent/20 rounded truncate disabled:opacity-80"
              placeholder="Sketch title…"
            />
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">
              Creative Sketch · V{versionNumber}
              {isLatestVersion ? " · Latest (editable)" : " · Snapshot"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <ThemeToggle />
          {saveStatus && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent px-2">
              {saveStatus}
            </span>
          )}
          {assetId && (
            <Button
              variant="outline"
              onClick={() => setShowVersionPanel(true)}
              className="h-9 text-[9px] uppercase font-bold tracking-widest"
            >
              Versions
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 text-[9px] uppercase font-bold tracking-widest"
          >
            Close
          </Button>
          <Button
            variant="outline"
            disabled={isSaving || !assetId || !isLatestVersion}
            onClick={() => setShowVersionNotes(true)}
            className="h-9 text-[9px] uppercase font-bold tracking-widest border-accent/30 text-accent disabled:opacity-40"
          >
            Save As Version
          </Button>
          <Button
            disabled={isSaving || !isLatestVersion}
            onClick={() => runSave("overwrite")}
            className="h-9 text-[9px] uppercase font-bold tracking-widest bg-accent disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {showReadOnlyBanner && (
        <div className="shrink-0 px-4 sm:px-8 py-3 border-b border-border bg-muted/50 dark:bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-base shadow-sm"
                aria-hidden
              >
                👁
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary leading-tight">
                  Viewing version {versionNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Read-only snapshot — open the latest version to edit and save.
                </p>
              </div>
            </div>
            {onOpenLatest && latestAssetId && latestAssetId !== assetId && (
              <Button
                onClick={onOpenLatest}
                className="h-9 shrink-0 text-[10px] uppercase font-bold tracking-wider bg-accent hover:opacity-90"
              >
                Open latest to edit
              </Button>
            )}
          </div>
        </div>
      )}

      {showVersionNotes && isLatestVersion && (
        <div className="shrink-0 px-4 sm:px-8 py-3 border-b border-border bg-amber-500/8 dark:bg-amber-400/8 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 block mb-1">
              Version notes (optional)
            </label>
            <input
              type="text"
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="e.g. Added kitchen layout option B"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-background text-primary placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowVersionNotes(false)} className="h-9 text-[10px] uppercase font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => runSave("version")}
              disabled={isSaving}
              className="h-9 text-[10px] uppercase font-bold bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white border-0"
            >
              Save Version
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 bg-muted/20 dark:bg-muted/10 relative overflow-hidden min-h-0">
        <Excalidraw
          key={editorInstanceKey}
          theme={appTheme}
          viewModeEnabled={showReadOnlyBanner}
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          initialData={excalidrawInitialData}
          UIOptions={{
            canvasActions: {
              toggleTheme: false,
              export: { saveFileToDisk: false },
              loadScene: false,
            },
          }}
        />
      </div>

      {showVersionPanel && assetId && (
        <SketchVersionPanel
          assetId={assetId}
          projectUid={projectUid}
          currentVersionId={assetId}
          currentVersionNumber={versionNumber}
          isViewingLatest={isLatestVersion}
          onClose={() => setShowVersionPanel(false)}
          onOpenVersion={onOpenVersion}
          onOpenLatest={onOpenLatest}
          onRestored={() => {
            onVersionRestored?.();
          }}
        />
      )}
    </div>
  );
};
