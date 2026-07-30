import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url");

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
    const blob = await s3Res.blob();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to proxy S3 asset" },
      { status: 500 }
    );
  }
}
