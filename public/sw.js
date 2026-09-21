// SYNCBARBER Progressive Web App Service Worker with Background Push Alarms
const CACHE_NAME = 'syncbarber-cache-v3';

// Assets to cache for basic offline shell
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Precaching partial error, skipping non-critical assets:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let browser handle API calls, server-sent events, and non-GET requests directly
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.headers.get('accept')?.includes('text/event-stream')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/');
        });
      })
  );
});

// Push notification event listener for background alerts
self.addEventListener('push', (event) => {
  let data = { title: '🚨 ¡Alarma SYNCBARBER! 💈', body: 'Se ha registrado un evento en la barbería.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Alerta de turno o cita programada.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [400, 150, 400, 150, 400, 150, 400],
    tag: data.tag || ('syncbarber-alert-' + Date.now()),
    renotify: true,
    requireInteraction: true, // Stays in notification tray/lockscreen until dismissed
    actions: [
      { action: 'open', title: '💈 Abrir Barbería' },
      { action: 'dismiss', title: '🔇 Descartar' }
    ],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 ¡Alarma SYNCBARBER! 💈', options)
  );
});

// Handle clicking on a push notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

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
    const { title, body, url, options = {} } = event.data;
    self.registration.showNotification(title || '🚨 ¡Alarma SYNCBARBER! 💈', {
      body: body || options.body || 'Se ha registrado un agendamiento en la barbería.',
      icon: options.icon || '/favicon.svg',
      badge: options.badge || '/favicon.svg',
      vibrate: options.vibrate || [400, 150, 400, 150, 400, 150, 400],
      tag: options.tag || ('syncbarber-notif-' + Date.now()),
      renotify: options.renotify !== false,
      requireInteraction: options.requireInteraction !== false, // Persistent by default
      actions: options.actions || [
        { action: 'open', title: '💈 Abrir Barbería' },
        { action: 'dismiss', title: '🔇 Descartar' }
      ],
      data: { url: url || options.data?.url || '/' }
    });
  }
});
