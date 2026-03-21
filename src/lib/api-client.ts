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
};
