"use client";
import React, { useState } from "react";
import {
  X,
  Wrench,
  Clock,
  Calendar,
  MapPin,
  User,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  FileText,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { Equipment } from "@/domains/inventory/types";

interface EquipmentDetailModalProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  equipment,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"utilization" | "maintenance" | "specs">("utilization");

  if (!isOpen || !equipment) return null;

  const utilizationLogs = (equipment as any).utilization_history || [];
  const totalHoursLogged = (equipment as any).total_hours_logged ?? utilizationLogs.reduce((acc: number, l: any) => acc + Number(l.hours_operated || 0), 0);
  const maintenanceLogs = (equipment as any).maintenance_logs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-zinc-900/80 border-b border-zinc-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">
                  {equipment.equipment_code}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {equipment.category?.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    equipment.status === "AVAILABLE" || equipment.status === "OPERATIONAL"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : equipment.status === "IN_USE"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-red-500/10 text-red-400 border border-red-500/30"
                  }`}
                >
                  {equipment.status?.replace(/_/g, " ")}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{equipment.name}</h2>
              <div className="text-xs text-zinc-400 flex items-center gap-3 mt-1">
                {equipment.serial_no && <span>SN: {equipment.serial_no}</span>}
                {equipment.brand && <span>Brand: {equipment.brand}</span>}
                {equipment.model && <span>Model: {equipment.model}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total Running Hours</div>
              <div className="text-base font-bold text-cyan-400 font-mono">
                {totalHoursLogged.toLocaleString()} hrs
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 bg-zinc-900/40 border-b border-zinc-800 flex gap-6 shrink-0">
          <button
            onClick={() => setActiveTab("utilization")}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "utilization"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Field Utilization History ({utilizationLogs.length})
          </button>

          <button
            onClick={() => setActiveTab("maintenance")}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "maintenance"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Service & Maintenance Logs ({maintenanceLogs.length})
          </button>

          <button
            onClick={() => setActiveTab("specs")}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "specs"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Asset Specs & Custody
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-zinc-200">
          
          {/* TAB 1: FIELD DIARY UTILIZATION HISTORY */}
          {activeTab === "utilization" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Field Diary Operating Logbook
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time equipment usage recorded by Site Engineers & Operators in Field Diaries.
                  </p>
                </div>
              </div>

              {utilizationLogs.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                  <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-300">No Field Diary Utilization Logs Found</p>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                    When site engineers log daily equipment hours under the Field Diary section of a project, operating details (when, where, hours operated, and by whom) will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Project / Location</th>
                        <th className="py-3 px-4">Hours Operated</th>
                        <th className="py-3 px-4">Idle Hours</th>
                        <th className="py-3 px-4">Logged / Operated By</th>
                        <th className="py-3 px-4">Conditions</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {utilizationLogs.map((log: any, idx: number) => (
                        <tr key={log.id || idx} className="hover:bg-zinc-900/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                              {log.date || "Today"}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {log.project_uid ? (
                              <Link
                                href={`/dashboard/projects/${log.project_uid}?tab=site_ops`}
                                className="font-medium text-cyan-400 hover:underline flex items-center gap-1 group"
                                title="Open Project Site Ops"
                              >
                                <MapPin className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400" />
                                {log.project_title}
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            ) : (
                              <span className="text-zinc-400 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                                {log.project_title || "Site Ops Yard"}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {log.hours_operated} hrs
                          </td>

                          <td className="py-3 px-4 font-mono text-zinc-400">
                            {log.hours_idle || 0} hrs
                          </td>

                          <td className="py-3 px-4 font-medium text-zinc-200">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-zinc-500" />
                              {log.logged_by || "Site Operator"}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-zinc-400">
                            {log.weather ? (
                              <span className="inline-flex items-center gap-1 text-[11px]">
                                <Sun className="w-3 h-3 text-amber-400" />
                                {log.weather}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                log.status === "operational" || log.status === "OPERATIONAL"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : log.status === "breakdown" || log.status === "BREAKDOWN"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MAINTENANCE LOGS */}
          {activeTab === "maintenance" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    Service & Maintenance History
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Service records, breakdown tickets, replacement parts, and cost tracking.
                  </p>
                </div>
              </div>

              {maintenanceLogs.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                  <Wrench className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-300">No Service Logs Recorded</p>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                    No scheduled maintenance or breakdown repairs logged for this asset yet.
                  </p>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Service Date</th>
                        <th className="py-3 px-4">Service Type</th>
                        <th className="py-3 px-4">Technician / Vendor</th>
                        <th className="py-3 px-4">Parts Replaced</th>
                        <th className="py-3 px-4">Downtime</th>
                        <th className="py-3 px-4 text-right">Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {maintenanceLogs.map((m: any, idx: number) => (
                        <tr key={m.id || idx} className="hover:bg-zinc-900/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">{m.service_date}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-400/10 text-cyan-400 border border-cyan-500/20">
                              {m.service_type}
                            </span>
                          </td>
                          <td className="py-3 px-4">{m.service_by || "In-House Mechanic"}</td>
                          <td className="py-3 px-4 text-zinc-400">{m.parts_replaced || "Routine Service"}</td>
                          <td className="py-3 px-4 font-mono">{m.downtime_days || 0} days</td>
                          <td className="py-3 px-4 font-mono font-bold text-white text-right">
                            ₹{Number(m.service_cost || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSET SPECS & CUSTODY */}
          {activeTab === "specs" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-sm text-white border-b border-zinc-800 pb-2">Technical Specifications</h4>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Brand / Make:</span>
                  <span className="font-semibold text-white">{equipment.brand || "Standard"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Model Number:</span>
                  <span className="font-semibold text-white">{equipment.model || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Serial Number:</span>
                  <span className="font-mono text-cyan-400">{equipment.serial_no || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Category:</span>
                  <span className="font-semibold text-white">{equipment.category?.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Ownership Type:</span>
                  <span className="font-bold text-white">{equipment.ownership_type}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-sm text-white border-b border-zinc-800 pb-2">Location & Custody</h4>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Current Assigned Site:</span>
                  <span className="font-semibold text-cyan-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {equipment.current_site?.name || "Main Yard"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Current Custodian:</span>
                  <span className="font-semibold text-white">{equipment.current_custodian?.name || "Equipment Manager"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Purchase Date:</span>
                  <span className="font-semibold text-white">{equipment.purchase_date || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Hourly Rate / Cost:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{equipment.standard_hourly_rate || 0}/hr</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
