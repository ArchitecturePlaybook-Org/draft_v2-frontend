"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchProducts, type Product } from "@/domains/showroom/api";

const CATEGORIES = [
  "All", "Furniture", "Lighting", "Finishes", "Fixtures",
  "Acoustics", "Outdoor", "Structural", "MEP", "Technology", "Soft Furnishings",
];

const SORTS = [
  { value: "-created_at", label: "Newest" },
  { value: "-views_count", label: "Most Viewed" },
  { value: "-interest_count", label: "Most Popular" },
  { value: "name", label: "Name A–Z" },
];

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/showroom/${product.slug}`}
      className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-surface-200 bg-surface-card cursor-pointer block"
    >
      {/* Image */}
      <div className="relative w-full bg-surface-100 overflow-hidden">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt={product.name}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-52 flex items-center justify-center">
            <svg className="w-16 h-16 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span className="bg-surface-card/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm">
            {product.category}
          </span>
          {product.has_3d_model && (
            <span className="bg-accent/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-background shadow-sm">
              3D
            </span>
          )}
          {product.has_bim_file && (
            <span className="bg-primary/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-background shadow-sm">
              BIM
            </span>
          )}
          {product.is_featured && (
            <span className="bg-amber-400/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-background shadow-sm">
              ✦ Featured
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">{product.name}</h3>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs font-medium text-surface-500">{product.vendor_name}</span>
          {product.price_display && (
            <span className="text-sm font-black text-primary">{product.price_display}</span>
          )}
        </div>
        {(product.lead_time_days || product.country_of_origin) && (
          <div className="flex items-center gap-2 mt-2 text-[10px] text-surface-400 font-medium">
            {product.lead_time_days && <span>🕐 {product.lead_time_days}d lead</span>}
            {product.country_of_origin && <span>🌍 {product.country_of_origin}</span>}
          </div>
        )}
      </div>

      {/* Hover CTA */}
      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 p-3">
        <div className="bg-primary text-background text-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest">
          View Details
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="break-inside-avoid rounded-2xl border border-surface-200 bg-surface-card overflow-hidden animate-pulse">
      <div className="h-52 bg-surface-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-surface-200 rounded w-3/4" />
        <div className="h-3 bg-surface-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function ShowroomDiscoverPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("-created_at");
  const [has3d, setHas3d] = useState(false);
  const [hasBim, setHasBim] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({
        search: search || undefined,
        category: category !== "All" ? category : undefined,
        sort,
        has_3d: has3d || undefined,
        has_bim: hasBim || undefined,
      });
      setProducts(res.results || []);
      setTotal(res.count || 0);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, has3d, hasBim]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 lg:p-10">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div className="flex-1">
            <p className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Showroom</p>
            <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight leading-tight">
              Discover Products
            </h1>
            <p className="text-surface-500 mt-2">Curated materials, furniture, and fixtures for your next project.</p>
          </div>
          <Link
            href="/showroom/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-accent transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Vendor Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex gap-2 flex-1 min-w-[240px] max-w-sm">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
              placeholder="Search products..."
              className="flex-1 px-4 py-2 text-sm border border-surface-200 rounded-xl bg-surface-card text-primary placeholder:text-surface-400 focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => setSearch(searchInput)}
              className="px-4 py-2 bg-primary text-background rounded-xl text-xs font-bold hover:bg-accent transition-colors"
            >
              Go
            </button>
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-surface-card border border-surface-200 rounded-xl text-sm font-medium text-surface-600 px-3 py-2 focus:outline-none focus:border-accent"
          >
            {SORTS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>

          {/* Toggles */}
          <button
            onClick={() => setHas3d(!has3d)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${has3d ? 'bg-accent text-primary border-accent' : 'bg-surface-card text-surface-500 border-surface-200 hover:border-accent'}`}
          >
            3D Only
          </button>
          <button
            onClick={() => setHasBim(!hasBim)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${hasBim ? 'bg-primary text-background border-primary' : 'bg-surface-card text-surface-500 border-surface-200 hover:border-primary'}`}
          >
            BIM Only
          </button>

          {/* Clear */}
          {(search || category !== "All" || has3d || hasBim) && (
            <button
              onClick={() => { setSearch(""); setSearchInput(""); setCategory("All"); setHas3d(false); setHasBim(false); }}
              className="text-xs font-bold text-accent hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap mt-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${category === cat
                ? 'bg-primary text-background border-primary'
                : 'bg-surface-card text-surface-500 border-surface-200 hover:border-primary hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-sm text-surface-400 mt-4 font-medium">
            {total} product{total !== 1 ? 's' : ''}{category !== 'All' ? ` in ${category}` : ''}
          </p>
        )}
      </div>

      {/* Masonry Grid */}
      {loading ? (
        <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-5 space-y-5">
          {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-surface-card border border-surface-200 rounded-2xl p-16 text-center">
          <p className="text-5xl mb-4">🏪</p>
          <h3 className="text-xl font-bold text-primary mb-2">No Products Found</h3>
          <p className="text-surface-500 text-sm mb-6">
            {search ? `No results for "${search}".` : "No products in this category yet."}
          </p>
          <Link
            href="/showroom/dashboard"
            className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-accent transition-colors inline-block text-sm"
          >
            List Your Products
          </Link>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-5 space-y-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
