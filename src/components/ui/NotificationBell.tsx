"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { useNotifications, NotificationPayload } from "@/hooks/useNotifications";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{notification.body}</p>
                  <div className="flex items-center justify-between">
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          if (!notification.is_read) markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        View details
                      </Link>
                    ) : (
                      <span />
                    )}
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
