# Intern Workflow

## 1. Define The Game

Write the learning goal and mechanic in `blueprint.md`.

Specify the player verb, repeated action, correct and incorrect outcomes, terminal states, controls, and responsive plan.

## 2. Declare The Candidate

Update `manifest.ts` and `cartridge-candidate.json`.

Use lowercase kebab-case for the game ID. Select `vocabulary` or `sentence` input.

Select each required semantic asset key in `assets.json`. Do not add physical paths or URLs.

## 3. Write Rules First

Add deterministic tests in `systems.test.ts`.

Cover empty content, correct and incorrect actions, completion, score, and edge cases.

Keep these rules independent from Phaser.

## 4. Build The Scene

Implement the mechanic in `scene.ts`.

Use the host edition to preload semantic assets. Use the supplied input controller and completion boundary.

Clean up every listener during scene shutdown.

## 5. Verify Locally

```bash
pnpm validate
pnpm dev
```

Test compact and wide layouts. Test pointer or touch and keyboard controls.

Local validation rejects uncommitted changes outside the intern-owned paths. Pull request validation compares all committed changes with the target branch.

## 6. Open The Pull Request

Complete the pull request checklist. Attach compact and wide screenshots.

Describe any asset that needs animation or presentation descriptor review.

The pull request creates an import candidate. Maintainers still perform monorepo import, asset mapping, host, and product review.
