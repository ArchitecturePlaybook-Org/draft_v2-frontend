import Dexie, { Table } from 'dexie';

export interface SyncTask {
  id?: number;
  url: string;
  method: string;
  body: any;
  headers: any;
  createdAt: number;
  retryCount: number;
  status: 'PENDING' | 'FAILED' | 'SYNCED';
}

export interface ApiCacheEntry {
  url: string;
  data: any;
  updatedAt: number;
}

export class OfflineDB extends Dexie {
  syncQueue!: Table<SyncTask, number>;
  apiCache!: Table<ApiCacheEntry, string>;

  constructor() {
    super('ArchitecturePlaybookOfflineDB');
    this.version(1).stores({
      syncQueue: '++id, status, createdAt',
      apiCache: 'url, updatedAt'
    });
  }
}

export const db = new OfflineDB();

export async function flushSyncQueue() {
  if (typeof window === 'undefined' || !window.navigator.onLine) return;

  const pendingTasks = await db.syncQueue.where('status').equals('PENDING').toArray();
  if (pendingTasks.length === 0) return;

  console.log(`[Offline Sync] Flushing ${pendingTasks.length} queued requests...`);

  for (const task of pendingTasks) {
    try {
      const res = await fetch(task.url, {
        method: task.method,
        body: task.body instanceof FormData ? task.body : JSON.stringify(task.body),
        headers: task.headers,
      });

      if (res.ok) {
        await db.syncQueue.update(task.id!, { status: 'SYNCED' });
      } else {
        // If it fails with a 4xx, we might want to mark it as FAILED so we don't retry forever.
        // For 5xx, we might keep it PENDING. For now, mark FAILED if retryCount > 3.
        const newRetryCount = task.retryCount + 1;
        if (newRetryCount >= 3) {
          await db.syncQueue.update(task.id!, { status: 'FAILED', retryCount: newRetryCount });
        } else {
          await db.syncQueue.update(task.id!, { retryCount: newRetryCount });
        }
      }
    } catch (e) {
      console.error(`[Offline Sync] Failed to sync task ${task.id}`, e);
    }
  }

  // Optional: clear synced tasks
  await db.syncQueue.where('status').equals('SYNCED').delete();
}

// Automatically flush queue when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushSyncQueue);
}
