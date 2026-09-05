// SYNCBARBER PWA Service Worker
const CACHE_NAME = 'syncbarber-pwa-v1';

self.addEventListener('install', (event) => {
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

self.addEventListener('fetch', (event) => {
  // Pass through non-GET and API calls directly to the network
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Push notification event listener for background alerts
self.addEventListener('push', (event) => {
  let data = { title: '🚨 ¡Nueva Cita en SYNCBARBER! 💈', body: 'Se ha registrado un nuevo agendamiento.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Nuevo turno registrado en la barbería.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'syncbarber-appointment-' + Date.now(),
    renotify: true,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 ¡Nueva Cita Confirmada! 💈', options)
  );
});

// Handle clicking on a push notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle postMessage from client for foreground/background sync
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, body, url } = event.data;
    self.registration.showNotification(title || '🚨 ¡Nueva Cita Confirmada! 💈', {
      body: body || 'Se ha registrado un agendamiento en la barbería.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [300, 100, 300, 100, 300],
      tag: 'syncbarber-notif-' + Date.now(),
      renotify: true,
      data: { url: url || '/' }
    });
  }
});

