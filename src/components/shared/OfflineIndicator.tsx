"use client";

import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, flushSyncQueue } from "@/shared/offline/db";
import { WifiOff, RefreshCcw } from "lucide-react";

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOffline(!window.navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      flushSyncQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const pendingCount = useLiveQuery(() => db.syncQueue.where("status").equals("PENDING").count(), []);

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {isOffline && (
        <div className="glass-card bg-surface-900/90 text-white px-4 py-2.5 rounded-full shadow-2xl border border-surface-700 flex items-center gap-2.5 pointer-events-auto">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold uppercase tracking-widest">Offline Mode</span>
        </div>
      )}

      {!isOffline && pendingCount && pendingCount > 0 ? (
        <div className="glass-card bg-accent/90 text-white px-4 py-2.5 rounded-full shadow-2xl border border-accent flex items-center gap-2.5 pointer-events-auto">
          <RefreshCcw className="w-4 h-4 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Syncing {pendingCount} tasks...</span>
        </div>
      ) : null}
      
      {isOffline && pendingCount && pendingCount > 0 ? (
        <div className="glass-card bg-surface-900/90 text-surface-300 px-4 py-2 rounded-full shadow-xl border border-surface-700 flex items-center gap-2 pointer-events-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest">{pendingCount} pending syncs</span>
        </div>
      ) : null}
    </div>
  );
};
