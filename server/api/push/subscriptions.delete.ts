export default defineEventHandler(async (event) => {
  const { endpoint } = parseSubscription((await readBody(event))?.subscription);
  await removeSubscription(endpoint);
  return { ok: true };
});
