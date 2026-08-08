/**
 * Direct gameplay capture: bypass menus by force-starting the Game scene.
 * Uses MediaRecorder on the canvas for clean WebM output, then ffmpeg to convert.
 */
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

const PORT = getArg("port", "5181");
const SCENE_KEY = getArg("scene", "GameScene");
const GAME_URL = `http://localhost:${PORT}/`;
const VIEWPORT = { width: 1440, height: 900 };
const SLOW_MO_FACTOR = 0.5;
const DESIRED_GAME_DURATION = parseInt(getArg("duration", "15000"), 10);
const WALL_CLOCK_DURATION = DESIRED_GAME_DURATION / SLOW_MO_FACTOR;
const OUTPUT_DIR = path.resolve(PROJECT_DIR, getArg("output-dir", `marketing/output/${PORT}`));
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
  console.log(`[${PORT}] capturing game scene "${SCENE_KEY}"...`);
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

  // Click Wide button
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

  // Start canvas MediaRecorder
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
    const scenes = g.scene.getScenes(false);
    for (const s of scenes) {
      s.tweens.timeScale = 0.5;
      s.time.timeScale = 0.5;
      if (s.update) {
        const orig = s.update.bind(s);
        s.update = function (time, delta) { orig(time, delta * 0.5); };
      }
    }
  });

  // Force-start the Game scene by name — bypasses all menu scenes
  console.log("  Force-starting game scene...");
  await page.evaluate((sceneKey) => {
    const g = window.__APK_GAME__;
    if (!g) return false;
    // Stop all running scenes
    for (const s of g.scene.getScenes(true)) {
      try { s.scene.stop(); } catch (e) {}
    }
    // Find the requested scene
    const target = g.scene.keys[sceneKey];
    if (!target) {
      console.error("Scene not found: " + sceneKey);
      return false;
    }
    target.scene.start();
    return true;
  }, SCENE_KEY);
  await page.waitForTimeout(2000);

  // Verify we're in the right scene
  const inGame = await page.evaluate((sceneKey) => {
    const g = window.__APK_GAME__;
    const s = g.scene.keys[sceneKey];
    return s ? s.scene.isActive() : false;
  }, SCENE_KEY);
  console.log(`  Scene "${SCENE_KEY}" active: ${inGame}`);

  if (!inGame) {
    console.error("  Failed to enter game scene. Aborting.");
    await context.close();
    await browser.close();
    process.exit(1);
  }

  // Drive gameplay
  console.log("  Driving gameplay...");
  let elapsed = 0;
  while (elapsed < WALL_CLOCK_DURATION) {
    // Press a random key for input-driven games
    const c = "abcdefghijklmnopqrstuvwxyz" [Math.floor(Math.random() * 26)];
    await page.keyboard.press(c);
    elapsed += 200;
  }

  console.log("  Stopping recorder...");

  // Stop recorder and save
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