const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000";

/**
 * Resolve a backend/S3 asset URL to a direct or proxied fetch target for the browser.
 * Routes cross-origin assets (S3 / external Django backend) through Next.js proxy route
 * to guarantee 100% clean CORS compliance and stream large 3D models smoothly.
 */
export function resolveAssetFileUrl(url: string): string {
  if (!url) return url;

  // Cross-Origin HTTP / HTTPS URLs (S3 presigned URLs, remote backend endpoints)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(url);
        if (parsed.origin === window.location.origin) {
          return parsed.pathname + parsed.search;
        }
      } catch {
        // fall through
      }
    }
    return `/api/v1/proxy-asset?url=${encodeURIComponent(url)}`;
  }

  // Relative paths from Django backend media/static
  if (url.startsWith("/")) {
    return `${DJANGO_API_URL}${url}`;
  }

  if (url.startsWith("media/") || url.startsWith("static/")) {
    return `${DJANGO_API_URL}/${url}`;
  }

  return url;
}
