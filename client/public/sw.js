/* ============================================================
   Aether Chat – Service Worker  (sw.js)
   - Precaching (via workbox / vite-plugin-pwa)
   - Web Push Notifications
   ============================================================ */

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

/* ── Precache all assets injected by vite-plugin-pwa ── */
precacheAndRoute(self.__WB_MANIFEST);

/* ── Runtime caching strategies ── */

// Cache images: CacheFirst with expiration
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Cache static JS/CSS: StaleWhileRevalidate
registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  }),
);

// Cache API calls: NetworkFirst with expiration
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60,
      }),
    ],
  }),
);

/* ── Install & Activate ── */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

/* ── Push event: show notification ── */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Aether', body: event.data.text() };
  }

  const title   = data.title   || 'Aether';
  const options = {
    body:    data.body    || '',
    icon:    data.icon    || '/pwa-192x192.png',
    badge:   data.badge   || '/pwa-192x192.png',
    tag:     data.tag     || 'aether-msg',
    data:    data.data    || {},
    vibrate: [200, 100, 200],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ── Notification click: focus or open the app ── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
