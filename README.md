# Advantage Games LLM-First Competition

Build an educational Phaser 4 game with an LLM coding agent, then submit an import-ready cartridge for the Reading Advantage education apps.

The starter now includes the organizer-owned **Crystal Courier** palette: a forest world, runner, three enemy options, layered environments, crystals, coins, feedback effect, and sound. It is enough to create a distinct game without spending competition time on asset search or license questions.

## Start

```bash
git clone https://github.com/bodangren/advantage-games-template.git
cd advantage-games-template
corepack enable
pnpm install
pnpm dev
```

Open the repository in OpenCode, select your model, and ask:

> What are the competition rules, palette restrictions, and what should I do first?

Your agent will read `AGENTS.md` and guide you through the required concept discussion before coding.

Only edit the cartridge at `packages/game-cartridges/src/cartridges/my-game/`, optional cartridge-owned assets, and `submission.json`. Use organizer assets only through `context.assets.resolve(role)`; do not copy their paths or URLs. Run `pnpm validate` before submitting.

Read [the rules](docs/COMPETITION_RULES.md), [the palette guide](docs/COMPETITION_PALETTE.md), [the game contract](docs/GAME_CONTRACT.md), and [the judging rubric](docs/JUDGING.md).
