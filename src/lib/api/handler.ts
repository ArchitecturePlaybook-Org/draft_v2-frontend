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
    
    // 7. Normalize final response
    const { data, status } = await normalizeResponse(finalRes);
    const response = NextResponse.json(data, { status });

    // 8. Handle Cookies based on state
    if (newTokens || (route.config.cookieStrategy === "set-auth" && status >= 200 && status < 300)) {
      setAuthCookies(response, newTokens || data);
    } else if (refreshFailed && route.config.auth) {
      // If auth route and refresh failed (or no refresh token), user is definitively unauthenticated.
      // Clear cookies to avoid stale states.
      clearAuthCookies(response);
    }

    return response;
  } catch (err) {
    return handleProxyError(err);
  }
}
