import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-10-16",
  devtools: { enabled: true },
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
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
  runtimeConfig: {
    // Set through NUXT_SUPABASE_URL and NUXT_SUPABASE_KEY, see .env.example.
    supabaseUrl: "",
    supabaseKey: "",
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
