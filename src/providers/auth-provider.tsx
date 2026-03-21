"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * Hydrates the auth store on mount by fetching the current user from /api/auth/me.
 * Wrap around the entire app (in the root layout's client boundary).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const pathname = usePathname();

  useEffect(() => {
    // Skip fetching user if already on the login page, but clear loading state
    if (pathname === "/login") {
      useAuthStore.getState().setUser(null);
    } else {
      fetchCurrentUser();
    }
  }, [pathname, fetchCurrentUser]);

  return <>{children}</>;
}
