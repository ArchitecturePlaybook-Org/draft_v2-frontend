import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard"];
// Routes that authenticated users should not see
const AUTH_ROUTES = ["/login"];

// Role-based route restrictions
const ROLE_ROUTES: Record<string, string[]> = {
  "/dashboard/admin": ["architect", "co_owner", "admin"],
  "/dashboard/editor": ["architect", "co_owner", "constructor", "admin", "editor"],
  "/dashboard/viewer": ["architect", "co_owner", "constructor", "client", "admin", "editor", "viewer"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  const isAuthenticated = !!accessToken;

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && userRole) {
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
