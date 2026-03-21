import { NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  try {
    const res = await fetch(`${DJANGO_API_URL}/api/users/profile/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const user = await res.json();
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
