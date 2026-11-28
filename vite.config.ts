// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [VitePWA({
    strategies: "generateSW", filename: "sw.js", outDir: "dist/client",
    injectRegister: null, registerType: "autoUpdate", manifest: false,
    devOptions: { enabled: false },
    workbox: {
      globPatterns: ["assets/**/*.{js,css,webp,png,jpg,woff2}"],
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        { urlPattern: ({ request, url, sameOrigin }) => sameOrigin && request.mode === "navigate" && !url.pathname.startsWith("/~oauth"), handler: "NetworkFirst", options: {
          cacheName: "rozitta-pages-v1", networkTimeoutSeconds: 3, expiration: { maxEntries: 40 },
          plugins: [{ handlerDidError: async () => {
            const cache = await caches.open("rozitta-pages-v1");
            const shell = await cache.match("/");
            if (!shell) throw new Error("No offline app shell");
            return shell;
          } }],
        } },
        { urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/assets\/.*-[a-zA-Z0-9_-]{6,}\.(js|css|webp|png|jpg|woff2)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "rozitta-assets-v1", expiration: { maxEntries: 350 } } },
      ],
    },
  })],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // STATIC_BUILD=1 bun run build → static site (for Layero etc.); data goes browser → database directly.
    ...(process.env['STATIC_BUILD'] ? { spa: { enabled: true } } : {}),
  },
});
