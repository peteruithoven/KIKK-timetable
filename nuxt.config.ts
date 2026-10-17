import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-10-16",
  devtools: { enabled: true },
  modules: ["@nuxt/icon", "@vite-pwa/nuxt"],
  icon: {
    // Icon sets come from installed @iconify-json/* packages, never the public Iconify API.
    serverBundle: "local",
    clientBundle: { scan: true },
    fallbackToApi: false,
  },
  pwa: {
    // Installable and usable offline, see service-worker/sw.ts.
    strategies: "injectManifest",
    srcDir: fileURLToPath(new URL("./service-worker", import.meta.url)),
    filename: "sw.ts",
    registerType: "autoUpdate",
    // Uses public/site.webmanifest from RealFaviconGenerator.
    manifest: false,
    injectManifest: {
      // Pages are cached by the service worker itself.
      globPatterns: ["**/*.{js,css,woff2,svg,png,ico,webmanifest}"],
      // Only for link previews.
      globIgnores: ["og-image.png"],
    },
  },
  css: [
    // The fonts kikkfestival.be uses, served by the app itself.
    "@fontsource-variable/inter-tight/wght.css",
    "@fontsource/poppins/300.css",
    "@fontsource/poppins/400.css",
    "~/assets/css/main.css",
  ],
  app: {
    head: {
      title: "kikk-timetable",
      htmlAttrs: { lang: "en" },
      // Generated with RealFaviconGenerator.
      link: [
        { rel: "icon", type: "image/png", href: "/favicon-96x96.png", sizes: "96x96" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "shortcut icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
      meta: [
        { name: "apple-mobile-web-app-title", content: "Timetable" },
        { name: "theme-color", content: "#ffffff" },
        // Light only, also for the browser UI (like Android's navigation bar).
        { name: "color-scheme", content: "light" },
      ],
    },
  },
  runtimeConfig: {
    // Set through NUXT_SUPABASE_URL and NUXT_SUPABASE_KEY, see .env.example.
    supabaseUrl: "",
    supabaseKey: "",
    // The art trail app, NUXT_TRAIL_SUPABASE_URL and NUXT_TRAIL_SUPABASE_KEY.
    trailSupabaseUrl: "",
    trailSupabaseKey: "",
  },
  nitro: {
    storage: {
      // Favorites and the last fetched schedule and art trail. In Docker this is a volume, see compose.yaml.
      data: { driver: "fsLite", base: "./.data/kv" },
    },
  },
  typescript: {
    nodeTsConfig: {
      include: ["../scripts/**/*"],
      compilerOptions: { types: ["node"] },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
