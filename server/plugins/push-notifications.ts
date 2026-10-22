// Checks every minute for favorites about to start, see sendDueNotifications().
export default defineNitroPlugin((nitroApp) => {
  // Not while prerendering or building.
  if (import.meta.prerender) return;
  const timer = setInterval(() => void sendDueNotifications(), 60_000);
  timer.unref();
  nitroApp.hooks.hook("close", () => clearInterval(timer));
});
