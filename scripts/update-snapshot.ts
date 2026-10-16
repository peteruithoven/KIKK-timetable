// Refreshes the committed fallback used when KIKK can't be reached and no
// data has been fetched yet (e.g. a fresh deploy).
import { writeFile } from "node:fs/promises";
import { fetchKikkData } from "../server/utils/kikk-api.ts";

const file = new URL("../server/assets/kikk-snapshot.json", import.meta.url);
const data = await fetchKikkData({
  supabaseUrl: process.env.NUXT_SUPABASE_URL ?? "",
  supabaseKey: process.env.NUXT_SUPABASE_KEY ?? "",
});
await writeFile(file, JSON.stringify({ fetchedAt: new Date().toISOString(), data }) + "\n");

const counts = Object.entries(data).map(([table, rows]) => `${rows.length} ${table}`);
console.log(`Saved ${counts.join(", ")} to ${file.pathname}`);
