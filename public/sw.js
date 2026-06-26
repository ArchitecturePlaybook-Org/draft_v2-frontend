importScripts('https://unpkg.com/dexie/dist/dexie.js');

const CACHE_NAME = 'ap-offline-cache-v1';

// We want to cache the Next.js chunks, fonts, and the root dashboard.
const URLS_TO_CACHE = [
  '/',
  '/dashboard',
  '/manifest.json', // If you have one
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Opened cache');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // We only cache GET requests for our own origin (excluding the /api/ proxy endpoints)
  // because /api/ is handled by dexie-based caching in fetchFromBff.ts.
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.origin === self.location.origin && !url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Try network
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Next.js chunks and assets can be cached aggressively
            if (url.pathname.startsWith('/_next/') || url.pathname.includes('/fonts/')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }

            return networkResponse;
          }
        );
      }).catch(() => {
        // Fallback for navigation requests when totally offline
        if (event.request.mode === 'navigate') {
          return caches.match('/dashboard'); // or standard offline page
        }
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- Background Sync for Offline Queue ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(flushSyncQueueSW());
  }
});

async function flushSyncQueueSW() {
  const db = new Dexie('ArchitecturePlaybookOfflineDB');
  db.version(1).stores({
    syncQueue: '++id, status, createdAt',
    apiCache: 'url, updatedAt',
    reactQueryState: 'key'
  });

  const pendingTasks = await db.syncQueue.where('status').equals('PENDING').toArray();
  if (pendingTasks.length === 0) return;

  for (const task of pendingTasks) {
    try {
      // Reconstruct body if it was serialized
      let bodyData = task.body;
      
      const res = await fetch(task.url, {
        method: task.method,
        body: typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData),
        headers: task.headers,
      });

      if (res.ok) {
        await db.syncQueue.update(task.id, { status: 'SYNCED' });
      } else {
        const newRetryCount = (task.retryCount || 0) + 1;
        if (newRetryCount >= 3) {
          await db.syncQueue.update(task.id, { status: 'FAILED', retryCount: newRetryCount });
        } else {
          await db.syncQueue.update(task.id, { retryCount: newRetryCount });
        }
      }
    } catch (e) {
      console.error(`[SW Sync] Failed task ${task.id}`, e);
      throw e; // Throw to tell the browser to retry the sync later
    }
  }

  await db.syncQueue.where('status').equals('SYNCED').delete();
}
