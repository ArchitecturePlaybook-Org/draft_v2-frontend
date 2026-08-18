"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/domains/communications/api";

export function useLeadWebSocket(
  leadId: number | null,
  onMessageReceived: (message: Message) => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!leadId) return;

    // Determine WS protocol based on window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_HOST || "localhost:8000";
    const wsUrl = `${protocol}//${host}/ws/chat/lead_${leadId}/`;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log(`[WebSocket] Connected to lead_${leadId} real-time channel.`);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.message) {
              onMessageReceived(data.message);
            }
          } catch (e) {
            console.error("[WebSocket] Error parsing frame:", e);
          }
        };

        socket.onclose = (event) => {
          if (event.code !== 1000) {
            // Reconnect with backoff
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        socket.onerror = (err) => {
          console.error("[WebSocket] Connection error:", err);
        };
      } catch (err) {
        console.error("[WebSocket] Handshake failed:", err);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close(1000, "Component unmounted");
      }
    };
  }, [leadId, onMessageReceived]);

  return wsRef;
}
