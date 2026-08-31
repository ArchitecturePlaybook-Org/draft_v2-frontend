const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000";
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

/**
 * Resolve a backend/S3 asset URL to a direct or proxied fetch target for the browser.
 * Routes cross-origin assets (S3 / external Django backend) through Next.js proxy route
 * which signs the S3 GET request on the server side using AWS credentials.
 */
export function resolveAssetFileUrl(url: string): string {
  if (!url) return url;

  // 1. Handle Amazon S3 URLs -> Route through path-based proxy
  if (url.includes(".amazonaws.com/")) {
    try {
      const parsed = new URL(url);
      return `/s3-assets${parsed.pathname}${parsed.search}`;
    } catch {
      // fall through
    }
  }

  // 2. Handle Next.js path-based S3 asset proxy routes (/s3-assets/...)
  if (url.startsWith("/s3-assets/") || url.startsWith("s3-assets/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return cleanPath;
  }

  // 3. Handle Django media paths (both full URLs and relative paths) -> Route through Next.js /media/ rewrite
  if (url.includes("/media/")) {
    const idx = url.indexOf("/media/");
    return url.slice(idx);
  }
  if (url.startsWith("media/")) {
    return `/${url}`;
  }

  // 4. Handle Django static paths
  if (url.includes("/static/")) {
    const idx = url.indexOf("/static/");
    return url.slice(idx);
  }

  // 5. Handle local backend URLs (localhost:8000 / 127.0.0.1:8000) -> Extract path directly
  if (url.startsWith("http://127.0.0.1:8000") || url.startsWith("http://localhost:8000")) {
    try {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search;
    } catch {
      // fall through
    }
  }

  // 6. Local static SH3D HTML viewer & UI icons (aboutIcon.png, cursors, toolbar)
  if (url.startsWith("/sh3d/") || url.startsWith("sh3d/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return cleanPath;
  }

  // 7. Same-origin paths
  if (url.startsWith("/")) {
    return url;
  }

  // 8. Remote Cross-Origin HTTP / HTTPS URLs (non-local) -> proxy
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

  return url;
}
