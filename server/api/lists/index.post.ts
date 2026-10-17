// Creates a list, or restores and merges into an existing one when an id is given.
// Either way this browser now uses that list.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: unknown } | undefined>(event);
  const id = body?.id === undefined ? undefined : parseListId(body.id);
  const list = (await updateList(event, id, parseChanges(body), { create: true }))!;
  setListCookie(event, list.id);
  return list;
});
