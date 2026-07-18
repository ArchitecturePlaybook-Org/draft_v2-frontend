import { NextRequest } from "next/server";
import { ResolvedRoute } from "./types";
import { COOKIE_ACCESS_TOKEN } from "./constants";

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

export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() / 1000 > (payload.exp as number) - 30; // 30 second buffer
}

export function attachAuth(req: NextRequest, route: ResolvedRoute, headers: Headers) {
  if (route.config.auth) {
    const accessToken = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }
}
