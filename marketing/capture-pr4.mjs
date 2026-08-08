import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = getArg("port", "5185");
const GAME_URL = `http://localhost:${PORT}/`;
const VIEWPORT = { width: 1440, height: 900 };
const SLOW_MO_FACTOR = 0.5;
const DESIRED_GAME_DURATION = parseInt(getArg("duration", "15000"), 10);
const WALL_CLOCK_DURATION = DESIRED_GAME_DURATION / SLOW_MO_FACTOR;
const OUTPUT_DIR = path.resolve(PROJECT_DIR, getArg("output-dir", "marketing/output/pr4"));
const OUTPUT_FILE = path.join(OUTPUT_DIR, "promo-raw.webm");

const STAGE_CSS = `
  header, nav, aside { display: none !important; }
  body { background: #05070d !important; }
  main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .frame {
    position: fixed !important; left: 50% !important; top: 50% !important;
    width: 390px !important; height: 844px !important;
    transform: translate(-50%, -50%) scale(2.2769) !important;
    transform-origin: center center !important;
    border: none !important; border-radius: 0 !important;
    margin: 0 !important;
  }
`;

async function captureGameplay() {
  console.log("[PR4/Fah] capturing...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUTPUT_DIR, size: VIEWPORT },
  });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("  [pageerror]", err.message));

  await page.goto(GAME_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.addStyleTag({ content: STAGE_CSS });
  await page.waitForFunction(() => !!window.__APK_GAME__, { timeout: 20000 });
  await page.waitForTimeout(2000);

  const wideBtn = page.locator("button", { hasText: "Wide 1440x900" }).first();
  await wideBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);

  // Force canvas resize
  await page.evaluate(() => {
    const g = window.__APK_GAME__;
    if (!g) return false;
    g.scale.resize(1440, 900);
    g.scale.setGameSize(1440, 900);
  });
  await page.waitForTimeout(800);

  // Start canvas recording
  await page.evaluate(() => {
    const canvas = document.querySelector(".frame canvas");
    if (!canvas) return;
    const stream = canvas.captureStream(30);
    const mr = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 10_000_000,
    });
    window.__CHUNKS__ = [];
    mr.ondataavailable = (e) => { if (e.data.size) window.__CHUNKS__.push(e.data); };
    mr.start(250);
    window.__RECORDER__ = mr;
  });

  // Slow down time
  await page.evaluate(() => {
    const g = window.__APK_GAME__;
    const scenes = g.scene.getScenes(true);
    for (const s of scenes) {
      s.tweens.timeScale = 0.5;
      s.time.timeScale = 0.5;
      if (s.update) {
        const orig = s.update.bind(s);
        s.update = function (time, delta) { orig(time, delta * 0.5); };
      }
    }
  });

  // Click on the canvas in the START/HOW positions repeatedly to navigate menus
  console.log("  Navigating through menus…");
  const canvas = await page.locator(".frame canvas").first();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Canvas not found");
  }

  // Title screen: START button is on the right side
  // Click center-right
  const cx = box.x + box.width * 0.6;
  const cy = box.y + box.height * 0.5;

  // Try multiple click positions and patterns
  for (let i = 0; i < 8; i++) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    // Check if we're in the Game scene
    const inGame = await page.evaluate(() => {
      const g = window.__APK_GAME__;
      const game = g.scene.getScenes(true).find((s) => s.constructor.name === "Game");
      return game ? game.scene.isActive() : false;
    });
    if (inGame) {
      console.log(`  Reached Game scene after ${i + 1} clicks`);
      break;
    }
  }

  // Drive gameplay with random letter presses
  console.log("  Driving typing gameplay…");
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const startTime = Date.now();
  let typed = 0;

  while (Date.now() - startTime < WALL_CLOCK_DURATION) {
    const c = chars[Math.floor(Math.random() * chars.length)];
    await page.keyboard.press(c);
    typed++;
    // Sometimes do backspace
    if (Math.random() < 0.1) {
      await page.keyboard.press("Backspace");
    }
    await page.waitForTimeout(80 + Math.random() * 60);
  }
  console.log(`  Typed ${typed} keys`);

  // Stop and save
  const rec = await page.evaluate(async () => {
    const mr = window.__RECORDER__;
    if (!mr) return null;
    const blob = await new Promise((resolve) => {
      mr.onstop = () => resolve(new Blob(window.__CHUNKS__, { type: "video/webm" }));
      mr.stop();
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return { size: bytes.length, b64: btoa(bin) };
  });
  if (rec && rec.size > 0) {
    fs.writeFileSync(OUTPUT_FILE, Buffer.from(rec.b64, "base64"));
    console.log(`  Raw: ${OUTPUT_FILE} (${rec.size} bytes)`);
  } else {
    console.log("  ERROR: no recording");
  }

  await context.close();
  await browser.close();
}

captureGameplay().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});