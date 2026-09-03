"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Layers,
  Box,
  Share2,
  FileSpreadsheet,
  CheckCircle2,
  Receipt,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  PackageCheck,
  Building2,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { TaskMaterialRequirement, MasterMaterial } from "@/domains/inventory/types";
import { SpatialZone, MilestonePhase, Task } from "@/types/projects";
import { DirectPostOpportunityModal } from "@/components/marketplace/DirectPostOpportunityModal";
import { toast } from "sonner";

interface MilestoneBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  projectName?: string;
  projectLocation?: string;
  phases?: MilestonePhase[];
  zones?: SpatialZone[];
  projectTasks?: Task[];
  initialPhaseId?: number;
}

export interface AggregatedMilestoneMaterial {
  material_id: string;
  material_name: string;
  category: string;
  unit: string;
  standard_rate: number;
  total_planned: number;
  total_issued: number;
  total_consumed: number;
  balance_remaining: number;
  available_stock: number;
  estimated_cost: number;
  task_count: number;
  tasks: Array<{ task_id: number; task_title: string; planned: number; issued: number }>;
}

export const MilestoneBOMModal: React.FC<MilestoneBOMModalProps> = ({
  isOpen,
  onClose,
  projectUid,
  projectName = "Project",
  projectLocation = "",
  phases = [],
  zones = [],
  projectTasks = [],
  initialPhaseId,
}) => {
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<TaskMaterialRequirement[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | "ALL">(initialPhaseId ?? "ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Direct Post Modal state
  const [showDirectPostModal, setShowDirectPostModal] = useState(false);
  const [postInitialTitle, setPostInitialTitle] = useState("");
  const [postInitialItems, setPostInitialItems] = useState<any[]>([]);
  const [postSourceContext, setPostSourceContext] = useState("");

  useEffect(() => {
    if (isOpen && initialPhaseId !== undefined) {
      setSelectedPhaseId(initialPhaseId);
    }
  }, [isOpen, initialPhaseId]);

  useEffect(() => {
    if (isOpen && projectUid) {
      setLoading(true);
      inventoryApi
        .getTaskRequirements({ project: projectUid })
        .then((data) => {
          setRequirements(data || []);
        })
        .catch((err) => {
          console.error("Failed to load project requirements", err);
          toast.error("Could not load project BOM data.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, projectUid]);

  // Create a map from taskId to Task details (phase, zone, etc.)
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of projectTasks) {
      if (t.id !== undefined && t.id !== null) map.set(String(t.id), t);
      if (t.uid) map.set(String(t.uid), t);
    }
    return map;
  }, [projectTasks]);

  // Aggregate requirements by Material ID
  const aggregatedMaterials = useMemo(() => {
    const map = new Map<string, AggregatedMilestoneMaterial>();

    for (const req of requirements) {
      const taskIdStr = typeof req.task === "object" && req.task !== null
        ? String((req.task as any).id || (req.task as any).uid || "")
        : String(req.task || (req as any).task_id || "");

      // If filtering by phase, inspect the associated task
      if (selectedPhaseId !== "ALL") {
        const t = taskMap.get(taskIdStr);
        if (t) {
          // Check phase
          const taskPhaseId = (t as any).phase_id || (t as any).phase?.id;
          if (taskPhaseId && taskPhaseId !== selectedPhaseId) {
            continue;
          }
        }
      }

      // Check category filter
      const cat = req.material_category || "GENERAL";
      if (selectedCategory !== "ALL" && cat !== selectedCategory) {
        continue;
      }

      // Check search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (req.material_name || "").toLowerCase().includes(q);
        const matchCat = cat.toLowerCase().includes(q);
        if (!matchName && !matchCat) continue;
      }

      const matId = req.material || req.material_name;
      const existing = map.get(matId);

      const planned = Number(req.planned_qty) || 0;
      const issued = Number(req.issued_qty) || 0;
      const consumed = Number(req.consumed_qty) || 0;
      const balance = planned - issued;
      const rate = Number(req.standard_rate) || 380;
      const stock = Number(req.available_stock) || 0;

      const taskDetail = {
        task_id: req.task,
        task_title: req.notes || `Task #${req.task}`,
        planned,
        issued,
      };

      if (!existing) {
        map.set(matId, {
          material_id: matId,
          material_name: req.material_name,
          category: cat,
          unit: req.material_unit || "BAG",
          standard_rate: rate,
          total_planned: planned,
          total_issued: issued,
          total_consumed: consumed,
          balance_remaining: Math.max(0, balance),
          available_stock: stock,
          estimated_cost: planned * rate,
          task_count: 1,
          tasks: [taskDetail],
        });
      } else {
        existing.total_planned += planned;
        existing.total_issued += issued;
        existing.total_consumed += consumed;
        existing.balance_remaining += Math.max(0, balance);
        existing.estimated_cost += planned * rate;
        existing.task_count += 1;
        existing.tasks.push(taskDetail);
      }
    }

    return Array.from(map.values());
  }, [requirements, selectedPhaseId, selectedCategory, searchQuery, taskMap]);

  // Overall KPIs
  const totalPlannedCost = useMemo(() => {
    return aggregatedMaterials.reduce((acc, m) => acc + m.estimated_cost, 0);
  }, [aggregatedMaterials]);

  const totalItemCount = aggregatedMaterials.length;

  const currentPhaseName = useMemo(() => {
    if (selectedPhaseId === "ALL") return "All Milestone Phases";
    const found = phases.find((p) => p.id === selectedPhaseId);
    return found ? found.name : `Phase #${selectedPhaseId}`;
  }, [selectedPhaseId, phases]);

  // Handler for Direct Post as Marketplace Tender
  const handleOpenDirectPost = () => {
    if (aggregatedMaterials.length === 0) {
      toast.error("No material requirements found to post.");
      return;
    }

    const title = `Procurement Tender: ${currentPhaseName} - ${projectName}`;
    const items = aggregatedMaterials.map((m) => ({
      name: m.material_name,
      category: m.category,
      quantity: m.balance_remaining > 0 ? m.balance_remaining : m.total_planned,
      unit: m.unit,
      rate: m.standard_rate,
    }));

    setPostInitialTitle(title);
    setPostInitialItems(items);
    setPostSourceContext(`Milestone Phase: ${currentPhaseName} (${projectName})`);
    setShowDirectPostModal(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in transition-opacity"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-surface-100 border border-surface-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200">
          
          {/* Header Strip */}
          <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-surface-200 bg-surface-50/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-primary tracking-tight">
                    Milestone Bill of Materials (BOM) & Sourcing Hub
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-surface-200 text-primary border border-surface-300">
                    {projectName}
                  </span>
                </div>
                <p className="text-xs text-surface-500 font-medium hidden sm:block">
                  Aggregated material requirements, fulfillment balances, and direct marketplace tendering across milestones.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenDirectPost}
                disabled={aggregatedMaterials.length === 0}
                className="h-9 px-4 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" /> Post Milestone Tender
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-surface-200 hover:bg-surface-300 flex items-center justify-center text-surface-500 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="px-6 sm:px-8 py-3.5 border-b border-surface-200 bg-surface-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Phase Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Phase:</span>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  className="h-8 px-3 bg-surface-100 border border-surface-200 rounded-lg text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
                >
                  <option value="ALL">All Phases ({phases.length})</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-8 px-3 bg-surface-100 border border-surface-200 rounded-lg text-xs font-bold text-primary outline-none focus:border-accent cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="CEMENT">Cement & Binder</option>
                  <option value="STRUCTURAL">Structural & Rebar</option>
                  <option value="SAND_AGGREGATE">Sand & Aggregates</option>
                  <option value="MASONRY">Masonry & Blocks</option>
                  <option value="FINISHING">Finishing & Tiles</option>
                  <option value="MEP">MEP & Utilities</option>
                  <option value="WATERPROOFING">Waterproofing</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search material..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-surface-100 border border-surface-200 rounded-lg text-xs font-medium text-primary outline-none focus:border-accent"
                />
              </div>

              {/* Aggregated Total Metric */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl">
                <span className="text-[10px] font-bold text-surface-400 uppercase">Est. Milestone Value:</span>
                <span className="text-xs font-black text-accent">₹{totalPlannedCost.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
            {loading ? (
              <div className="py-20 text-center text-xs text-surface-400 animate-pulse">
                Fetching project milestone requirements...
              </div>
            ) : aggregatedMaterials.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-surface-200 rounded-2xl bg-surface-50 p-8 space-y-3">
                <PackageCheck className="w-10 h-10 text-surface-400 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-primary">No Material Requirements Found</h4>
                  <p className="text-xs text-surface-400 max-w-md mx-auto">
                    No task Bill of Materials (BOM) have been calculated or attached for this phase yet. Open individual tasks to attach engineering estimators.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-50 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-200/60 text-surface-400 uppercase tracking-wider font-bold border-b border-surface-200 text-[10px] sticky top-0 bg-surface-100 z-10">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Material Specification</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Total Planned</th>
                      <th className="py-3 px-4 text-right">Issued Qty</th>
                      <th className="py-3 px-4 text-right">Balance to Procure</th>
                      <th className="py-3 px-4 text-right">Site Stock</th>
                      <th className="py-3 px-4 text-right">Est. Package Value</th>
                      <th className="py-3 px-4 text-center">Tasks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/70 text-primary">
                    {aggregatedMaterials.map((mat, idx) => (
                      <tr key={mat.material_id} className="hover:bg-surface-200/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-surface-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-primary block">{mat.material_name}</span>
                          <span className="text-[10px] text-surface-400">@ ₹{mat.standard_rate} / {mat.unit}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-surface-200 text-surface-500 border border-surface-300">
                            {mat.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary">
                          {mat.total_planned.toLocaleString("en-IN")}{" "}
                          <span className="text-[10px] text-surface-400 font-normal">{mat.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-surface-500">
                          {mat.total_issued.toLocaleString("en-IN")}{" "}
                          <span className="text-[10px] text-surface-400 font-normal">{mat.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-black ${
                              mat.balance_remaining > 0 ? "text-amber-500" : "text-semantic-green"
                            }`}
                          >
                            {mat.balance_remaining.toLocaleString("en-IN")} {mat.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-surface-500">
                          {mat.available_stock.toLocaleString("en-IN")} {mat.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-accent">
                          ₹{mat.estimated_cost.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-200 text-primary">
                            {mat.task_count} Task{mat.task_count > 1 ? "s" : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Summary Strip */}
          <div className="px-6 sm:px-8 py-4 border-t border-surface-200 bg-surface-50/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 text-xs text-surface-500">
              <span>
                Total Items: <strong className="text-primary">{totalItemCount}</strong>
              </span>
              <span>•</span>
              <span>
                Total Milestone Value: <strong className="text-accent">₹{totalPlannedCost.toLocaleString("en-IN")}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 bg-surface-200 hover:bg-surface-300 text-primary rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleOpenDirectPost}
                disabled={aggregatedMaterials.length === 0}
                className="h-10 px-6 bg-accent hover:opacity-90 text-background rounded-xl font-bold uppercase text-xs tracking-wider shadow-md shadow-accent/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Share2 className="w-4 h-4" /> Post Milestone Tender
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Direct Post Opportunity Modal */}
      <DirectPostOpportunityModal
        isOpen={showDirectPostModal}
        onClose={() => setShowDirectPostModal(false)}
        initialTitle={postInitialTitle}
        initialLocation={projectLocation}
        initialItems={postInitialItems}
        sourceContext={postSourceContext}
        projectUid={projectUid}
      />
    </>
  );
};
