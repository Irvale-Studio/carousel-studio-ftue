// Builds the preview as ONE self-contained HTML file that opens by double-click (file://).
import fs from "node:fs";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// The app points at the logo and the v5 template art by URL ("/carousel-studio-logomark.svg",
// "/templates/<id>.svg"); inline them so file:// works.
const dataUri = (file: string) => "data:image/svg+xml;base64," + fs.readFileSync(`public${file}`).toString("base64");
const inlineLogo = {
  name: "inline-logo",
  transform(code: string, id: string) {
    return id.endsWith("App.tsx")
      ? code.replace(/"(\/carousel-studio-logomark\.svg|\/templates\/[a-z-]+\.svg)"/g, (_m, file) => JSON.stringify(dataUri(file)))
      : null;
  },
};

export default {
  plugins: [inlineLogo, react(), viteSingleFile()],
  base: "./",
  publicDir: false,
  build: { outDir: "dist-single", assetsInlineLimit: 100_000_000 },
};
