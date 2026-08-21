const DB_NAME = "ArchitecturePlaybook_BIM_Cache";
const DB_VERSION = 1;
const STORE_NAME = "model_buffers";

interface CachedModelRecord {
  assetId: string;
  buffer: ArrayBuffer;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "assetId" });
      }
    };
  });
}

export async function getCachedModelBuffer(assetId: string | number): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(String(assetId));

      request.onsuccess = () => {
        const record = request.result as CachedModelRecord | undefined;
        if (record && record.buffer) {
          console.log(`[BIM Cache Hit] Loaded asset #${assetId} directly from browser IndexedDB.`);
          resolve(record.buffer);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn("[BIM Cache] Failed to read from IndexedDB:", request.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn("[BIM Cache] IndexedDB error:", err);
    return null;
  }
}

export async function saveModelBufferToCache(assetId: string | number, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const record: CachedModelRecord = {
        assetId: String(assetId),
        buffer: buffer.slice(0), // Clone buffer to ensure safety across threads
        timestamp: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => {
        console.log(`[BIM Cache Saved] Saved asset #${assetId} buffer (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB) to browser IndexedDB.`);
        resolve();
      };

      request.onerror = () => {
        console.warn("[BIM Cache] Failed to save model buffer to IndexedDB:", request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn("[BIM Cache] IndexedDB write error:", err);
  }
}

export async function clearBimModelCache(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    console.log("[BIM Cache] Cleared all cached 3D model buffers.");
  } catch (err) {
    console.warn("[BIM Cache] Error clearing cache:", err);
  }
}
