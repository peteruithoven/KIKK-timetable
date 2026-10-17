// Adds and removes favorites. Changes rather than the full list, so devices sharing a
// list don't overwrite each other.
export default defineEventHandler(async (event) => {
  const id = parseListId(getRouterParam(event, "id"));
  const list = await updateList(event, id, parseChanges(await readBody(event)));
  if (!list) throw createError({ statusCode: 404, statusMessage: "List not found" });
  return list;
});
