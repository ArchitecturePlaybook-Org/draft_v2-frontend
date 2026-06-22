import { NextRequest, NextResponse } from "next/server";
import { COOKIE_ACCESS_TOKEN } from "@/lib/api/constants";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ token });
}
