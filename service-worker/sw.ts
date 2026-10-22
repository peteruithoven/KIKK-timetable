/// <reference lib="webworker" />
// Makes the timetable work offline. Built by @vite-pwa/nuxt, see nuxt.config.ts.
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import type { PrecacheEntry } from "workbox-precaching";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (PrecacheEntry | string)[] };

const OFFLINE_PAGE = "/offline.html";
const NETWORK_TIMEOUT_SECONDS = 3;
const IMAGES_CACHE = "images";

// App code, fonts and icons, so every page can open offline, also ones not visited yet.
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);
cleanupOutdatedCaches();
void self.skipWaiting();
clientsClaim();

// Saved pages refer to the code of the version that saved them, so each version gets its
// own page cache.
const version = hash(manifest.map((entry) => JSON.stringify(entry)).join());
const PAGES_CACHE = `pages-${version}`;

// Pages: fresh when online, the last seen version offline.
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: PAGES_CACHE,
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  }),
);

// Schedule and event data, the art trail, descriptions to search in, and favorites lists.
registerRoute(
  ({ url, sameOrigin, request }) =>
    sameOrigin &&
    request.method === "GET" &&
    ["/api/events", "/api/trail", "/api/search-text", "/api/lists/"].some((path) =>
      url.pathname.startsWith(path),
    ),
  new NetworkFirst({
    cacheName: "api",
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  }),
);

// Event images from Supabase storage. They're requested with CORS, so they're cached as
// normal rather than opaque responses, which count heavily against the storage quota.
registerRoute(
  ({ url, sameOrigin, request }) =>
    !sameOrigin && request.destination === "image" && url.pathname.startsWith("/storage/v1/"),
  new CacheFirst({
    cacheName: IMAGES_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 400,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
      // Timetable images come in several sizes (srcset), and the browser can ask for another
      // one after zooming or rotating. Offline, any cached size of the image will do.
      {
        handlerDidError: async ({ request }) => {
          const cache = await caches.open(IMAGES_CACHE);
          const path = new URL(request.url).pathname;
          const key = (await cache.keys()).find((cached) => new URL(cached.url).pathname === path);
          return key && cache.match(key);
        },
      },
    ],
  }),
);

// Pages never visited while online.
setCatchHandler(async ({ request }) =>
  request.destination === "document"
    ? ((await caches.match(OFFLINE_PAGE, { cacheName: PAGES_CACHE })) ?? Response.error())
    : Response.error(),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then(async (cache) => {
      // Not precached: @vite-pwa/nuxt would rewrite it to /offline, which isn't served.
      await cache.add(OFFLINE_PAGE);
      // The start page, so the installed app opens offline even when only event pages were
      // visited. Nice to have, so a failure doesn't stop the install.
      await cache.add("/").catch(() => {});
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pages-") && key !== PAGES_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

function hash(value: string): string {
  let result = 5381;
  for (let i = 0; i < value.length; i++) result = (result * 33) ^ value.charCodeAt(i);
  return (result >>> 0).toString(36);
}

// Notifications before favorites start, sent by the server (server/utils/push.ts).
interface PushMessage {
  title: string;
  body: string;
  tag: string;
  url: string;
}

self.addEventListener("push", (event) => {
  const message = event.data?.json() as PushMessage | undefined;
  if (!message) return;
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: "/web-app-manifest-192x192.png",
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data as { url?: string })?.url ?? "/",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = windows.find((other) => new URL(other.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        await client.navigate(url).catch(() => self.clients.openWindow(url));
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

// Browsers can renew a subscription. The server then moves the old one's list to it.
self.addEventListener("pushsubscriptionchange", (event) => {
  const { oldSubscription, newSubscription } = event as Event & {
    oldSubscription?: PushSubscription | null;
    newSubscription?: PushSubscription | null;
  };
  if (!oldSubscription) return;
  (event as ExtendableEvent).waitUntil(
    (async () => {
      const subscription =
        newSubscription ??
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: oldSubscription.options.applicationServerKey,
        }));
      await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, replaces: oldSubscription.endpoint }),
      });
    })(),
  );
});
