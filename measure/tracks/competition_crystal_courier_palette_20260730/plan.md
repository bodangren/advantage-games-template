# Implementation Plan: Crystal Courier Competition Palette

## Phase 1: Palette contract and selected assets

- [x] Define typed palette roles, metadata, and the allowed selected-union boundary in the protected Play Kit.
- [x] Write a deterministic palette test before implementation.
- [x] Copy only the approved runner, enemy, environment, bonus, feedback, and audio files into template-local public assets.
- [x] Implement the resolver and make the runtime pass it to cartridges.

## Phase 2: Starter and competition directions

- [x] Update the starter manifest, blueprint, and Phaser scene to demonstrate Crystal Courier through palette roles only.
- [x] Add the palette guide and revise the rules, contract, judging, submission instructions, README, and AGENTS guidance.

## Phase 3: Verification and release

- [x] Run the focused Red/Green palette test, then `pnpm validate`.
- [x] Review the scoped diff, commit only track, palette, starter, asset, and direction files, then push `main` to `origin`.
