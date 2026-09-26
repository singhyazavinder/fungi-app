const CACHE_NAME = 'fungi-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  'https://unpkg.com/maplibre-gl@3.3.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@3.3.1/dist/maplibre-gl.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return from cache
        }
        return fetch(event.request).then(
          function(response) {
            // Optional: cache dynamic images and API responses here
            return response;
          }
        ).catch(() => {
          // Fallback if offline and not in cache
        });
      })
  );
});
