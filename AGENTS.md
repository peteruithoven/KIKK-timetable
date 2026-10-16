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
- `vp check` does not type-check code inside `.vue` files.

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
