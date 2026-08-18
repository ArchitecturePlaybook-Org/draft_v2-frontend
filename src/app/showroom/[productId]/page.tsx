"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchProductDetail, placeOrder, type Product } from "@/domains/showroom/api";
import { AddToBoQModal } from "@/components/showroom/AddToBoQModal";
import { useWishlistStore } from "@/store/wishlist-store";
import { useCompareStore } from "@/store/compare-store";
import { toast } from "sonner";

export function ProductDetailPageOriginal() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Fullscreen Lightbox State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Options Dropdown Menu State
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Stores
  const { toggleItem: toggleWishlist, isWishlisted } = useWishlistStore();
  const { toggleCompare, isCompared } = useCompareStore();

  // Tab State
  const [activeTab, setActiveTab] = useState<"specs" | "logistics" | "vendor">("specs");

  // Quantity Counter & Price Calculation State
  const [quantity, setQuantity] = useState(10);

  // Add to BoQ Modal State
  const [showBoqModal, setShowBoqModal] = useState(false);

  // Direct RFQ Chat Drawer State
  const [showRfqDrawer, setShowRfqDrawer] = useState(false);
  const [projectType, setProjectType] = useState("Residential Villa");
  const [timeline, setTimeline] = useState("ASAP / 1 Month");
  const [message, setMessage] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Sample Swatch Box Modal State
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [sampleAddress, setSampleAddress] = useState("");
  const [sampleSuccess, setSampleSuccess] = useState(false);

  useEffect(() => {
    if (!productId) return;
    fetchProductDetail(productId)
      .then((data) => {
        setProduct(data);
        setActiveImage(data.cover_image_url || null);
        setOrdered(data.user_has_ordered || false);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleOrder = async () => {
    if (!product) return;
    setOrdering(true);
    setOrderError("");
    try {
      const fullMessage = `[Project: ${projectType} | Timeline: ${timeline}] ${message}`.trim();
      await placeOrder(product.slug, quantity, fullMessage);
      setOrdered(true);
    } catch (err: any) {
      setOrderError(err.message || "Failed to submit RFQ request.");
    } finally {
      setOrdering(false);
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6 animate-pulse select-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 aspect-square bg-surface-card border border-surface-200 dark:border-surface-800 rounded-3xl" />
          <div className="lg:col-span-6 space-y-5">
            <div className="h-10 bg-surface-200 dark:bg-surface-800 rounded-2xl w-3/4" />
            <div className="h-6 bg-surface-100 dark:bg-surface-800 rounded-xl w-1/2" />
            <div className="h-28 bg-surface-card border border-surface-200 dark:border-surface-800 rounded-3xl" />
            <div className="h-14 bg-surface-200 dark:bg-surface-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center select-none">
        <div className="w-20 h-20 bg-surface-100 dark:bg-surface-800 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4 shadow-inner">
          🏛️
        </div>
        <h2 className="text-2xl font-black text-primary mb-2">Product Not Found</h2>
        <p className="text-surface-500 text-sm mb-6">The requested product listing does not exist or was archived.</p>
        <Link href="/showroom" className="px-6 py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-accent transition-colors shadow-md">
          Explore Showroom Catalog
        </Link>
      </div>
    );
  }

  const allImages = [
    ...(product.cover_image_url ? [product.cover_image_url] : []),
    ...(product.images?.map((i) => i.image_url) || []),
  ];

  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);

  // Pricing calculations
  const unitRate = product.price_min ? Number(product.price_min) : 0;
  let discountPct = 0;
  if (quantity >= 20) discountPct = 0.12;
  else if (quantity >= 6) discountPct = 0.05;

  const rawTotal = unitRate * quantity;
  const discountAmount = rawTotal * discountPct;
  const finalTotal = rawTotal - discountAmount;

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in relative select-none">

      {/* Main 2-Column Asymmetric Specs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Gallery & Technical Downloads (5 cols on large) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          
          {/* Hero Image Container with Ambient Glow */}
          <div className="relative rounded-3xl overflow-hidden bg-surface-card border border-surface-200 dark:border-surface-800 aspect-square flex items-center justify-center shadow-xl group">
            
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/15 via-transparent to-surface-100 dark:to-surface-900 opacity-60" />

            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="text-center text-surface-400 relative z-10">
                <span className="text-6xl mb-2 block">🏛️</span>
                <span className="text-xs font-bold uppercase tracking-widest">No Preview Image</span>
              </div>
            )}

            {/* Floating Asset Badges */}
            <div className="absolute top-3.5 left-3.5 flex gap-2 flex-wrap z-20">
              <span className="bg-surface-card/90 backdrop-blur-md text-primary font-black px-3 py-1 rounded-xl text-xs border border-surface-200 dark:border-surface-700 shadow-xs">
                {product.category}
              </span>
              {product.has_3d_model && (
                <span className="bg-accent text-background font-black px-2.5 py-1 rounded-xl text-xs shadow-xs">
                  🧊 3D
                </span>
              )}
              {product.has_bim_file && (
                <span className="bg-semantic-blue text-white font-black px-2.5 py-1 rounded-xl text-xs shadow-xs">
                  🏗️ BIM
                </span>
              )}
            </div>

            {/* Top Right Action Tools: Fullscreen & Options */}
            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
              
              {/* Fullscreen Button */}
              {activeImage && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="w-9 h-9 rounded-xl bg-surface-card/90 backdrop-blur-md border border-surface-200 dark:border-surface-700 text-primary font-black text-xs flex items-center justify-center hover:bg-surface- card hover:scale-105 transition-all shadow-md cursor-pointer"
                  title="View Fullscreen Lightbox"
                >
                  ⛶
                </button>
              )}

              {/* Options Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="w-9 h-9 rounded-xl bg-surface-card/90 backdrop-blur-md border border-surface-200 dark:border-surface-700 text-primary font-black text-sm flex items-center justify-center hover:bg-surface-card hover:scale-105 transition-all shadow-md cursor-pointer"
                  title="More Options"
                >
                  ⚙️
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl shadow-2xl p-1.5 z-40 space-y-0.5 animate-fade-in text-xs">
                    <button
                      onClick={() => { copyShareLink(); setShowOptionsMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 font-bold text-primary flex items-center gap-2 cursor-pointer"
                    >
                      <span>🔗</span> Copy Product Link
                    </button>

                    <button
                      onClick={() => { window.print(); setShowOptionsMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 font-bold text-primary flex items-center gap-2 cursor-pointer"
                    >
                      <span>🖨️</span> Print Specification
                    </button>

                    <button
                      onClick={() => { toggleCompare(product); setShowOptionsMenu(false); toast.success(compared ? "Removed from Compare" : "Added to Compare!"); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 font-bold text-primary flex items-center gap-2 cursor-pointer"
                    >
                      <span>⚖️</span> {compared ? "✓ Compare Selected" : "Add to Compare"}
                    </button>

                    <button
                      onClick={() => { toggleWishlist(product); setShowOptionsMenu(false); toast.success(wishlisted ? "Removed from Wishlist" : "Saved to Wishlist!"); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 font-bold text-primary flex items-center gap-2 cursor-pointer"
                    >
                      <span>❤️</span> {wishlisted ? "♥ Wishlisted" : "Save to Wishlist"}
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Thumbnail Carousel */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-xs ${
                    activeImage === img ? 'border-accent scale-105 shadow-md' : 'border-surface-200 dark:border-surface-800 hover:border-surface-400'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Technical Files & Downloads Card */}
          <div className="p-4 bg-surface-card border border-surface-200 dark:border-surface-800 rounded-2xl space-y-3 shadow-xs">
            <h4 className="text-[11px] font-black text-surface-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>📥</span> Technical File Downloads &amp; BIM Assets
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {product.spec_sheet_url ? (
                <a
                  href={product.spec_sheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100/50 dark:bg-surface-900/50 hover:border-accent hover:text-accent font-extrabold text-primary transition-all flex items-center gap-2 truncate"
                >
                  <span className="text-base">📄</span>
                  <span className="truncate">Spec Sheet PDF</span>
                </a>
              ) : (
                <div className="p-2.5 rounded-xl border border-surface-200/50 dark:border-surface-800 bg-surface-100/30 text-surface-400 text-xs font-semibold flex items-center gap-2">
                  <span>📄</span>
                  <span>No Spec PDF</span>
                </div>
              )}

              {product.bim_file_url ? (
                <a
                  href={product.bim_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-semantic-blue/30 bg-semantic-blue/10 hover:bg-semantic-blue/20 font-extrabold text-semantic-blue transition-all flex items-center gap-2 truncate"
                >
                  <span className="text-base">🏗️</span>
                  <span className="truncate">BIM File (.RVT)</span>
                </a>
              ) : (
                <div className="p-2.5 rounded-xl border border-surface-200/50 dark:border-surface-800 bg-surface-100/30 text-surface-400 text-xs font-semibold flex items-center gap-2">
                  <span>🏗️</span>
                  <span>No BIM Asset</span>
                </div>
              )}

              {product.model_3d_url && (
                <a
                  href={product.model_3d_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-accent/30 bg-accent/10 hover:bg-accent/20 font-extrabold text-accent transition-all flex items-center gap-2 truncate sm:col-span-2"
                >
                  <span className="text-base">🧊</span>
                  <span className="truncate">Interactive 3D Model (.GLTF / .GLB)</span>
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Title, Pricing, Volume Calculator, Tabs, & CTAs (7 cols on large) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Title & Vendor Header Card */}
          <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-black text-primary tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Vendor Profile Banner */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-200/60 dark:border-surface-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent flex items-center justify-center font-black text-base border border-accent/30 shadow-2xs">
                    {product.vendor_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-primary">{product.vendor_name}</h3>
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Verified Building Material Manufacturer</p>
                  </div>
                </div>

                {product.country_of_origin && (
                  <div className="text-right">
                    <p className="text-[10px] text-surface-400 font-extrabold uppercase tracking-widest">Origin Hub</p>
                    <p className="text-xs font-black text-primary">📍 {product.country_of_origin}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trade Rate & Dynamic Quantity Pricing Calculator */}
            <div className="p-5 bg-gradient-to-br from-surface-100/80 via-surface-card to-surface-100/80 dark:from-surface-900/60 dark:via-surface-card dark:to-surface-900/60 border border-surface-200 dark:border-surface-800 rounded-2xl space-y-4 shadow-xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-200/60 dark:border-surface-800">
                <div>
                  <p className="text-[10px] font-black text-accent uppercase tracking-widest">Base B2B Wholesale Rate</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-primary tracking-tight">
                      {product.price_display || (unitRate > 0 ? `₹${unitRate.toFixed(2)}` : "Trade Rate on Request")}
                    </span>
                    {product.price_unit && <span className="text-xs font-bold text-surface-500">{product.price_unit}</span>}
                  </div>
                </div>

                {/* Quantity Counter Control */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest block">Project Quantity</label>
                  <div className="flex items-center border border-surface-200 dark:border-surface-700 bg-surface-card rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 5))}
                      className="px-3 py-1.5 font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-200 text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-16 text-center font-mono font-black text-sm bg-transparent outline-none text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 5)}
                      className="px-3 py-1.5 font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-200 text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Wholesale Tier Cards */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`p-2.5 rounded-xl border transition-all ${
                  quantity < 6 ? 'bg-accent/15 border-accent text-accent font-black shadow-xs' : 'bg-surface-card border-surface-200 dark:border-surface-800'
                }`}>
                  <p className="text-[10px] text-surface-400 font-bold">1 - 5 Units</p>
                  <p className="font-bold text-primary text-xs">Standard Trade</p>
                </div>
                <div className={`p-2.5 rounded-xl border transition-all ${
                  quantity >= 6 && quantity < 20 ? 'bg-accent/15 border-accent text-accent font-black shadow-xs' : 'bg-surface-card border-surface-200 dark:border-surface-800'
                }`}>
                  <p className="text-[10px] text-surface-400 font-bold">6 - 20 Units</p>
                  <p className="font-bold text-accent text-xs">5% Trade Discount</p>
                </div>
                <div className={`p-2.5 rounded-xl border transition-all ${
                  quantity >= 20 ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 font-black shadow-xs' : 'bg-surface-card border-surface-200 dark:border-surface-800'
                }`}>
                  <p className="text-[10px] text-surface-400 font-bold">20+ Units</p>
                  <p className="font-bold text-emerald-500 text-xs">12% Wholesale</p>
                </div>
              </div>

              {/* Real-Time Total Calculation Banner */}
              {unitRate > 0 && (
                <div className="p-3 bg-surface-card border border-surface-200 dark:border-surface-800 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-extrabold text-surface-600 dark:text-surface-300">Est. Trade Order Subtotal ({quantity} units):</span>
                  <div className="text-right">
                    {discountPct > 0 && (
                      <span className="line-through text-surface-400 font-mono text-[11px] mr-2">₹{rawTotal.toFixed(2)}</span>
                    )}
                    <span className="font-mono font-black text-accent text-sm">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowRfqDrawer(true)}
                className="py-4 px-5 rounded-2xl bg-accent text-background font-black text-xs uppercase tracking-widest hover:opacity-95 hover:scale-[1.01] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>💬 Direct RFQ Chat &amp; Negotiation</span>
              </button>

              <button
                onClick={() => setShowBoqModal(true)}
                className="py-4 px-5 rounded-2xl bg-surface-card hover:bg-surface-100 dark:hover:bg-surface-800 border-2 border-accent text-accent font-black text-xs uppercase tracking-wider transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📐 Add to Project BoQ</span>
              </button>

              <button
                onClick={() => setShowSampleModal(true)}
                className="sm:col-span-2 py-3.5 rounded-2xl border border-surface-300 dark:border-surface-700 text-xs font-extrabold text-primary hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📦 Order Physical Material Swatch Box</span>
              </button>
            </div>

          </div>

          {/* Tabbed Specification & Logistics Breakdown */}
          <div className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-3xl p-6 shadow-xl space-y-4">
            
            {/* Tab Controls */}
            <div className="flex border-b border-surface-200 dark:border-surface-800 gap-6 text-xs font-extrabold">
              <button
                onClick={() => setActiveTab("specs")}
                className={`pb-3 transition-colors relative cursor-pointer ${
                  activeTab === "specs" ? 'text-accent font-black' : 'text-surface-400 hover:text-primary'
                }`}
              >
                📋 Product Specifications
                {activeTab === "specs" && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("logistics")}
                className={`pb-3 transition-colors relative cursor-pointer ${
                  activeTab === "logistics" ? 'text-accent font-black' : 'text-surface-400 hover:text-primary'
                }`}
              >
                🚚 Freight &amp; Logistics
                {activeTab === "logistics" && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("vendor")}
                className={`pb-3 transition-colors relative cursor-pointer ${
                  activeTab === "vendor" ? 'text-accent font-black' : 'text-surface-400 hover:text-primary'
                }`}
              >
                🏢 Vendor &amp; Compliance
                {activeTab === "vendor" && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="pt-2 text-xs leading-relaxed font-medium">
              {activeTab === "specs" && (
                <div className="space-y-4">
                  {product.description && (
                    <p className="text-surface-600 dark:text-surface-300 leading-relaxed font-medium">
                      {product.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-surface-100/60 dark:bg-surface-900/40 rounded-xl border border-surface-200/60 dark:border-surface-800">
                      <span className="text-[10px] text-surface-400 font-extrabold uppercase tracking-widest block">Category</span>
                      <span className="font-black text-primary text-xs">{product.category}</span>
                    </div>

                    <div className="p-3 bg-surface-100/60 dark:bg-surface-900/40 rounded-xl border border-surface-200/60 dark:border-surface-800">
                      <span className="text-[10px] text-surface-400 font-extrabold uppercase tracking-widest block">Subcategory</span>
                      <span className="font-black text-primary text-xs">{product.subcategory || "N/A"}</span>
                    </div>

                    <div className="p-3 bg-surface-100/60 dark:bg-surface-900/40 rounded-xl border border-surface-200/60 dark:border-surface-800">
                      <span className="text-[10px] text-surface-400 font-extrabold uppercase tracking-widest block">Pricing Unit</span>
                      <span className="font-black text-primary text-xs">{product.price_unit || "per unit"}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "logistics" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-surface-100/60 dark:bg-surface-900/40 rounded-xl border border-surface-200/60 dark:border-surface-800 space-y-1">
                    <span className="text-[10px] text-surface-400 font-extrabold uppercase tracking-widest block">Production Lead Time</span>
                    <span className="font-black text-primary text-xs">⏱️ {product.lead_time_days || "14"} Business Days</span>
                    <p className="text-[10px] text-surface-400 font-medium pt-1">Direct shipment from manufacturing hub to site.</p>
                  </div>

                  <div className="p-3.5 bg-surface-100/60 dark:bg-surface-900/40 rounded-xl border border-surface-200/60 dark:border-surface-800 space-y-1">
                    <span className="text-[10px] text-surface-400 font-extrabold uppercase tracking-widest block">Origin Location</span>
                    <span className="font-black text-primary text-xs">📍 {product.country_of_origin || "India"}</span>
                    <p className="text-[10px] text-surface-400 font-medium pt-1">Includes export quality palletized wooden crate packaging.</p>
                  </div>
                </div>
              )}

              {activeTab === "vendor" && (
                <div className="p-4 bg-surface-100/60 dark:bg-surface-900/40 rounded-2xl border border-surface-200/60 dark:border-surface-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent flex items-center justify-center font-black text-sm border border-accent/30 shadow-2xs">
                      {product.vendor_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-primary">{product.vendor_name}</h4>
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Verified Trade Enterprise Vendor</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium">
                    Verified building material brand offering architect specification support, direct RFQ quotations, and sample swatch dispatch.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* 🖼️ FULLSCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {isFullscreen && activeImage && (
          <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-5 right-5 z-20 w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center text-lg transition-colors cursor-pointer"
              title="Close Fullscreen"
            >
              ✕
            </button>

            <div className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center">
              <img
                src={activeImage}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-card/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-surface-200/20 text-white font-extrabold text-xs shadow-lg">
              {product.name}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 📐 Add to BoQ Modal */}
      <AddToBoQModal
        isOpen={showBoqModal}
        onClose={() => setShowBoqModal(false)}
        product={product}
      />

      {/* 💬 DIRECT RFQ CHAT DRAWER */}
      <AnimatePresence>
        {showRfqDrawer && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in select-none">
            <div className="flex-1" onClick={() => setShowRfqDrawer(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-surface-card border-l border-surface-200 dark:border-surface-800 h-full flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-black text-base border border-accent/30 shadow-2xs">
                    💬
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-primary tracking-tight">Direct RFQ Chat</h3>
                    <p className="text-[11px] text-surface-400 font-medium">Connect directly with {product.vendor_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRfqDrawer(false)}
                  className="w-7 h-7 rounded-lg bg-surface-200/60 dark:bg-surface-800 text-surface-600 dark:text-surface-300 font-bold text-xs hover:bg-surface-300 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 space-y-5 flex-1 text-xs">
                
                {/* Product Summary */}
                <div className="bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-3.5 flex gap-3 items-center">
                  {product.cover_image_url ? (
                    <img src={product.cover_image_url} alt={product.name} className="w-14 h-14 rounded-xl object-cover border border-surface-200 shadow-2xs shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-surface-200 flex items-center justify-center text-xl shrink-0">🏛️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-primary truncate">{product.name}</h4>
                    <p className="text-xs font-black text-accent mt-0.5">{product.price_display || (unitRate > 0 ? `₹${unitRate.toFixed(2)}` : "Trade Rate on Request")}</p>
                    <p className="text-[10px] text-surface-400 font-semibold mt-0.5">📍 Hub: {product.country_of_origin || "Verified Vendor"}</p>
                  </div>
                </div>

                {ordered ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xs">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full mx-auto flex items-center justify-center text-2xl font-black">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-primary">RFQ Inquiry Registered!</h4>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
                        Your inquiry has been placed. You can now communicate directly with {product.vendor_name}.
                      </p>
                    </div>

                    <Link
                      href="/dashboard/leads"
                      className="block w-full py-3 rounded-xl bg-primary text-background font-black text-xs uppercase tracking-wider hover:bg-accent transition-colors shadow-sm"
                    >
                      💬 Open Live Chat Thread
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl p-3 font-bold">
                        {orderError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-extrabold text-primary">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-mono font-bold outline-none focus:border-accent text-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-extrabold text-primary">Project Type</label>
                        <select
                          value={projectType}
                          onChange={(e) => setProjectType(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-bold outline-none focus:border-accent text-primary cursor-pointer"
                        >
                          <option value="Residential Villa">Residential Villa</option>
                          <option value="Commercial HQ">Commercial HQ</option>
                          <option value="Hospitality Hotel">Hospitality Hotel</option>
                          <option value="Retail Outlet">Retail Outlet</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-primary">Required Timeline</label>
                      <select
                        value={timeline}
                        onChange={(e) => setTimeline(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-bold outline-none focus:border-accent text-primary cursor-pointer"
                      >
                        <option value="ASAP / 1 Month">ASAP / Within 1 Month</option>
                        <option value="1 - 3 Months">1 to 3 Months</option>
                        <option value="3+ Months">3+ Months (Planning)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-primary">Trade Inquiry Brief</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Share project specifications, site location, or custom finish preferences..."
                        className="w-full p-2.5 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-medium outline-none focus:border-accent text-primary leading-normal"
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer Actions */}
              {!ordered && (
                <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 flex gap-2 sticky bottom-0">
                  <button
                    onClick={() => setShowRfqDrawer(false)}
                    className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 font-extrabold text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOrder}
                    disabled={ordering}
                    className="flex-1 py-2.5 rounded-xl bg-accent text-background text-xs font-black hover:opacity-90 transition-colors disabled:opacity-50 uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{ordering ? "Connecting..." : "Start Direct RFQ Chat 🚀"}</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📦 Order Material Sample Swatch Box Modal */}
      <AnimatePresence>
        {showSampleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-card border border-surface-200 dark:border-surface-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 relative text-xs"
            >
              <div className="flex justify-between items-center border-b border-surface-200 dark:border-surface-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-accent/20 text-accent font-black flex items-center justify-center text-base border border-accent/30 shadow-2xs">
                    📦
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-primary">Order Sample Swatch Box</h3>
                    <p className="text-[10px] text-surface-400 font-semibold">Physical Material Sample Delivery</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowSampleModal(false); setSampleSuccess(false); }}
                  className="w-7 h-7 rounded-lg bg-surface-200/60 dark:bg-surface-800 text-surface-600 dark:text-surface-300 font-bold text-xs hover:bg-surface-300 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {sampleSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="text-3xl">🎉</div>
                  <h4 className="text-sm font-black text-primary">Sample Swatch Box Ordered!</h4>
                  <p className="text-xs text-surface-400 font-medium max-w-xs mx-auto">
                    Your physical material swatch box is being prepared by {product?.vendor_name} for express delivery.
                  </p>
                  <button
                    onClick={() => { setShowSampleModal(false); setSampleSuccess(false); }}
                    className="w-full py-2.5 rounded-xl bg-accent text-background text-xs font-black mt-2 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (sampleAddress.trim()) setSampleSuccess(true);
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="font-extrabold text-primary">Shipping Address *</label>
                    <textarea
                      required
                      rows={3}
                      value={sampleAddress}
                      onChange={(e) => setSampleAddress(e.target.value)}
                      placeholder="Enter office / site shipping address..."
                      className="w-full p-2.5 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-medium outline-none focus:border-accent text-primary leading-normal"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider shadow-sm hover:opacity-95 transition-all cursor-pointer"
                  >
                    Request Express Swatch Box 🚀
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-accent/30">
        🚧
      </div>
      <h1 className="text-4xl font-black text-primary tracking-tight mb-4">ProductDetail</h1>
      <p className="text-surface-500 font-medium max-w-md mb-8">
        We are actively building out this section of the architectural products marketplace. Check back soon for updates!
      </p>
      <div className="px-6 py-2 bg-surface-card border border-surface-200 rounded-full shadow-sm text-sm font-bold text-accent uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );
}
