# Game Contract

The host passes a vocabulary or sentence array containing `{ term, translation }` records. A cartridge exports a `RuntimeCartridge` with the eight required manifest fields and `createGameConfig(context)`.

Use `context.input`, `context.edition`, `context.seed`, `context.assets`, `context.diagnostic`, and `context.complete`. Completion accepts exactly `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`. Do not send user IDs, school IDs, timestamps, or persistence data.

## Assets

The runtime manifest API remains `1.0.0`. The competition host additionally supplies `context.assets.resolve(role)` as an additive developer-kit service for the frozen Crystal Courier palette.

- Resolve every approved asset through the host resolver.
- Use the descriptor's URL and sprite metadata; do not duplicate them in a cartridge.
- List the exact stable roles your cartridge uses in `manifest.requiredAssetBindings`.
- Never import from `apps/`, hard-code `/assets/competition/`, use a source filename, or fetch external art.

See [COMPETITION_PALETTE.md](COMPETITION_PALETTE.md) for the complete role list and the required visible credit.

The cartridge folder must be directly importable into the same path in the production monorepo.
