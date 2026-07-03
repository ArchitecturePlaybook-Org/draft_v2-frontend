"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    title: "Discover",
    links: [
      { label: "All Products", href: "/showroom", icon: "🛍️", exact: true },
      { label: "My Orders", href: "/showroom/orders", icon: "📦", exact: false },
    ],
  },
  {
    title: "Categories",
    links: [
      { label: "Furniture", href: "/showroom?category=Furniture", icon: "🪑", exact: false },
      { label: "Lighting", href: "/showroom?category=Lighting", icon: "💡", exact: false },
      { label: "Finishes", href: "/showroom?category=Finishes", icon: "🪨", exact: false },
      { label: "Fixtures", href: "/showroom?category=Fixtures", icon: "🚿", exact: false },
      { label: "Acoustics", href: "/showroom?category=Acoustics", icon: "🔇", exact: false },
      { label: "Outdoor", href: "/showroom?category=Outdoor", icon: "🌿", exact: false },
      { label: "MEP", href: "/showroom?category=MEP", icon: "⚙️", exact: false },
      { label: "Technology", href: "/showroom?category=Technology", icon: "📱", exact: false },
    ],
  },
  {
    title: "Vendor",
    links: [
      { label: "Vendor Dashboard", href: "/showroom/dashboard", icon: "🏪", exact: true },
      { label: "My Listings", href: "/showroom/dashboard", icon: "📋", exact: false },
      { label: "Add Product", href: "/showroom/dashboard/listings/new", icon: "➕", exact: true },
    ],
  },
];

export const ShowroomSidebar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href.split("?")[0]);
  };

  return (
    <aside className="w-60 border-r border-surface-200 bg-surface-card h-[calc(100vh-var(--topbar-height))] overflow-y-auto hidden lg:flex flex-col shrink-0">
      <div className="p-5 flex-1">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-7 px-1">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-sm">🏪</div>
          <span className="text-base font-black text-primary tracking-tight">Showroom</span>
        </div>

        <nav className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-2 px-3">
                {section.title}
              </h4>
              <div className="flex flex-col gap-0.5">
                {section.links.map((link) => {
                  const active = isActive(link.href, link.exact);
                  return (
                    <Link
                      key={`${link.href}-${link.label}`}
                      href={link.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-primary text-background shadow-sm"
                          : "text-surface-600 hover:bg-surface-100 hover:text-primary"
                      }`}
                    >
                      <span className={active ? "" : "opacity-60"}>{link.icon}</span>
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Vendor CTA */}
      <div className="p-4 border-t border-surface-100">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">For Vendors</p>
          <p className="text-xs text-white/70 mb-3 leading-relaxed">
            Showcase your products to architects &amp; designers globally.
          </p>
          <Link
            href="/showroom/dashboard/listings/new"
            className="block w-full text-center bg-accent text-primary text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            List a Product
          </Link>
        </div>
      </div>
    </aside>
  );
};
