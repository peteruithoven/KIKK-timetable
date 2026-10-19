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

## Favorites

- No accounts. Lists live in Nitro storage as `favorites:<id>` (ids like `brave-otter-4821`), via `/api/lists`. The id is the share link (`/list/<id>`) and gives edit access.
- The server sets the `kikk-list` cookie (server-set cookies survive Safari's 7 day cleanup). `app/plugins/favorites.ts` loads the list during SSR. `useFavorites` updates optimistically, queues unsaved changes and keeps a localStorage backup that can recreate the list.
- Switching to a shared list ("Switch to this list on this device", `adopt()`) asks for confirmation when the device has favorites, and remembers the old id in localStorage (`kikk-previous-lists`). Nothing else knows it. List pages show the non-empty ones under "Your lists", plus the one in use when viewing another list.
- Lists have an optional `label` (PATCH `{ label }`, empty removes it). It's shared like the favorites, and shown instead of the id, which stays the link. Labels can be personal: give elements that show one the `ph-sensitive` class (PostHog autocapture skips their text) and keep them out of page titles.
- A list's `events` holds both event and installation ids (`installation:uuid`); the name predates installations.
- Stored lists keep a `paths` map (event id to `kind/slug`, installation id to `trail/slug`) so favorites follow events Kikk re-creates under a new id. It's internal, the API doesn't return it.
- `/api/lists/<id>/calendar.ics` is a subscribable calendar (`server/utils/ical.ts`).

## Offline / PWA

- `@vite-pwa/nuxt` with a custom worker in `service-worker/sw.ts` (own `tsconfig.json`). It only runs in production builds. The manifest is `public/site.webmanifest` (`manifest: false` in the module).
- The module strips `.html` from precached URLs, so `public/offline.html` is cached in the worker's install step instead. Don't add `html` to `globPatterns`.
- The manifest has no `theme_color` on purpose. Installed apps (Chrome, Firefox) paint Android's navigation bar with it, while its buttons follow the phone's dark mode: white on white. Without it the bar follows the phone's theme. The status bar uses the `theme-color` meta tag.

## Analytics

- PostHog (`posthog-js`), client-side only, in `app/plugins/posthog.client.ts`. Components use `$posthog?.capture(…)` from `useNuxtApp()`; it's `undefined` when PostHog isn't configured, which only warns in dev.
- Configured with `NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NUXT_PUBLIC_POSTHOG_HOST`, read at runtime (`runtimeConfig.public.posthog` in `nuxt.config.ts`). Don't read `process.env` there: the Docker build has no `.env`.
- `cookieless_mode: "always"`: PostHog stores nothing in the browser, so there's no cookie banner. Keep it that way; don't call `posthog.identify()`. Cookieless mode must also be on in the PostHog project settings, or events are dropped (still with a 200 response). It also rules out session replay: posthog-js won't record in cookieless mode.
- `before_send` replaces favorites list ids (they give edit access) with `:id` in every string and key of an event, including URL-encoded ones in calendar links.

## UI

- Kikk style: black (`ink`) and white, a little gray, no rounded corners, Inter Tight (`font-display`) and Poppins, self-hosted through Fontsource. Tokens are in `app/assets/css/main.css`.
- Cut top right corner: `clip-corner` for filled elements (bevel, `clip-path` fallback) and `bevel-corner` for outlined ones (bevel only; a `clip-path` would leave a gap in the border).
- Icons: `<Icon name="material-symbols:…">` from the locally installed `@iconify-json/material-symbols`. The Iconify API fallback is off, so install the `@iconify-json/*` package before using another set, then restart the dev server.
- Timetable: everything scales with `pxPerMinute` (pinch zoom, `useVerticalZoom`). The body cells of the grid have explicit grid positions so the favorites bar layer can overlap them. Favorite bars are sticky, positioned with a spacer (a margin can't move out of a sticky container), and shown only when their block is out of view (IntersectionObserver).
- Map (`/map`): MapLibre with OpenFreeMap's dark style, loaded client-side only. Its worker URL is set with `setWorkerUrl` from a `?url` import; MapLibre's own runtime URL breaks in Vite (dev pre-bundling and production build).
- Venues on the map: hardcoded in `app/utils/venues.ts` (coordinates from kikkfestival.be/map, art trail places from the trail app's `locations`; their names are mapped with `VENUE_ALIASES` in `kikk-mapping.ts`), drawn as symbol layers by `app/utils/map-layers.ts` (one per venue; changing a layout property fades all symbols out and in). They're added to the style with `transformStyle`, not on `load`, so they show with the first frame; the highlight is a `global-state` expression. `/map?venue=<key>` highlights one by dimming the others, without moving the view. Clicking a pin sets it, clicking elsewhere clears it (`router.replace`, so Back leaves the map). A selected venue gets `MapVenueBar`: Google Maps directions (no well supported app-neutral link exists), its events (`/?venue=`) and its art trail section (`/trail#<key>`). Timetable column headers and event pages link there via `venueMapPath()`. The timetable's venue select lists the ones with events.
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

- Docker Compose on a VPS behind an HTTPS reverse proxy that must send `X-Forwarded-Proto` and `X-Forwarded-Host` (secure cookie, absolute links). The `data` volume (`/app/.data`) holds favorites and the schedule and art trail caches; back it up.
- Server: `kikk@bratwurst:~/KIKK-timetable` (reachable over the tailnet only). Pushing to `main` deploys: a systemd timer (`deploy/kikk-timetable-deploy.{service,timer}`, installed in `/etc/systemd/system/`) runs `deploy/deploy.sh` every minute as `kikk`. It fetches over HTTPS, and when `origin/main` differs from `refs/deployed` it fast-forwards and runs `docker compose up -d --build`. A failed build isn't retried; push a fix or run `vp run server:deploy`, which forces a rebuild. Logs: `journalctl -u kikk-timetable-deploy`. After changing the unit files, copy them again and run `systemctl daemon-reload` as root.
- `vp run server:backup` downloads `/app/.data` to `backups/` (gitignored, contains user data). Don't run it or `server:deploy` without being asked.
