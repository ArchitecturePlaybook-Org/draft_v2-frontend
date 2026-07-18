"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, LoginResponse } from "@/types/auth";
import { authApi } from "@/domains/auth/api";

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResponse>;
  verify2FA: (token: string, code: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),

      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login(email, password, rememberMe);
          if (data.requires_2fa) {
            set({ isLoading: false });
            return data;
          }
          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return data;
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      verify2FA: async (token, code) => {
        set({ isLoading: true });
        try {
          const data = await authApi.verify2FA(token, code);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return data;
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false });
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      },

      fetchCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
