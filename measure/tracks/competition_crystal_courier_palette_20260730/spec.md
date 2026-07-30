# Specification: Crystal Courier Competition Palette

## Overview

Prepare the clone-ready Advantage Games competition template with an
organizer-owned Crystal Courier asset palette. Contestants build one vocabulary
or sentence cartridge using stable palette-role identifiers rather than raw
asset paths, copied art, or catalog search.

## Functional Requirements

- FR-1: The protected Play Kit exposes a typed resolver for a small,
  documented Crystal Courier palette: animated runner, three enemy variants,
  forest and cloud environments, terrain, crystals, coins, feedback effect,
  and optional sound.
- FR-2: Every palette item resolves to a template-local public URL, carries the
  frame metadata needed by Phaser, and is covered by a deterministic test.
- FR-3: The starter cartridge demonstrates the suggested Crystal Courier
  vocabulary loop and uses palette identifiers only.
- FR-4: Competition rules, game contract, judging, submission instructions,
  README, and agent guidance distinguish the frozen organizer palette from
  contestant-owned cartridge logic.
- FR-5: The documentation requires the selected-union palette, records the
  ElvGames credit, and states that competition submissions are candidates for
  post-event product review rather than production releases.
- FR-6: Template validation, type checking, tests, build, and import checks
  pass before the scoped changes are committed and pushed to `origin/main`.

## Non-Functional Requirements

- The competition asset subset must remain small enough to clone quickly.
- Cartridge source must stay free of raw public URLs and physical asset paths.
- Existing contestant-editable paths remain unchanged.
- Unrelated worktree changes must not be staged, committed, or pushed.

## Out of Scope

- Ingesting new legacy assets or changing standard-pack acceptance.
- Releasing a production cartridge or changing the production host.
- Updating unrelated marketing, lockfile, or tooling changes already in the
  template worktree.
