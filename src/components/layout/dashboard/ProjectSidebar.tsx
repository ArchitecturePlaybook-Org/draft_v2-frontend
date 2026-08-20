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
import {
  Database,
  LayoutGrid,
  ShieldCheck,
  CalendarDays,
  KeyRound,
  Ruler,
  FileText,
  ArrowLeft,
} from "lucide-react";

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
    { label: "Data Hub", id: "data_hub", icon: <Database className="w-4 h-4" /> },
    { label: "Matrix", id: "matrix", icon: <LayoutGrid className="w-4 h-4" /> },
    { label: "Site Ops", id: "site_ops", icon: <ShieldCheck className="w-4 h-4" /> },
    { label: "Gantt Timeline", id: "gantt", icon: <CalendarDays className="w-4 h-4" /> },
    { label: pendingRequestsCount > 0 ? `Task Approvals (${pendingRequestsCount})` : "Task Approvals", id: "access_requests", icon: <KeyRound className="w-4 h-4" /> },
  ];

  const toolsLinks: { label: string; href: string; icon: React.ReactNode; target?: string }[] = [
    { label: "Estimation", href: `/dashboard/projects/${currentProjectUid}/estimation`, icon: <Ruler className="w-4 h-4" /> },
    { label: "Reports", href: `/dashboard/projects/${currentProjectUid}/report/project-summary`, icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <aside className="sidebar shadow-2xl z-50 relative min-h-0 bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-xl border-r border-surface-200/80 dark:border-white/10 p-2.5 flex flex-col justify-between transition-all duration-300">
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
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      {/* Back to Global Portfolio Link */}
      <div className={`flex items-center mb-2 min-w-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        <button 
          onClick={() => {
            setProjectContext(null);
            router.push("/dashboard/projects");
          }}
          className={`flex items-center gap-1.5 text-[10px] font-bold text-surface-400 hover:text-primary transition-colors min-w-0 ${isSidebarCollapsed ? 'justify-center w-8 h-8 bg-surface-100 dark:bg-surface-800 rounded-lg shrink-0' : 'uppercase tracking-wider'}`}
          title="Back to Global Projects"
        >
          {isSidebarCollapsed ? (
            <ArrowLeft className="w-3.5 h-3.5 text-surface-400" />
          ) : (
            <>
              <ArrowLeft className="w-3 h-3 text-accent shrink-0" />
              <span className="truncate">Global Portfolio</span>
            </>
          )}
        </button>
      </div>

      {/* Active Project Title Block */}
      {!isSidebarCollapsed && (
        <div className="mb-2.5 min-w-0 bg-surface-100/70 dark:bg-surface-800/50 p-2 rounded-lg border border-surface-200/80 dark:border-white/10">
          <h2 className="text-[11px] font-black text-primary tracking-tight leading-snug line-clamp-2">
            {currentProjectTitle || "Loading Project..."}
          </h2>
          <div className="mt-0.5 inline-flex items-center px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-extrabold uppercase tracking-wider rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
            Workspace Active
          </div>
        </div>
      )}

      <nav className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Workspace Views */}
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2 mb-1 text-[8px] uppercase tracking-widest text-surface-400 font-extrabold">
              Project Workspace
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => (
              <Link 
                key={link.id} 
                href={`/dashboard/projects/${currentProjectUid}?tab=${link.id}`} 
                className={`nav-item ${currentTab === link.id && pathname === `/dashboard/projects/${currentProjectUid}` ? "active" : ""} ${isSidebarCollapsed ? 'justify-center p-0 w-8 h-8 rounded-lg mx-auto text-xs' : ''}`}
                title={isSidebarCollapsed ? link.label : undefined}
              >
                <span className="text-xs leading-none shrink-0">{link.icon}</span>
                {!isSidebarCollapsed && <span className="truncate text-[11px]">{link.label}</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* Project Tools */}
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-2 mb-1 text-[8px] uppercase tracking-widest text-surface-400 font-extrabold">
              Tools
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {toolsLinks.map((link) => (
              <Link 
                key={link.label} 
                href={link.href} 
                target={link.target}
                className={`nav-item ${pathname === link.href ? "active" : ""} ${isSidebarCollapsed ? 'justify-center p-0 w-8 h-8 rounded-lg mx-auto text-xs' : ''}`}
                title={isSidebarCollapsed ? link.label : undefined}
              >
                <span className="text-xs leading-none shrink-0">{link.icon}</span>
                {!isSidebarCollapsed && <span className="truncate text-[11px]">{link.label}</span>}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {!isSidebarCollapsed && <div className="shrink-0 pt-2"><ProfileBanner /></div>}
    </aside>
  );
};
