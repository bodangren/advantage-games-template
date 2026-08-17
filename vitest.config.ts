import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "@reading-advantage/advantage-play-kit/scaffolding", replacement: source("./packages/advantage-play-kit/src/scaffolding.ts") },
      { find: "@reading-advantage/advantage-play-kit/responsive", replacement: source("./packages/advantage-play-kit/src/responsive.ts") },
      { find: "@reading-advantage/advantage-play-kit/systems", replacement: source("./packages/advantage-play-kit/src/systems.ts") },
      { find: "@reading-advantage/advantage-play-kit/runtime", replacement: source("./packages/advantage-play-kit/src/runtime.ts") },
      { find: "@reading-advantage/advantage-play-kit", replacement: source("./packages/advantage-play-kit/src/index.ts") },
      { find: "@reading-advantage/game-contracts", replacement: source("./packages/game-contracts/src/index.ts") },
      { find: "@reading-advantage/game-cartridges", replacement: source("./packages/game-cartridges/src/index.ts") },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    exclude: ["vendor/**", "tests/**"],
  },
});
