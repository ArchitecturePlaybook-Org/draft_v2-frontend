import { NextRequest } from "next/server";
import { COOKIE_REFRESH_TOKEN, DJANGO_API_URL } from "./constants";

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

  try {
    const refreshRes = await fetch(`${DJANGO_API_URL}/api/v1/users/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });

    if (!refreshRes.ok) {
      return { res: originalRes, refreshFailed: true };
    }

    const data = await refreshRes.json();
    
    const newHeaders = new Headers(req.headers);
    newHeaders.delete("host");
    newHeaders.delete("content-length");
    newHeaders.set("Authorization", `Bearer ${data.access}`);
    
    const retriedRes = await fetchOriginal(newHeaders);
    
    return { res: retriedRes, newTokens: data };
  } catch {
    return { res: originalRes, refreshFailed: true };
  }
}
