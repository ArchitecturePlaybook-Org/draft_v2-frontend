"use client";
import React from "react";
import { X, ArrowLeftRight, Calendar, MapPin, Package, FileText, CheckCircle2, User, Truck, DollarSign } from "lucide-react";

interface TransferDetailModalProps {
  transfer: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransferDetailModal: React.FC<TransferDetailModalProps> = ({
  transfer,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !transfer) return null;

  const isOut = transfer.txn_type === "TRANSFER_OUT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOut ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/30"}`}>
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-wider ${isOut ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                  {transfer.txn_type}
                </span>
                <span className="font-mono text-xs text-zinc-400">ID: #{transfer.id?.toString().substring(0, 8)}</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">Inter-Site Stock Transfer Pass</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-zinc-200 text-xs">
          
          {/* Transfer Route Visualizer */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" /> Source Site (OUT)
              </div>
              <div className="font-bold text-sm text-white">{transfer.site_name || transfer.from_site || "Source Site"}</div>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0 text-amber-400">
              <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-500/30 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono text-zinc-500 mt-1">DISPATCH</span>
            </div>

            <div className="flex-1 text-right space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center justify-end gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" /> Target Site (IN)
              </div>
              <div className="font-bold text-sm text-white">{transfer.target_site_name || transfer.to_site || "Destination Site"}</div>
            </div>
          </div>

          {/* Material & Quantity Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <div className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Package className="w-3.5 h-3.5 text-cyan-400" /> Transferred Material
              </div>
              <div className="text-sm font-bold text-white">{transfer.material_name || transfer.material}</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <div className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Package className="w-3.5 h-3.5 text-amber-400" /> Quantity Transferred
              </div>
              <div className="text-base font-black text-amber-400 font-mono">
                {Number(transfer.qty || 0).toLocaleString()} {transfer.material_unit || transfer.unit || "Units"}
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2 border border-zinc-800/80 rounded-xl p-4 bg-zinc-900/30">
            <h4 className="font-bold text-white border-b border-zinc-800/60 pb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-400" /> Audit Details & Remarks
            </h4>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-1">
              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Transfer Date:</span>
                <span className="font-semibold text-white">
                  {transfer.created_at ? new Date(transfer.created_at).toLocaleString("en-IN") : "Today"}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Batch / Lot No:</span>
                <span className="font-mono text-cyan-400">{transfer.batch_no || "STANDARD-BATCH"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Logged By:</span>
                <span className="font-semibold text-white">{transfer.created_by_name || "Warehouse Manager"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/40">
                <span className="text-zinc-400">Ledger Status:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> AUDITED
                </span>
              </div>
            </div>

            {transfer.remarks && (
              <div className="pt-2">
                <span className="text-zinc-400 block mb-1">Remarks / Dispatch Notes:</span>
                <p className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 italic">
                  "{transfer.remarks}"
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close Transfer Pass
          </button>
        </div>

      </div>
    </div>
  );
};
