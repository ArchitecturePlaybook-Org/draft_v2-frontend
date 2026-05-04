"use client";

import React from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/Badge";

export const ProfileBanner: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { category, isAdmin } = usePermissions();

  return (
    <div className="mt-auto p-4 glass-card border-(--surface-300) rounded-2xl!">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-tr from-(--primary) to-(--accent) flex items-center justify-center font-bold text-white shadow-lg shadow-(--primary)/20">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{user?.name || "User"}</p>
            <div className="flex gap-1 mt-1">
              {isAdmin ? (
                <Badge variant="danger" className="scale-90 origin-left">Superadmin</Badge>
              ) : (
                <Badge variant="primary" className="capitalize scale-90 origin-left">{category || "Standard"}</Badge>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-red-500/5 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 active:scale-[0.98] transition-all border border-red-500/10"
        >
          <span>🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  );
};
