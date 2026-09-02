"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Warehouse,
  Truck,
  ArrowUpRight,
  FileSpreadsheet,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  PackageCheck,
  XCircle,
  Eye,
  X,
  Send,
  Check,
  Building2,
  Filter,
  DollarSign,
  ShoppingBag,
  ShieldCheck,
  AlertCircle,
  Layers,
} from "lucide-react";
import { PurchaseOrder, POStatus } from "@/domains/inventory/types";
import { inventoryApi } from "@/domains/inventory/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

export function PurchaseOrdersTab() {
  const { user } = useAuthStore();
  const rawRole = String(user?.role || (user as any)?.role_name || (user as any)?.account_role || "").toLowerCase();
  const rawAccount = String((user as any)?.account?.account_type || (user as any)?.account_type || "").toLowerCase();
  const userType = String((user as any)?.user_type || "").toLowerCase();
  const category = String((user as any)?.category || "").toLowerCase();
  const email = String(user?.email || "").toLowerCase();

  const isMaterialSupplier =
    rawRole === "material_supplier" ||
    rawRole === "supplier" ||
    rawAccount === "material_supplier" ||
    rawAccount === "supplier" ||
    userType === "supplier";

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Supplier Bill Upload Modal State
  const [billModalPo, setBillModalPo] = useState<PurchaseOrder | null>(null);
  const [billInvoiceNo, setBillInvoiceNo] = useState("");
  const [billUrl, setBillUrl] = useState("");
  const [submittingBill, setSubmittingBill] = useState(false);

  const handleOpenBillModal = (po: PurchaseOrder) => {
    setBillModalPo(po);
    setBillInvoiceNo(po.supplier_invoice_no || `INV-${po.po_number}`);
    setBillUrl(po.supplier_bill_url || "");
  };

  const handleSaveBillAndMarkDelivered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billModalPo) return;
    setSubmittingBill(true);
    try {
      const updated = await inventoryApi.updatePurchaseOrder(billModalPo.id, {
        status: "SUPPLIER_DELIVERED" as any,
        supplier_invoice_no: billInvoiceNo,
        supplier_bill_url: billUrl || `https://storage.architectureplaybook.com/bills/${billModalPo.po_number}.pdf`,
      } as any);

      setOrders((prev) => prev.map((po) => (po.id === billModalPo.id ? updated : po)));
      if (viewPo && viewPo.id === billModalPo.id) {
        setViewPo(updated);
      }
      toast.success(`Bill receipt uploaded & PO #${updated.po_number} marked DELIVERED to site!`);
      setBillModalPo(null);
    } catch (err: any) {
      console.error("Failed to upload bill receipt", err);
      toast.error(err?.message || "Failed to upload bill receipt.");
    } finally {
      setSubmittingBill(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getPurchaseOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load purchase orders", err);
      toast.error("Failed to load purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (poId: string, newStatus: string) => {
    setUpdatingId(poId);
    try {
      const updated = await inventoryApi.updatePurchaseOrder(poId, { status: newStatus as any });
      setOrders((prev) => prev.map((po) => (po.id === poId ? updated : po)));
      if (viewPo && viewPo.id === poId) {
        setViewPo(updated);
      }
      if (newStatus === "SUPPLIER_DELIVERED") {
        toast.info(`Supplier marked PO #${updated.po_number} DELIVERED to site! Awaiting Architect / Site Engineer Verification.`);
      } else if (newStatus === "FULFILLED") {
        toast.success(`PO #${updated.po_number} Verified & Accepted! Digital GRN created and stock posted to Site Ledger.`);
      } else {
        toast.success(`Purchase Order #${updated.po_number} status updated to ${newStatus}.`);
      }
    } catch (err: any) {
      console.error("Failed to update PO status", err);
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewOrder = async (po: PurchaseOrder) => {
    setViewPo(po);
    setViewLoading(true);
    try {
      const detail = await inventoryApi.getPurchaseOrder(po.id);
      setViewPo(detail);
    } catch (err) {
      console.error("Failed to load PO detail", err);
    } finally {
      setViewLoading(false);
    }
  };

  const handlePrintPODocument = async (po: PurchaseOrder) => {
    let fullPo = po;
    if (!po.items || po.items.length === 0) {
      try {
        fullPo = await inventoryApi.getPurchaseOrder(po.id);
      } catch (_) {}
    }

    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const formattedDate = fullPo.created_at
      ? new Date(fullPo.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

    const expectedDate = fullPo.expected_delivery_date
      ? new Date(fullPo.expected_delivery_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      : "Immediate / Flexible";

    const itemsHtml = (fullPo.items || []).map((item: any, idx: number) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const subtotal = qty * rate;
      const tax = subtotal * (Number(item.tax_percent || 18) / 100);
      const total = subtotal + tax;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${item.material_name || item.material?.name || `Procurement Item #${idx + 1}`}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${qty} ${item.material_unit || item.material?.unit || ""}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.tax_percent || 18}% GST</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; color: #0f172a;">₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join("");

    const totalVal = parseFloat(String(fullPo.total_amount || 0));

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order #${fullPo.po_number} — Architecture Playbook</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 40px; background: #f8fafc; }
            .paper { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .header-table { width: 100%; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 24px; }
            .brand { font-size: 24px; font-weight: 900; color: #4338ca; text-transform: uppercase; letter-spacing: -0.5px; }
            .doc-title { font-size: 20px; font-weight: 900; color: #0f172a; text-align: right; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; background: #f1f5f9; padding: 20px; border-radius: 12px; }
            .section-title { font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
            .th { background: #1e293b; color: #ffffff; padding: 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .totals { margin-left: auto; width: 300px; margin-bottom: 30px; }
            .grand-total { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #0f172a; font-size: 18px; font-weight: 900; color: #4338ca; }
            .stamp { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
            .signature { border-top: 1.5px solid #0f172a; width: 180px; text-align: center; padding-top: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .btn { width: 100%; padding: 14px; background: #4338ca; color: #ffffff; border: none; border-radius: 10px; font-weight: 900; font-size: 13px; text-transform: uppercase; cursor: pointer; margin-top: 20px; }
            @media print { .btn { display: none; } body { background: #fff; padding: 0; } .paper { border: none; box-shadow: none; padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="paper">
            <table class="header-table">
              <tr>
                <td>
                  <div class="brand">ARCHITECTURE PLAYBOOK</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Official Commercial Procurement Document</div>
                </td>
                <td style="text-align: right;">
                  <div class="doc-title">PURCHASE ORDER</div>
                  <div style="font-size: 13px; font-weight: 800; color: #4338ca; margin-top: 4px;">#${fullPo.po_number}</div>
                </td>
              </tr>
            </table>

            <div class="meta-grid">
              <div>
                <div class="section-title">Supplier / Vendor Details</div>
                <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${fullPo.vendor_name || "Assigned Vendor Firm"}</div>
                <div style="font-size: 12px; color: #475569; margin-top: 2px;">Procurement Supplier ID: ${fullPo.vendor || "EXT-SUPPLIER"}</div>
                <div style="font-size: 12px; color: #475569; margin-top: 2px;">Payment Terms: ${fullPo.terms_and_conditions || "Standard Credit Terms"}</div>
              </div>
              <div>
                <div class="section-title">Order Details & Delivery Site</div>
                <div style="font-weight: 700; font-size: 13px;">Date: ${formattedDate}</div>
                <div style="font-weight: 700; font-size: 13px; margin-top: 2px;">Target Site: ${fullPo.site_name || "Main Site Yard"}</div>
                <div style="font-weight: 700; font-size: 13px; margin-top: 2px;">Expected Delivery: ${expectedDate}</div>
                <div style="font-weight: 800; font-size: 12px; color: #16a34a; margin-top: 4px; text-transform: uppercase;">Status: ${fullPo.status}</div>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th class="th" style="text-align: left; width: 40px;">#</th>
                  <th class="th" style="text-align: left;">Item Description</th>
                  <th class="th" style="text-align: center;">Qty</th>
                  <th class="th" style="text-align: right;">Unit Rate (₹)</th>
                  <th class="th" style="text-align: right;">GST Rate</th>
                  <th class="th" style="text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || `<tr><td colSpan="6" style="padding: 20px; text-align: center; color: #64748b;">Standard Construction Materials Order (${fullPo.po_number})</td></tr>`}
              </tbody>
            </table>

            <div class="totals">
              <div class="grand-total">
                <span>Total Amount Payable</span>
                <span>₹${totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div class="stamp">
              <div>
                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Generated via Architecture Playbook Procurement Engine</div>
              </div>
              <div class="signature">Authorized Signatory</div>
            </div>

            <button class="btn" onclick="window.print()">Print / Save PDF Document</button>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // KPI Statistics Calculation
  const stats = useMemo(() => {
    const total = orders.length;
    const issued = orders.filter((o) => o.status === "ISSUED" || o.status === "APPROVED").length;
    const awaitingVerify = orders.filter((o) => o.status === "SUPPLIER_DELIVERED").length;
    const fulfilled = orders.filter((o) => o.status === "FULFILLED").length;
    const totalValue = orders.reduce((sum, o) => sum + parseFloat(String(o.total_amount || 0)), 0);

    return { total, issued, awaitingVerify, fulfilled, totalValue };
  }, [orders]);

  // Filtered list by Search + Status Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      const matchesSearch =
        po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.site_name?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "AWAITING") return po.status === "SUPPLIER_DELIVERED";
      if (activeTab === "ISSUED") return po.status === "ISSUED" || po.status === "APPROVED" || po.status === "PARTIALLY_DELIVERED";
      if (activeTab === "FULFILLED") return po.status === "FULFILLED";
      if (activeTab === "DRAFT") return po.status === "DRAFT" || po.status === "PENDING_APPROVAL";

      return true;
    });
  }, [orders, searchQuery, activeTab]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/5">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-white">
                Purchase Orders & Procurement
              </h1>
              {isMaterialSupplier ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Supplier Portal
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Architect / Firm Workspace
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage material orders, track supplier dispatch, and verify digital GRN site receipts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadOrders}
            className="h-9 px-4 text-xs font-bold rounded-xl border border-zinc-700/80 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? "animate-spin" : ""}`} />
            Refresh Orders
          </button>
        </div>
      </div>



      {/* ── KPI Stat Cards Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Total POs Issued</span>
            <span className="text-2xl font-black text-white mt-1 block">{stats.total}</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Active & Issued */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Active & Dispatched</span>
            <span className="text-2xl font-black text-purple-400 mt-1 block">{stats.issued}</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Awaiting Verification */}
        <div className={`p-4 rounded-2xl border backdrop-blur-xl flex items-center justify-between shadow-lg transition-all ${
          stats.awaitingVerify > 0
            ? "bg-amber-950/20 border-amber-500/40 shadow-amber-500/5"
            : "bg-zinc-900/60 border-zinc-800/80"
        }`}>
          <div>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block flex items-center gap-1">
              Awaiting Verification
              {stats.awaitingVerify > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />}
            </span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{stats.awaitingVerify}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Total Value */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Total Committed Value</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">
              ₹{stats.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search & Status Filter Chips ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by PO Number, Vendor Name, or Site Yard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-8 text-xs bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold scrollbar-none">
          {[
            { id: "ALL", label: "All Orders", count: orders.length },
            { id: "AWAITING", label: "Awaiting Verification", count: stats.awaitingVerify, highlight: true },
            { id: "ISSUED", label: "Active & In-Transit", count: stats.issued },
            { id: "FULFILLED", label: "Fulfilled & Verified", count: stats.fulfilled },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? tab.highlight
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
                    : "bg-purple-600 text-white border-purple-500 shadow-sm"
                  : "bg-zinc-950/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Purchase Orders Table ─────────────────────────────────────────── */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800/80">
              <tr>
                <th className="py-3.5 px-4">PO Number & Date</th>
                <th className="py-3.5 px-4">Vendor & Delivery Site</th>
                <th className="py-3.5 px-4">Fulfillment Status</th>
                <th className="py-3.5 px-4">Update Status</th>
                <th className="py-3.5 px-4">Total Value (₹)</th>
                <th className="py-3.5 px-4">Expected Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                      <span className="text-zinc-400 text-xs font-semibold">Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-zinc-600" />
                      <span className="text-zinc-300 font-bold text-sm">No Purchase Orders Found</span>
                      <span className="text-zinc-500 text-xs">No orders match your selected search or filter criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-zinc-900/50 transition-colors group">
                    
                    {/* PO Number & Created Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-white font-mono text-sm tracking-tight group-hover:text-purple-300 transition-colors">
                        {po.po_number}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {po.created_at ? new Date(po.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
                      </div>
                    </td>

                    {/* Vendor & Target Site */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-amber-300">{po.vendor_name || "Assigned Vendor"}</div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Warehouse className="w-3 h-3 text-zinc-500" />
                        <span>{po.site_name || "Site Yard"}</span>
                      </div>
                    </td>

                    {/* Fulfillment Status Pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                        po.status === "FULFILLED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10"
                          : po.status === "SUPPLIER_DELIVERED"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10 animate-pulse"
                          : po.status === "PARTIALLY_DELIVERED"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : po.status === "APPROVED" || po.status === "ISSUED"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}>
                        {po.status === "SUPPLIER_DELIVERED" ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            Supplier Delivered
                          </>
                        ) : po.status === "FULFILLED" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Fulfilled & Verified
                          </>
                        ) : (
                          po.status
                        )}
                      </span>
                    </td>

                    {/* Role-Filtered Dropdown to Update Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        disabled={updatingId === po.id || po.status === "FULFILLED" || po.status === "CANCELLED"}
                        value={po.status}
                        onChange={(e) => handleStatusChange(po.id, e.target.value)}
                        className={`h-8 px-2 text-xs font-bold rounded-lg bg-zinc-900 border text-amber-300 focus:outline-none focus:border-amber-400 shadow-sm max-w-[170px] truncate ${
                          po.status === "FULFILLED" || po.status === "CANCELLED"
                            ? "opacity-60 cursor-not-allowed bg-zinc-950 text-zinc-500 border-zinc-800"
                            : po.status === "SUPPLIER_DELIVERED"
                            ? "border-amber-500/80 text-amber-400 bg-amber-950/30 cursor-pointer"
                            : "border-purple-500/50 cursor-pointer"
                        }`}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="ISSUED">Issued to Vendor</option>
                        <option value="APPROVED">Approved & Confirmed</option>
                        <option value="PARTIALLY_DELIVERED">Partially Delivered</option>

                        {isMaterialSupplier ? (
                          /* Suppliers can mark Supplier Delivered, but CANNOT select Fulfilled */
                          <option value="SUPPLIER_DELIVERED">Mark Delivered to Site</option>
                        ) : (
                          /* Architects / Site Engineers can select Fulfilled to verify GRN */
                          <>
                            {po.status === "SUPPLIER_DELIVERED" && (
                              <option value="SUPPLIER_DELIVERED">Supplier Delivered</option>
                            )}
                            <option value="FULFILLED">Verify GRN (Fulfilled)</option>
                          </>
                        )}

                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>

                    {/* Total PO Value */}
                    <td className="py-3.5 px-4 font-black text-emerald-400 font-mono text-sm whitespace-nowrap">
                      ₹{parseFloat(String(po.total_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Expected Date */}
                    <td className="py-3.5 px-4 text-zinc-300 font-mono whitespace-nowrap">
                      {po.expected_delivery_date
                        ? new Date(po.expected_delivery_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                        : "Flexible"}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        {/* Architect / Site Engineer Verification Action (Visible for all active/delivered orders) */}
                        {!isMaterialSupplier && po.status !== "FULFILLED" && po.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={updatingId === po.id}
                            onClick={() => handleStatusChange(po.id, "FULFILLED")}
                            className={`h-8 px-3 text-xs font-black rounded-lg text-white shadow-md inline-flex items-center gap-1.5 transition-all cursor-pointer border active:scale-95 whitespace-nowrap shrink-0 ${
                              po.status === "SUPPLIER_DELIVERED"
                                ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 shadow-emerald-500/30 animate-pulse hover:animate-none"
                                : "bg-emerald-700/80 hover:bg-emerald-600 border-emerald-500/50"
                            }`}
                            title="Verify delivered items & accept into site stock ledger"
                          >
                            <PackageCheck className="w-4 h-4 text-white shrink-0" />
                            <span>Verify GRN</span>
                          </button>
                        )}

                        {/* Material Supplier Delivery & Bill Upload Action */}
                        {isMaterialSupplier && (po.status === "ISSUED" || po.status === "APPROVED" || po.status === "PARTIALLY_DELIVERED") && (
                          <button
                            type="button"
                            disabled={updatingId === po.id}
                            onClick={() => handleOpenBillModal(po)}
                            className="h-8 px-3 text-xs font-black rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-400/50 active:scale-95 whitespace-nowrap shrink-0"
                            title="Upload supplier bill receipt & mark delivered to site"
                          >
                            <Clock className="w-4 h-4 text-white shrink-0" />
                            <span>Upload Bill & Deliver</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePrintPODocument(po)}
                          className="h-8 px-3 text-xs font-bold rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                          title="View & Print Official Purchase Order PDF"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Print PO</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewOrder(po)}
                          className="h-8 px-3 text-xs font-bold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Order Details Modal ───────────────────────────────────────────── */}
      {viewPo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Purchase Order #{viewPo.po_number}
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                      {viewPo.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Vendor: <span className="text-amber-300 font-semibold">{viewPo.vendor_name || "N/A"}</span> • Site Yard: <span className="text-zinc-200 font-semibold">{viewPo.site_name || "N/A"}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintPODocument(viewPo)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" /> Print PO Document
                </button>
                <button
                  type="button"
                  onClick={() => setViewPo(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Update Action Bar / Locked Banner */}
            {viewPo.status === "FULFILLED" ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                  Order Fully Fulfilled & Stock Items Added to Site Inventory
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wide">
                  Order Locked & Complete
                </span>
              </div>
            ) : viewPo.status === "CANCELLED" ? (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                  <XCircle className="w-4.5 h-4.5 text-red-400" />
                  Purchase Order Cancelled
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wide">
                  Cancelled
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-purple-500/40 space-y-2">
                <span className="text-xs font-bold text-amber-300 block">
                  ⚡ Update Order Fulfillment Status:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {isMaterialSupplier ? (
                    /* Material Supplier Portal Actions */
                    <>
                      <button
                        type="button"
                        disabled={updatingId === viewPo.id}
                        onClick={() => handleStatusChange(viewPo.id, "ISSUED")}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5 text-purple-400" /> Mark Dispatched / In-Transit
                      </button>
                      {(viewPo.status === "ISSUED" || viewPo.status === "APPROVED" || viewPo.status === "PARTIALLY_DELIVERED") && (
                        <button
                          type="button"
                          disabled={updatingId === viewPo.id}
                          onClick={() => handleStatusChange(viewPo.id, "SUPPLIER_DELIVERED")}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md border border-amber-400/50"
                        >
                          <Clock className="w-4 h-4 text-white" /> Mark Delivered to Site
                        </button>
                      )}
                    </>
                  ) : (
                    /* Architect / Site Engineer / GC Actions */
                    <>
                      <button
                        type="button"
                        disabled={updatingId === viewPo.id}
                        onClick={() => handleStatusChange(viewPo.id, "ISSUED")}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5 text-purple-400" /> Mark Dispatched
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === viewPo.id}
                        onClick={() => handleStatusChange(viewPo.id, "FULFILLED")}
                        className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md border transition-all ${
                          viewPo.status === "SUPPLIER_DELIVERED"
                            ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 shadow-emerald-500/30 animate-pulse hover:animate-none"
                            : "bg-emerald-700/80 hover:bg-emerald-600 border-emerald-500/50"
                        }`}
                      >
                        <PackageCheck className="w-4 h-4 text-white" /> Architect Verify & Accept GRN
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Terms & Delivery Summary */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Expected On-Site</span>
                <span className="font-bold text-white font-mono">
                  {viewPo.expected_delivery_date ? new Date(viewPo.expected_delivery_date).toLocaleDateString() : "Flexible"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Total PO Value</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  ₹{parseFloat(String(viewPo.total_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Supplier Invoice / Bill</span>
                {viewPo.supplier_invoice_no || viewPo.supplier_bill_url ? (
                  <a
                    href={viewPo.supplier_bill_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline font-bold text-[11px] flex items-center gap-1 mt-0.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                    <span>{viewPo.supplier_invoice_no || "View Uploaded Bill"}</span>
                  </a>
                ) : (
                  <span className="text-zinc-500 text-[11px] block italic mt-0.5">Pending Supplier Upload</span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                <span>Itemized Procurement Lines ({(viewPo.items || []).length} Items)</span>
              </label>
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Material Name</th>
                      <th className="py-2.5 px-3 w-24">Qty</th>
                      <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {viewLoading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center">
                          <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs">
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                            Loading material line items...
                          </div>
                        </td>
                      </tr>
                    ) : (viewPo.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-500">
                          No line items attached to this PO.
                        </td>
                      </tr>
                    ) : (
                      (viewPo.items || []).map((item: any, idx: number) => {
                        const lineSubtotal = Number(item.qty || 0) * Number(item.rate || 0);
                        const lineTotal = lineSubtotal * (1 + Number(item.tax_percent || 18) / 100);
                        return (
                          <tr key={item.id || idx} className="hover:bg-zinc-900/60 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-white">
                              {item.material_name || item.material?.name || `Material Item #${idx + 1}`}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              {item.qty} {item.material_unit || item.material?.unit || ""}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              ₹{Number(item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                              ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setViewPo(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Supplier Bill Upload Modal ─────────────────────────────────────── */}
      {billModalPo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-amber-500/40 text-zinc-100 p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Upload Supplier Bill & Mark Delivered
                  </h3>
                  <p className="text-xs text-zinc-400">
                    PO #{billModalPo.po_number} • {billModalPo.vendor_name || "Vendor"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillModalPo(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillAndMarkDelivered} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Supplier Tax Invoice / Bill Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-2026-8891"
                  value={billInvoiceNo}
                  onChange={(e) => setBillInvoiceNo(e.target.value)}
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Bill Receipt Document Attachment (PDF / Image)
                </label>
                <div className="border border-dashed border-zinc-700 bg-zinc-950/60 p-4 rounded-xl text-center space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-zinc-300 font-semibold text-xs">
                    Drag & Drop Supplier Bill Receipt or click below
                  </p>
                  <input
                    type="file"
                    accept=".pdf,png,jpg,jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBillUrl(URL.createObjectURL(file));
                        toast.success(`Attached file: ${file.name}`);
                      }
                    }}
                    className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setBillModalPo(null)}
                  className="px-4 py-2 font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="px-4 py-2 font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingBill ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Clock className="w-4 h-4 text-white" />
                  )}
                  Submit Bill & Mark Delivered
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
