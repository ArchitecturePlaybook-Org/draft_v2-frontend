"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ProductOrder, type OrderStatus } from "@/domains/showroom/api";
import { ShowroomOrderDetailModal } from "@/components/showroom/ShowroomOrderDetailModal";
import { format } from "date-fns";

const STATUS_BADGES: Record<OrderStatus, { label: string; style: string; icon: string }> = {
  PENDING: { label: "Pending", style: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: "⏳" },
  ACCEPTED: { label: "Accepted", style: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: "✅" },
  DECLINED: { label: "Declined", style: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: "❌" },
  FULFILLED: { label: "Fulfilled", style: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30", icon: "📦" },
  CANCELLED: { label: "Cancelled", style: "bg-surface-200 dark:bg-surface-800 text-surface-500 border-surface-300 dark:border-surface-700", icon: "🚫" },
};

interface ShowroomOrdersTableProps {
  orders: ProductOrder[];
  mode: "buyer" | "vendor";
  onOpenChat: (order: ProductOrder) => void;
  onCancelOrder?: (id: number) => void;
  onUpdateStatus?: (id: number, status: OrderStatus, vendorNote?: string) => void;
  loading?: boolean;
}

export function ShowroomOrdersTable({
  orders,
  mode,
  onOpenChat,
  onCancelOrder,
  onUpdateStatus,
  loading = false,
}: ShowroomOrdersTableProps) {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/dashboard/showroom") ? "/dashboard/showroom" : "/showroom";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<ProductOrder | null>(null);

  // Reset to page 1 on search/filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (status: OrderStatus | "ALL") => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Filter orders by search & status
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      const q = search.toLowerCase().trim();
      if (!q) return matchesStatus;

      const matchesSearch =
        o.id.toString().includes(q) ||
        o.product_name.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.message.toLowerCase().includes(q) ||
        (o.vendor_note && o.vendor_note.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  // Paginate filtered results
  const totalEntries = filteredOrders.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  const TABS: { id: OrderStatus | "ALL"; label: string; icon: string }[] = [
    { id: "ALL", label: "All Orders", icon: "📦" },
    { id: "PENDING", label: "Pending", icon: "⏳" },
    { id: "ACCEPTED", label: "Accepted", icon: "✅" },
    { id: "FULFILLED", label: "Fulfilled", icon: "📦" },
    { id: "DECLINED", label: "Declined", icon: "❌" },
    { id: "CANCELLED", label: "Cancelled", icon: "🚫" },
  ];

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy · p");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-surface-card border border-surface-200/80 dark:border-surface-800 rounded-2xl shadow-sm overflow-hidden select-none space-y-0">
      
      {/* Showroom Order Detail Form Modal */}
      <ShowroomOrderDetailModal
        order={selectedOrderDetail}
        isOpen={!!selectedOrderDetail}
        onClose={() => setSelectedOrderDetail(null)}
        mode={mode}
        onOpenChat={onOpenChat}
        onCancelOrder={onCancelOrder}
        onUpdateStatus={onUpdateStatus}
      />

      {/* ── Table Top Toolbar ─────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-surface-200/80 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/60 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Live Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-surface-400 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by order #, product name, or buyer..."
            className="w-full pl-9 pr-8 py-1.5 bg-surface-card border border-surface-200 dark:border-surface-700/80 rounded-xl text-xs outline-none focus:border-accent text-primary font-medium transition-all shadow-2xs"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setCurrentPage(1); }}
              className="absolute inset-y-0 right-2.5 flex items-center text-surface-400 hover:text-rose-500 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Rows per page selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-surface-400">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-surface-card border border-surface-200 dark:border-surface-700/80 rounded-xl px-2.5 py-1 text-xs font-bold text-primary outline-none focus:border-accent transition-all shadow-2xs cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* ── Status Filter Tab Pill Bar ──────────────────────────────── */}
      <div className="px-3.5 py-2 bg-surface-100/50 dark:bg-surface-900/30 border-b border-surface-200/60 dark:border-surface-800 flex items-center gap-1.5 overflow-x-auto">
        {TABS.map((t) => {
          const count = t.id === "ALL" ? orders.length : orders.filter((o) => o.status === t.id).length;
          const isActive = statusFilter === t.id;

          return (
            <button
              key={t.id}
              onClick={() => handleFilterChange(t.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-accent text-background shadow-2xs"
                  : "bg-surface-card border border-surface-200/60 dark:border-surface-800 text-surface-500 hover:text-primary hover:border-surface-300"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                isActive ? "bg-background/20 text-background" : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Streamlined Data Table ───────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-100/70 dark:bg-surface-900/70 border-b border-surface-200/80 dark:border-surface-800 text-[10px] font-black uppercase tracking-wider text-surface-400">
              <th className="py-2.5 px-4 w-16">Order ID</th>
              <th className="py-2.5 px-4 min-w-[240px]">Product Name</th>
              <th className="py-2.5 px-4 min-w-[150px]">{mode === "buyer" ? "Vendor Store" : "Buyer Customer"}</th>
              <th className="py-2.5 px-4 w-16 text-center">Qty</th>
              <th className="py-2.5 px-4 w-28">Status</th>
              <th className="py-2.5 px-4 w-36">Date Placed</th>
              <th className="py-2.5 px-4 min-w-[160px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200/60 dark:divide-surface-800/60">
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-4"><div className="h-4 w-8 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-40 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-24 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-8 bg-surface-200 dark:bg-surface-800 rounded mx-auto" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-20 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-24 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-24 bg-surface-200 dark:bg-surface-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center text-surface-400">
                  <div className="space-y-2 max-w-xs mx-auto">
                    <span className="text-3xl block">📭</span>
                    <p className="font-bold text-primary text-sm">No Orders Found</p>
                    <p className="text-xs">
                      {search ? `No orders matching query '${search}'` : `No orders in status '${statusFilter}'.`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const badge = STATUS_BADGES[order.status] || STATUS_BADGES.PENDING;

                return (
                  <tr 
                    key={order.id} 
                    onClick={() => setSelectedOrderDetail(order)}
                    className="hover:bg-surface-100/60 dark:hover:bg-surface-800/40 transition-colors cursor-pointer group"
                  >
                    
                    {/* Order ID */}
                    <td className="py-3 px-4 font-mono font-black text-surface-400 text-xs">
                      #{order.id}
                    </td>

                    {/* Product Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-800 overflow-hidden shrink-0 shadow-2xs">
                          {order.product_cover ? (
                            <img src={order.product_cover} alt={order.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-surface-400 font-bold">🏛️</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-primary group-hover:text-accent transition-colors line-clamp-1 block text-xs">
                            {order.product_name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Buyer / Vendor Party */}
                    <td className="py-3 px-4 font-semibold text-primary">
                      {mode === "buyer" ? (
                        <div className="flex items-center gap-1.5">
                          <span>🏛️</span>
                          <span className="truncate text-xs">Vendor Store</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>👤</span>
                          <span className="truncate font-bold text-xs">{order.buyer_name}</span>
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-primary">
                      {order.quantity}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1 shrink-0 ${badge.style}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    {/* Placed Date */}
                    <td className="py-3 px-4 text-surface-400 font-medium text-[11px] whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* View Form Details Button */}
                        <button
                          onClick={() => setSelectedOrderDetail(order)}
                          className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 text-primary font-extrabold rounded-xl text-[11px] transition-colors cursor-pointer border border-surface-200/60 dark:border-surface-700 shadow-2xs"
                        >
                          👁️ Details
                        </button>

                        {/* Live Chat Button */}
                        <button
                          onClick={() => onOpenChat(order)}
                          className="px-2.5 py-1 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 font-black rounded-xl text-[11px] transition-colors cursor-pointer shadow-2xs"
                          title="Open Live Chat Thread"
                        >
                          💬 Chat
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer Pagination Bar ───────────────────────────────── */}
      <div className="p-3.5 border-t border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <span className="text-surface-400 font-semibold">
          Showing <span className="text-primary font-bold">{totalEntries > 0 ? startIndex + 1 : 0}</span> to{" "}
          <span className="text-primary font-bold">{Math.min(startIndex + pageSize, totalEntries)}</span> of{" "}
          <span className="text-primary font-bold">{totalEntries}</span> entries
        </span>

        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={safeCurrentPage === 1}
            className="px-3 py-1 rounded-xl border border-surface-200 dark:border-surface-700 font-extrabold text-surface-600 dark:text-surface-300 hover:border-accent disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
          >
            ← Previous
          </button>

          <span className="px-3 py-1 font-extrabold text-primary bg-surface-card border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xs">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="px-3 py-1 rounded-xl border border-surface-200 dark:border-surface-700 font-extrabold text-surface-600 dark:text-surface-300 hover:border-accent disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
