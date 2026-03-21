import { NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
  }

  try {
    const djangoRes = await fetch(`${DJANGO_API_URL}/api/users/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
      // Refresh token is invalid – clear all auth cookies
      const response = NextResponse.json({ detail: "Session expired" }, { status: 401 });
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      response.cookies.delete("user_role");
      return response;
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("access_token", data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
