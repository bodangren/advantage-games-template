# Advantage Games LLM-First Competition

Build an educational Phaser 4 game with an LLM coding agent, then submit an import-ready cartridge for the Reading Advantage education apps.

## Start

```bash
git clone https://github.com/bodangren/advantage-games-template.git
cd advantage-games-template
corepack enable
pnpm install
pnpm dev
```

Open the repository in OpenCode, select your model, and ask:

> What are the competition rules, and what should I do first?

Your agent will read `AGENTS.md` and guide you through the required concept discussion before coding.

Only edit the cartridge at `packages/game-cartridges/src/cartridges/my-game/`, optional cartridge assets, and `submission.json`. Run `pnpm validate` before submitting.

See `docs/COMPETITION_RULES.md`, `docs/GAME_CONTRACT.md`, and `docs/JUDGING.md`.
