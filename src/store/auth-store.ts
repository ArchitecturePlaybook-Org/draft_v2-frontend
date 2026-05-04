"use client";

import { create } from "zustand";
import { User } from "@/types/auth";
import { apiClient } from "@/lib/api-client";

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await apiClient.login(email, password) as { user: User };
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return data.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.logout();
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
      const user = await apiClient.me() as User;
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
