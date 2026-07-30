import { useEffect, useRef, useState } from "react";

const DEFAULT_BATCH_SIZE = 15;

export function useInfiniteScrollBatch<T>(
  items: T[],
  options?: { batchSize?: number; resetKey?: string | number }
) {
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const resetKey = options?.resetKey;
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [resetKey, batchSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    if (!hasMore) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingRef.current) return;

        isLoadingRef.current = true;
        setIsLoadingMore(true);

        window.setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
          setIsLoadingMore(false);
          isLoadingRef.current = false;
        }, 200);
      },
      { rootMargin: "120px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, items.length, batchSize]);

  return {
    visibleItems,
    hasMore,
    isLoadingMore,
    sentinelRef,
    totalCount: items.length,
    loadedCount: visibleItems.length,
  };
}
