import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * `vite preview` must serve `index.html` for client routes like `/round/:id` (same as Vercel
 * rewrites in `vercel.json`). This middleware rewrites non-file GET paths to `/index.html`.
 */
function previewSpaFallback() {
  return {
    name: "preview-spa-fallback",
    apply: "build",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }
        const raw = req.url ?? "/";
        const pathOnly = raw.split("?")[0] ?? "/";
        if (pathOnly === "/" || pathOnly === "/index.html") {
          next();
          return;
        }
        if (pathOnly.startsWith("/@") || pathOnly.startsWith("/node_modules/") || pathOnly.startsWith("/.well-known/")) {
          next();
          return;
        }
        if (pathOnly.startsWith("/assets/") || /\/[a-f0-9-]+\.(js|css|mjs)($|\?)/i.test(pathOnly)) {
          next();
          return;
        }
        if (pathOnly.includes(".") && !pathOnly.endsWith("/")) {
          const ext = pathOnly.slice(pathOnly.lastIndexOf("."));
          if (ext && ext.length <= 6 && /^\.\w+$/.test(ext)) {
            next();
            return;
          }
        }
        const q = raw.includes("?") ? `?${raw.split("?").slice(1).join("?")}` : "";
        req.url = `/index.html${q}`;
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), previewSpaFallback()],
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/avatars-static": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.js", "receipts/**/*.test.ts"],
  },
});
