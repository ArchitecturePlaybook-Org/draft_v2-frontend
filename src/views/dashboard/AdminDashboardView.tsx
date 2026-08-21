"use client";

import React, { useEffect, useState } from "react";
import { usersApi, AdminDashboardStats, UserActivityLog } from "@/domains/users/api";
import { Card } from "@/components/ui/Card";
import { Users, Building2, CreditCard, Activity, ArrowRight, ShieldCheck, UserX } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function AdminDashboardView() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await usersApi.getAdminDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-surface-500 font-medium text-sm">Loading admin dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load dashboard statistics. Ensure you have super admin privileges.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-white tracking-tight">Super Admin Command Center</h1>
          <p className="text-sm text-surface-500 mt-1">Platform-wide overview and real-time telemetry.</p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <Card className="p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-accent/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-surface-500 text-sm font-bold uppercase tracking-widest">
              <Users className="w-4 h-4 text-blue-500" />
              Users
            </div>
          </div>
          <div className="z-10">
            <span className="text-3xl font-black text-surface-900 dark:text-white">{stats.users.total}</span>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3" /> {stats.users.active} Active
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                <UserX className="w-3 h-3" /> {stats.users.inactive} Inactive
              </span>
            </div>
          </div>
        </Card>

        {/* Tenants Card */}
        <Card className="p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-accent/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Building2 className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-surface-500 text-sm font-bold uppercase tracking-widest">
              <Building2 className="w-4 h-4 text-amber-500" />
              Tenants
            </div>
          </div>
          <div className="z-10">
            <span className="text-3xl font-black text-surface-900 dark:text-white">{stats.accounts.total}</span>
            <p className="text-xs text-surface-500 font-medium mt-2">
              <span className="text-amber-500 font-bold">{stats.accounts.active}</span> active workspaces
            </p>
          </div>
        </Card>

        {/* Billing Card */}
        <Card className="p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-accent/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-surface-500 text-sm font-bold uppercase tracking-widest">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Subscriptions
            </div>
          </div>
          <div className="z-10">
            <span className="text-3xl font-black text-surface-900 dark:text-white">{stats.billing.active_subscriptions}</span>
            <p className="text-xs text-surface-500 font-medium mt-2">
              <span className="text-emerald-500 font-bold">₹{stats.billing.mrr_estimate.toLocaleString()}</span> Estimated MRR
            </p>
          </div>
        </Card>
      </div>

      {/* Activity Log Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Global Security Audit Log
          </h2>
          <Link href="/dashboard/users" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
            View All Users <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        <Card className="overflow-hidden border border-surface-200 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase tracking-wider text-surface-500 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-extrabold">User</th>
                  <th className="px-4 py-3 font-extrabold">Action</th>
                  <th className="px-4 py-3 font-extrabold">Time</th>
                  <th className="px-4 py-3 font-extrabold text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-white/5">
                {stats.recent_activity && stats.recent_activity.length > 0 ? (
                  stats.recent_activity.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">
                        {log.user_email || "System"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-100 dark:bg-white/10 text-surface-600 dark:text-surface-300">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-500 whitespace-nowrap text-xs font-medium">
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-right text-surface-500 font-mono text-[10px]">
                        {log.ip_address || "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                      No recent activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
