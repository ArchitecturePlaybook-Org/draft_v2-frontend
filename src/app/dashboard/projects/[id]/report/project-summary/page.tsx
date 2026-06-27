"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { ProjectDetail, MatrixPayload, Task, ProjectAsset } from "@/types/projects";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

type TemplateType = 'layout_a_masonry' | 'layout_b_museum' | 'layout_c_cinematic';

interface ReportConfig {
  template: TemplateType;
  showExecutiveSummary: boolean;
  showMatrixProgress: boolean;
  showTaskDrilldown: boolean;
  showMediaGallery: boolean;
  selectedImageUrls: string[];
}

interface AssetGroup {
  assetId: number;
  assetTitle: string;
  floorPlanUrl: string | null;
  sitePhotos: { url: string; caption: string }[];
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
          const is2DPlan = asset.category === '2d_plan' && asset.file.match(/\.(png|jpg|jpeg|gif|webp)(?:\?.*)?$/i) !== null;
          
          if (is2DPlan) {
            const group: AssetGroup = {
              assetId: asset.id,
              assetTitle: asset.title,
              floorPlanUrl: asset.file,
              sitePhotos: (asset.site_photos || []).map(sp => ({ url: sp.image, caption: sp.caption }))
            };
            
            if (asset.file) allUrls.push(asset.file);
            group.sitePhotos.forEach(p => allUrls.push(p.url));
            
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

  const handleExportAndSave = async () => {
    if (!project) return;
    setIsExporting(true);
    toast.info("Compiling multi-page report. This may take a moment...");
    
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Find all sections marked as a 'pdf-page' inside the report container
      const pages = reportRef.current?.querySelectorAll(".pdf-page");
      if (!pages || pages.length === 0) {
        throw new Error("No pages to export.");
      }
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: config.template === 'layout_c_cinematic' ? '#0f172a' : '#ffffff' });
        const imgData = canvas.toDataURL("image/png");
        
        // Calculate proportional height to maintain aspect ratio
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }

      const fileName = `Project_Report_${project.project_code || project.uid}.pdf`;
      
      // 1. Download
      pdf.save(fileName);

      // 2. Upload to Master Data Hub
      const pdfBlob = pdf.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      await projectsApi.uploadProjectAsset(project.id, "document", file, `Consolidated Project Report`);
      
      toast.success("Report downloaded and saved to Master Data Hub!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report.");
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
    switch(config.template) {
      case 'layout_b_museum':
        return {
          container: "bg-stone-50 text-stone-900 font-serif",
          page: "bg-stone-50 border-stone-200",
          heading1: "text-5xl font-black tracking-tighter text-stone-900",
          heading2: "text-3xl font-bold tracking-tight text-stone-800",
          heading3: "text-sm font-bold uppercase tracking-[0.2em] text-stone-500",
          card: "bg-surface-100 border-surface-200 border border-stone-200 rounded-none shadow-sm",
          accent: "text-stone-900",
          accentBg: "bg-stone-900 text-white"
        };
      case 'layout_c_cinematic':
        return {
          container: "bg-slate-900 text-slate-100 font-sans",
          page: "bg-slate-900 border-slate-800",
          heading1: "text-4xl font-extrabold tracking-widest text-white uppercase",
          heading2: "text-2xl font-bold tracking-wider text-slate-200",
          heading3: "text-xs font-black uppercase tracking-[0.3em] text-cyan-400",
          card: "bg-slate-800/50 border border-slate-700/50 rounded-2xl backdrop-blur-md shadow-2xl",
          accent: "text-cyan-400",
          accentBg: "bg-cyan-500 text-slate-900"
        };
      case 'layout_a_masonry':
      default:
        return {
          container: "bg-surface-100 text-surface-900 font-sans",
          page: "bg-surface-100 border-surface-200 border-surface-200",
          heading1: "text-4xl font-extrabold text-primary tracking-tight",
          heading2: "text-2xl font-extrabold text-primary tracking-tight",
          heading3: "text-xs font-black text-surface-400 uppercase tracking-widest",
          card: "bg-surface-50 border border-surface-200 rounded-2xl",
          accent: "text-primary",
          accentBg: "bg-accent text-background"
        };
    }
  };
  const theme = getThemeClasses();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 font-sans">
      
      {/* LEFT PANE: CONFIGURATION BUILDER (Not Printed) */}
      <div className="w-[340px] bg-surface-100 border-surface-200 border-r border-surface-200 flex flex-col h-full shadow-2xl z-50 print:hidden overflow-hidden shrink-0">
        <div className="p-6 border-b border-surface-200 bg-surface-50/50">
          <button onClick={() => window.close()} className="text-xs font-bold text-surface-500 text-surface-400 hover:text-primary mb-4 flex items-center gap-1 transition-colors">← Back to Dashboard</button>
          <h2 className="text-xl font-black text-primary tracking-tight">Report Builder</h2>
          <p className="text-xs font-bold text-surface-500 text-surface-400 mt-1">Configure layout and data scope.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Master Templates */}
          <div>
            <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3">Master Template</h3>
            <div className="space-y-2">
              {[
                { id: 'layout_a_masonry', label: 'Premium Masonry', desc: 'Modern & Dense' },
                { id: 'layout_b_museum', label: 'Museum Spotlight', desc: 'Editorial & Elegant' },
                { id: 'layout_c_cinematic', label: 'Cinematic Glass', desc: 'Immersive & Bold' }
              ].map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setConfig(prev => ({ ...prev, template: tpl.id as TemplateType }))}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${config.template === tpl.id ? 'bg-accent text-background shadow-md' : 'bg-surface-100 border-surface-200 border-surface-200 text-surface-600 text-surface-300 hover:border-surface-300'}`}
                >
                  <div className="font-bold text-sm">{tpl.label}</div>
                  <div className={`text-[10px] uppercase tracking-widest mt-0.5 ${config.template === tpl.id ? 'text-primary-100' : 'text-surface-400'}`}>{tpl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Sections */}
          <div>
            <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3">Data Sections</h3>
            <div className="space-y-2">
              {[
                { key: 'showExecutiveSummary', label: 'Executive Summary' },
                { key: 'showMatrixProgress', label: 'Matrix Progress' },

                { key: 'showTaskDrilldown', label: 'Task Execution Details' },
                { key: 'showMediaGallery', label: 'Media Gallery' }
              ].map(sec => (
                <label key={sec.key} className="flex items-center gap-3 p-2 hover:bg-surface-50 rounded-lg cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={config[sec.key as keyof ReportConfig] as boolean}
                    onChange={(e) => setConfig(prev => ({ ...prev, [sec.key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-bold text-surface-600 text-surface-300">{sec.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Granular Image Selection */}
          {config.showMediaGallery && assetGroups.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Image Selection</h3>
              </div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setConfig(prev => ({ ...prev, selectedImageUrls: assetGroups.flatMap(g => [g.floorPlanUrl, ...g.sitePhotos.map(p => p.url)].filter(Boolean) as string[]) }))} className="flex-1 text-[9px] font-black uppercase tracking-widest bg-surface-100 hover:bg-surface-200 text-surface-600 text-surface-300 py-1.5 rounded">Select All</button>
                <button onClick={() => setConfig(prev => ({ ...prev, selectedImageUrls: [] }))} className="flex-1 text-[9px] font-black uppercase tracking-widest bg-surface-100 hover:bg-surface-200 text-surface-600 text-surface-300 py-1.5 rounded">Clear All</button>
              </div>
              <div className="space-y-6">
                {assetGroups.map(group => {
                   return (
                     <div key={group.assetId}>
                       <h4 className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest border-b border-surface-200 pb-1 mb-2 truncate" title={group.assetTitle}>📍 {group.assetTitle}</h4>
                       <div className="grid grid-cols-2 gap-2">
                         {group.floorPlanUrl && (
                           <div 
                             onClick={() => group.floorPlanUrl && toggleImage(group.floorPlanUrl)}
                             className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${config.selectedImageUrls.includes(group.floorPlanUrl) ? 'border-primary shadow-md' : 'border-transparent opacity-50 hover:opacity-80'}`}
                             title="Blueprint"
                           >
                             <img src={group.floorPlanUrl} alt="blueprint" className="w-full h-full object-cover" crossOrigin="anonymous" />
                             {config.selectedImageUrls.includes(group.floorPlanUrl) && (
                               <div className="absolute top-1 right-1 bg-accent text-background rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-sm">✓</div>
                             )}
                             <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white p-0.5 text-center uppercase tracking-widest">Blueprint</div>
                           </div>
                         )}
                         
                         {group.sitePhotos.map((photo, i) => (
                           <div 
                             key={`photo-${i}`}
                             onClick={() => toggleImage(photo.url)}
                             className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${config.selectedImageUrls.includes(photo.url) ? 'border-primary shadow-md' : 'border-transparent opacity-50 hover:opacity-80'}`}
                             title={photo.caption || "Site Photo"}
                           >
                             <img src={photo.url} alt="site" className="w-full h-full object-cover" crossOrigin="anonymous" />
                             {config.selectedImageUrls.includes(photo.url) && (
                               <div className="absolute top-1 right-1 bg-accent text-background rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-sm">✓</div>
                             )}
                             <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white p-0.5 text-center uppercase tracking-widest truncate">{photo.caption || "Photo"}</div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
          )}

        </div>

        <div className="p-6 border-t border-surface-200 bg-surface-50">
          <button 
            onClick={handleExportAndSave}
            disabled={isExporting}
            className="w-full h-12 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? "Compiling PDF..." : "📄 Export & Save PDF"}
          </button>
        </div>
      </div>

      {/* RIGHT PANE: LIVE PREVIEW */}
      <div className={`flex-1 overflow-y-auto p-12 ${theme.container}`}>
        <div className="max-w-[210mm] mx-auto space-y-12" ref={reportRef}>
          
          {/* PAGE 1: EXECUTIVE SUMMARY */}
          {config.showExecutiveSummary && (
            <div className={`pdf-page w-full min-h-[297mm] p-12 pb-32 shadow-2xl relative ${theme.page} print:shadow-none`}>
              
              <div className={`border-b-4 ${config.template === 'layout_c_cinematic' ? 'border-cyan-500' : 'border-current'} pb-8 mb-10 flex justify-between items-end`}>
                <div>
                  <h4 className={`${theme.heading3} mb-2`}>{project.account.name}</h4>
                  <h1 className={`${theme.heading1} mb-2`}>{project.title}</h1>
                  <p className="text-sm font-bold opacity-70">Project Code: {project.project_code || "N/A"} • Location: {project.location || "N/A"}</p>
                </div>
                <div className="text-right">
                  <p className={`${theme.heading3}`}>Report Date</p>
                  <p className="text-sm font-black mt-1 opacity-90">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                  <h3 className={`${theme.heading3} border-b border-current pb-2 mb-3 opacity-50`}>Client Details</h3>
                  <p className="text-sm font-bold">{project.client_name || "Internal Project"}</p>
                  {project.client_email && <p className="text-sm opacity-70">{project.client_email}</p>}
                </div>
                <div>
                  <h3 className={`${theme.heading3} border-b border-current pb-2 mb-3 opacity-50`}>Management</h3>
                  <p className="text-sm font-bold">{project.created_by.first_name} {project.created_by.last_name}</p>
                  <p className="text-sm opacity-70">{project.memberships.length} Active Team Members</p>
                </div>
              </div>

              <h3 className={`${theme.heading3} border-b border-current pb-2 mb-4 opacity-50`}>Executive Dashboard</h3>
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className={`${theme.card} p-6`}>
                  <p className={`${theme.heading3} mb-1 opacity-70`}>Overall Progress</p>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black">{progressPercent}%</span>
                    <span className="text-sm font-bold opacity-70 mb-1">{completedTasks} / {totalTasks} Tasks</span>
                  </div>
                  <div className="w-full bg-current/10 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="h-full" style={{ width: `${progressPercent}%`, backgroundColor: config.template === 'layout_c_cinematic' ? '#06b6d4' : 'currentColor' }} />
                  </div>
                </div>


              </div>

              <div className="absolute bottom-12 left-12 right-12 text-center text-[10px] font-bold uppercase tracking-widest border-t border-current/20 pt-4 opacity-50">
                Executive Summary
              </div>
            </div>
          )}

          {config.showMatrixProgress && (
            <div className={`pdf-page w-full min-h-[297mm] p-12 pb-32 shadow-2xl relative ${theme.page} print:shadow-none`}>
              
              <h2 className={`${theme.heading2} mb-8`}>Logistics & Progress</h2>
              
              {config.showMatrixProgress && matrix && matrix.phases.length > 0 && (
                <div className="mb-12">
                   <h3 className={`${theme.heading3} border-b border-current/20 pb-2 mb-4 opacity-70`}>Milestone Phases</h3>
                   <div className="space-y-4">
                     {matrix.phases.map(phase => {
                       const blocksInPhase = matrix.blocks.filter(b => b.phase_id === phase.id);
                       const total = blocksInPhase.reduce((sum, b) => sum + b.total_tasks, 0);
                       const comp = blocksInPhase.reduce((sum, b) => sum + b.completed_tasks, 0);
                       const pct = total === 0 ? 0 : Math.round((comp / total) * 100);
                       return (
                         <div key={phase.id} className={`flex items-center gap-4 text-sm font-medium ${theme.card} p-4`}>
                            <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: phase.color_hex }} />
                            <div className="w-1/3 font-bold">{phase.name}</div>
                            <div className="flex-1 bg-current/10 h-2 rounded-full overflow-hidden">
                              <div className="h-full" style={{ width: `${pct}%`, backgroundColor: phase.color_hex }} />
                            </div>
                            <div className="w-16 text-right font-black opacity-80">{pct}%</div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              )}

              <div className="absolute bottom-12 left-12 right-12 text-center text-[10px] font-bold uppercase tracking-widest border-t border-current/20 pt-4 opacity-50">
                Matrix
              </div>
            </div>
          )}



          {/* PAGE 4+: TASK DRILLDOWN */}
          {config.showTaskDrilldown && Object.entries(tasksByPhase).map(([phase, tasks], index) => (
            <div key={`phase-${index}`} className={`pdf-page w-full min-h-[297mm] p-12 pb-32 shadow-2xl relative ${theme.page} print:shadow-none`}>
              <h2 className={`${theme.heading2} mb-8`}>Execution: {phase}</h2>
              
              <div className="space-y-6">
                {tasks.map(task => (
                  <div key={task.id} className={`${theme.card} p-5 break-inside-avoid`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex gap-2 items-center mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${theme.accentBg}`}>
                            {task.status}
                          </span>
                          {task.zone_name && <span className="text-[10px] font-bold opacity-70">{task.zone_name}</span>}
                        </div>
                        <h4 className="text-sm font-bold mt-1">{task.title}</h4>
                      </div>
                      <div className="text-right text-[10px] font-bold opacity-50">
                        {task.task_code || task.uid}
                      </div>
                    </div>
                    
                    {task.checklists && task.checklists.length > 0 && (
                      <div className="mt-4 p-3 rounded bg-current/5 border border-current/10">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-70">Checklists</p>
                        <ul className="space-y-1.5">
                          {task.checklists.map((c: any) => (
                            <li key={c.id} className="text-xs flex items-start gap-2 opacity-90">
                              <span>{c.is_completed ? "✅" : "⬜"}</span>
                              <span>{c.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="absolute bottom-12 left-12 right-12 text-center text-[10px] font-bold uppercase tracking-widest border-t border-current/20 pt-4 opacity-50">
                Execution Log - {phase}
              </div>
            </div>
          ))}

          {/* PAGE 5+: MEDIA GALLERY (Grouped by Asset) */}
          {config.showMediaGallery && assetGroups.map(group => {
            const selectedFloorPlan = group.floorPlanUrl && config.selectedImageUrls.includes(group.floorPlanUrl) ? group.floorPlanUrl : null;
            
            if (!selectedFloorPlan) return null;

            return (
              <div key={group.assetId} className={`pdf-page w-full min-h-[297mm] p-12 pb-32 shadow-2xl relative ${theme.page} print:shadow-none mb-12`}>
                <h2 className={`${theme.heading2} mb-2`}>Visual Context: {group.assetTitle}</h2>
                <p className={`${theme.heading3} mb-8 opacity-70`}>Floor Plan</p>

                {/* Blueprint Render */}
                {selectedFloorPlan && (
                  <div className="mb-12 border-2 border-current/10 p-2 rounded-xl bg-current/5 shadow-inner">
                    <img src={selectedFloorPlan} alt={group.assetTitle} className="w-full h-auto rounded" crossOrigin="anonymous" />
                  </div>
                )}



                <div className="absolute bottom-12 left-12 right-12 text-center text-[10px] font-bold uppercase tracking-widest border-t border-current/20 pt-4 opacity-50">
                  Media Gallery: {group.assetTitle}
                </div>
              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
}
