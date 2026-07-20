# AGENTS.md - Advantage Games Competition

This repository is an LLM-first competition workspace. Build one import-ready Phaser 4 educational game cartridge.

## First Turn Protocol

When the contestant asks for the rules or what to do first:

1. Read this file and `docs/COMPETITION_RULES.md`, `docs/GAME_CONTRACT.md`, and `docs/JUDGING.md`.
2. Explain the mission, the 100-point scoring rubric, immutable contracts, editable paths, and `pnpm validate`.
3. Ask for the game concept, repeated player action, learning loop, correct/incorrect consequences, and win condition.
4. Do not edit code until that short concept discussion is complete.

## Editable Paths

Contestants and agents may edit only:

- `packages/game-cartridges/src/cartridges/my-game/**`
- `apps/game-lab/public/assets/cartridges/my-game/**`
- `submission.json`

Everything else is protected competition infrastructure. Never weaken or modify contracts, runtime code, the host, validators, tests, CI, or lockfiles to make a submission pass.

## Production Shape

The game must remain directly copyable to:

`packages/game-cartridges/src/cartridges/<slug>/`

No application-specific rewrite may be needed after submission. Keep these responsibilities:

- `blueprint.md`: mechanic, learning loop, controls, outcomes.
- `definition.ts`: manifest and `RuntimeCartridge` entry point.
- `scene.ts`: Phaser-native rendering and interaction.
- `systems.ts`: deterministic educational and scoring logic.
- `index.ts`: public cartridge export.
- `*.test.ts`: deterministic behavior tests.

## Immutable Contracts

Input is an array of `{ term: string; translation: string }`. `inputMode` is `vocabulary` or `sentence`.

The manifest fields are exactly `id`, `title`, `description`, `version`, `runtimeApiVersion`, `inputMode`, `requiredAssetBindings`, and `capabilities`. Runtime API is `1.0.0`.

Completion must call `context.complete()` exactly once with:

```ts
{
  accuracy: number;       // 0..1
  xp: number;             // non-negative integer, display only
  score: number;          // non-negative integer
  correctAnswers: number; // non-negative integer
  totalAttempts: number;  // non-negative integer
}
```

Identity, persistence, tenancy, and authoritative XP belong to the education app host, never the cartridge.

## Mandatory Engineering Rules

- Use Phaser 4 and canvas-first gameplay. Host controls may use DOM outside the canvas.
- One game source must intentionally support compact `390x844` and wide `1440x900` composition.
- Provide touch/pointer and keyboard-equivalent controls.
- Keep Thai and English prompts complete, legible, wrapped, and untruncated.
- Use edition semantics; do not branch gameplay by product or hard-code production asset paths.
- Use supplied lifecycle, input, diagnostics, and completion APIs instead of recreating host infrastructure.
- Tear down scenes, timers, listeners, audio, and Phaser instances.
- Write tests before or alongside behavior. All exported functions, types, and interfaces need useful JSDoc.
- Never report completion while a required check fails.

Cartridge code must not import Next.js, React, auth, databases, app aliases, Konva, Three.js/R3F, provider SDKs, or files under `apps/`.

## Commands

```bash
pnpm dev
pnpm test
pnpm check-types
pnpm validate:submission
pnpm validate
```

## Definition Of Done

The learning loop is fun and correct; both viewport profiles are composed intentionally; touch and keyboard work; both development editions render; valid results emit once; restart/unmount leaks nothing; tests and `pnpm validate` pass; and the three-minute demo works at both required sizes.
