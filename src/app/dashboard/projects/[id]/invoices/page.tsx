"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Receipt, Plus, TrendingUp, CheckCircle, Clock, AlertCircle,
  Loader2, FileText, Search, RefreshCw, LayoutGrid, List,
} from "lucide-react";
import { invoicesApi } from "@/domains/invoices/api";
import type { InvoiceListItem, InvoiceStatus, CompanyProfile } from "@/domains/invoices/types";
import { InvoiceKanban } from "@/components/invoices/InvoiceKanban";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { CompanyProfilePanel } from "@/components/invoices/CompanyProfilePanel";
import { useProjectNavStore } from "@/store/project-nav-store";

function fmtINR(v: number | string | undefined | null): string {
  const num = typeof v === "number" ? v : Number(v) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

function StatCard({ label, value, icon, borderColor }: { label: string; value: string; icon: React.ReactNode; borderColor: string }) {
  return (
    <div className={`rounded-xl border-l-4 ${borderColor} bg-surface-card border border-surface-200 px-4 py-3 flex items-center gap-3 shadow-xs`}>
      <div className="p-2 rounded-lg bg-surface-100 text-foreground">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-surface-400">{label}</p>
        <p className="text-lg font-black text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function InvoiceListPage() {
  const params = useParams();
  const projectUid = params.id as string;
  const { currentProjectTitle } = useProjectNavStore();

  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoicesApi.list(projectUid, statusFilter || undefined);
      setInvoices(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [projectUid, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = useCallback((updated: InvoiceListItem) => {
    setInvoices(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
  }, []);

  const filtered = invoices.filter(inv =>
    !search ||
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const total = invoices.reduce((a, i) => a + (Number(i.total_amount) || 0), 0);
  const paid = invoices.filter(i => i.status === "PAID").reduce((a, i) => a + (Number(i.total_amount) || 0), 0);
  const outstanding = invoices.filter(i => ["SENT", "DRAFT"].includes(i.status)).reduce((a, i) => a + (Number(i.total_amount) || 0), 0);
  const overdue = invoices.filter(i => i.status === "OVERDUE").reduce((a, i) => a + (Number(i.total_amount) || 0), 0);

  const handleMarkSent = async (inv: InvoiceListItem, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActionLoading(inv.id);
    try { const u = await invoicesApi.markSent(inv.id); handleUpdate(u); } catch {}
    setActionLoading(null);
  };
  const handleMarkPaid = async (inv: InvoiceListItem, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActionLoading(inv.id);
    try { const u = await invoicesApi.markPaid(inv.id); handleUpdate(u); } catch {}
    setActionLoading(null);
  };
  const handleDownload = async (inv: InvoiceListItem, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActionLoading(inv.id);
    try { await invoicesApi.downloadPDF(inv.id, inv.invoice_number); } catch {}
    setActionLoading(null);
  };

  const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: "", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "PAID", label: "Paid" },
    { value: "OVERDUE", label: "Overdue" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/15">
            <Receipt className="w-5 h-5 text-background" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Invoices</h1>
            {currentProjectTitle && <p className="text-xs text-surface-400">{currentProjectTitle}</p>}
          </div>
        </div>
        <Link
          href={`/dashboard/projects/${projectUid}/invoices/new`}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:opacity-90 text-background rounded-xl font-bold text-sm transition-all shadow-md shadow-accent/20 active:scale-95"
        >
          <Plus className="w-4 h-4 text-background" />
          New Invoice
        </Link>
      </div>

      {/* ── Company Profile Panel ── */}
      <CompanyProfilePanel onProfileLoaded={setProfile} />

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Invoiced" value={fmtINR(total)} icon={<TrendingUp className="w-4 h-4 text-accent" />} borderColor="border-l-accent" />
        <StatCard label="Paid" value={fmtINR(paid)} icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} borderColor="border-l-emerald-500" />
        <StatCard label="Outstanding" value={fmtINR(outstanding)} icon={<Clock className="w-4 h-4 text-blue-500" />} borderColor="border-l-blue-500" />
        <StatCard label="Overdue" value={fmtINR(overdue)} icon={<AlertCircle className="w-4 h-4 text-red-500" />} borderColor="border-l-red-500" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice # or client…"
            className="w-full pl-8 pr-3 py-2 bg-surface-card border border-surface-200 rounded-lg text-sm text-foreground placeholder:text-surface-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors shadow-xs"
          />
        </div>

        {/* Status filter tabs (only for table view) */}
        {view === "table" && (
          <div className="flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-lg p-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === f.value
                    ? "bg-accent text-background font-bold shadow-xs"
                    : "text-surface-400 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center bg-surface-100 border border-surface-200 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-md transition-all ${view === "kanban" ? "bg-accent text-background font-bold shadow-xs" : "text-surface-400 hover:text-foreground"}`}
            title="Kanban view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded-md transition-all ${view === "table" ? "bg-accent text-background font-bold shadow-xs" : "text-surface-400 hover:text-foreground"}`}
            title="Table view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={load}
          className="p-2 rounded-lg border border-surface-200 bg-surface-card text-surface-400 hover:text-foreground hover:bg-surface-100 transition-colors shadow-xs"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-32 gap-2 text-surface-400">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-sm">Loading invoices…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-red-500">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm font-semibold">{error}</p>
          <button onClick={load} className="text-xs text-accent hover:underline">Try again</button>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-surface-400">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-accent" />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm">No invoices yet</p>
            <p className="text-xs mt-0.5">Create your first invoice to get started</p>
          </div>
          <Link
            href={`/dashboard/projects/${projectUid}/invoices/new`}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:opacity-90 text-background rounded-lg text-xs font-bold transition-all shadow-md shadow-accent/20"
          >
            <Plus className="w-3.5 h-3.5 text-background" />
            Create First Invoice
          </Link>
        </div>
      ) : view === "kanban" ? (
        <InvoiceKanban
          invoices={filtered}
          projectUid={projectUid}
          onUpdate={handleUpdate}
        />
      ) : (
        <div className="bg-surface-card border border-surface-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-100/60 border-b border-surface-200">
                {["Invoice #", "Client", "Issue Date", "Due Date", "Amount", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-surface-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/60">
              {filtered.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => window.location.href = `/dashboard/projects/${projectUid}/invoices/${inv.id}`}
                  className="hover:bg-surface-100/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-accent">{inv.invoice_number}</span></td>
                  <td className="px-4 py-3"><span className="text-sm font-semibold text-foreground">{inv.client_name}</span></td>
                  <td className="px-4 py-3 text-xs text-surface-400">{fmtDate(inv.issue_date)}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">
                    {inv.due_date ? (
                      <span className={new Date(inv.due_date) < new Date() && inv.status !== "PAID" ? "text-red-500 font-semibold" : ""}>
                        {fmtDate(inv.due_date)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3"><span className="text-sm font-bold text-foreground">{fmtINR(inv.total_amount)}</span></td>
                  <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status as InvoiceStatus} size="sm" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => handleDownload(inv, e)} disabled={actionLoading === inv.id} className="p-1.5 rounded-md text-surface-400 hover:text-accent hover:bg-surface-100 transition-colors" title="Download PDF">
                        {actionLoading === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-[9px] font-bold">PDF</span>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-surface-400 text-right border-t border-surface-200">
            {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
            {(statusFilter || search) && ` (filtered from ${invoices.length})`}
          </p>
        </div>
      )}
    </div>
  );
}
