"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSameDay } from "date-fns";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useProjectNavStore } from "@/store/project-nav-store";
import { useNotificationCenter } from "@/shared/hooks/useNotificationCenter";
import { NotificationCenterDrawer } from "@/components/notifications/NotificationCenterDrawer";
import { CalendarSidePanelDrawer } from "@/components/layout/dashboard/CalendarSidePanelDrawer";
import { eventsApi } from "@/domains/events/api";
import { projectsApi } from "@/domains/projects/api";
import { Calendar, Bell, Globe } from "lucide-react";

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const { currentProjectTitle, currentProjectUid, toggleSidebar, isSidebarCollapsed } = useProjectNavStore();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [todayScheduleCount, setTodayScheduleCount] = useState(0);

  useEffect(() => {
    const fetchTodaySchedule = async () => {
      try {
        const [eventsRes, tasksRes] = await Promise.all([
          eventsApi.listEvents().catch(() => []),
          projectsApi.getTasks().catch(() => []),
        ]);
        const events = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any)?.results || [];
        const tasks = Array.isArray(tasksRes) ? tasksRes : (tasksRes as any)?.results || [];

        const today = new Date();
        const countEvents = events.filter((e: any) => e.event_date && isSameDay(new Date(e.event_date), today)).length;
        const countTasks = tasks.filter((t: any) => (t.due_date || t.end_date) && isSameDay(new Date((t.due_date || t.end_date) as string), today)).length;

        setTodayScheduleCount(countEvents + countTasks);
      } catch (err) {
        console.error("[Topbar] Failed to fetch today agenda:", err);
      }
    };

    fetchTodaySchedule();
  }, [isCalendarOpen]);

  const {
    notifications,
    allNotifications,
    showUnreadOnly,
    setShowUnreadOnly,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
  } = useNotificationCenter();

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
    <>
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



          {/* Calendar Side Panel Button */}
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="relative p-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-600 transition-colors cursor-pointer shrink-0"
            title={todayScheduleCount > 0 ? `Agenda (${todayScheduleCount} item${todayScheduleCount > 1 ? 's' : ''} scheduled today)` : "Agenda & Calendar"}
          >
            <Calendar className="w-4 h-4" />
            {todayScheduleCount > 0 && (
              <>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping opacity-75" />
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center border-2 border-surface-card shadow-xs">
                  {todayScheduleCount > 9 ? "9+" : todayScheduleCount}
                </span>
              </>
            )}
          </button>

          {/* Real-time Notification Bell Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-600 transition-colors cursor-pointer shrink-0"
            title="Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center border-2 border-surface-card shadow-xs animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <ThemeToggle />

          {/* Public Portfolio View Link */}
          <Link
            href="/portfolio"
            className="hidden sm:flex bg-accent text-background text-xs font-extrabold px-4 py-2 rounded-xl hover:opacity-90 transition-all shadow-md shadow-accent/20 items-center gap-2 uppercase tracking-wider shrink-0"
            title="View Public Portfolio"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public View</span>
          </Link>
        </div>
      </header>

      {/* Slide-Over Notification Drawer */}
      <NotificationCenterDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        allNotifications={allNotifications}
        showUnreadOnly={showUnreadOnly}
        setShowUnreadOnly={setShowUnreadOnly}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Calendar Side Panel Drawer */}
      <CalendarSidePanelDrawer 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
      />
    </>
  );
};
