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
    { label: "Business Leads", href: "/dashboard/leads", icon: "💼" },
  ];

  const opsLinks = [
    { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
    { label: "Templates", href: "/dashboard/templates", icon: "📋" },
  ];

  const orgLinks = [
    { label: "Team & Members", href: "/dashboard/organization", icon: "👥" },
  ];

  const settingsLinks = [
    { label: "My Profile", href: "/dashboard/profile", icon: "👤" },
    { label: "Subscription", href: "/dashboard/subscription", icon: "💳" },
  ];

  return (
    <aside className="sidebar">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-(--primary) flex items-center justify-center text-xl shadow-lg shadow-(--primary)/20">
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
          className={`flex items-center justify-center ${isSidebarCollapsed ? 'w-10 h-10 p-0' : 'w-full px-3 py-2 justify-between'} bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl transition-all text-sm text-surface-500 shadow-sm shrink-0`}
        >
          {isSidebarCollapsed ? (
            <span className="opacity-70">🔍</span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="opacity-70">🔍</span>
                <span className="font-semibold">Search...</span>
              </div>
              <div className="flex items-center gap-1 opacity-70">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-surface-200 rounded text-surface-500">Cmd</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-surface-200 rounded text-surface-500">K</kbd>
              </div>
            </>
          )}
        </button>
        
        {/* Toggle Collapse Button */}
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 shrink-0 rounded-xl bg-surface-50 hover:bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-500 transition-colors shadow-sm"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? "▶" : "◀"}
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 -mr-2 overflow-x-hidden">
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-surface-400 font-bold">
              Workspace
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => (
              <React.Fragment key={link.href}>
                <SidebarLink {...link} active={pathname === link.href} isCollapsed={isSidebarCollapsed} />
                {/* Inject recent projects under the Projects link */}
                {link.href === "/dashboard/projects" && recentProjects.length > 0 && !isSidebarCollapsed && (
                  <div className="ml-8 mt-0.5 flex flex-col gap-0.5 border-l-2 border-surface-200 pl-3 mb-1">
                    {recentProjects.map(p => {
                      const isActive = pathname === `/dashboard/projects/${p.uid}`;
                      return (
                        <button 
                          key={p.uid} 
                          onClick={() => {
                            setProjectContext(p.uid);
                            router.push(`/dashboard/projects/${p.uid}`);
                          }}
                          className={`text-left text-xs truncate py-1.5 transition-colors ${isActive ? 'text-primary font-semibold' : 'text-surface-500 hover:text-primary'}`}
                        >
                          {p.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-surface-400 font-bold">
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
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-surface-400 font-bold">
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
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-surface-400 font-bold">
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
    className={`nav-item ${active ? "active bg-primary/5 text-primary border-primary/10" : ""} ${isCollapsed ? 'justify-center p-0 w-10 h-10 rounded-xl mx-auto' : ''}`}
    title={isCollapsed ? label : undefined}
  >
    <span className="text-lg leading-none grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 shrink-0">{icon}</span>
    {!isCollapsed && label}
  </Link>
);
