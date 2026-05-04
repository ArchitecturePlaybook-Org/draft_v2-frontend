import { NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://localhost:8000";

async function proxyRequest(request: NextRequest, path: string[]) {
  const accessToken = request.cookies.get("access_token")?.value;
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  
  const targetUrl = `${DJANGO_API_URL}/api/projects/${path.join("/")}/${queryString ? "?" + queryString : ""}`;

  const headers = new Headers(request.headers);
  headers.delete("host"); // Let fetch handle Host header
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const method = request.method;
  const body = ["POST", "PUT", "PATCH"].includes(method) 
    ? await request.text() 
    : undefined;

  try {
    const res = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    let data = {};
    try {
      if (text) data = JSON.parse(text);
    } catch {
      // Not JSON or empty
    }
    
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`Proxy error for ${targetUrl}:`, err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const p = await params;
  return proxyRequest(request, p.path || []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const p = await params;
  return proxyRequest(request, p.path || []);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const p = await params;
  return proxyRequest(request, p.path || []);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const p = await params;
  return proxyRequest(request, p.path || []);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const p = await params;
  return proxyRequest(request, p.path || []);
}
