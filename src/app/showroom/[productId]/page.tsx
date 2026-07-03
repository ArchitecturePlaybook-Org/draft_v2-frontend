"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProductDetail, placeOrder, type Product } from "@/domains/showroom/api";

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Order modal
  const [showOrder, setShowOrder] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderError, setOrderError] = useState("");

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
      await placeOrder(product.slug, quantity, message);
      setOrdered(true);
      setShowOrder(false);
    } catch (err: any) {
      setOrderError(err.message || "Failed to send interest. Please try again.");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-surface-200 rounded w-1/3" />
        <div className="h-72 bg-surface-100 rounded-2xl" />
        <div className="h-4 bg-surface-100 rounded w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🏪</p>
        <h2 className="text-2xl font-bold text-primary mb-2">Product Not Found</h2>
        <Link href="/showroom" className="text-sm text-accent hover:underline">← Back to Showroom</Link>
      </div>
    );
  }

  const allImages = [
    ...(product.cover_image_url ? [product.cover_image_url] : []),
    ...(product.images?.map((i) => i.image_url) || []),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/showroom" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Showroom
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-surface-100 border border-surface-200 mb-3 aspect-square flex items-center justify-center">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-20 h-20 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeImage === img ? 'border-accent' : 'border-surface-200 hover:border-surface-300'}`}
                >
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {/* Category + Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full border border-surface-200">{product.category}</span>
            {product.subcategory && <span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full border border-surface-200">{product.subcategory}</span>}
            {product.has_3d_model && <span className="text-xs font-bold bg-accent/10 text-accent px-3 py-1.5 rounded-full border border-accent/30">3D Model</span>}
            {product.has_bim_file && <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">BIM</span>}
            {product.is_featured && <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200">✦ Featured</span>}
          </div>

          <h1 className="text-3xl font-black text-primary tracking-tight mb-2">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-xs font-bold text-surface-500">
              {product.vendor_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-primary">{product.vendor_name}</p>
              <p className="text-[10px] text-surface-400 uppercase tracking-wider">Vendor</p>
            </div>
          </div>

          {product.price_display && (
            <div className="mb-5">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Price</p>
              <p className="text-3xl font-black text-primary">{product.price_display}</p>
              {product.price_unit && <p className="text-sm text-surface-400">{product.price_unit}</p>}
            </div>
          )}

          {product.description && (
            <p className="text-surface-600 text-sm leading-relaxed mb-6">{product.description}</p>
          )}

          {/* Specs */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            {product.lead_time_days && (
              <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                <p className="text-[10px] text-surface-400 uppercase tracking-wider font-bold mb-0.5">Lead Time</p>
                <p className="font-bold text-primary">{product.lead_time_days} days</p>
              </div>
            )}
            {product.country_of_origin && (
              <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                <p className="text-[10px] text-surface-400 uppercase tracking-wider font-bold mb-0.5">Origin</p>
                <p className="font-bold text-primary">{product.country_of_origin}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {product.tags.map((tag, i) => (
                <span key={i} className="text-xs font-medium text-accent bg-accent/8 border border-accent/20 px-2.5 py-1 rounded-lg">{tag}</span>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="mt-auto space-y-3">
            {ordered ? (
              <div className="w-full py-4 rounded-xl bg-green-50 border border-green-200 text-center text-green-700 font-bold text-sm">
                ✓ Interest Submitted — the vendor will reach out to you.
              </div>
            ) : (
              <button
                onClick={() => setShowOrder(true)}
                className="w-full py-4 rounded-xl bg-primary text-background font-bold text-sm hover:bg-accent transition-colors uppercase tracking-widest"
              >
                Express Interest / Order
              </button>
            )}
            {product.spec_sheet_url && (
              <a
                href={product.spec_sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl border border-surface-200 text-sm font-bold text-surface-600 hover:bg-surface-50 hover:border-accent transition-colors"
              >
                Download Spec Sheet
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-5 text-xs text-surface-400">
            <span>{product.views_count} views</span>
            <span>{product.interest_count} interested</span>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-card rounded-2xl w-full max-w-md shadow-2xl border border-surface-200">
            <div className="p-6 border-b border-surface-100">
              <h3 className="text-lg font-black text-primary">Express Interest</h3>
              <p className="text-sm text-surface-500 mt-1">Tell the vendor what you need. They will contact you.</p>
            </div>
            <div className="p-6 space-y-4">
              {orderError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{orderError}</div>
              )}
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Quantity / Units</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider mb-1.5">Message to Vendor</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Describe your project, timeline, or any specific requirements..."
                  className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowOrder(false)} className="flex-1 py-3 rounded-xl border border-surface-200 text-sm font-bold text-surface-600 hover:bg-surface-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleOrder} disabled={ordering} className="flex-1 py-3 rounded-xl bg-primary text-background text-sm font-bold hover:bg-accent transition-colors disabled:opacity-50">
                {ordering ? "Sending..." : "Send Interest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
