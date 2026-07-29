/**
 * A proxy-facing HTTP client using native fetch.
 * This client NEVER talks to Django directly.
 * It ALWAYS talks to the Next.js Proxy at /api/...
 */

import { db, flushSyncQueue } from '../offline/db';

export interface BffOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
  url?: string;
}

async function serializeRequestBody(body: unknown): Promise<unknown> {
  if (typeof window !== "undefined" && body instanceof FormData) {
    const entries: Array<{
      key: string;
      value: string | { _isFile: boolean; name: string; type: string; data: string };
    }> = [];
    for (const [key, value] of Array.from(body.entries())) {
      if (value instanceof File) {
        const fileData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(value);
        });
        entries.push({
          key,
          value: {
            _isFile: true,
            name: value.name,
            type: value.type,
            data: fileData,
          },
        });
      } else {
        entries.push({ key, value: String(value) });
      }
    }
    return { _isFormData: true, entries };
  }
  return body;
}

export async function fetchFromBff<T>(url: string, options: BffOptions = {}): Promise<T> {
  const isServer = typeof window === "undefined";
  const baseURL = isServer ? (process.env.NEXTAUTH_URL || "http://localhost:3000") : "";
  
  // Ensure url starts with /
  const path = url.startsWith("/") ? url : `/${url}`;
  const fullUrl = `${baseURL}${path}`;
  const method = options.method || "GET";

  const finalOptions: RequestInit = {
    method,
    cache: "no-store",
    ...options,
    credentials: "include", // Essential for sending HttpOnly cookies to the BFF
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  };

  // Offline support
  if (!isServer && !window.navigator.onLine) {
    if (method !== 'GET') {
      // Queue mutation
      const serializedBody = await serializeRequestBody(finalOptions.body);
      await db.syncQueue.add({
        url: fullUrl,
        method: method,
        body: serializedBody,
        headers: finalOptions.headers,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'PENDING'
      });
      console.warn(`[Offline] Queued ${method} request to ${fullUrl}`);
      return { _queued: true } as unknown as T;
    } else {
      // Try to serve from cache for GET
      const cached = await db.apiCache.get(fullUrl);
      if (cached) {
        console.warn(`[Offline] Serving ${fullUrl} from cache`);
        return cached.data as T;
      } else {
        throw new Error("You are offline and no cached data is available for this request.");
      }
    }
  }

  // Attempt the real fetch if online
  let res: Response;
  try {
    res = await fetch(fullUrl, finalOptions);
  } catch (err) {
    if (!isServer && method !== 'GET') {
      // If network fails unexpectedly while supposedly online, queue it
      const serializedBody = await serializeRequestBody(finalOptions.body);
      await db.syncQueue.add({
        url: fullUrl,
        method: method,
        body: serializedBody,
        headers: finalOptions.headers,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'PENDING'
      });
      return { _queued: true } as unknown as T;
    }
    throw err;
  }

  if (!res.ok) {
    let errorDetail = "Request failed";
    let backendData = {};
    try {
      backendData = await res.json();
      const bd = backendData as Record<string, unknown>;
      
      if (bd.detail || bd.message) {
        errorDetail = (bd.detail as string) || (bd.message as string);
      } else {
        errorDetail = Object.entries(bd)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join(" | ");
      }
    } catch {
      // ignore
    }
    
    if (res.status === 401 && !options.skipAuth && !url.includes("auth/login")) {
      if (!isServer) {
        window.location.href = "/login";
      }
    }

    const cleanMessage = errorDetail.replace(/^\[.*?\]\s*/, "");
    const error = new Error(cleanMessage) as ApiError;
    error.status = res.status;
    error.data = backendData;
    error.url = url;
    throw error;
  }

  // Handle successful response
  const text = await res.text().catch(() => "");
  try {
    const data = text ? JSON.parse(text) : ({} as T);
    // Cache successful GET responses
    if (!isServer && method === 'GET') {
      db.apiCache.put({
        url: fullUrl,
        data,
        updatedAt: Date.now()
      }).catch(e => console.warn("Failed to cache response:", e));
    }
    return data;
  } catch {
    return {} as T;
  }
}
