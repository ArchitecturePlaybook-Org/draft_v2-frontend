"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useProjectNavStore } from "@/store/project-nav-store";

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin } = usePermissions();
  const { currentProjectTitle, currentProjectUid, toggleSidebar, isSidebarCollapsed } = useProjectNavStore();

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, index) => {
      const href = "/" + parts.slice(0, index + 1).join("/");
      const isProjectUidSegment =
        currentProjectUid && part === currentProjectUid;
      const label = isProjectUidSegment && currentProjectTitle
        ? currentProjectTitle
        : part.charAt(0).toUpperCase() + part.slice(1);
      return { label, href };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="topbar">
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 rounded-lg bg-surface-100 border border-surface-200 text-surface-500 hover:text-foreground text-xs shrink-0"
          title="Toggle Navigation Menu"
        >
          ☰
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.href}>
            <span 
              className={`text-sm font-medium whitespace-nowrap shrink-0 ${
                idx === breadcrumbs.length - 1 ? "text-foreground truncate max-w-[min(200px,40vw)]" : "text-(--gray-600)"
              }`}
            >
              {crumb.label}
            </span>
            {idx < breadcrumbs.length - 1 && (
              <span className="text-(--gray-600) text-xs shrink-0">/</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-auto">
        {isAdmin && (
          <div className="px-2 sm:px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] sm:text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse whitespace-nowrap">
            Overseer
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
};
