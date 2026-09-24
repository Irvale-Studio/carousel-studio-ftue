// Builds the preview as ONE self-contained HTML file that opens by double-click (file://).
import fs from "node:fs";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// The app points at the logo by URL ("/carousel-studio-logomark.svg"); inline it so file:// works.
const logo = "data:image/svg+xml;base64," + fs.readFileSync("public/carousel-studio-logomark.svg").toString("base64");
const inlineLogo = {
  name: "inline-logo",
  transform(code: string, id: string) {
    return id.endsWith("App.tsx") ? code.replace('"/carousel-studio-logomark.svg"', JSON.stringify(logo)) : null;
  },
};

export default {
  plugins: [inlineLogo, react(), viteSingleFile()],
  base: "./",
  publicDir: false,
  build: { outDir: "dist-single", assetsInlineLimit: 100_000_000 },
};
