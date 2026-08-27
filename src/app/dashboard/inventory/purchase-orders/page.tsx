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
  Search,
} from "lucide-react";
import { PurchaseOrder } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getPurchaseOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load purchase orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((po) => {
    return (
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.site_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Purchase Orders & Supplier Procurement
              </h1>
              <p className="text-xs text-zinc-400">
                Generate POs to approved vendors, track material deliveries, and reconcile delivery variances.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOrders}
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
          className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500 text-blue-300 font-semibold flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Purchase Orders
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            placeholder="Search PO #, Vendor, Site..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Vendor & Site</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4 text-right">Items Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{po.po_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{po.vendor_name}</div>
                      <div className="text-[10px] text-zinc-500">{po.site_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      {po.status === "FULFILLED" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                          Fulfilled
                        </span>
                      )}
                      {po.status === "PARTIALLY_DELIVERED" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                          Partially Delivered
                        </span>
                      )}
                      {po.status === "APPROVED" && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">
                          Approved & Issued
                        </span>
                      )}
                      {po.status === "DRAFT" && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-semibold">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      ₹{parseFloat(String(po.total_amount || 0)).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {po.expected_delivery_date
                        ? new Date(po.expected_delivery_date).toLocaleDateString()
                        : "Flexible"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-zinc-300">
                      {po.items?.length || 0} Materials
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
