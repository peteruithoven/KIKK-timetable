// The public key browsers subscribe to push notifications with.
export default defineEventHandler(async () => ({ publicKey: (await getVapidKeys()).publicKey }));
