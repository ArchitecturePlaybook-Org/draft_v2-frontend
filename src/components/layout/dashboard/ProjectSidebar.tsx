"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { ProfileBanner } from "@/components/layout/dashboard/ProfileBanner";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useProjectNavStore } from "@/store/project-nav-store";

export const ProjectSidebar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "kanban";
  const { isAdmin } = usePermissions();
  const setIsCommandPaletteOpen = useCommandPaletteStore((state) => state.setIsOpen);
  const { currentProjectUid, currentProjectTitle, setProjectContext, isSidebarCollapsed, toggleSidebar } = useProjectNavStore();
  const router = useRouter();

  // Protect hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !currentProjectUid) return <aside className="sidebar opacity-0" />;

  const workspaceLinks = [
    { label: "Kanban", id: "kanban", icon: "🗂️" },
    { label: "Gantt Timeline", id: "gantt", icon: "📅" },
    { label: "Data Hub", id: "data_hub", icon: "🗄️" },
    { label: "Matrix", id: "matrix", icon: "🏗️" },
    { label: "Site Ops", id: "site_ops", icon: "🛡️" },
  ];

  const toolsLinks = [
    { label: "Procurement", href: `/dashboard/projects/${currentProjectUid}/procurement`, icon: "🛒" },
    { label: "Reports", href: `/dashboard/projects/${currentProjectUid}/report/project-summary`, icon: "📄", target: "_blank" },
  ];

  return (
    <aside className="sidebar shadow-2xl z-50">
      {/* Toggle Collapse Button & Back to Portal */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => {
            setProjectContext(null);
            router.push("/dashboard/projects");
          }}
          className={`flex items-center gap-2 text-xs font-bold text-surface-500 hover:text-primary transition-colors ${isSidebarCollapsed ? 'justify-center w-10 h-10 bg-surface-50 rounded-xl' : 'uppercase tracking-widest'}`}
          title="Back to Projects"
        >
          {isSidebarCollapsed ? (
            <span className="text-sm leading-none mt-px">←</span>
          ) : (
            <>
              <span className="text-sm leading-none mt-px">←</span> Projects Registry
            </>
          )}
        </button>
        <button 
          onClick={toggleSidebar}
          className="w-8 h-8 shrink-0 rounded-lg bg-surface-50 hover:bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-500 transition-colors shadow-sm"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Project Title Block */}
      {!isSidebarCollapsed && (
        <div className="mb-8">
          <h2 className="text-xl font-extrabold text-primary tracking-tight leading-tight line-clamp-2">
            {currentProjectTitle || "Loading Project..."}
          </h2>
          <div className="mt-2 inline-flex items-center px-2 py-1 bg-surface-100 text-surface-600 text-[9px] font-bold uppercase tracking-widest rounded-md border border-surface-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Workspace Active
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 -mr-2 overflow-x-hidden">
        {/* Workspace Views */}
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-surface-400 font-black">
              Project Workspace
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => (
              <Link 
                key={link.id} 
                href={`/dashboard/projects/${currentProjectUid}?tab=${link.id}`} 
                className={`nav-item ${currentTab === link.id && pathname === `/dashboard/projects/${currentProjectUid}` ? "active bg-primary/5 text-primary border-primary/10" : ""} ${isSidebarCollapsed ? 'justify-center p-0 w-10 h-10 rounded-xl mx-auto' : ''}`}
                title={isSidebarCollapsed ? link.label : undefined}
              >
                <span className="text-lg leading-none grayscale opacity-70 transition-all group-hover:grayscale-0 group-hover:opacity-100 shrink-0">{link.icon}</span>
                {!isSidebarCollapsed && link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Project Tools */}
        <div>
          {!isSidebarCollapsed && (
            <h4 className="px-3 mb-3 text-[10px] uppercase tracking-widest text-surface-400 font-black">
              Project Tools
            </h4>
          )}
          <div className="flex flex-col gap-1">
            {toolsLinks.map((link) => (
              <Link 
                key={link.label} 
                href={link.href} 
                target={link.target}
                className={`nav-item ${pathname === link.href ? "active bg-primary/5 text-primary border-primary/10" : ""} ${isSidebarCollapsed ? 'justify-center p-0 w-10 h-10 rounded-xl mx-auto' : ''}`}
                title={isSidebarCollapsed ? link.label : undefined}
              >
                <span className="text-lg leading-none grayscale opacity-70 transition-all shrink-0">{link.icon}</span>
                {!isSidebarCollapsed && link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {!isSidebarCollapsed && <ProfileBanner />}
    </aside>
  );
};
