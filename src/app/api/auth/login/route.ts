import { NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const djangoRes = await fetch(`${DJANGO_API_URL}/api/users/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
      return NextResponse.json(data, { status: djangoRes.status });
    }

    // Set HTTP-only cookies for tokens
    const response = NextResponse.json({ user: data.user });

    response.cookies.set("access_token", data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5, // 5 minutes (matches Django default)
      path: "/",
    });

    response.cookies.set("refresh_token", data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Also store user role in a readable cookie for middleware
    if (data.user?.role) {
      response.cookies.set("user_role", data.user.role, {
        httpOnly: false, // readable by middleware
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
