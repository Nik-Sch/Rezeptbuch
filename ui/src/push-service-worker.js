'use strict';
workbox.core.skipWaiting();
workbox.core.clientsClaim();

workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/images'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'image-cache',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request, mode }) => {
        const url = new URL(request.url); // ignore the url parameters for images (size)
        return url.origin + url.pathname;
      }
    }]
  })
);

workbox.precaching.precacheAndRoute(self.__precacheManifest);


self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);
  const recipe = event.data.json();
  const body = (recipe && recipe.titel)
    ? recipe.titel
    : '';

  const title = 'A new recipe was added.';
  const options = {
    body: body,
    icon: '/android-chrome-512x512.png',
    badge: '/mstile-144x144.png',
    data: recipe,
    renotify: true, // vibrate again for a new notification
    tag: 'new-recipe',
    vibrate: [250]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();
  const url = (event.notification.data && event.notification.data.rezept_ID)
    ? `/recipes/${event.notification.data.rezept_ID}`
    : `/`;

  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(clients.matchAll({
    type: "window"
  }).then(function (clientList) {
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      if (client.url == url && 'focus' in client)
        return client.focus();
    }
    if (clients.openWindow)
      return clients.openWindow(url);
  }));
});
