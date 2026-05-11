import { NextRequest } from "next/server";
import { ResolvedRoute } from "./types";
import { COOKIE_ACCESS_TOKEN } from "./constants";

export function attachAuth(req: NextRequest, route: ResolvedRoute, headers: Headers) {
  if (route.config.auth) {
    const accessToken = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }
}
