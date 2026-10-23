// Temporary: screenshots of the timetable's filter popover for PR #12. Removed before merging.
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const OUT = process.argv[2];
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--hide-scrollbars"],
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hideDevtools = "#nuxt-devtools-container { display: none !important }";

// Set up a favorites list on the first festival day, mostly at one venue.
const setupPage = await browser.newPage();
await setupPage.goto(BASE, { waitUntil: "networkidle2" });
const plan = await setupPage.evaluate(async () => {
  const { events } = await (await fetch("/api/events")).json();
  const day = [...new Set(events.map((event) => event.date))].sort()[0];
  const onDay = events
    .filter((event) => event.date === day && event.venue)
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  const options = [...document.querySelectorAll("select option")]
    .filter((option) => option.value !== "all")
    .map((option) => ({ value: option.value, text: option.textContent.trim() }));
  const counts = options.map((option) => ({
    ...option,
    events: onDay.filter((event) => event.venue.includes(option.text)),
  }));
  counts.sort((a, b) => b.events.length - a.events.length);
  const venue = counts[0];
  const favorites = [
    ...venue.events.slice(0, 4),
    ...onDay.filter((event) => !venue.events.includes(event)).slice(0, 3),
  ].map((event) => event.id);
  return { day, venue: venue.value, favorites };
});
console.log("plan", plan);

async function shoot(scheme, { width = 390, height = 844, mobile = true } = {}) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 2,
    isMobile: mobile,
    hasTouch: mobile,
  });
  // Each page gets its own favorites list (and cookie) in this browser.
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await page.evaluate(async (add) => {
    await fetch("/api/lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ add }),
    });
  }, plan.favorites);
  return page;
}

async function load(page, path) {
  await page.goto(BASE + path, { waitUntil: "networkidle2" });
  await page.addStyleTag({ content: hideDevtools });
  await sleep(1000);
}

const filterButton = "button[popovertarget]";

for (const scheme of ["light", "dark"]) {
  const page = await shoot(scheme);

  await load(page, `/?day=${plan.day}`);
  await page.screenshot({ path: `${OUT}/1-closed-${scheme}.png` });

  await page.click(filterButton);
  await sleep(400);
  await page.screenshot({ path: `${OUT}/2-open-${scheme}.png` });

  await page.select("[popover] select", plan.venue);
  await sleep(300);
  await page.click("[popover] button[aria-pressed]");
  await sleep(600);
  await page.screenshot({ path: `${OUT}/3-open-active-${scheme}.png` });

  await page.evaluate(() => document.querySelector("[popover]").hidePopover());
  await sleep(600);
  await page.screenshot({ path: `${OUT}/4-filtered-${scheme}.png` });

  await page.close();
}

const desktop = await shoot("light", { width: 1280, height: 720, mobile: false });
await load(desktop, `/?day=${plan.day}&favorites`);
await desktop.screenshot({ path: `${OUT}/5-desktop-light.png` });

await browser.close();
