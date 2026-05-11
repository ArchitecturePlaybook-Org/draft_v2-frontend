import { NextResponse } from "next/server";
import { 
  COOKIE_ACCESS_TOKEN, 
  COOKIE_REFRESH_TOKEN, 
  COOKIE_USER_ROLE, 
  ACCESS_TOKEN_MAX_AGE, 
  REFRESH_TOKEN_MAX_AGE 
} from "./constants";

export interface TokenData {
  access?: string;
  refresh?: string;
  user?: { role?: string };
}

export function setAuthCookies(response: NextResponse, data: TokenData) {
  const isProd = process.env.NODE_ENV === "production";
  
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
    response.cookies.set(COOKIE_REFRESH_TOKEN, data.refresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: "/",
    });
  }

  if (data.user?.role) {
    response.cookies.set(COOKIE_USER_ROLE, data.user.role, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: "/",
    });
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(COOKIE_ACCESS_TOKEN);
  response.cookies.delete(COOKIE_REFRESH_TOKEN);
  response.cookies.delete(COOKIE_USER_ROLE);
}
