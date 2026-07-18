import Dexie, { Table } from 'dexie';

export interface SerializedFile {
  _isFile: boolean;
  name: string;
  type: string;
  data: string;
}

export interface SerializedFormData {
  _isFormData: boolean;
  entries: Array<{
    key: string;
    value: string | SerializedFile;
  }>;
}

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: string;
  body: string | SerializedFormData | Record<string, unknown> | null | undefined;
  headers?: Record<string, string>;
  createdAt: number;
  retryCount: number;
  status: 'PENDING' | 'FAILED' | 'SYNCED';
}

export interface CacheItem {
  url: string;
  data: unknown;
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
      let requestBody: string | FormData | undefined = undefined;
      const requestHeaders: Record<string, string> = { ...(item.headers || {}) };

      if (item.body && typeof item.body === 'object' && '_isFormData' in item.body) {
        const bodyObj = item.body as SerializedFormData;
        const formData = new FormData();
        for (const entry of bodyObj.entries) {
          if (entry.value && typeof entry.value === 'object' && '_isFile' in entry.value) {
            const fileObj = entry.value as SerializedFile;
            // Convert data URL back to File
            const arr = fileObj.data.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const file = new File([u8arr], fileObj.name, { type: mime });
            formData.append(entry.key, file);
          } else {
            formData.append(entry.key, entry.value as string);
          }
        }
        requestBody = formData;
        // Do not set Content-Type header so the browser sets the correct boundary
        delete requestHeaders['Content-Type'];
        delete requestHeaders['content-type'];
      } else if (item.body) {
        requestBody = typeof item.body === 'string' ? item.body : JSON.stringify(item.body);
      }

      const res = await fetch(item.url, {
        method: item.method,
        headers: requestHeaders,
        body: requestBody
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
