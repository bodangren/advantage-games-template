# Responsive Game Guidance

## Fixed Review Sizes

The Game Lab renders the same cartridge at:

- compact 390×844
- wide 1440×900

Use Phaser scale dimensions as the source of layout truth. Choose a breakpoint based on available geometry, then reposition the same objects and state. Do not create separate compact and wide games.

## Composition

Compact layouts should favor vertical flow, safe edge padding, large touch targets, and short readable lines. Wide layouts may place prompt and choices side by side or use the additional horizontal rhythm without stretching text into very long lines.

Keep primary touch targets at least 48 CSS pixels in the exact preview. Keep important content inside a safe margin. Recalculate wrapping widths and positions when the Phaser scale emits a resize event.

## Inputs

Every action must be available by pointer/touch and keyboard. The starter maps `1` and `2` to its two choices. Pointer handlers belong on Phaser game objects, not React overlays.

## Language

Thai and English must use a system font stack that contains readable fallbacks. Avoid all-caps transformations for Thai, tiny labels, clipping, and fixed character counts. Use Phaser word wrapping and sufficient line spacing.

## Editions

Read semantic colors from `context.edition.tuning.semantic`. Values such as `canvas`, `surface`, `primary`, `text`, `correct`, and `incorrect` carry meaning independent of an edition name. Never branch gameplay on `primary-chibi` or `secondary-epic`.
