"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

export interface NotificationPayload {
  id: number;
  title: string;
  body: string;
  notification_type: string;
  link: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Fetch initial notifications via REST API
    const fetchInitialNotifications = async () => {
      try {
        const res = await fetch("/api/v1/communications/notifications/");
        if (res.ok) {
          const data = await res.json();
          // Adjust according to paginated response if applicable
          const results = data.results || data;
          setNotifications(results);
          setUnreadCount(results.filter((n: NotificationPayload) => !n.is_read).length);
        }
      } catch (err) {
        console.error("Failed to fetch initial notifications", err);
      }
    };

    fetchInitialNotifications();

    // Connect WebSocket
    const connectWs = async () => {
      try {
        const tokenRes = await fetch("/api/ws-token");
        if (!tokenRes.ok) return;
        const { token } = await tokenRes.json();

        // Check environment / domain for WS URL
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        // Hardcode localhost:8000 for development, or proxy via Next.js if set up
        const wsHost = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";
        const wsUrl = `${wsHost}/ws/notifications/?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log("Notification WebSocket connected");

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.notification) {
            setNotifications((prev) => [data.notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        };

        ws.onclose = () => console.log("Notification WebSocket disconnected");

        wsRef.current = ws;
      } catch (err) {
        console.error("Failed to connect WS", err);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/v1/communications/notifications/${id}/mark-read/`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/v1/communications/notifications/mark-all-read/`, { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
