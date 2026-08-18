"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { type NotificationItem } from "@/shared/hooks/useNotificationCenter";

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  allNotifications?: NotificationItem[];
  showUnreadOnly?: boolean;
  setShowUnreadOnly?: (val: boolean) => void;
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
}

const CATEGORY_ICONS: Record<string, { icon: string; style: string; label: string }> = {
  ORDER: { icon: "📦", style: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30", label: "Showroom Order" },
  CHAT: { icon: "💬", style: "bg-accent/15 text-accent border-accent/30", label: "Live Chat" },
  LEAD: { icon: "💼", style: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30", label: "Lead Inquiry" },
  TASK: { icon: "📋", style: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", label: "Project Task" },
  SYSTEM: { icon: "🔔", style: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", label: "System Alert" },
};

export function NotificationCenterDrawer({
  isOpen,
  onClose,
  notifications,
  allNotifications,
  showUnreadOnly = true,
  setShowUnreadOnly,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterDrawerProps) {
  const router = useRouter();
  const [localUnreadOnly, setLocalUnreadOnly] = useState(true);

  if (!isOpen) return null;

  const isUnreadOnly = setShowUnreadOnly ? showUnreadOnly : localUnreadOnly;
  const toggleUnreadOnly = (val: boolean) => {
    if (setShowUnreadOnly) {
      setShowUnreadOnly(val);
    } else {
      setLocalUnreadOnly(val);
    }
  };

  const listSource = allNotifications || notifications;
  const displayNotifications = isUnreadOnly
    ? listSource.filter((n) => !n.is_read)
    : listSource;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const handleActionClick = (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    onMarkAsRead(item.id);
    onClose();
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in select-none">
      <div className="w-full max-w-sm bg-surface-card border-l border-surface-200 dark:border-surface-800 h-full flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Compact Drawer Header */}
        <div className="p-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-md flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-xs border border-accent/30 shrink-0">
                🔔
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-black text-primary tracking-tight truncate">
                    Notification Center
                  </h2>
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="px-2 py-0.5 text-[9px] font-black text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-lg bg-surface-200/60 dark:bg-surface-800 hover:bg-surface-300 text-surface-600 dark:text-surface-300 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Tab Bar */}
          <div className="flex items-center p-0.5 bg-surface-100 dark:bg-surface-900/80 rounded-lg gap-0.5 text-[10px] font-bold border border-surface-200/60 dark:border-surface-800">
            <button
              onClick={() => toggleUnreadOnly(true)}
              className={`flex-1 py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                isUnreadOnly
                  ? "bg-surface-card text-accent font-black shadow-2xs border border-accent/20"
                  : "text-surface-400 hover:text-primary"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[8px] bg-rose-600 text-white rounded-full font-black animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => toggleUnreadOnly(false)}
              className={`flex-1 py-1 rounded-md transition-all text-center cursor-pointer ${
                !isUnreadOnly
                  ? "bg-surface-card text-accent font-black shadow-2xs border border-accent/20"
                  : "text-surface-400 hover:text-primary"
              }`}
            >
              All ({listSource.length})
            </button>
          </div>
        </div>

        {/* Dense Compact Scrollable List */}
        <div className="flex-1 p-2 overflow-y-auto min-h-0 space-y-1.5 bg-surface-50/40 dark:bg-surface-900/30">
          {displayNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-surface-400">
              <div className="w-10 h-10 rounded-xl bg-surface-200/60 dark:bg-surface-800 flex items-center justify-center text-xl shadow-inner">
                {isUnreadOnly ? "✨" : "🔕"}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-primary">
                  {isUnreadOnly ? "All Caught Up!" : "No Notifications"}
                </p>
                <p className="text-[10px] leading-snug max-w-xs text-surface-400">
                  {isUnreadOnly
                    ? "Switch to 'All' to view past notification activity."
                    : "Real-time updates will stream here automatically."}
                </p>
              </div>
            </div>
          ) : (
            displayNotifications.map((item) => {
              const cat = CATEGORY_ICONS[item.notification_type] || CATEGORY_ICONS.SYSTEM;

              return (
                <div
                  key={item.id}
                  onClick={(e) => handleActionClick(e, item)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group flex items-start gap-2.5 ${
                    item.is_read
                      ? "bg-surface-card border-surface-200/70 dark:border-surface-800/80 opacity-70 hover:opacity-100 hover:border-surface-300"
                      : "bg-surface-card border-accent/40 shadow-2xs ring-1 ring-accent/20 hover:border-accent"
                  }`}
                >
                  {!item.is_read && (
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}

                  {/* Compact Icon */}
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs shrink-0 mt-0.5 ${cat.style}`}>
                    {cat.icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5 pr-2">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md border ${cat.style}`}>
                        {cat.label}
                      </span>
                      <span className="text-[9px] font-semibold text-surface-400 shrink-0">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h4 className="text-[11px] font-bold text-primary truncate leading-tight group-hover:text-accent transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] font-medium text-surface-400 leading-normal line-clamp-1">
                      {item.body}
                    </p>
                  </div>

                  {/* Arrow Link */}
                  {item.link && (
                    <span className="text-xs font-black text-accent shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all self-center">
                      →
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

