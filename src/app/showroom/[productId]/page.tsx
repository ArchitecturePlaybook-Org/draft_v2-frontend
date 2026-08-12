"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchProductDetail, placeOrder, type Product } from "@/domains/showroom/api";

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Direct RFQ Chat Drawer State
  const [showRfqDrawer, setShowRfqDrawer] = useState(false);
  const [quantity, setQuantity] = useState(1);
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
      setOrderError(err.message || "Failed to send RFQ inquiry. Please try again.");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-surface-200 rounded-xl w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-surface-100 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-10 bg-surface-200 rounded-xl w-3/4" />
            <div className="h-6 bg-surface-100 rounded-lg w-1/2" />
            <div className="h-24 bg-surface-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-surface-100 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4 shadow-inner">
          🏛️
        </div>
        <h2 className="text-2xl font-black text-primary mb-2">Product Not Found</h2>
        <p className="text-surface-500 text-sm mb-6">The requested product listing does not exist or was archived.</p>
        <Link href="/showroom" className="px-6 py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-accent transition-colors">
          ← Back to Showroom
        </Link>
      </div>
    );
  }

  const allImages = [
    ...(product.cover_image_url ? [product.cover_image_url] : []),
    ...(product.images?.map((i) => i.image_url) || []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in relative">
      
      {/* Top Back Navigation Link */}
      <Link 
        href="/showroom" 
        className="inline-flex items-center gap-2 text-xs font-bold text-surface-500 hover:text-accent transition-colors bg-surface-card px-4 py-2 rounded-2xl border border-surface-200 shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Showroom Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left: Gallery Viewport */}
        <div className="space-y-4">
          <div className="rounded-3xl overflow-hidden bg-surface-card border border-surface-200 aspect-square flex items-center justify-center relative shadow-md">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-surface-400">
                <span className="text-6xl mb-2 block">🏛️</span>
                <span className="text-xs font-bold uppercase tracking-widest">No Image Preview</span>
              </div>
            )}
          </div>

          {/* Gallery Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all shadow-sm ${
                    activeImage === img ? 'border-accent scale-105 shadow-md' : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Spec Details & RFQ Inquiry Actions */}
        <div className="bg-surface-card border border-surface-200 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between space-y-6">
          
          <div className="space-y-4">
            {/* Category Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-extrabold bg-surface-100 text-primary px-3.5 py-1.5 rounded-xl border border-surface-200">
                {product.category}
              </span>
              {product.subcategory && (
                <span className="text-xs font-extrabold bg-surface-100 text-primary px-3.5 py-1.5 rounded-xl border border-surface-200">
                  {product.subcategory}
                </span>
              )}
              {product.has_3d_model && (
                <span className="text-xs font-extrabold bg-accent/20 text-accent px-3.5 py-1.5 rounded-xl border border-accent/30">
                  🧊 3D Model
                </span>
              )}
              {product.has_bim_file && (
                <span className="text-xs font-extrabold bg-semantic-blue/20 text-semantic-blue px-3.5 py-1.5 rounded-xl border border-semantic-blue/30">
                  🏗️ BIM Asset
                </span>
              )}
              {product.is_featured && (
                <span className="text-xs font-extrabold bg-amber-400 text-black px-3.5 py-1.5 rounded-xl shadow-sm">
                  ✦ Featured
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Vendor Profile Pill */}
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-2xl bg-surface-200 text-primary flex items-center justify-center font-bold text-sm border border-surface-300 shadow-sm">
                {product.vendor_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-primary">{product.vendor_name}</p>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-bold">Verified Supplier</p>
              </div>
            </div>

            {/* Price Display */}
            {product.price_display && (
              <div className="pt-2">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Trade Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-primary tracking-tight">{product.price_display}</span>
                  {product.price_unit && <span className="text-xs font-bold text-surface-500">{product.price_unit}</span>}
                </div>
              </div>
            )}

            {/* Tiered Wholesale Pricing Widget */}
            <div className="bg-surface-100/70 border border-surface-200 rounded-2xl p-4 space-y-2 pt-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-surface-400">Tiered Trade Quantity Pricing</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-surface-card p-2.5 rounded-xl border border-surface-200">
                  <p className="text-[10px] text-surface-400 font-bold">1 - 5 Units</p>
                  <p className="font-extrabold text-primary">Standard Trade</p>
                </div>
                <div className="bg-surface-card p-2.5 rounded-xl border border-surface-200">
                  <p className="text-[10px] text-surface-400 font-bold">6 - 20 Units</p>
                  <p className="font-extrabold text-accent">5% Trade Discount</p>
                </div>
                <div className="bg-surface-card p-2.5 rounded-xl border border-surface-200">
                  <p className="text-[10px] text-surface-400 font-bold">20+ Units</p>
                  <p className="font-extrabold text-emerald-500">12% Bulk Discount</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-surface-600 text-sm leading-relaxed font-medium pt-2">
                {product.description}
              </p>
            )}

            {/* Specs Summary Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {product.lead_time_days && (
                <div className="bg-surface-100 rounded-2xl p-3.5 border border-surface-200">
                  <p className="text-[10px] text-surface-400 uppercase tracking-widest font-extrabold mb-0.5">Lead Time</p>
                  <p className="font-extrabold text-primary text-sm">{product.lead_time_days} days</p>
                </div>
              )}
              {product.country_of_origin && (
                <div className="bg-surface-100 rounded-2xl p-3.5 border border-surface-200">
                  <p className="text-[10px] text-surface-400 uppercase tracking-widest font-extrabold mb-0.5">Location Hub</p>
                  <p className="font-extrabold text-primary text-sm">📍 {product.country_of_origin}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-4 border-t border-surface-200">
            <button
              onClick={() => setShowRfqDrawer(true)}
              className="w-full py-4 rounded-2xl bg-accent text-background font-black text-xs uppercase tracking-widest hover:opacity-90 hover:scale-[1.01] transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>💬 Direct RFQ Chat &amp; Quotation</span>
            </button>

            <button
              onClick={() => setShowSampleModal(true)}
              className="w-full py-3.5 rounded-2xl border border-surface-300 text-xs font-extrabold text-primary hover:bg-surface-100 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>📦 Order Material Sample Swatch Box</span>
            </button>

            {/* Spec Sheet & File Downloads */}
            {product.spec_sheet_url && (
              <a
                href={product.spec_sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-2xl border border-surface-200 text-xs font-bold text-primary hover:bg-surface-100 transition-colors shadow-sm"
              >
                📄 Download PDF Specification Sheet
              </a>
            )}
            {product.bim_file_url && (
              <a
                href={product.bim_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-2xl border border-semantic-blue/30 text-xs font-bold text-semantic-blue hover:bg-semantic-blue/10 transition-colors shadow-sm"
              >
                🏗️ Download BIM Asset (.RVT / .IFC)
              </a>
            )}
            {product.model_3d_url && (
              <a
                href={product.model_3d_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-2xl border border-accent/30 text-xs font-bold text-accent hover:bg-accent/10 transition-colors shadow-sm"
              >
                🧊 View 3D WebGL Asset (.GLTF / .GLB)
              </a>
            )}
          </div>

        </div>
      </div>

      {/* 💬 DIRECT RFQ CHAT DRAWER */}
      <AnimatePresence>
        {showRfqDrawer && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            {/* Backdrop Click */}
            <div className="flex-1" onClick={() => setShowRfqDrawer(false)} />

            {/* Slide-Over Drawer Container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-surface-card border-l border-surface-200 h-full flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-surface-200 bg-surface-100 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent flex items-center justify-center font-black text-lg border border-accent/30">
                    💬
                  </div>
                  <div>
                    <h3 className="text-base font-black text-primary tracking-tight">Direct RFQ Chat</h3>
                    <p className="text-xs text-surface-500 font-medium">Chat directly with {product.vendor_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRfqDrawer(false)}
                  className="w-8 h-8 rounded-full bg-surface-200 text-surface-600 hover:text-primary flex items-center justify-center font-bold text-sm transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* Product Summary Card */}
                <div className="bg-surface-100 border border-surface-200 rounded-2xl p-4 flex gap-4 items-center shadow-sm">
                  {product.cover_image_url ? (
                    <img src={product.cover_image_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-surface-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-surface-200 flex items-center justify-center text-2xl">🏛️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-primary truncate">{product.name}</h4>
                    <p className="text-xs font-black text-accent mt-0.5">{product.price_display || "Trade Pricing on Request"}</p>
                    <p className="text-[10px] text-surface-400 font-medium mt-1">📍 Location: {product.country_of_origin}</p>
                  </div>
                </div>

                {ordered ? (
                  /* Success State with Direct Leads Chat Link */
                  <div className="bg-semantic-green/10 border border-semantic-green/30 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-semantic-green/20 text-semantic-green rounded-full mx-auto flex items-center justify-center text-2xl font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-base font-black text-primary">RFQ Inquiry Sent!</h4>
                      <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                        Your RFQ inquiry has been registered in the vendor's Business Leads pipeline. You can now chat directly with {product.vendor_name}.
                      </p>
                    </div>

                    <Link
                      href="/dashboard/leads"
                      className="block w-full py-3.5 rounded-xl bg-primary text-background font-extrabold text-xs uppercase tracking-widest hover:bg-accent transition-colors shadow-md"
                    >
                      💬 Open Live Chat on Business Leads
                    </Link>
                  </div>
                ) : (
                  /* RFQ Form & Chat Initialization */
                  <div className="space-y-4">
                    {orderError && (
                      <div className="bg-semantic-red/10 border border-semantic-red/20 text-semantic-red text-xs rounded-xl px-4 py-3 font-semibold">
                        {orderError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-surface-500 uppercase tracking-widest mb-1.5">
                          Units / Quantity
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3.5 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold outline-none focus:border-accent text-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-surface-500 uppercase tracking-widest mb-1.5">
                          Project Type
                        </label>
                        <select
                          value={projectType}
                          onChange={(e) => setProjectType(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold outline-none focus:border-accent text-primary cursor-pointer"
                        >
                          <option value="Residential Villa">Villa / Residential</option>
                          <option value="Commercial HQ">Commercial Office</option>
                          <option value="Hospitality Hotel">Hotel / Resort</option>
                          <option value="Retail Outlet">Retail Store</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-surface-500 uppercase tracking-widest mb-1.5">
                        Required Timeline
                      </label>
                      <select
                        value={timeline}
                        onChange={(e) => setTimeline(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold outline-none focus:border-accent text-primary cursor-pointer"
                      >
                        <option value="ASAP / 1 Month">ASAP / Within 1 Month</option>
                        <option value="1 - 3 Months">1 to 3 Months</option>
                        <option value="3+ Months">3+ Months (Planning)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-surface-500 uppercase tracking-widest mb-1.5">
                        Initial Brief &amp; Trade Quotation Request
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        placeholder="Hi! We are specifying this product for our project in Bangalore. Please share trade quotation, volume discount, and availability..."
                        className="w-full px-3.5 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:border-accent resize-none placeholder:text-surface-400 text-primary"
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer Actions */}
              {!ordered && (
                <div className="p-6 border-t border-surface-200 bg-surface-100 flex gap-3 sticky bottom-0">
                  <button
                    onClick={() => setShowRfqDrawer(false)}
                    className="flex-1 py-3.5 rounded-xl border border-surface-200 text-xs font-bold text-surface-600 hover:bg-surface-card transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOrder}
                    disabled={ordering}
                    className="flex-1 py-3.5 rounded-xl bg-accent text-background text-xs font-extrabold hover:opacity-90 transition-colors disabled:opacity-50 uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-card border border-surface-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 relative"
            >
              <div className="flex justify-between items-center border-b border-surface-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent font-black flex items-center justify-center text-lg">
                    📦
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-primary">Order Swatch Box</h3>
                    <p className="text-[11px] text-surface-400 font-medium">Physical Material Sample Delivery</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowSampleModal(false); setSampleSuccess(false); }}
                  className="w-8 h-8 rounded-xl bg-surface-200/60 hover:bg-surface-200 text-surface-500 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {sampleSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="text-4xl">🎉</div>
                  <h4 className="text-sm font-extrabold text-primary">Sample Order Placed!</h4>
                  <p className="text-xs text-surface-400 font-medium max-w-xs mx-auto">
                    Your physical material swatch box is being prepared by {product?.vendor_name} for express Bangalore delivery.
                  </p>
                  <button
                    onClick={() => { setShowSampleModal(false); setSampleSuccess(false); }}
                    className="w-full py-2.5 rounded-xl bg-accent text-background text-xs font-bold mt-2"
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
                  <div>
                    <label className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest block mb-1">
                      Bangalore Delivery Address
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={sampleAddress}
                      onChange={(e) => setSampleAddress(e.target.value)}
                      placeholder="Enter office / site shipping address in Bangalore (e.g. 100ft Road, Indiranagar)..."
                      className="w-full px-3.5 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:border-accent resize-none placeholder:text-surface-400 text-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-accent text-background font-extrabold text-xs uppercase tracking-wider shadow-md hover:opacity-90 transition-all"
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
