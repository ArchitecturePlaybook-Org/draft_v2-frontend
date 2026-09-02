"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  Warehouse,
  User,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  Send,
  Plus,
  Trash2,
  Phone,
  Briefcase,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { usersApi } from "@/domains/users/api";
import { TaskMaterialRequirement, Site, MasterMaterial } from "@/domains/inventory/types";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

interface PlaceRequisitionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle?: string;
  projectId?: number;
  requirements: TaskMaterialRequirement[];
  onCreated?: () => void;
}

export const PlaceRequisitionOrderModal: React.FC<PlaceRequisitionOrderModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  projectId,
  requirements,
  onCreated,
}) => {
  const { user } = useAuthStore();
  const [sites, setSites] = useState<Site[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<MasterMaterial[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("NORMAL");
  const [requiredDate, setRequiredDate] = useState<string>(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Requester Selection Provision state
  const [requesterSource, setRequesterSource] = useState<"SELF" | "STAFF" | "EXTERNAL">("SELF");
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string>("");
  const [externalRequesterName, setExternalRequesterName] = useState<string>("");
  const [externalRequesterRole, setExternalRequesterRole] = useState<string>("Contractor / Sub-Agent");
  const [externalRequesterPhone, setExternalRequesterPhone] = useState<string>("");

  // Itemized requested quantities state
  const [orderItems, setOrderItems] = useState<
    Array<{
      reqId: string;
      materialId: string;
      materialName: string;
      itemCode: string;
      unit: string;
      plannedQty: number;
      issuedQty: number;
      remainingBalance: number;
      quantityRequested: number;
      standardRate: number;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, requirements]);

  const loadInitialData = async () => {
    let siteList: Site[] = [];
    let catalog: MasterMaterial[] = [];
    let usersList: any[] = [];
    try {
      const [sRes, mRes, uRes] = await Promise.all([
        inventoryApi.getSites(),
        inventoryApi.getMaterials(),
        usersApi.listUsers().catch(() => ({ results: [] })),
      ]);
      siteList = sRes;
      catalog = mRes;
      usersList = Array.isArray(uRes) ? uRes : (uRes as any)?.results || [];

      setSites(siteList);
      setCatalogMaterials(catalog);
      setStaffUsers(usersList);

      if (siteList.length > 0 && !selectedSiteId) {
        setSelectedSiteId(siteList[0].id);
      }
      if (usersList.length > 0 && !selectedStaffUserId) {
        setSelectedStaffUserId(String(usersList[0].id));
      }
    } catch (e) {
      console.error("Failed to load initial requisition data", e);
    }

    // Populate order items from task requirements if available
    if (requirements && requirements.length > 0) {
      const items = requirements.map((r: any) => {
        const matId = r.material_id || (typeof r.material === "object" ? r.material?.id : r.material) || "";
        const catalogMat = catalog.find((m) => String(m.id) === String(matId));
        const remaining = Math.max(0, (r.planned_qty || 0) - (r.issued_qty || 0));
        const rate = Number(
          r.standard_rate ||
            (typeof r.material === "object" ? r.material?.standard_rate : 0) ||
            catalogMat?.standard_rate ||
            0
        );
        const code =
          r.item_code ||
          (typeof r.material === "object" ? r.material?.item_code : "") ||
          catalogMat?.item_code ||
          "MAT";

        return {
          reqId: r.id,
          materialId: matId,
          materialName:
            r.material_name ||
            (typeof r.material === "object" ? r.material?.name : catalogMat?.name) ||
            "Material",
          itemCode: code,
          unit:
            r.material_unit ||
            (typeof r.material === "object" ? r.material?.unit : catalogMat?.unit) ||
            "UNIT",
          plannedQty: r.planned_qty || 0,
          issuedQty: r.issued_qty || 0,
          remainingBalance: remaining,
          quantityRequested: remaining > 0 ? remaining : r.planned_qty || 10,
          standardRate: rate,
        };
      });
      setOrderItems(items);
    } else if (catalog.length > 0) {
      const defaultMat = catalog[0];
      setOrderItems([
        {
          reqId: `init-${Date.now()}`,
          materialId: defaultMat.id,
          materialName: defaultMat.name,
          itemCode: defaultMat.item_code || "MAT",
          unit: defaultMat.unit || "UNIT",
          plannedQty: 0,
          issuedQty: 0,
          remainingBalance: 0,
          quantityRequested: 10,
          standardRate: Number(defaultMat.standard_rate || 0),
        },
      ]);
    }
  };

  const handleAddMaterialItem = () => {
    if (catalogMaterials.length === 0) {
      toast.error("No materials available in master catalog.");
      return;
    }
    const unselected = catalogMaterials.find(
      (m) => !orderItems.some((i) => i.materialId === m.id)
    ) || catalogMaterials[0];

    setOrderItems((prev) => [
      ...prev,
      {
        reqId: `custom-${Date.now()}-${prev.length}`,
        materialId: unselected.id,
        materialName: unselected.name,
        itemCode: unselected.item_code || "MAT",
        unit: unselected.unit || "UNIT",
        plannedQty: 0,
        issuedQty: 0,
        remainingBalance: 0,
        quantityRequested: 10,
        standardRate: Number(unselected.standard_rate || 0),
      },
    ]);
  };

  const handleMaterialChange = (index: number, matId: string) => {
    const selectedMat = catalogMaterials.find((m) => String(m.id) === String(matId));
    if (!selectedMat) return;

    const updated = [...orderItems];
    updated[index].materialId = selectedMat.id;
    updated[index].materialName = selectedMat.name;
    updated[index].itemCode = selectedMat.item_code || "MAT";
    updated[index].unit = selectedMat.unit || "UNIT";
    updated[index].standardRate = Number(selectedMat.standard_rate || 0);
    setOrderItems(updated);
  };

  const handleQtyChange = (index: number, val: number) => {
    const updated = [...orderItems];
    updated[index].quantityRequested = Math.max(0, val);
    setOrderItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalEstimatedCost = orderItems.reduce(
    (sum, item) => sum + item.quantityRequested * (item.standardRate || 0),
    0
  );

  // Compute final requester label for display and audit
  let finalRequesterDisplay = user?.name || user?.email || "Architect User";
  let requesterAuditNote = "";

  if (requesterSource === "STAFF") {
    const selectedStaff = staffUsers.find((u) => String(u.id) === String(selectedStaffUserId));
    if (selectedStaff) {
      finalRequesterDisplay = `${selectedStaff.name || selectedStaff.email} (${selectedStaff.role || "Staff User"})`;
      requesterAuditNote = `Raised on behalf of Internal Staff: ${finalRequesterDisplay}`;
    }
  } else if (requesterSource === "EXTERNAL") {
    if (externalRequesterName) {
      finalRequesterDisplay = `${externalRequesterName} (${externalRequesterRole})`;
      requesterAuditNote = `Raised on behalf of External Person: ${externalRequesterName} [${externalRequesterRole}, Phone: ${externalRequesterPhone || "N/A"}]`;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = orderItems.filter((i) => i.quantityRequested > 0 && i.materialId);

    if (validItems.length === 0) {
      toast.error("Please specify at least one material quantity to order.");
      return;
    }

    if (requesterSource === "EXTERNAL" && !externalRequesterName) {
      toast.error("Please specify the External Requester Name.");
      return;
    }

    setSubmitting(true);
    try {
      const fullNotes = [
        taskId ? `Task Context: Task #${taskId} (${taskTitle || "Task Execution"})` : "",
        requesterAuditNote ? `Requester Provision: ${requesterAuditNote}` : "",
        notes ? `Delivery Notes: ${notes}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        site: selectedSiteId || undefined,
        project: projectId || undefined,
        urgency: urgency,
        required_by_date: requiredDate,
        notes: fullNotes || "Material Requisition Order",
        items: validItems.map((i) => ({
          material: i.materialId,
          qty_requested: i.quantityRequested,
          quantity_requested: i.quantityRequested,
          remarks: `Requisition Order (${i.quantityRequested} ${i.unit})`,
        })),
      };

      const res = await inventoryApi.createRequisition(payload);
      toast.success(
        `Material Requisition ${res.mrn_number || "Order"} raised successfully for ${finalRequesterDisplay}!`
      );

      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      console.error("Failed to create material requisition", err);
      toast.error(err?.data?.detail || err?.message || "Failed to raise Material Requisition.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Place Material Requisition Order
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  MRN Requisition
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Target Context: <span className="font-semibold text-zinc-200">{taskId ? `Task #${taskId} (${taskTitle || "Task Execution"})` : "Project Inventory Yard"}</span>
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

        {/* Requester Mode Provision Selector */}
        <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-400" />
              Requisition Order Requester Provision
            </span>
            <span className="text-[10px] text-zinc-400">Who is raising this material requirement?</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRequesterSource("SELF")}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                requesterSource === "SELF"
                  ? "bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Self (Logged-In User)
            </button>
            <button
              type="button"
              onClick={() => setRequesterSource("STAFF")}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                requesterSource === "STAFF"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Other Internal Staff
            </button>
            <button
              type="button"
              onClick={() => setRequesterSource("EXTERNAL")}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                requesterSource === "EXTERNAL"
                  ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              External Person / Sub-Agent
            </button>
          </div>

          {/* Conditional Requester Inputs */}
          {requesterSource === "SELF" && (
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Active Requester:</span>
              <span className="font-bold text-white">{user?.name || user?.email || "Architect User"}</span>
            </div>
          )}

          {requesterSource === "STAFF" && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300 block">Select Internal Staff Member</label>
              <select
                value={selectedStaffUserId}
                onChange={(e) => setSelectedStaffUserId(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-medium focus:outline-none focus:border-amber-500"
              >
                {staffUsers.length === 0 ? (
                  <option value="">No internal staff loaded</option>
                ) : (
                  staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.role || "Staff"})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {requesterSource === "EXTERNAL" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Requester Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={externalRequesterName}
                  onChange={(e) => setExternalRequesterName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Role / Trade Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Masonry Subcontractor"
                  value={externalRequesterRole}
                  onChange={(e) => setExternalRequesterRole(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={externalRequesterPhone}
                  onChange={(e) => setExternalRequesterPhone(e.target.value)}
                  className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Configuration Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Target Delivery Site Yard</label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-medium focus:outline-none focus:border-amber-500"
              >
                {sites.length === 0 ? (
                  <option value="">Default Project Main Yard</option>
                ) : (
                  sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name} ({s.location || "On-Site"})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="LOW">Low (Standard Scheduling)</option>
                <option value="NORMAL">Normal (Standard 3-Day Window)</option>
                <option value="HIGH">High Priority (Urgent Progress Need)</option>
                <option value="CRITICAL">Critical Emergency (Work Stoppage Risk)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Required On-Site By Date</label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Itemized Task Materials Order Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Itemized Material Line Items ({orderItems.length} Items)
                </label>
                <p className="text-[11px] text-zinc-400">
                  Pre-filled from task requirements or manually selected from master catalog
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMaterialItem}
                className="h-8 px-3 text-xs font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Material Line
              </button>
            </div>

            {orderItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl space-y-2">
                <p>No material items added to this requisition order yet.</p>
                <button
                  type="button"
                  onClick={handleAddMaterialItem}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add First Material Line
                </button>
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Select Material Item</th>
                      <th className="py-2.5 px-3 w-28">Order Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Est. Line Cost</th>
                      <th className="py-2.5 px-3 text-center w-10">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {orderItems.map((item, idx) => {
                      const lineTotal = item.quantityRequested * (item.standardRate || 0);
                      return (
                        <tr key={item.reqId || idx} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-2.5 px-3">
                            {catalogMaterials.length > 0 ? (
                              <select
                                value={item.materialId}
                                onChange={(e) => handleMaterialChange(idx, e.target.value)}
                                className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-semibold focus:outline-none focus:border-amber-500"
                              >
                                {catalogMaterials.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    [{m.item_code || "MAT"}] {m.name} ({m.unit}) — ₹{Number(m.standard_rate || 0).toFixed(2)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div>
                                <div className="font-semibold text-white">{item.materialName}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">[{item.itemCode}]</div>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                value={item.quantityRequested}
                                onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-amber-300 font-bold focus:outline-none focus:border-amber-500 font-mono"
                              />
                              <span className="text-[10px] text-zinc-400">{item.unit}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-400 font-mono">
                            ₹{Number(item.standardRate || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 font-mono">
                            ₹{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                              title="Remove Material Line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delivery Notes & Instructions */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
              Delivery Gate Notes & Special Handling Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Unload at East Storage Bay #3. Contact Gate Supervisor Ramesh prior to delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Budget Total Summary & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Estimated Order Value</span>
              <span className="text-base font-extrabold text-emerald-400">
                ₹{totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || orderItems.length === 0}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Raising Requisition..." : "Submit Requisition Order"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
