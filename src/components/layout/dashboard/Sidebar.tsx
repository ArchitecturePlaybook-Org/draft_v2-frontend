"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { ProfileBanner } from "@/components/layout/dashboard/ProfileBanner";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useProjectNavStore } from "@/store/project-nav-store";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin, hasGlobalPermission } = usePermissions();
  const setIsCommandPaletteOpen = useCommandPaletteStore((state) => state.setIsOpen);
  const { recentProjects, setProjectContext, isSidebarCollapsed, toggleSidebar } = useProjectNavStore();
  const router = useRouter();

  const workspaceLinks = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Projects", href: "/dashboard/projects", icon: "🏗️" },
    { label: "Templates", href: "/dashboard/templates", icon: "📋" },
    { label: "Templates Hub", href: "/dashboard/marketplace/templates", icon: "📦" },
    { label: "Business Leads", href: "/dashboard/leads", icon: "💼" },
  ];

  const opsLinks = [
    { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
  ];

  const orgLinks = [
    { label: "Team & Members", href: "/dashboard/organization", icon: "👥" },
    { label: "Master Catalog", href: "/dashboard/catalog", icon: "📚" },
  ];

  const settingsLinks = [
    { label: "My Profile", href: "/dashboard/profile", icon: "👤" },
    { label: "Subscription", href: "/dashboard/subscription", icon: "💳" },
  ];

  return (
    <aside className="sidebar relative">
      {/* Floating Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-12 -right-3 z-50 flex items-center justify-center w-6 h-6 rounded-full bg-surface-50 border border-surface-200 text-surface-400 hover:bg-accent hover:text-background hover:border-accent hover:scale-110 hover:shadow-lg transition-all duration-200 focus:outline-none"
        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <svg 
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className={`transform transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : "rotate-0"}`}
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-surface-100 flex items-center justify-center text-xl shadow-none border border-surface-200">
            🏗
          </div>
          {!isSidebarCollapsed && <span className="text-xl font-bold tracking-tight text-foreground">Playbook</span>}
        </div>
        {!isSidebarCollapsed && (
          <div className="ml-auto">
            <NotificationBell />
          </div>
        )}
      </div>

      <div className="px-2 mb-6 flex gap-2">
        <button 
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`flex items-center justify-center ${isSidebarCollapsed ? 'w-10 h-10 p-0' : 'w-full px-3 py-2 justify-between'} bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-lg transition-all text-sm text-text-secondary shadow-none shrink-0`}
        >
          {isSidebarCollapsed ? (
            <span className="opacity-70">🔍</span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="opacity-70 text-text-secondary">🔍</span>
                <span className="font-semibold text-text-secondary">Search...</span>
              </div>
              <div className="flex items-center gap-1 opacity-70">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-surface-200 border border-surface-300 rounded text-text-secondary">Cmd</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-surface-200 border border-surface-300 rounded text-text-secondary">K</kbd>
              </div>
            </>
          )}
        </button>
        
      </div>

      <nav className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 -mr-2 overflow-x-hidden">
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
              Workspace
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => (
              <React.Fragment key={link.href}>
                <SidebarLink {...link} active={pathname === link.href} isCollapsed={isSidebarCollapsed} />
              </React.Fragment>
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
              Operations
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {opsLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname.startsWith(link.href)} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
              Organization
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {orgLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname.startsWith(link.href)} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
              Account
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {settingsLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname.startsWith(link.href)} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
        </div>
      </nav>

      {!isSidebarCollapsed && <ProfileBanner />}
    </aside>
  );
};

interface SidebarLinkProps {
  label: string;
  href: string;
  icon: string;
  active: boolean;
  isCollapsed?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ label, href, icon, active, isCollapsed }) => (
  <Link 
    href={href} 
    className={`nav-item ${active ? "active bg-surface-100 text-foreground border-surface-200" : ""} ${isCollapsed ? 'justify-center p-0 w-10 h-10 rounded-xl mx-auto' : ''}`}
    title={isCollapsed ? label : undefined}
  >
    <span className="text-lg leading-none grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 shrink-0">{icon}</span>
    {!isCollapsed && label}
  </Link>
);
