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
    { label: "Shared Tasks", href: "/dashboard/shared-tasks", icon: "🔗" },
    { label: "Templates", href: "/dashboard/templates", icon: "📋" },
    { label: "Business Leads", href: "/dashboard/leads", icon: "💼" },
  ];

  const opsLinks = [
    { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
  ];

  const orgLinks = [
    { label: "Team & Members", href: "/dashboard/organization", icon: "👥" },
    { label: "Master Catalog", href: "/dashboard/catalog", icon: "📚" },
    { label: "Task Templates", href: "/dashboard/task-templates", icon: "📋" },
  ];

  const settingsLinks = [
    { label: "My Profile", href: "/dashboard/profile", icon: "👤" },
    { label: "Subscription", href: "/dashboard/subscription", icon: "💳" },
  ];

  return (
    <aside className="sidebar relative min-h-0">
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
      <div className="flex items-center justify-between mb-4 px-1 min-w-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-lg bg-surface-100 flex items-center justify-center text-sm shadow-none border border-surface-200">
            🏗
          </div>
          {!isSidebarCollapsed && <span className="text-sm font-extrabold tracking-tight text-foreground truncate">Playbook</span>}
        </div>
        {!isSidebarCollapsed && (
          <div className="ml-auto shrink-0">
            <NotificationBell />
          </div>
        )}
      </div>

      <div className="px-1 mb-4 flex gap-2 min-w-0">
        <button 
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`flex items-center min-w-0 ${isSidebarCollapsed ? 'justify-center w-8 h-8 p-0 shrink-0' : 'w-full px-2.5 py-1.5 justify-between'} bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-lg transition-all text-xs text-text-secondary shadow-none shrink-0`}
        >
          {isSidebarCollapsed ? (
            <span className="opacity-70 text-xs">🔍</span>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="opacity-70 text-text-secondary shrink-0 text-xs">🔍</span>
                <span className="font-semibold text-text-secondary truncate text-xs">Search...</span>
              </div>
              <div className="flex items-center gap-1 opacity-70 shrink-0">
                <kbd className="px-1 py-0.2 text-[9px] font-mono font-bold bg-surface-200 border border-surface-300 rounded text-text-secondary">⌘K</kbd>
              </div>
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden">
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2 mb-1.5 text-[9px] uppercase tracking-widest text-text-secondary font-black">
              Workspace
            </h4>
          )}
          <div className="flex flex-col gap-0.5">
            {workspaceLinks.map((link) => (
              <React.Fragment key={link.href}>
                <SidebarLink {...link} active={pathname === link.href} isCollapsed={isSidebarCollapsed} />
              </React.Fragment>
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2 mb-1.5 text-[9px] uppercase tracking-widest text-text-secondary font-black">
              Operations
            </h4>
          )}
          <div className="flex flex-col gap-0.5">
            {opsLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname.startsWith(link.href)} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2 mb-1.5 text-[9px] uppercase tracking-widest text-text-secondary font-black">
              Organization
            </h4>
          )}
          <div className="flex flex-col gap-0.5">
            {orgLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname.startsWith(link.href)} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2 mb-1.5 text-[9px] uppercase tracking-widest text-text-secondary font-black">
              Account
            </h4>
          )}
          <div className="flex flex-col gap-0.5">
            {settingsLinks.map((link) => (
              <SidebarLink key={link.href} {...link} active={pathname.startsWith(link.href)} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
        </div>
      </nav>

      {!isSidebarCollapsed && <div className="shrink-0"><ProfileBanner /></div>}
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
    className={`nav-item ${active ? "active" : ""} ${isCollapsed ? 'justify-center p-0 w-8 h-8 rounded-lg mx-auto' : ''}`}
    title={isCollapsed ? label : undefined}
  >
    <span className="text-sm leading-none shrink-0">{icon}</span>
    {!isCollapsed && <span className="truncate text-[11px]">{label}</span>}
  </Link>
);

