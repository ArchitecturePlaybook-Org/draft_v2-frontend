import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { LoginResponse, User } from "@/types/auth";

export const authApi = {
  login: async (email: string, password: string, remember_me: boolean = false) => {
    return fetchFromBff<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember_me }),
      skipAuth: true,
    });
  },

  verify2FA: async (pre_auth_token: string, code: string) => {
    return fetchFromBff<LoginResponse>("/api/v1/auth/login/2fa", {
      method: "POST",
      body: JSON.stringify({ pre_auth_token, code }),
      skipAuth: true,
    });
  },

  setup2FA: async () => {
    return fetchFromBff<{secret: string; qr_uri: string}>("/api/v1/auth/2fa/setup", {
      method: "POST"
    });
  },

  confirm2FA: async (code: string) => {
    return fetchFromBff<{detail: string; recovery_codes: string[]}>("/api/v1/auth/2fa/confirm", {
      method: "POST",
      body: JSON.stringify({ code })
    });
  },

  disable2FA: async (password: string) => {
    return fetchFromBff<{detail: string}>("/api/v1/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ password })
    });
  },

  logout: async () => {
    return fetchFromBff<void>("/api/v1/auth/logout", { method: "POST" });
  },

  exportUserData: async () => {
    // Returns JSON payload
    return fetchFromBff<Record<string, any>>("/api/v1/auth/export-data", { method: "GET" });
  },

  decommissionIdentity: async (password: string) => {
    return fetchFromBff<{detail: string}>("/api/v1/auth/decommission", { 
      method: "POST",
      body: JSON.stringify({ password })
    });
  },

  me: async () => {
    return fetchFromBff<User>("/api/v1/auth/me", { method: "GET", skipAuth: true });
  },

  register: async (data: Record<string, unknown>) => {
    return fetchFromBff<LoginResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
  },

    getSpecializations: async () => {
    return fetchFromBff<any[]>("/api/v1/auth/specializations/", { method: "GET" });
  },

  createSpecialization: async (name: string, category_id?: number, slug?: string) => {
    return fetchFromBff<any>("/api/v1/auth/specializations/", {
      method: "POST",
      body: JSON.stringify({ name, category_id, slug }),
    });
  },

  deleteSpecialization: async (id: number) => {
    return fetchFromBff<any>(`/api/v1/auth/specializations/${id}/`, {
      method: "DELETE",
    });
  },

  getCategories: async () => {
    return fetchFromBff<any[]>("/api/v1/auth/categories/", { method: "GET" });
  },

  createCategory: async (name: string, description?: string, slug?: string) => {
    return fetchFromBff<any>("/api/v1/auth/categories/", {
      method: "POST",
      body: JSON.stringify({ name, description, slug }),
    });
  },

  deleteCategory: async (id: number) => {
    return fetchFromBff<any>(`/api/v1/auth/categories/${id}/`, {
      method: "DELETE",
    });
  },

  updateProfile: async (data: any) => {
    return fetchFromBff<User>("/api/v1/auth/profile", {
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("profile_picture", file);
    return fetchFromBff<User>("/api/v1/auth/profile", {
      method: "PATCH",
      body: formData,
    });
  },

  verifyEmail: async (uid: string, token: string) => {
    return fetchFromBff<{detail: string}>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ uid, token }),
      skipAuth: true,
    });
  },

  resendVerificationEmail: async (email: string) => {
    return fetchFromBff<{detail: string}>("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  requestPasswordReset: async (email: string) => {
    return fetchFromBff<{detail: string}>("/api/v1/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  confirmPasswordReset: async (data: Record<string, string>) => {
    return fetchFromBff<{detail: string}>("/api/v1/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
  },

  requestMagicLink: async (email: string) => {
    return fetchFromBff<{detail: string}>("/api/v1/auth/magic-link/request", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  verifyMagicLink: async (token: string) => {
    return fetchFromBff<LoginResponse>("/api/v1/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
      skipAuth: true,
    });
  },

  changePassword: async (data: Record<string, string>) => {
    return fetchFromBff<{detail: string}>("/api/v1/users/profile/change-password/", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  requestEmailChange: async (data: Record<string, string>) => {
    return fetchFromBff<{detail: string}>("/api/v1/users/profile/change-email/request/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  confirmEmailChange: async (data: Record<string, string>) => {
    return fetchFromBff<{detail: string}>("/api/v1/users/profile/change-email/confirm/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getActiveSessions: async () => {
    return fetchFromBff<any[]>("/api/v1/users/auth/sessions/", {
      method: "GET",
    });
  },

  revokeSession: async (token_id: number) => {
    return fetchFromBff<{detail: string}>("/api/v1/users/auth/sessions/revoke/", {
      method: "POST",
      body: JSON.stringify({ token_id }),
    });
  },
};
