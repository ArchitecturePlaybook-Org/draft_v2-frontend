import { db } from "@/shared/offline/db";
import { resolveAssetFileUrl } from "@/lib/resolveAssetFileUrl";

/** Remove cached BFF GET responses whose URL contains any of the given fragments. */
export async function invalidateBffCache(...urlFragments: string[]) {
  if (typeof window === "undefined" || urlFragments.length === 0) return;

  const entries = await db.apiCache.toArray();
  await Promise.all(
    entries
      .filter((entry) => urlFragments.some((frag) => entry.url.includes(frag)))
      .map((entry) => db.apiCache.delete(entry.url))
  );
}

/** Append cache-buster to a same-origin/proxy URL. Never mutates presigned S3 query strings. */
export function withCacheBuster(url: string, versionKey: string | number): string {
  const resolved =
    url.includes("X-Amz-Signature=") && !url.startsWith("/api/v1/proxy-asset")
      ? resolveAssetFileUrl(url)
      : url;
  const sep = resolved.includes("?") ? "&" : "?";
  return `${resolved}${sep}v=${encodeURIComponent(String(versionKey))}`;
}
