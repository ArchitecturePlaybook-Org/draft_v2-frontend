"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { ProjectDetail, MatrixPayload, Task, ProjectAsset } from "@/types/projects";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

import { resolveAssetFileUrl } from "@/lib/resolveAssetFileUrl";

type TemplateType = 'layout_a_masonry';

interface ReportConfig {
  template: TemplateType;
  showExecutiveSummary: boolean;
  showMatrixProgress: boolean;
  showTaskDrilldown: boolean;
  showMediaGallery: boolean;
  photoColumns: 1 | 2 | 3 | 4;
  selectedImageUrls: string[];
}

interface SitePhotoItem {
  id?: number;
  url: string;
  caption: string;
  gridCol: number;
  gridRow: number;
  capturedAt?: string;
}

interface AssetGroup {
  assetId: number;
  assetTitle: string;
  floorPlanUrl: string | null;
  sitePhotos: SitePhotoItem[];
}

export default function ProjectSummaryReportPage() {
  const { id } = useParams();
  const router = useRouter();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [matrix, setMatrix] = useState<MatrixPayload | null>(null);


  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<ReportConfig>({
    template: 'layout_a_masonry',
    showExecutiveSummary: true,
    showMatrixProgress: true,
    showTaskDrilldown: true,
    showMediaGallery: true,
    photoColumns: 2,
    selectedImageUrls: [],
  });

  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projData = await projectsApi.getProjectDetails(id as string);
        setProject(projData);

        const matrixData = await projectsApi.getMatrix(id as string).catch(() => null);

        if (matrixData) setMatrix(matrixData);

        // Collect images grouped by asset (floor plan)
        const groups: AssetGroup[] = [];
        const allUrls: string[] = [];

        projData.assets.forEach(asset => {
          const is2DPlan = asset.category === '2d_plan' && asset.file && asset.file.match(/\.(png|jpg|jpeg|gif|webp)(?:\?.*)?$/i) !== null;

          if (is2DPlan) {
            const resolvedFloorPlan = resolveAssetFileUrl(asset.file);
            const group: AssetGroup = {
              assetId: asset.id,
              assetTitle: asset.title,
              floorPlanUrl: resolvedFloorPlan,
              sitePhotos: (asset.site_photos || []).map(sp => ({
                id: sp.id,
                url: resolveAssetFileUrl(sp.image),
                caption: sp.caption || '',
                gridCol: sp.grid_col ?? 0,
                gridRow: sp.grid_row ?? 0,
                capturedAt: sp.captured_at || (sp as any).created_at
              }))
            };

            if (resolvedFloorPlan) allUrls.push(resolvedFloorPlan);
            group.sitePhotos.forEach(p => {
              if (p.url) allUrls.push(p.url);
            });

            groups.push(group);
          }
        });

        setAssetGroups(groups);
        setConfig(prev => ({ ...prev, selectedImageUrls: allUrls }));

      } catch (err) {
        console.error("Failed to fetch report data", err);
        toast.error("Failed to load project data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  async function urlToBase64(url: string): Promise<string> {
    if (!url || url.startsWith("data:")) return url;
    try {
      const fullUrl = url.startsWith("/") ? `${window.location.origin}${url}` : url;
      const proxyUrl = `/api/v1/proxy-asset?url=${encodeURIComponent(fullUrl)}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) return url;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || url);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  }

  const handleExportAndSave = async () => {
    if (!project) return;
    setIsExporting(true);
    toast.info("Compiling multi-page report. This may take a moment...");

    try {
      const { toJpeg } = await import("html-to-image");
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      // Find all sections marked as a 'pdf-page' inside the report container
      const pages = reportRef.current?.querySelectorAll(".pdf-page");
      if (!pages || pages.length === 0) {
        throw new Error("No pages to export.");
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;

        // Dynamic pixelRatio: always output exactly 1240px wide (150 DPI A4)
        const cssWidth = pageEl.getBoundingClientRect().width;
        const pixelRatio = Math.round((1240 / cssWidth) * 1000) / 1000;

        // toJpeg: JPEG compression drastically reduces file size (PNG would be 7-8MB/page)
        const imgData = await toJpeg(pageEl, {
          pixelRatio,
          quality: 0.85,
          backgroundColor: "#ffffff",
          fetchRequestInit: { cache: "no-cache" },
        });

        // Each pdf-page maps to exactly ONE A4 page — direct full-page fill, no letterboxing
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      const fileName = `Project_Report_${project.project_code || project.uid}.pdf`;

      // 1. Save and download PDF to user machine immediately
      pdf.save(fileName);
      toast.success("Report downloaded successfully!");

      // 2. Non-blocking background upload to Master Data Hub
      if (project?.id) {
        try {
          const pdfBlob = pdf.output("blob");
          const file = new File([pdfBlob], fileName, { type: "application/pdf" });
          projectsApi.uploadProjectAsset(project.id, "document", file, `Consolidated Project Report`)
            .then(() => console.log("Report saved to Master Data Hub"))
            .catch(e => console.warn("Background report upload skipped:", e));
        } catch (e) {
          console.warn("Could not create PDF blob for background upload:", e);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ? `Failed to generate report: ${err.message}` : "Failed to generate report.");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleImage = (url: string) => {
    setConfig(prev => ({
      ...prev,
      selectedImageUrls: prev.selectedImageUrls.includes(url)
        ? prev.selectedImageUrls.filter(u => u !== url)
        : [...prev.selectedImageUrls, url]
    }));
  };

  if (isLoading) return <div className="py-32 flex justify-center"><Spinner size="lg" label="Aggregating Project Data..." /></div>;
  if (!project) return <div className="text-center py-32">Data not found.</div>;

  // -- KPI Calculations --
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(t => t.status === "DONE").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);


  // -- Group Tasks by Phase & Zone --
  const tasksByPhase: Record<string, Task[]> = {};
  project.tasks.forEach(task => {
    const key = task.phase_name || "Uncategorized";
    if (!tasksByPhase[key]) tasksByPhase[key] = [];
    tasksByPhase[key].push(task);
  });

  // Images are already grouped by assetGroups

  // --- THEME UTILS ---
  const getThemeClasses = () => {
    return {
      container: "bg-white text-gray-900 font-sans",
      page: "bg-white border-gray-200",
      heading1: "text-3xl font-bold text-gray-900 tracking-tight",
      heading2: "text-xl font-bold text-gray-800",
      heading3: "text-xs font-semibold text-gray-500 uppercase tracking-widest",
      card: "bg-gray-50 border border-gray-200 rounded-lg",
      accent: "text-gray-800",
      accentBg: "bg-gray-800 text-white"
    };
  };
  const theme = getThemeClasses();

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-50 font-sans">

      {/* LEFT PANE: CONFIGURATION BUILDER (Not Printed) */}
      <div className="w-[280px] bg-surface-100 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col h-full shadow-lg z-10 print:hidden overflow-hidden shrink-0">
        
        {/* Compact Panel Header */}
        <div className="p-3.5 border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-primary tracking-tight flex items-center gap-1.5">
              <span>📑</span> Report Builder
            </h2>
            <p className="text-[10px] font-bold text-surface-400 mt-0.5">Customize layout & sections</p>
          </div>
          <span className="px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded text-[8px] font-black uppercase tracking-wider">
            A4 Print
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin">
          
          {/* Data Sections */}
          <div>
            <h3 className="text-[9px] font-black text-surface-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <span>📊</span> Sections
            </h3>
            <div className="space-y-1.5">
              {[
                { key: 'showExecutiveSummary', label: 'Executive Summary', icon: '📋', desc: 'KPIs & overview' },
                { key: 'showMatrixProgress', label: 'Matrix Progress', icon: '🏗️', desc: 'Phase progress' },
                { key: 'showTaskDrilldown', label: 'Task Details', icon: '☑️', desc: 'Checklist details' },
                { key: 'showMediaGallery', label: 'Media Gallery', icon: '🖼️', desc: 'Blueprints & photos' }
              ].map(sec => {
                const isActive = config[sec.key as keyof ReportConfig] as boolean;
                return (
                  <label 
                    key={sec.key} 
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-surface-card border-accent/40 shadow-xs' 
                        : 'bg-surface-50/40 dark:bg-surface-850/40 border-surface-200 dark:border-surface-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{sec.icon}</span>
                      <div>
                        <span className="text-[11px] font-black text-primary block leading-tight">{sec.label}</span>
                        <span className="text-[9px] font-medium text-surface-400">{sec.desc}</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setConfig(prev => ({ ...prev, [sec.key]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-surface-300 accent-accent focus:ring-accent cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Photo Grid Columns Selection */}
          {config.showMediaGallery && (
            <div className="p-2.5 bg-surface-50 dark:bg-surface-850 rounded-lg border border-surface-200 dark:border-surface-800">
              <h3 className="text-[9px] font-black text-surface-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Photo Grid</span>
                <span className="text-accent font-bold text-[10px]">{config.photoColumns} {config.photoColumns === 1 ? 'Col' : 'Cols'}</span>
              </h3>
              <div className="flex gap-1 bg-surface-200/50 dark:bg-surface-800/60 p-0.5 rounded border border-surface-200 dark:border-surface-700">
                {([1, 2, 3, 4] as const).map(cols => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, photoColumns: cols }))}
                    className={`flex-1 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                      config.photoColumns === cols
                        ? 'bg-accent text-background shadow-xs'
                        : 'text-surface-600 dark:text-surface-300 hover:text-primary hover:bg-surface-200/60'
                    }`}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Granular Image Selection */}
          {config.showMediaGallery && assetGroups.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[9px] font-black text-surface-400 uppercase tracking-widest">Image Selector</h3>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, selectedImageUrls: assetGroups.flatMap(g => [g.floorPlanUrl, ...g.sitePhotos.map(p => p.url)].filter(Boolean) as string[]) }))} 
                    className="text-[8px] font-black uppercase tracking-wider bg-surface-200/60 dark:bg-surface-800 hover:bg-accent/20 hover:text-accent text-surface-600 dark:text-surface-300 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, selectedImageUrls: [] }))} 
                    className="text-[8px] font-black uppercase tracking-wider bg-surface-200/60 dark:bg-surface-800 hover:bg-red-500/20 hover:text-red-500 text-surface-600 dark:text-surface-300 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {assetGroups.map(group => (
                  <div key={group.assetId} className="bg-surface-card p-2.5 rounded-lg border border-surface-200 dark:border-surface-800">
                    <h4 className="text-[9px] font-black text-primary uppercase tracking-wider mb-1.5 truncate flex items-center gap-1" title={group.assetTitle}>
                      <span>📍</span> {group.assetTitle}
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.floorPlanUrl && (
                        <div
                          onClick={() => group.floorPlanUrl && toggleImage(group.floorPlanUrl)}
                          className={`relative aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                            config.selectedImageUrls.includes(group.floorPlanUrl) 
                              ? 'border-accent ring-1 ring-accent/30 shadow-xs' 
                              : 'border-transparent opacity-40 hover:opacity-75'
                          }`}
                          title="Blueprint"
                        >
                          <img src={group.floorPlanUrl} alt="blueprint" className="w-full h-full object-cover" />
                          {config.selectedImageUrls.includes(group.floorPlanUrl) && (
                            <div className="absolute top-0.5 right-0.5 bg-accent text-background rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold shadow-xs">✓</div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[7.5px] text-white p-0.5 text-center font-bold uppercase tracking-widest">Blueprint</div>
                        </div>
                      )}

                      {group.sitePhotos.map((photo, i) => (
                        <div
                          key={`photo-${i}`}
                          onClick={() => toggleImage(photo.url)}
                          className={`relative aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                            config.selectedImageUrls.includes(photo.url) 
                              ? 'border-accent ring-1 ring-accent/30 shadow-xs' 
                              : 'border-transparent opacity-40 hover:opacity-75'
                          }`}
                          title={photo.caption || "Site Photo"}
                        >
                          <img src={photo.url} alt="site" className="w-full h-full object-cover" />
                          {config.selectedImageUrls.includes(photo.url) && (
                            <div className="absolute top-0.5 right-0.5 bg-accent text-background rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold shadow-xs">✓</div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[7.5px] text-white p-0.5 text-center font-bold uppercase tracking-widest truncate">
                            {photo.caption || "Photo"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Panel Footer */}
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md">
          <button
            onClick={handleExportAndSave}
            disabled={isExporting}
            className="w-full h-9 bg-accent text-background font-black text-[11px] uppercase tracking-widest rounded-lg hover:opacity-90 active:scale-[0.99] transition-all shadow-md shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isExporting ? <Spinner size="sm" label="" /> : <span>📄 Download PDF</span>}
          </button>
        </div>
      </div>

      {/* RIGHT PANE: LIVE PREVIEW */}
      <div className={`flex-1 overflow-y-auto px-4 py-8 ${theme.container} scrollbar-thin`}>
        <div className="max-w-[210mm] mx-auto space-y-12" ref={reportRef}>

          {/* PAGE 1: EXECUTIVE SUMMARY */}
          {config.showExecutiveSummary && (
            <div className={`pdf-page w-full min-h-[297mm] px-[65px] py-[65px] flex flex-col shadow-2xl ${theme.page} print:shadow-none bg-white text-slate-900`}>

              {/* Architectural Top Accent Header */}
              <div className="w-full h-2 bg-gradient-to-r from-slate-900 via-accent to-slate-700 rounded-t-sm mb-8" />

              <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-start">
                <div>
                  <div className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded mb-2">
                    {project.account.name}
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{project.title}</h1>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    Project Code: <span className="text-slate-800 font-black">{project.project_code || "N/A"}</span> • Location: <span className="text-slate-800 font-black">{project.location || "N/A"}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Date</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              {/* Metadata Cards */}
              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Client Details</h3>
                  <p className="text-sm font-black text-slate-800">{project.client_name || "Internal Project"}</p>
                  {project.client_email && <p className="text-xs font-semibold text-slate-500 mt-0.5">{project.client_email}</p>}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project Management</h3>
                  <p className="text-sm font-black text-slate-800">{project.created_by.first_name} {project.created_by.last_name}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{project.memberships.length} Active Team Members</p>
                </div>
              </div>

              {/* Executive Dashboard KPIs */}
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Executive Dashboard</h3>
              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-md flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overall Progress</p>
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-black text-white">{progressPercent}%</span>
                      <span className="text-xs font-bold text-slate-300 mb-1">{completedTasks} / {totalTasks} Tasks</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Task Summary</p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                        <span className="text-2xl font-black text-slate-900 block">{completedTasks}</span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Completed</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                        <span className="text-2xl font-black text-slate-900 block">{totalTasks - completedTasks}</span>
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">In Progress</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200 flex justify-between items-center">
                <span>{project.title}</span>
                <span>Executive Summary</span>
                <span>Page 1</span>
              </div>
            </div>
          )}

          {/* PAGE 2: MATRIX PROGRESS */}
          {config.showMatrixProgress && (
            <div className={`pdf-page w-full min-h-[297mm] px-[65px] py-[65px] flex flex-col shadow-2xl ${theme.page} print:shadow-none bg-white text-slate-900`}>

              <div className="border-b-2 border-slate-200 pb-4 mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Logistics & Phase Progress</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Milestone and phase completion breakdown</p>
              </div>

              {matrix && matrix.phases.length > 0 ? (
                <div className="mb-10">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Milestone Phases</h3>
                  <div className="space-y-3">
                    {matrix.phases.map(phase => {
                      const blocksInPhase = matrix.blocks.filter(b => b.phase_id === phase.id);
                      const total = blocksInPhase.reduce((sum, b) => sum + b.total_tasks, 0);
                      const comp = blocksInPhase.reduce((sum, b) => sum + b.completed_tasks, 0);
                      const pct = total === 0 ? 0 : Math.round((comp / total) * 100);
                      return (
                        <div key={phase.id} className="flex items-center gap-4 text-sm p-4 bg-slate-50 rounded-xl border border-slate-200/80 shadow-xs">
                          <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: phase.color_hex }} />
                          <div className="w-1/3 font-black text-slate-900 truncate">{phase.name}</div>
                          <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: phase.color_hex }} />
                          </div>
                          <div className="w-16 text-right font-black text-slate-800">{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No Phase Matrix Data Available
                </div>
              )}

              <div className="mt-auto pt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200 flex justify-between items-center">
                <span>{project.title}</span>
                <span>Matrix Progress</span>
                <span>Page 2</span>
              </div>
            </div>
          )}

          {/* PAGE 3+: TASK DRILLDOWN */}
          {config.showTaskDrilldown && Object.entries(tasksByPhase).map(([phase, tasks], index) => (
            <div key={`phase-${index}`} className={`pdf-page w-full min-h-[297mm] px-[65px] py-[65px] flex flex-col shadow-2xl ${theme.page} print:shadow-none bg-white text-slate-900 mb-12`}>
              <div className="border-b-2 border-slate-200 pb-4 mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Execution: {phase}</h2>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{tasks.length} Total Tasks in Phase</p>
                </div>
                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                  Phase {index + 1}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-xs break-inside-avoid">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex gap-2 items-center mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            task.status === 'DONE' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}>
                            {task.status}
                          </span>
                          {task.zone_name && (
                            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                              Zone: {task.zone_name}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-1">{task.title}</h4>
                      </div>
                      <div className="text-right text-[10px] font-black text-slate-400 font-mono">
                        {task.task_code || task.uid.substring(0, 8)}
                      </div>
                    </div>

                    {task.checklists && task.checklists.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Checklist Items</p>
                        <ul className="space-y-1">
                          {task.checklists.map((c: any) => (
                            <li key={c.id} className="text-xs font-semibold flex items-center gap-2 text-slate-700">
                              <span>{c.is_completed ? "✅" : "⬜"}</span>
                              <span className={c.is_completed ? "line-through text-slate-400" : ""}>{c.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200 flex justify-between items-center">
                <span>{project.title}</span>
                <span>Execution Log - {phase}</span>
                <span>Phase {index + 1}</span>
              </div>
            </div>
          ))}

          {/* PAGE 4+: MEDIA GALLERY (Grouped by Asset) */}
          {config.showMediaGallery && assetGroups.map(group => {
            const selectedFloorPlan = group.floorPlanUrl && config.selectedImageUrls.includes(group.floorPlanUrl) ? group.floorPlanUrl : null;
            const visibleSitePhotos = group.sitePhotos.filter(sp => config.selectedImageUrls.includes(sp.url));

            if (!selectedFloorPlan && visibleSitePhotos.length === 0) return null;

            return (
              <div key={group.assetId} className={`pdf-page w-full min-h-[297mm] px-[65px] py-[65px] flex flex-col shadow-2xl ${theme.page} print:shadow-none bg-white text-slate-900 mb-12`}>
                <div className="border-b-2 border-slate-200 pb-4 mb-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Visual Context: {group.assetTitle}</h2>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Primary Blueprint & Site Grid Verification Photos</p>
                </div>

                {/* Blueprint Render */}
                {selectedFloorPlan && (
                  <div className="mb-6 border border-slate-300 p-2 rounded-2xl bg-slate-900 shadow-md">
                    <img src={selectedFloorPlan} alt={group.assetTitle} className="w-full max-h-[400px] object-contain rounded-xl" />
                  </div>
                )}

                {/* Site Photos Attached to 8x8 Grid Cells */}
                {visibleSitePhotos.length > 0 && (
                  <div className="mt-4 break-inside-avoid flex-1">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
                      Site Grid Verification Photos ({visibleSitePhotos.length})
                    </h3>
                    <div className={`grid ${
                      config.photoColumns === 1 ? 'grid-cols-1' :
                      config.photoColumns === 2 ? 'grid-cols-2' :
                      config.photoColumns === 3 ? 'grid-cols-3' : 'grid-cols-4'
                    } gap-4`}>
                      {visibleSitePhotos.map((photo, i) => {
                        const colLetter = String.fromCharCode(65 + photo.gridCol);
                        const rowNum = photo.gridRow + 1;
                        return (
                          <div key={`photo-${group.assetId}-${i}`} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col shadow-xs">
                            <div className="aspect-video relative bg-slate-900 overflow-hidden flex items-center justify-center p-1">
                              <img src={photo.url} alt={photo.caption} className="max-w-full max-h-full object-contain rounded" />
                              <div className="absolute top-2 right-2 bg-slate-900/90 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow">
                                Grid {colLetter}{rowNum}
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="text-xs font-black text-slate-800 truncate">{photo.caption || "No caption"}</p>
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase mt-1">
                                <span>Cell [{colLetter}{rowNum}]</span>
                                {photo.capturedAt && <span>{new Date(photo.capturedAt).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200 flex justify-between items-center">
                  <span>{project.title}</span>
                  <span>Media Gallery: {group.assetTitle}</span>
                  <span>A4 Format</span>
                </div>
              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
}
