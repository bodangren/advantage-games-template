# Standard Asset Library

The template contains the complete canonical APK standard asset library.

Canonical root:

`packages/advantage-play-kit/assets/standard`

Release facts:

- Version: `2026.07.23`
- Asset count: `43,075`
- Required credit: `Pixel art assets by ElvGames`

## Find Assets

Search `standard-pack-release.json` for semantic keys, views, cell sizes, categories, dimensions, and file types.

Use the search command for a compact result:

```bash
pnpm assets:search -- hero
pnpm assets:search -- inventory
```

Do not use the physical `path` field in cartridge code.

Add selected semantic keys to `packages/game-cartridges/src/cartridges/my-game/assets.json`.

`manifest.ts` consumes this file as the candidate selected union.

## Use Assets

The game lab loads declared keys from the canonical catalog and creates a host edition.

Use `preloadAssetBindings()` and `resolveAssetBinding()` in the Phaser scene.

The development server can access the full library. The production build emits only keys from `assets.json`.

The catalog does not infer sprite animation clips. Request descriptor review when a game needs animation metadata.

## Verify Assets

`pnpm validate:assets` checks the release identity, artifact digest, asset count, every file size, and every file digest.

The license and source receipts remain inside the canonical root.
