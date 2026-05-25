/**
 * Offline Queue — IndexedDB-backed mutation cache.
 * Stores pending construction task moves when offline,
 * and flushes them automatically when connection returns.
 */

const DB_NAME = "ap-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

export interface QueuedMutation {
  id?: number;
  type: "MOVE_TASK" | "LOG_PROGRESS" | "CHECK_ITEM" | "RESOLVE_ISSUE";
  payload: Record<string, any>;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const offlineQueue = {
  async enqueue(mutation: Omit<QueuedMutation, "id" | "timestamp">): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add({ ...mutation, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAll(): Promise<QueuedMutation[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async flush(
    executor: (mutation: QueuedMutation) => Promise<void>,
    onProgress?: (remaining: number) => void
  ): Promise<void> {
    const pending = await this.getAll();
    for (const mutation of pending) {
      try {
        await executor(mutation);
        await this.remove(mutation.id!);
        const remaining = (await this.getAll()).length;
        onProgress?.(remaining);
      } catch {
        // Stop on first failure — maintain ordering
        break;
      }
    }
  },

  async count(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  },
};
