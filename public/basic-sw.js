var PRECACHE = 'precache-v14';
var RUNTIME = 'runtime';
var PRECACHE_URLS = ['index.html'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(PRECACHE).then(function (cache) {
    return cache.addAll(PRECACHE_URLS);
  }).then(self.skipWaiting()));
});

self.addEventListener('activate', function (event) {
  var currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return cacheNames.filter(function (cacheName) {
      return !currentCaches.includes(cacheName);
    });
  }).then(function (cachesToDelete) {
    return Promise.all(cachesToDelete.map(function (cacheToDelete) {
      return caches.delete(cacheToDelete);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME).then(function (cache) {
        return fetch(event.request).then(function (response) {
          return cache.put(event.request, response.clone()).then(function () {
            return response;
          });
        });
      });
    }));
  }
});
