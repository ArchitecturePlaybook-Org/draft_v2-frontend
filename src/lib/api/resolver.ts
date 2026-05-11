import { NextRequest } from "next/server";
import { API_ROUTES } from "./mapping";
import { ResolvedRoute, ProxyContext } from "./types";
import { ProxyError } from "./errors";
import { DJANGO_API_URL } from "./constants";

export async function resolveRoute(req: NextRequest, ctx: ProxyContext): Promise<ResolvedRoute> {
  const p = await ctx.params;
  const pathArray = p.path || [];
  const reqPath = pathArray.join("/");
  
  // Sort by length to match specific prefixes first
  const sortedRoutes = [...API_ROUTES].sort((a, b) => b.prefix.length - a.prefix.length);
  
  const matchedRoute = sortedRoutes.find(r => reqPath === r.prefix || reqPath.startsWith(r.prefix + "/"));
  
  if (!matchedRoute) {
    throw new ProxyError("Route not found in API mapping", 404);
  }
  
  const remainingPath = reqPath.slice(matchedRoute.prefix.length).replace(/^\//, "");
  let finalTarget = `${DJANGO_API_URL}${matchedRoute.target}`;
  
  if (remainingPath) {
    finalTarget = finalTarget.endsWith("/") ? finalTarget + remainingPath : finalTarget + "/" + remainingPath;
  }
  
  // Ensure trailing slash if it doesn't have query params or file extension
  if (!finalTarget.endsWith("/") && !finalTarget.includes("?") && !finalTarget.match(/\.[a-zA-Z0-9]+$/)) {
    finalTarget += "/";
  }

  // Preserve query params
  const searchParams = req.nextUrl.searchParams.toString();
  if (searchParams) {
    finalTarget += `?${searchParams}`;
  }
  
  return {
    config: matchedRoute,
    targetUrl: finalTarget,
  };
}
