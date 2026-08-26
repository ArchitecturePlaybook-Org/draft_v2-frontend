"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AdminTenantListItem, adminApi } from "@/domains/admin/api";
import { Search, Building2, Users, FolderKanban, HardDrive, CheckCircle2, ChevronLeft, ChevronRight, Activity, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { COMPACT_UI } from "@/theme/ui-tokens";

import { TenantDetailDrawer } from "./TenantDetailDrawer";

export function TenantManagementView() {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const router = useRouter();

  const isSuperAdmin = isAdmin || Boolean((user as any)?.is_superuser) || user?.email === "superadmin@ap.com";

  const [tenants, setTenants] = useState<AdminTenantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected tenant for drawer
  const [selectedTenant, setSelectedTenant] = useState<AdminTenantListItem | null>(null);

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/unauthorized");
      return;
    }
    if (isSuperAdmin) {
      loadTenants();
    }
  }, [user, isSuperAdmin, router]);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.listTenants();
      setTenants(data || []);
    } catch (e) {
      console.error("Failed to load tenants list", e);
      toast.error("Failed to load workspaces.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (tenantId: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await adminApi.updateTenant(tenantId, { is_active: nextStatus });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, is_active: nextStatus } : t));
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(prev => prev ? { ...prev, is_active: nextStatus } : null);
      }
      toast.success(`Workspace status updated to ${nextStatus ? "Active" : "Inactive"}`);
    } catch (e) {
      toast.error("Failed to update workspace status");
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter(t => t.is_active && !t.is_deleted).length;
    const totalUsers = tenants.reduce((acc, t) => acc + (t.users_count || 0), 0);
    const totalStorage = tenants.reduce((acc, t) => acc + (t.storage_used_gb || 0), 0);

    return { total, active, totalUsers, totalStorage: totalStorage.toFixed(1) };
  }, [tenants]);

  // Unique Plan List for Filter Dropdown
  const planOptions = useMemo(() => {
    const set = new Set<string>();
    tenants.forEach(t => {
      if (t.plan_name) set.add(t.plan_name);
    });
    return Array.from(set);
  }, [tenants]);

  // Filtered Tenants List
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      if (t.is_deleted) return false;

      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? t.is_active : !t.is_active;

      const matchesPlan =
        planFilter === "ALL" ? true : t.plan_name === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [tenants, searchQuery, statusFilter, planFilter]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / itemsPerPage));

  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTenants.slice(start, start + itemsPerPage);
  }, [filteredTenants, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12 min-w-0 max-w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-primary">Tenants & Workspaces</h1>
          <p className="text-xs text-surface-400 font-semibold mt-1">Manage organizations, seat allocations, and storage quotas across the platform.</p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 font-black text-lg flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">{metrics.total}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Total Workspaces</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-emerald-500 leading-none">{metrics.active}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Active Organizations</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 text-accent font-black text-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">{metrics.totalUsers}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Allocated Seats</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 font-black text-lg flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">{metrics.totalStorage} GB</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Total Storage Used</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-surface-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className={COMPACT_UI.input + " pl-9 w-full"}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">

          {/* Status Buttons */}
          <div className="flex items-center gap-1 bg-surface-100/60 dark:bg-surface-950/60 p-0.5 rounded-lg border border-surface-200/80 dark:border-surface-800">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map(status => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${statusFilter === status
                    ? "bg-accent text-background shadow-xs"
                    : "text-surface-400 hover:text-primary"
                  }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Plan Filter Dropdown */}
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
            className={COMPACT_UI.select}
          >
            <option value="ALL">All Plans</option>
            {planOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

        </div>

      </div>

      {/* Tenants Table */}
      <div className="bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-xl shadow-md overflow-hidden">

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-surface-100/60 dark:bg-surface-800/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : paginatedTenants.length === 0 ? (
          <div className="p-12 text-center text-surface-400 space-y-2">
            <Building2 className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs font-bold">No workspaces found matching your query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200/80 dark:border-surface-800 text-[9px] font-black uppercase tracking-widest text-surface-400 bg-surface-100/40 dark:bg-surface-950/40">
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Subscription Plan</th>
                  <th className="py-3 px-3 text-center">Allocated Seats</th>
                  <th className="py-3 px-3 text-center">Projects</th>
                  <th className="py-3 px-3 text-center">Storage Usage</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/60 dark:divide-surface-800 text-xs font-semibold">
                {paginatedTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-100/50 dark:hover:bg-surface-800/30 transition-colors">

                    {/* Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface-200/50 dark:bg-surface-800 flex items-center justify-center text-primary font-black uppercase shadow-2xs border border-surface-200 dark:border-surface-700 shrink-0">
                          {t.name.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-bold text-primary block truncate max-w-[200px]">{t.name}</span>
                          <span className="text-[10px] text-surface-400 font-medium block truncate">ID: {t.uid}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleStatus(t.id, t.is_active)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border ${t.is_active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
                          }`}
                        title="Click to toggle Active status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {t.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Plan */}
                    <td className="py-3 px-3">
                      <span className="text-accent font-bold block">{t.plan_name}</span>
                      <span className="text-[9px] text-surface-400 font-black uppercase tracking-wider">{t.plan_code}</span>
                    </td>

                    {/* Users / Seats Count */}
                    <td className="py-3 px-3 text-center font-bold text-primary">
                      {t.users_count}
                    </td>

                    {/* Projects Count */}
                    <td className="py-3 px-3 text-center font-bold text-primary">
                      {t.projects_count}
                    </td>

                    {/* Storage */}
                    <td className="py-3 px-3 text-center font-bold text-primary">
                      {t.storage_used_gb} GB
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedTenant(t)}
                        className="px-2.5 py-1 bg-surface-200/70 dark:bg-surface-800 hover:bg-accent hover:text-background text-primary font-black text-[10px] uppercase tracking-wider rounded-md transition-all shadow-2xs flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Activity className="w-3 h-3" />
                        <span>Manage Quotas</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredTenants.length > 0 && (
          <div className="p-3 border-t border-surface-200/80 dark:border-surface-800 bg-surface-100/30 dark:bg-surface-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">

            <div className="flex items-center gap-2 text-surface-400 font-semibold text-[11px]">
              <span>
                Showing <strong className="text-primary">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredTenants.length)}</strong> to{" "}
                <strong className="text-primary">{Math.min(currentPage * itemsPerPage, filteredTenants.length)}</strong> of{" "}
                <strong className="text-primary">{filteredTenants.length}</strong> workspaces
              </span>

              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-[10px] font-bold text-primary cursor-pointer outline-none ml-2"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-surface-200/80 dark:border-surface-800 bg-surface-100/80 dark:bg-surface-800/80 text-surface-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-surface-400">
                Page <strong className="text-primary">{currentPage}</strong> of <strong className="text-primary">{totalPages}</strong>
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-surface-200/80 dark:border-surface-800 bg-surface-100/80 dark:bg-surface-800/80 text-surface-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>

      <TenantDetailDrawer
        tenantId={selectedTenant?.id}
        isOpen={!!selectedTenant}
        onClose={() => { setSelectedTenant(null); loadTenants(); }}
      />

    </div>
  );
}
