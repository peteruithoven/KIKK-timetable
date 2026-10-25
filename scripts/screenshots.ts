// Takes the phone screenshots in the README from a running dev server and saves them as WebP in
// docs/screenshots/. Pass names to retake only those: `vp run screenshots map favorites`.
// Each run creates a new favorites list on the server.
import { launch, type Page } from "puppeteer-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "/usr/bin/google-chrome";
const OUT_DIR = new URL("../docs/screenshots/", import.meta.url);

// The festival is over, so the browser's clock is set to Friday morning: the timetable shows the
// time marker and the favorites list doesn't hide everything as past.
const NOW = "2026-10-23T10:50:00+02:00";
// Just north of the Théâtre, so the map centers on the venues.
const LOCATION = { latitude: 50.4645, longitude: 4.8668, accuracy: 10 };

const LIST_LABEL = "Peter";
// Pages as `<kind>/<slug>` or `trail/<slug>`. Tim Rodenbröker's and Gwenaël Frannois's talks
// overlap, to show the warning.
const FAVORITES = [
  "talk/mario-klingemann-talk-kikk2026",
  "talk/tim-rodenbroker-talk-kikk2026",
  "talk/gwenael-frannois-talk-kikk2026",
  "talk/memo-akten-katie-hofstadter-talk-kikk2026",
  "talk/haque-tan-talk-kikk2026",
  "talk/david-sheldon-hicks-talk-kikk2026",
  "party/kikk-after-party-party-kikk2026",
  "trail/martin-messier",
  "trail/cascade",
];

interface Shot {
  name: string;
  path: string | ((listId: string) => string);
  dark?: boolean;
  /** Runs after the page has loaded and settled. */
  prepare?: (page: Page) => Promise<void>;
}

const SHOTS: Shot[] = [
  { name: "timetable", path: "/?day=2026-10-23" },
  {
    name: "filters",
    path: "/?day=2026-10-23",
    prepare: async (page) => {
      await page.locator("button::-p-text(Filter)").click();
      await settle(500);
    },
  },
  { name: "event", path: "/talk/gavin-strange-talk-kikk2026" },
  { name: "photo", path: "/talk/type-to-image-talk-kikk2026?photo=8", prepare: () => settle(2000) },
  { name: "favorites", path: (listId) => `/list/${listId}` },
  { name: "trail", path: "/trail" },
  { name: "work-dark", path: "/trail/cascade", dark: true },
  {
    name: "map",
    path: "/map?trail",
    prepare: async (page) => {
      await page.locator("::-p-aria(Show my location)").click();
      await page.waitForSelector(".maplibregl-user-location-dot");
      // The map flies to the location.
      await settle(4000);
    },
  },
];

function settle(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

async function createList(): Promise<string> {
  const [{ events }, { installations }] = await Promise.all([
    fetchJson<{ events: { id: string; kind: string; slug: string }[] }>("/api/events"),
    fetchJson<{ installations: { id: string; slug: string }[] }>("/api/trail"),
  ]);
  const ids = new Map<string, string>([
    ...events.map((event) => [`${event.kind}/${event.slug}`, event.id] as const),
    ...installations.map((item) => [`trail/${item.slug}`, item.id] as const),
  ]);
  const add = FAVORITES.map((path) => {
    const id = ids.get(path);
    if (!id) throw new Error(`Favorite not found: ${path}`);
    return id;
  });
  const json = { method: "POST", headers: { "content-type": "application/json" } };
  const { id } = await fetchJson<{ id: string }>("/api/lists", {
    ...json,
    body: JSON.stringify({ add }),
  });
  await fetchJson(`/api/lists/${id}`, {
    ...json,
    method: "PATCH",
    body: JSON.stringify({ label: LIST_LABEL }),
  });
  return id;
}

const names = process.argv.slice(2);
const unknown = names.filter((name) => !SHOTS.some((shot) => shot.name === name));
if (unknown.length) {
  throw new Error(
    `Unknown screenshots: ${unknown.join(", ")}. Choose from ${SHOTS.map((shot) => shot.name).join(", ")}.`,
  );
}
const shots = names.length ? SHOTS.filter((shot) => names.includes(shot.name)) : SHOTS;

const listId = await createList();
const browser = await launch({
  executablePath: CHROME,
  // SwiftShader gives MapLibre WebGL without a GPU.
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
});
try {
  const context = await browser.createBrowserContext();
  await context.overridePermissions(BASE_URL, ["geolocation"]);
  const page = await context.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await page.setUserAgent({
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  });
  await page.emulateTimezone("Europe/Brussels");
  await page.setGeolocation(LOCATION);
  await page.setCookie({ name: "kikk-list", value: listId, url: BASE_URL });
  await page.evaluateOnNewDocument((now: number) => {
    const offset = now - Date.now();
    const RealDate = Date;
    class FakeDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length) super(...(args as [number, number]));
        else super(RealDate.now() + offset);
      }
      static override now() {
        return RealDate.now() + offset;
      }
    }
    globalThis.Date = FakeDate as DateConstructor;
    // Keep the notifications dialog and section closed.
    localStorage.setItem("kikk-notifications-offered", "1");
    localStorage.setItem("kikk-open-sections", JSON.stringify({ notifications: false }));
  }, Date.parse(NOW));

  for (const shot of shots) {
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: shot.dark ? "dark" : "light" },
    ]);
    const path = typeof shot.path === "string" ? shot.path : shot.path(listId);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: "#nuxt-devtools-container { display: none !important; }" });
    await settle(1500);
    await shot.prepare?.(page);
    const file = new URL(`${shot.name}.webp`, OUT_DIR);
    await page.screenshot({ path: file.pathname as `${string}.webp`, type: "webp", quality: 82 });
    console.log(`Saved ${file.pathname}`);
  }
} finally {
  await browser.close();
}
