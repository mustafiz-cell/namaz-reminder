const CACHE_NAME = 'namaz-reminder-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './azan.mp3',
  './dua.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Handle Audio Range requests with cached ArrayBuffer slicing
  if (url.pathname.endsWith('.mp3') && e.request.headers.has('range')) {
    e.respondWith(
      caches.match(e.request.url, { ignoreSearch: true }).then((cachedResponse) => {
        if (!cachedResponse) {
          return fetch(e.request);
        }
        return cachedResponse.arrayBuffer().then((buffer) => {
          const rangeHeader = e.request.headers.get('range');
          const total = buffer.byteLength;
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

          if (start >= total || end >= total) {
            return new Response(null, {
              status: 416,
              statusText: 'Range Not Satisfiable',
              headers: { 'Content-Range': `bytes */${total}` }
            });
          }

          const slicedBuffer = buffer.slice(start, end + 1);
          return new Response(slicedBuffer, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': slicedBuffer.byteLength,
              'Content-Range': `bytes ${start}-${end}/${total}`,
              'Accept-Ranges': 'bytes'
            }
          });
        });
      })
    );
    return;
  }

  // Navigation requests: Network-first with cache fallback
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Static assets: Cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (e.request.url.startsWith('http') && e.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
