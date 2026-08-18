"use client";

import React, { createContext, useContext } from "react";
import { type NotificationItem } from "@/shared/hooks/useNotificationCenter";

export interface NotificationCenterValue {
  notifications: NotificationItem[];
  allNotifications: NotificationItem[];
  showUnreadOnly: boolean;
  setShowUnreadOnly: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  unreadChatCount: number;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markThreadNotificationsAsRead: (orderId?: number, leadId?: number) => void;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationCenterValue | null>(null);

export function NotificationProvider({ children, value }: { children: React.ReactNode; value: NotificationCenterValue }) {
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationCenterValue | null {
  const ctx = useContext(NotificationContext);
  return ctx;
}
