const CACHE_NAME = 'kopi-jiwara-pos-offline-v22';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        PRECACHE_ASSETS.map(function (url) {
          return cache.add(url).catch(function () {});
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  // Jangan cache API Google Apps Script (biarkan realtime / offline queue yang menangani)
  if (event.request.url.indexOf('script.google.com') !== -1 || event.request.url.indexOf('googleusercontent.com') !== -1) {
    return;
  }

  // Untuk navigasi pembukaan aplikasi dari layar utama Android (termasuk parameter ?sync=...)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put('./index.html', copy);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          return caches.match('./index.html', { ignoreSearch: true }).then(function (cachedIndex) {
            return cachedIndex || caches.match('./', { ignoreSearch: true });
          });
        })
    );
    return;
  }

  // Untuk aset pendukung (manifest, ikon, dll.)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cachedResponse) {
      const fetchPromise = fetch(event.request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});