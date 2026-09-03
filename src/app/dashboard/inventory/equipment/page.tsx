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
  Scan,
  UserCheck,
} from "lucide-react";
import { Equipment } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { EquipmentQRScannerModal } from "@/components/inventory/EquipmentQRScannerModal";

export default function EquipmentTrackingPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [modalMode, setModalMode] = useState<"checkout" | "checkin">("checkout");
  const [showQRModal, setShowQRModal] = useState(false);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getEquipmentList();
      setEquipmentList(data);
    } catch (err) {
      console.error("Failed to load equipment", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  const filteredEquipment = equipmentList.filter((eq) => {
    return (
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.equipment_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serial_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.custodian_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.site_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Equipment, Machinery & Power Tools Tracking
              </h1>
              <p className="text-xs text-zinc-400">
                Manage serialized heavy equipment, power tools, custodian check-out/in, and QR asset tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadEquipment}
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
        {/*
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
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold flex items-center gap-1.5"
        >
          <Wrench className="w-3.5 h-3.5" /> Equipment & Tools
        </Link>
        <Link
          href="/dashboard/inventory/procurement?tab=pos"
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Purchase Orders
        </Link>
        */}
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            placeholder="Search equipment code, name, serial #, custodian..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-zinc-500">
            Loading equipment registry...
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-zinc-500">
            No equipment records found matching filters.
          </div>
        ) : (
          filteredEquipment.map((eq) => (
            <div
              key={eq.id}
              className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono text-zinc-400">{eq.equipment_code}</div>
                    <div className="font-semibold text-white text-sm">{eq.name}</div>
                  </div>
                  {eq.status === "AVAILABLE" && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                      Available
                    </span>
                  )}
                  {eq.status === "IN_USE" && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">
                      In Use
                    </span>
                  )}
                  {eq.status === "IN_TRANSIT" && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                      In Transit
                    </span>
                  )}
                  {eq.status === "UNDER_MAINTENANCE" && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold">
                      Maintenance
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Current Yard:</span>
                    <span className="text-zinc-200 font-medium">{eq.site_name || "Central Yard"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Serial / Tag #:</span>
                    <span className="font-mono text-zinc-300 text-[11px]">{eq.serial_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category / Ownership:</span>
                    <span className="text-zinc-300 capitalize">{eq.category.replace("_", " ")} ({eq.ownership_type})</span>
                  </div>
                  {eq.status === "IN_USE" && (
                    <div className="flex justify-between pt-1 border-t border-zinc-800 text-blue-300">
                      <span>Custodian:</span>
                      <span className="font-semibold">{eq.custodian_name || "Assigned Worker"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                <div className="text-[10px] text-zinc-500 font-mono">
                  {eq.qr_code_hash ? "QR Active" : "No QR Tag"}
                </div>
                <div className="flex items-center gap-1.5">
                  {eq.status === "AVAILABLE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEq(eq);
                        setModalMode("checkout");
                        setShowQRModal(true);
                      }}
                      className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors"
                    >
                      <Scan className="w-3 h-3" /> Check Out
                    </button>
                  )}
                  {eq.status === "IN_USE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEq(eq);
                        setModalMode("checkin");
                        setShowQRModal(true);
                      }}
                      className="h-7 px-2.5 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <UserCheck className="w-3 h-3" /> Return Store
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Equipment QR / Check-out/in Modal */}
      {showQRModal && selectedEq && (
        <EquipmentQRScannerModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedEq(null);
          }}
          equipment={selectedEq}
          mode={modalMode}
          onActionCompleted={loadEquipment}
        />
      )}
    </div>
  );
}
