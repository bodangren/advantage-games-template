import { chromium } from "playwright";
const URL = process.argv[2] || "http://localhost:5181/";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
const page = await ctx.newPage();
const failures = [];
page.on("response", (r) => {
  const url = r.url();
  if (url.includes("assets/cartridges") && r.status() !== 200) {
    failures.push({ url, status: r.status() });
  }
});
page.on("pageerror", (e) => console.log("[err]", e.message));
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
const result = await page.evaluate(() => {
  const g = window.__APK_GAME__;
  const s = g?.scene.keys?.GameScene;
  return {
    sceneLoaded: !!s,
    phase: s?.gamePhase,
    isActive: s?.scene?.isActive(),
    isVisible: s?.scene?.isVisible(),
    sceneState: s?.scene?.state,
    loadQueue: s?.load?.list?.length,
  };
});
console.log("scene state:", JSON.stringify(result, null, 2));
console.log("asset failures:", failures);
await browser.close();