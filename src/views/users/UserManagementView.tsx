"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AdminUserListItem, usersApi } from "@/domains/users/api";
import { UserActivityDetailDrawer } from "@/components/users/UserActivityDetailDrawer";
import { Search, Users, Shield, Building2, FolderKanban, CheckCircle2, XCircle, Activity, Filter, ChevronLeft, ChevronRight, UserPlus, Key, Mail, User as UserIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { COMPACT_UI } from "@/theme/ui-tokens";

interface RoleOption {
  id: number;
  name: string;
  description?: string;
}

export function UserManagementView() {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const router = useRouter();

  const isSuperAdmin = isAdmin || Boolean((user as any)?.is_superuser) || user?.email === "superadmin@ap.com";

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [tenantFilter, setTenantFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Selected user for drawer
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    password: "Password123!",
    role_name: "material_supplier",
  });

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/unauthorized");
      return;
    }
    if (isSuperAdmin) {
      loadData();
    }
  }, [user, isSuperAdmin, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        usersApi.listUsers(),
        usersApi.listRoles(),
      ]);
      setUsers(usersData || []);
      setRoles(rolesData || []);
    } catch (e) {
      console.error("Failed to load user management data", e);
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

  const handleRoleChange = async (userId: string, newRoleName: string) => {
    setUpdatingRoleId(userId);
    try {
      await usersApi.assignRole(userId, newRoleName);
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRoleName } : u));
      if (selectedUser?.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRoleName } : null);
      }
      toast.success(`Role updated to '${newRoleName}' successfully!`);
    } catch (e) {
      toast.error("Failed to update user role");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserForm.email) {
      toast.error("Email is required");
      return;
    }
    setIsCreating(true);
    try {
      await usersApi.createUser(createUserForm);
      toast.success(`User ${createUserForm.email} created with role ${createUserForm.role_name}!`);
      setShowCreateModal(false);
      setCreateUserForm({ name: "", email: "", password: "Password123!", role_name: "material_supplier" });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const inactive = total - active;
    const tenants = new Set(users.map(u => u.tenant_name).filter(Boolean)).size;
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

  // Unique Roles for Filter Dropdown
  const roleOptionsList = useMemo(() => {
    if (roles.length > 0) return roles.map(r => r.name);
    const set = new Set<string>();
    users.forEach(u => {
      if (u.role) set.add(u.role);
    });
    return Array.from(set);
  }, [roles, users]);

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

      const matchesRole =
        roleFilter === "ALL" ? true : u.role?.toLowerCase() === roleFilter.toLowerCase();

      const matchesTenant =
        tenantFilter === "ALL" ? true : u.tenant_name === tenantFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesRole && matchesTenant;
    });
  }, [users, searchQuery, statusFilter, categoryFilter, roleFilter, tenantFilter]);

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

      {/* Header & Add User Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-lg font-extrabold text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Super Admin — User Directory & Role Management
          </h1>
          <p className="text-xs text-surface-400 font-medium mt-0.5">
            Manage system roles, account active statuses, onboarding states, and organizational access.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-accent hover:bg-accent/90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add New User</span>
        </button>
      </div>

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

          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className={COMPACT_UI.select}
          >
            <option value="ALL">All Roles</option>
            {roleOptionsList.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

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
                  <th className="py-3 px-3">Assign Role</th>
                  <th className="py-3 px-3">Tenant / Organization</th>
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

                    {/* Role Dropdown */}
                    <td className="py-3 px-3">
                      <div className="relative flex items-center gap-1.5">
                        <select
                          value={u.role || "USER"}
                          disabled={updatingRoleId === u.uid}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                          className="px-2 py-1 bg-surface-100 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-lg text-xs font-bold text-accent hover:border-accent transition-colors cursor-pointer outline-none shadow-2xs"
                        >
                          {roleOptionsList.map(rName => (
                            <option key={rName} value={rName}>{rName}</option>
                          ))}
                        </select>
                        {updatingRoleId === u.uid && (
                          <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                        )}
                      </div>
                    </td>

                    {/* Tenant Organization */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-primary block truncate max-w-[180px]">
                        {u.tenant_name || "Independent Account"}
                      </span>
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
                className="p-1 rounded bg-surface-200/50 dark:bg-surface-800 hover:bg-accent hover:text-background disabled:opacity-30 disabled:hover:bg-transparent text-primary transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-[11px] font-bold text-primary px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-surface-200/50 dark:bg-surface-800 hover:bg-accent hover:text-background disabled:opacity-30 disabled:hover:bg-transparent text-primary transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Activity Logs Drawer */}
      {selectedUser && (
        <UserActivityDetailDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusChanged={(userId, newStatus) => {
            setUsers(prev => prev.map(u => u.uid === userId ? { ...u, is_active: newStatus } : u));
            setSelectedUser(prev => prev ? { ...prev, is_active: newStatus } : null);
          }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-800">
              <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-accent" />
                Create New Platform User
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-surface-400 hover:text-primary rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-surface-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={createUserForm.name}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className={COMPACT_UI.input + " pl-9 w-full"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-surface-400" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className={COMPACT_UI.input + " pl-9 w-full"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Password</label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 absolute left-3 top-3 text-surface-400" />
                  <input
                    type="text"
                    required
                    placeholder="Password123!"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className={COMPACT_UI.input + " pl-9 w-full font-mono"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-surface-400 mb-1">Assign Role</label>
                <select
                  value={createUserForm.role_name}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, role_name: e.target.value }))}
                  className={COMPACT_UI.select + " w-full font-bold text-accent"}
                >
                  {roleOptionsList.map(rName => (
                    <option key={rName} value={rName}>{rName}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-surface-200 dark:border-surface-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-surface-200/60 dark:bg-surface-800 hover:bg-surface-300 text-primary font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
