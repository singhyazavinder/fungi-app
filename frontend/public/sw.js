const CACHE_NAME = 'fungi-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/images/mushrooms/boletus_aereus.webp',
  '/images/mushrooms/boletus_aestivalis.webp',
  '/images/mushrooms/cantharellus_cibarius.webp',
  '/images/mushrooms/amanita_caesarea.webp',
  '/images/mushrooms/craterellus_cornucopioides.webp',
  '/images/mushrooms/morchella_esculenta.webp',
  '/images/mushrooms/craterellus_tubaeformis.webp',
  '/images/mushrooms/boletus_pinophilus.webp',
  '/images/mushrooms/morchella_conica.webp',
  '/images/mushrooms/russula_cyanoxantha.webp',
  '/images/mushrooms/macrolepiota_procera.webp',
  '/images/mushrooms/boletus_edulis.webp',
  'https://unpkg.com/maplibre-gl@3.3.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@3.3.1/dist/maplibre-gl.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
            return response;
          }
        ).catch(() => {
          // Fallback if offline and not in cache
          return new Response("Network error occurred or offline.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" })
          });
        });
      })
  );
});
