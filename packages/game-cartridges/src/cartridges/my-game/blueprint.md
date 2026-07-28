# Star Speller 2D — Blueprint

## Game Concept

ยานพิฆาตสะกดคำในห้วงอวกาศนีออน — a 2D space shooter where players learn vocabulary by shooting the correct boss ship that matches a Thai translation prompt. Neon synthwave aesthetic with 2.5D perspective road grid.

## Dual-Theming (Skin System)

Two skins selectable via DOM overlay menu before game start:

- **Chibi Core**: Pink neon, pastel blue, bright glowing tones
- **Riven Deep**: Red fire, volcanic orange, ember particle effects

Skin changes only tints, background colors, and decoration tones. Flight coordinates and collider positions remain identical.

## Player Ships

Player chooses one of two ships at game start:

- **Player1.png** — Ship A
- **Player2.png** — Ship B

Ships are smaller than bosses. Controlled via touch/pointer drag or keyboard (Left/Right, A/D).

## Level Structure (10 Levels)

Each level displays a Thai translation banner at the top. Three boss ships appear in left/center/right lanes. One boss carries the correct English term; two carry distractors. Boss images are drawn from Boss1–Boss10.png, reused across levels but never duplicated within the same level.

## Boss Minions (Gigys)

Gigy1–Gigy6.png — smaller ships that form army formations behind bosses. They shoot Bullet2.png at the player. Very weak (1 hit to destroy). Number of gigys increases with difficulty.

## Bullets & Lasers

- **Bullet1.png** — Player's standard weapon
- **Bullet2.png** — Used by bosses and gigys against the player
- **Laser1.png / Laser2.png** — Player only; unlocked via upgrade after level 1

## Learning Loop

1. Translation banner shows Thai meaning
2. Three bosses appear with English terms (1 correct, 2 distractors)
3. Player shoots the correct boss
4. **Correct**: Chain explosion destroys all 3 bosses → upgrade menu appears → advance to next level
5. **Incorrect**: Shield HP −15%, screen shake, red flash, boss respawns with new distractors

## Difficulty Scaling

| Levels | Speed | Boss HP | Gigy Count |
|--------|-------|---------|------------|
| 1–3    | 1.0x  | 3 hits  | 2          |
| 4–6    | 1.3x  | 4 hits  | 3          |
| 7–8    | 1.6x  | 5 hits  | 4          |
| 9–10   | 2.0x  | 6 hits  | 5          |

## Upgrade System (DOM Overlay)

After each correct chain explosion, a DOM popup offers one of:

- **Fire Rate Boost** — 35% faster shooting
- **Double Shot** — Two bullets per shot
- **Laser Beam** — High-powered laser (uses Laser1/Laser2.png)

## Consequences

- **Correct**: Green particle explosion, chain detonation, synth beep (523Hz + 659Hz), upgrade menu
- **Incorrect**: Red flash, screen shake, low buzz (120Hz square wave), shield −15%, boss respawn

## Win/Lose

- **Win**: Complete all 10 levels → emit GameResults once
- **Lose**: Shield HP reaches 0 → Game Over → emit GameResults once

## Controls

- Touch/pointer drag: move ship left/right
- Keyboard: Left/Right or A/D to move, Space/Click to shoot
- Both compact (390×844) and wide (1440×900) layouts supported

## Teardown

On game end: stop all audio, destroy Phaser game instance, clean up DOM overlays.
