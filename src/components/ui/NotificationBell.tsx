"use client";

import React from "react";
import { useNotificationCenter } from "@/shared/hooks/useNotificationCenter";
import { NotificationCenterDrawer } from "@/components/notifications/NotificationCenterDrawer";
import { Bell } from "lucide-react";

export function NotificationBell() {
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-xl text-surface-500 hover:text-foreground hover:bg-surface-200/60 dark:hover:bg-surface-800 transition-colors cursor-pointer"
        title="Notification Center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border border-surface-card shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

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
    </>
  );
}

