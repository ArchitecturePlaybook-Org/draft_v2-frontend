"use client";

import React, { useState, useEffect } from "react";
import { AdminUserListItem, UserActivityLog, usersApi } from "@/domains/users/api";
import { X, Shield, Building2, FolderKanban, Activity, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface UserActivityDetailDrawerProps {
  user: AdminUserListItem | null;
  onClose: () => void;
  onStatusChanged: (userId: string, newStatus: boolean) => void;
}

export const UserActivityDetailDrawer: React.FC<UserActivityDetailDrawerProps> = ({
  user,
  onClose,
  onStatusChanged,
}) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      setIsLoadingLogs(true);
      usersApi.getUserActivityLogs(user.uid)
        .then(setLogs)
        .finally(() => setIsLoadingLogs(false));
    }
  }, [user?.uid]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface-50 dark:bg-surface-900 border-l border-surface-200 dark:border-surface-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-surface-200/80 dark:border-surface-800 flex items-center justify-between bg-surface-100/50 dark:bg-surface-950/50">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
              alt={user.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-accent/40 shadow-sm"
            />
            <div>
              <h3 className="text-base font-black text-primary tracking-tight">{user.name}</h3>
              <p className="text-xs text-surface-500 font-medium">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-200/60 dark:bg-surface-800 text-surface-400 hover:text-primary hover:bg-surface-300 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Status & Account Actions */}
          <div className="p-4 rounded-2xl bg-surface-100/80 dark:bg-surface-950/60 border border-surface-200/80 dark:border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${user.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-xs font-black uppercase tracking-wider text-primary">
                Account Status: <strong className={user.is_active ? "text-emerald-500" : "text-rose-500"}>{user.is_active ? "ACTIVE" : "INACTIVE"}</strong>
              </span>
            </div>

            <button
              onClick={() => onStatusChanged(user.uid, user.is_active)}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
                user.is_active
                  ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30"
                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
              }`}
            >
              {user.is_active ? "Deactivate Account" : "Activate Account"}
            </button>
          </div>

          {/* Tenant & Profile Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-surface-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-accent" /> Tenant & Organization
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-200/70 dark:border-surface-800">
                <span className="text-[9px] font-black uppercase tracking-wider text-surface-400 block">Organization</span>
                <span className="text-xs font-black text-primary truncate block mt-0.5">{user.tenant_name || "Independent"}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-200/70 dark:border-surface-800">
                <span className="text-[9px] font-black uppercase tracking-wider text-surface-400 block">Category & Role</span>
                <span className="text-xs font-black text-accent truncate block mt-0.5">{user.category || "Professional"} ({user.role})</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-200/70 dark:border-surface-800">
                <span className="text-[9px] font-black uppercase tracking-wider text-surface-400 block">Location</span>
                <span className="text-xs font-bold text-primary truncate block mt-0.5">{user.city ? `${user.city}, ${user.country}` : "Global"}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-200/70 dark:border-surface-800">
                <span className="text-[9px] font-black uppercase tracking-wider text-surface-400 block">Joined Date</span>
                <span className="text-xs font-bold text-primary truncate block mt-0.5">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Project & Contribution Metrics */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-surface-400 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-accent" /> Work & Metrics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-surface-card border border-surface-200/70 dark:border-surface-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent font-black text-sm flex items-center justify-center">
                  📁
                </div>
                <div>
                  <span className="text-base font-black text-primary">{user.projects_count}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400 block">Active Projects</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface-card border border-surface-200/70 dark:border-surface-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 font-black text-sm flex items-center justify-center">
                  ⚡
                </div>
                <div>
                  <span className="text-base font-black text-primary">{user.contributions_count}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-surface-400 block">Total Contributions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Audit Logs */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-surface-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-accent" /> Security & Activity Audit Log
            </h4>

            {isLoadingLogs ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-surface-100/60 dark:bg-surface-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-surface-400 bg-surface-card rounded-xl border border-surface-200">
                <p className="text-xs font-bold">No activity logs recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-surface-card border border-surface-200/70 dark:border-surface-800 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                        {log.action_type}
                      </span>
                      <span className="text-[9px] font-bold text-surface-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-primary">{log.title}</h5>
                    <p className="text-[11px] text-surface-500 font-medium">{log.details}</p>
                    {log.ip_address && (
                      <span className="text-[9px] font-mono text-surface-400 block pt-0.5">
                        IP: {log.ip_address}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
