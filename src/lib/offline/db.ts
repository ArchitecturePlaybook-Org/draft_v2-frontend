import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: string;
  body: any;
  headers?: any;
  createdAt: number;
  retryCount: number;
  status: 'PENDING' | 'FAILED' | 'SYNCED';
}

export interface CacheItem {
  url: string;
  data: any;
  updatedAt: number;
}

export class OfflineDatabase extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;
  apiCache!: Table<CacheItem, string>;

  constructor() {
    super('ArchitecturePlaybookOfflineDB');
    this.version(1).stores({
      syncQueue: '++id, url, method, status, createdAt',
      apiCache: 'url, updatedAt'
    });
  }
}

export const db = new OfflineDatabase();

/**
 * Attempts to flush the sync queue to the server.
 */
export async function flushSyncQueue() {
  if (typeof window === 'undefined' || !window.navigator.onLine) return;

  const pendingItems = await db.syncQueue.where('status').equals('PENDING').toArray();
  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers || { 'Content-Type': 'application/json' },
        body: typeof item.body === 'string' ? item.body : JSON.stringify(item.body)
      });

      if (res.ok) {
        await db.syncQueue.update(item.id!, { status: 'SYNCED' });
        await db.syncQueue.delete(item.id!);
      } else {
        await db.syncQueue.update(item.id!, { 
          retryCount: item.retryCount + 1,
          status: item.retryCount > 5 ? 'FAILED' : 'PENDING'
        });
      }
    } catch (err) {
      await db.syncQueue.update(item.id!, { retryCount: item.retryCount + 1 });
    }
  }
}

// Automatically try flushing when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushSyncQueue);
}
