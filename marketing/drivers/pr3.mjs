/**
 * Driver for pr-3 "Zombie Apocalypse" vocabulary shooter.
 *
 * Why this driver looks unusual: in this headless environment Phaser 4's
 * native loop is unusable — rAF fires at 3-10 FPS and decays over time while
 * the frame delta is clamped to ~16.6ms, so game time crawls at ~2-8% speed
 * and a 250ms tween takes ~15 wall seconds. The fix: stop the native loop
 * and step the game deterministically with `game.step(t, delta)`.
 *
 * Frame model:
 *   - capture.mjs slows tween/timer/anims timeScale to 0.5x, so each manual
 *     step of 33.333ms advances the game by exactly 16.666ms = one 60 FPS
 *     output frame.
 *   - After each step the WebGL canvas is read back synchronously with
 *     canvas.toDataURL (valid because we call it in the same JS task as the
 *     render) and written to marketing/output/pr3-frames/. The stills are
 *     assembled into the final 60 FPS mp4 — the screencast webm is only a
 *     byproduct; its frame pacing is useless in this environment.
 *   - The backing store is shrunk to 666x1440 (same aspect, layout stays
 *     "compact") to keep JPEG readback fast; ffmpeg upscales on assembly.
 *
 * Gameplay (scene.ts/systems.ts):
 *   - No title screen; play starts on mount. Thai prompt ("Find: ..."), click
 *     the zombie with the matching English word. +2s per kill, timer 30s.
 *   - Game over paths avoided: timer top-up safety patch, and we stop firing
 *     when <= 2 zombies remain so the "ESCAPED!"/results path never runs.
 *   - Bombs (time penalty) have their interactivity disabled — visuals stay.
 *
 * While the loop is stopped the scene is frozen between steps, so the target
 * position read from the scene is exact — the click cannot miss.
 */

const STEP_MS = 66.666; // -> 33.333ms of game time per step at 0.5x timeScale
const TOTAL_STEPS = 450; // 450 * 33.333ms = 15s of game time @ 30fps
const WALL_BUDGET_MS = 11 * 60 * 1000; // stop stepping past this; partial clips still assemble
const FRAMES_DIR = "marketing/output/pr3-frames";

/** Plain snapshot of the live MonsterScene via window.__APK_GAME__. */
function snapshot(page) {
  return page.evaluate(() => {
    const game = window.__APK_GAME__;
    if (!game) return null;
    const scene = game.scene.getScenes(true)[0];
    if (!scene || !scene.state) return null;
    const s = scene.state;
    const monsters = s.monsters
      .filter((m) => m.alive)
      .map((m) => {
        const v = scene.vis.get(m.id);
        return {
          id: m.id, term: m.term, isTarget: m.isTarget, shieldHp: m.shieldHp,
          x: v ? v.container.x : null, y: v ? v.container.y : null,
          visible: v ? v.container.visible : false,
        };
      });
    return {
      locked: scene.locked, gameOver: s.gameOver, completed: s.completed,
      timeLeft: s.timeLeft, score: s.score, combo: s.combo,
      aliveCount: monsters.length,
      target: monsters.find((m) => m.isTarget) ?? null,
      gameW: scene.scale.width, gameH: scene.scale.height,
    };
  });
}

/** Shrink the backing store, stop the native loop, install the stepper. */
function installManualStepper(page) {
  return page.evaluate(() => {
    const game = window.__APK_GAME__;
    game.scale.resize(480, 1040); // same ~0.4625 aspect; layout() re-runs via resize event
    game.loop.stop();
    window.__promoT = game.loop.time || 0;
    window.__promoStep = (delta) => {
      window.__promoT += delta;
      game.step(window.__promoT, delta);
      return game.canvas.toDataURL("image/jpeg", 0.82);
    };
    return true;
  });
}

/** Safety: keep the timer away from 0 and make bombs un-clickable. */
function patchSafety(page) {
  return page.evaluate(() => {
    const game = window.__APK_GAME__;
    if (!game) return;
    const scene = game.scene.getScenes(true)[0];
    if (!scene || !scene.state) return;
    const s = scene.state;
    if (!s.completed && !s.gameOver && s.timeLeft < 12) s.timeLeft = 12;
    if (scene.obstacleVis) {
      for (const ctr of scene.obstacleVis.values()) {
        if (ctr.input) ctr.disableInteractive();
      }
    }
  });
}

export default async function drive(page) {
  const fs = await import("fs");
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  // The Playwright screencast (video recording) steals most of the renderer
  // CPU in this software-rendered environment (~2.4s/frame with it vs ~0.4s
  // without). Our frames come from canvas readback, not the webm, so kill
  // the screencast. The raw webm will just end early; capture.mjs tolerates
  // that (best effort — ignore failures).
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Page.stopScreencast");
    console.log("  [driver] screencast stopped to free renderer CPU");
  } catch (e) {
    console.log(`  [driver] could not stop screencast (continuing): ${e.message}`);
  }

  await installManualStepper(page);
  await patchSafety(page);

  const canvas = page.locator(".frame canvas").first();
  const t0 = Date.now();
  let frame = 0;
  let kills = 0;
  let stopFiring = false;

  /** Advance one game frame and save the canvas as JPEG. */
  const stepAndCapture = async () => {
    const dataUrl = await page.evaluate((d) => window.__promoStep(d), STEP_MS);
    frame++;
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    fs.writeFileSync(`${FRAMES_DIR}/f${String(frame).padStart(4, "0")}.jpg`, Buffer.from(b64, "base64"));
    if (frame % 30 === 0) {
      console.log(`  [driver] frame ${frame}/${TOTAL_STEPS} (${(frame / 30).toFixed(1)}s game) wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  };

  // Opening hook: ~1.5 game-seconds of idle zombie floating.
  for (let i = 0; i < 45; i++) await stepAndCapture();

  while (frame < TOTAL_STEPS && Date.now() - t0 < WALL_BUDGET_MS) {
    const snap = await snapshot(page);
    if (!snap) {
      await stepAndCapture();
      continue;
    }
    if (snap.gameOver || snap.completed) {
      console.log(`  [driver] TERMINAL state (gameOver=${snap.gameOver} completed=${snap.completed}) at frame ${frame} — idling`);
      await stepAndCapture();
      continue;
    }
    if (snap.aliveCount <= 2 && !stopFiring) {
      stopFiring = true;
      console.log(`  [driver] ${snap.aliveCount} zombies left at frame ${frame} — holding fire to avoid the win screen`);
    }

    const canFire =
      !stopFiring && !snap.locked && snap.target &&
      snap.target.x != null && snap.target.visible;

    if (canFire) {
      const box = await canvas.boundingBox();
      if (box) {
        const px = box.x + (snap.target.x / snap.gameW) * box.width;
        const py = box.y + (snap.target.y / snap.gameH) * box.height;
        await page.mouse.click(px, py);
        kills++;
        console.log(
          `  [driver] frame=${frame} kill #${kills}: "${snap.target.term}" ` +
            `shield=${snap.target.shieldHp} combo=${snap.combo} score=${snap.score} tl=${snap.timeLeft} alive=${snap.aliveCount}`
        );
      }
    }

    // After a shot, let the projectile/death animation play out in frames.
    // Between shots, hold briefly so the prompt stays readable.
    const burst = canFire ? (kills % 4 === 0 ? 75 : 52) : 3;
    for (let i = 0; i < burst && frame < TOTAL_STEPS; i++) await stepAndCapture();

    if (frame % 60 === 0) await patchSafety(page);
  }

  const end = await snapshot(page);
  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `  [driver] done: frames=${frame} wall=${wall}s kills=${kills} score=${end?.score} ` +
      `combo=${end?.combo} alive=${end?.aliveCount} tl=${end?.timeLeft} gameOver=${end?.gameOver} completed=${end?.completed}`
  );
}
