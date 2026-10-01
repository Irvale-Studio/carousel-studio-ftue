// V5 template quick pick walk: headless Chrome, real mouse clicks, 1440x900, a screenshot per step.
// Asserts: Templates row + See all on Create, blank canvas page until a pick, loader then the picked
// template on the canvas, See all grid + search, picking from the grid swaps the canvas, v4 has no row.
// Usage: node qa/v5-templates.mjs <out-dir> [base-url]   (default base = local dev server)
// Chrome path: CHROME env var, else the default Windows install.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:5188/";
mkdirSync(OUT, { recursive: true });
const port = 9334;
const proc = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--disable-gpu",
  `--user-data-dir=${OUT}/profile`, "--window-size=1280,1000", "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = list.find((t) => t.type === "page");
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(250);
}
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map(); const tabs = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
// count window.open calls instead of opening real tabs
const hook = `window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null;};`;
await send("Page.addScriptToEvaluateOnNewDocument", { source: hook });

let n = 0;
async function shot(name) {
  if (name.startsWith("review")) await evalJs(`[...document.querySelectorAll("#root button")].pop().scrollIntoView({block:"end"})`);
  await sleep(500);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/${String(++n).padStart(2, "0")}-${name}.png`, Buffer.from(r.result.data, "base64"));
}
async function click(label, scope = '#root') {
  const box = await evalJs(`(() => { const b=[...document.querySelectorAll('${scope} button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); if(!b) return null; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (!box) throw new Error("button not found: " + label + " | have: " + await evalJs(`[...document.querySelectorAll('#root button')].map(b=>b.textContent.trim()).join(' | ')`));
  await sleep(150);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  await sleep(300);
}
const text = () => evalJs(`document.querySelector('#root').innerText`);
async function pinned(label) {
  const r = await evalJs(`(() => { const b=[...document.querySelectorAll('#root button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); const r=b.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,h:innerHeight}; })()`);
  if (!(r.top >= 0 && r.bottom <= r.h)) throw new Error(label + " not in view: " + JSON.stringify(r));
  console.log("ok: pinned in view:", label, JSON.stringify(r));
}
function expect(t, s) { if (!t.includes(s)) throw new Error(`expected "${s}" in:\n${t}`); console.log("ok:", s); }
const canvasImg = () => evalJs(`(() => { const i = document.querySelector('#canvas .page img'); return i ? { src: i.getAttribute('src'), shown: i.classList.contains('shown') } : null; })()`);
async function clickCard(title) {
  const box = await evalJs(`(() => { const e=document.querySelector('#root [aria-label=${JSON.stringify("Open template: " + title)}]'); if(!e) return null; e.scrollIntoView({block:'nearest', inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (!box) throw new Error("card not found: " + title);
  await sleep(300);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
}

await send("Page.navigate", { url: BASE + "?v=5" });
await sleep(2500);
{ const t = await text(); expect(t, "Templates"); expect(t, "See all"); if (/credit/i.test(t)) throw new Error("V5 Create mentions credits"); }
if (await canvasImg()) throw new Error("canvas not blank at start");
console.log("ok: canvas blank at start");
await pinned("Generate outline");
await shot("create-start");

await clickCard("Branding is more than just looks");
await sleep(250);
if (!(await evalJs(`!!document.querySelector('#canvas .page .loading')`))) throw new Error("no loader");
console.log("ok: loader shows on pick");
await shot("canvas-loading");
await sleep(1300);
{ const c = await canvasImg(); if (!c?.shown || !c.src.includes("branding")) throw new Error("branding not on canvas: " + JSON.stringify(c)); console.log("ok: branding on canvas"); }
await shot("canvas-branding");

// scroll the row with the kit carousel's own arrow
const next = await evalJs(`(() => { const b=[...document.querySelectorAll('#root button')].find(b=>/next|forward|right/i.test(b.getAttribute('aria-label')??'')); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,l:b.getAttribute('aria-label')}; })()`);
console.log("carousel arrow:", JSON.stringify(next));
if (next) { for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: next.x, y: next.y, button: "left", clickCount: 1 }); await sleep(600); await shot("row-scrolled"); }

{ // kit LinkButton is not a <button>: click the element whose own text is "See all"
  const box = await evalJs(`(() => { const e=[...document.querySelectorAll('#root *')].find(e=>e.childElementCount===0 && e.textContent.trim()==='See all'); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
}
await sleep(400);
{ const n = await evalJs(`document.querySelectorAll('#root [aria-label^="Open template: "]').length`); if (n !== 8) throw new Error("grid count " + n); console.log("ok: grid shows 8"); }
await shot("see-all");
await evalJs(`document.querySelector('#root input').focus()`);
await send("Input.insertText", { text: "habit" });
await sleep(400);
{ const n = await evalJs(`document.querySelectorAll('#root [aria-label^="Open template: "]').length`); if (n !== 1) throw new Error("search count " + n); console.log("ok: search filters to 1"); }
await clickCard("5 habits that changed my life");
await sleep(1400);
{ const c = await canvasImg(); if (!c?.shown || !c.src.includes("habits")) throw new Error("habits not on canvas: " + JSON.stringify(c)); console.log("ok: habits on canvas"); }
expect(await text(), "Templates");
await shot("see-all-search-habits");
await send("Input.insertText", { text: "zzz" });
await sleep(300);
expect(await text(), "No templates match your search.");
await evalJs(`document.querySelector('#root button[aria-label="Back"]').click()`);
await sleep(400);
expect(await text(), "What's your carousel about?");

await send("Page.navigate", { url: BASE + "?v=4" });
await sleep(2000);
{ const t = await text(); if (t.includes("See all") || /Templates\n/.test(t)) throw new Error("v4 shows the template row"); console.log("ok: v4 has no template row"); }
await shot("v4-regression");
console.log("ALL PASS");
ws.close(); proc.kill();
