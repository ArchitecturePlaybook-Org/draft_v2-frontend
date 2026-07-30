type CacheEntry = {
  blobUrl: string;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

export function getAssetImageCacheKey(assetId: number, versionKey = "default") {
  return `${assetId}:${versionKey}`;
}

export function getCachedAssetImageUrl(assetId: number, versionKey = "default"): string | null {
  return memoryCache.get(getAssetImageCacheKey(assetId, versionKey))?.blobUrl ?? null;
}

export async function fetchCachedAssetImage(
  assetId: number,
  fetchUrl: string,
  versionKey = "default"
): Promise<string> {
  const key = getAssetImageCacheKey(assetId, versionKey);
  const cached = memoryCache.get(key);
  if (cached) return cached.blobUrl;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetch(fetchUrl, { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load image (${res.status})`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      memoryCache.set(key, { blobUrl });
      inflight.delete(key);
      return blobUrl;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateAssetImageCache(assetId?: number) {
  if (assetId === undefined) {
    for (const entry of memoryCache.values()) {
      URL.revokeObjectURL(entry.blobUrl);
    }
    memoryCache.clear();
    inflight.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(`${assetId}:`)) {
      const entry = memoryCache.get(key);
      if (entry) URL.revokeObjectURL(entry.blobUrl);
      memoryCache.delete(key);
    }
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(`${assetId}:`)) {
      inflight.delete(key);
    }
  }
}
