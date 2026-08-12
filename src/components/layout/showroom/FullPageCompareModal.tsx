"use client";

import React, { useState } from "react";
import { useCompareStore } from "@/store/compare-store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface FullPageCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function parsePrice(p: any): number {
  if (typeof p.price === 'number') return p.price;
  if (typeof p.price_min === 'number') return p.price_min;
  if (p.price_min) return parseFloat(p.price_min) || 0;
  if (p.price_display) {
    const num = parseFloat(p.price_display.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function FullPageCompareModal({ isOpen, onClose }: FullPageCompareModalProps) {
  const { items, removeFromCompare, clearCompare } = useCompareStore();
  const [highlightDiffsOnly, setHighlightDiffsOnly] = useState(false);

  if (!isOpen || items.length === 0) return null;

  const prices = items.map((p) => parsePrice(p));
  const minPrice = Math.min(...prices.filter(p => p > 0));
  
  const leadTimes = items.map((p) => p.lead_time_days || 999);
  const minLeadTime = Math.min(...leadTimes);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="bg-surface-card border border-surface-200 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
        >
          {/* Top Bar Header */}
          <div className="p-5 px-6 border-b border-surface-200 bg-surface-100/90 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent text-background font-black flex items-center justify-center text-lg shadow-sm">
                ⚖️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-primary">Detailed Product Comparison Matrix</h3>
                <p className="text-[11px] text-surface-400 font-medium">
                  Comparing {items.length} architectural products side-by-side
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-surface-500 cursor-pointer select-none bg-surface-200/50 px-3 py-1.5 rounded-xl border border-surface-300">
                <input
                  type="checkbox"
                  checked={highlightDiffsOnly}
                  onChange={(e) => setHighlightDiffsOnly(e.target.checked)}
                  className="rounded border-surface-300 text-accent focus:ring-accent"
                />
                <span>Highlight Differences</span>
              </label>

              <Button
                variant="outline"
                onClick={clearCompare}
                className="text-xs font-bold h-9 px-3 rounded-xl border-surface-300"
              >
                Clear All
              </Button>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-surface-200/60 hover:bg-surface-200 text-surface-500 hover:text-primary flex items-center justify-center font-bold text-base transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Side-by-Side Comparison Table Body */}
          <div className="flex-1 overflow-auto p-6">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="py-4 px-4 w-48 bg-surface-100/50 text-[11px] font-extrabold uppercase tracking-wider text-surface-400 align-top">
                    Product Specification
                  </th>
                  {items.map((p) => {
                    const title = p.name || (p as any).title || "Product";
                    const imgUrl = p.cover_image_url || (p.images && p.images.length > 0 ? p.images[0].image_url : "/placeholder.jpg");

                    return (
                      <th key={p.id} className="py-4 px-4 min-w-[220px] align-top bg-surface-card border-l border-surface-200 relative group">
                        <button
                          onClick={() => removeFromCompare(p.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-200 text-surface-500 hover:text-semantic-red flex items-center justify-center font-bold text-xs"
                          title="Remove from comparison"
                        >
                          ✕
                        </button>
                        <div className="space-y-2">
                          <img src={imgUrl} alt={title} className="w-full h-32 object-cover rounded-2xl border border-surface-200 shadow-sm" />
                          <h4 className="text-sm font-extrabold text-primary leading-snug line-clamp-2">{title}</h4>
                          <span className="text-[10px] font-bold text-surface-400 font-mono">SKU-{p.id}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-200 text-xs font-semibold text-primary">
                {/* 1. Trade Pricing */}
                <tr className="hover:bg-surface-100/40">
                  <td className="py-4 px-4 font-bold text-surface-500 bg-surface-100/30">
                    Trade Price (INR)
                  </td>
                  {items.map((p) => {
                    const priceNum = parsePrice(p);
                    const isBest = priceNum > 0 && priceNum === minPrice;

                    return (
                      <td key={p.id} className="py-4 px-4 border-l border-surface-200">
                        <div className="space-y-1">
                          <span className="text-sm font-black text-primary">
                            {p.price_display || `₹${priceNum.toLocaleString("en-IN")}`}
                          </span>
                          {isBest && (
                            <span className="block text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase w-max">
                              🏷️ Best Value Price
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Category & Subcategory */}
                <tr className="hover:bg-surface-100/40">
                  <td className="py-4 px-4 font-bold text-surface-500 bg-surface-100/30">
                    Category Scope
                  </td>
                  {items.map((p) => (
                    <td key={p.id} className="py-4 px-4 border-l border-surface-200">
                      <span className="px-2.5 py-1 rounded-lg bg-surface-100 font-bold text-surface-600 text-[11px]">
                        {p.category || "Architectural Fixtures"}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 3. Bangalore Origin Hub */}
                <tr className="hover:bg-surface-100/40">
                  <td className="py-4 px-4 font-bold text-surface-500 bg-surface-100/30">
                    Bangalore Origin Hub
                  </td>
                  {items.map((p) => {
                    const location = p.country_of_origin || (p as any).location || "Bangalore, India";
                    return (
                      <td key={p.id} className="py-4 px-4 border-l border-surface-200 font-extrabold text-accent">
                        📍 {location}
                      </td>
                    );
                  })}
                </tr>

                {/* 4. Vendor Profile */}
                <tr className="hover:bg-surface-100/40">
                  <td className="py-4 px-4 font-bold text-surface-500 bg-surface-100/30">
                    Verified Vendor
                  </td>
                  {items.map((p) => {
                    const vendor = p.vendor_name || (p as any).professional_name || "Studio Nordic";
                    return (
                      <td key={p.id} className="py-4 px-4 border-l border-surface-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-accent/10 text-accent font-black flex items-center justify-center text-[10px]">
                            {vendor.charAt(0)}
                          </div>
                          <span className="font-bold text-primary">{vendor}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* 5. Production Lead Time */}
                <tr className="hover:bg-surface-100/40">
                  <td className="py-4 px-4 font-bold text-surface-500 bg-surface-100/30">
                    Delivery Lead Time
                  </td>
                  {items.map((p) => {
                    const lt = p.lead_time_days;
                    const isFastest = lt && lt === minLeadTime;

                    return (
                      <td key={p.id} className="py-4 px-4 border-l border-surface-200">
                        <div className="space-y-1">
                          <span className="font-extrabold text-primary">
                            {lt ? `⏱️ ${lt} Days` : "Available On Request"}
                          </span>
                          {isFastest && (
                            <span className="block text-[9px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase w-max">
                              ⚡ Fastest Delivery
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* 6. Technical Assets */}
                <tr className="hover:bg-surface-100/40">
                  <td className="py-4 px-4 font-bold text-surface-500 bg-surface-100/30">
                    Technical CAD/BIM Assets
                  </td>
                  {items.map((p) => (
                    <td key={p.id} className="py-4 px-4 border-l border-surface-200">
                      <div className="flex flex-wrap gap-1.5">
                        {p.has_3d_model && (
                          <span className="px-2 py-0.5 rounded-md bg-accent text-background font-black text-[10px]">
                            3D Model
                          </span>
                        )}
                        {p.has_bim_file && (
                          <span className="px-2 py-0.5 rounded-md bg-semantic-blue text-white font-black text-[10px]">
                            BIM Asset
                          </span>
                        )}
                        {p.spec_sheet_url && (
                          <span className="px-2 py-0.5 rounded-md bg-surface-200 text-primary font-bold text-[10px]">
                            PDF Spec Sheet
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 7. Action CTAs */}
                <tr>
                  <td className="py-5 px-4 font-bold text-surface-500 bg-surface-100/30">
                    Trade Actions
                  </td>
                  {items.map((p) => (
                    <td key={p.id} className="py-5 px-4 border-l border-surface-200">
                      <div className="space-y-2">
                        <Link
                          href={`/showroom/${p.slug}`}
                          className="block w-full text-center py-2.5 rounded-xl bg-accent text-background font-black text-xs uppercase tracking-wider shadow-sm hover:opacity-90 transition-all"
                        >
                          Direct RFQ Chat 🚀
                        </Link>
                        <Link
                          href={`/showroom/${p.slug}`}
                          className="block w-full text-center py-2 rounded-xl border border-surface-300 text-xs font-bold text-primary hover:bg-surface-100 transition-colors"
                        >
                          View Full Specs
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
