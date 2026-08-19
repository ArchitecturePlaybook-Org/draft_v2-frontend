"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { ProfileBanner } from "@/components/layout/dashboard/ProfileBanner";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useProjectNavStore } from "@/store/project-nav-store";
import { useNotificationCenter } from "@/shared/hooks/useNotificationCenter";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin, hasGlobalPermission } = usePermissions();
  const setIsCommandPaletteOpen = useCommandPaletteStore((state) => state.setIsOpen);
  const { recentProjects, setProjectContext, isSidebarCollapsed, toggleSidebar } = useProjectNavStore();
  const router = useRouter();

  const { unreadChatCount } = useNotificationCenter();

  const workspaceLinks = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Projects", href: "/dashboard/projects", icon: "🏗️" },
    { label: "Shared Tasks", href: "/dashboard/shared-tasks", icon: "🔗" },
    { label: "Templates", href: "/dashboard/templates", icon: "📋" },
    { label: "Business Leads", href: "/dashboard/leads", icon: "💼" },
  ];

  const showroomLinks = [
    { label: "Discover Catalog", href: "/dashboard/showroom", icon: "🛍️" },
    { label: "My Orders", href: "/dashboard/showroom/orders", icon: "📦" },
    { label: "Vendor Dashboard", href: "/dashboard/showroom/dashboard", icon: "🏪" },
    { label: "Showroom Chats", href: "/dashboard/showroom/chats", icon: "💬", badge: unreadChatCount },
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
    <aside className="sidebar relative min-h-0 bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-xl border-r border-surface-200/80 dark:border-white/10 p-3 flex flex-col justify-between">
      {/* Floating Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-10 -right-3 z-50 flex items-center justify-center w-6 h-6 rounded-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-white/10 text-surface-400 hover:text-accent hover:border-accent hover:scale-110 shadow-sm transition-all duration-200 focus:outline-none"
        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <svg 
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className={`transform transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : "rotate-0"}`}
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      {/* Brand Logo & Notification Bell */}
      <div className="flex items-center justify-between mb-3 px-1 min-w-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-sm shadow-xs text-accent">
            🏗️
          </div>
          {!isSidebarCollapsed && (
            <span className="text-xs font-black uppercase tracking-wider text-primary truncate">
              Architecture Playbook
            </span>
          )}
        </div>
        {!isSidebarCollapsed && (
          <div className="ml-auto shrink-0">
            <NotificationBell />
          </div>
        )}
      </div>

      {/* Quick Search Bar */}
      <div className="px-0.5 mb-3 flex gap-2 min-w-0">
        <button 
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`flex items-center min-w-0 ${isSidebarCollapsed ? 'justify-center w-8 h-8 p-0 shrink-0' : 'w-full px-2.5 py-1.5 justify-between'} bg-surface-100/70 dark:bg-surface-800/50 hover:bg-surface-200/80 dark:hover:bg-surface-800 border border-surface-200/80 dark:border-white/10 rounded-xl transition-all text-xs text-surface-400 shadow-2xs shrink-0`}
        >
          {isSidebarCollapsed ? (
            <span className="opacity-70 text-xs">🔍</span>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="opacity-70 text-xs">🔍</span>
                <span className="font-semibold truncate text-xs text-surface-400">Search...</span>
              </div>
              <div className="flex items-center gap-1 opacity-70 shrink-0">
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-surface-200 dark:bg-surface-700 border border-surface-300 dark:border-white/10 rounded text-surface-500">⌘K</kbd>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2.5 mb-1.5 text-[9px] uppercase tracking-widest text-surface-400 font-extrabold">
              Workspace
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => (
              <React.Fragment key={link.href}>
                <SidebarLink {...link} active={pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))} isCollapsed={isSidebarCollapsed} />
              </React.Fragment>
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2.5 mb-1.5 text-[9px] uppercase tracking-widest text-surface-400 font-extrabold">
              Showroom
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {showroomLinks.map((link) => (
              <React.Fragment key={link.href}>
                <SidebarLink
                  {...link}
                  active={
                    link.href === "/dashboard/showroom"
                      ? (pathname === "/dashboard/showroom" || pathname.startsWith("/dashboard/showroom?"))
                      : pathname.startsWith(link.href)
                  }
                  isCollapsed={isSidebarCollapsed}
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2.5 mb-1.5 text-[9px] uppercase tracking-widest text-surface-400 font-extrabold">
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
            <h4 className="px-2.5 mb-1.5 text-[9px] uppercase tracking-widest text-surface-400 font-extrabold">
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
            <h4 className="px-2.5 mb-1.5 text-[9px] uppercase tracking-widest text-surface-400 font-extrabold">
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

      {!isSidebarCollapsed && <div className="shrink-0 pt-2"><ProfileBanner /></div>}
    </aside>
  );
};

interface SidebarLinkProps {
  label: string;
  href: string;
  icon: string;
  active: boolean;
  isCollapsed?: boolean;
  badge?: number;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ label, href, icon, active, isCollapsed, badge }) => (
  <Link 
    href={href} 
    className={`nav-item relative ${active ? "active" : ""} ${isCollapsed ? 'justify-center p-0 w-8 h-8 rounded-lg mx-auto' : ''}`}
    title={isCollapsed ? label : undefined}
  >
    <span className="text-sm leading-none shrink-0 relative">
      {icon}
      {isCollapsed && badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
      ) : null}
    </span>
    {!isCollapsed && <span className="truncate text-[11px] flex-1">{label}</span>}
    {!isCollapsed && badge && badge > 0 ? (
      <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[9px] shrink-0 animate-pulse">
        {badge}
      </span>
    ) : null}
  </Link>
);
