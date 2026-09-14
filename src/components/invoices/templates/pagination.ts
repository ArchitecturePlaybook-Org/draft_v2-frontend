import type { Invoice } from "@/domains/invoices/types";

export type InvoiceItemLike = NonNullable<Invoice["items"]>[number];

export interface InvoicePageChunk {
  pageIndex: number;
  pageNumber: number;
  totalPages: number;
  items: InvoiceItemLike[];
  startIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
}

/**
 * Paginates an array of invoice line items into discrete A4 physical pages.
 * - Single-page invoices (<= 7 items): Exactly 1 page containing full header and footer.
 * - Multi-page invoices (> 7 items):
 *   - Page 1: Full letterhead & client dossier + first 6 items + continuation bar.
 *   - Middle pages: Compact continuation header + 12 items + continuation bar.
 *   - Last page: Compact continuation header + remaining items + Totals & Signatory block.
 */
export function paginateInvoiceItems(
  items: InvoiceItemLike[] = []
): InvoicePageChunk[] {
  const safeItems = items ?? [];

  const SINGLE_PAGE_MAX = 10;
  const PAGE_1_CAPACITY = 13;
  const MIDDLE_PAGE_CAPACITY = 18;
  const LAST_PAGE_CAPACITY = 11;

  if (safeItems.length <= SINGLE_PAGE_MAX) {
    return [
      {
        pageIndex: 0,
        pageNumber: 1,
        totalPages: 1,
        items: safeItems,
        startIndex: 0,
        isFirstPage: true,
        isLastPage: true,
      },
    ];
  }

  const pages: InvoicePageChunk[] = [];
  let remaining = [...safeItems];
  let currentIndex = 0;

  // Page 1: Greedily pack up to PAGE_1_CAPACITY, reserving 1 item for overflow/last page
  const p1Count = Math.min(PAGE_1_CAPACITY, Math.max(1, remaining.length - 1));

  const p1Items = remaining.slice(0, p1Count);
  remaining = remaining.slice(p1Count);
  pages.push({
    pageIndex: 0,
    pageNumber: 1,
    totalPages: 1,
    items: p1Items,
    startIndex: 0,
    isFirstPage: true,
    isLastPage: false,
  });
  currentIndex += p1Items.length;

  // Subsequent pages
  while (remaining.length > 0) {
    if (remaining.length <= LAST_PAGE_CAPACITY) {
      pages.push({
        pageIndex: pages.length,
        pageNumber: pages.length + 1,
        totalPages: 1,
        items: remaining,
        startIndex: currentIndex,
        isFirstPage: false,
        isLastPage: true,
      });
      break;
    } else {
      const batchSize = Math.min(MIDDLE_PAGE_CAPACITY, Math.max(1, remaining.length - 1));
      const batch = remaining.slice(0, batchSize);
      remaining = remaining.slice(batchSize);
      pages.push({
        pageIndex: pages.length,
        pageNumber: pages.length + 1,
        totalPages: 1,
        items: batch,
        startIndex: currentIndex,
        isFirstPage: false,
        isLastPage: false,
      });
      currentIndex += batch.length;
    }
  }

  const totalPages = pages.length;
  pages.forEach((p) => {
    p.totalPages = totalPages;
  });

  return pages;
}
