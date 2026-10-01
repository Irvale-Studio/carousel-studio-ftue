// Writes the v5 template thumbnails (public/templates/<id>.svg) from src/templateArt.ts, each at its
// own theme, and checks App.tsx TEMPLATES and FONTS agree with templateArt.ts.
// Usage (from preview/): npm run templates   (Node 23.6+ runs the .ts import directly)
import { readFileSync, writeFileSync } from "node:fs";
import { TEMPLATE_ART, TEMPLATE_THEMES, FONT_STACKS } from "../src/templateArt.ts";

const app = readFileSync("src/App.tsx", "utf8");
const problems = [];
for (const [id, theme] of Object.entries(TEMPLATE_THEMES)) {
  const line = app.split("\n").find((l) => l.includes(`id: "${id}"`) && l.includes("thumbnailUrl"));
  if (!line) { problems.push(`App.tsx TEMPLATES has no "${id}"`); continue; }
  for (const [k, v] of Object.entries(theme)) {
    if (!line.includes(`${k}: "${v}"`)) problems.push(`${id}.${k}: App.tsx does not say "${v}"`);
  }
  writeFileSync(`public/templates/${id}.svg`, TEMPLATE_ART[id](theme).trim() + "\n");
}
for (const id of Object.keys(FONT_STACKS)) if (!app.includes(`value: "${id}"`)) problems.push(`FONTS in App.tsx is missing "${id}"`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`wrote ${Object.keys(TEMPLATE_THEMES).length} thumbnails; App.tsx in sync`);
