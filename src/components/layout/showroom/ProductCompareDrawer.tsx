"use client";

import React, { useState } from "react";
import { useCompareStore } from "@/store/compare-store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

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

import { FullPageCompareModal } from "./FullPageCompareModal";

export function ProductCompareDrawer() {
  const { items, removeFromCompare, clearCompare } = useCompareStore();
  const [isFullPageOpen, setIsFullPageOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 flex justify-center pointer-events-none">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="pointer-events-auto bg-surface-card/95 backdrop-blur-xl border border-surface-200 shadow-2xl rounded-3xl p-4 w-full max-w-4xl flex flex-col gap-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-accent/10 text-accent font-black flex items-center justify-center text-sm">
                  ⚖️
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-primary">
                    Compare Specs Matrix ({items.length}/4)
                  </h4>
                  <p className="text-[10px] text-surface-400 font-medium">
                    Side-by-side architectural fixture &amp; material comparison
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsFullPageOpen(true)}
                  className="bg-accent text-background text-[11px] h-8 px-3.5 rounded-xl font-extrabold shadow-sm"
                >
                  🔍 View Full Matrix Table
                </Button>
                <Button
                  variant="outline"
                  className="text-[11px] h-8 px-3 rounded-xl border-surface-300 font-bold"
                  onClick={clearCompare}
                >
                  Clear All
                </Button>
              </div>
            </div>

          {/* Side-by-Side Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((product) => {
              const priceNum = parsePrice(product);
              const title = product.name || (product as any).title || "Product";
              const vendor = product.vendor_name || (product as any).professional_name || "Studio Nordic";
              const location = product.country_of_origin || (product as any).location || "Bangalore";
              const imgUrl = product.cover_image_url || (product.images && product.images.length > 0 ? product.images[0].image_url : "/placeholder.jpg");

              return (
                <div
                  key={product.id}
                  className="bg-surface-100/70 border border-surface-200 rounded-2xl p-3 flex flex-col justify-between relative group"
                >
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-200 text-surface-500 hover:text-semantic-red flex items-center justify-center font-bold text-xs"
                  >
                    ✕
                  </button>

                  <div className="flex items-center gap-2.5 mb-2">
                    <img
                      src={imgUrl}
                      alt={title}
                      className="w-10 h-10 rounded-xl object-cover border border-surface-200"
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-primary truncate">{title}</h5>
                      <p className="text-[10px] font-extrabold text-accent">
                        ₹{priceNum.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-surface-200 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-surface-400">Hub:</span>
                      <span className="font-bold text-primary truncate max-w-[100px]">
                        {location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Category:</span>
                      <span className="font-bold text-primary truncate max-w-[100px]">
                        {product.category || "Fixtures"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Vendor:</span>
                      <span className="font-bold text-primary truncate max-w-[100px]">
                        {vendor}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <FullPageCompareModal isOpen={isFullPageOpen} onClose={() => setIsFullPageOpen(false)} />
    </>
  );
}
