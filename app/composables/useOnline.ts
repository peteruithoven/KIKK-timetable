/** Whether the device has a network connection. Kept up to date by plugins/offline.client.ts. */
export function useOnline() {
  return useState("online", () => true);
}
