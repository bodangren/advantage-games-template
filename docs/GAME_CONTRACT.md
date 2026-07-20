# Game Contract

The host passes a vocabulary or sentence array containing `{ term, translation }` records. A cartridge exports a `RuntimeCartridge` with the eight required manifest fields and `createGameConfig(context)`.

Use `context.input`, `context.edition`, `context.seed`, `context.diagnostic`, and `context.complete`. Completion accepts exactly `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`. Do not send user IDs, school IDs, timestamps, or persistence data.

The cartridge folder must be directly importable into the same path in the production monorepo.
