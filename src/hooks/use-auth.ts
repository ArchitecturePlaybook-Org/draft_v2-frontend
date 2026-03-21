"use client";

import { useAuthStore } from "@/store/auth-store";
import { User } from "@/types/auth";

/**
 * Custom hook to access auth state and actions.
 */
export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    fetchCurrentUser
  } = useAuthStore();

  return {
    user: user as User | null,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser: fetchCurrentUser,
  };
}
