# Crystal Maze Competition Palette

The Week 3 competition ships a fixed, frozen organizer-owned union instead of asking teams to search or curate the full standard pack. The union gives every team the same legal, visual, and technical starting point while leaving enough room for distinct maze variants.

## Approved release and credit

- Release: `2026.08.04`
- Required visible credit: **Pixel art assets by ElvGames**
- Required visible credit: **Sound effects by Universal Sound Effects**

Both credits must appear visibly in the game or demo presentation.

The organizer records the shipped files and release evidence in `ASSET-LICENSES.json`. Do not add, replace, search for, or redistribute outside artwork during the event.

## Use the resolver, not a file path

Cartridge code may use only stable role IDs through `context.assets.resolve(role)`. The resolver owns public URLs, filenames, frame sizes, frame counts, and frame rates. Do not hard-code `/assets/competition/` locations, copied source filenames, remote URLs, or frame geometry.

Put the exact roles your game uses in `manifest.requiredAssetBindings`. Use no asset role that is not listed below.

## Week 3 role table (frozen)

| Role | Kind | Creative use |
|---|---|---|
| `player.hero-1` … `player.hero-6` | 32×32 sprite sheet, 6 frames, frameRate 10 | hero avatar; six visually distinct heroes, pick one |
| `goblin.scout` | 32×32 sprite sheet, 6 frames, frameRate 8 | fast patrolling enemy |
| `goblin.stalker` | 32×32 sprite sheet, 6 frames, frameRate 8 | tracking enemy |
| `goblin.brute` | 48×48 sprite sheet, 6 frames, frameRate 8 | slow heavy enemy |
| `goblin.warden` | 48×48 sprite sheet, 6 frames, frameRate 8 | sentry enemy |
| `orb.crystal-blue` | 16×16 sprite sheet, 8 frames, frameRate 9 | word orb |
| `orb.crystal-green` | 16×16 sprite sheet, 8 frames, frameRate 9 | word orb |
| `orb.crystal-yellow` | 16×16 sprite sheet, 8 frames, frameRate 9 | word orb |
| `bonus.coin` | 16×16 sprite sheet | score pickup |
| `bonus.chest` | 32×32 image | sentence-complete chest |
| `maze.wall-cavern` | 32×32 image | cavern walls |
| `maze.floor-cavern` | 32×32 image | cavern floor |
| `maze.wall-dungeon` | 32×32 image | dungeon walls |
| `maze.floor-dungeon` | 32×32 image | dungeon floor |
| `maze.wall-crypt` | 32×32 image | crypt walls |
| `maze.floor-crypt` | 32×32 image | crypt floor |
| `maze.gate` | 32×64 image | maze exit |
| `maze.torch` | 32×32 sprite sheet, 3 frames | wall decor |
| `feedback.hit` | 32×32 sprite sheet, 24 frames | goblin defeat effect |
| `audio.orb-pickup` | audio | orb collected |
| `audio.wrong-orb` | audio | wrong orb collected |
| `audio.power-up` | audio | Goblin Hunt power-up starts |
| `audio.goblin-defeat` | audio | goblin defeated |
| `audio.sentence-complete` | audio | sentence completed |
| `audio.ui-confirm` | audio | menu or UI confirmation |

Teams pick one hero, one or more goblins, one theme (cavern, dungeon, crypt) or a tasteful mix, and place walls, orbs, coins, chest, gate, and torches as the brief allows.

## Competition status

The Crystal Courier union from Weeks 1–2 is **retired for Week 3**. Do not resolve `runner.*`, `enemy.*`, `environment.*`, or the old `bonus.crystal-*` roles. A submitted cartridge is a **candidate cartridge**, not a production release. After the event, organizers will review gameplay, brief fidelity, selected-union use, license/credit evidence, and host integration before any title-specific production binding or release decision.
