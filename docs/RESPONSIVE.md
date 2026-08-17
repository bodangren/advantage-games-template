# Responsive Game Guidance

## Required Sizes

The game lab renders one cartridge at:

- compact `390x844`
- wide `1440x900`

Use one game state and one scene source for both profiles.

## Composition

Compact layouts use vertical flow, short lines, safe edge padding, and large touch targets.

Wide layouts can use side-by-side panels. Do not stretch the compact layout uniformly.

Use `context.composition.profile` for the initial profile. Implement `apkRecompose()` to apply later profile changes without resetting progress.

Phaser scale dimensions remain the rendering source of truth.

## Input

Every action needs a pointer or touch path and a keyboard path.

Use `context.inputController.snapshot()` for keyboard state. Pointer handlers can remain on Phaser game objects.

## Language

Keep Thai and English strings complete. Use a font stack with Thai support, word wrapping, and sufficient line spacing.

Do not use fixed character counts or all-caps transforms for Thai.

## Evidence

Attach one compact screenshot and one wide screenshot to the pull request.

State which controls you tested at each size.
