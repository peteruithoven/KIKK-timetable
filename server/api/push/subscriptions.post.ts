// Notifications before this browser's favorites start. Sent again when the browser switches
// lists, or by the service worker with `replaces` when the browser renewed its subscription.
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Record<string, unknown> | undefined;
  const subscription = parseSubscription(body?.subscription);
  const replaces = typeof body?.replaces === "string" ? body.replaces : undefined;
  const listId =
    body?.listId === undefined && replaces
      ? (await findSubscription(replaces))?.listId
      : parseListId(body?.listId);
  if (!listId || !(await readList(event, listId))) {
    throw createError({ statusCode: 404, statusMessage: "List not found" });
  }
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  // Push services want an https URL or email address to contact, not a local one.
  const origin =
    url.protocol === "https:" ? url.origin : "https://github.com/peteruithoven/KIKK-timetable";
  await saveSubscription(subscription, listId, origin, replaces);
  return { ok: true };
});
