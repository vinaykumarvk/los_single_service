/**
 * Service Worker for PWA
 * Provides offline support and caching
 */

const CACHE_NAME = 'los-v1';
const STATIC_CACHE = 'los-static-v1';
const DYNAMIC_CACHE = 'los-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Cache strategy: Network First, Cache Fallback
const CACHE_STRATEGY = {
  static: 'cache-first', // Static assets
  api: 'network-first',  // API calls
  images: 'cache-first', // Images
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except API calls we want to cache)
  if (url.origin !== location.origin && !url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      // Network First Strategy for API calls
      if (url.pathname.startsWith('/api/')) {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
            return networkResponse;
          }
        } catch (error) {
          // Network failed, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline response for API calls
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Cache First Strategy for static assets and images
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fetch from network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        }
      } catch (error) {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match('/index.html') || new Response('Offline', { status: 503 });
        }
      }

      return new Response('Offline', { status: 503 });
    })()
  );
});

// Background sync for offline actions (when supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-applications') {
    event.waitUntil(syncApplications());
  }
});

async function syncApplications() {
  // Implementation for syncing offline actions
  // This would sync any offline-created applications when back online
  console.log('Syncing offline applications...');
}

