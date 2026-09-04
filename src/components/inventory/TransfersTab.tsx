"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftRight,
  Plus,
  CheckCircle,
  AlertCircle,
  Package,
  MapPin,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Info,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { SiteTransferResult } from "@/domains/inventory/types";
import { TransferDetailModal } from "@/components/inventory/TransferDetailModal";
import { toast } from "sonner";

export function TransfersTab() {
  const [sites, setSites] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SiteTransferResult | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    from_site: "",
    to_site: "",
    material: "",
    qty: "",
    remarks: "",
    batch_no: "",
  });

  // Modal State for inspecting past transfer entries
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, m, l] = await Promise.all([
        inventoryApi.getSites(),
        inventoryApi.getMaterials(),
        inventoryApi.getStockLedger(),
      ]);
      setSites(s);
      setMaterials(m);
      setLedger(l);
    } catch {
      setError("Failed to load sites and inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live stock balances per site & material: Map key `${siteId}_${materialId}`
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of ledger) {
      if (!entry.site || !entry.material) continue;
      const siteId = typeof entry.site === "object" ? String(entry.site.id || entry.site.uid || "") : String(entry.site);
      const matId = typeof entry.material === "object" ? String(entry.material.id || entry.material.uid || "") : String(entry.material);
      const key = `${siteId}_${matId}`;

      const current = map.get(key) || 0;
      const isIncoming = ["IN", "TRANSFER_IN", "PURCHASE_RECEIPT", "GRN", "ADJUSTMENT_ADD", "RETURN", "OPENING_STOCK"].includes(entry.txn_type);
      const isOutgoing = ["OUT", "TRANSFER_OUT", "DISPATCH", "ISSUE", "CONSUMPTION", "ADJUSTMENT_SUBTRACT"].includes(entry.txn_type);

      const qty = Number(entry.qty || 0);
      if (isIncoming) map.set(key, current + qty);
      else if (isOutgoing) map.set(key, current - qty);
    }
    return map;
  }, [ledger]);

  // Derived selected details for live intelligence box
  const selectedMaterial = useMemo(() => {
    if (!form.material) return null;
    return materials.find((m) => String(m.id) === String(form.material) || m.uid === form.material) || null;
  }, [materials, form.material]);

  const sourceSite = useMemo(() => {
    if (!form.from_site) return null;
    return sites.find((s) => String(s.id) === String(form.from_site) || s.uid === form.from_site) || null;
  }, [sites, form.from_site]);

  const targetSite = useMemo(() => {
    if (!form.to_site) return null;
    return sites.find((s) => String(s.id) === String(form.to_site) || s.uid === form.to_site) || null;
  }, [sites, form.to_site]);

  const sourceStock = useMemo(() => {
    if (!form.from_site || !form.material) return 0;
    return stockMap.get(`${form.from_site}_${form.material}`) || 0;
  }, [stockMap, form.from_site, form.material]);

  const targetStock = useMemo(() => {
    if (!form.to_site || !form.material) return 0;
    return stockMap.get(`${form.to_site}_${form.material}`) || 0;
  }, [stockMap, form.to_site, form.material]);

  const requestedQty = parseFloat(form.qty) || 0;
  const isInsufficientStock = requestedQty > 0 && requestedQty > sourceStock;

  const submit = async () => {
    if (!form.from_site || !form.to_site || !form.material || !form.qty) {
      setError("All required fields (*) must be completed.");
      return;
    }
    if (form.from_site === form.to_site) {
      setError("Source site and destination site cannot be identical.");
      return;
    }
    if (isInsufficientStock) {
      setError(`Cannot transfer ${requestedQty} units — exceeds source site available balance (${sourceStock}).`);
      return;
    }

    setSaving(true);
    setError("");
    setResult(null);
    try {
      const r = await inventoryApi.createTransfer({
        from_site: form.from_site,
        to_site: form.to_site,
        material: form.material,
        qty: requestedQty,
        remarks: form.remarks,
        batch_no: form.batch_no,
      });
      setResult(r);
      toast.success(`Transferred ${requestedQty} ${r.unit} of ${r.material}!`);
      setForm({
        from_site: "",
        to_site: "",
        material: "",
        qty: "",
        remarks: "",
        batch_no: "",
      });
      loadData();
    } catch (e: any) {
      setError(e?.message || "Transfer failed");
      toast.error("Transfer failed: " + (e?.message || "Check stock balances"));
    } finally {
      setSaving(false);
    }
  };

  const transferLedger = ledger.filter(
    (e) => e.txn_type === "TRANSFER_OUT" || e.txn_type === "TRANSFER_IN"
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Inter-Site Stock Transfer Hub
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Live Audit Ledger
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Move materials between construction sites & godowns with instant stock validation and dual-entry ledger tracking
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Stock Transfer Executed Successfully
          </div>
          <p className="text-xs text-emerald-400">
            <strong>{result.qty} {result.unit}</strong> of <strong>{result.material}</strong> transferred from{" "}
            <strong>{result.from_site}</strong> → <strong>{result.to_site}</strong>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">
            Audit Ledger IDs: OUT #{result.out_ledger_id} | IN #{result.in_ledger_id}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transfer Form & Live Intelligence */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
            <h2 className="font-bold text-white text-sm flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Plus className="w-4 h-4 text-amber-400" />
              New Stock Dispatch / Transfer
            </h2>

            {/* Source Site */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Source Site (Dispatched From) *
              </label>
              <select
                value={form.from_site}
                onChange={(e) => setForm((p) => ({ ...p, from_site: e.target.value }))}
                className="w-full h-10 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Source Site Yard...</option>
                {sites.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    📍 {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Site */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Target Site (Destination) *
              </label>
              <select
                value={form.to_site}
                onChange={(e) => setForm((p) => ({ ...p, to_site: e.target.value }))}
                className="w-full h-10 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Target Site Yard...</option>
                {sites.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    🎯 {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Material Dropdown */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Select Material *
              </label>
              <select
                value={form.material}
                onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
                className="w-full h-10 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Material Item...</option>
                {materials.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    [{m.item_code}] {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* LIVE MATERIAL & STOCK BALANCES INTELLIGENCE CARD */}
            {selectedMaterial && (
              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    {selectedMaterial.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800">
                    {selectedMaterial.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Source Balance */}
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-0.5">
                    <div className="text-[9px] uppercase font-bold text-zinc-500">Source Stock</div>
                    <div className={`font-mono font-bold text-sm ${sourceStock > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {sourceStock.toLocaleString()} {selectedMaterial.unit}
                    </div>
                    <div className="text-[9px] text-zinc-500 truncate">
                      {sourceSite?.name || "Select Source"}
                    </div>
                  </div>

                  {/* Destination Balance */}
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-0.5">
                    <div className="text-[9px] uppercase font-bold text-zinc-500">Destination Stock</div>
                    <div className="font-mono font-bold text-sm text-cyan-400">
                      {targetStock.toLocaleString()} {selectedMaterial.unit}
                    </div>
                    <div className="text-[9px] text-zinc-500 truncate">
                      {targetSite?.name || "Select Target"}
                    </div>
                  </div>
                </div>

                {/* Projected Balance Post-Transfer */}
                {requestedQty > 0 && (
                  <div className="pt-1 border-t border-zinc-800/80 text-[11px] flex items-center justify-between text-zinc-300">
                    <span>Target After Transfer:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {(targetStock + requestedQty).toLocaleString()} {selectedMaterial.unit} (+{requestedQty})
                    </span>
                  </div>
                )}

                {/* Standard Valuation */}
                {selectedMaterial.standard_rate && requestedQty > 0 && (
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>Est. Transfer Valuation:</span>
                    <span className="font-mono text-zinc-200">
                      ₹{(requestedQty * Number(selectedMaterial.standard_rate)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Transfer Quantity *
                </label>
                {form.from_site && form.material && (
                  <span className="text-[10px] text-zinc-400">
                    Max Available: <strong className="text-emerald-400 font-mono">{sourceStock}</strong>
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={form.qty}
                onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
                className={`w-full h-10 px-3 text-xs bg-zinc-900 border rounded-xl font-mono text-white focus:outline-none ${
                  isInsufficientStock
                    ? "border-red-500 text-red-300 focus:border-red-500"
                    : "border-zinc-700 focus:border-amber-500"
                }`}
                placeholder="0.000"
              />
              {isInsufficientStock && (
                <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3 h-3" /> Exceeds available source stock ({sourceStock})
                </p>
              )}
            </div>

            {/* Batch No */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Batch / Waybill Reference No.
              </label>
              <input
                value={form.batch_no}
                onChange={(e) => setForm((p) => ({ ...p, batch_no: e.target.value }))}
                className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
                placeholder="e.g. BATCH-2026-09"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Transfer Remarks / Driver Notes
              </label>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"
                placeholder="Transporter name, vehicle registration number..."
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={submit}
              disabled={saving || loading || isInsufficientStock}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {saving ? "Processing Transfer..." : "Execute Inter-Site Transfer"}
            </button>
          </div>
        </div>

        {/* Transfer History Table */}
        <div className="lg:col-span-2 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 flex flex-col">
          <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Inter-Site Transfer Audit Trail
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Complete log of stock dispatches & receipts across sites ({transferLedger.length} entries)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800 sticky top-0">
                <tr>
                  <th className="py-3 px-4">Txn Type</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Site Location</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {transferLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <ArrowLeftRight className="w-8 h-8 opacity-20 mx-auto mb-2" />
                      No inter-site stock transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  transferLedger.slice(0, 50).map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedTransfer(e);
                        setShowModal(true);
                      }}
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            e.txn_type === "TRANSFER_OUT"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {e.txn_type === "TRANSFER_OUT" ? "DISPATCH OUT" : "RECEIPT IN"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {e.material_name}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          {e.site_name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-300">
                        {Number(e.qty).toLocaleString()} {e.material_unit}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {new Date(e.created_at).toLocaleDateString("en-IN")}
                      </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedTransfer(e);
                              setShowModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 ml-auto transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            Pass Details
                          </button>
                        </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <TransferDetailModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTransfer(null);
        }}
        transfer={selectedTransfer}
      />
    </div>
  );
}
