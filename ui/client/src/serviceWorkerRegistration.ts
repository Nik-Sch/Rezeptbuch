import { useEffect, useState } from 'react';

let isSubscribed = false;
let swRegistration: ServiceWorkerRegistration | null = null;

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type ICallback = (isSubscribed: boolean) => void;

const callbacks: ICallback[] = [];

const observeSubscription = (callback: ICallback) => {
  callbacks.push(callback);
  callback(isSubscribed);
};

const deleteCallback = (callback: ICallback) => {
  callbacks.splice(
    callbacks.findIndex((a) => a === callback),
    1,
  );
};

const notify = () => {
  console.log('[psw] notify', callbacks);
  for (const cb of callbacks) {
    cb(isSubscribed);
  }
};

export function useSWSubscribed(def: boolean) {
  const [subscribed, setSubscribed] = useState(def);
  useEffect(() => {
    const handle = (v: boolean) => {
      setSubscribed(v);
    };

    observeSubscription(handle);
    return () => {
      deleteCallback(handle);
    };
  }, []);

  return subscribed;
}

interface IConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
}

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
            if (config?.onUpdate) {
              config.onUpdate(registration);
            }
          } else {
            // At this point, everything has been precached.
            // It's the perfect time to display a
            // "Content is cached for offline use." message.

            // Execute callback
            if (config?.onSuccess) {
              config.onSuccess(registration);
            }
          }
        }
      };
    }
  };
}

let serviceWorkerRegistered = false;

export function registerSW(config: IConfig) {
  void asyncRegisterSW(config);
}

export async function asyncRegisterSW(config: IConfig) {
  if ('serviceWorker' in navigator && 'PushManager' in window && !serviceWorkerRegistered) {
    serviceWorkerRegistered = true;
    console.log('Service Worker and Push is supported');

    const swReg = await navigator.serviceWorker.register(
      import.meta.env.MODE === 'production' ? '/service-worker.js' : '/dev-sw.js?dev-sw',
    );
    console.log('Service Worker is registered');
    swRegistration = swReg;
    successAndUpdateCalls(swReg, config);
    const subscription = await swRegistration.pushManager.getSubscription();
    isSubscribed = !(subscription === null);
    notify();
    if (subscription) {
      await updateSubscriptionOnServer(subscription);
    }
  }
}

export async function subscribeUser() {
  // fetch the public key from the server:
  const response = await fetch('/api/webpush_public_key');
  if (response.ok !== true) {
    console.error(
      'Failed to retrieve the public key for push from the api.',
      await response.text(),
    );
    return false;
  }
  const result = (await response.json()) as { public_key: string };
  const publicKey = result.public_key;
  const applicationServerKey = urlB64ToUint8Array(publicKey);
  if (swRegistration === null) {
    console.error('swRegistration is null');
    return false;
  }
  try {
    const sub = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });
    await updateSubscriptionOnServer(sub);
    isSubscribed = true;
  } catch (err) {
    isSubscribed = false;
    console.log(`Failed to subscribe the user: `, err);
  }
  notify();
  return isSubscribed;
}

export function isNotificationAvailable() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    window.location.host !== 'localhost:3000'
  );
}

async function updateSubscriptionOnServer(subscription: PushSubscription) {
  const response = await fetch('/api/subscriptions/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });
  console.log('subscribed at server successfully', response);
}
