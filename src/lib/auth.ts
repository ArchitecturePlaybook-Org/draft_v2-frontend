import { cookies } from "next/headers";
import { User } from "@/types/auth";

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://localhost:8000";

/**
 * Decode a JWT payload without verifying the signature.
 * We only use this server-side for fast cookie reads; actual validation
 * is done by the Django backend on every proxied API call.
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Check if an access token is expired (with a 30-second buffer).
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() / 1000 > payload.exp - 30;
}

/**
 * Get the current user from HTTP-only cookies (server component helper).
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${DJANGO_API_URL}/api/users/profile/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Make an authenticated server-side request to Django.
 */
export async function djangoFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  return fetch(`${DJANGO_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
}
