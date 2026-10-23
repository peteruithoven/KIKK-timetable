<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Project: Nuxt + Tailwind

This is a Nuxt 4 app styled with Tailwind CSS v4. Vite+ provides the tooling (check, lint, fmt, staged hooks); Nuxt runs the app.

## Commands

- Use `vp run dev`, `vp run build`, `vp run generate` and `vp run preview`. These scripts call `nuxt`. The built-ins `vp dev` and `vp build` start plain Vite and do not work for this app.
- `vp run postinstall` runs `nuxt prepare`, which regenerates the types in `.nuxt/`. Run it if types for auto-imports or components are missing.
- `vp check` does not type-check code inside `.vue` files. Use `pnpm --package=vue-tsc@3 --package=typescript@6.0.3 dlx vue-tsc --noEmit -p .nuxt/tsconfig.app.json`. Without the TypeScript pin, dlx pulls TypeScript 7, which vue-tsc can't load.
- `npx` refuses to run here (pnpm `devEngines`). Use `vp exec <bin>`, e.g. `vp exec tsc -p service-worker/tsconfig.json` for the service worker.
- CI (`.github/workflows/ci.yml`) runs on pull requests: `vp check`, both type checks above, `vp test` and `vp run build`.
- pnpm is pinned to 10.30.2 in `devEngines`, matching the Dockerfile and the lockfile. CI downloads that version, locally the global pnpm is used. Moving to pnpm 11+ means regenerating the lockfile (it then records pnpm itself) and allowing or ignoring the esbuild and core-js build scripts in `pnpm-workspace.yaml`, since ignored builds are an error there.

## Configuration

- `vite.config.ts` holds Vite+ tooling config only. Nuxt never loads it. Put Vite options and plugins under the `vite` key in `nuxt.config.ts`.
- The `NUXT_B5004` warning about `vite.config.ts` during `vp run dev` is expected. Do not delete or rename `vite.config.ts` to silence it.

## Structure

- App code lives in `app/` (Nuxt 4 `srcDir`): `app/app.vue`, and `app/pages/`, `app/components/`, `app/composables/` as needed. Static files go in the root `public/`.
- Nuxt auto-imports Vue APIs (`ref`, `computed`), Nuxt composables (`useFetch`, `useState`) and components from `app/components/`. Explicit imports for these are not needed.

## Tailwind

- Tailwind v4 is CSS-first: there is no `tailwind.config.js`. It is loaded through `@tailwindcss/vite` in `nuxt.config.ts`.
- The entry stylesheet is `app/assets/css/main.css`. Add theme tokens there with `@theme`.
- Do not add `@nuxtjs/tailwindcss` or a PostCSS config.

# Project notes

Unofficial KIKK Festival 2026 timetable (Namur, 22–24 Oct). Styled after kikkfestival.be.

## Data

- Source: Kikk's Supabase REST API, tables `conferences` (talks), `by_night_events` (parties) and `panels`, filtered on `status=eq.published`. Same queries as kikkfestival.be/schedule. Credentials come from `NUXT_SUPABASE_URL` / `NUXT_SUPABASE_KEY` (the public anon key in the kikkfestival.be JS bundle). `.env.example` leaves them empty on purpose.
- `server/utils/kikk-api.ts` fetches, `kikk-mapping.ts` maps rows to `FestivalEvent` (`shared/types/festival-event.ts`), `kikk-cache.ts` serves `/api/events`: memory, then `.data/kv` (Nitro `data` storage), then the committed fallback `server/assets/kikk-snapshot.json`. Refresh that with `vp run snapshot` (excluded from formatting).
- `kikk-api.ts` must not use Nitro auto-imports: `scripts/update-snapshot.ts` imports it and runs on plain Node.
- Row quirks: talks use `date`, others `event_date`. Times are `HH:mm:ss`, parties end past midnight, some have no end. The venue is in `room_name`, `location` or `venue`, sometimes `""`. `description` is French, `description_en` English. CMS HTML is sanitized in `kikk-mapping.ts`; a lone `<br />` counts as empty.
- Event ids are `kind:uuid`. Pages are `/<kind>/<slug>` (`talk`, `panel`, `party`), backed by `/api/events/<kind>/<slug>`.
- Images: `resizedImage()` uses Supabase's `/storage/v1/render/image/` endpoint. Keep `crossorigin="anonymous"` on event images, the service worker relies on it.

## Art trail

- `/trail` and `/trail/<slug>`, backed by `/api/trail` and `/api/trail/<slug>`. Installations aren't timed, so they're their own type (`shared/types/installation.ts`), not a `FestivalEvent` kind. They can be favorites, but aren't in the calendar. Slugs are Kikk's without the `-art-trail-kikk2026` suffix.
- Two sources, fetched by `fetchTrailData()`: Kikk's `installations` table (texts in both languages, images, links; its `location` is mostly the artist's country) and the Supabase project of Kikk's art trail app exhibitions.kikkfestival.be (`NUXT_TRAIL_SUPABASE_URL` / `_KEY`, public anon key from that app's bundle): `entries`, `locations` and `artists`, for the place, year, materials, portrait and properly cased artist names. Rows are matched on title, loosely, as titles differ ("LADDER", "L'échelle - Ladder"); see `findByName()` in `kikk-mapping.ts`.
- `kikk-cache.ts` caches it separately from the schedule (`kikk:trail`, fallback `server/assets/trail-snapshot.json`, also written by `vp run snapshot`), so a broken trail source never blocks schedule updates.
- The overview groups works by place, north to south.
- On a work's page, swiping left or right (`useSwipeNavigation`) goes to the next or previous work in the overview's order, with `router.replace` so Back returns to the overview. Swipes from the screen edges, on horizontal scrollers (the gallery) or on a zoomed page are ignored. The page sets `overscroll-x-none` on `<html>` so Chrome doesn't also go back.

## Favorites

- No accounts. Lists live in Nitro storage as `favorites:<id>` (ids like `brave-otter-4821`), via `/api/lists`. The id is the share link (`/list/<id>`) and gives edit access.
- The server sets the `kikk-list` cookie (server-set cookies survive Safari's 7 day cleanup). `app/plugins/favorites.ts` loads the list during SSR. `useFavorites` updates optimistically, queues unsaved changes and keeps a localStorage backup that can recreate the list.
- Switching to a shared list ("Switch to this list on this device", `adopt()`) asks for confirmation when the device has favorites, and remembers the old id in localStorage (`kikk-previous-lists`). Nothing else knows it. List pages show the non-empty ones under "Your lists", plus the one in use when viewing another list.
- Lists have an optional `label` (PATCH `{ label }`, empty removes it). It's shared like the favorites, and shown instead of the id, which stays the link. Labels can be personal: give elements that show one the `ph-sensitive` class (PostHog autocapture skips their text) and keep them out of page titles.
- A list's `events` holds both event and installation ids (`installation:uuid`); the name predates installations.
- Stored lists keep a `paths` map (event id to `kind/slug`, installation id to `trail/slug`) so favorites follow events Kikk re-creates under a new id. It's internal, the API doesn't return it.
- The list page hides favorites that are over (`hasEnded()`: `endsAt`, or an hour after the start), with a "Show N past favorites" row per day that shows them dimmed. The time comes from the server render (`useState`), so hydration hides the same ones.
- `/api/lists/<id>/calendar.ics` is a subscribable calendar (`server/utils/ical.ts`).

## Notifications

- Web Push, `NOTIFY_MINUTES_BEFORE` (10) minutes before a favorite starts, toggled in the list page's Notifications section (own list only, `NotificationsSection`, `usePushNotifications`). The section is open until someone closes it (`kikk-notifications-closed` in localStorage). The first favorite on a device opens `NotificationsDialog` once (`kikk-notifications-offered`), only when notifications are off but possible, or on iOS outside the home screen app, where it explains how to install. Only with the service worker, so production builds; iOS only in an app added to the home screen.
- The server's VAPID key pair is generated on first use and kept in Nitro storage (`push:vapid`); no configuration. Losing it invalidates every subscription, browsers then need to turn notifications on again.
- Subscriptions are `push:subscriptions:<hash of endpoint>`, linked to a list id, so favorites added on other devices count too. `app/plugins/push.client.ts` sends the subscription again on load and when the device switches lists. The service worker's `pushsubscriptionchange` moves a renewed subscription over (`replaces`).
- `server/plugins/push-notifications.ts` runs `sendDueNotifications()` (`server/utils/push.ts`) every minute. Each subscription remembers `eventId@startsAt` of what it got, so a moved event notifies again. Push services answering 404 or 410 remove the subscription. The VAPID subject is the site's https origin.
- `getFestivalEvents()`, `getInstallations()` and `readList()` take an optional `H3Event` for this background job.

## Offline / PWA

- `@vite-pwa/nuxt` with a custom worker in `service-worker/sw.ts` (own `tsconfig.json`). It only runs in production builds. The manifest is `public/site.webmanifest` (`manifest: false` in the module).
- The module strips `.html` from precached URLs, so `public/offline.html` is cached in the worker's install step instead. Don't add `html` to `globPatterns`.
- The manifest's `theme_color` and `background_color` are the dark `paper` (`#121212`), for Android's navigation bar in installed apps. Chrome paints the bar with `theme_color` and picks light or dark buttons by contrast (`CustomTabNavigationBarController` in recent Chrome, feature `WebAppNavigationBarThemeColor`). Without it, Chrome leaves the bar unpainted: the window shows through, filled with `background_color`, and the buttons follow the phone's theme, so they'd be dark on dark with a light phone (or white on white with a white background). The manifest has no dark variants and a page can't change the bar, so it's dark in both modes, and so is the splash screen. `theme_color` also colors the status bar while the app starts, until the `theme-color` meta tags (which follow the mode) apply. Installed apps pick up manifest changes when Chrome next updates the WebAPK (about a day), or after reinstalling.

## Analytics

- PostHog (`posthog-js`), client-side only, in `app/plugins/posthog.client.ts`. Components use `$posthog?.capture(…)` from `useNuxtApp()`; it's `undefined` when PostHog isn't configured, which only warns in dev.
- Configured with `NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NUXT_PUBLIC_POSTHOG_HOST`, read at runtime (`runtimeConfig.public.posthog` in `nuxt.config.ts`). Don't read `process.env` there: the Docker build has no `.env`.
- `cookieless_mode: "always"`: PostHog stores nothing in the browser, so there's no cookie banner. Keep it that way; don't call `posthog.identify()`. Cookieless mode must also be on in the PostHog project settings, or events are dropped (still with a 200 response). It also rules out session replay: posthog-js won't record in cookieless mode.
- `before_send` replaces favorites list ids (they give edit access) with `:id` in every string and key of an event, including URL-encoded ones in calendar links.

## UI

- Kikk style: black (`ink`) and white, a little gray, no rounded corners, Inter Tight (`font-display`) and Poppins, self-hosted through Fontsource. Tokens are in `app/assets/css/main.css`.
- Dark mode follows the system setting (`prefers-color-scheme`): `main.css` swaps the tokens, so `bg-ink text-paper` turns light on dark. Use `ink-soft`, `ink-muted` and `ink-faint` for gray text, not Tailwind's `neutral-*`, which don't switch. `palette-light` keeps the light tokens for parts that look the same in both modes: the photo viewer, the map's container and the full screen QR code. `public/offline.html` has its own copy of the colors.
- Cut top right corner: `clip-corner` for filled elements (bevel, `clip-path` fallback) and `bevel-corner` for outlined ones (bevel only; a `clip-path` would leave a gap in the border).
- Icons: `<Icon name="material-symbols:…">` from the locally installed `@iconify-json/material-symbols`. The Iconify API fallback is off, so install the `@iconify-json/*` package before using another set, then restart the dev server.
- Timetable: everything scales with `pxPerMinute` (pinch zoom, `useVerticalZoom`). The body cells of the grid have explicit grid positions so the favorites bar layer can overlap them. Favorite bars are sticky, positioned with a spacer (a margin can't move out of a sticky container), and shown only when their block is out of view (IntersectionObserver).
- Search, on the timetable and `/trail`: `SearchToggle` is a search button that opens a field, which grows to fill its row; pages pass `v-model:open` to make room (the art trail shows its nav buttons as icons on phones). On phones the timetable has no `SearchToggle`: its search, venue select and "Only favorites" (`?favorites`) are in `TimetableFilters`, a Filter button with a native popover (light dismiss, Escape) that counts the active filters. On wider screens they sit next to the days, favorites as a star toggle. `useSearchQuery()` keeps the text in `?q=` (`router.replace`) and sends it to PostHog once typing stops. `matchesSearch()` (`shared/utils/search.ts`) requires every word, ignoring case and accents. The timetable searches title, speakers, venue and `keywords` (companies, moderator, track, tags, added in `useSchedule`); columns without matches drop out, since `buildDayTimetable()` only makes columns for the events it gets. The art trail searches title, artist, place and medium; installations have no tags. Both also search intros and descriptions (English and French) from `/api/search-text`: folded plain text, each word once, by id. `useSearchText()` fetches it in the browser once there's a search, so it stays out of the page payload; the service worker caches it like the other API routes. The input uses 16px text, or iOS zooms in on focus.
- Gallery photos open full screen in `PhotoViewer` (a modal `<dialog>`), as `?photo=<n>` (from 1) on the event or work page, so Back closes it. Swiping (unless zoomed in), the arrow keys and the header's buttons go to the next or previous photo with `router.replace`. The area below the header works like a map (pinch or Ctrl + scroll to zoom, scroll or drag to move around). The viewer zooms the photo itself and blocks the browser's zoom there (Ctrl + scroll/plus, pinch, Safari's gesture events), so the header keeps its size. A zoomed photo is larger than its scroll area, so panning is native scrolling. Without zoom it cancels one-finger `touchmove`s: Chrome otherwise swipes back in the history from a modal dialog, whatever `overscroll-behavior` says. It loads a 2500px wide copy, not the original, so offline the service worker can fall back to the cached thumbnail.
- Map (`/map`): MapLibre with OpenFreeMap's dark style, loaded client-side only. Its worker URL is set with `setWorkerUrl` from a `?url` import; MapLibre's own runtime URL breaks in Vite (dev pre-bundling and production build). The zoom and location buttons are our own (`MapZoomControl`, `MapLocateControl`); `useMapGeolocation` triggers MapLibre's `GeolocateControl` (dot, follow mode), whose own button is hidden, and mirrors its `_watchState`.
- Venues on the map: hardcoded in `app/utils/venues.ts` (coordinates from kikkfestival.be/map, art trail places from the trail app's `locations`; their names are mapped with `VENUE_ALIASES` in `kikk-mapping.ts`), drawn as symbol layers by `app/utils/map-layers.ts` (one per venue; changing a layout property fades all symbols out and in). They're added to the style with `transformStyle`, not on `load`, so they show with the first frame; the highlight is a `global-state` expression. `/map?venue=<key>` highlights one by dimming the others, without moving the view. Clicking a pin sets it, clicking elsewhere clears it (`router.replace`, so Back leaves the map). A selected venue gets `MapVenueBar`: Google Maps directions (no well supported app-neutral link exists), its events (`/?venue=`) and its art trail section (`/trail#<key>`). Timetable column headers and event pages link there via `venueMapPath()`. The timetable's venue select lists the ones with events.
- Favorites list: between favorites it shows the break, and the walking time when the venue's place differs (`walkingMinutes()`, hardcoded from OpenStreetMap's foot router in `venues.ts`; a new place with events needs its pairs added). It turns red when the break is shorter than the walk.
- `public/favicon.svg` was edited after RealFaviconGenerator: no dark-mode invert (it made the Firefox Android home screen icon white on white).
- Link previews: `app.vue` sets the default `og:image` with its size, `og:url` and the canonical link (forwarded origin plus path, no query). Pages with an image override it with `ogImageMeta()`, which also clears the default size (`null`). The image, `public/og-image.png` (1200×630, excluded from precaching), is a screenshot of `og-image/OgImage.vue`: a Tailwind page served at `/og-image` during development only (`pages:extend` in `nuxt.config.ts`; `main.css` has an `@source` for the folder). After editing it, run `vp run og-image` with the dev server on port 3000.
- SEO: `/sitemap.xml` and `/robots.txt` are server routes (`server/routes/`), not static files, since they need the forwarded origin. The sitemap lists the static pages plus every event and installation from the caches. List pages (`/list/<id>`) stay out and are `noindex`. Event pages have schema.org `Event` JSON-LD and the home page `WebSite` (`app/utils/structured-data.ts`); Google requires a street address, so every venue in `venues.ts` has one.

## Gotchas

- Nuxt 4.6: in app code use `createError({ status, statusText })`; `statusCode`/`statusMessage` are deprecated. Server code (h3 v1) still uses `statusCode`.
- `$fetch` to typed routes with template strings can hit "excessive stack depth"; pass the type, e.g. `$fetch<FavoritesList>(…)`.
- The formatter rewrites unicode escapes of invisible characters (like the non-breaking space) into the literal character, also in Markdown. In regexes use `\p{Zs}` with the `u` flag.
- The user usually runs the dev server on port 3000. Editing `nuxt.config.ts` restarts it. `vp run build` writes the `.nuxt` folder it uses, so test production builds with Docker instead: `docker build -t kikk-timetable:test .` and `docker run --env-file .env -p 3125:3000 kikk-timetable:test`.
- Claude Code cloud sessions (claude.ai/code, the Claude app) install dependencies with a SessionStart hook (`.claude/settings.json` runs `scripts/cloud-setup.sh`, which does nothing locally). They use the project's own `vp` from `node_modules/.bin`, have no Supabase credentials (the server serves the committed snapshots) and can't reach Supabase or OpenFreeMap.
- Browser testing: Chrome is at `/usr/bin/google-chrome`; drive it with `puppeteer-core` installed outside the project. PostHog treats a browser with `navigator.webdriver` set as a bot and sends nothing; launch Chrome with `--disable-blink-features=AutomationControlled` to test analytics.

## Deployment

- Never change anything on a server without asking first, every time, even when it seems part of the task. That covers commands that write or restart anything (git, Docker, systemd, Caddy, files), running `deploy/*.sh` or the `server:*` scripts, and pushing or merging to `main`, which deploys. Read-only inspection is fine, but don't read secrets such as `.env`, and say what you ran.
- Docker Compose on a VPS behind an HTTPS reverse proxy that must send `X-Forwarded-Proto` and `X-Forwarded-Host` (secure cookie, absolute links). The `data` volume (`/app/.data`) holds favorites and the schedule and art trail caches; back it up.
- Server: `kikk@brezel:~/KIKK-timetable` (reachable over the tailnet only). Pushing to `main` deploys: a systemd timer (`deploy/kikk-timetable-deploy.{service,timer}`, installed in `/etc/systemd/system/`) runs `deploy/deploy.sh` every minute as `kikk`. It fetches over HTTPS, and when `origin/main` differs from `refs/deployed` it fast-forwards and runs `docker compose up -d --build`. A failed build isn't retried; push a fix or run `vp run server:deploy`, which forces a rebuild. Logs: `journalctl -u kikk-timetable-deploy`. `deploy/install.sh` sets this up (as root); run it again after changing the unit files.
- `vp run server:backup` downloads `/app/.data` to `backups/` (gitignored, contains user data). Don't run it or `server:deploy` without being asked.
