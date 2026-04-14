/**
 * Client-side API client for BFF routes.
 * All requests go through /api/* Next.js routes (which proxy to Django).
 */

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

async function fetchWithRefresh(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // If 401 and not already a refresh call, try refreshing the token
  if (res.status === 401 && !options.skipAuth && !url.includes("/api/auth/refresh")) {
    const refreshRes = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      // Retry original request
      return fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    }

    // Refresh failed
    return refreshRes;
  }

  return res;
}

export const apiClient = {
  async login(email: string, password: string) {
    const res = await fetchWithRefresh("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Login failed");
    }
    return res.json();
  },

  async logout() {
    await fetchWithRefresh("/api/auth/logout", { method: "POST" });
  },

  async me() {
    const res = await fetchWithRefresh("/api/auth/me");
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  async register(data: any) {
    const res = await fetchWithRefresh("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Registration failed");
    }
    return res.json();
  },

  async updateProfile(data: any) {
    const res = await fetchWithRefresh("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return res.json();
  },

  // Organizations
  async createOrg(data: any) {
    const res = await fetchWithRefresh("/api/orgs", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create organization");
    return res.json();
  },

  async listOrgs() {
    const res = await fetchWithRefresh("/api/orgs");
    if (!res.ok) throw new Error("Failed to fetch organizations");
    return res.json();
  },

  async sendInvitation(orgId: number, data: any) {
    const res = await fetchWithRefresh(`/api/orgs/${orgId}/invite`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to send invitation");
    return res.json();
  },

  async acceptInvitation(token: string) {
    const res = await fetchWithRefresh(`/api/orgs/invite/accept/${token}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to accept invitation");
    return res.json();
  },
};
