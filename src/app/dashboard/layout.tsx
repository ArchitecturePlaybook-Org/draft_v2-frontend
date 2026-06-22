"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { SidebarShell } from "@/components/layout/dashboard/SidebarShell";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { useProjectNavStore } from "@/store/project-nav-store";

import { AnalystBot } from "@/components/AnalystBot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isSidebarCollapsed } = useProjectNavStore();

  useEffect(() => {
    if (user && user.profile && user.profile.is_onboarding_complete === false) {
      if (!pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
      }
    }
  }, [user, pathname, router]);

  return (
    <div className={`dashboard-shell flex flex-col h-screen overflow-hidden relative ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <TrialBanner />
      <div className="flex flex-1 min-h-0">
        {/* Dynamic Navigation Components */}
        <SidebarShell />

        {/* Main Execution Area */}
        <main className="main-area">
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
      
      {/* Global Analyst Assistant */}
      <AnalystBot />
    </div>
  );
}
