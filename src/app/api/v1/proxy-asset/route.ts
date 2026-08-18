import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let targetUrl = req.nextUrl.searchParams.get("url");

  if (targetUrl) {
    const rawUrl = req.url;
    const match = rawUrl.match(/[?&]url=(.+)$/);
    if (match && match[1]) {
      try {
        targetUrl = decodeURIComponent(match[1]);
      } catch {
        targetUrl = match[1];
      }
    }
  }

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const s3Res = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!s3Res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch asset: ${s3Res.statusText}` },
        { status: s3Res.status }
      );
    }

    const contentType = s3Res.headers.get("content-type") || "application/octet-stream";
    const contentLength = s3Res.headers.get("content-length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    };

    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    // Stream directly using body ReadableStream to avoid buffer memory allocation limits
    return new NextResponse(s3Res.body as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to proxy S3 asset" },
      { status: 500 }
    );
  }
}
