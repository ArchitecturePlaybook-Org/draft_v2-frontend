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
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Delivery } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { GRNVerificationModal } from "@/components/inventory/GRNVerificationModal";

export default function DeliveriesGRNPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getDeliveries();
      setDeliveries(data);
    } catch (err) {
      console.error("Failed to load deliveries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const filteredDeliveries = deliveries.filter((d) => {
    return (
      d.grn_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.challan_no?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Digital Goods Receipt Notes (GRN) & Gate Inward
              </h1>
              <p className="text-xs text-zinc-400">
                Inspect gate deliveries against POs, verify physical counts, flag variances, and update live stock.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDeliveries}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
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
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold flex items-center gap-1.5"
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

      {/* Filter / Search Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            placeholder="Search GRN #, Supplier, Vehicle No..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">GRN Number</th>
                <th className="py-3 px-4">Supplier & Site</th>
                <th className="py-3 px-4">Vehicle & Challan</th>
                <th className="py-3 px-4">Delivery Date</th>
                <th className="py-3 px-4">Inspection Status</th>
                <th className="py-3 px-4">Variance</th>
                <th className="py-3 px-4 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Loading delivery receipts...
                  </td>
                </tr>
              ) : filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    No delivery records found.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{del.grn_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{del.supplier_name}</div>
                      <div className="text-[10px] text-zinc-500">{del.site_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-200">{del.vehicle_no || "N/A"}</div>
                      <div className="text-[10px] text-zinc-500">Challan: {del.challan_no || "N/A"}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {new Date(del.delivered_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {del.status === "VERIFIED" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                          Verified & In Stock
                        </span>
                      )}
                      {del.status === "PENDING" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                          Pending Gate Check
                        </span>
                      )}
                      {del.status === "PARTIALLY_ACCEPTED" && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] font-semibold">
                          Partially Accepted
                        </span>
                      )}
                      {del.status === "REJECTED" && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold">
                          Rejected at Gate
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {del.has_variance ? (
                        <span className="text-amber-400 flex items-center gap-1 font-medium text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Variance Logged
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Match
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {del.status === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDelivery(del);
                            setShowVerifyModal(true);
                          }}
                          className="h-7 px-3 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                        >
                          Verify & Accept
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDelivery(del);
                            setShowVerifyModal(true);
                          }}
                          className="h-7 px-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRN Verification Modal */}
      {showVerifyModal && selectedDelivery && (
        <GRNVerificationModal
          isOpen={showVerifyModal}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedDelivery(null);
          }}
          delivery={selectedDelivery}
          onVerified={loadDeliveries}
        />
      )}
    </div>
  );
}
