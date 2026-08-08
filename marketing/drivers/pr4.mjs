/**
 * PR-4 driver: "Vocabulary Typing Survivor" (typing survival game).
 *
 * Flow: Boot -> Title (hook, ~3.5s wall) -> Preloader -> Game.
 * Gameplay: jellyfish enemies carry words; typing the highlighted word's
 * letters damages them. Player takes damage on contact -> game over.
 *
 * Environment quirks handled here (do NOT "fix" the shared harness):
 *   - Headless SwiftShader renders slowly (~20-30ms/frame) and Chromium's
 *     RAF only ticks ~7-8/s, so the game's own loop crawls. This driver
 *     stops the RAF loop and steps `game.loop.step(t)` manually from Node,
 *     advancing game-time at exactly 0.5x wall-clock (matches the harness's
 *     2x speed-up pipeline => normal-speed gameplay in the final clip).
 *   - The harness slow-mo patch sets per-scene timeScales; since we control
 *     pacing via the step delta, those are re-asserted to 1 every cycle.
 *   - `sys.sceneUpdate` is cached at scene create in Phaser 4, so wrapping
 *     `scene.update` (what the harness does) is a no-op here; deltas are
 *     honest anyway because we pass them directly.
 *
 * Death patching (re-applied every 1.2s):
 *   - Player.takeDamage no-op'd => no death / GameOver path.
 *   - LevelUp overlay auto-picks skill 0 after a short beat so the upgrade
 *     card flashes on screen without stalling the run.
 *   - GameOver safety net: jump straight back into Game.
 */

const FRAME_CSS = `
  .frame {
    width: 800px !important;
    height: 600px !important;
    transform: translate(-50%, -50%) scale(1.35) !important;
    transform-origin: center center !important;
  }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function drive(page, { wallClockMs }) {
  const startedAt = Date.now();
  const deadline = startedAt + wallClockMs - 400; // small tail for a clean cut

  // Re-stage the compact frame to the game's native 800x600 composition.
  await page.addStyleTag({ content: FRAME_CSS });

  // Force native resolution and take over the (crawling) RAF loop.
  // - ScaleModes.NONE (0) so the RESIZE observer can't stomp the size back.
  // - smoothStep off so the deltas we feed in arrive unsmoothed.
  await page.evaluate(() => {
    const game = window.__APK_GAME__;
    game.scale.scaleMode = 0; // Phaser.Scale.ScaleModes.NONE
    game.scale.resize(800, 600);
    game.loop.smoothStep = false;
    game.loop.stop();
    window.__promoT = game.loop.lastTime || 0;
  });

  // Manual step loop: one game frame per iteration, game-time += 0.5x the
  // wall time since the previous step (rate-adaptive, so pacing holds even
  // when a step is slow to render).
  let stepping = true;
  let lastStepWall = Date.now();
  const stepLoop = (async () => {
    while (stepping) {
      const now = Date.now();
      const gameDelta = Math.min(100, Math.max(1, (now - lastStepWall) * 0.5));
      lastStepWall = now;
      await page
        .evaluate((d) => {
          const game = window.__APK_GAME__;
          if (!game) return;
          window.__promoT += d;
          try {
            game.loop.step(window.__promoT);
          } catch (e) {
            /* transient during scene teardown */
          }
        }, gameDelta)
        .catch(() => {});
      await sleep(25);
    }
  })();

  // God-mode / overlay handling / timeScale re-assertion, every 1.2s.
  const patch = () =>
    page
      .evaluate(() => {
        const g = window.__APK_GAME__;
        if (!g) return;

        // We pace via step deltas; keep all time subsystems at 1x.
        for (const s of g.scene.getScenes(false)) {
          if (s.tweens && s.tweens.timeScale !== 1) s.tweens.timeScale = 1;
          if (s.time && s.time.timeScale !== 1) s.time.timeScale = 1;
          if (s.physics && s.physics.world && s.physics.world.timeScale !== 1) s.physics.world.timeScale = 1;
          if (s.anims && s.anims.globalTimeScale !== 1) s.anims.globalTimeScale = 1;
        }

        // Keep native 800x600 render size (RESIZE observer insurance).
        if (g.scale.width !== 800 || g.scale.height !== 600) {
          g.scale.scaleMode = 0;
          g.scale.resize(800, 600);
        }

        const gs = g.scene.getScene("Game");
        if (gs && gs.player && !gs.player.__promoGod) {
          gs.player.__promoGod = true;
          gs.player.takeDamage = () => {};
        }

        if (g.scene.isActive("LevelUp")) {
          const lu = g.scene.getScene("LevelUp");
          if (lu && lu.skills && lu.skills.length && !lu.__promoPicking) {
            lu.__promoPicking = true;
            setTimeout(() => {
              try {
                lu.selectSkill(lu.skills[0]);
              } catch (e) {
                /* scene may have stopped */
              }
              lu.__promoPicking = false;
            }, 700);
          }
        }

        // Safety net: should a GameOver ever appear, jump straight back in.
        if (g.scene.isActive("GameOver")) {
          g.scene.getScene("GameOver").scene.start("Game");
        }
      })
      .catch(() => {});
  await patch();
  const patchTimer = setInterval(patch, 1200);

  // Occasional movement bursts so the submarine visibly swims around.
  const DIRS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
  let moving = false;
  const moveTimer = setInterval(async () => {
    if (moving) return;
    moving = true;
    try {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
      await page.keyboard.down(dir);
      await sleep(350 + Math.random() * 400);
      await page.keyboard.up(dir);
    } catch (e) {
      /* page closed */
    }
    moving = false;
  }, 2600);

  try {
    // Wait for the animated title screen (manual steps drive the transition).
    await page.waitForFunction(
      () => window.__APK_GAME__ && window.__APK_GAME__.scene.isActive("Title"),
      { timeout: 30000 }
    );

    // Hook: hold the title screen ~3.5s wall-clock.
    await sleep(3500);

    // Press START (programmatic scene start; robust against overlay quirks).
    await page.evaluate(() => {
      const g = window.__APK_GAME__;
      const title = g.scene.getScene("Title");
      if (title && g.scene.isActive("Title")) title.scene.start("Preloader");
    });

    await page.waitForFunction(
      () => window.__APK_GAME__.scene.isActive("Game"),
      { timeout: 30000 }
    );

    // Typing loop: read the live target word, press the next expected letter.
    let lastWord = null;
    let wordTyped = 0;
    while (Date.now() < deadline) {
      const info = await page
        .evaluate(() => {
          const g = window.__APK_GAME__;
          if (!g) return { state: "boot" };
          if (g.scene.isActive("LevelUp")) return { state: "levelup" };
          if (!g.scene.isActive("Game")) return { state: "transition" };
          const s = g.scene.getScene("Game");
          const ts = s.typingSystem;
          if (!ts) return { state: "transition" };
          const t = ts.getCurrentTarget();
          if (!t || !t.active || !t.word) return { state: "no-target" };
          return { state: "play", word: t.word, typed: ts.getTypedCount() };
        })
        .catch(() => ({ state: "transition" }));

      if (info.state === "play") {
        if (info.word !== lastWord) {
          if (lastWord !== null && wordTyped > 0) {
            await sleep(120 + Math.random() * 180); // kill beat
          }
          lastWord = info.word;
          wordTyped = info.typed;
        }
        const ch = info.word[info.typed];
        if (ch && ch >= "a" && ch <= "z") {
          await page.keyboard.press(ch);
          wordTyped = info.typed + 1;
          await sleep(40 + Math.random() * 50);
        } else {
          await sleep(100);
        }
      } else if (info.state === "no-target") {
        lastWord = null;
        wordTyped = 0;
        await sleep(250);
      } else {
        lastWord = null;
        wordTyped = 0;
        await sleep(200);
      }
    }
  } finally {
    stepping = false;
    clearInterval(patchTimer);
    clearInterval(moveTimer);
    await stepLoop.catch(() => {});
  }
}
