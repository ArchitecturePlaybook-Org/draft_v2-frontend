"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import "@/components/bim/bim-viewer.css";
import { projectsApi } from "@/domains/projects/api";
import { initEngine, load3DModel, cleanupModelMemory, destroyEngine } from "@/components/bim/engine/core/viewer";
import { initThemeController } from "@/components/bim/engine/ui/theme";
import { setupUIListeners } from "@/components/bim/engine/ui/toolbar";
import { resolveAssetFileUrl } from "@/lib/resolveAssetFileUrl";
import { getCachedModelBuffer, saveModelBufferToCache } from "@/components/bim/engine/cache/idbCache";

export default function BimViewerPageClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = (params?.id as string) || "";
  const assetId = searchParams?.get("assetId") || null;

  const viewerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [assetName, setAssetName] = useState("3D Construction Model");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initPageViewer() {
      try {
        const viewerContainer = viewerRef.current;
        if (!viewerContainer) return;

        // 1. Boot Three.js & ThatOpen Engine
        await initEngine(viewerContainer);
        initThemeController();
        setupUIListeners();

        if (isCancelled) return;

        // 2. Fetch Asset if assetId provided (with IndexedDB instant cache check)
        if (assetId) {
          try {
            const asset = await projectsApi.getProjectAssetDetails(Number(assetId));
            const fileUrl = asset?.file || asset?.file_url || asset?.url;
            if (asset && fileUrl) {
              setAssetName(asset.title || asset.name || "3D Model");
              const rawFileName = fileUrl.split("?")[0].split("/").pop() || "Model.ifc";
              const fileNameToUse = rawFileName.includes(".") ? rawFileName : `${asset.title || "Model"}.ifc`;

              // Step A: Check local IndexedDB cache first
              let buffer = await getCachedModelBuffer(assetId);

              if (buffer) {
                console.log(`[BIM Engine] Instant load from IndexedDB cache for asset #${assetId}`);
              } else {
                // Step B: Download over HTTP if cache miss
                const proxyUrl = resolveAssetFileUrl(fileUrl);
                const res = await fetch(proxyUrl);
                if (res.ok) {
                  buffer = await res.arrayBuffer();
                  // Save buffer to browser IndexedDB in background
                  saveModelBufferToCache(assetId, buffer).catch((e) =>
                    console.warn("Failed to cache buffer in IndexedDB:", e)
                  );
                } else {
                  console.error("Failed to fetch 3D model asset:", res.status, res.statusText);
                }
              }

              if (buffer && !isCancelled) {
                await load3DModel(buffer, fileNameToUse);
              }
            }
          } catch (err) {
            console.warn("Failed to load asset file by ID, viewer ready for upload:", err);
          }
        }
      } catch (err: any) {
        console.error("Failed to initialize BIM Viewer page:", err);
        setError(err.message || "Failed to initialize 3D viewer");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    initPageViewer();

    return () => {
      isCancelled = true;
      destroyEngine();
    };
  }, [assetId]);

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen overflow-hidden" style={{ background: "#f0eff4" }}>
      {/* 3D Viewport */}
      <div id="viewer-container" ref={viewerRef} className="fixed inset-0 w-full h-full z-0" />

      {/* Upload Panel (Glassmorphism overlay) */}
      <div id="upload-panel" className="upload-panel" style={{ display: assetId ? "none" : "flex" }}>
        <div className="panel-inner">
          <div className="brand">
            <svg className="brand-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="14" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
              <rect x="10" y="6" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.85" />
              <rect x="18" y="14" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            <h1 className="brand-title">BIM Viewer</h1>
          </div>
          <p className="brand-subtitle">Upload a BIM or 3D mesh model to explore in 3D</p>

          <label htmlFor="ifc-file-input" className="upload-btn" id="upload-label">
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Choose 3D Model</span>
          </label>
          <input type="file" id="ifc-file-input" accept=".ifc,.glb,.gltf,.obj,.stl,.fbx,.dae,.ply,.skp,.sh3d,.sh3x,.zip" hidden />

          <button id="btn-load-sample" className="upload-btn" style={{ background: "rgba(99, 102, 241, 0.18)", border: "1px solid rgba(99, 102, 241, 0.35)", color: "#a5b4fc", marginTop: "4px" }} title="Load Sample BIM Model">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>⚡ Load Demo Model</span>
          </button>
          <p className="file-hint">Supports IFC, GLB/glTF, OBJ, STL, FBX, DAE, PLY, and SKP formats</p>
        </div>
      </div>

      {/* Loading Overlay */}
      <div id="loading-overlay" className="loading-overlay" style={{ display: loading ? "flex" : "none" }}>
        <div className="loading-content">
          <div className="spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text" id="loading-text">Initializing engine…</p>
          <div className="progress-bar-container">
            <div className="progress-bar" id="progress-bar"></div>
          </div>
          <p className="loading-percent" id="loading-percent">0%</p>
        </div>
      </div>

      {/* Compact Material Card (added for full feature parity with BIM project) */}
      <div id="compact-material-card" className="compact-material-card" style={{ display: "none" }}>
        <div className="mat-card-header" id="material-card-handle">
          <div className="mat-card-title-group">
            <span id="mat-card-category" className="prop-type-badge">Category</span>
            <h4 id="mat-card-name">Element Name</h4>
          </div>
          <button id="btn-mat-card-close" className="mat-card-close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="mat-card-body">
          <div className="mat-metric-grid">
            <div className="mat-metric">
              <span className="mat-metric-label">Dimensions</span>
              <span id="mat-metric-dimensions" className="mat-metric-val">N/A</span>
            </div>
            <div className="mat-metric">
              <span className="mat-metric-label">Material</span>
              <span id="mat-metric-material" className="mat-metric-val">N/A</span>
            </div>
            <div className="mat-metric">
              <span className="mat-metric-label">Elevation</span>
              <span id="mat-metric-elevation" className="mat-metric-val">N/A</span>
            </div>
            <div className="mat-metric">
              <span className="mat-metric-label">GUID</span>
              <span id="mat-metric-guid" className="mat-metric-val" style={{ fontSize: "0.65rem", fontFamily: "monospace" }}>N/A</span>
            </div>
          </div>
        </div>
        <div className="mat-card-footer">
          <button id="btn-mat-isolate" className="mat-action-btn">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 9 2 12 7 15"></polyline><polyline points="17 9 22 12 17 15"></polyline></svg>
            Isolate
          </button>
          <button id="btn-mat-measure-clearance" className="mat-action-btn">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Clearance
          </button>
        </div>
      </div>

      {/* Main Application UI */}
      <div id="app-ui" className="app-ui" style={{ display: "none" }}>
        <div id="sheet-backdrop" className="sheet-backdrop"></div>
        <div id="tool-hint" className="tool-hint" style={{ display: "none" }}></div>

        {/* Right Sidebar (BIM Model Explorer & Inspector) */}
        <div id="right-sidebar" className="sidebar bim-tree-sidebar visible">
          <div className="mobile-sheet-handle-bar" id="sheet-handle-bar">
            <div className="sheet-drag-pill"></div>
          </div>

          <div id="mobile-peek-card" className="mobile-peek-card" style={{ display: "none" }}>
            <div className="peek-summary-wrap">
              <span id="peek-element-type" className="prop-type-badge">IfcWall</span>
              <span id="peek-element-name" className="peek-title">Wall #12345</span>
            </div>
            <div className="peek-actions">
              <button id="btn-peek-details" className="peek-action-btn peek-primary" title="Inspect Properties">
                <span>Details</span>
              </button>
            </div>
          </div>

          <div className="tree-title-bar">
            <div className="tree-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="3" width="6" height="6"></rect>
                <rect x="3" y="15" width="6" height="6"></rect>
                <rect x="15" y="15" width="6" height="6"></rect>
                <path d="M12 9v3m-6 3v-3h12v3"></path>
              </svg>
              <span>BIM Tree</span>
            </div>
            <button
              id="btn-close-sidebar"
              className="tree-close-btn"
              title="Close BIM Tree"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rightSidebar = document.getElementById("right-sidebar") || document.getElementById("sidebar-right");
                if (rightSidebar) {
                  rightSidebar.classList.remove("visible");
                  rightSidebar.classList.add("sheet-closed");
                  rightSidebar.style.setProperty("display", "none", "important");
                }
              }}
            >
              &times;
            </button>
          </div>

          {/* 5 Tab Switcher Pills */}
          <div className="sidebar-header tree-tabs">
            <button className="tab-btn" data-tab="tab-models" title="Loaded Models">
              <span>Models</span>
            </button>
            <button className="tab-btn" data-tab="tab-objects" title="Objects Containment Tree">
              <span>Objects</span>
            </button>
            <button className="tab-btn" data-tab="tab-classes" title="IFC Entity Classes">
              <span>Classes</span>
            </button>
            <button className="tab-btn active" data-tab="tab-storeys" title="Building Storeys">
              <span>Storeys</span>
            </button>
            <button className="tab-btn" data-tab="tab-views" id="tab-btn-views" title="Saved Views, Sections & Measurements">
              <span>Views</span>
            </button>
          </div>

          <div className="explorer-control-bar">
            <div className="tree-search-bar">
              <input type="text" id="explorer-search-input" placeholder="Search tree..." autoComplete="off" />
              <button id="explorer-search-clear" className="tree-search-clear" style={{ display: "none" }}>&times;</button>
            </div>
            <button className="tree-tool-btn" id="btn-batch-toggle-all" title="Toggle Tree Connection">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle></svg>
            </button>
          </div>

          <div className="sidebar-content">
            <div id="tab-models" className="tab-content">
              <div id="tree-models" className="bim-tree"><div className="empty-state"><p>No models loaded.</p></div></div>
            </div>
            <div id="tab-objects" className="tab-content">
              <div id="tree-objects" className="bim-tree"><div className="empty-state"><p>Loading objects hierarchy...</p></div></div>
            </div>
            <div id="tab-classes" className="tab-content">
              <div id="tree-classes" className="bim-tree"><div className="empty-state"><p>Loading IFC classes...</p></div></div>
            </div>
            <div id="tab-storeys" className="tab-content active">
              <div id="tree-storeys" className="bim-tree"><div className="empty-state"><p>Loading building storeys...</p></div></div>
            </div>
            <div id="tab-views" className="tab-content">
              <div className="views-tab-controls">
                <button id="btn-create-saved-view" className="views-primary-btn">
                  <span>+ Save Current View</span>
                </button>
              </div>
              <div id="saved-views-list" className="saved-views-list">
                <div className="empty-state"><p>No saved views yet.</p></div>
              </div>
            </div>
          </div>

          {/* Properties Inspector Panel */}
          <div id="inspector-drawer" className="inspector-drawer" style={{ display: "none" }}>
            <div className="inspector-header">
              <div className="inspector-title">
                <span>Properties</span>
              </div>
              <div className="inspector-header-actions">
                <button id="btn-close-inspector" className="inspector-close-btn">&times;</button>
              </div>
            </div>
            <div className="inspector-search-bar">
              <input type="text" id="prop-search-input" placeholder="Filter properties..." autoComplete="off" />
            </div>
            <div className="inspector-body">
              <div className="prop-breadcrumbs" id="prop-breadcrumbs"></div>
              <div className="prop-header-card">
                <h3 id="prop-element-name" className="prop-title">Element Name</h3>
                <span id="prop-element-type" className="prop-type-badge">IfcType</span>
              </div>
              <div id="prop-psets-container" className="prop-psets-container"></div>
              <div className="prop-raw" id="prop-raw-data"></div>
            </div>
          </div>
        </div>

        {/* Measurement Suite Controls */}
        <div id="measure-control-card" className="measure-control-card" style={{ display: "none" }}>
          <div className="measure-card-header">
            <div className="measure-card-title">
              <span>Measure Mode</span>
            </div>
            <div className="measure-modes">
              <button id="btn-measure-mode-distance" className="measure-mode-btn active">Distance</button>
              <button id="btn-measure-mode-angle" className="measure-mode-btn">Angle</button>
              <button id="btn-measure-mode-area" className="measure-mode-btn">Area</button>
            </div>
          </div>

          {/* 3D Snap Filters */}
          <div className="snap-filters-row">
            <span className="snap-filter-label">Snap:</span>
            <button id="snap-filter-vertex" className="snap-pill-btn active">Vertex</button>
            <button id="snap-filter-midpoint" className="snap-pill-btn active">Midpoint</button>
            <button id="snap-filter-edge" className="snap-pill-btn active">Edge</button>
            <button id="snap-filter-surface" className="snap-pill-btn active">Surface</button>
          </div>

          {/* Measurement Units & Clear Actions */}
          <div className="measure-unit-row">
            <label className="snap-filter-label">Unit:</label>
            <select id="measure-unit-select" className="measure-unit-select">
              <option value="m">Meters (m)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="mm">Millimeters (mm)</option>
              <option value="ft">Feet (ft)</option>
              <option value="in">Inches (in)</option>
              <option value="ft-in">Feet-Inches (ft-in)</option>
            </select>
            <button id="tool-delete-measurements" className="clear-measure-btn" style={{ display: "none" }} title="Clear All Measurements">
              Clear All
            </button>
          </div>
        </div>

        {/* Section Cut Suite Card */}
        <div id="section-control-card" className="section-control-card" style={{ display: "none" }}>
          <div className="sec-card-header">
            <div className="sec-card-title">
              <span>Section Cut</span>
            </div>
            <button id="btn-sec-close-card" className="sec-card-close">&times;</button>
          </div>
          <div className="sec-preset-group">
            <button id="btn-sec-preset-y" className="sec-preset-btn active">Floor (Y)</button>
            <button id="btn-sec-preset-z" className="sec-preset-btn">Front (Z)</button>
            <button id="btn-sec-preset-x" className="sec-preset-btn">Side (X)</button>
          </div>
          <div className="sec-slider-row">
            <label className="sec-row-label">Offset:</label>
            <input type="range" id="sec-offset-slider" className="sec-slider" min="-50" max="50" step="0.1" defaultValue="0" />
            <span id="sec-offset-val" className="sec-slider-val">0.0m</span>
          </div>
        </div>

        {/* Unified Top Toolbar */}
        <div id="main-toolbar" className="toolbar top-unified-toolbar visible">
          <div className="toolbar-group">
            <button className="tool-btn active" id="tool-select" title="Select (Esc)">
              <span>Select</span>
            </button>
            <button className="tool-btn" id="tool-measure" title="Measure (M)">
              <span>Measure</span>
            </button>
            <button className="tool-btn" id="tool-clip" title="Section (C)">
              <span>Section</span>
            </button>
          </div>

          <div className="tool-divider-v"></div>

          <div className="toolbar-group">
            <button className="tool-btn" id="tool-isolate" title="Isolate">
              <span>Isolate</span>
            </button>
            <button className="tool-btn" id="tool-hide" title="Hide">
              <span>Hide</span>
            </button>
            <button className="tool-btn" id="tool-show-all" title="Show All">
              <span>Show All</span>
            </button>
          </div>

          <div className="tool-divider-v"></div>

          <div className="toolbar-group">
            <button className="view-btn active-view" id="btn-view-iso">Iso</button>
            <button className="view-btn" id="btn-view-top">Top</button>
            <button className="view-btn" id="btn-view-front">Front</button>
            <button className="view-btn" id="btn-view-right">Right</button>
          </div>

          <div className="tool-divider-v"></div>

          <div className="toolbar-group">
            <button className="view-btn" id="btn-fit">Fit</button>
            <button className="view-btn icon-only" id="btn-theme-toggle" title="Switch Theme">
              <span>☀️</span>
            </button>
            <button
              onClick={() => {
                if (window.history.length <= 2) {
                  window.close();
                }
                // Fallback if window.close doesn't close the tab
                setTimeout(() => {
                  router.push(`/dashboard/projects/${projectId}`);
                }, 100);
              }}
              className="view-btn"
              style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.4)" }}
            >
              ✕ Exit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
