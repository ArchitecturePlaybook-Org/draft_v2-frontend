interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheItem<any>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const fieldDiaryCache = {
  get<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
    // 1. Check memory cache
    const mem = memoryCache.get(key);
    if (mem && Date.now() - mem.timestamp < ttlMs) {
      return mem.data as T;
    }

    // 2. Check sessionStorage fallback
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`ap.field_diary.${key}`);
        if (raw) {
          const parsed: CacheItem<T> = JSON.parse(raw);
          if (Date.now() - parsed.timestamp < ttlMs) {
            memoryCache.set(key, parsed);
            return parsed.data;
          }
        }
      } catch {
        /* ignore storage error */
      }
    }
    return null;
  },

  set<T>(key: string, data: T): void {
    const item: CacheItem<T> = { data, timestamp: Date.now() };
    memoryCache.set(key, item);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`ap.field_diary.${key}`, JSON.stringify(item));
      } catch {
        /* ignore storage error */
      }
    }
  },

  invalidate(projectId?: string): void {
    if (!projectId) {
      memoryCache.clear();
      if (typeof window !== "undefined") {
        try {
          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith("ap.field_diary.")) {
              sessionStorage.removeItem(k);
            }
          });
        } catch {
          /* ignore */
        }
      }
      return;
    }

    for (const key of memoryCache.keys()) {
      if (key.includes(projectId)) {
        memoryCache.delete(key);
      }
    }
    if (typeof window !== "undefined") {
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.includes(projectId)) {
            sessionStorage.removeItem(k);
          }
        });
      } catch {
        /* ignore */
      }
    }
  },
};
