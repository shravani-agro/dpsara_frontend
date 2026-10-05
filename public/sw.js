const CACHE_NAME = "sattaadmin-v1";
const OFFLINE_URL = "/offline";

const VAPID_KEY = ""; // Will be set from environment

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/_next/static/chunks/main.js",
        "/_next/static/chunks/pages/_app.js",
        "/logo.svg",
        "/favicon.ico",
      ]);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((fetchResponse) => {
        return fetchResponse;
      });
    })
  );
});

// Firebase Cloud Messaging setup
// This will be overridden by the Firebase initialization script
// that injects the actual messaging SDK

// Message handling for pushes received while the app is in the foreground
self.addEventListener("push", (event) => {
  let data = { title: "New Notification", body: "You have a new update", icon: "/logo.svg", tag: "sattaadmin-notification", url: "/" };

  try {
    const payload = event.data?.json();
    if (payload) {
      data = {
        title: payload.notification?.title || data.title,
        body: payload.notification?.body || data.body,
        icon: payload.notification?.icon || data.icon,
        tag: payload.data?.tag || data.tag,
        url: payload.data?.url || data.url,
      };
    }
  } catch (e) {
    consoleError("Error parsing push payload:", e);
  }

  const options = {
    body: data.body,
    icon: data.icon || "/logo.svg",
    tag: data.tag || "sattaadmin-notification",
    data: {
      url: data.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});