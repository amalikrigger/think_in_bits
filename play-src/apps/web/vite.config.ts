import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const outDir = fileURLToPath(new URL("../../../play", import.meta.url));

// Until deployment is decided, the build output in /play is kept out of git: it would
// otherwise ship to thinkinbits.site/play with no game server behind it.
// Delete play/.gitignore deliberately when it is time to publish.
const keepBuildOutOfGit: Plugin = {
  name: "bitblitz-keep-build-out-of-git",
  apply: "build",
  closeBundle() {
    writeFileSync(`${outDir}/.gitignore`, "# BitBlitz build output: not committed until deployment is decided.\n*\n");
  },
};

// The site's logo lives at /images on thinkinbits.site; in dev, serve it from the repo so the
// game references the real file instead of bundling a 150 KB copy.
const serveSiteImages: Plugin = {
  name: "bitblitz-serve-site-images",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/images", (req, res, next) => {
      const file = `${repoRoot}/images${(req.url ?? "").split("?")[0]}`;
      const url = req.url ?? "";
      if (!/^[\w/.-]+$/.test(url) || url.includes("..") || !existsSync(file)) return next();
      res.setHeader("Content-Type", "image/png");
      res.end(readFileSync(file));
    });
  },
};

export default defineConfig({
  base: "/play/",
  plugins: [react(), tailwindcss(), keepBuildOutOfGit, serveSiteImages],
  build: { outDir, emptyOutDir: true },
  server: {
    port: 5173,
    // The site's tokens and logo are imported from the repo root rather than copied.
    fs: { allow: [repoRoot] },
    // Phones on the classroom Wi-Fi only need to reach this one port.
    proxy: { "/api": { target: "http://127.0.0.1:8787", ws: true, changeOrigin: false } },
  },
  preview: {
    port: 4173,
    proxy: { "/api": { target: "http://127.0.0.1:8787", ws: true } },
  },
});
