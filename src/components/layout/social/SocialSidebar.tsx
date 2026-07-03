"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    title: "Feed",
    links: [
      { label: "Inspiration Feed", href: "/social", icon: "📸", exact: true },
      { label: "Saved Posts", href: "/social/saved", icon: "🔖", exact: true },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Most Liked", href: "/social?sort=-likes_count", icon: "❤️", exact: false },
      { label: "Featured", href: "/social?featured=true", icon: "✦", exact: false },
    ],
  },
];

export function SocialSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href.split("?")[0]);
  };

  return (
    <aside className="w-56 border-r border-surface-200 bg-surface-card h-[calc(100vh-var(--topbar-height))] overflow-y-auto hidden lg:flex flex-col shrink-0">
      <div className="p-5 flex-1">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-7 px-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' }}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
            </svg>
          </div>
          <span className="text-base font-black text-primary tracking-tight">Social</span>
        </div>

        <nav className="space-y-5">
          {NAV.map((section) => (
            <div key={section.title}>
              <h4 className="text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-2 px-3">{section.title}</h4>
              <div className="flex flex-col gap-0.5">
                {section.links.map((link) => {
                  const active = isActive(link.href, link.exact);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active ? "bg-primary text-background shadow-sm" : "text-surface-600 hover:bg-surface-100 hover:text-primary"
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

      {/* CTA */}
      <div className="p-4 border-t border-surface-100">
        <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #1a0a0a, #2d1515)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#f09433' }}>Get Featured</p>
          <p className="text-xs text-white/60 mb-3 leading-relaxed">
            Post your work on Instagram with <strong className="text-white">#architectureplaybook</strong>
          </p>
          <a
            href="https://instagram.com/architectureplaybook"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' }}
          >
            Follow on Instagram
          </a>
        </div>
      </div>
    </aside>
  );
}
