import { useAuthStore } from "@/store/auth-store";

/**
 * Custom hook to check if the current user is an admin.
 * @returns boolean true if user has the admin role
 */
export function useIsAdmin(): boolean {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated || !user) {
    return false;
  }
  
  return user.role?.toUpperCase() === "ADMIN";
}
