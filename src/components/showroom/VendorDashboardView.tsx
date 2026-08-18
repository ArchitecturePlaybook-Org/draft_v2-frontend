"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  fetchVendorStats, 
  fetchVendorProducts, 
  deleteProduct, 
  updateProduct,
  type Product, 
  type ProductStatus,
  type VendorStats 
} from "@/domains/showroom/api";
import { VendorProductModal } from "@/components/showroom/VendorProductModal";
import { toast } from "sonner";

const STATUS_BADGES: Record<ProductStatus, { label: string; style: string }> = {
  ACTIVE: { label: "🟢 Active", style: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  DRAFT: { label: "✏️ Draft", style: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  PAUSED: { label: "⏸️ Paused", style: "bg-surface-200 dark:bg-surface-800 text-surface-500 border-surface-300 dark:border-surface-700" },
  SOLD_OUT: { label: "🔴 Sold Out", style: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
};

export function VendorDashboardView() {
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/dashboard/showroom") ? "/dashboard/showroom" : "/showroom";

  const [stats, setStats] = useState<VendorStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "ALL">("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetchVendorStats().catch(() => null),
        fetchVendorProducts().catch(() => ({ count: 0, next: null, previous: null, results: [] }))
      ]);

      setStats(sRes);
      const list = Array.isArray(pRes) ? pRes : (pRes?.results || []);
      setProducts(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete product '${name}' (#${id})?`)) return;
    try {
      await deleteProduct(id);
      toast.success(`Product '${name}' removed.`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product.");
    }
  };

  const handleStatusToggle = async (id: number, newStatus: ProductStatus) => {
    try {
      const updated = await updateProduct(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const q = search.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch =
      p.id.toString().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in select-none">
      
      {/* Product Builder / Editor Modal */}
      <VendorProductModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedProduct(null); }}
        product={selectedProduct}
        onSuccess={loadData}
      />

      {/* Top Banner Bar */}
      <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-accent/20 text-accent flex items-center justify-center font-black text-xl border border-accent/30 shadow-xs shrink-0">
            🏪
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-primary tracking-tight truncate">
                Vendor Showroom Portal
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Storefront Live</span>
              </span>
            </div>
            <p className="text-xs font-medium text-surface-400 truncate">
              Manage your product catalog, upload 3D/BIM assets, and process inbound architect inquiries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => { setSelectedProduct(null); setModalOpen(true); }}
            className="px-4 py-2 bg-accent text-background font-black rounded-xl text-xs hover:opacity-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>➕ Add New Listing</span>
          </button>

          <Link
            href={`${basePath}`}
            className="px-3.5 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 text-primary font-extrabold rounded-xl text-xs transition-all border border-surface-200/60 dark:border-surface-700 shadow-2xs flex items-center gap-1.5"
          >
            <span>Public Catalog</span>
            <span className="text-[10px]">→</span>
          </Link>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-wider block">Total SKUs</span>
          <p className="text-xl font-black text-primary font-mono">{stats?.total_products ?? 0}</p>
        </div>

        <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-wider block">Active Public</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats?.active_products ?? 0}</p>
        </div>

        <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-wider block">Draft Items</span>
          <p className="text-xl font-black text-amber-500 font-mono">{stats?.draft_products ?? 0}</p>
        </div>

        <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-wider block">Total Views</span>
          <p className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono">{stats?.total_views ?? 0}</p>
        </div>

        <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-wider block">Inquiries / RFQs</span>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">{stats?.total_interests ?? 0}</p>
        </div>

        <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-wider block">Pending RFQs</span>
          <p className="text-xl font-black text-rose-500 font-mono">{stats?.pending_orders ?? 0}</p>
        </div>
      </div>

      {/* Main Vendor Products Data Table Container */}
      <div className="bg-surface-card border border-surface-200/80 dark:border-surface-800 rounded-2xl shadow-sm overflow-hidden space-y-0">
        
        {/* Top Controls Toolbar */}
        <div className="p-3.5 border-b border-surface-200/80 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-surface-400 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor catalog by ID, name, category..."
              className="w-full pl-9 pr-8 py-1.5 bg-surface-card border border-surface-200 dark:border-surface-700/80 rounded-xl text-xs outline-none focus:border-accent text-primary font-medium transition-all shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-2.5 flex items-center text-surface-400 hover:text-rose-500 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-surface-400 shrink-0">
            <span>Showing {filteredProducts.length} of {products.length} catalog items</span>
          </div>
        </div>

        {/* Status Filter Tab Pills */}
        <div className="px-3.5 py-2 bg-surface-100/50 dark:bg-surface-900/30 border-b border-surface-200/60 dark:border-surface-800 flex items-center gap-1.5 overflow-x-auto">
          {(["ALL", "ACTIVE", "DRAFT", "PAUSED", "SOLD_OUT"] as const).map((st) => {
            const count = st === "ALL" ? products.length : products.filter((p) => p.status === st).length;
            const isActive = statusFilter === st;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-accent text-background shadow-2xs"
                    : "bg-surface-card border border-surface-200/60 dark:border-surface-800 text-surface-500 hover:text-primary hover:border-surface-300"
                }`}
              >
                <span>{st === "ALL" ? "📦 All" : STATUS_BADGES[st]?.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  isActive ? "bg-background/20 text-background" : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-100/70 dark:bg-surface-900/70 border-b border-surface-200/80 dark:border-surface-800 text-[10px] font-black uppercase tracking-wider text-surface-400">
                <th className="py-2.5 px-4 w-16">SKU ID</th>
                <th className="py-2.5 px-4 min-w-[240px]">Product Name &amp; Category</th>
                <th className="py-2.5 px-4 min-w-[120px]">Price</th>
                <th className="py-2.5 px-4 w-20 text-center">Views</th>
                <th className="py-2.5 px-4 w-20 text-center">Inquiries</th>
                <th className="py-2.5 px-4 w-24">Assets</th>
                <th className="py-2.5 px-4 w-32">Status</th>
                <th className="py-2.5 px-4 min-w-[160px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/60 dark:divide-surface-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 w-8 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-40 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-8 bg-surface-200 dark:bg-surface-800 rounded mx-auto" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-8 bg-surface-200 dark:bg-surface-800 rounded mx-auto" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-surface-200 dark:bg-surface-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-24 bg-surface-200 dark:bg-surface-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center text-surface-400">
                    <div className="space-y-2 max-w-xs mx-auto">
                      <span className="text-3xl block">🏛️</span>
                      <p className="font-bold text-primary text-sm">No Products Found</p>
                      <p className="text-xs">
                        {search ? `No products matching '${search}'` : "Click 'Add New Listing' to publish your first product to the Showroom."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const badge = STATUS_BADGES[p.status] || STATUS_BADGES.ACTIVE;

                  return (
                    <tr key={p.id} className="hover:bg-surface-100/60 dark:hover:bg-surface-800/40 transition-colors group">
                      
                      {/* SKU ID */}
                      <td className="py-3 px-4 font-mono font-black text-surface-400 text-xs">
                        #{p.id}
                      </td>

                      {/* Title & Category */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-800 overflow-hidden shrink-0 shadow-2xs">
                            {p.cover_image_url ? (
                              <img src={p.cover_image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-surface-400 font-bold">🏛️</div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <span className="font-bold text-primary group-hover:text-accent transition-colors line-clamp-1 text-xs">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-surface-400 font-semibold">
                              <span className="px-1.5 py-0.2 rounded-md bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">{p.category}</span>
                              {p.subcategory && <span>· {p.subcategory}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-extrabold text-primary text-xs">
                        {p.price_display || (p.price_min ? `₹${p.price_min}` : "POA")}
                      </td>

                      {/* Views */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-surface-500">
                        👁️ {p.views_count}
                      </td>

                      {/* Interests */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                        🔥 {p.interest_count}
                      </td>

                      {/* 3D / BIM Assets */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {p.has_3d_model && (
                            <span className="px-1.5 py-0.2 text-[8px] font-black bg-accent text-background rounded-md">3D</span>
                          )}
                          {p.has_bim_file && (
                            <span className="px-1.5 py-0.2 text-[8px] font-black bg-sky-500 text-white rounded-md">BIM</span>
                          )}
                          {p.spec_sheet_url && (
                            <span className="px-1.5 py-0.2 text-[8px] font-black bg-purple-500 text-white rounded-md">PDF</span>
                          )}
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3 px-4">
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusToggle(p.id, e.target.value as ProductStatus)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-all ${badge.style}`}
                        >
                          <option value="ACTIVE">🟢 Active</option>
                          <option value="DRAFT">✏️ Draft</option>
                          <option value="PAUSED">⏸️ Paused</option>
                          <option value="SOLD_OUT">🔴 Sold Out</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          <Link
                            href={`${basePath}/${p.slug}`}
                            className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 text-primary font-extrabold rounded-xl text-[11px] transition-colors cursor-pointer border border-surface-200/60 dark:border-surface-700 shadow-2xs"
                            title="View Public Listing"
                          >
                            👁️ View
                          </Link>

                          <button
                            onClick={() => { setSelectedProduct(p); setModalOpen(true); }}
                            className="px-2.5 py-1 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 font-black rounded-xl text-[11px] transition-colors cursor-pointer shadow-2xs"
                            title="Edit Product Specs"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-black rounded-xl text-[11px] transition-colors cursor-pointer shadow-2xs"
                            title="Delete Product"
                          >
                            🗑️
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

      </div>
    </div>
  );
}
