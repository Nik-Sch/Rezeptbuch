
const applicationServerPublicKey = 'BK163H43ZdGaaVvzZDFkIf4Jh9zn2VG6jYX5BWfVHVlnMLvjb8VZoMQRjMjPAAgflckyc6enYey5crb8YW9Ieeg';

let isSubscribed = false;
let swRegistration: ServiceWorkerRegistration | null = null;

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type ICallback = (isSubscribed: boolean) => void;

const callbacks: ICallback[] = [];

export const observeSubscription = (callback: ICallback) => {
  callbacks.push(callback);
  callback(isSubscribed);
}

export const deleteCallback = (callback: ICallback) => {
  callbacks.splice(callbacks.findIndex(a => a === callback), 1);
}

const notify = () => {
  for (const cb of callbacks) {
    cb(isSubscribed);
  }
}

type IConfig = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

function successAndUpdateCalls(registration: ServiceWorkerRegistration, config: IConfig) {
  registration.onupdatefound = () => {
    const installing = registration.installing;
    // console.log('[psw] installing', installing);
    if (installing != null) {
      installing.onstatechange = () => {
        if (installing.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // At this point, the updated precached content has been fetched,
            // but the previous service worker will still serve the older
            // content until all client tabs are closed.

            // Execute callback
            if (config && config.onUpdate) {
              config.onUpdate(registration);
            }
          } else {
            // At this point, everything has been precached.
            // It's the perfect time to display a
            // "Content is cached for offline use." message.

            // Execute callback
            if (config && config.onSuccess) {
              config.onSuccess(registration);
            }
          }
        }
      }
    }
  }
}

let serviceWorkerRegistered = false;

export function registerSW(config: IConfig) {
  if ('serviceWorker' in navigator && 'PushManager' in window && !serviceWorkerRegistered) {
    serviceWorkerRegistered = true;
    // console.log('Service Worker and Push is supported');
    if (window.location.host === 'localhost:3000') {
      navigator.serviceWorker.ready.then(registration => {
        registration.unregister();
        console.log('localhost:3000 -> unregistered sw');
      })
        .catch(error => {
          console.error(error.message);
        });
      return;
    }

    navigator.serviceWorker.register('/push-service-worker.js')
      .then(function (swReg) {
        // console.log('Service Worker is registered');

        swRegistration = swReg;
        successAndUpdateCalls(swReg, config);
        swRegistration.pushManager.getSubscription()
          .then(function (subscription) {
            isSubscribed = !(subscription === null);
            notify();
            if (subscription) {
              updateSubscriptionOnServer(subscription);
            }
          });

      })
      .catch(function (error) {
        console.error('Service Worker Error', error);
      });
  }
}

export function subscribeUser() {
  const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
  if (swRegistration === null) {
    console.error('swRegistration is null');
    return;
  }
  swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey
  }).then(function (subscription) {
    updateSubscriptionOnServer(subscription);
    isSubscribed = true;
    notify();
  }).catch(function (err) {
    // console.log('Failed to subscribe the user: ', err);
    notify();
  });
}

export function isNotificationAvailable() {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && window.location.host !== 'localhost:3000';
}

function updateSubscriptionOnServer(subscription: PushSubscription) {
  fetch('/api/subscriptions/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  }).then(response => {
    // console.log('subscribed at server successfully');
  }).catch(reason => {
    // console.error('failed to subscibe at server', reason);
  });
}
