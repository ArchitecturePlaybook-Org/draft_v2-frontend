"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchVendorStats,
  fetchVendorProducts,
  fetchVendorOrders,
  updateOrderStatus,
  deleteProduct,
  type VendorStats,
  type Product,
  type ProductOrder,
  type OrderStatus,
} from "@/domains/showroom/api";

type DashTab = "overview" | "listings" | "orders";

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  ACCEPTED:  "bg-green-100 text-green-700 border-green-200",
  DECLINED:  "bg-red-100 text-red-700 border-red-200",
  FULFILLED: "bg-blue-100 text-blue-700 border-blue-200",
  CANCELLED: "bg-surface-100 text-surface-500 border-surface-200",
};

const PRODUCT_STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-green-100 text-green-700",
  DRAFT:    "bg-surface-100 text-surface-500",
  PAUSED:   "bg-yellow-100 text-yellow-700",
  SOLD_OUT: "bg-red-100 text-red-700",
};

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-surface-card border border-surface-200 rounded-2xl p-5">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-2xl font-black text-primary">{value}</p>
      <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

export default function ShowroomVendorDashboard() {
  const [tab, setTab] = useState<DashTab>("overview");
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<OrderStatus | "ALL">("ALL");

  // Order action state
  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);
  const [vendorNote, setVendorNote] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, p, o] = await Promise.all([
          fetchVendorStats(),
          fetchVendorProducts(),
          fetchVendorOrders(),
        ]);
        setStats(s);
        setProducts(p.results || []);
        setOrders(o);
      } catch {
        // silently handle unauth
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleOrderUpdate = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingOrder(orderId);
    try {
      const updated = await updateOrderStatus(orderId, newStatus, vendorNote[orderId]);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  };

  const filteredOrders = orderFilter === "ALL" ? orders : orders.filter((o) => o.status === orderFilter);
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  const TABS: { id: DashTab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "listings", label: "My Listings", badge: products.length },
    { id: "orders", label: "Orders", badge: pendingCount || undefined },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/showroom" className="text-xs font-bold text-surface-400 hover:text-primary transition-colors uppercase tracking-wider">
            ← Back to Showroom
          </Link>
          <h1 className="text-3xl font-black text-primary mt-2">Vendor Dashboard</h1>
          <p className="text-surface-500 text-sm mt-1">Manage your products and handle buyer enquiries.</p>
        </div>
        <Link
          href="/showroom/dashboard/listings/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-accent transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Product
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-8 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t.id ? "bg-surface-card text-primary shadow-sm" : "text-surface-500 hover:text-primary"
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === t.id ? "bg-primary text-background" : "bg-surface-200 text-surface-600"}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-100 rounded-2xl h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ────────────────────────────────────────────── */}
          {tab === "overview" && stats && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Active Listings" value={stats.active_products} icon="📦" />
                <StatCard label="Total Views" value={stats.total_views.toLocaleString()} icon="👁️" />
                <StatCard label="Total Interests" value={stats.total_interests} icon="❤️" />
                <StatCard label="Pending Orders" value={stats.pending_orders} icon="📬" />
              </div>

              {pendingCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="text-2xl shrink-0">📬</div>
                  <div>
                    <p className="font-bold text-yellow-800">{pendingCount} pending order{pendingCount !== 1 ? 's' : ''} need your response</p>
                    <p className="text-sm text-yellow-700 mt-1">Buyers are waiting to hear from you. Accepting an order allows you to start a conversation.</p>
                    <button onClick={() => setTab("orders")} className="mt-3 text-xs font-bold text-yellow-900 underline">
                      View Orders →
                    </button>
                  </div>
                </div>
              )}

              {/* Recent products mini-table */}
              {products.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-primary uppercase tracking-wider mb-4">Recent Listings</h3>
                  <div className="bg-surface-card border border-surface-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-50 border-b border-surface-200">
                        <tr>
                          <th className="text-left px-5 py-3 text-xs font-bold text-surface-400 uppercase tracking-wider">Product</th>
                          <th className="text-left px-5 py-3 text-xs font-bold text-surface-400 uppercase tracking-wider">Status</th>
                          <th className="text-right px-5 py-3 text-xs font-bold text-surface-400 uppercase tracking-wider">Views</th>
                          <th className="text-right px-5 py-3 text-xs font-bold text-surface-400 uppercase tracking-wider">Interests</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {products.slice(0, 5).map((p) => (
                          <tr key={p.id} className="hover:bg-surface-50">
                            <td className="px-5 py-3 font-bold text-primary">{p.name}</td>
                            <td className="px-5 py-3">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${PRODUCT_STATUS_COLORS[p.status]}`}>{p.status}</span>
                            </td>
                            <td className="px-5 py-3 text-right text-surface-500">{p.views_count}</td>
                            <td className="px-5 py-3 text-right text-surface-500">{p.interest_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LISTINGS ────────────────────────────────────────────── */}
          {tab === "listings" && (
            <div className="space-y-3">
              {products.length === 0 ? (
                <div className="bg-surface-card border-2 border-dashed border-surface-200 rounded-2xl p-16 text-center">
                  <p className="text-5xl mb-4">📦</p>
                  <h3 className="text-xl font-bold text-primary mb-2">No Products Yet</h3>
                  <p className="text-surface-500 text-sm mb-6">Add your first product to start attracting buyers.</p>
                  <Link href="/showroom/dashboard/listings/new" className="px-6 py-3 bg-primary text-background font-bold rounded-xl text-sm hover:bg-accent transition-colors inline-block">
                    Add Your First Product
                  </Link>
                </div>
              ) : (
                products.map((p) => (
                  <div key={p.id} className="bg-surface-card border border-surface-200 rounded-2xl p-5 flex items-center gap-5 hover:shadow-sm transition-shadow">
                    {/* Cover */}
                    <div className="w-16 h-16 rounded-xl bg-surface-100 overflow-hidden shrink-0">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-surface-300">📦</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="font-bold text-primary text-sm truncate">{p.name}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${PRODUCT_STATUS_COLORS[p.status]}`}>{p.status}</span>
                      </div>
                      <p className="text-xs text-surface-400 mt-0.5">{p.category}{p.subcategory ? ` · ${p.subcategory}` : ""}</p>
                      <div className="flex gap-3 mt-1.5 text-xs text-surface-400">
                        <span>👁 {p.views_count} views</span>
                        <span>❤️ {p.interest_count} interests</span>
                        {p.price_display && <span className="font-bold text-primary">{p.price_display}</span>}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/showroom/${p.slug}`}
                        className="px-3 py-1.5 text-xs font-bold border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50 transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/showroom/dashboard/listings/${p.id}/edit`}
                        className="px-3 py-1.5 text-xs font-bold border border-accent/30 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="px-3 py-1.5 text-xs font-bold border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── ORDERS ─────────────────────────────────────────────── */}
          {tab === "orders" && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex gap-2 flex-wrap">
                {(["ALL", "PENDING", "ACCEPTED", "FULFILLED", "DECLINED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setOrderFilter(s)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                      orderFilter === s ? "bg-primary text-background border-primary" : "bg-surface-card text-surface-500 border-surface-200 hover:border-primary"
                    }`}
                  >
                    {s === "ALL" ? "All Orders" : s.charAt(0) + s.slice(1).toLowerCase()}
                    {s === "PENDING" && pendingCount > 0 && (
                      <span className="ml-1 bg-yellow-400 text-yellow-900 rounded-full px-1.5 font-black text-[9px]">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-surface-card border-2 border-dashed border-surface-200 rounded-2xl p-16 text-center">
                  <p className="text-5xl mb-4">📭</p>
                  <h3 className="text-xl font-bold text-primary mb-2">No Orders Yet</h3>
                  <p className="text-surface-500 text-sm">Buyers who express interest will appear here.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="bg-surface-card border border-surface-200 rounded-2xl overflow-hidden">
                    <div className="p-5 flex items-start gap-4">
                      {/* Product thumb */}
                      <div className="w-14 h-14 rounded-xl bg-surface-100 overflow-hidden shrink-0">
                        {order.product_cover ? (
                          <img src={order.product_cover} alt={order.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl text-surface-300">📦</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-primary text-sm">{order.product_name}</p>
                            <p className="text-xs text-surface-400 mt-0.5">
                              From: <span className="font-bold">{order.buyer_name}</span> · Qty: {order.quantity}
                            </p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider shrink-0 ${STATUS_COLORS[order.status]}`}>
                            {order.status}
                          </span>
                        </div>
                        {order.message && (
                          <p className="text-xs text-surface-600 mt-2 bg-surface-50 border border-surface-100 rounded-xl px-3 py-2 italic">
                            "{order.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {order.status === "PENDING" && (
                      <div className="px-5 pb-5 border-t border-surface-100 pt-4 space-y-3">
                        <textarea
                          rows={2}
                          value={vendorNote[order.id] || ""}
                          onChange={(e) => setVendorNote((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          placeholder="Add a note to the buyer (optional)..."
                          className="w-full px-3 py-2 border border-surface-200 rounded-xl text-xs resize-none focus:outline-none focus:border-accent"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOrderUpdate(order.id, "ACCEPTED")}
                            disabled={updatingOrder === order.id}
                            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {updatingOrder === order.id ? "..." : "✓ Accept"}
                          </button>
                          <button
                            onClick={() => handleOrderUpdate(order.id, "DECLINED")}
                            disabled={updatingOrder === order.id}
                            className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {order.status === "ACCEPTED" && (
                      <div className="px-5 pb-5 border-t border-surface-100 pt-4 flex gap-2">
                        <button
                          onClick={() => handleOrderUpdate(order.id, "FULFILLED")}
                          disabled={updatingOrder === order.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Mark Fulfilled
                        </button>
                        <p className="text-xs text-surface-400 self-center">
                          Reach out to the buyer via the messaging system to finalise details.
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
