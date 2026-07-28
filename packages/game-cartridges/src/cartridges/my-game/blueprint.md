# Zombie Apocalypse — Escape the Graveyard

## Mechanic
- Zombies fill a graveyard, each displaying a vocabulary **term**.
- A target **translation** is shown at the top of the screen.
- The player must **shoot** the zombie whose term matches the translation.
- Correct shot: zombie dies (spin + shrink + stars burst), score based on combo, +2s timer bonus.
- Wrong shot: zombie dodges, red X appears, camera shake, combo resets.
- **30-second countdown timer.** Each correct hit adds +2 seconds.
- **Combo system:** consecutive correct hits build a multiplier (x3 GOOD, x5 GREAT, x10 INCREDIBLE).
- **Obstacles:** Bombs (click = -3s + combo reset) and bats (visual distractions).
- Clear all zombies to **escape the graveyard** and win.

## Zombie Types

| Type | Skin Color | Behavior | Difficulty |
|------|------------|----------|------------|
| **Normal** | Green-gray | Static target | Easy |
| **Shy** | Gray-blue | Fades out every 2.5s for 0.9s | Medium |
| **Fast** | Red-gray | Moves 2.5x faster, speed lines | Hard |
| **Shield** | Brown-gray | Must be hit twice (shield crack effect) | Medium |

## Obstacles

| Type | Effect | Visual |
|------|--------|--------|
| **Bomb** | -3s time penalty + combo reset | Dark bomb with fuse and spark, pulsing |
| **Bat** | Visual distraction only | Flying across screen with wing flap |

## Visual Design
- **Dark fantasy background:** Purple-black sky, crescent moon, dead trees, fog bands, tombstones, grass.
- **Zombie monsters:** Green-gray bodies, hollow eyes, tattered clothes, reaching arms.
- **Player cannon:** Visible cannon at bottom that aims toward the target.
- **Projectile:** Star-shaped projectile flies from cannon to zombie.
- **Timer bar:** Green → yellow → red bar at top.
- **Combo text:** "x3 GOOD!", "x5 GREAT!", "x10 INCREDIBLE!" with pop animation.
- **Streak flame:** Glowing aura around cannon when combo 3+.
- **Door:** Wooden door with arch, panels, doorknob. Glows on win, camera zooms to it.

## Hit Effects (by combo tier)
| Tier | Score | Flash | Particles |
|------|-------|-------|-----------|
| Normal (0-2) | 100-150 | White-green | 10 stars, 4 coins |
| Good (3-4) | 175-200 | Green | 15 stars, 8 coins |
| Great (5-9) | 225-275 | Bright green | 20 stars, 8 coins |
| Incredible (10+) | 300 | Green + shake | 25 stars, 8 coins |

## Win Condition
- All zombies dead before timer expires.
- "ESCAPED!" banner → camera zooms to door → fade to black → results with per-word summary.

## Lose Condition
- Timer hits 0.
- "TIME'S UP!" banner → results with per-word summary.

## Controls
- **Touch/Pointer**: Tap or click on a zombie to shoot it.
- **Keyboard**: Press number keys 1-9 to shoot the corresponding zombie.
