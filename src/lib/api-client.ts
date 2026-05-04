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

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : {} as T;
  } catch {
    return {} as T;
  }
}

export const apiClient = {
  async login(email: string, password: string) {
    const res = await fetchWithRefresh("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (!res.ok) {
      const err = await safeJson<Record<string, string>>(res);
      throw new Error(err.detail || err.message || "Login failed");
    }
    return safeJson(res);
  },

  async logout() {
    await fetchWithRefresh("/api/auth/logout", { method: "POST" });
  },

  async me() {
    const res = await fetchWithRefresh("/api/auth/me");
    if (!res.ok) throw new Error("Failed to fetch user");
    return safeJson(res);
  },

  // Generic methods
  async get<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const res = await fetchWithRefresh(url, { ...options, method: "GET" });
    if (!res.ok) {
      const err = await safeJson<Record<string, string>>(res);
      throw new Error(err.detail || err.message || "Request failed");
    }
    return safeJson<T>(res);
  },

  async post<T>(url: string, body: unknown, options: FetchOptions = {}): Promise<T> {
    const res = await fetchWithRefresh(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await safeJson<Record<string, string>>(res);
      throw new Error(err.detail || err.message || "Request failed");
    }
    return safeJson<T>(res);
  },

  async patch<T>(url: string, body: unknown, options: FetchOptions = {}): Promise<T> {
    const res = await fetchWithRefresh(url, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await safeJson<Record<string, string>>(res);
      throw new Error(err.detail || err.message || "Request failed");
    }
    return safeJson<T>(res);
  },

  async delete(url: string, options: FetchOptions = {}): Promise<void> {
    const res = await fetchWithRefresh(url, { ...options, method: "DELETE" });
    if (!res.ok) {
      const err = await safeJson<Record<string, string>>(res);
      throw new Error(err.detail || err.message || "Request failed");
    }
  },
};
