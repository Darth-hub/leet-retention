import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
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
  ],
});
