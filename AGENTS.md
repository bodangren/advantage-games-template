# AGENTS.md - Advantage Game Authoring Template

This repository creates real APK game pull requests for Reading Advantage.

Every game remains an import candidate until the monorepo accepts its assets, host behavior, and product review.

## First Turn

1. Read `docs/INTERN_WORKFLOW.md`, `docs/GAME_CONTRACT.md`, `docs/ASSET_LIBRARY.md`, and `docs/RESPONSIVE.md`.
2. Discuss the learning goal and mechanic before editing code.
3. Update `blueprint.md` and `manifest.ts`.
4. Write deterministic tests for the educational rules.
5. Implement the Phaser scene.
6. Run `pnpm validate`.
7. Capture compact and wide screenshots for the pull request.

## Intern-Owned Paths

Interns may edit:

- `packages/game-cartridges/src/cartridges/my-game/**`
- `cartridge-candidate.json`

Select semantic assets in `assets.json`. Do not add physical assets to the cartridge.

The runtime adapter, game lab, validators, selected development assets, lockfile, and CI are maintainer-owned.

`vendor/apk-beta-source` is the exact read-only upstream source snapshot. Never edit it to make a candidate pass.

## Candidate Boundary

A passing pull request proves compatibility with this pinned beta snapshot only.

It does not create a production catalog entry. It does not approve assets, deployment, host persistence, or product release.

Pinned contracts:

- Monorepo source: `f6d1ed5a6e7d71caa60b5b822364294c405e181a`
- Developer-kit API: `2.0.0`
- Runtime API: `1.0.0`
- Standard-pack release: `2026.07.23`

## Cartridge Structure

- `blueprint.md`: learning goal, mechanic, controls, outcomes, and responsive plan.
- `assets.json`: selected semantic keys from the complete standard library.
- `manifest.ts`: candidate identity, capabilities, attribution, and release pins.
- `systems.ts`: deterministic educational and scoring logic.
- `systems.test.ts`: unit tests for rules and edge cases.
- `scene.ts`: Phaser rendering and interaction.
- `definition.ts`: host-owned manifest adapter and runtime entry point.
- `index.ts`: public cartridge export.

## Stable Contracts

Input is a vocabulary or sentence array of `{ term: string; translation: string }`.

Call `context.complete()` once with:

```ts
{
  accuracy: number;
  xp: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
}
```

The host owns identity, tenancy, authoritative XP, persistence, and navigation.

## Engineering Rules

- Use Phaser 4 for canvas gameplay.
- Support compact `390x844` and wide `1440x900` compositions from one source.
- Support pointer or touch and an equivalent keyboard path.
- Keep Thai and English text complete and readable.
- Use `context.inputController` for normalized keyboard input.
- Use host edition APIs for semantic assets.
- Never write physical asset paths or remote URLs in cartridge code.
- Keep game rules outside Phaser objects.
- Tear down listeners, timers, audio, and Phaser objects.
- Add useful JSDoc to every exported function, type, and interface.
- Never report completion while a required check fails.

Cartridge code must not import Next.js, React, auth, databases, app aliases, Konva, Three.js, provider SDKs, or files under `apps/`.

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm check-types
pnpm validate
```

## Measure

Maintainer changes use the Measure track in `measure/tracks.md`.
