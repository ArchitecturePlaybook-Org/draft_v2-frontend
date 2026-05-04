"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin } = usePermissions();

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, index) => {
      const href = "/" + parts.slice(0, index + 1).join("/");
      return { label: part.charAt(0).toUpperCase() + part.slice(1), href };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="topbar">
      <div className="flex items-center gap-2">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.href}>
            <span 
              className={`text-sm font-medium ${
                idx === breadcrumbs.length - 1 ? "text-foreground" : "text-(--gray-600)"
              }`}
            >
              {crumb.label}
            </span>
            {idx < breadcrumbs.length - 1 && (
              <span className="text-(--gray-600) text-xs">/</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {isAdmin && (
          <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
            System Overseer Mode
          </div>
        )}
        <div className="flex gap-2">
          {/* Action buttons could go here */}
        </div>
      </div>
    </header>
  );
};
