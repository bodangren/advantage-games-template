# Crystal Maze Blueprint

Crystal Maze is the fixed Week 3 brief: a Pac-Man-style sentence game. The Thai sentence is the prompt; the English sentence's words are crystal orbs scattered through a cavern maze; the learner steers a hero and collects them **in sentence order**.

## Learning loop

- **Player verb:** steer the hero through maze corridors with WASD, arrow keys, or pointer/touch drag.
- **Learning loop:** read the Thai sentence in the panel, find the one glowing orb carrying the next English word, collect it, watch the progress line fill a blank, repeat to the end of the sentence.
- **Repeated action:** hunt the next glowing orb, dodge goblins, finish the sentence, ride the Goblin Hunt power-up, start the next sentence.
- **Readability:** the panel shows the full Thai sentence (wrapped, never truncated) above an English progress line — collected words are printed, uncollected words are blanks sized to the word. Every orb also carries its own word label.

## Rules implemented

- **Order rule:** exactly one orb is the next correct word. It is yellow, pulses, and sits inside an accent-coloured glow ring; every other orb is dimmed to 45% alpha. Collecting any other orb plays `audio.wrong-orb`, shakes the camera, tints the hero red, and **stuns** the hero for 850 ms while scoring −25.
- **Power-up:** finishing a sentence in order opens the chest, plays `audio.sentence-complete` and `audio.power-up`, and grants **Goblin Hunt** for 6 s. Goblins turn blue, flee the hero at 60% speed, and can be defeated for +150 with `feedback.hit` and `audio.goblin-defeat`; they respawn at their home cell 2.6 s later. On expiry they resume chase and patrol.
- **Lives:** 3. Goblin contact without the power-up costs a life, returns the hero to spawn, and grants 1.6 s of invulnerability. Zero lives ends the run.
- **Difficulty ramp:** rounds are sorted by word count ascending, so any host sentence set plays as the brief's 3 → 7 word ramp. Goblins on the board scale with the round: 1 → 2 → 3 → 4 (scout patrols, stalker chases, brute chases slowly, warden patrols).
- **Win / lose:** win by completing every supplied sentence; lose when lives are exhausted. Either path calls `context.complete()` exactly once, guarded by a `finished` flag.

## Two viewports, one maze source

The maze is authored once as a 15 × 19 portrait template in `systems.ts`. The landscape maze is its **transpose** (19 × 15), so both profiles are the same maze source composed differently — never a product or edition branch.

- **390 × 844 compact:** tall maze with vertical flow, prompt panel across the top, large tiles for touch targets.
- **1440 × 900 wide:** transposed wide maze, prompt panel down the left side, maze centred in the remaining area.
- Rotating between profiles mid-run flips every cell (hero, goblins, orbs, coins, headings) so play continues without a reset.

## Systems and contract

- `systems.ts` is pure and deterministic: maze parsing and transposition, corridor movement, goblin direction choice, seeded orb placement, the order rule, lives, and result mapping. All of it is unit tested, including a flood fill proving every corridor is reachable.
- `scene.ts` owns Phaser rendering, input, audio, and layout only.
- Completion emits exactly `accuracy`, `xp`, `score`, `correctAnswers`, `totalAttempts`. `totalAttempts` counts every orb touched; `correctAnswers` counts in-order orbs.
- Teardown removes the resize listener, pointer handlers, keyboard keys, tweens, timers, and audio on scene shutdown.

## Palette and credit

Every asset is resolved through `context.assets.resolve(role)` and declared in `manifest.requiredAssetBindings`; no URL, path, filename, or frame geometry is written in cartridge code. Theme: **cavern**. Hero: `player.hero-3`. Orbs: yellow = next correct word, green = final word of the sentence, blue = later words.

Required visible credit is rendered in the prompt panel at all times:

**Pixel art assets by ElvGames  •  Sound effects by Universal Sound Effects**

Teams may vary maze layout, hero/goblin/theme picks, orb placement, and speeds within the brief. Palette rules are in [COMPETITION_PALETTE.md](../../../../../docs/COMPETITION_PALETTE.md).
