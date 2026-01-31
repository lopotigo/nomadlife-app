const CACHE_NAME = 'nomadlife-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: '/' }
  };

  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = { title: 'NomadLife', body: event.data?.text() || 'New notification' };
  }

  const title = data.title || 'NomadLife';
  options.body = data.body || '';
  if (data.url) options.data.url = data.url;

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && url.pathname.startsWith('/api/posts')) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
