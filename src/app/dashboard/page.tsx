"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/dashboard/admin",
  architect: "/dashboard/admin",
  editor: "/dashboard/editor",
  viewer: "/dashboard/viewer",
};

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      const destination = user?.role
        ? (ROLE_REDIRECT[user.role] ?? "/dashboard/viewer")
        : "/login";
      router.replace(destination);
    }
  }, [isLoading, user, router]);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", flexDirection: "column", gap: "1rem",
    }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: ".9rem" }}>
        Redirecting to your dashboard…
      </p>
    </div>
  );
}
