"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Warehouse,
  Truck,
  ArrowUpRight,
  Wrench,
  Layers,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  HardHat,
} from "lucide-react";
import { MaterialIssue } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { MaterialIssueModal } from "@/components/inventory/MaterialIssueModal";

export default function MaterialIssuesPage() {
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getMaterialIssues();
      setIssues(data);
    } catch (err) {
      console.error("Failed to load material issues", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const filteredIssues = issues.filter((i) => {
    return (
      i.issue_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.material_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.issued_to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.site_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Material Issue Slips & Trade Consumption
              </h1>
              <p className="text-xs text-zinc-400">
                Track material issuance to on-site trades (Masons, Carpenters, Electricians, Plumbers) linked to tasks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadIssues}
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
            <Plus className="w-3.5 h-3.5" />
            New Issue Slip
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto text-xs">
        <Link
          href="/dashboard/inventory"
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
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
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold flex items-center gap-1.5"
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

      {/* Filter / Search Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            placeholder="Search Issue #, Material, Worker, Site..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Issues Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Issue Slip #</th>
                <th className="py-3 px-4">Material Issued</th>
                <th className="py-3 px-4">Issued To & Trade</th>
                <th className="py-3 px-4">Site Location</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4 text-right">Task Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Loading material issue slips...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    No issue slips created yet. Click "New Issue Slip" to issue stock.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{issue.issue_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{issue.material_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium flex items-center gap-1">
                        <HardHat className="w-3 h-3 text-amber-400" />
                        {issue.issued_to}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase">{issue.worker_trade}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-300">{issue.site_name}</div>
                      {issue.location_in_site && (
                        <div className="text-[10px] text-zinc-500">{issue.location_in_site}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-400">
                        {issue.qty} {issue.material_unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {new Date(issue.issued_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {issue.task ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-700 text-blue-300">
                          Task #{issue.task}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">General Work</span>
                      )}
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
          onIssued={loadIssues}
        />
      )}
    </div>
  );
}
