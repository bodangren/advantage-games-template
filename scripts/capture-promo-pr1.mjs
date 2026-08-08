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
const GAME_URL = `http://localhost:${PORT}/`;
const SLOW_MO_FACTOR = 0.5;
const DESIRED_GAME_DURATION = parseInt(getArg("duration", "8000"), 10);
const WALL_CLOCK_DURATION = DESIRED_GAME_DURATION / SLOW_MO_FACTOR;
const OUTPUT_DIR = path.resolve(PROJECT_DIR, getArg("output-dir", "output/pr1"));
const OUTPUT_FILE = path.join(OUTPUT_DIR, "promo-raw.webm");

function generateInputSequence(totalMs) {
  const sequence = [];
  let elapsed = 0;
  const keys = ["ArrowLeft", "ArrowRight"];
  let keyIdx = 0;
  while (elapsed < totalMs) {
    const holdMs = 200 + Math.floor(Math.random() * 400);
    const pauseMs = 50 + Math.floor(Math.random() * 200);
    sequence.push({ key: keys[keyIdx], holdMs, pauseMs });
    elapsed += holdMs + pauseMs;
    if (Math.random() < 0.7) keyIdx = 1 - keyIdx;
  }
  return sequence;
}

async function captureGameplay() {
  console.log("[PR1/Copter] capturing...");
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

  console.log("  Clicking Wide button to enable 1440x900 layout…");
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

  console.log("  Waiting for assets to load + create() to run (~5s)…");
  await page.waitForTimeout(5500);

  console.log("  Patching scene: skip ship-select, no death, slow-mo…");
  await page.evaluate(() => {
    const s = window.__APK_GAME__.scene.keys.GameScene;
    if (!s) return false;
    s.showShipSelectScreen = function () {
      this.menuContainer?.removeAll(true);
      this.gamePhase = "playing";
      this.gameState.shieldHP = 9999;
      this.gameState.gameOver = false;
      this.startGame?.();
    };
    s.showGameOver = () => {};
    s.showWin = () => {};
    s.onPlayerHit = () => {};
    s.takeDamage = () => {};
    s.triggerGameOver = () => {};
    s.gameState.shieldHP = 9999;
    s.gameState.gameOver = false;

    const origUpdate = s.update.bind(s);
    s.update = function (time, delta) {
      origUpdate(time, delta * 0.5);
    };
    s.tweens.timeScale = 0.5;
    s.time.timeScale = 0.5;
    if (s.anims) s.anims.globalTimeScale = 0.5;

    if (typeof s.startLevel === "function") {
      s.gameState = s.gameState || {};
      s.gameState.gameOver = false;
      s.gameState.shieldHP = 9999;
      s.gameState.completed = false;
      s.startLevel();
      s.gamePhase = "playing";
    } else {
      s.gamePhase = "playing";
    }

    if (!s._promoGuard) {
      s._promoGuard = true;
      s.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (s.gameState.shieldHP < 100) s.gameState.shieldHP = 9999;
          if (s.gameState.gameOver) {
            s.gameState.gameOver = false;
            s.gamePhase = "playing";
          }
          if (!["playing", "game-over", "win"].includes(s.gamePhase)) {
            s.gamePhase = "playing";
          }
        },
      });
    }
    return true;
  });
  console.log("  Patched. Playing inputs…");

  const sequence = generateInputSequence(WALL_CLOCK_DURATION);
  console.log(`  ${sequence.length} inputs over ${WALL_CLOCK_DURATION}ms`);

  for (const seg of sequence) {
    await page.keyboard.down(seg.key);
    await page.waitForTimeout(seg.holdMs);
    await page.keyboard.up(seg.key);
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