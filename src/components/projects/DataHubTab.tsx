import React, { useState, useRef, useMemo } from "react";
import { ProjectAsset } from "@/types/projects";
import { useProjectStore } from "@/store/project-store";
import { projectsApi } from "@/domains/projects/api";
import { useInfiniteScrollBatch } from "@/hooks/useInfiniteScrollBatch";
import dynamic from "next/dynamic";
const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-surface-500 animate-pulse">Loading 3D Engine...</div>
});
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { RevisionHistoryModal } from "./RevisionHistoryModal";
import { FloorPlanGridViewer } from "./FloorPlanGridViewer";
import { Create3DModelModal } from "./Create3DModelModal";
import { CreateSketchModal } from "./CreateSketchModal";
import { convertPdfToJpegSheets, ExtractedPdfSheet } from "@/lib/pdf/pdfToJpeg";
import { PdfMultiSheetModal } from "./PdfMultiSheetModal";
import { motion, AnimatePresence } from "framer-motion";

export const DataHubTab: React.FC = () => {
  const { project, activeHubCategory, setActiveHubCategory, fetchProject } = useProjectStore();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [renamingAssetId, setRenamingAssetId] = useState<number | null>(null);
  const [newAssetTitle, setNewAssetTitle] = useState("");

  const [historyAsset, setHistoryAsset] = useState<ProjectAsset | null>(null);
  const [manageLinksAsset, setManageLinksAsset] = useState<ProjectAsset | null>(null);
  const [surveyAsset, setSurveyAsset] = useState<ProjectAsset | null>(null);
  const [viewerAsset, setViewerAsset] = useState<ProjectAsset | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isCreate3DModalOpen, setIsCreate3DModalOpen] = useState(false);
  const [isCreateSketchModalOpen, setIsCreateSketchModalOpen] = useState(false);

  // PDF Multi-Sheet Extractor Modal State
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pendingPdfFileName, setPendingPdfFileName] = useState("");
  const [extractedSheets, setExtractedSheets] = useState<ExtractedPdfSheet[]>([]);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);

  const handleUploadExtractedSheets = async (
    sheetsToUpload: { title: string; blob: Blob; filename: string }[]
  ) => {
    if (!project?.id) return;
    setIsUploading(true);
    setUploadProgress(`0 / ${sheetsToUpload.length}`);
    let successCount = 0;
    try {
      for (let i = 0; i < sheetsToUpload.length; i++) {
        const sheet = sheetsToUpload[i];
        const file = new File([sheet.blob], sheet.filename, { type: "image/jpeg" });
        await projectsApi.uploadProjectAsset(project.id, "2d_plan", file, sheet.title);
        successCount++;
        setUploadProgress(`${successCount} / ${sheetsToUpload.length}`);
      }
      setPdfModalOpen(false);
      setExtractedSheets([]);
      fetchProject(project.uid);
    } catch (err: any) {
      alert(`Upload failed on sheet ${successCount + 1}: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const filteredAssets = useMemo(() => {
    if (!project?.assets) return [];
    return project.assets.filter((a) =>
      activeHubCategory === "3d_model"
        ? a.category === "3d_model" || a.category === "sh3d"
        : a.category === activeHubCategory
    );
  }, [project?.assets, activeHubCategory]);

  const {
    visibleItems: visibleAssets,
    hasMore: hasMoreAssets,
    isLoadingMore: isLoadingMoreAssets,
    sentinelRef: assetsSentinelRef,
    totalCount: totalAssetCount,
    loadedCount: loadedAssetCount,
  } = useInfiniteScrollBatch(filteredAssets, { resetKey: activeHubCategory });

  if (!project) return null;

  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|avif)$/i.test(cleanUrl);
  };

  const handleOpenAsset = (asset: any) => {
    if (asset.category === "sketch") {
      window.open(
        `/dashboard/projects/${project.uid}/sketch?assetId=${asset.id}`,
        "_blank",
      );
    } else if (asset.category === "2d_plan") {
      setSurveyAsset(asset);
    } else if (asset.category === "3d_model") {
      setViewerAsset(asset);
    } else if (asset.category === "sh3d") {
      window.open(`/dashboard/projects/${project.uid}/editor?assetId=${asset.canonical_uid}${asset.size === 0 ? '&isNew=true' : ''}`, "_blank");
    } else {
      if (isImageUrl(asset.file)) {
        setLightboxImageUrl(asset.file);
      } else {
        window.open(asset.file, "_blank");
      }
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm("Are you sure you want to decommission this architectural asset?")) return;
    try {
      await projectsApi.deleteProjectAsset(assetId);
      fetchProject(project.uid);
    } catch (err) {
      alert("Failed to delete asset.");
      fetchProject(project.uid);
    }
  };

  const handleRenameAsset = async (assetId: number) => {
    if (!newAssetTitle) return;
    try {
      await projectsApi.updateProjectAsset(assetId, { title: newAssetTitle });
      setRenamingAssetId(null);
      setNewAssetTitle("");
      fetchProject(project.uid);
    } catch (err) {
      alert("Failed to rename asset.");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-8"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="col-span-1 md:sticky md:top-[25vh] self-start space-y-3 z-10"
        >
          {[
            { id: "sketch", label: "Creative Sketches", icon: "✏️" },
            { id: "2d_plan", label: "2D Floor Plans", icon: "📐" },
            { id: "3d_model", label: "3D Construction Models", icon: "🏛️" },
            { id: "document", label: "Documents", icon: "📄" },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveHubCategory(cat.id as any)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-extrabold text-[9px] uppercase tracking-wider transition-all duration-300 border ${activeHubCategory === cat.id
                  ? "bg-accent/10 text-accent shadow-sm border-accent/50 backdrop-blur-md"
                  : "bg-surface-50/50 backdrop-blur-sm border-surface-200/50 text-surface-400 hover:bg-surface-100 hover:text-primary"
                }`}
            >
              <span className="mr-2 text-sm">{cat.icon}</span> {cat.label}
            </button>
          ))}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="col-span-1 md:col-span-3"
        >
          <div className="bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-2xl border border-surface-200/80 dark:border-surface-800 p-3.5 sm:p-4 rounded-xl shadow-lg min-h-[300px]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 border-b border-surface-200/60 dark:border-surface-800 pb-2.5 min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider truncate min-w-0">
                {activeHubCategory.replace('_', ' ')} Assets
              </h3>
              <div className="flex flex-wrap gap-2 shrink-0">
                {activeHubCategory === "sketch" && (
                  <button
                    onClick={() => setIsCreateSketchModalOpen(true)}
                    className="px-3 py-1 bg-accent text-background font-black text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shadow-xs"
                  >
                    New Design Sketch
                  </button>
                )}
                {activeHubCategory === "3d_model" && (
                  <button
                    onClick={() => setIsCreate3DModalOpen(true)}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all duration-200 border border-emerald-500/30 flex items-center gap-1 shadow-xs"
                  >
                    <span>🏠</span> Create SH3D Model
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={
                    activeHubCategory === "3d_model"
                      ? ".obj,.stl,.fbx,.gltf,.glb"
                      : activeHubCategory === "2d_plan"
                        ? "image/png,image/jpeg,image/jpg,image/webp,.pdf,.dwg,.dxf"
                        : activeHubCategory === "document"
                          ? ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                          : "image/png,image/jpeg,image/jpg,image/webp,image/gif,.excalidraw,.json"
                  }
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length || !project.id) return;

                    // Handle 2D Floor Plan PDF Upload with PDF -> JPEG conversion & Naming Modal
                    if (activeHubCategory === "2d_plan") {
                      const pdfFile = files.find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
                      if (pdfFile) {
                        try {
                          setIsPdfProcessing(true);
                          const sheets = await convertPdfToJpegSheets(pdfFile);
                          setPendingPdfFileName(pdfFile.name);
                          setExtractedSheets(sheets);
                          setPdfModalOpen(true);
                        } catch (err: any) {
                          alert(`Failed to convert PDF pages to JPEG: ${err.message}`);
                        } finally {
                          setIsPdfProcessing(false);
                          e.target.value = "";
                        }
                        return;
                      }
                    }

                    setIsUploading(true);
                    setUploadProgress(`0 / ${files.length}`);
                    let successCount = 0;
                    try {
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const title = file.name.replace(/\.[^/.]+$/, "");
                        await projectsApi.uploadProjectAsset(project.id, activeHubCategory, file, title);
                        successCount++;
                        setUploadProgress(`${successCount} / ${files.length}`);
                      }
                      fetchProject(project.uid);
                    } catch (err: any) {
                      alert(`Upload failed on file ${successCount + 1}: ${err.message}`);
                    } finally {
                      setIsUploading(false);
                      setUploadProgress("");
                      e.target.value = "";
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isPdfProcessing}
                  className={`px-3 py-1 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all ${isUploading || isPdfProcessing
                      ? "bg-accent text-background shadow-xs animate-pulse"
                      : "bg-surface-200/70 hover:bg-accent hover:text-background text-foreground border border-surface-300/60"
                    } disabled:opacity-80`}
                >
                  {isPdfProcessing ? "Converting PDF..." : isUploading ? `Uploading ${uploadProgress}...` : "Upload File"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredAssets.length ? (
                visibleAssets.map((asset, idx) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={asset.id}
                    className="p-3 rounded-xl transition-all duration-300 bg-surface-card border border-surface-200/80 dark:border-surface-800 hover:border-accent/60 hover:-translate-y-1 hover:shadow-md group relative flex flex-col justify-between"
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${asset.is_latest
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-surface-100 text-surface-400"
                        }`}>
                        V{asset.version_number}
                      </span>
                    </div>

                    {asset.category === "2d_plan" && asset.drawing_tag && asset.drawing_tag !== "none" && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm ${asset.drawing_tag === "gfc"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 shadow-blue-500/5"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25 shadow-purple-500/5"
                          }`} title={asset.drawing_tag === "gfc" ? "Good For Construction" : "As Built Drawing"}>
                          {asset.drawing_tag.toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div
                      onClick={() => handleOpenAsset(asset)}
                      className={`h-24 sm:h-26 rounded-lg mb-2 flex items-center justify-center overflow-hidden border cursor-pointer transition-colors ${['3d_model', 'sh3d'].includes(asset.category) ? 'border-transparent bg-opacity-50 ' + (asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'bg-emerald-50 dark:bg-emerald-900/20' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'bg-amber-50 dark:bg-amber-900/20' : asset.file?.toLowerCase().endsWith('obj') ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-indigo-50') : 'bg-surface-100/50 border-surface-200/50'}`}
                    >
                      {['3d_model', 'sh3d'].includes(asset.category) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-105">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl mb-1 shadow-inner ${asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 dark:border-emerald-800/30' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'bg-amber-100 text-amber-600 border border-amber-200 dark:border-amber-800/30' : asset.file?.toLowerCase().endsWith('obj') ? 'bg-blue-100 text-blue-600 border border-blue-200 dark:border-blue-800/30' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
                            🧊
                          </div>
                          <span className={`text-[8px] font-black tracking-wider ${asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'text-emerald-700' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'text-amber-700' : asset.file?.toLowerCase().endsWith('obj') ? 'text-blue-700' : 'text-indigo-700'}`}>
                            {asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'SH3D' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'GLB' : asset.file?.toLowerCase().endsWith('obj') ? 'OBJ' : '3D'}
                          </span>
                        </div>
                      ) : (asset.file?.toLowerCase().endsWith('.dwg') || asset.file?.toLowerCase().endsWith('.dxf') || asset.title?.toLowerCase().includes('dwg')) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-amber-500/5 dark:bg-amber-500/10">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xl mb-1 shadow-xs">
                            📐
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            DWG CAD
                          </span>
                        </div>
                      ) : asset.thumbnail ? (
                        <img src={asset.thumbnail} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : isImageUrl(asset.file) ? (
                        <img src={asset.file} loading="lazy" decoding="async" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      ) : asset.category === "sketch" ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-3xl">✏️</span>
                          <span className="text-[7px] font-bold text-accent uppercase tracking-widest">Design</span>
                        </div>
                      ) : (
                        <span className="text-3xl opacity-20">{activeHubCategory === '2d_plan' ? '📐' : '📄'}</span>
                      )}
                    </div>

                    {renamingAssetId === asset.id ? (
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={newAssetTitle}
                          onChange={(e) => setNewAssetTitle(e.target.value)}
                          autoFocus
                          className="flex-1 bg-surface-100 border border-surface-200 rounded px-2 py-0.5 text-xs font-bold outline-none focus:border-accent"
                        />
                        <button onClick={() => handleRenameAsset(asset.id)} className="text-emerald-500 text-[10px] font-bold">Save</button>
                        <button onClick={() => setRenamingAssetId(null)} className="text-surface-400 text-[10px] font-bold">✕</button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-1" onClick={() => handleOpenAsset(asset)}>
                            <p className="font-bold text-xs truncate text-foreground cursor-pointer hover:text-accent transition-colors">{asset.title}</p>
                            <p className="text-[9px] text-text-secondary font-semibold uppercase tracking-wider mt-0.5">{(asset.size / 1024).toFixed(1)} KB</p>
                          </div>

                          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setHistoryAsset(asset); }}
                              className="w-5.5 h-5.5 flex items-center justify-center rounded hover:bg-surface-200 text-[10px]"
                              title="Revision History"
                            >
                              🕐
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRenamingAssetId(asset.id); setNewAssetTitle(asset.title); }}
                              className="w-5.5 h-5.5 flex items-center justify-center rounded hover:bg-surface-200 text-[10px]"
                              title="Rename"
                            >
                              📝
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                              className="w-5.5 h-5.5 flex items-center justify-center rounded hover:bg-red-500/10 hover:text-red-500 text-[10px]"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {asset.category === "sh3d" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAsset(asset); }}
                            className="mt-2 w-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md px-2 py-1 uppercase tracking-wider hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1"
                          >
                            <span>✏️</span> Open in Editor
                          </button>
                        )}

                        {(activeHubCategory === "2d_plan" || activeHubCategory === "3d_model") && (
                          <div className="mt-2 pt-2 border-t border-surface-200/50">
                            {(() => {
                              const linkedTasksCount = project.tasks.filter(t => t.asset_links?.some(l => String(l.canonical_uid) === String(asset.canonical_uid))).length;
                              return (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setManageLinksAsset(asset); }}
                                  className="w-full text-xs font-bold bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 outline-none hover:border-accent text-primary transition-colors flex justify-between items-center cursor-pointer"
                                >
                                  <span className="text-[9px] uppercase tracking-widest text-surface-500 text-surface-400">Linked Tasks</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${linkedTasksCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-500 text-surface-400'}`}>
                                    {linkedTasksCount}
                                  </span>
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-24 text-center flex flex-col items-center justify-center bg-surface-50/20 dark:bg-surface-900/20 backdrop-blur-sm rounded-[2.5rem] border border-surface-200/50 dark:border-white/5 shadow-inner">
                  <div className="w-20 h-20 bg-surface-200/50 dark:bg-surface-800/50 rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl border border-surface-300/50 dark:border-white/10">📁</div>
                  <h3 className="text-xl font-black text-primary tracking-tight mb-2">No Assets Uploaded</h3>
                  <p className="text-xs font-bold text-surface-400 max-w-sm leading-relaxed">This hub is currently empty. Upload your first architectural document, 3D model, or floor plan to get started.</p>
                </div>
              )}
            </div>

            {filteredAssets.length > 0 && (
              <div ref={assetsSentinelRef} className="col-span-full flex flex-col items-center justify-center py-6 gap-2">
                {isLoadingMoreAssets && (
                  <div className="flex items-center gap-2 text-xs font-bold text-surface-400">
                    <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    Loading more assets...
                  </div>
                )}
                {!hasMoreAssets && loadedAssetCount > 15 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
                    All {totalAssetCount} assets loaded
                  </p>
                )}
                {hasMoreAssets && !isLoadingMoreAssets && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
                    Showing {loadedAssetCount} of {totalAssetCount} — scroll for more
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {historyAsset && (
        <RevisionHistoryModal
          asset={historyAsset}
          onClose={() => setHistoryAsset(null)}
          onRevisionUploaded={() => { fetchProject(project.uid); setHistoryAsset(null); }}
          onVersionPromoted={() => { fetchProject(project.uid); setHistoryAsset(null); }}
        />
      )}
      {surveyAsset && (
        <FloorPlanGridViewer
          asset={surveyAsset}
          onClose={() => setSurveyAsset(null)}
          onRefresh={() => fetchProject(project.uid)}
        />
      )}
      {viewerAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-surface-50/80 backdrop-blur-3xl border border-white/10 w-full max-w-6xl h-[80vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative scale-in-center">
            <button
              onClick={() => setViewerAsset(null)}
              className="absolute top-6 right-6 z-10 w-12 h-12 bg-surface-200/50 hover:bg-red-500 hover:text-white backdrop-blur-md border border-surface-300/50 rounded-full flex items-center justify-center text-lg shadow-lg transition-all duration-300 text-surface-900 font-bold"
            >
              ✕
            </button>
            <div className="flex-1 w-full h-full bg-slate-50/50">
              <ModelViewer
                url={viewerAsset.file}
                format={viewerAsset.file?.toLowerCase().includes('.obj') ? 'obj' : viewerAsset.file?.toLowerCase().includes('.sh3d') ? 'sh3d' : 'glb'}
              />
            </div>
          </div>
        </div>
      )}
      {lightboxImageUrl && (
        <ImageLightbox
          imageUrl={lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
        />
      )}
      {manageLinksAsset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-surface-50/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden border border-white/10 flex flex-col max-h-[85vh] scale-in-center">
            <div className="p-8 border-b border-surface-200/50 bg-surface-100/30 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-primary tracking-tight">Manage Task Links</h3>
                <p className="text-[10px] uppercase tracking-widest font-bold text-surface-400 mt-1 truncate max-w-[250px]">{manageLinksAsset.title}</p>
              </div>
              <button onClick={() => setManageLinksAsset(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-200/50 backdrop-blur-md border border-surface-300/50 text-surface-500 hover:bg-red-500 hover:text-white transition-all shadow-sm text-lg">✕</button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {project.tasks.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center bg-surface-100/30 dark:bg-surface-800/30 rounded-3xl border border-surface-200/50 dark:border-white/5 m-4">
                  <div className="w-16 h-16 bg-surface-200/50 dark:bg-surface-700/50 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner border border-surface-300/50 dark:border-white/10">📋</div>
                  <div className="text-primary font-black tracking-tight text-lg mb-1">No Tasks Available</div>
                  <div className="text-surface-400 text-[10px] uppercase tracking-widest font-bold">Create tasks to link them to this asset.</div>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {project.tasks.map(task => {
                    const link = task.asset_links?.find(l => String(l.canonical_uid) === String(manageLinksAsset.canonical_uid));
                    const isLinked = !!link;

                    return (
                      <div key={task.uid} className="flex justify-between items-center p-4 rounded-xl bg-surface-100/50 hover:bg-surface-200/50 border border-surface-200/50 hover:border-surface-300 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-primary">{task.title}</p>
                          <p className="text-[10px] uppercase tracking-widest text-surface-400 font-bold">{task.status}</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              if (isLinked) {
                                await projectsApi.unlinkAssetFromTask(link.id);
                              } else {
                                await projectsApi.linkAssetToTask(task.uid, manageLinksAsset.canonical_uid);
                              }
                              fetchProject(project.uid);
                            } catch (err) {
                              alert("Failed to toggle link.");
                            }
                          }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${isLinked ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-surface-200/50 text-surface-400 hover:bg-accent hover:text-white hover:shadow-[0_0_15px_var(--accent-glow)]'}`}
                        >
                          {isLinked ? '✓' : '+'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isCreate3DModalOpen && (
        <Create3DModelModal
          isOpen={isCreate3DModalOpen}
          onClose={() => setIsCreate3DModalOpen(false)}
          projectUid={project.uid}
          onSuccess={() => fetchProject(project.uid)}
        />
      )}
      {isCreateSketchModalOpen && (
        <CreateSketchModal
          isOpen={isCreateSketchModalOpen}
          onClose={() => setIsCreateSketchModalOpen(false)}
          projectUid={project.uid}
          onSuccess={() => fetchProject(project.uid)}
        />
      )}
      {pdfModalOpen && (
        <PdfMultiSheetModal
          isOpen={pdfModalOpen}
          pdfFileName={pendingPdfFileName}
          initialSheets={extractedSheets}
          isUploading={isUploading}
          onClose={() => {
            setPdfModalOpen(false);
            setExtractedSheets([]);
          }}
          onConfirmUpload={handleUploadExtractedSheets}
        />
      )}
    </>
  );
};
