"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { ProjectDetail, ProjectAsset, Task } from "@/types/projects";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

export default function FloorPlanReportPage() {
  const { id, assetId } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [asset, setAsset] = useState<ProjectAsset | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projData = await projectsApi.getProjectDetails(id as string);
        setProject(projData);

        const targetAsset = projData.assets.find(a => a.id.toString() === assetId);
        if (targetAsset) {
          setAsset(targetAsset);

          const tasks = projData.tasks.filter(t => 
            t.asset_links?.some(l => l.canonical_uid === targetAsset.canonical_uid)
          );
          setLinkedTasks(tasks);
        }
      } catch (err) {
        console.error("Failed to fetch report data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, assetId]);

  const handleExportAndSave = async () => {
    if (!reportRef.current || !project || !asset) return;
    setIsExporting(true);
    toast.info("Generating Report... Please wait.");
    
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let position = 0;
      let heightLeft = pdfHeight;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      // 1. Download to user's machine
      const fileName = `FloorPlan_Report_${asset.title.replace(/\s+/g, "_")}.pdf`;
      pdf.save(fileName);

      // 2. Upload to Master Data Hub
      const pdfBlob = pdf.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      await projectsApi.uploadProjectAsset(project.id, "document", file, `Floor Plan Report: ${asset.title}`);
      
      toast.success("Report downloaded and saved to Master Data Hub!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <div className="py-32 flex justify-center"><Spinner size="lg" label="Compiling report data..." /></div>;
  if (!project || !asset) return <div className="text-center py-32">Data not found.</div>;

  return (
    <div className="bg-surface-50 min-h-screen pb-20">
      {/* Top Bar (Not Printed) */}
      <div className="bg-surface-100 border-surface-200 border-b border-surface-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <button onClick={() => window.close()} className="text-sm font-bold text-surface-500 text-surface-400 hover:text-primary mr-4">← Close</button>
          <span className="text-sm font-bold text-primary">Floor Plan Special Report</span>
        </div>
        <button 
          onClick={handleExportAndSave}
          disabled={isExporting}
          className="px-6 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {isExporting ? "Generating..." : "Export & Save PDF"}
        </button>
      </div>

      {/* Report Container */}
      <div className="flex justify-center mt-8">
        <div 
          ref={reportRef} 
          className="bg-surface-100 border-surface-200 w-[210mm] min-h-[297mm] p-12 shadow-2xl border border-surface-200 print:shadow-none print:border-none"
        >
          {/* Report Header */}
          <div className="border-b-2 border-primary pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-primary mb-2 uppercase tracking-tight">Floor Plan Report</h1>
              <h2 className="text-xl font-bold text-surface-600 text-surface-300">{asset.title}</h2>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Project</p>
              <p className="text-sm font-bold text-primary">{project.title}</p>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-2">Date Generated</p>
              <p className="text-sm font-bold text-primary">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Asset Info */}
          <div className="mb-10">
            <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4 border-b border-surface-100 pb-2">Floor Plan / Drawing</h3>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden flex items-center justify-center p-4">
               {asset.file.match(/\.(png|jpg|jpeg|gif|webp)(?:\?.*)?$/i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.file} alt="Floor Plan" className="max-h-[400px] object-contain rounded-xl shadow-sm" crossOrigin="anonymous" />
                ) : (
                  <div className="py-20 text-surface-400 font-bold">No visual preview available.</div>
                )}
            </div>
          </div>

          {/* Site Photos */}
          {asset.site_photos && asset.site_photos.length > 0 && (
            <div className="mb-10 break-inside-avoid">
              <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4 border-b border-surface-100 pb-2">Site Photos ({asset.site_photos.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {asset.site_photos.map((photo, i) => {
                  const colLetter = String.fromCharCode(65 + photo.grid_col);
                  const rowNum = photo.grid_row + 1;
                  return (
                    <div key={`photo-${i}`} className="bg-surface-50 border border-surface-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                      <div className="aspect-square relative bg-surface-200">
                        <img src={photo.image} alt={photo.caption} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">
                          {colLetter}{rowNum}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-bold text-surface-800 mb-1">{photo.caption || "No caption"}</p>
                        <p className="text-[9px] text-surface-500 uppercase tracking-widest">{new Date(photo.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linked Tasks Summary */}
          <div className="mb-10">
            <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4 border-b border-surface-100 pb-2">Linked Task Execution Summaries ({linkedTasks.length})</h3>
            
            {linkedTasks.length === 0 ? (
              <p className="text-sm text-surface-500 text-surface-400 italic">No tasks are currently linked to this floor plan.</p>
            ) : (
              <div className="space-y-8">
                {linkedTasks.map(task => (
                  <div key={task.id} className="border border-surface-200 rounded-xl p-6 bg-surface-50/50 break-inside-avoid">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex gap-2 items-center mb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-accent text-background px-2 py-0.5 rounded">
                            {task.status}
                          </span>
                          {task.zone_name && <span className="text-[10px] font-bold text-surface-500 text-surface-400">{task.zone_name}</span>}
                        </div>
                        <h4 className="text-lg font-bold text-primary">{task.title}</h4>
                      </div>
                      <div className="text-right text-[10px] font-bold text-surface-500 text-surface-400">
                        ID: {task.task_code || task.uid}
                      </div>
                    </div>

                    <p className="text-sm text-surface-600 text-surface-300 mb-4">{task.description || "No description provided."}</p>

                    {/* Checklists */}
                    {task.checklists && task.checklists.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Checklists</h5>
                        <ul className="space-y-1">
                          {task.checklists.map((c: any) => (
                            <li key={c.id} className="text-xs font-medium text-surface-600 text-surface-300 flex items-start gap-2">
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
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
