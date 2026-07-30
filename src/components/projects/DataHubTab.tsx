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
          className="col-span-1 space-y-3"
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
              className={`w-full text-left px-5 py-4 rounded-2xl font-extrabold text-[10px] uppercase tracking-widest transition-all duration-300 border ${
                activeHubCategory === cat.id 
                ? "bg-accent/10 text-accent shadow-[0_0_20px_var(--accent-glow)] scale-[1.02] border-accent/50 backdrop-blur-md" 
                : "bg-surface-50/50 backdrop-blur-sm border-surface-200/50 text-surface-400 hover:bg-surface-100 hover:text-primary hover:-translate-y-0.5"
              }`}
            >
              <span className="mr-3 text-base">{cat.icon}</span> {cat.label}
            </button>
          ))}
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="col-span-1 md:col-span-3"
        >
          <div className="bg-surface-50/40 dark:bg-surface-900/40 backdrop-blur-3xl border-white/10 p-8 rounded-[2.5rem] border shadow-2xl shadow-black/5 min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 border-b border-surface-100 pb-4 min-w-0">
              <h3 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight truncate min-w-0">
                {activeHubCategory.replace('_', ' ').toUpperCase()}
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0">
                {activeHubCategory === "sketch" && (
                  <button 
                    onClick={() => setIsCreateSketchModalOpen(true)}
                    className="px-6 py-2 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-lg hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                  >
                    New Design Sketch
                  </button>
                )}
                {activeHubCategory === "3d_model" && (
                  <button 
                    onClick={() => setIsCreate3DModalOpen(true)}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all duration-200 border border-emerald-500/30 flex items-center gap-2 shadow-sm"
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
                      ? "image/png,image/jpeg,image/jpg,image/webp,.pdf" 
                      : activeHubCategory === "document" 
                      ? ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" 
                      : "image/png,image/jpeg,image/jpg,image/webp,image/gif,.excalidraw,.json"
                  }
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length || !project.id) return;
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
                  disabled={isUploading}
                  className={`px-6 py-2 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all duration-300 ${
                    isUploading 
                      ? "bg-accent text-white shadow-[0_0_20px_var(--accent-glow)] animate-pulse" 
                      : "bg-surface-200/50 backdrop-blur-md text-primary border border-surface-300/50 hover:bg-surface-300 hover:shadow-lg"
                  } disabled:opacity-80`}
                >
                  {isUploading ? `Uploading ${uploadProgress}...` : "Upload File"}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.length ? (
                visibleAssets.map((asset, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={asset.id} 
                    className="p-5 rounded-[1.5rem] transition-all duration-300 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 hover:border-accent/50 hover:-translate-y-2 hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1),0_0_15px_var(--accent-glow)] group relative"
                  >
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        asset.is_latest 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-surface-100 text-surface-400"
                      }`}>
                        V{asset.version_number}
                      </span>
                    </div>

                    <div 
                      onClick={() => handleOpenAsset(asset)}
                      className={`h-32 rounded-lg mb-3 flex items-center justify-center overflow-hidden border cursor-pointer transition-colors ${['3d_model', 'sh3d'].includes(asset.category) ? 'border-transparent bg-opacity-50 ' + (asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'bg-emerald-50 dark:bg-emerald-900/20' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'bg-amber-50 dark:bg-amber-900/20' : asset.file?.toLowerCase().endsWith('obj') ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-indigo-50') : 'bg-surface-50 border-surface-100'}`}
                    >
                      {['3d_model', 'sh3d'].includes(asset.category) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center transition-transform duration-500 group-hover:scale-105">
                          <div className={`w-14 h-14 flex items-center justify-center rounded-2xl text-3xl mb-2 transition-transform duration-500 group-hover:-translate-y-1 shadow-inner ${asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 dark:border-emerald-800/30 shadow-emerald-500/10' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'bg-amber-100 text-amber-600 border border-amber-200 dark:border-amber-800/30 shadow-amber-500/10' : asset.file?.toLowerCase().endsWith('obj') ? 'bg-blue-100 text-blue-600 border border-blue-200 dark:border-blue-800/30 shadow-blue-500/10' : 'bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-indigo-500/10'}`}>
                            🧊
                          </div>
                          <span className={`text-[9px] font-black tracking-widest ${asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'text-emerald-700' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'text-amber-700' : asset.file?.toLowerCase().endsWith('obj') ? 'text-blue-700' : 'text-indigo-700'}`}>
                            {asset.file?.toLowerCase().endsWith('sh3d') || asset.file?.toLowerCase().endsWith('sh3x') || asset.category === 'sh3d' ? 'SH3D PROJECT' : asset.file?.toLowerCase().endsWith('glb') || asset.file?.toLowerCase().endsWith('gltf') ? 'GLB MODEL' : asset.file?.toLowerCase().endsWith('obj') ? 'OBJ MODEL' : '3D MODEL'}
                          </span>
                        </div>
                      ) : asset.thumbnail ? (
                        <img src={asset.thumbnail} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : isImageUrl(asset.file) ? (
                        <img src={asset.file} loading="lazy" decoding="async" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                      ) : asset.category === "sketch" ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">✏️</span>
                          <span className="text-[8px] font-bold text-accent uppercase tracking-widest">Editable Design</span>
                        </div>
                      ) : (
                        <span className="text-4xl opacity-20">{activeHubCategory === '2d_plan' ? '📐' : '📄'}</span>
                      )}
                    </div>
                    
                    {renamingAssetId === asset.id ? (
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          value={newAssetTitle}
                          onChange={(e) => setNewAssetTitle(e.target.value)}
                          autoFocus
                          className="flex-1 bg-surface-50 border border-surface-200 rounded px-2 py-1 text-sm font-bold outline-none focus:border-accent"
                        />
                        <button onClick={() => handleRenameAsset(asset.id)} className="text-emerald-500 text-xs font-bold">Save</button>
                        <button onClick={() => setRenamingAssetId(null)} className="text-surface-400 text-xs font-bold">✕</button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0" onClick={() => handleOpenAsset(asset)}>
                            <p className="font-bold text-sm truncate text-primary cursor-pointer hover:text-accent transition-colors">{asset.title}</p>
                            <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest mt-0.5">{(asset.size / 1024).toFixed(1)} KB</p>
                          </div>
                          
                          <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setHistoryAsset(asset); }}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-100 text-xs"
                              title="Revision History"
                            >
                              🕐
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setRenamingAssetId(asset.id); setNewAssetTitle(asset.title); }}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-100 text-xs grayscale hover:grayscale-0"
                              title="Rename"
                            >
                              📝
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 dark:bg-red-900/20 text-xs grayscale hover:grayscale-0"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {asset.category === "sh3d" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAsset(asset); }}
                            className="mt-3 w-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg px-2 py-2 uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <span>✏️</span> Open in Editor
                          </button>
                        )}

                        {(activeHubCategory === "2d_plan" || activeHubCategory === "3d_model") && (
                          <div className="mt-2.5 pt-2.5 border-t border-surface-100 flex flex-col gap-2">
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
                            } catch(err) {
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
    </>
  );
};
