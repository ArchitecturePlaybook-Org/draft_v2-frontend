import React, { useState, useRef, useMemo } from "react";
import { ProjectAsset, Task } from "@/types/projects";
import { useProjectStore } from "@/store/project-store";
import { projectsApi } from "@/domains/projects/api";
import { useInfiniteScrollBatch } from "@/hooks/useInfiniteScrollBatch";
import dynamic from "next/dynamic";
import { SkeletonGrid, SkeletonCard } from "@/components/ui/Skeleton";
const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => <SkeletonCard className="h-64" />
});
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { RevisionHistoryModal } from "./RevisionHistoryModal";
import { FloorPlanGridViewer } from "./FloorPlanGridViewer";
import { Create3DModelModal } from "./Create3DModelModal";
import { CreateSketchModal } from "./CreateSketchModal";
import { convertPdfToJpegSheets, ExtractedPdfSheet } from "@/lib/pdf/pdfToJpeg";
import { PdfMultiSheetModal } from "./PdfMultiSheetModal";
import { motion, AnimatePresence } from "framer-motion";

import { DrawingMarkup } from "@/types/projects";
import { DrawingRevisionCloudModal } from "./DrawingRevisionCloudModal";
import { ContractorRevisionReviewModal } from "./ContractorRevisionReviewModal";
import { Bell, MapPin, X, ExternalLink, Cloud, Search } from "lucide-react";
import { toast } from "sonner";

export const DataHubTab: React.FC = () => {
  const { project, activeHubCategory, setActiveHubCategory, fetchProject, toggleTaskAssetLink } = useProjectStore();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [renamingAssetId, setRenamingAssetId] = useState<number | null>(null);
  const [newAssetTitle, setNewAssetTitle] = useState("");

  const [historyAsset, setHistoryAsset] = useState<ProjectAsset | null>(null);
  const [manageLinksAsset, setManageLinksAsset] = useState<ProjectAsset | null>(null);
  const [togglingTaskUids, setTogglingTaskUids] = useState<Record<string, boolean>>({});
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalFilterTab, setModalFilterTab] = useState<"all" | "active" | "inactive">("all");
  const [reallocateTarget, setReallocateTarget] = useState<{ task: any; existingLink: any } | null>(null);
  const [surveyAsset, setSurveyAsset] = useState<ProjectAsset | null>(null);
  const [cloudModalAsset, setCloudModalAsset] = useState<ProjectAsset | null>(null);
  const [viewerAsset, setViewerAsset] = useState<ProjectAsset | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isCreate3DModalOpen, setIsCreate3DModalOpen] = useState(false);
  const [isCreateSketchModalOpen, setIsCreateSketchModalOpen] = useState(false);

  // Drawing Markups & Contractor Revision Notifications State
  const [markups, setMarkups] = useState<DrawingMarkup[]>([]);
  const [showContractorMarkupsModal, setShowContractorMarkupsModal] = useState(false);

  React.useEffect(() => {
    if (project?.uid) {
      projectsApi.getDrawingMarkups({ project_uid: project.uid }).then(data => setMarkups(data || [])).catch(() => {});
    }
  }, [project?.uid]);

  const openMarkups = useMemo(() => markups.filter(m => m.status === "OPEN"), [markups]);

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
      window.open(`/dashboard/projects/${project.uid}/bim-viewer?assetId=${asset.id}`, "_blank");
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
      {/* Contractor Revisions Notification Banner */}
      {openMarkups.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-background font-black shrink-0 flex items-center justify-center">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {openMarkups.length} Contractor Revision Request{openMarkups.length > 1 ? "s" : ""} Pinned on 2D Blueprints
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-background font-black text-[10px] uppercase tracking-wider">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-surface-600 dark:text-surface-300 font-medium mt-0.5">
                Contractors have submitted drawing markups, change notes, and blueprint revision clouds on project tasks.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowContractorMarkupsModal(true)}
            className="px-4 py-2 bg-amber-500 text-background font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shrink-0 shadow-xs flex items-center gap-2"
          >
            <Cloud className="w-4 h-4" />
            <span>View Contractor Revisions ({openMarkups.length})</span>
          </button>
        </div>
      )}

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
                      ? ".ifc,.glb,.gltf,.obj,.stl,.fbx,.dae,.ply,.skp,.sh3d,.sh3x,.zip"
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
                        asset.thumbnail ? (
                          <img src={asset.thumbnail} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-amber-500/5 dark:bg-amber-500/10">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xl mb-1 shadow-xs">
                              📐
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              400 DPI CAD PNG
                            </span>
                          </div>
                        )
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

                        {asset.category === "3d_model" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAsset(asset); }}
                            className="mt-2 w-full text-[9px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md px-2 py-1 uppercase tracking-wider hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-1"
                          >
                            <span>🏛️</span> Open in 3D BIM Viewer ↗
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
                  <SkeletonGrid count={3} columns="grid-cols-1 md:grid-cols-3" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-16 sm:pt-20 bg-surface-900/60 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-surface-50/80 backdrop-blur-3xl border border-white/10 w-full max-w-6xl h-[85vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative scale-in-center">
            <button
              onClick={() => setViewerAsset(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-slate-900/80 hover:bg-red-600 hover:text-white backdrop-blur-md border border-slate-700/50 rounded-full flex items-center justify-center text-sm shadow-lg transition-all duration-300 text-white font-bold"
            >
              ✕
            </button>
            <div className="flex-1 w-full h-full bg-slate-950">
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
          <div className="bg-surface-50/90 dark:bg-[#0b0f19]/95 backdrop-blur-3xl rounded-3xl border border-surface-200/50 dark:border-white/10 flex flex-col max-h-[80vh] max-w-md w-full shadow-2xl scale-in-center animate-out fade-out duration-200">
            <div className="p-5 border-b border-surface-200/40 dark:border-white/5 bg-surface-100/30 dark:bg-white/[0.01] flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-primary dark:text-white/90 tracking-tight">Manage Task Links</h3>
                <p className="text-[10px] uppercase tracking-widest font-bold text-surface-400 dark:text-white/40 mt-1 truncate max-w-[200px]">{manageLinksAsset.title}</p>
              </div>
              <button 
                onClick={() => {
                  setManageLinksAsset(null);
                  setModalSearchTerm("");
                  setModalFilterTab("all");
                  setReallocateTarget(null);
                }} 
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-200/50 dark:bg-white/5 text-surface-500 hover:bg-red-500 hover:text-white transition-all shadow-xs text-sm"
              >
                ✕
              </button>
            </div>

            {(() => {
              // 1. Gather ONLY main tasks
              const tasksList: Task[] = project.tasks || [];

              // 2. Map and filter tasks based on link status & search
              const mappedTasks = tasksList.map(task => {
                const is3d = manageLinksAsset.category === "3d_model" || manageLinksAsset.category === "sh3d";
                const link = task.asset_links?.find((l: any) => String(l.canonical_uid) === String(manageLinksAsset.canonical_uid));
                const isLinked = !!link;

                // Lock Condition A: Already linked to another task (can be re-allocated)
                const existingLink = (is3d && !isLinked && manageLinksAsset.linked_tasks && manageLinksAsset.linked_tasks.length > 0)
                  ? manageLinksAsset.linked_tasks[0]
                  : null;
                const isLockedByOtherTask = !!existingLink;

                // Lock Condition B: Task already has another 3D model linked
                const isTaskLockedByOther3D = is3d && !isLinked && task.asset_links?.some((l: any) => 
                  (l.latest_asset?.category === "3d_model" || l.latest_asset?.category === "sh3d") && 
                  String(l.canonical_uid) !== String(manageLinksAsset.canonical_uid)
                );

                return {
                  task,
                  link,
                  isLinked,
                  isLockedByOtherTask,
                  isTaskLockedByOther3D,
                  existingLink
                };
              });

              const filteredTasks = mappedTasks.filter(item => {
                // Search filter
                if (modalSearchTerm.trim() && !item.task.title.toLowerCase().includes(modalSearchTerm.toLowerCase())) {
                  return false;
                }

                // Link status filter (All, Linked, Unlinked)
                if (modalFilterTab === "active" && !item.isLinked) return false;
                if (modalFilterTab === "inactive" && item.isLinked) return false;

                return true;
              });

              return (
                <>
                  {/* Search and Filters */}
                  <div className="px-5 pb-3.5 pt-2.5 border-b border-surface-200/40 dark:border-white/5 bg-surface-100/10 dark:bg-white/[0.005] space-y-2.5 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={modalSearchTerm}
                        onChange={e => setModalSearchTerm(e.target.value)}
                        className="w-full bg-surface-50 dark:bg-[#121824] border border-surface-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-primary dark:text-white outline-none focus:border-accent transition-colors"
                      />
                    </div>

                    <div className="flex gap-1 bg-surface-100/50 dark:bg-white/[0.03] border border-surface-200/60 dark:border-white/5 p-0.5 rounded-lg w-fit">
                      {[
                        { id: "all", label: "All" },
                        { id: "active", label: "Linked" },
                        { id: "inactive", label: "Unlinked" }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setModalFilterTab(tab.id as any)}
                          className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-colors whitespace-nowrap ${
                            modalFilterTab === tab.id
                              ? "bg-surface-50 dark:bg-white/10 text-primary dark:text-white shadow-xs border border-surface-200/50 dark:border-white/5"
                              : "text-surface-400 hover:text-primary dark:hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 overflow-y-auto flex-1 custom-scrollbar">
                    {filteredTasks.length === 0 ? (
                      <div className="p-10 flex flex-col items-center justify-center text-center bg-surface-100/30 dark:bg-surface-800/30 rounded-2xl border border-surface-200/50 dark:border-white/5">
                        <div className="w-12 h-12 bg-surface-200/50 dark:bg-surface-700/50 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-inner border border-surface-300/50 dark:border-white/10">📋</div>
                        <div className="text-primary font-black tracking-tight text-sm mb-1">No Tasks Found</div>
                        <div className="text-surface-400 dark:text-white/40 text-[10px] uppercase tracking-widest font-bold">Try adjusting your filters or search query.</div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredTasks.map(({ task, link, isLinked, isLockedByOtherTask, isTaskLockedByOther3D, existingLink }) => {
                          const isLocked = isTaskLockedByOther3D;

                          return (
                            <div key={task.uid} className={`flex justify-between items-center p-2.5 px-3.5 rounded-xl border transition-colors ${
                              isLocked 
                                ? "bg-surface-100/20 dark:bg-white/[0.005] border-surface-200/20 dark:border-white/5 opacity-50"
                                : "bg-surface-100/50 dark:bg-white/[0.02] hover:bg-surface-200/50 dark:hover:bg-white/[0.05] border-surface-200/50 dark:border-white/5 hover:border-surface-300 dark:hover:border-white/10"
                            }`}>
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs font-bold text-primary dark:text-white/90 truncate">{task.title}</p>
                                <p className="text-[9px] uppercase tracking-widest text-surface-400 dark:text-white/40 font-bold flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span>{task.status}</span>
                                  {isLockedByOtherTask && existingLink && (
                                    <span className="text-indigo-500 dark:text-indigo-400 font-black normal-case">
                                      (🔄 Linked to: "{existingLink.title}" — Re-allocate)
                                    </span>
                                  )}
                                  {isTaskLockedByOther3D && (
                                    <span className="text-amber-600 dark:text-amber-400 font-black normal-case">
                                      (⚠️ Locked — Task already has a 3D model)
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={!!togglingTaskUids[task.uid] || isLocked}
                                onClick={async () => {
                                  if (togglingTaskUids[task.uid] || isLocked) return;
                                  if (isLockedByOtherTask && existingLink) {
                                    setReallocateTarget({ task, existingLink });
                                    return;
                                  }
                                  
                                  setTogglingTaskUids(prev => ({ ...prev, [task.uid]: true }));
                                  try {
                                    await toggleTaskAssetLink(task.uid, manageLinksAsset.canonical_uid, link?.id);
                                  } catch (err) {
                                    toast.error("Failed to toggle task link.");
                                  } finally {
                                    setTogglingTaskUids(prev => ({ ...prev, [task.uid]: false }));
                                  }
                                }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md shrink-0 ${
                                  togglingTaskUids[task.uid]
                                    ? 'bg-surface-200/80 dark:bg-white/5 text-surface-400 cursor-wait'
                                    : isLinked
                                    ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                    : isLocked
                                    ? 'bg-surface-100 dark:bg-white/5 text-surface-300 dark:text-white/20 border border-surface-200 dark:border-white/5 cursor-not-allowed'
                                    : isLockedByOtherTask
                                    ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                    : 'bg-surface-200/50 dark:bg-white/10 text-surface-400 hover:bg-accent hover:text-white hover:shadow-[0_0_15px_var(--accent-glow)]'
                                }`}
                              >
                                {togglingTaskUids[task.uid] ? (
                                  <div className="w-4 h-4 border-2 border-surface-400 border-t-transparent rounded-full animate-spin" />
                                ) : isLinked ? (
                                  '✓'
                                ) : isLockedByOtherTask ? (
                                  '🔄'
                                ) : isTaskLockedByOther3D ? (
                                  '⚠️'
                                ) : (
                                  '+'
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Nested Reallocate Confirmation Modal */}
      {reallocateTarget && manageLinksAsset && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-card dark:bg-[#0b0f19] border border-surface-200 dark:border-white/10 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-5 flex flex-col gap-4 text-center scale-in-center">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center text-2xl mx-auto border border-amber-500/20">🔄</div>
            <div>
              <h4 className="text-sm font-black text-primary dark:text-white/90">Re-allocate 3D Model?</h4>
              <p className="text-[11px] font-medium text-surface-500 dark:text-white/60 mt-2 leading-relaxed">
                This 3D model is currently linked to <strong className="text-primary dark:text-accent">"{reallocateTarget.existingLink.title}"</strong>.<br />
                Would you like to unlink it from "{reallocateTarget.existingLink.title}" and link it to <strong className="text-primary dark:text-accent">"{reallocateTarget.task.title}"</strong> instead?
              </p>
            </div>
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setReallocateTarget(null)}
                className="flex-1 h-9 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-surface-600 dark:text-surface-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetTaskUid = reallocateTarget.task.uid;
                  const oldLinkId = reallocateTarget.existingLink.id;
                  setReallocateTarget(null);
                  setTogglingTaskUids(prev => ({ ...prev, [targetTaskUid]: true }));
                  try {
                    // Step 1: Unlink from old task link
                    await projectsApi.unlinkAssetFromTask(oldLinkId);
                    // Step 2: Link to new task
                    await projectsApi.linkAssetToTask(targetTaskUid, manageLinksAsset.canonical_uid);
                    
                    // Fetch fresh details and show success toast
                    const freshData = await projectsApi.getProjectDetails(project.uid);
                    useProjectStore.setState({ project: freshData });
                    
                    toast.success(`Successfully re-allocated model to "${reallocateTarget.task.title}"`);
                  } catch (err) {
                    toast.error("Failed to re-allocate model link.");
                    fetchProject(project.uid);
                  } finally {
                    setTogglingTaskUids(prev => ({ ...prev, [targetTaskUid]: false }));
                  }
                }}
                className="flex-1 h-9 rounded-xl bg-accent text-background text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-xs"
              >
                Re-allocate
              </button>
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

      {/* Contractor Revisions Modal */}
      {showContractorMarkupsModal && (
        <div className="fixed inset-0 z-[100] bg-surface-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-card dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="text-sm font-black text-primary uppercase tracking-tight">Contractor Revision Clouds & Requests</h3>
                  <p className="text-[10px] text-surface-400">Contractor change requests and annotation clouds on 2D blueprints</p>
                </div>
              </div>
              <button onClick={() => setShowContractorMarkupsModal(false)} className="text-surface-400 hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {markups.length === 0 ? (
                <div className="py-12 text-center text-surface-400">
                  <p className="text-xs font-bold">No contractor revision requests found.</p>
                </div>
              ) : (
                markups.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 font-mono text-[10px] font-black">
                          ☁️ Cloud #{idx + 1}
                        </span>
                        <span className="text-xs font-black text-accent uppercase">{m.category}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        m.status === "RESOLVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-primary">{m.title}</h4>

                    {m.description && (
                      <p className="text-xs text-surface-600 dark:text-surface-300 font-medium whitespace-pre-wrap bg-surface-100/50 dark:bg-surface-900/50 p-2.5 rounded-xl border border-surface-200/50 dark:border-surface-800">
                        {m.description}
                      </p>
                    )}

                      <div className="flex items-center justify-between text-[10px] text-surface-400 pt-1 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-primary">👤 Submitter: {m.author_name && m.author_name !== "Contractor" ? m.author_name : (m.author_username || "Demo User")}</span>
                          {m.task_title && <span className="text-accent font-semibold">🏗️ Task: {m.task_title}</span>}
                        </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const nextStatus = m.status === "OPEN" ? "RESOLVED" : "OPEN";
                            await projectsApi.updateDrawingMarkupStatus(m.id, nextStatus as any);
                            toast.success(`Updated status to ${nextStatus}`);
                            const updated = await projectsApi.getDrawingMarkups({ project_uid: project.uid });
                            setMarkups(updated || []);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                            m.status === "RESOLVED" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500 text-white"
                          }`}
                        >
                          {m.status === "RESOLVED" ? "Re-Open" : "Mark Resolved"}
                        </button>
                        <button
                          onClick={() => {
                            setShowContractorMarkupsModal(false);
                            const matchingAsset = project?.assets?.find(a => a.canonical_uid === m.canonical_uid || a.id === m.asset);
                            if (matchingAsset) {
                              setCloudModalAsset(matchingAsset);
                            } else if (project?.assets && project.assets.length > 0) {
                              const planAsset = project.assets.find(a => a.category === "2d_plan") || project.assets[0];
                              setCloudModalAsset(planAsset);
                            }
                          }}
                          className="px-3 py-1 bg-red-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all flex items-center gap-1 shadow-xs"
                        >
                          <span>Open Revision Cloud</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {cloudModalAsset && (
        <ContractorRevisionReviewModal
          asset={cloudModalAsset}
          onClose={() => setCloudModalAsset(null)}
          onRefresh={() => fetchProject(project.uid)}
        />
      )}
    </>
  );
};
