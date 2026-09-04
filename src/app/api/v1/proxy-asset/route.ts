import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function signS3Url(rawUrl: string): string {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_S3_REGION_NAME || "ap-south-1";

  if (!accessKey || !secretKey || !rawUrl.includes(".amazonaws.com")) {
    return rawUrl;
  }

  try {
    const urlObj = new URL(rawUrl);

    // If already has query string signature, return as is
    if (urlObj.searchParams.has("X-Amz-Signature") || urlObj.searchParams.has("AWSAccessKeyId")) {
      return rawUrl;
    }

    const host = urlObj.host;
    const path = urlObj.pathname;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, ""); // YYYYMMDDTHHMMSSZ
    const datestamp = amzDate.substring(0, 8); // YYYYMMDD

    const service = "s3";
    const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;

    const queryParams: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${accessKey}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": "3600",
      "X-Amz-SignedHeaders": "host",
    };

    const sortedQuery = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join("&");

    const canonicalRequest = [
      "GET",
      path,
      sortedQuery,
      `host:${host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const hash = (data: string) => crypto.createHash("sha256").update(data).digest("hex");
    const hmac = (key: Buffer | string, data: string) => crypto.createHmac("sha256", key).update(data).digest();

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      hash(canonicalRequest),
    ].join("\n");

    const kDate = hmac(`AWS4${secretKey}`, datestamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, "aws4_request");
    const signature = hmac(kSigning, stringToSign).toString("hex");

    return `${urlObj.origin}${path}?${sortedQuery}&X-Amz-Signature=${signature}`;
  } catch {
    return rawUrl;
  }
}

export async function GET(req: NextRequest) {
  let targetUrl = req.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    if (targetUrl.includes("%3A") || targetUrl.includes("%2F")) {
      targetUrl = decodeURIComponent(targetUrl);
    }
  } catch {
    // ignore decoding errors
  }

  try {
    const signedUrl = signS3Url(targetUrl);
    const s3Res = await fetch(signedUrl, {
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

    const requestOrigin = req.headers.get("origin") || "*";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Credentials": "true",
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
