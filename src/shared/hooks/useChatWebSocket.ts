"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/domains/communications/api";

export type ChatRoomType = "showroom_order" | "lead" | "channel" | "user";

export function useChatWebSocket(
  roomType: ChatRoomType,
  entityId: number | string | null | undefined,
  onMessageReceived: (message: Message) => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!entityId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_HOST || "localhost:8000";
    const roomName = `${roomType}_${entityId}`;
    const wsUrl = `${protocol}//${host}/ws/chat/${roomName}/`;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log(`[WebSocket] Connected to live chat room: ${roomName}`);
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
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        socket.onerror = (err) => {
          console.error(`[WebSocket] Room ${roomName} error:`, err);
        };
      } catch (err) {
        console.error(`[WebSocket] Room ${roomName} handshake failed:`, err);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close(1000, "Component unmounted");
      }
    };
  }, [roomType, entityId, onMessageReceived]);

  return wsRef;
}
