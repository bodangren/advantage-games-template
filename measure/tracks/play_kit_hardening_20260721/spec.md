# Specification

Fix the known advantage-play-kit defects and cover the protected runtime with deterministic tests so cartridges built on it stay trustworthy. `resume()` currently re-acquires scenes with `getScenes(false)`, which returns every scene and resumes scenes that were never paused. `choicesFor` with a single-item input emits two identical choices, making every answer "correct". Neither `choicesFor` nor the `mountCartridge` mount/complete/restart lifecycle has any test coverage.

Scope: `packages/advantage-play-kit` runtime code and its tests only. Contracts in `packages/game-contracts` and the cartridge editable paths stay untouched.
