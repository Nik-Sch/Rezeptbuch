/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// self.skipWaiting();
clientsClaim();

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/images'),
  new NetworkFirst({
    cacheName: 'image-cache',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request, mode }) => {
        const url = new URL(request.url); // ignore the url parameters for images (size)
        return url.origin + url.pathname;
      }
    }]
  })
);

precacheAndRoute(self.__WB_MANIFEST);


self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  if (event.data === null) {
  console.log(`[Service Worker] Push had no data`);
    return;
  }
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);
  const recipe = event.data.json();
  const body = (recipe && recipe.titel)
    ? recipe.titel
    : '';

  const title = 'A new recipe was added.';
  const options = {
    body: body,
    icon: `${process.env.PUBLIC_URL}/android-chrome-512x512.png`,
    badge: `${process.env.PUBLIC_URL}/mstile-144x144.png`,
    data: recipe,
    renotify: true, // vibrate again for a new notification
    tag: 'new-recipe',
    vibrate: [250]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();
  const url = (event.notification.data && event.notification.data.rezept_ID)
    ? `${process.env.PUBLIC_URL}/recipes/${event.notification.data.rezept_ID}`
    : `${process.env.PUBLIC_URL}/`;

  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(self.clients.matchAll({
    type: "window"
  }).then(clientList => {
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url === url)
        return client.focus();
    }
    return self.clients.openWindow(url);
  }));
});
