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

    if (urlObj.searchParams.has("X-Amz-Signature") || urlObj.searchParams.has("AWSAccessKeyId")) {
      return rawUrl;
    }

    const host = urlObj.host;
    const path = urlObj.pathname;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
    const datestamp = amzDate.substring(0, 8);

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const rawPath = req.nextUrl.pathname;
  const objectKey = decodeURIComponent(rawPath.replace(/^\/s3-assets\//, ""));

  if (!objectKey) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const bucketName = process.env.AWS_STORAGE_BUCKET_NAME || "playbook-production-bucket";
  const region = process.env.AWS_S3_REGION_NAME || "ap-south-1";
  const cfDomain = process.env.AWS_CLOUDFRONT_DOMAIN || process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

  // Use CloudFront Edge URL if configured, otherwise default to S3 endpoint
  const s3TargetUrl = cfDomain
    ? `https://${cfDomain.replace(/^https?:\/\//, "")}/${objectKey}`
    : `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;

  try {
    const fetchUrl = cfDomain ? s3TargetUrl : signS3Url(s3TargetUrl);
    const s3Res = await fetch(fetchUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!s3Res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch asset from S3: ${s3Res.statusText}` },
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
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

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
