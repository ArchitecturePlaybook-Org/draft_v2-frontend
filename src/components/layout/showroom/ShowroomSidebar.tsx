"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const CATEGORY_LINKS = [
  { label: "All Products", category: "All", icon: "✨" },
  { label: "Furniture", category: "Furniture", icon: "🪑" },
  { label: "Lighting", category: "Lighting", icon: "💡" },
  { label: "Finishes", category: "Finishes", icon: "🪨" },
  { label: "Fixtures", category: "Fixtures", icon: "🚿" },
  { label: "Acoustics", category: "Acoustics", icon: "🔇" },
  { label: "Outdoor", category: "Outdoor", icon: "🌳" },
  { label: "Structural", category: "Structural", icon: "🏛️" },
  { label: "MEP", category: "MEP", icon: "⚙️" },
  { label: "Technology", category: "Technology", icon: "🖥️" },
  { label: "Soft Furnishings", category: "Soft Furnishings", icon: "🛋️" },
];

const ORIGIN_LINKS = [
  { label: "Indiranagar", value: "Indiranagar, Bangalore", flag: "📍" },
  { label: "Whitefield", value: "Whitefield, Bangalore", flag: "📍" },
  { label: "Koramangala", value: "Koramangala, Bangalore", flag: "📍" },
  { label: "Jayanagar", value: "Jayanagar, Bangalore", flag: "📍" },
];

const BUDGET_LINKS = [
  { label: "Under ₹75,000", min: null, max: "75000", icon: "💵" },
  { label: "₹75,000 – ₹1,50,000", min: "75000", max: "150000", icon: "💳" },
  { label: "Over ₹1,50,000", min: "150000", max: null, icon: "💎" },
];

const LEAD_TIME_LINKS = [
  { label: "Fast (< 14 days)", max_lead: 14, icon: "⚡" },
  { label: "Standard (< 30 days)", max_lead: 30, icon: "⏱️" },
];

export const ShowroomSidebar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "All";
  const currentOrigin = searchParams.get("origin") || "";
  const currentMaxLead = searchParams.get("max_lead_time") || "";
  const currentMinPrice = searchParams.get("min_price") || "";
  const currentMaxPrice = searchParams.get("max_price") || "";

  const isDiscoverActive = pathname === "/showroom" && currentCategory === "All" && !currentOrigin && !currentMaxLead && !currentMinPrice && !currentMaxPrice;
  const isOrdersActive = pathname.startsWith("/showroom/my-orders") || pathname.startsWith("/showroom/orders");
  const isDashboardActive = pathname.startsWith("/showroom/dashboard");

  const buildQueryUrl = (paramsToUpdate: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(paramsToUpdate).forEach(([k, v]) => {
      if (v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    const qs = params.toString();
    return `/showroom${qs ? `?${qs}` : ""}`;
  };

  return (
    <aside className="w-64 border-r border-surface-200 bg-surface-card h-[calc(100vh-var(--topbar-height))] overflow-y-auto hidden lg:flex flex-col shrink-0 transition-colors">
      <div className="p-5 flex-1 space-y-6">
        
        {/* Brand Title */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent border border-accent/30 flex items-center justify-center font-black text-base shadow-sm">
            🏛️
          </div>
          <div>
            <span className="text-base font-black text-primary tracking-tight block leading-none">Showroom</span>
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1 block">Architecture Hub</span>
          </div>
        </div>

        {/* 1. Main Navigation */}
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-surface-500 font-extrabold mb-2 px-2">
            Navigation
          </h4>
          <div className="flex flex-col gap-1">
            <Link
              href="/showroom"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isDiscoverActive
                  ? "bg-accent text-background shadow-sm"
                  : "text-surface-600 hover:bg-surface-100 hover:text-primary"
              }`}
            >
              <span>🛍️</span>
              <span>Discover Catalog</span>
            </Link>
            <Link
              href="/showroom/my-orders"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isOrdersActive
                  ? "bg-accent text-background shadow-sm"
                  : "text-surface-600 hover:bg-surface-100 hover:text-primary"
              }`}
            >
              <span>📦</span>
              <span>My Inquiries / Orders</span>
            </Link>
            <Link
              href="/showroom/dashboard"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isDashboardActive
                  ? "bg-accent text-background shadow-sm"
                  : "text-surface-600 hover:bg-surface-100 hover:text-primary"
              }`}
            >
              <span>🏪</span>
              <span>Vendor Dashboard</span>
            </Link>
          </div>
        </div>

        {/* 2. Trade Budget Filter */}
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-surface-500 font-extrabold mb-2 px-2">
            Trade Budget (INR)
          </h4>
          <div className="flex flex-col gap-0.5">
            {BUDGET_LINKS.map((item) => {
              const active = (item.min === null || currentMinPrice === item.min) && (item.max === null || currentMaxPrice === item.max);
              const href = buildQueryUrl({
                min_price: active ? null : item.min,
                max_price: active ? null : item.max,
              });

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-surface-100 text-accent font-bold border-l-2 border-accent shadow-sm"
                      : "text-surface-600 hover:bg-surface-100 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="text-xs">✓</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 3. Categories Filter Menu */}
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-surface-500 font-extrabold mb-2 px-2">
            Categories
          </h4>
          <div className="flex flex-col gap-0.5">
            {CATEGORY_LINKS.map((item) => {
              const active = pathname === "/showroom" && (
                item.category === "All" ? currentCategory === "All" : currentCategory === item.category
              );
              const href = buildQueryUrl({ category: item.category === "All" ? null : item.category });

              return (
                <Link
                  key={item.category}
                  href={href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-surface-100 text-accent font-bold border-l-2 border-accent shadow-sm"
                      : "text-surface-600 hover:bg-surface-100 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 4. Bangalore Location Hub Filter */}
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-surface-500 font-extrabold mb-2 px-2">
            Bangalore Hubs
          </h4>
          <div className="flex flex-col gap-0.5">
            {ORIGIN_LINKS.map((item) => {
              const active = currentOrigin === item.value;
              const href = buildQueryUrl({ origin: active ? null : item.value });

              return (
                <Link
                  key={item.value}
                  href={href}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-surface-100 text-accent font-bold border-l-2 border-accent shadow-sm"
                      : "text-surface-600 hover:bg-surface-100 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="text-xs">✓</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 5. Lead Time Filter */}
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-surface-500 font-extrabold mb-2 px-2">
            Max Lead Time
          </h4>
          <div className="flex flex-col gap-0.5">
            {LEAD_TIME_LINKS.map((item) => {
              const active = currentMaxLead === String(item.max_lead);
              const href = buildQueryUrl({ max_lead_time: active ? null : String(item.max_lead) });

              return (
                <Link
                  key={item.max_lead}
                  href={href}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-surface-100 text-accent font-bold border-l-2 border-accent shadow-sm"
                      : "text-surface-600 hover:bg-surface-100 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="text-xs">✓</span>}
                </Link>
              );
            })}
          </div>
        </div>

      </div>

      {/* Vendor Listing CTA Box */}
      <div className="p-4 border-t border-surface-200">
        <div className="bg-surface-100 border border-surface-200 rounded-2xl p-4 text-center space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">For Product Vendors</p>
          <p className="text-xs text-surface-500 leading-relaxed font-medium">
            Publish products &amp; receive quotation leads from architects.
          </p>
          <Link
            href="/showroom/dashboard/listings/new"
            className="block w-full text-center bg-primary text-background text-[11px] font-extrabold uppercase tracking-widest py-2.5 rounded-xl hover:bg-accent hover:text-background transition-all shadow-sm"
          >
            + Add New Product
          </Link>
        </div>
      </div>
    </aside>
  );
};
