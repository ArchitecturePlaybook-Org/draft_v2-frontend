"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { ProfileBanner } from "@/components/layout/dashboard/ProfileBanner";
import { useCommandPaletteStore } from "@/store/command-palette-store";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin, hasGlobalPermission } = usePermissions();
  const setIsCommandPaletteOpen = useCommandPaletteStore((state) => state.setIsOpen);

  const memberLinks = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Business Leads", href: "/dashboard/leads", icon: "💼" },
    { label: "Project Registry", href: "/dashboard/projects", icon: "🏗️" },
    { label: "Procurement Ledger", href: "/dashboard/procurement", icon: "🛒" },
    { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
    { label: "Messenger", href: "/dashboard/inbox", icon: "💬" },
  ].filter(link => !(link as any).permission || hasGlobalPermission((link as any).permission.split(":")[0], (link as any).permission.split(":")[1]));

  const settingsLinks = [
    { label: "My Profile", href: "/dashboard/profile", icon: "👤" },
    { label: "Subscription", href: "/dashboard/subscription", icon: "💳" },
  ];

  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl bg-(--primary) flex items-center justify-center text-xl shadow-lg shadow-(--primary)/20">
          🏗
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground">Architecture Playbook</span>
      </div>

      <div className="px-2 mb-6">
        <button 
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl transition-all text-sm text-surface-500 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="opacity-70">🔍</span>
            <span className="font-semibold">Search...</span>
          </div>
          <div className="flex items-center gap-1 opacity-70">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-surface-200 rounded text-surface-500">Cmd</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-surface-200 rounded text-surface-500">K</kbd>
          </div>
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-6">
        <div>
          <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-(--gray-600) font-bold">
            Workplace
          </h4>
          <div className="flex flex-col gap-1">
            {memberLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname === link.href} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-(--gray-600) font-bold">
            Settings
          </h4>
          <div className="flex flex-col gap-1">
            {settingsLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname === link.href} />
            ))}
          </div>
        </div>
      </nav>

      <ProfileBanner />
    </aside>
  );
};

interface SidebarLinkProps {
  label: string;
  href: string;
  icon: string;
  active: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ label, href, icon, active }) => (
  <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
    <span className="text-lg leading-none">{icon}</span>
    {label}
  </Link>
);
