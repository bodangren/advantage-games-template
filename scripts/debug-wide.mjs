import { chromium } from "playwright";

const URL = process.argv[2] || "http://localhost:5181/";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForFunction(() => window.__APK_GAME__?.isBooted, { timeout: 20000 });
await page.waitForTimeout(800);

console.log("before click:");
console.log(await page.evaluate(() => {
  const f = document.querySelector("section.frame");
  const c = document.querySelector("canvas");
  return {
    frameCls: f?.className,
    canvasW: c?.width,
    canvasH: c?.height,
    canvasSW: c?.style.width,
    canvasSH: c?.style.height,
  };
}));

await page.locator("button", { hasText: "Wide 1440x900" }).first().click({ force: true });
await page.waitForTimeout(800);

console.log("after click:");
console.log(await page.evaluate(() => {
  const f = document.querySelector("section.frame");
  const c = document.querySelector("canvas");
  return {
    frameCls: f?.className,
    frameW: f?.offsetWidth,
    frameH: f?.offsetHeight,
    canvasW: c?.width,
    canvasH: c?.height,
    canvasSW: c?.style.width,
    canvasSH: c?.style.height,
  };
}));

await page.screenshot({ path: "/tmp/wide-test.png" });
console.log("screenshot: /tmp/wide-test.png");

await browser.close();