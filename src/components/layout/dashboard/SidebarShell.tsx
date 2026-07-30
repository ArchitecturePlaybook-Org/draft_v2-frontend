"use client";

import React, { useEffect, useState } from "react";
import { useProjectNavStore } from "@/store/project-nav-store";
import { Sidebar } from "@/components/layout/dashboard/Sidebar";
import { ProjectSidebar } from "@/components/layout/dashboard/ProjectSidebar";
import { usePathname } from "next/navigation";

/** Reserves horizontal space for the fixed-position sidebar in the flex layout. */
const SidebarSpacer = () => (
  <div className="sidebar-spacer shrink-0" aria-hidden="true" />
);

export const SidebarShell: React.FC = () => {
  const { isInsideProject, setProjectContext } = useProjectNavStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync isInsideProject based on URL to handle direct links and refreshes
  useEffect(() => {
    // Basic regex to check if we are deeply inside a project view
    const projectMatch = pathname.match(/^\/dashboard\/projects\/([a-zA-Z0-9-]+)(?:\/|$)/);
    
    // Check if the id is literally "page" (Next.js route file error fallback) or "null"
    if (projectMatch && projectMatch[1] && projectMatch[1] !== "page") {
      setProjectContext(projectMatch[1]);
    } else {
      setProjectContext(null);
    }
  }, [pathname, setProjectContext]);

  if (!mounted) {
    return (
      <>
        <SidebarSpacer />
        <aside className="sidebar opacity-0 pointer-events-none" aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      <SidebarSpacer />
      {isInsideProject ? <ProjectSidebar /> : <Sidebar />}
    </>
  );
};
