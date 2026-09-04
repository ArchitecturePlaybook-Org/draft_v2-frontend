const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000";
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

/**
 * Resolve a backend/S3 asset URL to a direct or proxied fetch target for the browser.
 * Routes cross-origin assets (S3 / external Django backend) through Next.js proxy route
 * which signs the S3 GET request on the server side using AWS credentials.
 */
export function resolveAssetFileUrl(url: string): string {
  if (!url) return url;

  // Handle Amazon S3 URLs -> Route through path-based proxy
  if (url.includes(".amazonaws.com/")) {
    try {
      const parsed = new URL(url);
      return `/s3-assets${parsed.pathname}${parsed.search}`;
    } catch {
      // fall through
    }
  }

  // Handle Next.js path-based S3 asset proxy routes (/s3-assets/...)
  if (url.startsWith("/s3-assets/") || url.startsWith("s3-assets/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return cleanPath;
  }

  // Cross-Origin HTTP / HTTPS URLs (remote backend endpoints)
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

  // Handle Relative media paths (user uploaded files, 3D models)
  if (url.startsWith("/media/") || url.startsWith("media/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    if (CDN_URL) {
      return `/s3-assets/${cleanPath.replace(/^\/media\//, "")}`;
    }
    return typeof window !== "undefined" ? cleanPath : `${DJANGO_API_URL}${cleanPath}`;
  }

  // Local static SH3D HTML viewer & UI icons (aboutIcon.png, cursors, toolbar)
  if (url.startsWith("/sh3d/") || url.startsWith("sh3d/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return cleanPath;
  }

  if (url.startsWith("/")) {
    return `${DJANGO_API_URL}${url}`;
  }

  if (url.startsWith("static/")) {
    return `${DJANGO_API_URL}/${url}`;
  }

  return url;
}
