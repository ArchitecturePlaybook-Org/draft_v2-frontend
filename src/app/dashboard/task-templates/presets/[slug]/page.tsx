"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { MilestoneMatrixView } from "@/components/matrix/MilestoneMatrixView";
import { ChevronLeft, Sparkles, Building2, Layers } from "lucide-react";
import { toast } from "sonner";

export default function PresetMatrixPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [payload, setPayload] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    projectsApi.getPresetMatrixPreview(slug)
      .then((data) => {
        setPayload(data);
      })
      .catch((err) => {
        console.error("Failed to load preset preview matrix", err);
        toast.error("Failed to load preset matrix preview.");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-surface-400">Loading preset matrix preview…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Top Navigation & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-surface-50 border border-surface-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/task-templates")}
            className="w-9 h-9 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-300 flex items-center justify-center text-foreground transition-all shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-lg font-bold">
                {payload?.icon_emoji || "🏠"}
              </span>
              <h1 className="text-base font-black text-foreground">{payload?.project_name || "Project Preset Preview"}</h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {payload?.category || "QA/QC PRESET"}
              </span>
            </div>
            <p className="text-xs text-surface-500 font-medium mt-1 max-w-2xl">
              {payload?.description || "Interactive preview of 6 standard matrix stages, spatial zones, and milestone packages."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Use Preset in New Project</span>
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-center gap-2.5 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-medium">
        <Layers className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Preset Matrix Live Preview: This interactive view demonstrates the complete Phase × Spatial Zone matrix grid and pre-loaded QA/QC checklists for this blueprint.
        </span>
      </div>

      {/* Exact Same Matrix Component UI */}
      {payload && (
        <MilestoneMatrixView
          projectUid="0"
          projectTasks={[]}
          readOnly={true}
          initialPayload={payload}
        />
      )}
    </div>
  );
}
