# Advantage Game Authoring Template

Build a Phaser 4 educational game, validate it against a pinned Advantage Play Kit beta, and submit it as a Reading Advantage pull request.

## Start

```bash
git clone https://github.com/bodangren/advantage-games-template.git
cd advantage-games-template
corepack enable
pnpm install
pnpm dev
```

The game lab opens at `http://localhost:5173`.

Use Node.js 24 and pnpm 11.8.0. The repository pins both versions.

## Build A Game

1. Read [the intern workflow](docs/INTERN_WORKFLOW.md).
2. Replace the starter plan in `packages/game-cartridges/src/cartridges/my-game/blueprint.md`.
3. Update the candidate manifest in `manifest.ts`.
4. Write rule tests in `systems.test.ts`.
5. Implement the rules in `systems.ts`.
6. Build the Phaser mechanic in `scene.ts`.
7. Run `pnpm validate`.
8. Submit compact and wide screenshots with the pull request.

Interns work only in the candidate cartridge directory and `cartridge-candidate.json`.

## Pinned Beta

This repository uses:

- APK source commit `f6d1ed5a6e7d71caa60b5b822364294c405e181a`
- Developer-kit API `2.0.0`
- Runtime API `1.0.0`
- Standard-pack release `2026.07.23`

The adapter closes a current manifest-to-runtime gap for local authoring. A passing pull request is still a candidate.

The exact upstream APK and game-contract source is preserved under `vendor/apk-beta-source`. The standalone adapter remains under `packages/advantage-play-kit/src`.

Production acceptance requires monorepo import, asset review, host verification, and product-owner approval.

## Commands

```bash
pnpm dev                 # Start the compact and wide game lab
pnpm test                # Run deterministic and adapter tests
pnpm check-types         # Check strict TypeScript
pnpm validate:changes    # Check the intern-owned path boundary
pnpm validate:candidate  # Check metadata and cartridge architecture
pnpm validate:upstream   # Verify the pinned upstream APK source snapshot
pnpm validate:assets     # Verify all 43,075 canonical asset files
pnpm assets:search -- ui # Search the complete semantic asset catalog
pnpm validate            # Run every required gate
```

The repository contains the full 43,075-file canonical asset library. Builds emit only each candidate's declared union.

Read [the game contract](docs/GAME_CONTRACT.md), [asset rules](docs/ASSET_LIBRARY.md), and [responsive rules](docs/RESPONSIVE.md) before implementation.
