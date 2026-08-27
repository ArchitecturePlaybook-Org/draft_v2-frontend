"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, AlertCircle, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { MasterMaterial, Site, SiteBalance } from "@/domains/inventory/types";

interface MaterialIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: number;
  defaultMaterialId?: string;
  onIssued?: () => void;
}

export const MaterialIssueModal: React.FC<MaterialIssueModalProps> = ({
  isOpen,
  onClose,
  taskId,
  defaultMaterialId,
  onIssued,
}) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [balances, setBalances] = useState<SiteBalance[]>([]);
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(defaultMaterialId || "");
  const [issuedTo, setIssuedTo] = useState<string>("");
  const [workerTrade, setWorkerTrade] = useState<string>("MASON");
  const [qty, setQty] = useState<number>(10);
  const [purpose, setPurpose] = useState<string>("");
  const [locationInSite, setLocationInSite] = useState<string>("Floor 2, Grid C-4");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setErrorMsg("");
    try {
      const [sitesData, matsData, balData] = await Promise.all([
        inventoryApi.getSites(),
        inventoryApi.getMaterials(),
        inventoryApi.getAllBalances(),
      ]);
      setSites(sitesData);
      setMaterials(matsData);
      setBalances(balData);

      if (sitesData.length > 0) {
        setSelectedSiteId(sitesData[0].id);
      }
      if (!selectedMaterialId && matsData.length > 0) {
        setSelectedMaterialId(matsData[0].id);
      }
    } catch (err) {
      console.error("Failed to load inventory issue data", err);
    }
  };

  if (!isOpen) return null;

  const currentStock = balances.find(
    (b) => b.site_id === selectedSiteId && b.material_id === selectedMaterialId
  )?.current_balance ?? 0;

  const handleIssue = async () => {
    if (!selectedSiteId || !selectedMaterialId || !issuedTo || qty <= 0) {
      setErrorMsg("Please fill in all required fields and a valid quantity.");
      return;
    }

    if (qty > currentStock) {
      setErrorMsg(`Cannot issue ${qty}. Only ${currentStock} units available in site stock.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      await inventoryApi.createMaterialIssue({
        site: selectedSiteId,
        material: selectedMaterialId,
        qty,
        issued_to: issuedTo,
        worker_trade: workerTrade,
        task: taskId || null,
        purpose,
        location_in_site: locationInSite,
      });

      setSuccessMsg("Material Issue Slip generated and live stock debited!");
      setTimeout(() => {
        if (onIssued) onIssued();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create issue slip");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Generate Material Issue Slip</h3>
              <p className="text-xs text-zinc-400">
                Authorize material handoff to site trades and debit stock ledger.
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
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            {successMsg}
          </div>
        )}

        <div className="space-y-3 text-xs">
          {/* Site Selection */}
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Dispatch Site / Godown</label>
            <select
              value={selectedSiteId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSiteId(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Material Selection */}
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Material to Issue</label>
            <select
              value={selectedMaterialId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMaterialId(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.item_code}] {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Live Stock Availability Alert */}
          <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Available Stock on Selected Site:</span>
            <span
              className={`font-semibold ${
                currentStock > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {currentStock} {selectedMaterial?.unit || "units"}
            </span>
          </div>

          {/* Quantity and Trade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">
                Issue Quantity ({selectedMaterial?.unit || "Qty"})
              </label>
              <input
                type="number"
                step="1"
                value={qty}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQty(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Worker Trade</label>
              <select
                value={workerTrade}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWorkerTrade(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="MASON">Mason</option>
                <option value="BAR_BENDER">Bar Bender / Steel Fixer</option>
                <option value="CARPENTER">Carpenter / Shuttering</option>
                <option value="TILER">Tiler</option>
                <option value="PAINTER">Painter</option>
                <option value="ELECTRICIAN">Electrician</option>
                <option value="PLUMBER">Plumber</option>
                <option value="HELPER">General Helper</option>
              </select>
            </div>
          </div>

          {/* Issued To Person and Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Issued To (Foreman / Worker)</label>
              <input
                placeholder="e.g. Ramesh Kumar"
                value={issuedTo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIssuedTo(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Location in Site</label>
              <input
                placeholder="e.g. 2nd Floor, Tower A"
                value={locationInSite}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationInSite(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
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
            onClick={handleIssue}
            disabled={submitting || qty <= 0 || qty > currentStock}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? "Issuing..." : "Confirm & Issue Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};
