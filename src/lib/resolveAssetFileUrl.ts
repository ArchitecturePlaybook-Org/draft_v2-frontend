/**
 * Resolve a backend/S3 asset URL to a same-origin fetch target for the browser.
 * Cross-origin URLs (S3 signed URLs, backend on :8000, etc.) are proxied server-side.
 */
export function resolveAssetFileUrl(url: string): string {
  if (!url) return url;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(url);
        if (parsed.origin === window.location.origin) {
          return parsed.pathname + parsed.search;
        }
      } catch {
        // fall through to proxy
      }
    }
    return `/api/v1/proxy-asset?url=${encodeURIComponent(url)}`;
  }

  return url;
}
