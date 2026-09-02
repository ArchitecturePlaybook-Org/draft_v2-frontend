"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Warehouse,
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  MapPin,
  User,
  DollarSign,
  Layers,
  RefreshCw,
  Clock,
  UserCheck,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { SiteBalance, Site, MaterialIssue } from "@/domains/inventory/types";

interface ViewSiteInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site;
}

export const ViewSiteInventoryModal: React.FC<ViewSiteInventoryModalProps> = ({
  isOpen,
  onClose,
  site,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"balances" | "issues">("balances");
  const [balances, setBalances] = useState<SiteBalance[]>([]);
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  useEffect(() => {
    if (isOpen && site) {
      loadData();
    }
  }, [isOpen, site]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balData, issueData] = await Promise.all([
        inventoryApi.getSiteBalances(site.id),
        inventoryApi.getMaterialIssues(),
      ]);
      setBalances(balData);
      setIssues(issueData.filter((i) => i.site === site.id || i.site_name === site.name));
    } catch (err) {
      console.error("Failed to load site inventory inspector data", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !site) return null;

  const filteredBalances = balances.filter(
    (b) =>
      (!search ||
        b.material_name.toLowerCase().includes(search.toLowerCase()) ||
        b.item_code?.toLowerCase().includes(search.toLowerCase())) &&
      (categoryFilter === "ALL" || b.category === categoryFilter)
  );

  const filteredIssues = issues.filter(
    (i) =>
      !search ||
      i.issued_to?.toLowerCase().includes(search.toLowerCase()) ||
      i.material_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.worker_trade?.toLowerCase().includes(search.toLowerCase()) ||
      i.issue_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalStockValuation = balances.reduce(
    (sum, b) => sum + (Number(b.total_value) || 0),
    0
  );

  const getHealthBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            HEALTHY
          </span>
        );
      case "REORDER_WARNING":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            REORDER NEEDED
          </span>
        );
      case "CRITICAL_LOW":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            CRITICAL LOW
          </span>
        );
      case "OVERSTOCKED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            OVERSTOCKED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {site.name} — Live Site Inventory Inspector
                </h3>
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  [{site.code}]
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                {site.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-500" />
                    {site.location}
                  </span>
                )}
                {site.project_name && (
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Building className="w-3 h-3 text-amber-400" />
                    Allocated Project: {site.project_name}
                  </span>
                )}
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

        {/* Mode Tab Switches */}
        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveSubTab("balances")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeSubTab === "balances"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Package className="w-4 h-4" />
            Live Material Balances ({balances.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("issues")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeSubTab === "issues"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Worker Trade Issue & Audit Log ({issues.length})
          </button>
        </div>

        {activeSubTab === "balances" ? (
          <>
            {/* Valuation Summary Card */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total On-Site Material Inventory Valuation</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  ₹{totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-500 block">Unique Material SKUs</span>
                  <span className="font-bold text-white text-sm">{balances.length} Items</span>
                </div>
                <button
                  onClick={loadData}
                  className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                  title="Refresh Balances"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search material name or code..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-[11px] font-semibold text-zinc-400 shrink-0">Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="CEMENT">Cement</option>
                  <option value="MASONRY">Masonry / Bricks</option>
                  <option value="SAND_AGGREGATE">Sand & Aggregates</option>
                  <option value="STRUCTURAL">Structural Steel</option>
                  <option value="FINISHING">Finishing (Tiles/Paints)</option>
                  <option value="CONSUMABLE">Consumables & Hardware</option>
                </select>
              </div>
            </div>

            {/* Inventory Balances Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/90">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Item Code & Material Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 font-mono">Live On-Site Stock</th>
                      <th className="py-2.5 px-3 text-right">Estimated Line Value</th>
                      <th className="py-2.5 px-3 text-center">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500">
                          Loading live site inventory balances...
                        </td>
                      </tr>
                    ) : filteredBalances.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500">
                          No material balances recorded in this site yard yet.
                        </td>
                      </tr>
                    ) : (
                      filteredBalances.map((b) => (
                        <tr key={b.material_id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{b.material_name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">[{b.item_code}]</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300 font-semibold uppercase">
                              {b.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-300 font-extrabold text-sm">
                            {Number(b.current_balance).toLocaleString()} {b.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 font-mono">
                            ₹{Number(b.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {getHealthBadge(b.health_status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search Bar for Issues */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search worker, trade, or material..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={loadData}
                className="h-8 px-3 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                Refresh Issues Log
              </button>
            </div>

            {/* Worker Issue & Consumption Audit Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/90">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Date & Issue Slip #</th>
                      <th className="py-2.5 px-3">Material & Quantity Taken</th>
                      <th className="py-2.5 px-3">Issued To (Worker / Person)</th>
                      <th className="py-2.5 px-3">Worker Trade</th>
                      <th className="py-2.5 px-3">Location & Purpose</th>
                      <th className="py-2.5 px-3 text-right">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500">
                          Loading worker material issue history...
                        </td>
                      </tr>
                    ) : filteredIssues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500">
                          No worker material issue slips recorded for this site yet.
                        </td>
                      </tr>
                    ) : (
                      filteredIssues.map((iss) => (
                        <tr key={iss.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-zinc-400 font-bold">{iss.issue_number || "ISSUE-SLIP"}</div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-purple-400" />
                              {new Date(iss.issued_at).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{iss.material_name}</div>
                            <div className="font-mono text-emerald-400 font-extrabold text-xs">
                              {iss.qty} {iss.material_unit}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-amber-300 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                              {iss.issued_to || "Field Worker"}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wide">
                              {iss.worker_trade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-zinc-200 font-medium">{iss.location_in_site || "Site Work Area"}</div>
                            <div className="text-[10px] text-zinc-500">{iss.purpose || "Task Execution"}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[11px] font-bold text-zinc-400">
                              {iss.issued_by_name || "Storekeeper"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="h-9 px-5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
