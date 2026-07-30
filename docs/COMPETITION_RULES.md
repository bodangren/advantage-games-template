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

## Competition palette

Use the frozen Crystal Courier selected union in [COMPETITION_PALETTE.md](COMPETITION_PALETTE.md). Resolve its stable roles through `context.assets.resolve(role)`; never encode asset URLs, raw public paths, source filenames, or remote art links. Declare the roles your game actually uses in `manifest.requiredAssetBindings`.

The required visible credit is **Pixel art assets by ElvGames**. The supplied extra enemies, layers, crystals, coins, effect, and sound are intended to give teams room to explore different mechanics without sourcing additional art.

Crystal Courier is a suggested vocabulary-game direction, not a mandatory genre. A submission remains a candidate cartridge until post-event host, asset, license/credit, and owner review.
