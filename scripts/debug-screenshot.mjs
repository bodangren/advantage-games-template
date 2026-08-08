import { chromium } from "playwright";
import fs from "fs";

const URL = process.argv[2] || "http://localhost:5181/";
const OUT = process.argv[3] || "/tmp/debug.png";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("[err]", m.text());
  else if (m.type() === "log") console.log("[log]", m.text());
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

console.log("--- 1s");
await page.waitForTimeout(1000);
console.log("--- 5s");
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const g = window.__APK_GAME__;
  if (!g) return { mounted: false };
  const ctx = document.querySelector("canvas")?.getContext("webgl") || null;
  const scenes = Object.keys(g.scene.keys || {});
  const first = scenes[0] ? g.scene.keys[scenes[0]] : null;
  return {
    mounted: true,
    booted: g.isBooted,
    sceneKeys: scenes,
    firstPhase: first?.gamePhase ?? null,
    firstState: first?.gameState
      ? Object.keys(first.gameState).slice(0, 5)
      : null,
    canvas: !!document.querySelector("canvas"),
    canvasSize: document.querySelector("canvas")
      ? {
          w: document.querySelector("canvas").width,
          h: document.querySelector("canvas").height,
        }
      : null,
    docSize: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
  };
});
console.log("info:", JSON.stringify(info, null, 2));

await page.screenshot({ path: OUT, fullPage: false });
console.log("Screenshot:", OUT);
await browser.close();
