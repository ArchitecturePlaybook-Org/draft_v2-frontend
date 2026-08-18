"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchProducts, Product } from "@/domains/showroom/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useWishlistStore } from "@/store/wishlist-store";
import { useCompareStore } from "@/store/compare-store";
import Link from "next/link";

const VENDOR_PROFILES: Record<string, { name: string; hub: string; tagline: string; gst: string; rating: string }> = {
  "studio-nordic": {
    name: "Studio Nordic",
    hub: "Indiranagar, Bangalore",
    tagline: "Scandinavian Architectural Furniture & Minimalist Teak Fixtures",
    gst: "29AAAAA0000A1Z5",
    rating: "4.9 ⭐ (128 Trade Orders)"
  },
  "lumina-lighting": {
    name: "Lumina Lighting",
    hub: "Whitefield, Bangalore",
    tagline: "Commercial LED Systems, Pendants & Precision Task Lighting",
    gst: "29BBBBB1111B2Z4",
    rating: "4.8 ⭐ (94 Trade Orders)"
  },
  "carrara-marbles": {
    name: "Carrara Marbles",
    hub: "Koramangala, Bangalore",
    tagline: "Imported Italian Marble Slabs & Natural Stone Surfaces",
    gst: "29CCCCC2222C3Z3",
    rating: "5.0 ⭐ (210 Trade Orders)"
  },
  "bauhaus-fixtures": {
    name: "Bauhaus Fixtures",
    hub: "Jayanagar, Bangalore",
    tagline: "Industrial Architectural Hardware & Custom Brass Fittings",
    gst: "29DDDDD3333D4Z2",
    rating: "4.7 ⭐ (76 Trade Orders)"
  }
};

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

export default function VendorStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const vendorSlug = (params?.vendorSlug as string) || "";

  const vendorMeta = VENDOR_PROFILES[vendorSlug] || {
    name: decodeURIComponent(vendorSlug).replace(/-/g, ' '),
    hub: "Bangalore, India",
    tagline: "Verified Architectural Trade Supplier",
    gst: "29XXXXX0000X1Z1",
    rating: "4.8 ⭐ Verified Hub"
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toggleItem, isWishlisted } = useWishlistStore();
  const { toggleCompare, isCompared } = useCompareStore();

  useEffect(() => {
    async function loadVendorCatalog() {
      setIsLoading(true);
      try {
        const res = await fetchProducts();
        const allProducts = res.results || [];
        const filtered = allProducts.filter((p: Product) => {
          const pName = (p.vendor_name || '').toLowerCase().replace(/\s+/g, '-');
          return pName.includes(vendorSlug) || vendorSlug.includes(pName);
        });
        setProducts(filtered.length > 0 ? filtered : allProducts.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadVendorCatalog();
  }, [vendorSlug]);

  return (
    <div className="min-h-screen bg-background text-primary pb-20">
      {/* Header Navigation */}
      <div className="bg-surface-card border-b border-surface-200 py-4 px-6 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <button
          onClick={() => router.push("/showroom")}
          className="text-xs font-bold text-surface-500 hover:text-primary flex items-center gap-1.5"
        >
          ← Back to Showroom
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="font-mono text-[10px]">
            GST: {vendorMeta.gst}
          </Badge>
        </div>
      </div>

      {/* Vendor Hero Banner */}
      <div className="bg-surface-100/60 border-b border-surface-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-accent text-background font-black flex items-center justify-center text-3xl shadow-md border border-accent/30">
              {vendorMeta.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-primary tracking-tight">{vendorMeta.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px] uppercase border border-emerald-500/20">
                  Verified Hub
                </span>
              </div>
              <p className="text-xs font-semibold text-surface-400 mt-1 max-w-lg">{vendorMeta.tagline}</p>
              <div className="flex items-center gap-4 mt-3 text-xs font-bold text-surface-500">
                <span>📍 {vendorMeta.hub}</span>
                <span>•</span>
                <span className="text-accent">{vendorMeta.rating}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push(`/showroom`)}
              className="bg-accent text-background font-black text-xs h-10 px-5 rounded-xl shadow-md"
            >
              💬 Contact Vendor Hub
            </Button>
          </div>
        </div>
      </div>

      {/* Vendor Product Catalog */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-extrabold text-primary">Vendor Product Catalog</h2>
            <p className="text-xs text-surface-400 font-medium">Browse verified trade inventory from {vendorMeta.name}</p>
          </div>
          <span className="text-xs font-bold text-surface-400">{products.length} Products</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" label="Loading vendor catalog..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p) => {
              const priceNum = parsePrice(p);
              const title = p.name || (p as any).title || "Product";
              const imgUrl = p.cover_image_url || (p.images && p.images.length > 0 ? p.images[0].image_url : '/placeholder.jpg');
              const wishlisted = isWishlisted(p.id);
              const compared = isCompared(p.id);

              return (
                <div key={p.id} className="bg-surface-card border border-surface-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group">
                  <div className="relative aspect-4/3 overflow-hidden bg-surface-100">
                    <img src={imgUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    
                    <button
                      onClick={() => toggleItem(p)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center text-sm shadow-md transition-all ${
                        wishlisted ? 'bg-semantic-red text-white' : 'bg-surface-card/80 text-surface-500 hover:text-semantic-red'
                      }`}
                    >
                      ❤️
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-surface-400 uppercase tracking-wider">{p.category || 'Fixtures'}</span>
                      <Link href={`/showroom/${p.slug}`} className="block text-sm font-bold text-primary hover:text-accent truncate">
                        {title}
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-surface-200">
                      <span className="text-sm font-black text-primary">
                        {p.price_display || `₹${priceNum.toLocaleString('en-IN')}`}
                      </span>
                      
                      <button
                        onClick={() => toggleCompare(p)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                          compared ? 'bg-accent/10 border-accent text-accent' : 'bg-surface-100 border-surface-200 text-surface-400'
                        }`}
                      >
                        {compared ? '✓ Comparing' : '+ Compare'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
