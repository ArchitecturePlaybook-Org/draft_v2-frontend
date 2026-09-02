"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Warehouse,
  Boxes,
  MapPin,
  Building,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { Site, SiteBalance } from "@/domains/inventory/types";
import { ViewSiteInventoryModal } from "./ViewSiteInventoryModal";

interface ProjectSiteInventoryTabProps {
  projectId: number | string;
  projectName?: string;
}

export const ProjectSiteInventoryTab: React.FC<ProjectSiteInventoryTabProps> = ({
  projectId,
  projectName,
}) => {
  const [projectSites, setProjectSites] = useState<Site[]>([]);
  const [allBalances, setAllBalances] = useState<SiteBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSiteForInspector, setSelectedSiteForInspector] = useState<Site | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sites, balances] = await Promise.all([
        inventoryApi.getSites(),
        inventoryApi.getAllBalances(),
      ]);

      // Filter sites allocated to this project
      const allocated = sites.filter(
        (s) => String(s.project) === String(projectId) || String((s as any).project_id) === String(projectId)
      );
      setProjectSites(allocated);
      setAllBalances(balances);
    } catch (err) {
      console.error("Failed to load project site inventory", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, loadData]);

  const filteredBalances = allBalances.filter((b) => {
    const isProjectSite = projectSites.some((s) => s.id === b.site_id);
    const matchesSearch =
      !search ||
      b.material_name.toLowerCase().includes(search.toLowerCase()) ||
      b.item_code?.toLowerCase().includes(search.toLowerCase());
    return isProjectSite && matchesSearch;
  });

  const totalProjectStockValue = filteredBalances.reduce(
    (sum, b) => sum + (Number(b.total_value) || 0),
    0
  );

  return (
    <div className="space-y-4 text-zinc-100 font-sans">
      {/* Header Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Project Allocated Storage Yards & On-Site Materials
            </h4>
            <p className="text-xs text-zinc-400">
              Live material stock balances across all storage yards allocated to {projectName || `Project #${projectId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-right">
            <span className="text-[10px] text-zinc-400 block font-semibold">Total On-Site Material Value</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">
              ₹{totalProjectStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={loadData}
            className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition-colors"
            title="Refresh Stock Balances"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Allocated Sites Cards */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <Building className="w-4 h-4 text-amber-400" />
          Allocated Site Yards ({projectSites.length} Yards)
        </label>

        {projectSites.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            No specific site yards allocated to this project yet. Go to <a href="/dashboard/inventory/sites" className="text-amber-400 underline font-semibold">Sites Hub</a> to allocate a yard.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {projectSites.map((s) => (
              <div key={s.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-white block">{s.name}</span>
                  <span className="text-[10px] font-mono text-amber-400">[{s.code}]</span>
                  {s.location && <span className="text-[10px] text-zinc-500 block">{s.location}</span>}
                </div>
                <button
                  onClick={() => setSelectedSiteForInspector(s)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Boxes className="w-3.5 h-3.5" /> Inspect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Itemized Project Stock Table */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-emerald-400" />
            Project On-Site Stock Balances ({filteredBalances.length} SKUs)
          </label>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search material..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/90">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Material Name & Code</th>
                <th className="py-2.5 px-3">Site Yard</th>
                <th className="py-2.5 px-3 font-mono">In-Stock Quantity</th>
                <th className="py-2.5 px-3 text-right">Est. Total Valuation</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Loading project site balances...
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    No material stock recorded in this project's yards.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((b, idx) => (
                  <tr key={`${b.site_id}-${b.material_id}-${idx}`} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white">{b.material_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">[{b.item_code}]</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-amber-400">
                      {b.site_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold text-sm">
                      {Number(b.current_balance).toLocaleString()} {b.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-300 font-mono">
                      ₹{Number(b.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {b.health_status || "HEALTHY"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspector Modal */}
      {selectedSiteForInspector && (
        <ViewSiteInventoryModal
          isOpen={!!selectedSiteForInspector}
          onClose={() => setSelectedSiteForInspector(null)}
          site={selectedSiteForInspector}
        />
      )}
    </div>
  );
};
