import { NextRequest } from "next/server";
import { COOKIE_REFRESH_TOKEN, DJANGO_API_URL } from "./constants";

// Promise cache to deduplicate simultaneous token refreshes
let activeRefreshPromise: Promise<Record<string, any> | null> | null = null;

export async function refreshAccessToken(refreshToken: string): Promise<Record<string, any> | null> {
  if (!activeRefreshPromise) {
    activeRefreshPromise = (async () => {
      try {
        const refreshRes = await fetch(`${DJANGO_API_URL}/api/v1/users/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
          cache: "no-store",
        });

        if (!refreshRes.ok) {
          return null;
        }

        const data = await refreshRes.json();
        return data;
      } catch (err) {
        console.error("[Proxy Refresh] Error refreshing token:", err);
        return null;
      } finally {
        activeRefreshPromise = null;
      }
    })();
  }
  return activeRefreshPromise;
}

export async function refreshIfNeeded(
  req: NextRequest, 
  originalRes: Response, 
  fetchOriginal: (headers: Headers) => Promise<Response>
): Promise<{ res: Response; newTokens?: Record<string, string>; refreshFailed?: boolean }> {
  if (originalRes.status !== 401) {
    return { res: originalRes };
  }

  const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
  if (!refreshToken) {
    return { res: originalRes, refreshFailed: true };
  }

  const tokens = await refreshAccessToken(refreshToken);
  if (!tokens || !tokens.access) {
    return { res: originalRes, refreshFailed: true };
  }

  try {
    const newHeaders = new Headers(req.headers);
    newHeaders.delete("host");
    newHeaders.delete("content-length");
    newHeaders.set("Authorization", `Bearer ${tokens.access}`);
    
    const retriedRes = await fetchOriginal(newHeaders);
    
    return { res: retriedRes, newTokens: tokens as Record<string, string> };
  } catch {
    return { res: originalRes, refreshFailed: true };
  }
}
