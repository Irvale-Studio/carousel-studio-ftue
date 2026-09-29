// V4 flow walk: headless Chrome, real mouse clicks, 1280x700 window, a screenshot per step.
// Asserts: no credit wording on Create, no costs in the AI model picker, CTA pinned in view,
// leave-Canva dialog shows the short link, Cancel opens nothing, trial returns to Review.
// Usage: node qa/v4-walk.mjs <out-dir> [base-url]   (default base = local dev server)
// Chrome path: CHROME env var, else the default Windows install.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:5188/";
mkdirSync(OUT, { recursive: true });
const port = 9333;
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
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 700, deviceScaleFactor: 1, mobile: false });
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

await send("Page.navigate", { url: BASE });
await sleep(2500);
{ const t = await text(); if (/credit/i.test(t)) throw new Error("V4 Create mentions credits: " + t); console.log("ok: no credit mention on Create"); }
await pinned("Generate outline");
await shot("create-start");
// model picker must not show costs
await evalJs(`[...document.querySelectorAll('#root button')].find(b=>b.textContent.trim()==='Auto')?.scrollIntoView()`);
{ const t = await text(); expect(t, "Auto"); }
await click("Auto"); await sleep(400);
{ const all = await evalJs(`document.body.innerText`); expect(all, "Claude Opus 4"); if (/\(\d+ credits?\)/.test(all)) throw new Error("model costs visible"); console.log("ok: no model costs"); }
await shot("model-picker");
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
await sleep(300);
await click("Inspire me"); await click("Generate outline"); await sleep(2200);
{ const t = await text(); expect(t, "Start free trial"); expect(t, "Uses 12 Carousel Studio credits."); if (t.includes("Create design")) throw new Error("Create design shown with 0 credits"); }
await pinned("Start free trial");
await evalJs(`(()=>{const e=[...document.querySelectorAll("#root *")].find(e=>e.scrollHeight>e.clientHeight+20 && getComputedStyle(e).overflowY!=="visible"); e.scrollTop=e.scrollHeight; return 1})()`);
await pinned("Start free trial");
await shot("review-trial-scrolled");
await evalJs(`(()=>{const e=[...document.querySelectorAll("#root *")].find(e=>e.scrollHeight>e.clientHeight+20 && getComputedStyle(e).overflowY!=="visible"); e.scrollTop=0; return 1})()`);
await shot("review-trial");
await click("Start free trial");
{ const d = await evalJs(`document.querySelector('[role=dialog]')?.innerText ?? ''`); expect(d, "You are about to leave Canva"); expect(d, "https://carouselstudio.design/trial/7Kx2Qp"); if (/token|eyJ/.test(d)) throw new Error("scary url"); }
await shot("leave-canva-dialog");
await click("Cancel", "[role=dialog]");
{ const t = await text(); expect(t, "Start free trial"); if (t.includes("Finish checkout")) throw new Error("Cancel still advanced"); }
if ((await evalJs("window.__opened.length")) !== 0) throw new Error("opened on Cancel");
console.log("ok: Cancel stays on Review, nothing opened");
await click("Start free trial");
await click("Continue", "[role=dialog]");
expect(await text(), "Finish checkout in the new tab");
console.log("opened:", await evalJs("window.__opened"));
await shot("checkout");
await click("Cancel");
expect(await text(), "Start free trial");
await click("Start free trial");
await click("Continue", "[role=dialog]");
await click("I've started my trial");
{ const t = await text(); expect(t, "Your Pro trial has started. 50 credits added."); expect(t, "Use 12 of 50"); }
await pinned("Create design");
await shot("review-after-trial");
await click("Create design"); await sleep(2300);
{ const t = await text(); expect(t, "Your carousel is ready"); if (t.includes("Try Pro free")) throw new Error("trial offer shown to Pro"); }
await shot("success-pro");
await click("Create another"); await sleep(400);
{ const t = await text(); expect(t, "38 credits"); expect(t, "Pro trial"); if (t.includes("Running low")) throw new Error("Running low"); }
await shot("create-pro");
for (const [name, q] of [["deeplink-checkout", "?v=4&step=checkout"], ["v3-regression", "?v=3&step=review&credits=3"]]) {
  await send("Page.navigate", { url: BASE + q }); await sleep(2000); await shot(name);
}
expect(await text(), "Upgrade for more credits");
console.log("ALL PASS");
ws.close(); proc.kill();
