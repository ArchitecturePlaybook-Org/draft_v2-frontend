import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { LoginResponse, User } from "@/types/auth";

export const authApi = {
  login: async (email: string, password: string) => {
    return fetchFromBff<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  },

  logout: async () => {
    return fetchFromBff<void>("/api/auth/logout", { method: "POST" });
  },

  me: async () => {
    return fetchFromBff<User>("/api/auth/me", { method: "GET", skipAuth: true });
  },

  register: async (data: Record<string, unknown>) => {
    return fetchFromBff<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
  },

  updateProfile: async (data: any) => {
    return fetchFromBff<User>("/api/auth/profile", {
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("profile_picture", file);
    return fetchFromBff<User>("/api/auth/profile", {
      method: "PATCH",
      body: formData,
    });
  },

  verifyEmail: async (uid: string, token: string) => {
    return fetchFromBff<{detail: string}>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ uid, token }),
      skipAuth: true,
    });
  },

  requestPasswordReset: async (email: string) => {
    return fetchFromBff<{detail: string}>("/api/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  confirmPasswordReset: async (data: Record<string, string>) => {
    return fetchFromBff<{detail: string}>("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
  },
};
