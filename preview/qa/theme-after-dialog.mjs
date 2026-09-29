// Checks the kit theme survives the leave-Canva dialog: primary button colour and the theme
// classes on <html> before, during and after Cancel / Continue. (Regression: 2026-09-29, a second
// TestAppUiProvider unmounting with the dialog stripped the theme and blanked every kit colour.)
// Usage: node qa/theme-after-dialog.mjs <out-dir> [base-url]
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:5188/"; mkdirSync(OUT, { recursive: true });
const port = 9334;
const proc = spawn(process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--disable-gpu", `--user-data-dir=${OUT}/profile`, "about:blank"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find((t) => t.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 700, deviceScaleFactor: 1, mobile: false });
await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.open=()=>null;" });
let n = 0;
const shot = async (name) => { await sleep(400); const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${++n}-${name}.png`, Buffer.from(r.result.data, "base64")); };
const click = async (label, scope = "#root") => {
  const b = await ev(`(()=>{const b=[...document.querySelectorAll('${scope} button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  if (!b) throw new Error("no button " + label);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: b.x, y: b.y, button: "left", clickCount: 1 });
  await sleep(400);
};
const state = () => ev(`(()=>{const b=[...document.querySelectorAll('#root button')].find(b=>b.textContent.trim()==='Start free trial'||b.textContent.trim()==='Generate outline'); return JSON.stringify({bg: b && getComputedStyle(b).backgroundColor, htmlClass: document.documentElement.className, bodyClass: document.body.className, styleTags: document.querySelectorAll('style,link[rel=stylesheet]').length});})()`);
await send("Page.navigate", { url: BASE + "?v=4&step=review" }); await sleep(2500);
console.log("before :", await state()); await shot("before");
await click("Start free trial"); console.log("dialog :", await state());
await click("Cancel", "[role=dialog]"); const afterCancel = JSON.parse(await state()); console.log("cancel :", JSON.stringify(afterCancel));
if (afterCancel.bg !== "rgb(139, 61, 255)" || !afterCancel.htmlClass.includes("theme")) { console.error("FAIL: kit theme lost after Cancel"); process.exitCode = 1; } await shot("after-cancel");
await click("Start free trial"); await click("Continue", "[role=dialog]");
const afterContinue = JSON.parse(await state()); console.log("contin.:", JSON.stringify(afterContinue));
if (!afterContinue.htmlClass.includes("theme")) { console.error("FAIL: kit theme lost after Continue"); process.exitCode = 1; }
if (!process.exitCode) console.log("ALL PASS"); await shot("after-continue");
ws.close(); proc.kill();
