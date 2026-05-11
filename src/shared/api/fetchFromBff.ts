/**
 * A proxy-facing HTTP client using native fetch.
 * This client NEVER talks to Django directly.
 * It ALWAYS talks to the Next.js Proxy at /api/...
 */

export interface BffOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

export async function fetchFromBff<T>(url: string, options: BffOptions = {}): Promise<T> {
  const isServer = typeof window === "undefined";
  const baseURL = isServer ? (process.env.NEXTAUTH_URL || "http://localhost:3000") : "";
  
  // Ensure url starts with /
  const path = url.startsWith("/") ? url : `/${url}`;
  const fullUrl = `${baseURL}${path}`;

  const res = await fetch(fullUrl, {
    ...options,
    credentials: "include", // Essential for sending HttpOnly cookies to the BFF
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = "Request failed";
    let backendData = {};
    try {
      backendData = await res.json();
      const bd = backendData as Record<string, unknown>;
      errorDetail = (bd.detail as string) || (bd.message as string) || errorDetail;
    } catch {
      // ignore
    }
    
    // Auto logout logic
    // The proxy clears cookies on hard refresh failure.
    // So if it's 401 here, we know it's a hard 401.
    if (res.status === 401 && !options.skipAuth && !url.includes("auth/login")) {
      if (!isServer) {
        window.location.href = "/login"; // Force client-side redirect
      }
    }

    const error = new Error(errorDetail) as ApiError;
    error.status = res.status;
    error.data = backendData;
    throw error;
  }

  // Handle empty responses
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    return {} as T;
  }
}
