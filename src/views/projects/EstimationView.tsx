"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useProjectStore } from "@/store/project-store";
import { Spinner } from "@/components/ui/Spinner";
import { FloorPlanSection, FloorPlanData } from "@/components/estimation/FloorPlanSection";
import { InfraLensScheduleView } from "@/components/estimation/InfraLensScheduleView";
import { BOQItemRow } from "@/domains/infralens-boq/types";
import { MeasuredShape } from "@/components/estimation/SimpleSvgLayer";
import { 
  useEstimationWorkspaceStore, 
  PlanWorkspaceState, 
  createDefaultBoqItems 
} from "@/domains/infralens-boq/estimation-workspace-store";
import { Building2, Layers, Plus, UploadCloud, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface EstimationViewProps {
  projectUid: string;
}

export function EstimationView({ projectUid }: EstimationViewProps) {
  const { project, isLoading, fetchProject } = useProjectStore();

  const {
    projects,
    setPlanState,
    setSelectedCity,
    setCustomMaterialRates,
    setCustomLabourRates,
    getOrCreateProjectData,
  } = useEstimationWorkspaceStore();

  // Load or initialize persistent project estimation data
  const projectData = useMemo(() => {
    return projects[projectUid] || getOrCreateProjectData(projectUid);
  }, [projects, projectUid, getOrCreateProjectData]);

  const selectedCity = projectData.selectedCity || "delhi";
  const customMaterialRates = projectData.customMaterialRates || {};
  const customLabourRates = projectData.customLabourRates || {};
  const planStates = projectData.planStates || {};

  const handleUpdateMaterialRate = (priceId: string, rate: number | undefined) => {
    const next = { ...customMaterialRates };
    if (rate === undefined || isNaN(rate)) {
      delete next[priceId];
    } else {
      next[priceId] = rate;
    }
    setCustomMaterialRates(projectUid, next);
  };

  const handleUpdateLabourRate = (priceId: string, rate: number | undefined) => {
    const next = { ...customLabourRates };
    if (rate === undefined || isNaN(rate)) {
      delete next[priceId];
    } else {
      next[priceId] = rate;
    }
    setCustomLabourRates(projectUid, next);
  };

  const handleResetMaterialRates = () => setCustomMaterialRates(projectUid, {});
  const handleResetLabourRates = () => setCustomLabourRates(projectUid, {});

  const handleSelectCity = (city: string) => {
    setSelectedCity(projectUid, city);
  };

  useEffect(() => {
    fetchProject(projectUid);
  }, [projectUid, fetchProject]);

  const floorPlans: FloorPlanData[] = useMemo(() => {
    if (!project?.assets) return [];
    return project.assets
      .filter((a) => a.category === "2d_plan")
      .map((a) => ({
        id: a.id,
        title: a.title,
        file: a.file,
        size: a.size || 0,
      }));
  }, [project]);

  // Demo fallback plan if project has no 2D plans uploaded yet
  const [useDemoPlan, setUseDemoPlan] = useState(false);

  useEffect(() => {
    if (floorPlans.length === 0 && !isLoading) {
      setUseDemoPlan(true);
    }
  }, [floorPlans, isLoading]);

  const activePlans: FloorPlanData[] = useMemo(() => {
    if (floorPlans.length > 0) return floorPlans;
    if (useDemoPlan) {
      return [
        {
          id: -1,
          title: "Sample 2D Architectural Floor Plan",
          file: "/demo/sample_floorplan.svg",
          size: 154200,
        },
      ];
    }
    return [];
  }, [floorPlans, useDemoPlan]);

  // Initialize or get state for a plan
  const getPlanState = (planId: number): PlanWorkspaceState => {
    if (planStates[planId]) return planStates[planId];

    return {
      scale: 0.025,
      isCalibrated: false,
      unit: 'm',
      shapes: [],
      boqItems: createDefaultBoqItems(),
    };
  };

  const updatePlanState = (planId: number, updates: Partial<PlanWorkspaceState>) => {
    setPlanState(projectUid, planId, updates);
  };

  // Aggregate all BOQ items across all floor plans for the bottom InfraLens schedule
  const allBoqItems = useMemo(() => {
    const all: BOQItemRow[] = [];
    activePlans.forEach((plan) => {
      const state = getPlanState(plan.id);
      all.push(...state.boqItems);
    });
    return all;
  }, [activePlans, planStates]);

  if (isLoading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" label="Loading Estimation Workspace..." />
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-surface-50 p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in pb-24">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-card p-4 sm:p-5 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-lg">
            📐
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
              Floor Plan Estimation & BOQ Engine
            </h1>
            <p className="text-xs font-semibold text-text-secondary mt-0.5">
              Project: <span className="font-bold text-foreground">{project.title}</span> • {activePlans.length}{" "}
              {activePlans.length === 1 ? "Floor Plan" : "Floor Plans"} Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Auto-Save Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Auto-Saved</span>
          </div>

          {useDemoPlan && floorPlans.length === 0 && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Using Sample Demo Plan
            </span>
          )}
          <Link
            href={`/dashboard/projects/${projectUid}`}
            className="text-xs font-bold text-text-secondary hover:text-foreground px-3 py-1.5 rounded-xl border border-surface-200 hover:bg-surface-100 transition-colors"
          >
            Back to Project
          </Link>
        </div>
      </div>

      {/* Multi-Floor Plan Sections: Under every floor plan is its BOQ Table */}
      <div className="space-y-8">
        {activePlans.length === 0 ? (
          <div className="bg-surface-card rounded-3xl border border-dashed border-surface-300 p-8 text-center space-y-3">
            <UploadCloud className="w-10 h-10 text-surface-400 mx-auto" />
            <h3 className="text-base font-black text-foreground">No 2D Floor Plans Uploaded</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              Upload architectural drawing images (PNG, JPG, SVG) to your project data hub or load the sample floor plan to begin measuring.
            </p>
            <button
              type="button"
              onClick={() => setUseDemoPlan(true)}
              className="bg-accent text-background font-black text-xs px-4 py-2 rounded-xl shadow-sm"
            >
              Load Demo Floor Plan
            </button>
          </div>
        ) : (
          activePlans.map((plan) => {
            const planState = getPlanState(plan.id);

            return (
              <FloorPlanSection
                key={plan.id}
                plan={plan}
                selectedCity={selectedCity}
                boqItems={planState.boqItems}
                shapes={planState.shapes}
                scale={planState.scale}
                isCalibrated={planState.isCalibrated}
                unit={planState.unit || 'm'}
                onUpdateBoqItems={(items) => updatePlanState(plan.id, { boqItems: items })}
                onUpdateShapes={(shapes) => updatePlanState(plan.id, { shapes })}
                onUpdateScale={(scale, unit) => updatePlanState(plan.id, { scale, isCalibrated: true, ...(unit ? { unit } : {}) })}
                onUpdateUnit={(unit) => updatePlanState(plan.id, { unit })}
                customMaterialRates={customMaterialRates}
                customLabourRates={customLabourRates}
              />
            );
          })
        )}
      </div>

      {/* End Section: Consolidated Material Schedule, Labour Schedule & Cost Summary */}
      <InfraLensScheduleView
        allBoqItems={allBoqItems}
        selectedCity={selectedCity}
        onSelectCity={handleSelectCity}
        projectName={project.title}
        customMaterialRates={customMaterialRates}
        customLabourRates={customLabourRates}
        onUpdateMaterialRate={handleUpdateMaterialRate}
        onUpdateLabourRate={handleUpdateLabourRate}
        onResetMaterialRates={handleResetMaterialRates}
        onResetLabourRates={handleResetLabourRates}
      />
    </div>
  );
}
