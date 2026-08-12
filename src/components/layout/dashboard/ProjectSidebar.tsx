"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { ProfileBanner } from "@/components/layout/dashboard/ProfileBanner";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useProjectNavStore } from "@/store/project-nav-store";
import { projectsApi } from "@/domains/projects/api";

export const ProjectSidebar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "data_hub";
  const { isAdmin } = usePermissions();
  const setIsCommandPaletteOpen = useCommandPaletteStore((state) => state.setIsOpen);
  const { currentProjectUid, currentProjectTitle, setProjectContext, isSidebarCollapsed, toggleSidebar } = useProjectNavStore();
  const router = useRouter();

  // Protect hydration
  const [mounted, setMounted] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (currentProjectUid) {
      projectsApi.getPendingTaskRequests(currentProjectUid)
        .then(reqs => setPendingRequestsCount(reqs.length))
        .catch(() => {});
    }
  }, [currentProjectUid]);

  if (!mounted || !currentProjectUid) {
    return <aside className="sidebar opacity-0 pointer-events-none" aria-hidden="true" />;
  }

  const workspaceLinks = [
    { label: "Data Hub", id: "data_hub", icon: "🗄️" },
    { label: "Matrix", id: "matrix", icon: "🏗️" },
    { label: "Site Ops", id: "site_ops", icon: "🛡️" },
    { label: "Gantt Timeline", id: "gantt", icon: "📅" },
    { label: pendingRequestsCount > 0 ? `Task Approvals (${pendingRequestsCount})` : "Task Approvals", id: "access_requests", icon: "🔑" },
  ];

  const toolsLinks = [
    { label: "Estimation", href: `/dashboard/projects/${currentProjectUid}/estimation`, icon: "📐" },
    { label: "Reports", href: `/dashboard/projects/${currentProjectUid}/report/project-summary`, icon: "📄", target: "_blank" },
  ];

  return (
    <aside className="sidebar shadow-2xl z-50 relative min-h-0">
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
      {/* Toggle Collapse Button & Back to Portal */}
      <div className="flex items-center justify-between mb-3 min-w-0">
        <button 
          onClick={() => {
            setProjectContext(null);
            router.push("/dashboard/projects");
          }}
          className={`flex items-center gap-1.5 text-[11px] font-bold text-text-secondary hover:text-foreground transition-colors min-w-0 ${isSidebarCollapsed ? 'justify-center w-8 h-8 bg-surface-100 rounded-lg shrink-0' : 'uppercase tracking-widest'}`}
          title="Back to Projects"
        >
          {isSidebarCollapsed ? (
            <span className="text-xs leading-none mt-px">←</span>
          ) : (
            <>
              <span className="text-xs leading-none mt-px shrink-0">←</span>
              <span className="truncate">Global Portfolio</span>
            </>
          )}
        </button>
      </div>

      {/* Project Title Block */}
      {!isSidebarCollapsed && (
        <div className="mb-4 min-w-0">
          <h2 className="text-sm font-black text-foreground tracking-tight leading-snug line-clamp-2">
            {currentProjectTitle || "Loading Project..."}
          </h2>
          <div className="mt-1 inline-flex items-center px-1.5 py-0.5 bg-surface-100 text-text-secondary text-[8px] font-bold uppercase tracking-widest rounded border border-surface-200">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-green mr-1 animate-pulse" />
            Workspace Active
          </div>
        </div>
      )}

      <nav className="flex-1 min-h-0 flex flex-col gap-3.5 overflow-y-auto overflow-x-hidden scroll-smooth">
        {/* Workspace Views */}
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-text-secondary font-black">
              Project Workspace
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => (
              <Link 
                key={link.id} 
                href={`/dashboard/projects/${currentProjectUid}?tab=${link.id}`} 
                className={`nav-item ${currentTab === link.id && pathname === `/dashboard/projects/${currentProjectUid}` ? "active bg-surface-100 text-foreground border-surface-200" : ""} ${isSidebarCollapsed ? 'justify-center p-0 w-10 h-10 rounded-lg mx-auto' : ''}`}
                title={isSidebarCollapsed ? link.label : undefined}
              >
                <span className="text-lg leading-none grayscale opacity-70 transition-all group-hover:grayscale-0 group-hover:opacity-100 shrink-0">{link.icon}</span>
                {!isSidebarCollapsed && <span className="truncate">{link.label}</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* Project Tools */}
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-text-secondary font-black">
              Project Tools
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {toolsLinks.map((link) => (
              <Link 
                key={link.label} 
                href={link.href} 
                target={link.target}
                className={`nav-item ${pathname === link.href ? "active bg-surface-100 text-foreground border-surface-200" : ""} ${isSidebarCollapsed ? 'justify-center p-0 w-10 h-10 rounded-lg mx-auto' : ''}`}
                title={isSidebarCollapsed ? link.label : undefined}
              >
                <span className="text-lg leading-none grayscale opacity-70 transition-all shrink-0">{link.icon}</span>
                {!isSidebarCollapsed && <span className="truncate">{link.label}</span>}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {!isSidebarCollapsed && <div className="shrink-0"><ProfileBanner /></div>}
    </aside>
  );
};
