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

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let isCancelled = false;
    let hasConnectedOnce = false;

    const connect = async () => {
      if (isCancelled) return;

      let token = "";
      try {
        const tokenRes = await fetch("/api/ws-token");
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          token = tokenData.token || "";
        }
      } catch {
        // Fallback
      }

      if (isCancelled) return;

      if (!token) {
        console.warn("[WebSocket] Token unavailable. Skipping lead WebSocket connection.");
        return;
      }

      const wsUrl = `${protocol}//${host}/ws/chat/lead_${leadId}/?token=${token}`;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          hasConnectedOnce = true;
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
          if (event.code === 4003 || event.code === 4001 || event.code === 1008 || !hasConnectedOnce) {
            console.warn("[WebSocket] Lead channel connection rejected or failed. Halting reconnect.");
            return;
          }
          if (!isCancelled && event.code !== 1000) {
            reconnectTimeout = setTimeout(connect, 10000);
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
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close(1000, "Component unmounted");
      }
    };
  }, [leadId, onMessageReceived]);

  return wsRef;
}
