import { NextRequest, NextResponse } from "next/server";
import { ProxyContext } from "./types";
import { handleProxyError } from "./errors";
import { resolveRoute } from "./resolver";
import { validateMethod } from "./validator";
import { buildBackendRequest } from "./request";
import { attachAuth } from "./auth";
import { refreshIfNeeded } from "./refresh";
import { normalizeResponse } from "./response";
import { setAuthCookies, clearAuthCookies } from "./cookies";

export async function handleProxy(req: NextRequest, ctx: ProxyContext) {
  try {
    // 1. Resolve Route & Validate Method
    const route = await resolveRoute(req, ctx);
    validateMethod(req, route);
    
    // 2. Handle pure-frontend actions (logout)
    if (route.config.cookieStrategy === "clear-auth") {
      const response = NextResponse.json({ ok: true });
      clearAuthCookies(response);
      return response;
    }

    // 3. Build backend request init (parses body into memory)
    const requestInit = await buildBackendRequest(req);
    
    // 4. Attach base authorization
    attachAuth(req, route, requestInit.headers as Headers);

    // 5. Forward request helper
    const doFetch = (hdrs: Headers) => fetch(route.targetUrl, { ...requestInit, headers: hdrs });
    let backendRes = await doFetch(requestInit.headers as Headers);

    // 6. Automatic Token Refresh
    const { res: finalRes, newTokens, refreshFailed } = await refreshIfNeeded(req, backendRes, doFetch);
    
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
      setAuthCookies(response, newTokens || responseData);
    } else if (refreshFailed && route.config.auth) {
      // If auth route and refresh failed (or no refresh token), user is definitively unauthenticated.
      // Clear cookies to avoid stale states.
      clearAuthCookies(response);
    }

    // Logging to a file for persistence in this environment
    const logMsg = `[Proxy] ${new Date().toISOString()} | ${req.method} ${req.url} -> ${route.targetUrl} | Status: ${currentStatus}\n`;
    try {
      require('fs').appendFileSync('proxy.log', logMsg);
    } catch (e) {
      console.log(logMsg);
    }
    return response;
  } catch (err: any) {
    console.error(`Proxy Error [${req.method} ${req.url}]:`, err);
    return handleProxyError(err);
  }
}
