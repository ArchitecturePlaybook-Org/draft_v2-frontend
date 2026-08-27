"use client";

import React, { useState } from "react";
import { QrCode, Scan, CheckCircle2, AlertCircle, Wrench, X } from "lucide-react";
import { Equipment } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

interface EquipmentQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  mode: "checkout" | "checkin";
  onActionCompleted?: () => void;
}

export const EquipmentQRScannerModal: React.FC<EquipmentQRScannerModalProps> = ({
  isOpen,
  onClose,
  equipment,
  mode,
  onActionCompleted,
}) => {
  const [custodianName, setCustodianName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !equipment) return null;

  const handleAction = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      if (mode === "checkout") {
        if (!custodianName) {
          setErrorMsg("Please enter the custodian / foreman name.");
          setSubmitting(false);
          return;
        }
        await inventoryApi.checkoutEquipment(equipment.id, {
          custodian_name: custodianName,
          site_id: equipment.current_site || undefined,
          notes,
        });
      } else {
        await inventoryApi.checkinEquipment(equipment.id, {
          site_id: equipment.current_site || "",
          notes,
        });
      }

      if (onActionCompleted) onActionCompleted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process equipment action");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === "checkout" ? "Equipment Checkout (Scan)" : "Return Equipment to Store"}
              </h3>
              <p className="text-xs text-zinc-400">
                {equipment.equipment_code} • {equipment.name}
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

        <div className="space-y-3.5 text-xs">
          {/* Simulated QR Code Box */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-24 h-24 bg-white p-2 rounded-lg flex items-center justify-center shadow-inner">
              <Scan className="w-16 h-16 text-zinc-900 animate-pulse" />
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              QR Hash: {equipment.qr_code_hash || "QR-EQ-GEN-00918"}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Serial Tag #{equipment.serial_no} Verified
            </div>
          </div>

          {mode === "checkout" ? (
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Assign Custodian / Operator Name</label>
              <input
                placeholder="e.g. Ramesh Steel Fixer / Site Engineer Emily"
                value={custodianName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustodianName(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
              <div className="text-zinc-400 text-[11px]">Current Custodian:</div>
              <div className="font-semibold text-zinc-200">{equipment.custodian_name || "Assigned Worker"}</div>
            </div>
          )}

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Condition / Operational Notes</label>
            <input
              placeholder="e.g. Good condition, oil topped up"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
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
            onClick={handleAction}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            {submitting ? "Processing..." : mode === "checkout" ? "Confirm Checkout" : "Confirm Return"}
          </button>
        </div>
      </div>
    </div>
  );
};
