# Specification: Production Intern Game Template

## Objective

Replace the competition workspace with a standalone authoring template for real intern game pull requests.

The template uses a pinned APK beta snapshot and a bounded adapter. It does not claim production acceptance.

## Requirements

- Remove competition rules, scoring, fixed briefs, submission metadata, and competition-only vocabulary.
- Pin the source monorepo commit, developer-kit API, runtime API, and standard-pack release.
- Align educational input, results, runtime lifecycle, input, responsive composition, and shared systems with current APK APIs.
- Preserve the exact upstream APK and game-contract source from the pinned monorepo commit.
- Keep cartridge code independent from React, Next.js, authentication, databases, and host persistence.
- Give interns one bounded cartridge directory and one documented PR workflow.
- Validate manifests, architecture, deterministic logic, compact and wide layouts, lifecycle cleanup, and exactly-once completion.
- Include the complete canonical standard asset library for development search and preview.
- Materialize only the candidate's declared semantic asset union into builds.
- Mark game pull requests as candidate cartridges pending monorepo import, asset, host, and product-owner acceptance.

## Acceptance Criteria

- `pnpm validate` passes from a clean install.
- The game lab mounts the cartridge through the beta adapter.
- The cartridge uses current APK input and result contracts.
- Compact `390x844` and wide `1440x900` layouts work.
- Keyboard and pointer controls work.
- Restart and destroy clean up the Phaser instance.
- Validation rejects protected-path edits, forbidden imports, direct asset paths, undeclared assets, and invalid results.
- Documentation explains the intern workflow and the remaining beta boundaries.

## Out Of Scope

- Publishing APK packages to a registry.
- Adding a candidate cartridge to the monorepo production catalog.
- Claiming Reading or Primary host acceptance.
