"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/store/auth-store";
import { ProfileBanner } from "@/components/layout/dashboard/ProfileBanner";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useProjectNavStore } from "@/store/project-nav-store";
import { useNotificationCenter } from "@/shared/hooks/useNotificationCenter";
import {
  LayoutDashboard,
  FolderKanban,
  Share2,
  FileSpreadsheet,
  Briefcase,
  ShoppingBag,
  Package,
  Store,
  MessageSquare,
  Calendar,
  Users,
  BookOpen,
  ClipboardList,
  User,
  CreditCard,
  Building2,
  Search,
  Calculator,
  Tag,
  Box,
  Layers,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin, hasGlobalPermission } = usePermissions();
  const setIsCommandPaletteOpen = useCommandPaletteStore((state) => state.setIsOpen);
  const { recentProjects, setProjectContext, isSidebarCollapsed, toggleSidebar } = useProjectNavStore();
  const router = useRouter();

  // Notification center hook for live badge count
  const { unreadChatCount } = useNotificationCenter();

  const { user } = useAuthStore();
  const isSuperAdmin = isAdmin || Boolean((user as any)?.is_superuser) || user?.email === "superadmin@ap.com";

  const workspaceLinks = isSuperAdmin ? [
    { label: "Admin Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  ] : [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Projects", href: "/dashboard/projects", icon: <FolderKanban className="w-4 h-4" /> },
    { label: "Shared Tasks", href: "/dashboard/shared-tasks", icon: <Share2 className="w-4 h-4" /> },
    { label: "Templates", href: "/dashboard/templates", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "Business Leads", href: "/dashboard/leads", icon: <Briefcase className="w-4 h-4" /> },
  ];

  const showroomLinks = isSuperAdmin ? [] : [
    { label: "Discover Catalog", href: "/dashboard/showroom", icon: <ShoppingBag className="w-4 h-4" /> },
    { label: "My Orders", href: "/dashboard/showroom/orders", icon: <Package className="w-4 h-4" /> },
    { label: "Vendor Dashboard", href: "/dashboard/showroom/dashboard", icon: <Store className="w-4 h-4" /> },
    { label: "Showroom Chats", href: "/dashboard/showroom/chats", icon: <MessageSquare className="w-4 h-4" />, badge: unreadChatCount },
  ];

  const opsLinks = isSuperAdmin ? [] : [
    { label: "Calendar", href: "/dashboard/calendar", icon: <Calendar className="w-4 h-4" /> },
  ];

  const orgLinks = isSuperAdmin ? [
    { label: "User Directory", href: "/dashboard/users", icon: <Users className="w-4 h-4 text-accent" /> },
    { label: "Tenants & Workspaces", href: "/dashboard/admin/tenants", icon: <Building2 className="w-4 h-4 text-accent" /> },
    { label: "CPWD Rate Master", href: "/dashboard/admin/cpwd-rates", icon: <BookOpen className="w-4 h-4 text-accent" /> },
    { label: "BOQ Rules & Rates", href: "/dashboard/admin/boq-rules", icon: <Calculator className="w-4 h-4 text-accent" /> },
    { label: "Task Templates", href: "/dashboard/task-templates", icon: <ClipboardList className="w-4 h-4 text-accent" /> },
    { label: "Trade Specializations", href: "/dashboard/admin/specializations", icon: <Tag className="w-4 h-4 text-accent" /> },
  ] : [
    { label: "Team & Members", href: "/dashboard/organization", icon: <Users className="w-4 h-4" /> },
    { label: "Master Catalog", href: "/dashboard/catalog", icon: <BookOpen className="w-4 h-4" /> },
    { label: "Task Templates", href: "/dashboard/task-templates", icon: <ClipboardList className="w-4 h-4" /> },
    { label: "BOQ Builder", href: "/dashboard/tools/boq-builder", icon: <Calculator className="w-4 h-4" /> },
    { label: "BOQ Builder V2 ✦", href: "/dashboard/tools/boq-builder-v2", icon: <Box className="w-4 h-4" /> },
    { label: "Turnkey Studio ✦", href: "/dashboard/tools/boq-turnkey", icon: <Layers className="w-4 h-4 text-emerald-500" /> },
  ];

  const settingsLinks = [
    { label: "My Profile", href: "/dashboard/profile", icon: <User className="w-4 h-4" /> },
    { label: "Subscription", href: "/dashboard/subscription", icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <aside className={`sidebar relative min-h-0 bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-xl border-r border-surface-200/80 dark:border-white/10 p-2.5 flex flex-col justify-between transition-all duration-300 ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Floating Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-3.5 -right-3 z-[100] flex items-center justify-center w-6 h-6 rounded-full bg-accent text-background font-black shadow-md border-2 border-surface-50 dark:border-surface-900 hover:scale-115 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none"
        title={isSidebarCollapsed ? "Expand Sidebar (⌘B)" : "Collapse Sidebar (⌘B)"}
        aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transform transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : "rotate-0"}`}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* Brand Logo & Notification Bell */}
      <div className={`flex items-center mb-2.5 min-w-0 gap-2 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-1'}`}>
        <div className={`flex items-center gap-2 min-w-0 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div
            className="w-7 h-7 shrink-0 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-xs shadow-2xs text-accent cursor-pointer hover:scale-105 transition-transform"
            title={isSidebarCollapsed ? "Architecture Playbook" : undefined}
          >
            <Building2 className="w-3.5 h-3.5 text-accent" />
          </div>
          {!isSidebarCollapsed && (
            <span className="text-[11px] font-black uppercase tracking-wider text-primary truncate">
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
      <div className="px-0.5 mb-2.5 flex gap-2 min-w-0">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`flex items-center min-w-0 ${isSidebarCollapsed ? 'justify-center w-8 h-8 p-0 mx-auto' : 'w-full px-2 py-1 justify-between'} bg-surface-100/70 dark:bg-surface-800/50 hover:bg-surface-200/80 dark:hover:bg-surface-800 border border-surface-200/80 dark:border-white/10 rounded-lg transition-all text-[11px] text-surface-400 shadow-2xs shrink-0`}
          title={isSidebarCollapsed ? "Quick Search (⌘K)" : undefined}
        >
          {isSidebarCollapsed ? (
            <Search className="w-3.5 h-3.5 opacity-80" />
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <Search className="w-3 h-3 opacity-70" />
                <span className="font-semibold truncate text-[11px] text-surface-400">Search...</span>
              </div>
              <div className="flex items-center gap-1 opacity-70 shrink-0">
                <kbd className="px-1 py-0.2 text-[8px] font-mono font-bold bg-surface-200 dark:bg-surface-700 border border-surface-300 dark:border-white/10 rounded text-surface-500">⌘K</kbd>
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

        {showroomLinks.length > 0 && <div>
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
        </div>}

        {opsLinks.length > 0 && <div>
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
        </div>}

        {orgLinks.length > 0 && <div>
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
        </div>}

        {settingsLinks.length > 0 && <div>
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
        </div>}
      </nav>

      {!isSidebarCollapsed && <div className="shrink-0 pt-2"><ProfileBanner /></div>}
    </aside>
  );
};

interface SidebarLinkProps {
  label: string;
  href: string;
  icon: React.ReactNode;
  active: boolean;
  isCollapsed?: boolean;
  badge?: number;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ label, href, icon, active, isCollapsed, badge }) => (
  <Link
    href={href}
    className={`nav-item relative ${active ? "active" : ""} ${isCollapsed ? 'justify-center p-0 w-8 h-8 rounded-lg mx-auto text-xs' : ''}`}
    title={isCollapsed ? label : undefined}
  >
    <span className="text-xs leading-none shrink-0 relative flex items-center justify-center">
      {icon}
      {isCollapsed && badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
      ) : null}
    </span>
    {!isCollapsed && <span className="truncate text-[11px] flex-1">{label}</span>}
    {!isCollapsed && badge && badge > 0 ? (
      <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[8px] shrink-0 animate-pulse">
        {badge}
      </span>
    ) : null}
  </Link>
);
