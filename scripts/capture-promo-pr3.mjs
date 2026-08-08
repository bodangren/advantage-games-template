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

const PORT = getArg("port", "5183");
const GAME_URL = `http://localhost:${PORT}/`;
const SLOW_MO_FACTOR = 0.5;
const DESIRED_GAME_DURATION = parseInt(getArg("duration", "8000"), 10);
const WALL_CLOCK_DURATION = DESIRED_GAME_DURATION / SLOW_MO_FACTOR;
const OUTPUT_DIR = path.resolve(PROJECT_DIR, getArg("output-dir", "output/pr3"));
const OUTPUT_FILE = path.join(OUTPUT_DIR, "promo-raw.webm");

function generateInputSequence(totalMs) {
  const sequence = [];
  let elapsed = 0;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let keyIdx = 0;
  while (elapsed < totalMs) {
    const holdMs = 40 + Math.floor(Math.random() * 80);
    const pauseMs = 30 + Math.floor(Math.random() * 90);
    sequence.push({ key: keys[keyIdx], holdMs, pauseMs });
    elapsed += holdMs + pauseMs;
    if (Math.random() < 0.85) keyIdx = (keyIdx + 1) % keys.length;
    else keyIdx = Math.floor(Math.random() * keys.length);
  }
  return sequence;
}

async function captureGameplay() {
  console.log("[PR3/Cartoon] capturing...");
  console.log(`  URL: ${GAME_URL}`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1440, height: 900 } },
  });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("  [pageerror]", err.message));

  await page.goto(GAME_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => window.__APK_GAME__?.isBooted, { timeout: 20000 });

  console.log("  Clicking Wide button…");
  const wideBtn = page.locator("button", { hasText: "Wide 1440x900" }).first();
  await wideBtn.click({ force: true });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    const g = window.__APK_GAME__;
    if (!g) return;
    const w = 1440;
    const h = 900;
    g.scale.resize(w, h);
    g.scale.setGameSize(w, h);
  });
  await page.waitForTimeout(500);

  console.log("  Waiting for scene create() (~3s)…");
  await page.waitForTimeout(3500);

  console.log("  Patching scene…");
  await page.evaluate(() => {
    const g = window.__APK_GAME__;
    const sceneKey = Object.keys(g.scene.keys)[0];
    const s = g.scene.keys[sceneKey];
    if (!s) return false;
    s.showTimeUp = () => {};
    s.showResultsPanel = () => {};
    s.showWin = () => {};
    if (s.timerEvent) s.timerEvent.remove();

    if (typeof s.update === "function") {
      const orig = s.update.bind(s);
      s.update = function (time, delta) {
        orig(time, delta * 0.5);
      };
    }
    s.tweens.timeScale = 0.5;
    s.time.timeScale = 0.5;
    if (s.anims) s.anims.globalTimeScale = 0.5;

    if (!s._promoGuard) {
      s._promoGuard = true;
      s.time.addEvent({
        delay: 80,
        loop: true,
        callback: () => {
          if (s.state?.timeLeft < 30) s.state.timeLeft = 30;
          if (s.state?.gameOver) s.state.gameOver = false;
          if (s.hud?.timerText) s.hud.timerText.setText("30");
          if (s.locked) s.locked = false;
        },
      });
    }
    if (s.state) s.state.gameOver = false;
    return true;
  });
  console.log("  Patched. Playing inputs…");

  const sequence = generateInputSequence(WALL_CLOCK_DURATION);
  console.log(`  ${sequence.length} inputs over ${WALL_CLOCK_DURATION}ms`);

  for (const seg of sequence) {
    await page.keyboard.press(seg.key);
    if (seg.pauseMs > 0) await page.waitForTimeout(seg.pauseMs);
  }

  console.log("  Input complete. Finalizing…");

  const video = page.video();
  await context.close();
  const videoPath = await video.path();
  if (videoPath !== OUTPUT_FILE && fs.existsSync(videoPath)) {
    fs.renameSync(videoPath, OUTPUT_FILE);
  }
  await browser.close();
  console.log(`  Raw: ${OUTPUT_FILE}`);
}

captureGameplay().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});