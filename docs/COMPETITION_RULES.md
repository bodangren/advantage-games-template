# Competition Rules

- Development runs from 09:00 to 17:00, for eight hours total.
- Submit at 17:00 exactly.
- Present a three-minute pitch and live demo.
- Demonstrate compact portrait at 390×844 and wide landscape at 1440×900.
- Build one Phaser 4 educational cartridge using the supplied contracts and host.
- Gameplay renders in Phaser canvas. Host-level controls may remain outside it.
- Support touch/pointer and keyboard-equivalent control.
- Keep Thai and English learning text complete and readable.
- Support both supplied development editions without changing educational behavior or geometry.
- Emit a valid `GameResults` once. The host owns persistence and authoritative XP.
- Work only in paths permitted by `AGENTS.md`; do not weaken competition infrastructure.
- Run `pnpm validate` before submission.

## Week 3 fixed brief

Week 3 implements the fixed **Crystal Maze** brief in [CRYSTAL_MAZE.md](CRYSTAL_MAZE.md): a Pac-Man-style sentence game with the sentence-order orb rule, the Goblin Hunt power-up, lives, and a 3→7 word difficulty ramp. The concept is fixed; do not pitch a different genre.

## Competition palette

Use the frozen Week 3 Crystal Maze selected union in [COMPETITION_PALETTE.md](COMPETITION_PALETTE.md). Resolve its stable roles through `context.assets.resolve(role)`; never encode asset URLs, raw public paths, source filenames, or remote art links. Declare the roles your game actually uses in `manifest.requiredAssetBindings`.

The required visible credits are **Pixel art assets by ElvGames** and **Sound effects by Universal Sound Effects**. The extra heroes, goblins, orbs, themes, and sounds give teams room for slightly different combinations without sourcing additional art.

## Judging

Judging follows [JUDGING.md](JUDGING.md). Fidelity to the fixed Crystal Maze brief counts: the order rule, power-up rule, lives, ramp, and win/lose behavior must match the brief. Within the brief, teams may vary maze layout, hero/goblin/theme picks, orb placement, and speeds. A submission remains a candidate cartridge until post-event host, asset, license/credit, and owner review.
