"use client";

import React from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { LogOut } from "lucide-react";

export const ProfileBanner: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { category, isAdmin } = usePermissions();

  return (
    <div className="mt-auto pt-2 border-t border-surface-200/60">
      <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-surface-100/60 border border-surface-200/50 hover:border-surface-300 transition-all">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-accent/80 to-accent flex items-center justify-center font-black text-background text-[10px] shadow-2xs shrink-0">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-foreground truncate leading-none">
              {user?.name || "User"}
            </p>
            <p className="text-[8px] font-black uppercase tracking-wider text-surface-400 truncate mt-0.5">
              {isAdmin ? "Superadmin" : category || "Standard"}
            </p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-surface-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
          title="Sign Out"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
