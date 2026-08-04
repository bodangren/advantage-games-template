# Crystal Maze — Week 3 Fixed Game Brief

**Crystal Maze** — a Pac-Man-style sentence game. The host supplies `{ term, translation }` records (inputMode "sentence"; term = English sentence, translation = Thai). The Thai sentence is displayed. The English sentence's words appear in the maze as word orbs (crystals). The player steers the hero through the maze (touch/pointer + keyboard) collecting orbs.

This brief is fixed. Weeks 1–2 were too open-ended; Week 3 contestants implement this brief and this asset union only.

## Core loop

1. Display the Thai sentence.
2. Spawn the English sentence's words as word orbs in the maze.
3. Steer the hero through the maze collecting orbs.
4. Complete the sentence in correct order; the next sentence spawns.
5. Win by completing all sentences; lose when lives are exhausted.

## Order rule

- Orbs must be collected in sentence order — the next correct word glows.
- Collecting a wrong orb costs a life or stuns the hero (audio.wrong-orb).
- Exactly one next-correct word exists at a time; make it unmistakable.

## Power-up rule

- Completing a sentence in correct order grants a timed "Goblin Hunt" power-up.
- While active, goblins flee and can be defeated for bonus score (feedback.hit + audio.goblin-defeat).
- On timer expiry, goblins resume patrol.

## Lives

- Goblin contact without a power-up costs a life.
- A wrong orb costs a life or stuns.
- Lives are finite; exhausting them loses the game.

## Difficulty ramp

- Sentences ramp from 3 to 7 words.

## Win / lose

- Win: complete all sentences.
- Lose: lives exhausted.
- Call `context.complete()` exactly once with the five contract fields: `accuracy`, `xp`, `score`, `correctAnswers`, `totalAttempts`.

## Controls

- Touch/pointer steering.
- Keyboard: WASD or arrow keys.
- Both control schemes must work at both viewports.

## Viewports

- Portrait 390×844: vertical maze flow, large touch targets, prompt above the maze.
- Landscape 1440×900: wider maze, prompt above or beside the maze.
- One game source; compose per viewport, never branch by product or edition.

## Asset roles

All assets resolve through `context.assets.resolve(role)` and must be declared in `manifest.requiredAssetBindings`. No URLs, paths, source filenames, or external art.

| Role | Kind | Use |
|---|---|---|
| `player.hero-1` … `player.hero-6` | 32×32 spritesheet, 6 frames, frameRate 10 | hero avatar; six visually distinct heroes, pick one |
| `goblin.scout` | 32×32 spritesheet, 6 frames, frameRate 8 | fast patrolling enemy |
| `goblin.stalker` | 32×32 spritesheet, 6 frames, frameRate 8 | tracking enemy |
| `goblin.brute` | 32×32 spritesheet, 6 frames, frameRate 8 | slow heavy enemy |
| `goblin.warden` | 32×32 spritesheet, 6 frames, frameRate 8 | sentry enemy |
| `orb.crystal-blue` | 16×16 spritesheet, 8 frames, frameRate 9 | word orb |
| `orb.crystal-green` | 16×16 spritesheet, 8 frames, frameRate 9 | word orb |
| `orb.crystal-yellow` | 16×16 spritesheet, 8 frames, frameRate 9 | word orb |
| `bonus.coin` | 16×16 spritesheet | score pickup |
| `bonus.chest` | 32×32 image | sentence-complete chest |
| `maze.wall-cavern`, `maze.floor-cavern` | 32×32 images | cavern theme |
| `maze.wall-dungeon`, `maze.floor-dungeon` | 32×32 images | dungeon theme |
| `maze.wall-crypt`, `maze.floor-crypt` | 32×32 images | crypt theme |
| `maze.gate` | 32×64 image | maze exit |
| `maze.torch` | 32×32 spritesheet, 3 frames | wall decor |
| `feedback.hit` | 32×32 spritesheet, 24 frames | goblin defeat effect |
| `audio.orb-pickup` | ogg | orb collected |
| `audio.wrong-orb` | ogg | wrong orb collected |
| `audio.power-up` | ogg | Goblin Hunt starts |
| `audio.goblin-defeat` | ogg | goblin defeated |
| `audio.sentence-complete` | ogg | sentence completed |
| `audio.ui-confirm` | ogg | menu / UI confirmation |

Themes: pick one of cavern, dungeon, or crypt, or mix tastefully.

## Required credit

Show both, visibly in game or demo presentation:

- **Pixel art assets by ElvGames**
- **Sound effects by Universal Sound Effects**

## Non-goals

- No new art. Use only the roles above.
- No extra mechanics beyond the brief. Teams MAY vary maze layout, hero/goblin/theme picks, orb placement, and speeds — the "slightly different combinations" freedom. Do not add genres, alternate sentence modes, or scoring systems beyond the brief.
