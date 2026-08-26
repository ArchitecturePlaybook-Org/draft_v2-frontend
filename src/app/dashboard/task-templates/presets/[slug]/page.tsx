"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { MilestoneMatrixView } from "@/components/matrix/MilestoneMatrixView";
import { EstablishBlueprintModal } from "@/components/projects/EstablishBlueprintModal";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { ChevronLeft, Sparkles, Layers } from "lucide-react";
import { toast } from "sonner";

export default function PresetMatrixPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [payload, setPayload] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const planLimits = usePlanLimits();

  const fetchPreset = () => {
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
  };

  useEffect(() => {
    fetchPreset();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-surface-400">Loading preset matrix preview…</p>
      </div>
    );
  }

  const activePresetSlug = payload?.preset_slug || payload?.slug || slug;

  return (
    <div className="w-full max-w-full space-y-3.5">
      {/* Top Navigation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-50 border border-surface-300 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/task-templates?tab=project_presets")}
            className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-300 flex items-center justify-center text-foreground transition-all shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-surface-100 border border-surface-200 text-foreground flex items-center justify-center text-base font-bold">
                {payload?.icon_emoji || "🏠"}
              </span>
              <h1 className="text-sm font-extrabold text-foreground">{payload?.project_name || "Project Preset Preview"}</h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-surface-100 text-surface-600 border border-surface-200">
                {payload?.category || "QA/QC PRESET"}
              </span>
            </div>
            <p className="text-xs text-surface-500 font-medium mt-0.5 max-w-2xl">
              {payload?.description || "Interactive preview of 6 standard matrix stages, spatial zones, and milestone packages."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (!planLimits.isLoading && !planLimits.canCreateProject) {
                setShowUpgradeModal(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="h-8 px-4 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Use Preset</span>
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-center gap-2 p-2.5 bg-surface-100 border border-surface-300 rounded-lg text-xs text-surface-500 font-medium">
        <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>
          Preset Matrix Live Preview: Interactive view of matrix stages, spatial zones, milestone packages, and QA/QC inspection checklists.
        </span>
      </div>

      {/* Exact Same Matrix Component UI */}
      {payload && (
        <MilestoneMatrixView
          projectUid={slug}
          projectTasks={[]}
          userRole="admin"
          readOnly={false}
          initialPayload={payload}
        />
      )}

      {/* Project Establishment Modal */}
      <EstablishBlueprintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(created) => {
          setShowCreateModal(false);
          const targetUid = created?.uid || (created?.id ? String(created.id) : '');
          if (targetUid) {
            router.push(`/dashboard/projects/${targetUid}`);
          } else {
            router.push("/dashboard/projects");
          }
        }}
        initialData={{
          title: payload?.project_name ? `${payload.project_name}` : "",
          description: payload?.description || "",
          preset_slug: activePresetSlug,
          kind: payload?.category || "Residential",
        }}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="project"
        currentPlan={planLimits.subscription?.plan?.name}
      />
    </div>
  );
}
