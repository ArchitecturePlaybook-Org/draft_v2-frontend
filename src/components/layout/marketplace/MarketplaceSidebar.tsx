"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    title: "Browse",
    links: [
      { label: "Discover", href: "/marketplace", icon: "🚀", exact: true },
      { label: "My Library", href: "/dashboard/templates", icon: "📚", exact: false },
    ],
  },
  {
    title: "Categories",
    links: [
      { label: "Residential", href: "/marketplace?category=Residential", icon: "🏠", exact: false },
      { label: "Commercial", href: "/marketplace?category=Commercial", icon: "🏢", exact: false },
      { label: "Hospitality", href: "/marketplace?category=Hospitality", icon: "🏨", exact: false },
      { label: "Healthcare", href: "/marketplace?category=Healthcare", icon: "🏥", exact: false },
      { label: "Education", href: "/marketplace?category=Education", icon: "🎓", exact: false },
      { label: "Industrial", href: "/marketplace?category=Industrial", icon: "🏭", exact: false },
      { label: "Masterplan", href: "/marketplace?category=Masterplan", icon: "🗺️", exact: false },
    ],
  },
  {
    title: "Creator",
    links: [
      { label: "Creator Dashboard", href: "/marketplace/dashboard", icon: "🎨", exact: true },
    ],
  },
];

export const TemplatesHubSidebar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-60 border-r border-surface-200 bg-surface-card h-[calc(100vh-var(--topbar-height))] overflow-y-auto hidden lg:flex flex-col shrink-0">
      <div className="p-5 flex-1">
        {/* Logo / Title */}
        <div className="flex items-center gap-2.5 mb-7 px-1">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-sm">📐</div>
          <span className="text-base font-black text-primary tracking-tight">Templates Hub</span>
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
                      key={link.href}
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

      {/* Bottom CTA */}
      <div className="p-4 border-t border-surface-100">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-white text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Share Your Work</p>
          <p className="text-xs text-white/70 mb-3 leading-relaxed">
            Publish templates and help the AEC community.
          </p>
          <Link
            href="/marketplace/dashboard"
            className="block w-full text-center bg-accent text-primary text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Become a Creator
          </Link>
        </div>
      </div>
    </aside>
  );
};
