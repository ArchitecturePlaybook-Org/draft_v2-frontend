"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Warehouse,
  Truck,
  ArrowUpRight,
  Wrench,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  TrendingDown,
  FileSpreadsheet,
} from "lucide-react";
import { Site, SiteBalance } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { MaterialIssueModal } from "@/components/inventory/MaterialIssueModal";

export default function InventoryDashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [balances, setBalances] = useState<SiteBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sitesData, balancesData] = await Promise.all([
        inventoryApi.getSites(),
        inventoryApi.getAllBalances(selectedSiteId === "ALL" ? undefined : selectedSiteId),
      ]);
      setSites(sitesData);
      setBalances(balancesData);
    } catch (err) {
      console.error("Failed to load inventory overview", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSiteId]);

  const filteredBalances = balances.filter((b) => {
    const matchesCategory = selectedCategory === "ALL" || b.category === selectedCategory;
    const matchesSearch =
      b.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.site_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalValuation = balances.reduce((sum, b) => sum + (b.total_value || 0), 0);
  const criticalCount = balances.filter((b) => b.health_status === "CRITICAL_LOW").length;
  const reorderCount = balances.filter((b) => b.health_status === "REORDER_WARNING").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                On-Site Inventory Management System (OIMS)
              </h1>
              <p className="text-xs text-zinc-400">
                Live double-entry stock ledger, materials, deliveries, and equipment across construction sites.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowIssueModal(true)}
            className="h-8 px-3 text-xs font-black rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Issue Slip
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto text-xs">
        <Link
          href="/dashboard/inventory"
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold flex items-center gap-1.5"
        >
          <Warehouse className="w-3.5 h-3.5" /> Stock Overview
        </Link>
        <Link
          href="/dashboard/inventory/deliveries"
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <Truck className="w-3.5 h-3.5" /> Digital GRN & Gate
        </Link>
        <Link
          href="/dashboard/inventory/issues"
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Trade Issues
        </Link>
        <Link
          href="/dashboard/inventory/equipment"
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <Wrench className="w-3.5 h-3.5" /> Equipment & Tools
        </Link>
        <Link
          href="/dashboard/inventory/purchase-orders"
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Purchase Orders
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
          <div className="text-xs text-zinc-400 font-medium">Total Site Stock Valuation</div>
          <div className="text-xl font-bold text-white tracking-tight">
            ₹{totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-zinc-500">Aggregated across all active yards</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
          <div className="text-xs text-zinc-400 font-medium">Stocked Material SKUs</div>
          <div className="text-xl font-bold text-white tracking-tight">{balances.length} Items</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Double-entry verified
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
          <div className="text-xs text-zinc-400 font-medium">Critical Low Stock Alerts</div>
          <div className="text-xl font-bold text-red-400 tracking-tight">{criticalCount} SKUs</div>
          <div className="text-[11px] text-red-400/80 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Below safety threshold
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
          <div className="text-xs text-zinc-400 font-medium">Reorder Level Warnings</div>
          <div className="text-xl font-bold text-amber-400 tracking-tight">{reorderCount} SKUs</div>
          <div className="text-[11px] text-amber-400/80 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Procurement required
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Site Filter */}
          <select
            value={selectedSiteId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSiteId(e.target.value)}
            className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none min-w-[200px]"
          >
            <option value="ALL">All Construction Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
            className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none min-w-[150px]"
          >
            <option value="ALL">All Categories</option>
            <option value="CEMENT">Cement & Binders</option>
            <option value="SAND_AGGREGATE">Sand & Aggregates</option>
            <option value="MASONRY">Masonry & Blocks</option>
            <option value="STRUCTURAL">Structural Steel & Rebar</option>
            <option value="FINISHING">Finishing & Tiles</option>
            <option value="WATERPROOFING">Waterproofing & Chemicals</option>
            <option value="MEP">MEP & Electrical</option>
            <option value="TOOLS">Tools & Formwork</option>
            <option value="CONSUMABLE">General Consumables</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            placeholder="Search material code, name, site..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Live Stock Balances Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Item Code & Name</th>
                <th className="py-3 px-4">Site Yard</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Live Balance</th>
                <th className="py-3 px-4">Stock Valuation</th>
                <th className="py-3 px-4">Health Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Loading live ledger stock balances...
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    No material stock records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((item) => (
                  <tr key={`${item.site_id}-${item.material_id}`} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.material_name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{item.item_code}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{item.site_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 border border-zinc-700 text-zinc-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-sm text-white">
                        {item.current_balance} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-200">
                      ₹{item.total_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4">
                      {item.health_status === "CRITICAL_LOW" && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold">
                          Critical Low
                        </span>
                      )}
                      {item.health_status === "REORDER_WARNING" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                          Reorder Soon
                        </span>
                      )}
                      {item.health_status === "HEALTHY" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                          Healthy
                        </span>
                      )}
                      {item.health_status === "OVERSTOCKED" && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">
                          Overstocked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setShowIssueModal(true)}
                        className="h-7 px-2.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded transition-colors"
                      >
                        Issue Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Issue Modal */}
      {showIssueModal && (
        <MaterialIssueModal
          isOpen={showIssueModal}
          onClose={() => setShowIssueModal(false)}
          onIssued={loadData}
        />
      )}
    </div>
  );
}
