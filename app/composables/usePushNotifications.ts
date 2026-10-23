/**
 * - `unknown`: not checked yet, e.g. during server rendering.
 * - `unsupported`: no push in this browser, or no service worker (it only runs in production).
 * - `install`: iOS, which only supports push in apps added to the home screen.
 * - `denied`: blocked in the browser's settings.
 */
export type PushStatus = "unknown" | "unsupported" | "install" | "denied" | "off" | "on";

/** The first favorite's dialog was shown. */
export type PushFlag = "kikk-notifications-offered";

export function readPushFlag(key: PushFlag): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writePushFlag(key: PushFlag) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Storage can be unavailable, e.g. in private browsing. Then it's shown again.
  }
}

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPads present themselves as Macs.
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  const existing = await navigator.serviceWorker.getRegistration();
  // On first launch, e.g. of an app just added to the iOS home screen (it doesn't share Safari's
  // worker), the worker registers after the page loads. It never does in development.
  if (existing || import.meta.dev) return existing;
  return navigator.serviceWorker.ready;
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(
    (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"),
  );
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Notifications NOTIFY_MINUTES_BEFORE favorites start, sent by the server (server/utils/push.ts). */
export function usePushNotifications() {
  const status = useState<PushStatus>("push-status", () => "unknown");
  const favorites = useFavorites();

  async function check(): Promise<PushSubscription | null> {
    const supported = "PushManager" in window && "Notification" in window;
    const worker = supported ? await registration() : undefined;
    if (!worker?.pushManager) {
      const standalone = matchMedia("(display-mode: standalone)").matches;
      status.value = isIos() && !standalone ? "install" : "unsupported";
      return null;
    }
    if (Notification.permission === "denied") {
      status.value = "denied";
      return null;
    }
    const subscription = await worker.pushManager.getSubscription();
    status.value = subscription && Notification.permission === "granted" ? "on" : "off";
    return status.value === "on" ? subscription : null;
  }

  async function save(subscription: PushSubscription) {
    await $fetch("/api/push/subscriptions", {
      method: "POST",
      body: { subscription: subscription.toJSON(), listId: favorites.listId.value },
    });
  }

  /** Asks for permission and subscribes. False when permission wasn't given, throws on failure. */
  async function enable(): Promise<boolean> {
    // Must come before anything is awaited: Safari only asks while handling the tap, otherwise
    // it silently denies.
    if ((await Notification.requestPermission()) !== "granted") {
      await check();
      return false;
    }
    // Saves the list first if this device has none yet.
    await favorites.flush();
    if (!favorites.listId.value) throw new Error("No favorites list");
    const worker = await navigator.serviceWorker.ready;
    const { publicKey } = await $fetch<{ publicKey: string }>("/api/push/key");
    const options = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    };
    let subscription: PushSubscription;
    try {
      subscription = await worker.pushManager.subscribe(options);
    } catch (error) {
      // Subscribed with another key, e.g. after the server's data was lost.
      const existing = await worker.pushManager.getSubscription();
      if (!existing) throw error;
      await existing.unsubscribe();
      subscription = await worker.pushManager.subscribe(options);
    }
    await save(subscription);
    status.value = "on";
    return true;
  }

  async function disable() {
    const subscription = await (await registration())?.pushManager.getSubscription();
    if (subscription) {
      await $fetch("/api/push/subscriptions", {
        method: "DELETE",
        body: { subscription: subscription.toJSON() },
      }).catch(() => {});
      await subscription.unsubscribe();
    }
    status.value = "off";
  }

  /** Tells the server again which list this browser uses, e.g. after switching lists. */
  async function sync() {
    const subscription = await check();
    if (subscription && favorites.listId.value) await save(subscription).catch(() => {});
  }

  return { status: readonly(status), enable, disable, sync };
}
