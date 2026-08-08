import { chromium } from "playwright";

const URL = process.argv[2] || "http://localhost:5181/";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("[err]", e.message));
page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text().substring(0, 200)));

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForFunction(() => window.__APK_GAME__?.isBooted, { timeout: 20000 });
await page.waitForTimeout(2000);

await page.screenshot({ path: "/tmp/snap-before.png" });
console.log("snap-before saved");

await page.evaluate(() => {
  Array.from(document.querySelectorAll("header")).forEach((e) => {
    e.style.cssText = "display: none !important; visibility: hidden !important;";
  });
  Array.from(document.querySelectorAll("nav")).forEach((e) => {
    e.style.cssText = "display: none !important; visibility: hidden !important;";
  });
  Array.from(document.querySelectorAll("aside")).forEach((e) => {
    e.style.cssText = "display: none !important; visibility: hidden !important;";
  });
  const main = document.querySelector("main");
  if (main) main.style.cssText = "margin:0!important;padding:0!important;max-width:none!important;";
  const frame = document.querySelector("section.frame");
  if (frame) {
    frame.style.cssText = "position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;padding:0!important;border:0!important;border-radius:0!important;background:#000!important;";
    frame.classList.remove("compact");
    frame.classList.add("wide");
  }
  const game = document.querySelector(".game");
  if (game) game.style.cssText = "position:absolute!important;inset:0!important;width:100vw!important;height:100vh!important;";
  const canvas = document.querySelector("canvas");
  if (canvas) {
    canvas.style.cssText = "width:100vw!important;height:100vh!important;display:block!important;position:absolute!important;top:0!important;left:0!important;";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/snap-after.png" });
console.log("snap-after saved");

const dump = await page.evaluate(() => {
  const f = document.querySelector("section.frame");
  const c = document.querySelector("canvas");
  return {
    frame: f ? { cls: f.className, w: f.offsetWidth, h: f.offsetHeight, styleW: f.style.width, styleH: f.style.height, pos: f.style.position } : null,
    canvas: c ? { w: c.width, h: c.height, styleW: c.style.width, styleH: c.style.height, sw: c.scrollWidth, sh: c.scrollHeight } : null,
    headers: Array.from(document.querySelectorAll("header")).map((e) => ({ d: e.style.display, v: e.style.visibility })),
    mainW: document.querySelector("main")?.offsetWidth,
  };
});
console.log(JSON.stringify(dump, null, 2));

await browser.close();
