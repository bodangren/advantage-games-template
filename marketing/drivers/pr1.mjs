/**
 * Promo driver for PR-1 "Star Speller 2D" (neon space-shooter vocabulary game).
 *
 * Records `marketing/output/pr1-canvas.webm` via an in-page MediaRecorder on
 * the game canvas (the Playwright screencast video is unusable in this
 * environment, see below). Convert with:
 *   ffmpeg -i pr1-canvas.webm -vf "setpts=0.5*PTS,scale=1080:-2:flags=lanczos,crop=1080:1920,fps=50" ...
 *
 * Environment findings that shaped this driver (measured, not guessed):
 *   1. Headless Chromium renders the game's WebGL canvas in software
 *      (SwiftShader) at ~5 fps; Phaser's delta smoothing then pins delta to
 *      16.7ms/frame so game time crawls at ~1/10 wall speed and the
 *      "Loading..." overlay (a 2s time.delayedCall) never dismisses.
 *      Fix: block WebGL context creation via init script -> Phaser.AUTO
 *      falls back to the Canvas renderer (visually identical, much cheaper),
 *      and disable loop.smoothStep so game time tracks wall-clock x 0.5.
 *   2. Playwright's recordVideo screencast throttles the compositor to
 *      ~2-6 fps on the 1080x1920 viewport no matter what we draw.
 *      Fix: record the canvas directly with captureStream + MediaRecorder,
 *      stop the screencast via CDP to free CPU, and pump the Phaser loop
 *      manually with setInterval(loop.tick, 33) so the game does not depend
 *      on compositor-driven requestAnimationFrame.
 *   3. Phaser's pointer mapping does not account for the CSS transform used
 *      to upscale the .frame, so synthetic mouse clicks miss the in-canvas
 *      buttons. Fix: trigger menu buttons with obj.emit("pointerdown") and
 *      steer the ship by writing scene.playerX (update() reads it every
 *      frame). All button handlers in scene.ts are arg-less closures.
 *
 * Game facts from scene.ts (single scene, key "GameScene"):
 *   - Boot: loading overlay (dismissed by time.delayedCall 2s after load),
 *     then an in-canvas "Select Edition" menu; clicking a ship starts play.
 *   - gamePhase values: preload / skin-select / ship-select / playing /
 *     chain / upgrade / game-over / win. "chain" covers level previews.
 *   - Boss levels: 3 bosses; gameState.correctLane = the vocabulary-correct
 *     lane. levelType alternates "boss" / "gigy-wave".
 *   - Upgrade menu between boss levels; interactive children of
 *     upgradeContainer in order: firerate, doubleshot, laser.
 *   - Death paths: endGame(false) from onPlayerHit (shieldHP<=0) and wrong
 *     answers; endGame(true) after 10 levels destroys the Phaser game.
 *     We override the endGame instance method to restore state instead.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_WEBM = path.resolve(__dirname, "../output/pr1-canvas.webm");

/** Same chrome-stripping CSS capture.mjs applies before drive() (lost on reload). */
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

/**
 * Neutralize every game-over / win path and keep the shield topped up.
 * Safe to re-run: the method patch is guarded by __deathPatched.
 */
async function patchDeath(page) {
  await page.evaluate(() => {
    const game = window.__APK_GAME__;
    if (!game) return;
    for (const scene of game.scene.getScenes(false)) {
      if (scene.gameState && scene.gamePhase === "playing" && scene.gameState.shieldHP < 60) {
        scene.gameState = { ...scene.gameState, shieldHP: 100 };
        try { scene.updateUI(); } catch { /* not yet built */ }
      }
      if (scene.__deathPatched || typeof scene.endGame !== "function") continue;
      scene.__deathPatched = true;
      scene.endGame = () => {
        // Never show game-over / victory overlays or destroy the game during
        // the promo capture: silently restore and keep playing.
        try {
          scene.gameState = {
            ...scene.gameState,
            shieldHP: 100,
            gameOver: false,
            completed: false,
          };
          if (scene.gamePhase === "game-over" || scene.gamePhase === "win") {
            scene.gamePhase = "playing";
          }
          scene.updateUI();
        } catch { /* scene mid-teardown */ }
      };
    }
  });
}

/** Read live gameplay state for aiming. Returns null when not available. */
async function readState(page) {
  return page.evaluate(() => {
    const game = window.__APK_GAME__;
    if (!game) return null;
    const scene = game.scene.getScenes(false)[0];
    if (!scene || !scene.gameState || !scene.menuContainer) return null;
    return {
      phase: scene.gamePhase,
      levelType: scene.gameState.levelType,
      correctLane: scene.gameState.correctLane,
      playerX: scene.playerX,
      bosses: (scene.bossImages || []).map((b) => ({
        x: b.x, y: b.y, active: b.active, visible: b.visible,
      })),
      gigys: (scene.gigyImages || [])
        .filter((g) => g.active)
        .map((g) => ({ x: g.x, y: g.y })),
      upgrades: (scene.upgradeContainer?.list || [])
        .filter((o) => o.input)
        .map((o, i) => i),
    };
  });
}

/** Trigger the first interactive child of a container (menu buttons). */
async function emitButton(page, containerName, index) {
  return page.evaluate(([name, idx]) => {
    const s = window.__APK_GAME__?.scene.getScenes(false)[0];
    const c = s?.[name];
    if (!c) return false;
    const buttons = c.list.filter((o) => o.input);
    const btn = buttons[Math.min(idx, buttons.length - 1)];
    if (!btn) return false;
    btn.emit("pointerdown");
    return true;
  }, [containerName, index]);
}

export default async function drive(page, { wallClockMs }) {
  const start = Date.now();
  const elapsed = () => Date.now() - start;

  // ── Force the Canvas renderer, then reboot the game ────────────
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return orig.call(this, type, ...rest);
    };
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.addStyleTag({ content: STAGE_CSS });
  await page.waitForSelector(".frame canvas", { timeout: 30000 });
  await page.waitForFunction(() => !!window.__APK_GAME__, { timeout: 30000 });

  // ── Free CPU from Playwright's screencast, unpatch delta smoothing,
  //    and pump the game loop manually (compositor RAF is ~2-6 fps here) ──
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Page.stopScreencast");
  } catch (e) {
    console.log(`  [driver] stopScreencast failed (non-fatal): ${e.message}`);
  }
  await page.evaluate(() => {
    const game = window.__APK_GAME__;
    game.loop.smoothStep = false;
    window.__PUMP__ = setInterval(() => {
      try { game.loop.tick(); } catch { /* scene tearing down */ }
    }, 33);
  });

  // ── Wait for loading overlay gone + edition menu up ────────────
  await page.waitForFunction(() => {
    const game = window.__APK_GAME__;
    const s = game && game.scene.getScenes(false)[0];
    return !!(s && s.gameState && s.menuContainer && s.menuContainer.visible &&
      !s.children.list.some((o) => o.depth >= 99));
  }, undefined, { timeout: 60000 });
  await patchDeath(page);
  console.log(`  [driver] menu ready after ${elapsed()}ms`);

  // ── Start in-page canvas recording (hook + gameplay) ───────────
  await page.evaluate(() => {
    const canvas = document.querySelector(".frame canvas");
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

  // ── Hook: let the "Select Edition" screen breathe ──────────────
  await page.waitForTimeout(3500);

  // ── Pick "Chibi Quest" (first interactive menu child) ──────────
  const started = await emitButton(page, "menuContainer", 0);
  console.log(`  [driver] edition click emitted: ${started}`);
  await page.waitForFunction(() => {
    const s = window.__APK_GAME__?.scene.getScenes(false)[0];
    return s && s.gamePhase === "playing";
  }, undefined, { timeout: 10000 }).catch(() => console.log("  [driver] WARN: game did not enter playing"));
  await page.waitForTimeout(600);

  // ── Gameplay: steer ship directly, aim at targets ──────────────
  let lastPatch = Date.now();
  let targetX = 195;
  let tick = 0;

  while (elapsed() < wallClockMs - 1500) {
    tick += 1;

    if (Date.now() - lastPatch > 1500) {
      await patchDeath(page);
      lastPatch = Date.now();
    }

    const state = await readState(page).catch(() => null);

    if (state && state.phase === "upgrade" && state.upgrades.length > 0) {
      // Pick "Laser Beam" (last choice) for the flashiest footage.
      const picked = await emitButton(page, "upgradeContainer", state.upgrades.length - 1);
      console.log(`  [driver] upgrade picked (${picked}) at ${elapsed()}ms`);
      await page.waitForTimeout(800);
      continue;
    }

    if (state && state.phase === "playing") {
      if (state.levelType === "gigy-wave" && state.gigys.length > 0) {
        const lowest = state.gigys.reduce((a, b) => (b.y > a.y ? b : a));
        targetX = lowest.x;
      } else if (state.bosses.length === 3) {
        const lane = Math.max(0, Math.min(2, state.correctLane ?? 1));
        targetX = state.bosses[lane].x;
      }
      targetX += Math.sin(tick * 0.6) * 10; // human-like wobble
      targetX = Math.max(45, Math.min(345, targetX));

      // Glide the ship toward the target (update() reads playerX each frame).
      await page.evaluate((tx) => {
        const s = window.__APK_GAME__?.scene.getScenes(false)[0];
        if (!s || s.gamePhase !== "playing") return;
        const cur = s.playerX;
        s.playerX = cur + (tx - cur) * 0.25;
      }, targetX);
    }

    await page.waitForTimeout(90);
  }

  // ── Stop recording and persist the webm ────────────────────────
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
    fs.mkdirSync(path.dirname(OUT_WEBM), { recursive: true });
    fs.writeFileSync(OUT_WEBM, Buffer.from(rec.b64, "base64"));
    console.log(`  [driver] canvas recording saved: ${OUT_WEBM} (${rec.size} bytes)`);
  } else {
    console.log("  [driver] ERROR: no recording captured");
  }
  console.log(`  [driver] finished after ${elapsed()}ms`);
}
