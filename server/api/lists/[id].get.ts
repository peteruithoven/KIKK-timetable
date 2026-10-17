export default defineEventHandler(async (event) => {
  const list = await readList(parseListId(getRouterParam(event, "id")));
  if (!list) throw createError({ statusCode: 404, statusMessage: "List not found" });
  return list;
});
