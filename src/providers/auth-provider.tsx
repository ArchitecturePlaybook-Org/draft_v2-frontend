"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * Hydrates the auth store on mount by fetching the current user from /api/v1/auth/me.
 * Wrap around the entire app (in the root layout's client boundary).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const pathname = usePathname();

  useEffect(() => {
    // Middleware handles all route protection and redirects now.
    // We just hydrate the state globally on page load.
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return <>{children}</>;
}
