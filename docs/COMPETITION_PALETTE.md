# Crystal Courier Competition Palette

The competition ships a small, frozen organizer-owned union instead of asking teams to search or curate the full standard pack. The union gives every clone the same legal, visual, and technical starting point while leaving enough room for distinct games.

## Approved release and credit

- Release: `2026.07.23`
- Catalog digest: `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`
- Source receipt digest: `93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9`
- Required visible credit: **Pixel art assets by ElvGames**

The organizer records the shipped files and release evidence in `ASSET-LICENSES.json`. Do not add, replace, search for, or redistribute outside artwork during the event.

## Use the resolver, not a file path

Cartridge code may use only stable role IDs through `context.assets.resolve(role)`. The resolver owns public URLs, filenames, frame sizes, frame counts, and frame rate. Do not hard-code `/assets/competition/` locations, copied source filenames, remote URLs, or frame geometry.

Put the exact roles your game uses in `manifest.requiredAssetBindings`. Use no asset role that is not listed below.

| Role | Kind | Creative use |
|---|---|---|
| `runner.idle` | 32×32 sprite sheet | player avatar, guide, or courier |
| `runner.walk` | 32×32 sprite sheet | movement, progress, or success |
| `enemy.sentinel` | 32×32 sprite sheet | mistake feedback or route guard |
| `enemy.scout` | 48×48 sprite sheet | fast hazard, rival, or secondary NPC |
| `enemy.brute` | 48×48 sprite sheet | boss, blocker, or milestone |
| `environment.forest` | image | backdrop or layered world |
| `environment.clouds` | image | sky layer, parallax, or mood |
| `environment.terrain` | image | floor, path, gate, or board edge |
| `bonus.crystal-blue` | 16×16 sprite sheet | standard reward |
| `bonus.crystal-green` | 16×16 sprite sheet | streak, hint, or alternate reward |
| `bonus.crystal-yellow` | 16×16 sprite sheet | high-value reward or checkpoint |
| `bonus.coin` | 16×16 sprite sheet | score, retry, or collectible |
| `feedback.hit` | 32×32 sprite sheet | impact, correction, or selection feedback |
| `audio.feedback-hit` | audio | brief selection or consequence cue |

The reference cartridge uses a subset. The extra enemies, crystals, environment layers, and feedback assets are deliberately available for teams to create a chase, lane-choice, checkpoint, memory, or light action game without needing new art.

## Suggested challenge: Crystal Courier

A learner sees an English word and chooses the Thai translation that opens the courier's next route. Correct decisions move the courier and collect crystals; incorrect decisions wake a sentinel or interrupt a streak. This is a useful scope because the repeated player action, educational decision, and visible consequence are clear.

It is an inspiration, not a hidden judging requirement. Teams may choose another mechanic if it keeps the contract, uses the selected palette, and makes the learning loop obvious.

## Competition status

A submitted cartridge is a **candidate cartridge**, not a production release. After the event, organizers will review gameplay, selected-union use, license/credit evidence, and host integration before any title-specific production binding or release decision.
