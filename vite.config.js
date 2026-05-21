import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  plugins: [
    webExtension({
      manifest: "manifest.json",
      additionalInputs: [
        "src/content/interceptor.js",
        "src/popup/popup.html",
        "src/popup/review.html",
        "src/popup/stats-popup.html",
        "src/popup/stats.html",
      ],
    }),
    viteStaticCopy({
      targets: [{ src: "public/icons/*", dest: "icons" }],
    }),
  ],
});


