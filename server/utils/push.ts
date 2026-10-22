import { createHash } from "node:crypto";
import webpush from "web-push";
import type { PushSubscription as WebPushSubscription } from "web-push";

const MAX_ENDPOINT_LENGTH = 2000;

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/** A browser that wants notifications for the favorites of a list. */
interface StoredSubscription {
  subscription: WebPushSubscription;
  listId: string;
  /** Where it subscribed. Push services want a contact, an https URL will do. */
  origin: string;
  /** `eventId@startsAt` of the notifications sent, so each is sent once, again when moved. */
  sent: string[];
  createdAt: string;
}

const storage = () => useStorage("data");
const SUBSCRIPTIONS_PREFIX = "push:subscriptions";
const subscriptionKey = (endpoint: string) =>
  `${SUBSCRIPTIONS_PREFIX}:${createHash("sha256").update(endpoint).digest("hex").slice(0, 32)}`;

let vapidKeys: Promise<VapidKeys> | null = null;

/**
 * The app server's key pair, generated on first use and kept with the favorites. Browsers tie
 * their subscriptions to the public key, so it must stay the same.
 */
export function getVapidKeys(): Promise<VapidKeys> {
  vapidKeys ??= (async () => {
    const stored = await storage().getItem<VapidKeys>("push:vapid");
    if (stored) return stored;
    const keys = webpush.generateVAPIDKeys();
    await storage().setItem("push:vapid", keys);
    return keys;
  })().catch((error) => {
    vapidKeys = null;
    throw error;
  });
  return vapidKeys;
}

export function parseSubscription(value: unknown): WebPushSubscription {
  const { endpoint, keys } = (value ?? {}) as Partial<WebPushSubscription>;
  if (
    typeof endpoint !== "string" ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    !URL.canParse(endpoint) ||
    new URL(endpoint).protocol !== "https:" ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string" ||
    keys.p256dh.length > 200 ||
    keys.auth.length > 200
  ) {
    throw createError({ statusCode: 400, statusMessage: "Invalid push subscription" });
  }
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

/** Links a browser's subscription to a list. Keeps what was sent when it was linked before. */
export async function saveSubscription(
  subscription: WebPushSubscription,
  listId: string,
  origin: string,
  /** Endpoint of the subscription this one replaces, when the browser renewed it. */
  replaces?: string,
): Promise<void> {
  const key = subscriptionKey(subscription.endpoint);
  const previous =
    (await storage().getItem<StoredSubscription>(key)) ??
    (replaces ? await storage().getItem<StoredSubscription>(subscriptionKey(replaces)) : null);
  await storage().setItem<StoredSubscription>(key, {
    subscription,
    listId,
    origin,
    sent: previous?.listId === listId ? previous.sent : [],
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  });
  if (replaces && replaces !== subscription.endpoint) await removeSubscription(replaces);
}

export async function findSubscription(endpoint: string): Promise<StoredSubscription | null> {
  return storage().getItem<StoredSubscription>(subscriptionKey(endpoint));
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await storage().removeItem(subscriptionKey(endpoint));
}

/** What the service worker shows, see service-worker/sw.ts. */
export interface PushMessage {
  title: string;
  body: string;
  /** Replaces an earlier notification with the same tag. */
  tag: string;
  /** Path to open on click. */
  url: string;
}

function toMessage(event: FestivalEvent): PushMessage {
  const speaker = event.kind === "talk" ? event.speakers[0]?.name : undefined;
  return {
    title: speaker ? `${speaker}: ${event.title}` : event.title,
    body: [`Starts at ${event.start}`, event.venue].filter(Boolean).join(" · "),
    tag: event.id,
    url: `/${event.kind}/${event.slug}`,
  };
}

let checking = false;

/**
 * Sends notifications for favorites that start within NOTIFY_MINUTES_BEFORE. Runs every minute,
 * see server/plugins/push-notifications.ts.
 */
export async function sendDueNotifications(now = Date.now()): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const keys = await storage().getKeys(SUBSCRIPTIONS_PREFIX);
    if (!keys.length) return;
    const { events } = await getFestivalEvents();
    const upcoming = events.filter((event) => {
      if (!event.startsAt) return false;
      const startsIn = Date.parse(event.startsAt) - now;
      return startsIn > 0 && startsIn <= NOTIFY_MINUTES_BEFORE * 60_000;
    });
    const vapid = await getVapidKeys();
    const lists = new Map<string, Promise<FavoritesList | null>>();

    for (const key of keys) {
      const stored = await storage().getItem<StoredSubscription>(key);
      if (!stored) continue;
      if (!lists.has(stored.listId)) lists.set(stored.listId, readList(undefined, stored.listId));
      const list = await lists.get(stored.listId)!;
      if (!list) {
        await storage().removeItem(key);
        continue;
      }
      const favorites = new Set(list.events);
      const due = upcoming.filter(
        (event) =>
          favorites.has(event.id) && !stored.sent.includes(`${event.id}@${event.startsAt}`),
      );
      // Forget past notifications, so the list doesn't grow.
      const sent = stored.sent.filter((entry) => Date.parse(entry.split("@")[1]!) > now);
      let gone = false;
      for (const event of due) {
        try {
          await webpush.sendNotification(stored.subscription, JSON.stringify(toMessage(event)), {
            vapidDetails: { subject: stored.origin, ...vapid },
            // Pointless once the event started.
            TTL: Math.max(60, Math.round((Date.parse(event.startsAt!) - now) / 1000)),
            urgency: "high",
            topic: createHash("sha256").update(event.id).digest("base64url").slice(0, 32),
          });
          sent.push(`${event.id}@${event.startsAt}`);
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            // Unsubscribed, or the browser's data was cleared.
            gone = true;
            break;
          }
          console.warn("[push] sending failed:", status ?? error);
        }
      }
      if (gone) await storage().removeItem(key);
      else if (sent.join() !== stored.sent.join()) {
        // It may have been changed or removed in the meantime.
        const current = await storage().getItem<StoredSubscription>(key);
        if (current?.listId === stored.listId) {
          await storage().setItem<StoredSubscription>(key, {
            ...current,
            sent: [...new Set([...sent, ...current.sent])].filter(
              (entry) => Date.parse(entry.split("@")[1]!) > now,
            ),
          });
        }
      }
    }
  } catch (error) {
    console.warn("[push] checking for notifications failed:", error);
  } finally {
    checking = false;
  }
}
