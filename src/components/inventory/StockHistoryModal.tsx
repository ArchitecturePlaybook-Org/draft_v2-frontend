"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  History,
  Search,
  Filter,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  SlidersHorizontal,
  Calendar,
  Warehouse,
  CheckCircle2,
  Package,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { StockLedgerEntry, Site } from "@/domains/inventory/types";

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSiteId?: string;
  initialMaterialId?: string;
  materialName?: string;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  isOpen,
  onClose,
  initialSiteId = "ALL",
  initialMaterialId,
  materialName,
}) => {
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteId);
  const [selectedTxnType, setSelectedTxnType] = useState<string>("ALL");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(initialMaterialId);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    setSelectedMaterialId(initialMaterialId);
  }, [initialMaterialId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedSiteId, selectedTxnType, selectedMaterialId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sitesData, ledgerData] = await Promise.all([
        inventoryApi.getSites(),
        inventoryApi.getStockLedger({
          site_id: selectedSiteId === "ALL" ? undefined : selectedSiteId,
          material_id: selectedMaterialId || undefined,
          txn_type: selectedTxnType === "ALL" ? undefined : selectedTxnType,
        }),
      ]);
      setSites(sitesData);
      setEntries(ledgerData);
    } catch (err) {
      console.error("Failed to load stock audit history", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.material_name?.toLowerCase().includes(q) ||
      e.site_name?.toLowerCase().includes(q) ||
      e.remarks?.toLowerCase().includes(q) ||
      e.source?.toLowerCase().includes(q) ||
      e.created_by_name?.toLowerCase().includes(q)
    );
  });

  const getTxnBadge = (type: string, source: string) => {
    switch (type) {
      case "IN":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
            + IN ({source === "PO_DELIVERY" ? "PO Receipt" : source})
          </span>
        );
      case "OUT":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
            <ArrowUpRight className="w-3 h-3 text-amber-400" />
            - OUT ({source === "ISSUE_TASK" ? "Worker Issue" : source})
          </span>
        );
      case "TRANSFER_IN":
      case "TRANSFER_OUT":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-fit">
            <ArrowRightLeft className="w-3 h-3 text-blue-400" />
            ↔ TRANSFER ({type})
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 w-fit">
            <SlidersHorizontal className="w-3 h-3 text-purple-400" />
            ⚙ {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {selectedMaterialId && materialName ? `${materialName} — Material Stock History` : "Live Stock Update History & Audit Ledger"}
                <span className="text-[10px] font-extrabold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {entries.length} Total Logs
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Complete double-entry audit trail tracking when material stock was updated, issued to workers, or received from POs.
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

        {/* Selected Material Active Badge */}
        {selectedMaterialId && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-amber-300">
                Filtered Specifically for Material: <strong className="text-white">{materialName || selectedMaterialId}</strong>
              </span>
            </div>
            <button
              onClick={() => setSelectedMaterialId(undefined)}
              className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Show All Materials History
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Site Filter */}
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Construction Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} [{s.code}]
                </option>
              ))}
            </select>

            {/* Txn Type Filter */}
            <select
              value={selectedTxnType}
              onChange={(e) => setSelectedTxnType(e.target.value)}
              className="h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Movement Types</option>
              <option value="IN">IN (PO Deliveries & Receipts)</option>
              <option value="OUT">OUT (Worker Issues & Slips)</option>
              <option value="TRANSFER_IN">TRANSFER IN (Site Moves)</option>
              <option value="TRANSFER_OUT">TRANSFER OUT (Site Moves)</option>
              <option value="ADJUST_ADD">ADJUSTMENT ADD</option>
              <option value="ADJUST_SUB">ADJUSTMENT SUBTRACT</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search material, site, worker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={loadData}
              className="h-8 px-3 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1.5 transition-colors shrink-0"
              title="Refresh Audit Trail"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/90">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp & Reference</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3">Material Name & SKU</th>
                  <th className="py-2.5 px-3">Site Yard</th>
                  <th className="py-2.5 px-3 font-mono">Quantity</th>
                  <th className="py-2.5 px-3">Remarks / Purpose</th>
                  <th className="py-2.5 px-3 text-right">Updated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      Loading live stock update history and ledger logs...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No stock update transactions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e) => {
                    const isPositive = e.txn_type === "IN" || e.txn_type === "TRANSFER_IN" || e.txn_type === "ADJUST_ADD";
                    return (
                      <tr key={e.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            {new Date(e.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            ID: {e.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {getTxnBadge(e.txn_type, e.source)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{e.material_name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">[{e.material_unit}]</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-zinc-300">
                          <div className="flex items-center gap-1">
                            <Warehouse className="w-3 h-3 text-zinc-500" />
                            {e.site_name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-extrabold text-sm">
                          <span className={isPositive ? "text-emerald-400" : "text-amber-400"}>
                            {isPositive ? "+" : "-"}{Number(e.qty).toLocaleString()} {e.material_unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div className="text-zinc-300 truncate" title={e.remarks || "Stock Update Log"}>
                            {e.remarks || "Double-entry stock update"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-bold text-zinc-300 text-[11px]">
                            {e.created_by_name || "Storekeeper"}
                          </div>
                          <div className="text-[10px] text-zinc-500">System Logged</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-xs">
          <div className="text-zinc-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            All transactions are immutable & cryptographically linked to double-entry ledger.
          </div>
          <button
            onClick={onClose}
            className="h-9 px-5 font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
