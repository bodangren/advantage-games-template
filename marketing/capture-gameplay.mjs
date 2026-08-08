/**
 * Capture actual gameplay by force-starting the Game scene.
 * Works for PR1 (Copter) and PR3 (Cartoon) by overriding showShipSelectScreen / direct start.
 * Works for PR4 (Fah) by starting the "Game" scene directly.
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

async function forcePlay(page) {
  return await page.evaluate(() => {
    const g = window.__APK_GAME__;
    for (const s of g.scene.getScenes(false)) {
      s.tweens.timeScale = 0.5;
      s.time.timeScale = 0.5;
      if (s.update) {
        const orig = s.update.bind(s);
        s.update = function (time, delta) { orig(time, delta * 0.5); };
      }
    }
    const gs = g.scene.keys.GameScene;
    if (gs) {
      gs.endGame = () => {};
      gs.gameState.shieldHP = 9999;
      gs.gameState.gameOver = false;
      gs.gameState.completed = false;
      if (gs.gamePhase !== "playing") {
        gs.startGame();
      }
      return { scene: "GameScene", phase: gs.gamePhase, shield: gs.gameState.shieldHP, bosses: gs.bossImages?.length };
    }
    return { scene: "none" };
  });
}

async function captureGameplay() {
  console.log(`[${PORT}] capturing gameplay...`);
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

  // Click Wide
  const wideBtn = page.locator("button", { hasText: "Wide 1440x900" }).first();
  await wideBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);

  // Resize canvas
  await page.evaluate(() => {
    const g = window.__APK_GAME__;
    if (g) {
      g.scale.resize(1440, 900);
      g.scale.setGameSize(1440, 900);
    }
  });
  await page.waitForTimeout(500);

  // For PR4: skip to Game scene, killing all menu scenes
  await page.evaluate(() => {
    const g = window.__APK_GAME__;
    if (g.scene.keys.Game && g.scene.keys.Game.scene) {
      // Stop all running menu scenes
      for (const k of ['Title', 'HowToPlay', 'Preloader', 'Boot']) {
        const s = g.scene.keys[k];
        if (s && s.scene.isActive()) {
          try { s.scene.stop(); } catch (e) {}
        }
      }
      g.scene.keys.Game.scene.start();
    }
  });

  // Wait for loading to dismiss if present
  await page.waitForFunction(() => {
    const g = window.__APK_GAME__;
    for (const k of Object.keys(g.scene.keys)) {
      const s = g.scene.keys[k];
      if (s.children?.list?.some(c => c.depth >= 99)) return false;
    }
    return true;
  }, { timeout: 30000 }).catch(() => console.log("  (loading timeout, continuing)"));
  await page.waitForTimeout(800);

  // Start MediaRecorder BEFORE forcing play
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

  // Force into playing state
  const result = await forcePlay(page);
  console.log("  Force result:", JSON.stringify(result));

  // Drive gameplay
  const start = Date.now();
  while (Date.now() - start < WALL_CLOCK_DURATION) {
    const c = "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    await page.keyboard.press(c);
    // Arrow keys for movement
    if (Math.random() < 0.3) {
      const dirs = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      await page.keyboard.press(dirs[Math.floor(Math.random() * 4)]);
    }
    await page.waitForTimeout(200);
  }

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
  }

  await context.close();
  await browser.close();
}

captureGameplay().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});