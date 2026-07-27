import { NextRequest, NextResponse } from "next/server";
import { ProxyContext } from "./types";
import { handleProxyError } from "./errors";
import { resolveRoute } from "./resolver";
import { validateMethod } from "./validator";
import { buildBackendRequest } from "./request";
import { attachAuth, isTokenExpired, decodeJWT } from "./auth";
import { refreshIfNeeded, refreshAccessToken } from "./refresh";
import { normalizeResponse } from "./response";
import { setAuthCookies, clearAuthCookies } from "./cookies";
import { COOKIE_REFRESH_TOKEN, COOKIE_ACCESS_TOKEN, DJANGO_API_URL } from "./constants";

export async function handleProxy(req: NextRequest, ctx: ProxyContext) {
  try {
    // 1. Resolve Route & Validate Method
    const route = await resolveRoute(req, ctx);
    validateMethod(req, route);
    
    // Removed pure-frontend logout short-circuit to allow token blacklisting

    // 3. Build backend request init (parses body into memory)
    const requestInit = await buildBackendRequest(req);
    
    // Inject refresh token for logout
    if (route.config.cookieStrategy === "clear-auth" && req.cookies.has(COOKIE_REFRESH_TOKEN)) {
      requestInit.body = JSON.stringify({ refresh: req.cookies.get(COOKIE_REFRESH_TOKEN)?.value });
      (requestInit.headers as Headers).set("Content-Type", "application/json");
    }
    
    let rememberMe = false;
    if (req.nextUrl.pathname.endsWith("/auth/login") && typeof requestInit.body === "string") {
      try {
        const bodyData = JSON.parse(requestInit.body);
        if (bodyData.remember_me) rememberMe = true;
      } catch {}
    }
    
    // 4. Pre-emptive Token Refresh (reduces roundtrips from 3 to 2)
    let preNewTokens: Record<string, string> | undefined = undefined;
    let preRefreshFailed = false;

    if (route.config.auth) {
      const accessToken = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
      const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
      
      if ((!accessToken || isTokenExpired(accessToken)) && refreshToken) {
        try {
          const data = await refreshAccessToken(refreshToken);
          if (data?.access) {
            preNewTokens = data as Record<string, string>;
            requestInit.headers = new Headers(requestInit.headers);
            (requestInit.headers as Headers).set("Authorization", `Bearer ${data.access}`);
          } else {
            preRefreshFailed = true;
          }
        } catch {
          preRefreshFailed = true;
        }
      }
    }

    if (preRefreshFailed) {
      const response = NextResponse.json({ detail: "Session expired" }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    if (!preNewTokens) {
      attachAuth(req, route, requestInit.headers as Headers);
    }

    // 5. Forward request helper
    const doFetch = (hdrs: Headers) => fetch(route.targetUrl, { ...requestInit, headers: hdrs });
    const backendRes = await doFetch(requestInit.headers as Headers);

    // 6. Automatic Token Refresh
    const { res: finalRes, newTokens: lazyNewTokens, refreshFailed: lazyRefreshFailed } = await refreshIfNeeded(req, backendRes, doFetch);
    const newTokens = preNewTokens || lazyNewTokens;
    const refreshFailed = preRefreshFailed || lazyRefreshFailed;
    
    // 7. Handle Response based on Content-Type
    const contentType = finalRes.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const currentStatus = finalRes.status;

    let response: NextResponse;
    let responseData: any = null;

    if (isJson) {
      const { data, status } = await normalizeResponse(finalRes);
      responseData = data;
      response = status === 204 
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(data, { status });
    } else if (currentStatus === 204) {
      response = new NextResponse(null, { status: 204 });
    } else {
      // Stream binary data directly (images, pdfs, etc)
      const blob = await finalRes.blob();
      response = new NextResponse(blob, {
        status: currentStatus,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": finalRes.headers.get("cache-control") || "no-store",
        }
      });
    }

    // 8. Handle Cookies based on state
    if (newTokens || (route.config.cookieStrategy === "set-auth" && currentStatus >= 200 && currentStatus < 300)) {
      setAuthCookies(response, newTokens || responseData, rememberMe);
    } else if (refreshFailed && route.config.auth) {
      // If auth route and refresh failed (or no refresh token), user is definitively unauthenticated.
      // Clear cookies to avoid stale states.
      clearAuthCookies(response);
    } else if (route.config.cookieStrategy === "clear-auth") {
      clearAuthCookies(response);
    }

    // Safe standard output logging instead of unbounded file writes
    const token = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    const payload = token ? decodeJWT(token) : null;
    const userEmail = payload ? (payload.email || payload.username || "unknown") : "anonymous";
    const logMsg = `[Proxy] ${new Date().toISOString()} | User: ${userEmail} | ${req.method} ${req.url.split('?')[0]} -> ${route.targetUrl.split('?')[0]} | Status: ${currentStatus}`;
    console.info(logMsg);

    return response;
  } catch (err: any) {
    // Sanitize error logging to avoid leaking request objects or tokens
    console.error(`Proxy Error [${req.method} ${req.url.split('?')[0]}]:`, err?.message || "Unknown error", err?.cause || err);
    const errorResponse = handleProxyError(err);
    // Unconditionally clear cookies if this was a clear-auth route (e.g. logout) that threw an error
    if (req.url.includes("/logout") || req.url.includes("/decommission")) {
      clearAuthCookies(errorResponse);
    }
    return errorResponse;
  }
}
