"use client";

import { useAuthStore } from "@/store/auth-store";

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-(--gray-400) text-sm">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome to your Dashboard</h1>
        <p className="text-(--gray-600)">You are currently logged in.</p>
      </div>

      <div className="glass-card p-6 border-(--surface-300)! max-w-2xl">
        <h2 className="text-xl font-semibold mb-6 text-foreground">Session Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-(--gray-400)">Name</span>
            <span className="text-lg font-semibold text-foreground">{user?.name || "N/A"}</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-(--gray-400)">Email</span>
            <span className="text-lg font-semibold text-foreground">{user?.email || "N/A"}</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-(--gray-400)">Role</span>
            <span className="text-lg font-semibold text-foreground capitalize">
              {user?.role ? user.role.replace("_", " ") : "N/A"}
            </span>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-(--gray-400)">Status</span>
            <span className="text-lg font-semibold text-foreground">
              {user?.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
