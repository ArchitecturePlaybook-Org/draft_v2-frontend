"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { useAuthStore } from "@/store/auth-store";
import { playNotificationSound } from "@/shared/utils/audioNotification";

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  notification_type: "ORDER" | "CHAT" | "LEAD" | "TASK" | "SYSTEM" | string;
  link?: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

import { useNotificationContext } from "@/shared/providers/NotificationProvider";

export function useNotificationCenterState() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch initial notifications history
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetchFromBff<any>("/api/v1/communications/notifications/");
      const list = Array.isArray(res) ? res : res?.results || [];
      setNotifications(list);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Connect WebSocket stream for real-time notifications with robust url fallback
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host =
      process.env.NEXT_PUBLIC_WS_HOST ||
      (window.location.hostname === "localhost" ? "127.0.0.1:8000" : window.location.host);
    const wsUrl = `${protocol}//${host}/ws/notifications/`;

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log(`[NotificationWS] Live notification stream connected for user #${user.id}`);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const item: NotificationItem | undefined = data.notification || data.payload;
            if (item && item.id) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === item.id)) return prev;
                return [item, ...prev];
              });

              // Play notification audio sound
              playNotificationSound();
            }
          } catch {
            // Ignore non-json frames
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    // Fallback sync every 10 seconds to guarantee live state
    pollInterval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollInterval) clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await fetchFromBff(`/api/v1/communications/notifications/${id}/read/`, {
        method: "POST",
      });
    } catch {
      // Fallback
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await fetchFromBff("/api/v1/communications/notifications/read-all/", {
        method: "POST",
      });
    } catch {
      // Fallback
    }
  }, []);

  const markThreadNotificationsAsRead = useCallback((orderId?: number, leadId?: number) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (!n.is_read && n.notification_type === "CHAT" && n.metadata) {
          const matchedOrder = orderId && (Number(n.metadata.showroom_order) === Number(orderId) || Number(n.metadata.order_id) === Number(orderId));
          const matchedLead = leadId && Number(n.metadata.lead_id) === Number(leadId);
          if (matchedOrder || matchedLead) {
            return { ...n, is_read: true };
          }
        }
        return n;
      })
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadChatCount = notifications.filter(
    (n) => !n.is_read && n.notification_type === "CHAT"
  ).length;

  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  return {
    notifications: filteredNotifications,
    allNotifications: notifications,
    showUnreadOnly,
    setShowUnreadOnly,
    unreadCount,
    unreadChatCount,
    isOpen,
    setIsOpen,
    loading,
    markAsRead,
    markAllAsRead,
    markThreadNotificationsAsRead,
    refetch: fetchNotifications,
  };
}

export function useNotificationCenter() {
  const ctx = useNotificationContext();
  const fallback = useNotificationCenterState();
  return ctx || fallback;
}
