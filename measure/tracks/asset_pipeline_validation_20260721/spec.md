# Specification

Give cartridges a validated asset pipeline. Contestants may ship external art and audio under `apps/game-lab/public/assets/cartridges/my-game/` and declare `requiredAssetBindings` in their manifest, but today nothing checks that declared bindings resolve to real files, that assets stay within sane format and size limits, or that every shipped asset is recorded in `ASSET-LICENSES.json` (currently an empty array with no enforcement). The starter itself ships only code-generated visuals, so all of this can be built and tested against fixtures without changing the starter cartridge.

Scope: submission/import validation scripts, asset fixtures, `ASSET-LICENSES.json` schema handling, and asset workflow documentation in `docs/`. The starter cartridge and contracts stay unchanged.
