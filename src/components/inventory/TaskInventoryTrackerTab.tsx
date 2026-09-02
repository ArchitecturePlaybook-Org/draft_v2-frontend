"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  ArrowUpRight,
  CheckCircle2,
  PackageCheck,
  Calculator,
  Eye,
  ClipboardList,
} from "lucide-react";
import { TaskMaterialRequirement, MasterMaterial } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { TaskMaterialCalculatorModal } from "./TaskMaterialCalculatorModal";
import { MaterialIssueModal } from "./MaterialIssueModal";
import { MaterialDetailModal } from "./MaterialDetailModal";
import { PlaceRequisitionOrderModal } from "./PlaceRequisitionOrderModal";
import { DirectPostOpportunityModal } from "@/components/marketplace/DirectPostOpportunityModal";
import { Share2 } from "lucide-react";

interface TaskInventoryTrackerTabProps {
  taskId: number;
  taskTitle?: string;
  projectId?: number;
}

export const TaskInventoryTrackerTab: React.FC<TaskInventoryTrackerTabProps> = ({
  taskId,
  taskTitle,
  projectId,
}) => {
  const [requirements, setRequirements] = useState<TaskMaterialRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedReqForIssue, setSelectedReqForIssue] = useState<TaskMaterialRequirement | null>(null);

  // View Material Details Modal state
  const [selectedMaterialForView, setSelectedMaterialForView] = useState<MasterMaterial | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingViewId, setLoadingViewId] = useState<string | null>(null);

  const handleViewMaterialDetail = async (matId: string) => {
    if (!matId) return;
    setLoadingViewId(matId);
    try {
      const mat = await inventoryApi.getMaterial(matId);
      setSelectedMaterialForView(mat);
      setShowViewModal(true);
    } catch (err) {
      console.error("Failed to load material detail", err);
    } finally {
      setLoadingViewId(null);
    }
  };

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getTaskRequirements(taskId);
      setRequirements(data);
    } catch (err) {
      console.error("Failed to load task material requirements", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      loadRequirements();
    }
  }, [taskId]);

  return (
    <div className="space-y-4 text-zinc-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">
              Task Bill of Materials (BOM) & On-Site Inventory
            </h4>
            <p className="text-xs text-zinc-400">
              Track planned vs issued vs consumed quantities for this task.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCalcModal(true)}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-blue-400" />
            Add / Calculate Material
          </button>
          <button
            type="button"
            onClick={() => setShowReqModal(true)}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
            Place Requisition Order
          </button>
          <button
            type="button"
            onClick={() => setShowPostModal(true)}
            disabled={requirements.length === 0}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-40"
            title="Post task material requirements as a tender to the marketplace"
          >
            <Share2 className="w-3.5 h-3.5 text-accent" />
            Post Tender / Job
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedReqForIssue(null);
              setShowIssueModal(true);
            }}
            className="h-8 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Issue to Trade
          </button>
        </div>
      </div>

      {/* Requirements Table */}
      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500">Loading task materials...</div>
      ) : requirements.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
          <PackageCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-300 font-medium">No materials attached to this task yet</p>
          <p className="text-[11px] text-zinc-500 mt-0.5 max-w-sm mx-auto">
            Use the Civil Engineering Material Estimator to calculate exact bricks, cement, sand, steel, or tiles required for this task.
          </p>
          <button
            type="button"
            onClick={() => setShowCalcModal(true)}
            className="mt-3 h-7 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1 transition-colors"
          >
            <Calculator className="w-3 h-3" />
            Open Estimator
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Planned Qty</th>
                <th className="py-2.5 px-3">Issued Qty</th>
                <th className="py-2.5 px-3">Consumed Qty</th>
                <th className="py-2.5 px-3">Site Stock Available</th>
                <th className="py-2.5 px-3">Fulfillment</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {requirements.map((req) => {
                const pct = req.fulfillment_percentage || (req.planned_qty > 0 ? Math.min(100, Math.round((req.issued_qty / req.planned_qty) * 100)) : 0);
                const stockAvail = req.available_stock ?? 0;
                const neededQty = req.planned_qty - req.issued_qty;
                return (
                  <tr key={req.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-white">{req.material_name}</div>
                      <div className="text-[10px] text-zinc-500">Unit: {req.material_unit}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">
                      {req.planned_qty} {req.material_unit}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-emerald-400">
                      {req.issued_qty} {req.material_unit}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-amber-400">
                      {req.consumed_qty} {req.material_unit}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {stockAvail > 0 ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-emerald-400 font-mono text-xs block">
                            {stockAvail.toLocaleString()} {req.material_unit}
                          </span>
                          {stockAvail >= neededQty || neededQty <= 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                              AVAILABLE IN STOCK
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block">
                              PARTIAL ({stockAvail} / {neededQty} needed)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-bold text-red-400 font-mono text-xs block">
                            0 {req.material_unit}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20 inline-block">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 min-w-[130px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-400">{pct}%</span>
                        {pct >= 100 ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px]">Pending</span>
                        )}
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={loadingViewId === req.material}
                          onClick={() => handleViewMaterialDetail(req.material)}
                          className="h-6 px-2 text-[11px] font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="View Material Specifications & Brand Details"
                        >
                          <Eye className="w-3 h-3 text-blue-400" />
                          {loadingViewId === req.material ? "Loading..." : "View Specs"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReqForIssue(req);
                            setShowIssueModal(true);
                          }}
                          className="h-6 px-2 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 rounded transition-colors"
                        >
                          Issue Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCalcModal && (
        <TaskMaterialCalculatorModal
          isOpen={showCalcModal}
          onClose={() => setShowCalcModal(false)}
          taskId={taskId}
          taskTitle={taskTitle}
          onSaved={loadRequirements}
        />
      )}

      {showIssueModal && (
        <MaterialIssueModal
          isOpen={showIssueModal}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedReqForIssue(null);
          }}
          taskId={taskId}
          defaultMaterialId={selectedReqForIssue?.material}
          onIssued={loadRequirements}
        />
      )}

      {showViewModal && selectedMaterialForView && (
        <MaterialDetailModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedMaterialForView(null);
          }}
          material={selectedMaterialForView}
        />
      )}

      {showReqModal && (
        <PlaceRequisitionOrderModal
          isOpen={showReqModal}
          onClose={() => setShowReqModal(false)}
          taskId={taskId}
          taskTitle={taskTitle}
          projectId={projectId}
          requirements={requirements}
          onCreated={loadRequirements}
        />
      )}

      {/* Direct Post Opportunity Tender Modal */}
      <DirectPostOpportunityModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        initialTitle={taskTitle ? `Material Procurement: ${taskTitle}` : `Task #${taskId} Materials Package`}
        initialItems={requirements.map((r) => ({
          name: r.material_name,
          category: r.material_category,
          quantity: r.balance_remaining > 0 ? r.balance_remaining : r.planned_qty,
          unit: r.material_unit,
          rate: r.standard_rate,
        }))}
        sourceContext={taskTitle ? `Task: ${taskTitle}` : `Task #${taskId}`}
      />
    </div>
  );
};
