# Crystal Courier • ผู้จัดส่งคริสตัล — Blueprint

A 10-round timed matching game built on the Week 3 Crystal Maze selected union. The Thai name of a place is shown on three glowing cards; the English name appears on a crystal. Match the right card before the 3-second countdown runs out.

- Player verb: tap a card or steer the on-screen controls / keyboard, and pick the Thai card matching the English crystal prompt.
- Visuals: each choice card is framed by a pulsing blue glow aura, a blue fire-frame image (`blue-fire-frame.png`, dark center stripped and resized from a generated asset), and rising vivid-blue fire embers (procedural radial-gradient particle texture), flaring on the selected card.
- Learning loop: read the English place name, connect it to the correct Thai card, score points, and see instant feedback.
- Repeated action: pick the correct card before the countdown, keep a combo alive, complete all 10 rounds.
- Correct consequence: crystal flashes green, `+100` (plus combo bonus up to `+30`), orb-pickup sound, burst effect.
- Incorrect consequence: crystal flashes red, `−50`, wrong-orb sound, round still advances.
- Timeout: treated as incorrect with a "Time's up" message.
- Scoring: `POINTS_CORRECT=100`, `POINTS_WRONG=50`, `COMBO_STEP=10`, `MAX_COMBO=3`; score never drops below zero.
- Difficulty: fixed `TOTAL_ROUNDS=10`; every word in `WORD_BANK` is visited exactly once per play-through.
- Win: finish all 10 rounds; end panel shows score, accuracy, correct/total, and XP.
- Lose: none — a valid `GameResults` is always emitted once at the end via `context.complete()`.
- Controls: touch/pointer on cards; virtual D-pad + directional/action buttons; keyboard WASD/arrows, Space/Enter, and 1/2/3. All work at 390×844 portrait and 1440×900 landscape.
- Tuning: adjust `TOTAL_ROUNDS`, `TIMER_MS`, `POINTS_CORRECT`, `POINTS_WRONG`, `COMBO_STEP`, `MAX_COMBO`, and `WORD_BANK` in `systems.ts`.
- Assets: resolve the Week 3 roles through `context.assets.resolve(...)`; declare them in `manifest.requiredAssetBindings`; never copy paths or URLs. The playable hero is a custom 10-frame walk-cycle spritesheet (`witch-walk.png`, 276×410 per frame) in the editable cartridges asset folder, preprocessed from a generated image with its checkerboard background removed; it replaces the resolver-only `player.hero-1` avatar. Regenerate it with `/tmp/opencode/process-witch.mjs` if the source changes.
- Credits: show **Pixel art assets by ElvGames** and **Sound effects by Universal Sound Effects**.
- Completion: call `context.complete()` exactly once with `accuracy`, `xp`, `score`, `correctAnswers`, `totalAttempts`.

The game uses its own `WORD_BANK` of ten place pairs; swap `WORD_BANK` for `context.input` in `scene.ts` to drive rounds from the host-supplied learning items instead.
