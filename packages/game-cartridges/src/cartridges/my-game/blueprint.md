# Crystal Maze Blueprint

Crystal Maze is the fixed Week 3 brief: a Pac-Man-style sentence game. The Thai sentence is displayed; the English sentence's words are word orbs in the maze; the player collects them in sentence order.

## Core Mechanics

- **Maze:** 15×15 tile grid generated with recursive-backtracker algorithm (~15% walls removed for loops). Cavern theme (wall-cavern + floor-cavern)
- **Hero:** Controlled via WASD/Arrow keys + pointer/touch swipe. Continuous pixel-based movement between tiles with buffered directional input
- **Orb Collection:** One orb per English word placed at unique maze positions. Only the next correct orb can be collected (glow indicator via `isNext` state). Correct orb → +100 score, advance word progress. Wrong orb → stun (first offense) or life loss (subsequent)
- **Goblin Hunt Power-up:** Completing a sentence in correct order activates an 8-second power-up. Goblins flee; can be defeated for +200 bonus score
- **Goblins:** 3 scout goblins patrol randomly. Contact without power-up → stun/life loss. Defeated goblins removed
- **Lives:** 3 starting. Lose on goblin contact or repeated wrong orbs. Game over when lives reach 0
- **Sentence Progression:** Power-up expiry → next sentence spawns with new orbs and goblin positions
- **Difficulty Ramp:** Sentences vary from 3 to 7 words (controlled by host input)

## Controls

- **Keyboard:** WASD or arrow keys (buffered for smooth tile-to-tile turning)
- **Touch/Pointer:** Swipe for direction; drag to continuously steer toward pointer

## Viewport Composition

- **Compact (390×844):** Thai sentence + word progress at top, maze centered below, score/lives/power-up indicator in header area, credits at bottom
- **Wide (1440×900):** Same layout but wider maze with larger tiles (up to 48px)

## Asset Bindings

| Role | Use |
|---|---|
| `player.hero-1` | Hero avatar (32×32, 6 frames) |
| `goblin.scout` | Patrolling enemy (32×32, 6 frames) |
| `orb.crystal-blue` | Word orbs (16×16, 8 frames) |
| `bonus.chest` | Sentence-complete visual |
| `maze.wall-cavern` | Wall tiles (32×32) |
| `maze.floor-cavern` | Floor tiles (32×32) |
| `maze.gate` | Maze exit marker (32×64) |
| `feedback.hit` | Damage/defeat effect (32×32, 24 frames) |
| `audio.orb-pickup` | Correct orb collected |
| `audio.wrong-orb` | Wrong orb / goblin hit |
| `audio.power-up` | Goblin Hunt activation |
| `audio.goblin-defeat` | Goblin defeated |
| `audio.sentence-complete` | Sentence completed |
| `audio.ui-confirm` | Power-up expiry / transition |

## Credits

- Pixel art assets by ElvGames
- Sound effects by Universal Sound Effects
