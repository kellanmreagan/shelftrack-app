import { copyFileSync, writeFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/shelftrack-app/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "ShelfTrack",
        short_name: "ShelfTrack",
        description:
          "Local-first tracker for 3.75-inch Star Wars figures: Kenner, The Vintage Collection, and Retro Collection.",
        theme_color: "#0b0c0f",
        background_color: "#0b0c0f",
        display: "standalone",
        start_url: "/shelftrack-app/",
        scope: "/shelftrack-app/",
        lang: "en",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,ico}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
    {
      name: "gh-pages-spa-fallback",
      closeBundle() {
        copyFileSync("dist/index.html", "dist/404.html");
        writeFileSync("dist/.nojekyll", "");
      },
    },
  ],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
