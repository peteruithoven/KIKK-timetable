// Keeps the server's link between this browser's push subscription and its list up to date.
export default defineNuxtPlugin(() => {
  const favorites = useFavorites();
  const push = usePushNotifications();
  onNuxtReady(() => {
    void push.sync();
    watch(favorites.listId, () => void push.sync());
  });
});
