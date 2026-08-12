"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fetchProducts, type Product } from "@/domains/showroom/api";

import { useWishlistStore } from "@/store/wishlist-store";
import { useCompareStore } from "@/store/compare-store";
import { WishlistDrawer } from "@/components/layout/showroom/WishlistDrawer";
import { ProductCompareDrawer } from "@/components/layout/showroom/ProductCompareDrawer";

const CATEGORIES = [
  { value: "All", label: "✨ All Categories" },
  { value: "Furniture", label: "🪑 Furniture" },
  { value: "Lighting", label: "💡 Lighting" },
  { value: "Finishes", label: "🪨 Finishes" },
  { value: "Fixtures", label: "🚿 Fixtures" },
  { value: "Acoustics", label: "🔇 Acoustics" },
  { value: "Outdoor", label: "🌳 Outdoor" },
  { value: "Structural", label: "🏛️ Structural" },
  { value: "MEP", label: "⚙️ MEP" },
  { value: "Technology", label: "🖥️ Technology" },
  { value: "Soft Furnishings", label: "🛋️ Soft Furnishings" },
];

const SORTS = [
  { value: "-created_at", label: "✨ Newest Additions" },
  { value: "price_min", label: "💰 Price: Low to High" },
  { value: "-price_min", label: "💎 Price: High to Low" },
  { value: "location", label: "📍 Nearby Location (Bangalore)" },
  { value: "lead_time_days", label: "⏱️ Fastest Lead Time" },
  { value: "-views_count", label: "👁️ Most Viewed" },
  { value: "-interest_count", label: "🔥 Most Popular" },
  { value: "name", label: "🔤 Alphabetical (A–Z)" },
];

function ProductCard({ product }: { product: Product }) {
  const { toggleItem, isWishlisted } = useWishlistStore();
  const { toggleCompare, isCompared } = useCompareStore();
  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative rounded-2xl overflow-hidden bg-surface-card border border-surface-200 shadow-sm hover:shadow-lg hover:border-accent/60 transition-all duration-300 flex flex-col justify-between"
    >
      <div className="relative w-full aspect-[4/3] bg-surface-100 overflow-hidden">
        <Link href={`/showroom/${product.slug}`} className="block w-full h-full">
          {product.cover_image_url ? (
            <img
              src={product.cover_image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-surface-400">
              <span className="text-3xl mb-1">🏛️</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">No Preview</span>
            </div>
          )}
        </Link>

        {/* Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1 flex-wrap z-10">
          <span className="bg-surface-card/90 backdrop-blur-md text-primary px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border border-surface-200 shadow-sm">
            {product.category}
          </span>
          {product.has_3d_model && (
            <span className="bg-accent text-background font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider shadow-sm">
              3D
            </span>
          )}
          {product.has_bim_file && (
            <span className="bg-semantic-blue text-white font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider shadow-sm">
              BIM
            </span>
          )}
          {product.is_featured && (
            <span className="bg-amber-400 text-black font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider shadow-sm">
              ✦ Featured
            </span>
          )}
        </div>

        {/* Wishlist Heart Toggle */}
        <button
          onClick={() => toggleItem(product)}
          className={`absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center text-sm shadow-md transition-all ${
            wishlisted ? 'bg-semantic-red text-white' : 'bg-surface-card/80 text-surface-500 hover:text-semantic-red'
          }`}
          title="Save to Wishlist & BoQ"
        >
          ❤️
        </button>

        {/* Price Tag Overlay */}
        {product.price_display && (
          <div className="absolute bottom-2.5 right-2.5 z-10 bg-surface-card/95 backdrop-blur-md text-primary px-2.5 py-0.5 rounded-lg font-black text-xs shadow-sm border border-surface-200">
            {product.price_display}
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-4 flex flex-col space-y-2.5 flex-1 justify-between">
        <div>
          <Link href={`/showroom/${product.slug}`} className="block">
            <h3 className="text-sm font-bold text-primary group-hover:text-accent transition-colors line-clamp-1 tracking-tight">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center justify-between text-xs font-semibold text-surface-500 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-surface-200 text-primary flex items-center justify-center font-bold text-[9px] border border-surface-300">
                {product.vendor_name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[130px] text-surface-600">{product.vendor_name}</span>
            </div>
            {product.price_unit && (
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">{product.price_unit}</span>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-surface-200/50">
          <div className="flex items-center justify-between text-[10px] font-semibold text-surface-500">
            {product.lead_time_days && <span>⏱️ {product.lead_time_days}d lead</span>}
            {product.country_of_origin && <span>📍 {product.country_of_origin}</span>}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/showroom/${product.slug}`}
              className="flex-1 py-1.5 rounded-xl bg-primary text-background font-bold text-[11px] text-center uppercase tracking-wider group-hover:bg-accent group-hover:text-background transition-all shadow-sm"
            >
              View Specs
            </Link>

            <button
              onClick={() => toggleCompare(product)}
              className={`px-2 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                compared ? 'bg-accent/10 border-accent text-accent' : 'bg-surface-100 border-surface-200 text-surface-400 hover:text-primary'
              }`}
            >
              {compared ? '✓ Comparing' : '+ Compare'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-2xl border border-surface-200 bg-surface-card p-3 space-y-3 animate-pulse">
      <div className="h-40 bg-surface-100 rounded-xl" />
      <div className="h-4 bg-surface-200 rounded w-3/4" />
      <div className="h-3 bg-surface-100 rounded w-1/2" />
    </div>
  );
}

function ShowroomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlCategory = searchParams.get("category") || "All";
  const urlOrigin = searchParams.get("origin") || "";
  const urlMaxLead = searchParams.get("max_lead_time") || "";
  const urlMinPrice = searchParams.get("min_price") || "";
  const urlMaxPrice = searchParams.get("max_price") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(urlCategory);
  const [sort, setSort] = useState("-created_at");
  const [has3d, setHas3d] = useState(false);
  const [hasBim, setHasBim] = useState(false);
  const [hasSpec, setHasSpec] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  // Sync state with URL parameter changes
  useEffect(() => {
    setCategory(urlCategory);
  }, [urlCategory]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({
        search: search || undefined,
        category: category !== "All" ? category : undefined,
        sort,
        has_3d: has3d || undefined,
        has_bim: hasBim || undefined,
        has_spec: hasSpec || undefined,
        featured: isFeatured || undefined,
        origin: urlOrigin || undefined,
        max_lead_time: urlMaxLead ? Number(urlMaxLead) : undefined,
        min_price: urlMinPrice ? Number(urlMinPrice) : undefined,
        max_price: urlMaxPrice ? Number(urlMaxPrice) : undefined,
      });
      setProducts(res.results || []);
      setTotal(res.count || 0);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, has3d, hasBim, hasSpec, isFeatured, urlOrigin, urlMaxLead, urlMinPrice, urlMaxPrice]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const params = new URLSearchParams(searchParams.toString());
    if (newCat === "All") {
      params.delete("category");
    } else {
      params.set("category", newCat);
    }
    const qs = params.toString();
    router.push(`/showroom${qs ? `?${qs}` : ""}`);
  };

  const activeFiltersCount = (search ? 1 : 0) + (category !== "All" ? 1 : 0) + (has3d ? 1 : 0) + (hasBim ? 1 : 0) + (hasSpec ? 1 : 0) + (isFeatured ? 1 : 0) + (urlOrigin ? 1 : 0) + (urlMaxLead ? 1 : 0) + (urlMinPrice ? 1 : 0) + (urlMaxPrice ? 1 : 0);

  const clearAllFilters = () => {
    setSearch("");
    setSearchInput("");
    setCategory("All");
    setHas3d(false);
    setHasBim(false);
    setHasSpec(false);
    setIsFeatured(false);
    router.push("/showroom");
  };

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const wishlistItems = useWishlistStore((state) => state.items);

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fade-in">
      
      {/* 1. Ultra-Compact Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-card border border-surface-200 rounded-2xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-black text-sm border border-accent/30">
            🏛️
          </div>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight leading-none">
              Showroom Catalog
            </h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5 flex flex-wrap items-center gap-2">
              <span>{loading ? "Loading..." : `${total} products available${category !== 'All' ? ` in ${category}` : ''}`}</span>
              {urlOrigin && <span className="bg-surface-100 text-accent px-2 py-0.5 rounded-md font-bold text-[10px]">📍 {urlOrigin}</span>}
              {urlMaxLead && <span className="bg-surface-100 text-accent px-2 py-0.5 rounded-md font-bold text-[10px]">⏱️ &lt; {urlMaxLead}d</span>}
              {(urlMinPrice || urlMaxPrice) && (
                <span className="bg-surface-100 text-accent px-2 py-0.5 rounded-md font-bold text-[10px]">
                  💳 {urlMinPrice ? `₹${urlMinPrice}` : '₹0'} – {urlMaxPrice ? `₹${urlMaxPrice}` : 'Above'}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setIsWishlistOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-100 border border-surface-200 text-primary font-bold rounded-xl text-xs hover:border-accent transition-all shadow-sm relative"
          >
            <span>❤️ Saved Specs &amp; BoQ</span>
            {wishlistItems.length > 0 && (
              <span className="bg-semantic-red text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {wishlistItems.length}
              </span>
            )}
          </button>

          <Link
            href="/showroom/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-background font-black rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-sm"
          >
            <span>🏪 Vendor Dashboard</span>
          </Link>
        </div>
      </div>

      {/* 2. Compact Filter Controls Toolbar */}
      <div className="bg-surface-card border border-surface-200 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        
        {/* Search Box */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm bg-surface-100 border border-surface-200 rounded-xl px-3 py-1.5 focus-within:border-accent transition-all">
          <span className="text-surface-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            placeholder="Search products, materials or locations..."
            className="w-full bg-transparent text-xs font-semibold text-primary placeholder:text-surface-400 outline-none"
          />
          {searchInput && (
            <button 
              onClick={() => { setSearchInput(""); setSearch(""); }}
              className="text-xs font-bold text-surface-400 hover:text-primary"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => setSearch(searchInput)}
            className="px-2.5 py-1 bg-primary text-background rounded-lg text-xs font-extrabold hover:bg-accent transition-colors shrink-0"
          >
            Go
          </button>
        </div>

        {/* Dropdowns & Spec Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary px-3 py-2 outline-none focus:border-accent cursor-pointer shadow-sm"
          >
            {CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value} className="bg-surface-card text-primary">
                {label}
              </option>
            ))}
          </select>

          {/* Extended Sort Dropdown (Price Low-High, Nearby Location) */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary px-3 py-2 outline-none focus:border-accent cursor-pointer shadow-sm"
          >
            {SORTS.map(({ value, label }) => (
              <option key={value} value={value} className="bg-surface-card text-primary">
                {label}
              </option>
            ))}
          </select>

          {/* Spec Toggles */}
          <button
            onClick={() => setHas3d(!has3d)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
              has3d 
                ? 'bg-accent text-background border-accent shadow-sm' 
                : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-accent'
            }`}
          >
            🧊 3D
          </button>

          <button
            onClick={() => setHasBim(!hasBim)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
              hasBim 
                ? 'bg-semantic-blue text-white border-semantic-blue shadow-sm' 
                : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-semantic-blue'
            }`}
          >
            🏗️ BIM
          </button>

          <button
            onClick={() => setHasSpec(!hasSpec)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
              hasSpec 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-emerald-600'
            }`}
          >
            📄 Spec
          </button>

          <button
            onClick={() => setIsFeatured(!isFeatured)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
              isFeatured 
                ? 'bg-amber-400 text-black border-amber-400 shadow-sm' 
                : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-amber-400'
            }`}
          >
            ✦ Featured
          </button>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-accent hover:underline px-1.5 py-1"
            >
              Clear ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* 3. Catalog Products Grid */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-surface-card border border-surface-200 rounded-2xl p-12 text-center shadow-sm space-y-3 max-w-md mx-auto">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-inner">
              🏛️
            </div>
            <h3 className="text-xl font-black text-primary tracking-tight">No Products Found</h3>
            <p className="text-surface-500 text-xs font-medium">
              {search ? `No results for "${search}". Try adjusting your category, location, or budget.` : "No items found for this selection."}
            </p>
            <button
              onClick={clearAllFilters}
              className="px-5 py-2.5 bg-primary text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-accent transition-colors shadow-sm inline-block"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </motion.div>
        )}
      </div>

      {/* Drawers & Floating Overlay */}
      <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
      <ProductCompareDrawer />

    </div>
  );
}

export default function ShowroomDiscoverPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-[1600px] mx-auto space-y-5 animate-pulse">
        <div className="h-14 bg-surface-card border border-surface-200 rounded-2xl" />
        <div className="h-14 bg-surface-card border border-surface-200 rounded-2xl" />
      </div>
    }>
      <ShowroomContent />
    </Suspense>
  );
}
