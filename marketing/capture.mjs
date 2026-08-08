/**
 * Generic 50 FPS promo capture for Advantage Games competition cartridges.
 *
 * Technique (see docs/MARKETING-VIDEO.md):
 *   1. Slow every Phaser time subsystem to 0.5x.
 *   2. Record at Playwright's native 25 FPS for 2x the desired game-time.
 *   3. FFmpeg setpts 2x speed-up -> effective 50 FPS output.
 *
 * Game-specific behavior (menu navigation, death patching, inputs) lives in a
 * driver module passed via --driver. A driver exports:
 *
 *   export default async function drive(page, helpers) { ... }
 *
 * helpers: { wallClockMs, slowMoFactor, patchAllScenes: () => Promise<void> }
 * The driver is responsible for navigating menus into gameplay, patching out
 * death/failure paths, and feeding inputs for roughly `wallClockMs`.
 *
 * Usage:
 *   node capture.mjs --port 6114 --driver drivers/pr4.mjs --out output/pr4-raw.webm [--duration 16000]
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = getArg("port", null);
const DRIVER = getArg("driver", null);
const OUT = path.resolve(__dirname, getArg("out", "output/promo-raw.webm"));
const VIEWPORT = { width: 1080, height: 1920 };
const SLOW_MO_FACTOR = 0.5;
const DESIRED_GAME_DURATION = parseInt(getArg("duration", "15000"), 10);
const WALL_CLOCK_DURATION = DESIRED_GAME_DURATION / SLOW_MO_FACTOR;

if (!PORT || !DRIVER) {
  console.error("Usage: node capture.mjs --port <port> --driver <driver.mjs> [--out file] [--duration ms]");
  process.exit(1);
}

const GAME_URL = `http://localhost:${PORT}/`;

/** CSS: strip the game-lab chrome, keep only the compact frame scaled to fill 1080x1920. */
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

/** Slow the 5 Phaser time subsystems on every scene. Idempotent per scene. Re-callable as scenes come and go. */
async function patchAllScenes(page) {
  await page.evaluate((factor) => {
    const game = window.__APK_GAME__;
    if (!game) return;
    const scenes = game.scene.getScenes(false);
    for (const scene of scenes) {
      if (scene.__promoPatched) continue;
      scene.__promoPatched = true;
      const originalUpdate = scene.update ? scene.update.bind(scene) : null;
      scene.update = function (time, delta) {
        if (originalUpdate) originalUpdate(time, delta * factor);
      };
      if (scene.tweens) scene.tweens.timeScale = factor;
      if (scene.time) scene.time.timeScale = factor;
      if (scene.physics?.world) scene.physics.world.timeScale = 1 / factor;
      if (scene.anims) scene.anims.globalTimeScale = factor;
    }
  }, SLOW_MO_FACTOR);
}

async function main() {
  console.log(`Capturing: ${GAME_URL} driver=${DRIVER}`);
  console.log(`  game-time ${DESIRED_GAME_DURATION}ms -> wall-clock ${WALL_CLOCK_DURATION}ms @ 0.5x`);

  const driverPath = path.resolve(__dirname, DRIVER);
  const { default: drive } = await import(pathToFileURL(driverPath).href);
  if (typeof drive !== "function") throw new Error(`Driver ${driverPath} must export a default async function`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: path.dirname(OUT), size: VIEWPORT },
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log(`  [pageerror] ${err.message}`));

  await page.goto(GAME_URL, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: STAGE_CSS });
  await page.waitForSelector(".frame canvas", { timeout: 20000 });
  await page.waitForFunction(() => !!window.__APK_GAME__, { timeout: 20000 });
  console.log("  Game mounted.");

  // Entrance beat for the hook, then hand over to the game-specific driver.
  await page.waitForTimeout(800);
  await patchAllScenes(page);

  // Keep newly added scenes patched for the whole session.
  const repatch = setInterval(() => patchAllScenes(page).catch(() => {}), 500);

  await drive(page, { wallClockMs: WALL_CLOCK_DURATION, slowMoFactor: SLOW_MO_FACTOR, patchAllScenes: () => patchAllScenes(page) });

  clearInterval(repatch);
  console.log("  Driver complete.");

  const video = page.video();
  await context.close();
  const videoPath = await video.path();
  if (videoPath !== OUT) fs.renameSync(videoPath, OUT);
  await browser.close();
  console.log(`  Raw recording: ${OUT}`);
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
