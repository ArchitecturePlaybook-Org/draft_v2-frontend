"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Truck, ShieldCheck, X } from "lucide-react";
import { Delivery } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

interface GRNVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  onVerified?: () => void;
}

export const GRNVerificationModal: React.FC<GRNVerificationModalProps> = ({
  isOpen,
  onClose,
  delivery,
  onVerified,
}) => {
  const [itemsPayload, setItemsPayload] = useState<
    Array<{
      item_id: string;
      material_name: string;
      unit: string;
      qty_delivered: number;
      qty_accepted: number;
      qty_rejected: number;
      rejection_reason: string;
      batch_no: string;
    }>
  >(
    delivery?.items?.map((item) => ({
      item_id: item.id,
      material_name: item.material_name,
      unit: item.material_unit,
      qty_delivered: parseFloat(String(item.qty_delivered || 0)),
      qty_accepted: parseFloat(String(item.qty_accepted || item.qty_delivered || 0)),
      qty_rejected: parseFloat(String(item.qty_rejected || 0)),
      rejection_reason: item.rejection_reason || "",
      batch_no: item.batch_no || "B-" + Math.floor(100000 + Math.random() * 900000),
    })) || []
  );

  const [supervisorNotes, setSupervisorNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !delivery) return null;

  const handleAcceptedChange = (index: number, val: number) => {
    setItemsPayload((prev) => {
      const copy = [...prev];
      const del = copy[index].qty_delivered;
      const acc = Math.max(0, Math.min(del, val));
      const rej = Math.max(0, del - acc);
      copy[index].qty_accepted = acc;
      copy[index].qty_rejected = rej;
      return copy;
    });
  };

  const handleVerify = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      await inventoryApi.verifyDelivery(delivery.id, {
        items: itemsPayload.map((it) => ({
          item_id: it.item_id,
          qty_delivered: it.qty_delivered,
          qty_accepted: it.qty_accepted,
          rejection_reason: it.rejection_reason,
          batch_no: it.batch_no,
        })),
        supervisor_notes: supervisorNotes,
      });

      if (onVerified) onVerified();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to verify delivery");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Goods Receipt Note (GRN) Gate Inspection
              </h3>
              <p className="text-xs text-zinc-400">
                GRN #{delivery.grn_number} • Supplier: {delivery.supplier_name} • Vehicle: {delivery.vehicle_no || "N/A"}
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

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex justify-between items-center">
            <div>
              <span className="text-zinc-500 text-[11px]">Delivery Location:</span>
              <div className="font-semibold text-zinc-200">{delivery.site_name}</div>
            </div>
            <div>
              <span className="text-zinc-500 text-[11px]">Challan Number:</span>
              <div className="font-semibold text-zinc-200">{delivery.challan_no || "N/A"}</div>
            </div>
            <div>
              <span className="text-zinc-500 text-[11px]">Delivered At:</span>
              <div className="font-semibold text-zinc-200">
                {new Date(delivery.delivered_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Line Items Inspection */}
          <div className="space-y-3">
            <div className="font-semibold text-zinc-300">Inspect & Verify Line Items</div>
            {itemsPayload.map((item, idx) => (
              <div
                key={item.item_id}
                className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-white">{item.material_name}</div>
                  <div className="text-[11px] text-zinc-400">
                    Delivered: <span className="text-zinc-200 font-semibold">{item.qty_delivered} {item.unit}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Qty Accepted</label>
                    <input
                      type="number"
                      step="1"
                      value={item.qty_accepted}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAcceptedChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-emerald-400 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Qty Rejected</label>
                    <input
                      type="number"
                      disabled
                      value={item.qty_rejected}
                      className="w-full h-7 px-2 text-xs bg-zinc-900/50 border border-zinc-800 rounded text-red-400 font-medium cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Batch / Heat No.</label>
                    <input
                      value={item.batch_no}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const copy = [...itemsPayload];
                        copy[idx].batch_no = e.target.value;
                        setItemsPayload(copy);
                      }}
                      className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
                    />
                  </div>
                </div>

                {item.qty_rejected > 0 && (
                  <div>
                    <label className="text-[10px] text-red-400 block mb-1">Reason for Rejection / Variance</label>
                    <input
                      placeholder="e.g. Moisture damaged bags / Broken tiles"
                      value={item.rejection_reason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const copy = [...itemsPayload];
                        copy[idx].rejection_reason = e.target.value;
                        setItemsPayload(copy);
                      }}
                      className="w-full h-7 px-2 text-xs bg-red-950/20 border border-red-500/30 rounded text-red-300"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Supervisor Inspection Notes</label>
            <textarea
              placeholder="Physical quality check passed. Weighbridge ticket attached."
              value={supervisorNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSupervisorNotes(e.target.value)}
              className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-200 min-h-[60px]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? "Verifying..." : "Approve & Credit to Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};
