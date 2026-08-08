import { chromium } from "playwright";

const URL = process.argv[2] || "http://localhost:5181/";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForFunction(() => window.__APK_GAME__?.isBooted, { timeout: 20000 });
await page.waitForTimeout(800);

const dump = await page.evaluate(() => {
  function chain(el, depth = 0) {
    if (!el || depth > 6) return null;
    return {
      tag: el.tagName,
      id: el.id,
      cls: el.className,
      children: Array.from(el.children).slice(0, 6).map((c) => chain(c, depth + 1)),
    };
  }
  return {
    body: chain(document.body),
    headers: Array.from(document.querySelectorAll("header")).map((el) => ({
      offsetParent: !!el.offsetParent,
      display: window.getComputedStyle(el).display,
      vis: window.getComputedStyle(el).visibility,
    })),
    sectionFrame: (() => {
      const f = document.querySelector("section.frame");
      if (!f) return null;
      const cs = window.getComputedStyle(f);
      return { width: cs.width, height: cs.height, position: cs.position, cls: f.className };
    })(),
    canvas: (() => {
      const c = document.querySelector("canvas");
      if (!c) return null;
      return { w: c.width, h: c.height, dw: c.style.width, dh: c.style.height, pcls: c.parentElement?.className };
    })(),
  };
});

console.log("dom:", JSON.stringify(dump, null, 2));
await browser.close();
