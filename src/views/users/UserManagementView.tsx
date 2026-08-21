"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AdminUserListItem, usersApi } from "@/domains/users/api";
import { UserActivityDetailDrawer } from "@/components/users/UserActivityDetailDrawer";
import { Search, Users, Shield, Building2, FolderKanban, CheckCircle2, XCircle, Activity, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { COMPACT_UI } from "@/theme/ui-tokens";

export function UserManagementView() {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const router = useRouter();

  const isSuperAdmin = isAdmin || Boolean((user as any)?.is_superuser) || user?.email === "superadmin@ap.com";

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [tenantFilter, setTenantFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Selected user for drawer
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/unauthorized");
      return;
    }
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [user, isSuperAdmin, router]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await usersApi.listUsers();
      setUsers(data || []);
    } catch (e) {
      console.error("Failed to load users list", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await usersApi.toggleUserActiveStatus(userId, nextStatus);
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, is_active: nextStatus } : u));
      if (selectedUser?.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, is_active: nextStatus } : null);
      }
      toast.success(`User account status updated to ${nextStatus ? "Active" : "Inactive"}`);
    } catch (e) {
      toast.error("Failed to update user account status");
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const inactive = total - active;
    
    // Unique tenants
    const tenants = new Set(users.map(u => u.tenant_name).filter(Boolean)).size;
    
    // Aggregate total system projects
    const totalProjects = users.reduce((acc, u) => acc + (u.projects_count || 0), 0);

    return { total, active, inactive, tenants, totalProjects };
  }, [users]);

  // Unique Tenant List for Filter Dropdown
  const tenantOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.tenant_name) set.add(u.tenant_name);
    });
    return Array.from(set);
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.tenant_name && u.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? u.is_active : !u.is_active;

      const matchesCategory =
        categoryFilter === "ALL" ? true : u.category?.toLowerCase() === categoryFilter.toLowerCase();

      const matchesTenant =
        tenantFilter === "ALL" ? true : u.tenant_name === tenantFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesTenant;
    });
  }, [users, searchQuery, statusFilter, categoryFilter, tenantFilter]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12 min-w-0 max-w-full">

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 text-accent font-black text-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">{metrics.total}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Total Platform Users</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-emerald-500 leading-none">{metrics.active}</span>
              <span className="text-xs text-surface-400 font-bold">/ {metrics.inactive} inactive</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Active Accounts</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 font-black text-lg flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">{metrics.tenants}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Tenant Organizations</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 font-black text-lg flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black text-primary block leading-none">{metrics.totalProjects}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 mt-1 block">Total System Projects</span>
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
            placeholder="Search name, email, or tenant..."
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
                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === status
                    ? "bg-accent text-background shadow-xs"
                    : "text-surface-400 hover:text-primary"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Tenant Filter Dropdown */}
          <select
            value={tenantFilter}
            onChange={(e) => { setTenantFilter(e.target.value); setCurrentPage(1); }}
            className={COMPACT_UI.select}
          >
            <option value="ALL">All Tenants ({tenantOptions.length})</option>
            {tenantOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Category Filter Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className={COMPACT_UI.select}
          >
            <option value="ALL">All Categories</option>
            <option value="Architect">Architects</option>
            <option value="Contractor">Contractors</option>
            <option value="Supplier">Suppliers</option>
            <option value="Interior Designer">Interior Designers</option>
          </select>

        </div>

      </div>

      {/* Users Table */}
      <div className="bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 rounded-xl shadow-md overflow-hidden">
        
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-surface-100/60 dark:bg-surface-800/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-12 text-center text-surface-400 space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs font-bold">No user accounts found matching your query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200/80 dark:border-surface-800 text-[9px] font-black uppercase tracking-widest text-surface-400 bg-surface-100/40 dark:bg-surface-950/40">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Tenant / Organization</th>
                  <th className="py-3 px-3">Category & Role</th>
                  <th className="py-3 px-3 text-center">Projects</th>
                  <th className="py-3 px-3 text-center">Contributions</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/60 dark:divide-surface-800 text-xs font-semibold">
                {paginatedUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-surface-100/50 dark:hover:bg-surface-800/30 transition-colors">
                    
                    {/* User Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                          alt={u.name}
                          className="w-8 h-8 rounded-lg object-cover border border-surface-200 dark:border-surface-700 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-primary block truncate max-w-[180px]">{u.name}</span>
                          <span className="text-[10px] text-surface-400 font-medium block truncate max-w-[180px]">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge & Toggle */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleStatus(u.uid, u.is_active)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border ${
                          u.is_active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
                        }`}
                        title="Click to toggle Active status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Tenant Organization */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-primary block truncate max-w-[180px]">
                        {u.tenant_name || "Independent Account"}
                      </span>
                    </td>

                    {/* Category & Role */}
                    <td className="py-3 px-3">
                      <span className="text-accent font-bold block">{u.category || "Professional"}</span>
                      <span className="text-[9px] text-surface-400 font-black uppercase tracking-wider">{u.role}</span>
                    </td>

                    {/* Projects Count */}
                    <td className="py-3 px-3 text-center font-bold text-primary">
                      {u.projects_count}
                    </td>

                    {/* Contributions Count */}
                    <td className="py-3 px-3 text-center font-bold text-emerald-500">
                      {u.contributions_count}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-2.5 py-1 bg-surface-200/70 dark:bg-surface-800 hover:bg-accent hover:text-background text-primary font-black text-[10px] uppercase tracking-wider rounded-md transition-all shadow-2xs flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Activity className="w-3 h-3" />
                        <span>Audit Log</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredUsers.length > 0 && (
          <div className="p-3 border-t border-surface-200/80 dark:border-surface-800 bg-surface-100/30 dark:bg-surface-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            
            <div className="flex items-center gap-2 text-surface-400 font-semibold text-[11px]">
              <span>
                Showing <strong className="text-primary">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)}</strong> to{" "}
                <strong className="text-primary">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</strong> of{" "}
                <strong className="text-primary">{filteredUsers.length}</strong> users
              </span>

              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded text-[10px] font-bold text-primary cursor-pointer outline-none ml-2"
              >
                <option value={8}>8 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-surface-200/80 dark:border-surface-800 bg-surface-100/80 dark:bg-surface-800/80 text-surface-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Page"
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
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Slide-over User Activity & Tenant Drawer */}
      <UserActivityDetailDrawer
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onStatusChanged={handleToggleStatus}
      />

    </div>
  );
}
