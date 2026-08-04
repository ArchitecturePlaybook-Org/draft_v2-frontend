"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { ProjectHeroHeader } from "@/components/projects/ProjectHeroHeader";
import { KanbanTab } from "@/components/projects/KanbanTab";
import { MilestoneMatrixView } from "@/components/matrix/MilestoneMatrixView";
import { templateToProject, PublicTemplate } from "@/lib/template-to-project-adapter";
import { ProjectDetail } from "@/types/projects";
import { useProjectStore } from "@/store/project-store";

export default function TemplateDetailPage() {
  const { share_token } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [template, setTemplate] = useState<PublicTemplate | null>(null);
  const [matrixPayload, setMatrixPayload] = useState<any>(null);
  const [projectMock, setProjectMock] = useState<ProjectDetail | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"kanban" | "matrix">("matrix");
  
  useEffect(() => {
    async function loadTemplate() {
      try {
        const data = await projectsApi.getPublicTemplate(share_token as string);
        setTemplate(data);
        const mock = templateToProject(data);
        setProjectMock(mock);
        
        // Inject into global store for KanbanTab to read
        useProjectStore.setState({ project: mock });

        // Load matrix
        try {
          const matrixData = await projectsApi.getPublicTemplateMatrix(share_token as string);
          setMatrixPayload(matrixData);
          useProjectStore.setState({ zones: matrixData.zones, phases: matrixData.phases });
        } catch (e) {
          console.warn("Failed to load matrix for template");
        }
        
      } catch (err: any) {
        toast.error("Template not found or link expired.");
      } finally {
        setLoading(false);
      }
    }
    
    if (share_token) loadTemplate();
    
    return () => {
      // clean up global store
      useProjectStore.setState({ project: null, zones: [], phases: [] });
    };
  }, [share_token]);

  const handleSaveToLibrary = async () => {
    if (!isAuthenticated) {
      toast.info("Please sign in to save templates to your library");
      router.push(`/login?next=/share/template/${share_token}`);
      return;
    }

    setSaving(true);
    try {
      const res = await projectsApi.savePublicTemplateToLibrary(share_token as string);
      toast.success(res.saved ? "Saved to your library!" : "Already in your library");
      setTemplate(prev => prev ? { ...prev, is_in_library: true } : null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-surface-500 uppercase tracking-widest">Loading Template Preview...</p>
      </div>
    );
  }
  
  if (!projectMock || !template) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-xl font-black mb-2">Link Expired or Invalid</h2>
        <p className="text-surface-500 max-w-sm mb-6">This template share link is no longer active, or the template has been made private.</p>
        <button onClick={() => router.push('/dashboard')} className="bg-surface-200 text-foreground px-6 py-2 rounded-xl text-sm font-bold">Go Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Banner */}
      <div className="sticky top-0 z-50 bg-surface-100/90 backdrop-blur-xl border-b border-surface-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold font-mono">AP</div>
          <h1 className="font-bold text-sm text-foreground uppercase tracking-widest">Template Preview</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {!isAuthenticated && (
            <button onClick={() => router.push(`/login?next=/share/template/${share_token}`)} className="text-xs font-bold text-surface-500 hover:text-foreground">
              Sign In
            </button>
          )}
          {template.is_in_library ? (
            <button onClick={() => router.push('/dashboard/templates')} className="bg-surface-200 text-foreground text-xs font-bold px-4 py-2 rounded-lg hover:bg-surface-300">
              View Library →
            </button>
          ) : (
            <button onClick={handleSaveToLibrary} disabled={saving} className="bg-accent text-background text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2">
              {saving ? "Saving..." : "📥 Save to Library"}
            </button>
          )}
        </div>
      </div>

      <main className="p-4 md:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
        <ProjectHeroHeader project={projectMock as any} readOnly />
        
        <div className="mt-8">
          {/* Mock Tab Bar */}
          <div className="flex items-center gap-6 border-b border-surface-200 mb-6 px-4 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "kanban" ? "border-accent text-accent" : "border-transparent text-surface-400 hover:text-foreground"
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "matrix" ? "border-accent text-accent" : "border-transparent text-surface-400 hover:text-foreground"
              }`}
            >
              Construction Matrix
            </button>
            
            {/* Disabled Tabs */}
            <div title="Available in your project workspace" className="pb-4 text-xs font-black uppercase tracking-widest border-b-2 border-transparent text-surface-300 cursor-not-allowed opacity-50 whitespace-nowrap">
              Gantt
            </div>
            <div title="Available in your project workspace" className="pb-4 text-xs font-black uppercase tracking-widest border-b-2 border-transparent text-surface-300 cursor-not-allowed opacity-50 whitespace-nowrap">
              Data Hub
            </div>
            <div title="Available in your project workspace" className="pb-4 text-xs font-black uppercase tracking-widest border-b-2 border-transparent text-surface-300 cursor-not-allowed opacity-50 whitespace-nowrap">
              Site Ops
            </div>
          </div>

          {/* Active Tab Content */}
          <div className="bg-transparent rounded-xl">
            {activeTab === "kanban" && <KanbanTab readOnly />}
            {activeTab === "matrix" && (
              <MilestoneMatrixView 
                projectUid={projectMock.uid}
                projectTasks={projectMock.tasks}
                readOnly
                userRole="viewer"
                initialPayload={matrixPayload}
              />
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 mb-8 text-center bg-surface-100 rounded-3xl p-8 md:p-12 border border-surface-200 shadow-xl">
          <h2 className="text-2xl font-black text-foreground mb-4 tracking-tight">Ready to use this blueprint?</h2>
          <p className="text-surface-500 max-w-md mx-auto mb-8 font-medium">
            Save this template to your library to use it for your next project. It's completely free.
          </p>
          {template.is_in_library ? (
            <button onClick={() => router.push('/dashboard/templates')} className="bg-surface-200 text-foreground text-sm font-bold px-8 py-4 rounded-xl hover:bg-surface-300 transition-all shadow-lg">
              View in My Library →
            </button>
          ) : (
            <button onClick={handleSaveToLibrary} disabled={saving} className="bg-accent text-background text-sm font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20">
              {saving ? "Saving..." : "📥 Save to My Library — Free"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
