"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { SidebarShell } from "@/components/layout/dashboard/SidebarShell";
import { Topbar } from "@/components/layout/dashboard/Topbar";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { AnalystBot } from "@/components/AnalystBot";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import { useProjectNavStore } from "@/store/project-nav-store";
import { NotificationProvider } from "@/shared/providers/NotificationProvider";
import { useNotificationCenterState } from "@/shared/hooks/useNotificationCenter";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isSidebarCollapsed } = useProjectNavStore();
  const notificationState = useNotificationCenterState();

  useEffect(() => {
    if (user && user.profile && user.profile.is_onboarding_complete === false) {
      if (!pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
      }
    }
  }, [user, pathname, router]);

  const hideTopbar = pathname.includes('/estimation') || pathname.includes('/editor') || pathname.includes('/sketch') || pathname.includes('/bim-viewer');
  const isEditorFullscreen = pathname.includes('/editor') || pathname.includes('/sketch') || pathname.includes('/bim-viewer');
  const isFullWidthPage = pathname.includes('/showroom/chats') || hideTopbar;

  if (isEditorFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <NotificationProvider value={notificationState}>
      <div className={`dashboard-shell flex flex-col h-screen overflow-hidden relative ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <TrialBanner />
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          {/* Dynamic Navigation Components */}
          <SidebarShell />

          {/* Main Execution Area */}
          <main className={`main-area ${isFullWidthPage ? "overflow-hidden" : ""}`}>
            {!hideTopbar && <Topbar />}
            <div className={`min-w-0 max-w-full ${isFullWidthPage ? "h-full w-full flex-1 overflow-hidden p-0 m-0" : "page-content flex-1"}`}>
              {children}
            </div>
          </main>
        </div>
        
        {/* Theme toggle on fullscreen pages only (estimation / editor) */}
        {hideTopbar && (
          <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[39] pointer-events-none">
            <div className="pointer-events-auto">
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* Global Analyst Assistant */}
        <AnalystBot />
        <KeyboardShortcuts />
        <OfflineIndicator />
      </div>
    </NotificationProvider>
  );
}
