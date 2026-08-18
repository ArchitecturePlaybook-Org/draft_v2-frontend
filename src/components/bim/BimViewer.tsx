"use client";

import React, { useEffect, useRef, useState } from "react";
import { initEngine, load3DModel, cleanupModelMemory, setDynamicResolution } from "./engine/core/viewer";
import { setDisplayMode } from "./engine/tools/displayModes";
import { setSectionAxis, toggleSectionClipping } from "./engine/tools/section";

export interface BimViewerProps {
  url?: string;
  file?: File;
  fileName?: string;
  onClose?: () => void;
}

export default function BimViewer({ url, file, fileName, onClose }: BimViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Initializing OpenBIM Engine…");
  const [activeTab, setActiveTab] = useState<"tree" | "properties">("properties");
  const [displayMode, setDisplayModeState] = useState<"solid" | "wireframe" | "transparent">("solid");
  const [sectionAxis, setSectionAxisState] = useState<"none" | "x" | "y" | "z">("none");

  const name = fileName || file?.name || url?.split("/").pop() || "3D_Model.ifc";

  useEffect(() => {
    let isCancelled = false;

    async function setupViewer() {
      if (!containerRef.current) return;
      try {
        setLoading(true);
        setLoadingText("Initializing WebGL & ThatOpen Engine…");
        await initEngine(containerRef.current);

        if (isCancelled) return;

        let arrayBuffer: ArrayBuffer | null = null;
        if (file) {
          setLoadingText(`Reading ${file.name}…`);
          arrayBuffer = await file.arrayBuffer();
        } else if (url) {
          setLoadingText("Downloading 3D model buffer…");
          const targetUrl = url.startsWith("http") ? `/api/v1/proxy-asset?url=${encodeURIComponent(url)}` : url;
          const res = await fetch(targetUrl);
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          arrayBuffer = await res.arrayBuffer();
        }

        if (isCancelled || !arrayBuffer) return;

        setLoadingText(`Parsing ${name}…`);
        await load3DModel(arrayBuffer, name);

        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error("BimViewer initialization error:", err);
        setLoadingText(`Error: ${err.message || "Failed to load model"}`);
      }
    }

    setupViewer();

    return () => {
      isCancelled = true;
      cleanupModelMemory();
    };
  }, [url, file, name]);

  const handleDisplayMode = (mode: "solid" | "wireframe" | "transparent") => {
    setDisplayModeState(mode);
    setDisplayMode(mode);
  };

  const handleSectionAxis = (axis: "none" | "x" | "y" | "z") => {
    setSectionAxisState(axis);
    if (axis === "none") {
      toggleSectionClipping(false);
    } else {
      setSectionAxis(axis);
      toggleSectionClipping(true);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Glassmorphism Control Bar */}
      <div className="z-20 flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
            🏛️
          </div>
          <div>
            <h4 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">{name}</h4>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">OpenBIM 3D Model</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {/* Display Modes */}
          <div className="flex items-center bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => handleDisplayMode("solid")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${displayMode === "solid" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              Solid
            </button>
            <button
              onClick={() => handleDisplayMode("wireframe")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${displayMode === "wireframe" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              Wireframe
            </button>
            <button
              onClick={() => handleDisplayMode("transparent")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${displayMode === "transparent" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              X-Ray
            </button>
          </div>

          {/* Section Axis Slicing */}
          <div className="flex items-center bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 px-1.5">Section</span>
            <button
              onClick={() => handleSectionAxis("none")}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${sectionAxis === "none" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Off
            </button>
            <button
              onClick={() => handleSectionAxis("x")}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${sectionAxis === "x" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              X
            </button>
            <button
              onClick={() => handleSectionAxis("y")}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${sectionAxis === "y" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Y
            </button>
            <button
              onClick={() => handleSectionAxis("z")}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${sectionAxis === "z" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Z
            </button>
          </div>

          {/* Sidebar Drawer Toggle */}
          <div className="flex items-center bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab("properties")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${activeTab === "properties" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Inspector
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors ml-2"
              title="Close Viewer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main 3D Viewport & Inspector Side Drawer */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        <div ref={containerRef} className="w-full h-full relative" />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md text-center">
            <div className="w-12 h-12 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
            <p className="text-sm font-bold text-white tracking-wide">{loadingText}</p>
            <p className="text-xs text-slate-400 mt-1">Preparing high-density 3D BIM scene…</p>
          </div>
        )}

        {/* Inspector Side Drawer */}
        <div
          id="inspector-drawer"
          className="absolute top-4 right-4 z-20 w-80 max-h-[calc(100%-2rem)] bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 flex flex-col shadow-2xl overflow-hidden transition-all duration-300"
          style={{ display: "none" }}
        >
          <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800">
            <div>
              <h5 id="prop-element-name" className="font-bold text-xs text-white truncate max-w-[200px]">Selected Element</h5>
              <span id="prop-element-type" className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">IFC</span>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("inspector-drawer");
                if (el) el.style.display = "none";
              }}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <div id="prop-psets-container" className="flex-1 overflow-y-auto pr-1 custom-scrollbar" />
        </div>
      </div>
    </div>
  );
}
