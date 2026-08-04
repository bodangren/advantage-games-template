# Crystal Maze Blueprint

Crystal Maze is the fixed Week 3 brief: a Pac-Man-style sentence game. The Thai sentence is displayed; the English sentence's words are word orbs in the maze; the player collects them in sentence order. Start from this blueprint; adjust details, not the brief.

- Player verb: steer the hero through the maze with touch/pointer or WASD/arrows.
- Learning loop: read the Thai sentence, then collect its English words in sentence order; each correct orb advances the sentence.
- Repeated action: collect the next glowing word orb, avoid goblins, complete the sentence, open the chest, start the next sentence.
- Order rule: only the next correct word glows; a wrong orb costs a life or stuns (audio.wrong-orb).
- Correct consequence: orb collected (audio.orb-pickup), score advances; a sentence completed in correct order grants the timed Goblin Hunt power-up (audio.power-up).
- Power-up: while Goblin Hunt is active, goblins flee and can be defeated for bonus score (feedback.hit + audio.goblin-defeat); then the next sentence spawns (audio.sentence-complete).
- Incorrect consequence: wrong orb, or goblin contact without a power-up, costs a life.
- Difficulty ramp: sentences grow from 3 to 7 words.
- Win condition: complete all supplied sentences.
- Lose condition: lives exhausted.
- Controls: touch/pointer steering; keyboard WASD or arrow keys; both work at 390×844 portrait and 1440×900 landscape.
- Assets: resolve the Week 3 roles through `context.assets.resolve(...)`; declare them in `manifest.requiredAssetBindings`; never copy paths or URLs.
- Credits: show **Pixel art assets by ElvGames** and **Sound effects by Universal Sound Effects**.
- Completion: call `context.complete()` exactly once with `accuracy`, `xp`, `score`, `correctAnswers`, `totalAttempts`.

Teams may vary maze layout, hero/goblin/theme picks, orb placement, and speeds within the brief. Preserve the learning loop, contract, responsive layouts, and palette rules in [COMPETITION_PALETTE.md](../../../../../docs/COMPETITION_PALETTE.md).
