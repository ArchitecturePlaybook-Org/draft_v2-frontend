import { NextResponse } from "next/server";
import { 
  COOKIE_ACCESS_TOKEN, 
  COOKIE_REFRESH_TOKEN, 
  COOKIE_USER_ROLE, 
  ACCESS_TOKEN_MAX_AGE, 
  REFRESH_TOKEN_MAX_AGE,
  REMEMBER_ME_MAX_AGE
} from "./constants";

export interface TokenData {
  access?: string;
  refresh?: string;
  user?: { role?: string };
}

export function setAuthCookies(response: NextResponse, data: TokenData, rememberMe?: boolean) {
  const isProd = process.env.NODE_ENV === "production";
  
  const refreshMaxAge = rememberMe ? REMEMBER_ME_MAX_AGE : undefined;
  
  if (data.access) {
    response.cookies.set(COOKIE_ACCESS_TOKEN, data.access, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: "/",
    });
  }

  if (data.refresh) {
    const opts: any = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    };
    if (refreshMaxAge) opts.maxAge = refreshMaxAge;
    
    response.cookies.set(COOKIE_REFRESH_TOKEN, data.refresh, opts);
  }

  if (data.user?.role) {
    const opts: any = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    };
    if (refreshMaxAge) opts.maxAge = refreshMaxAge;
    
    response.cookies.set(COOKIE_USER_ROLE, data.user.role, opts);
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(COOKIE_ACCESS_TOKEN);
  response.cookies.delete(COOKIE_REFRESH_TOKEN);
  response.cookies.delete(COOKIE_USER_ROLE);
}
