"use client";

import React, { useState } from "react";
import {
  X,
  ClipboardList,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Send,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { MaterialRequisition } from "@/domains/inventory/types";
import { CreatePurchaseOrderFromReqModal } from "./CreatePurchaseOrderFromReqModal";
import { toast } from "sonner";

interface ViewRequisitionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: MaterialRequisition;
  onUpdated?: () => void;
}

export const ViewRequisitionDetailModal: React.FC<ViewRequisitionDetailModalProps> = ({
  isOpen,
  onClose,
  requisition: initialReq,
  onUpdated,
}) => {
  const [req, setReq] = useState<MaterialRequisition>(initialReq);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);

  if (!isOpen || !req) return null;

  const handleAction = async (action: "submit" | "approve" | "reject") => {
    setActionLoading(true);
    try {
      if (action === "submit") {
        const updated = await inventoryApi.submitRequisition(req.id);
        setReq(updated);
        toast.success(`MRN ${req.mrn_number} submitted for approval!`);
      } else if (action === "approve") {
        const updated = await inventoryApi.approveRequisition(req.id);
        setReq(updated);
        toast.success(`MRN ${req.mrn_number} approved!`);
      } else if (action === "reject") {
        const updated = await inventoryApi.rejectRequisition(req.id, "Rejected by approver");
        setReq(updated);
        toast.error(`MRN ${req.mrn_number} rejected.`);
      }
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error(`Failed to ${action} requisition`, err);
      toast.error(err?.data?.detail || err?.message || `Failed to ${action} requisition.`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>;
      case "SUBMITTED":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Submitted for Approval</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">Rejected</span>;
      case "PO_RAISED":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Purchase Order Raised</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">Draft</span>;
    }
  };

  const items = req.items || [];
  const totalEstimatedCost = items.reduce((sum, item: any) => {
    const qty = item.qty_requested || item.quantity_requested || 0;
    const rate = item.standard_rate || item.material?.standard_rate || 0;
    return sum + Number(qty) * Number(rate);
  }, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Requisition Note Details
                </h3>
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {req.mrn_number}
                </span>
                {getStatusBadge(req.status)}
              </div>
              <p className="text-xs text-zinc-400">
                Site Yard: <span className="font-semibold text-zinc-200">{req.site_name || "Main Project Yard"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Metadata Card */}
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 font-bold shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block font-semibold">Raised By (Requester)</span>
              <span className="font-bold text-zinc-100">{req.requested_by_name || "Site Architect"}</span>
              <span className="text-[10px] text-zinc-500 block">Created: {new Date(req.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 font-bold shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block font-semibold">Priority & Urgency</span>
              <span className="font-bold text-amber-400">{req.priority || "NORMAL"}</span>
              <span className="text-[10px] text-zinc-400 block">Required: {req.required_by_date || "Asap"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 font-bold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block font-semibold">Approver Signature</span>
              <span className="font-bold text-zinc-100">{req.approved_by_name || "Pending Review"}</span>
              <span className="text-[10px] text-zinc-500 block">{req.approved_at ? new Date(req.approved_at).toLocaleDateString() : "Not Approved Yet"}</span>
            </div>
          </div>
        </div>

        {/* Notes & Purpose */}
        {req.purpose || req.notes ? (
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Purpose & Special Instructions</span>
            <p className="text-zinc-200">{req.purpose || req.notes}</p>
          </div>
        ) : null}

        {/* Itemized Materials Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Itemized Requested Materials ({items.length} Line Items)
            </label>
          </div>

          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No line items recorded for this requisition.
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Material Code & Name</th>
                    <th className="py-2.5 px-3">Requested Qty</th>
                    <th className="py-2.5 px-3">Approved Qty</th>
                    <th className="py-2.5 px-3">Item Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                  {items.map((item: any, idx: number) => {
                    const name = item.material_name || item.material?.name || "Material";
                    const code = item.material_item_code || item.material?.item_code || "MAT";
                    const unit = item.material_unit || item.material?.unit || "UNIT";
                    const reqQty = item.qty_requested || item.quantity_requested || 0;
                    const appQty = item.qty_approved || item.quantity_approved || 0;

                    return (
                      <tr key={item.id || idx} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">[{code}]</div>
                        </td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold font-mono">
                          {reqQty} {unit}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold font-mono">
                          {appQty > 0 ? `${appQty} ${unit}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 max-w-xs truncate">
                          {item.remarks || item.notes || "Standard requirement"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Estimated Requisition Value</span>
            <span className="text-base font-extrabold text-emerald-400">
              ₹{totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
            >
              Close
            </button>

            {req.status === "DRAFT" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction("submit")}
                className="h-9 px-4 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Submit for Approval
              </button>
            )}

            {req.status === "SUBMITTED" && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("reject")}
                  className="h-9 px-4 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject MRN
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("approve")}
                  className="h-9 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Requisition
                </button>
              </>
            )}

            {req.status === "APPROVED" && (
              <button
                type="button"
                onClick={() => setShowPOModal(true)}
                className="h-9 px-4 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Generate Purchase Order
              </button>
            )}
          </div>
        </div>
      </div>

      {showPOModal && (
        <CreatePurchaseOrderFromReqModal
          isOpen={showPOModal}
          onClose={() => setShowPOModal(false)}
          requisition={req}
          onCreated={() => {
            if (onUpdated) onUpdated();
            onClose();
          }}
        />
      )}
    </div>
  );
};
