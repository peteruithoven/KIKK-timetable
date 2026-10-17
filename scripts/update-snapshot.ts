// Refreshes the committed fallbacks used when KIKK can't be reached and no
// data has been fetched yet (e.g. a fresh deploy).
import { writeFile } from "node:fs/promises";
import { fetchKikkData, fetchTrailData } from "../server/utils/kikk-api.ts";

const config = {
  supabaseUrl: process.env.NUXT_SUPABASE_URL ?? "",
  supabaseKey: process.env.NUXT_SUPABASE_KEY ?? "",
  trailSupabaseUrl: process.env.NUXT_TRAIL_SUPABASE_URL ?? "",
  trailSupabaseKey: process.env.NUXT_TRAIL_SUPABASE_KEY ?? "",
};
const snapshots = {
  "kikk-snapshot.json": await fetchKikkData(config),
  "trail-snapshot.json": await fetchTrailData(config),
};

for (const [name, data] of Object.entries(snapshots)) {
  const file = new URL(`../server/assets/${name}`, import.meta.url);
  await writeFile(file, JSON.stringify({ fetchedAt: new Date().toISOString(), data }) + "\n");
  const counts = Object.entries(data).map(([table, rows]) => `${rows.length} ${table}`);
  console.log(`Saved ${counts.join(", ")} to ${file.pathname}`);
}
