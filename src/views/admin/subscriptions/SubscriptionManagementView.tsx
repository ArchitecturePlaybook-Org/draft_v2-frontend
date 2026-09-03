"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  DollarSign,
  RotateCcw,
  Check,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Download,
  Filter,
  Hash
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { COMPACT_UI } from "@/theme/ui-tokens";

import {
  adminBillingApi,
  AdminBillingOverview,
  AdminSubscriptionListItem,
  AdminInvoiceListItem,
  AdminRefundListItem
} from "@/domains/admin/billing-api";

import { ManageSubscriptionDrawer } from "./ManageSubscriptionDrawer";

export function SubscriptionManagementView() {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const router = useRouter();

  const isSuperAdmin = isAdmin || Boolean((user as any)?.is_superuser) || user?.email === "superadmin@ap.com";

  // Active Main Tab: "subscriptions" | "invoices" | "refunds" | "plans"
  const [activeTab, setActiveTab] = useState<"subscriptions" | "invoices" | "refunds" | "plans">("subscriptions");

  // Data states
  const [overview, setOverview] = useState<AdminBillingOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionListItem[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoiceListItem[]>([]);
  const [refunds, setRefunds] = useState<AdminRefundListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected subscription for drawer
  const [selectedSub, setSelectedSub] = useState<AdminSubscriptionListItem | null>(null);

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/unauthorized");
      return;
    }
    if (isSuperAdmin) {
      loadAllData();
    }
  }, [user, isSuperAdmin, router]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, subsData, invoicesData, refundsData] = await Promise.all([
        adminBillingApi.getOverview().catch(() => null),
        adminBillingApi.listSubscriptions().catch(() => []),
        adminBillingApi.listInvoices().catch(() => []),
        adminBillingApi.listRefunds().catch(() => []),
      ]);

      setOverview(overviewData);
      setSubscriptions(subsData || []);
      setInvoices(invoicesData || []);
      setRefunds(refundsData || []);
    } catch (e) {
      console.error("Failed to load billing data", e);
      toast.error("Failed to load billing administration data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundAction = async (refundId: number, action: "approve" | "reject") => {
    try {
      await adminBillingApi.actionRefund(refundId, action);
      toast.success(`Refund request ${action === "approve" ? "Approved" : "Rejected"}`);
      loadAllData();
    } catch (e) {
      toast.error("Failed to update refund status.");
    }
  };

  // Filtered Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => {
      const matchesSearch =
        s.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.owner_email && s.owner_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.account_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.transaction_id && s.transaction_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.provider_subscription_id && s.provider_subscription_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ? true : s.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesPlan =
        planFilter === "ALL" ? true : s.plan?.code === planFilter;

      const matchesProvider =
        providerFilter === "ALL" ? true : s.provider.toLowerCase() === providerFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesPlan && matchesProvider;
    });
  }, [subscriptions, searchQuery, statusFilter, planFilter, providerFilter]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch =
        inv.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.owner_email && inv.owner_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        inv.provider_invoice_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.transaction_id && inv.transaction_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        String(inv.id).includes(searchQuery);

      const matchesStatus =
        statusFilter === "ALL" ? true : inv.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Paginated Data for active view
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscriptions.slice(start, start + itemsPerPage);
  }, [filteredSubscriptions, currentPage, itemsPerPage]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  const activeTotalItems = activeTab === "subscriptions" ? filteredSubscriptions.length : filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(activeTotalItems / itemsPerPage));

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12 min-w-0 max-w-full">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            <span>Payments & Subscription Management</span>
          </h1>
          <p className="text-xs text-surface-400 font-semibold mt-1">
            Super Admin dashboard to monitor active paid users, revenue logs, transaction IDs, and subscription plans.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Revenue */}
        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-lg flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-emerald-500 block leading-none">
              ₹{overview?.total_revenue?.toLocaleString() || "0"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Total Revenue Paid</span>
          </div>
        </div>

        {/* Active Paid Subscriptions */}
        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 font-black text-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">
              {overview?.active_paid_subscriptions || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Active Paid Workspaces</span>
          </div>
        </div>

        {/* Trialing & Past Due */}
        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black text-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-amber-500 leading-none">{overview?.trialing_subscriptions || 0}</span>
              <span className="text-xs text-surface-400">/</span>
              <span className="text-sm font-bold text-rose-500">{overview?.past_due_subscriptions || 0} past due</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Trialing / Overdue</span>
          </div>
        </div>

        {/* Pending Refunds */}
        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 font-black text-lg flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">
              {overview?.pending_refunds_count || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Pending Refund Requests</span>
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-surface-200/80 dark:border-surface-800 pb-2">
        <button
          onClick={() => { setActiveTab("subscriptions"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "subscriptions"
              ? "bg-accent text-background shadow-xs"
              : "text-surface-400 hover:text-primary bg-surface-100/50 dark:bg-surface-900/50"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("invoices"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "invoices"
              ? "bg-accent text-background shadow-xs"
              : "text-surface-400 hover:text-primary bg-surface-100/50 dark:bg-surface-900/50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Payment & Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("refunds"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "refunds"
              ? "bg-accent text-background shadow-xs"
              : "text-surface-400 hover:text-primary bg-surface-100/50 dark:bg-surface-900/50"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refund Requests ({refunds.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("plans"); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "plans"
              ? "bg-accent text-background shadow-xs"
              : "text-surface-400 hover:text-primary bg-surface-100/50 dark:bg-surface-900/50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Plan Catalog & Analytics</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      {(activeTab === "subscriptions" || activeTab === "invoices") && (
        <div className="p-3.5 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-surface-400" />
            <input
              type="text"
              placeholder="Search firm, email, or Transaction ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={COMPACT_UI.input + " pl-9 w-full"}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            
            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className={COMPACT_UI.select}
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
              <option value="paid">Paid (Invoices)</option>
              <option value="void">Void / Refunded</option>
            </select>

            {activeTab === "subscriptions" && (
              <>
                {/* Plan Filter */}
                <select
                  value={planFilter}
                  onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
                  className={COMPACT_UI.select}
                >
                  <option value="ALL">All Plans</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="free">Free / Trial</option>
                </select>

                {/* Provider Filter */}
                <select
                  value={providerFilter}
                  onChange={(e) => { setProviderFilter(e.target.value); setCurrentPage(1); }}
                  className={COMPACT_UI.select}
                >
                  <option value="ALL">All Providers</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                  <option value="manual">Manual</option>
                </select>
              </>
            )}

          </div>

        </div>
      )}

      {/* TAB 1: SUBSCRIPTIONS TABLE */}
      {activeTab === "subscriptions" && (
        <div className="bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-surface-100/60 dark:bg-surface-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : paginatedSubscriptions.length === 0 ? (
            <div className="p-12 text-center text-surface-400 space-y-2">
              <CreditCard className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-bold">No subscriptions found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200/80 dark:border-surface-800 text-[9px] font-black uppercase tracking-widest text-surface-400 bg-surface-100/40 dark:bg-surface-950/40">
                    <th className="py-3 px-4">Organization & Owner</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Plan Code</th>
                    <th className="py-3 px-3">Gateway & Sub ID</th>
                    <th className="py-3 px-3">Total Paid</th>
                    <th className="py-3 px-3">Period End Date</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 dark:divide-surface-800 text-xs font-semibold">
                  {paginatedSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface-100/50 dark:hover:bg-surface-800/30 transition-colors">
                      
                      {/* Organization & Owner */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black uppercase shrink-0">
                            {sub.account_name.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-primary block truncate max-w-[180px]">{sub.account_name}</span>
                            <span className="text-[10px] text-surface-400 font-medium block truncate">
                              {sub.owner_email || `ID: ${sub.account_uid}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                          sub.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : sub.status === "trialing"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : sub.status === "past_due"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-surface-200/50 text-surface-400 border-surface-300 dark:border-surface-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            sub.status === "active" ? "bg-emerald-500" : sub.status === "trialing" ? "bg-blue-500" : "bg-rose-500"
                          }`} />
                          {sub.status}
                        </span>
                      </td>

                      {/* Plan Code */}
                      <td className="py-3 px-3">
                        <span className="text-accent font-bold block">{sub.plan?.name || "No Plan"}</span>
                        <span className="text-[9px] text-surface-400 font-black uppercase tracking-wider">{sub.plan?.code || "free"}</span>
                      </td>

                      {/* Gateway & Sub ID */}
                      <td className="py-3 px-3">
                        <span className="text-surface-400 font-bold uppercase text-[10px] block">{sub.provider}</span>
                        <span className="text-[9px] font-mono text-accent truncate block max-w-[120px]" title={sub.transaction_id || sub.provider_subscription_id}>
                          {sub.transaction_id || sub.provider_subscription_id || "N/A"}
                        </span>
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3 font-bold text-emerald-500">
                        ₹{sub.total_paid?.toLocaleString() || "0"}
                      </td>

                      {/* Period End Date */}
                      <td className="py-3 px-3 text-surface-400 text-[11px]">
                        {sub.current_period_end ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-surface-400" />
                            <span>{new Date(sub.current_period_end).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-surface-400">No Expiry</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedSub(sub)}
                          className="px-2.5 py-1 bg-surface-200/70 dark:bg-surface-800 hover:bg-accent hover:text-background text-primary font-black text-[10px] uppercase tracking-wider rounded-md transition-all shadow-2xs flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVOICES & PAYMENTS LOG TABLE */}
      {activeTab === "invoices" && (
        <div className="bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-surface-100/60 dark:bg-surface-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : paginatedInvoices.length === 0 ? (
            <div className="p-12 text-center text-surface-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-bold">No payment transactions found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200/80 dark:border-surface-800 text-[9px] font-black uppercase tracking-widest text-surface-400 bg-surface-100/40 dark:bg-surface-950/40">
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-3">Organization Name</th>
                    <th className="py-3 px-3">Owner Email</th>
                    <th className="py-3 px-3">Amount Paid</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Date & Time Paid</th>
                    <th className="py-3 px-3">Transaction ID / Payment Ref</th>
                    <th className="py-3 px-3 text-right">PDF Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 dark:divide-surface-800 text-xs font-semibold">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-100/50 dark:hover:bg-surface-800/30 transition-colors">
                      
                      {/* Invoice ID */}
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        #{inv.id}
                      </td>

                      {/* Organization */}
                      <td className="py-3 px-3 font-bold text-primary truncate max-w-[180px]">
                        {inv.account_name}
                      </td>

                      {/* Owner Email */}
                      <td className="py-3 px-3 text-surface-400 truncate max-w-[180px]">
                        {inv.owner_email || "N/A"}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3 px-3 font-bold text-emerald-500">
                        {inv.currency} {Number(inv.amount_paid).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                          inv.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : inv.status === "open"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                          {inv.status}
                        </span>
                      </td>

                      {/* Date & Time Paid */}
                      <td className="py-3 px-3 text-surface-400 text-[11px]">
                        {new Date(inv.created_at).toLocaleString()}
                      </td>

                      {/* Transaction ID / Payment Ref */}
                      <td className="py-3 px-3 text-surface-400 font-mono text-[10px] truncate max-w-[150px]" title={inv.transaction_id || inv.provider_invoice_id}>
                        <span className="bg-surface-200/60 dark:bg-surface-800 px-1.5 py-0.5 rounded text-accent font-bold border border-surface-300 dark:border-surface-700">
                          {inv.transaction_id || inv.provider_invoice_id || "N/A"}
                        </span>
                      </td>

                      {/* Actions / PDF */}
                      <td className="py-3 px-3 text-right">
                        {inv.pdf_url ? (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-surface-200/70 dark:bg-surface-800 hover:bg-accent hover:text-background text-primary font-black text-[10px] uppercase tracking-wider rounded-md transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-surface-400">—</span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REFUND REQUESTS TABLE */}
      {activeTab === "refunds" && (
        <div className="bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-surface-100/60 dark:bg-surface-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : refunds.length === 0 ? (
            <div className="p-12 text-center text-surface-400 space-y-2">
              <RotateCcw className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-bold">No pending or completed refund requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200/80 dark:border-surface-800 text-[9px] font-black uppercase tracking-widest text-surface-400 bg-surface-100/40 dark:bg-surface-950/40">
                    <th className="py-3 px-4">Refund ID</th>
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Owner Email</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Transaction ID</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Requested At</th>
                    <th className="py-3 px-3 text-right">Super Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 dark:divide-surface-800 text-xs font-semibold">
                  {refunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-surface-100/50 dark:hover:bg-surface-800/30 transition-colors">
                      
                      {/* Refund ID */}
                      <td className="py-3 px-4 font-mono font-bold text-accent">
                        #{ref.id}
                      </td>

                      {/* Organization */}
                      <td className="py-3 px-3 font-bold text-primary truncate max-w-[160px]">
                        {ref.account_name}
                      </td>

                      {/* Owner Email */}
                      <td className="py-3 px-3 text-surface-400 truncate max-w-[160px]">
                        {ref.owner_email || "N/A"}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 font-bold text-rose-500">
                        {ref.currency} {Number(ref.amount).toLocaleString()}
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3 px-3 font-mono text-[10px] text-surface-400 truncate max-w-[120px]">
                        {ref.transaction_id || "N/A"}
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-3 text-surface-400 truncate max-w-[180px]" title={ref.reason}>
                        {ref.reason || "No reason specified"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                          ref.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : ref.status === "pending"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                          {ref.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-surface-400 text-[11px]">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {ref.status === "pending" ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => handleRefundAction(ref.id, "approve")}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 font-black text-[9px] uppercase tracking-wider rounded transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRefundAction(ref.id, "reject")}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-black text-[9px] uppercase tracking-wider rounded transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-surface-400 font-bold uppercase">{ref.status}</span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PLAN CATALOG & DISTRIBUTION */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Plan Distribution Card */}
          <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>Subscriber Distribution by Plan</span>
            </h3>
            
            <div className="space-y-2 pt-2">
              {overview?.plan_distribution.map((pd) => (
                <div key={pd.plan_code} className="p-3 rounded-lg bg-surface-100/50 dark:bg-surface-950/50 border border-surface-200/60 dark:border-surface-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-primary block">{pd.plan_name}</span>
                    <span className="text-[10px] font-mono text-surface-400 uppercase">{pd.plan_code}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-accent">{pd.count}</span>
                    <span className="text-[9px] text-surface-400 uppercase block font-bold">Workspaces</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Plan Controls */}
          <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Platform Tier Rates</span>
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-100/40 dark:bg-surface-950/40 border border-surface-200/60 dark:border-surface-800 flex justify-between items-center">
                <div>
                  <span className="font-black text-primary block">Starter Plan</span>
                  <span className="text-[10px] text-surface-400">Up to 5 Projects, 10GB storage</span>
                </div>
                <span className="font-black text-emerald-500">₹1,999 / mo</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-100/40 dark:bg-surface-950/40 border border-surface-200/60 dark:border-surface-800 flex justify-between items-center">
                <div>
                  <span className="font-black text-primary block">Professional Plan</span>
                  <span className="text-[10px] text-surface-400">Up to 25 Projects, 100GB storage</span>
                </div>
                <span className="font-black text-emerald-500">₹4,999 / mo</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-100/40 dark:bg-surface-950/40 border border-surface-200/60 dark:border-surface-800 flex justify-between items-center">
                <div>
                  <span className="font-black text-primary block">Enterprise Plan</span>
                  <span className="text-[10px] text-surface-400">Unlimited Projects, Dedicated Support</span>
                </div>
                <span className="font-black text-emerald-500">₹14,999 / mo</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Pagination Footer */}
      {(activeTab === "subscriptions" || activeTab === "invoices") && activeTotalItems > 0 && (
        <div className="p-3 border-t border-surface-200/80 dark:border-surface-800 bg-surface-100/30 dark:bg-surface-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2 text-surface-400 font-semibold text-[11px]">
            <span>
              Showing <strong className="text-primary">{Math.min((currentPage - 1) * itemsPerPage + 1, activeTotalItems)}</strong> to{" "}
              <strong className="text-primary">{Math.min(currentPage * itemsPerPage, activeTotalItems)}</strong> of{" "}
              <strong className="text-primary">{activeTotalItems}</strong> items
            </span>

            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-[10px] font-bold text-primary cursor-pointer outline-none ml-2"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-surface-200/80 dark:border-surface-800 bg-surface-100/80 dark:bg-surface-800/80 text-surface-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-[10px] font-black uppercase tracking-wider text-surface-400">
              Page <strong className="text-primary">{currentPage}</strong> of <strong className="text-primary">{totalPages}</strong>
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-surface-200/80 dark:border-surface-800 bg-surface-100/80 dark:bg-surface-800/80 text-surface-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* Subscription Edit Drawer */}
      <ManageSubscriptionDrawer
        subscription={selectedSub}
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        onSuccess={() => loadAllData()}
      />

    </div>
  );
}
