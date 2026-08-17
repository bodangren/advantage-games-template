import react from "@vitejs/plugin-react";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const source = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));
const standardAssetRoot = source(
  "../../packages/advantage-play-kit/assets/standard",
);
const candidateAssetRequirements = source(
  "../../packages/game-cartridges/src/cartridges/my-game/assets.json",
);

interface CatalogEntry {
  readonly key: string;
  readonly path: string;
}

interface StandardCatalog {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly digest: string;
  readonly sourceReceiptDigest: string;
  readonly requiredCredit: string;
  readonly assets: readonly CatalogEntry[];
}

function loadCatalog(): StandardCatalog {
  return JSON.parse(
    readFileSync(path.join(standardAssetRoot, "standard-pack-release.json"), "utf8"),
  ) as StandardCatalog;
}

function standardAssetLibrary(): Plugin {
  return {
    name: "apk-standard-asset-library",
    configureServer(server) {
      server.middlewares.use("/assets/apk/standard", (request, response, next) => {
        const relativePath = decodeURIComponent(request.url?.split("?")[0] ?? "")
          .replace(/^\/+/, "");
        const target = path.resolve(standardAssetRoot, relativePath);
        if (!target.startsWith(`${standardAssetRoot}${path.sep}`)) {
          response.statusCode = 403;
          response.end("Invalid standard asset path");
          return;
        }
        try {
          if (!statSync(target).isFile()) return next();
        } catch {
          return next();
        }
        createReadStream(target).pipe(response);
      });
    },
    generateBundle() {
      const catalog = loadCatalog();
      const selectedKeys = JSON.parse(
        readFileSync(candidateAssetRequirements, "utf8"),
      ) as string[];
      const entries = new Map(catalog.assets.map((entry) => [entry.key, entry]));
      const selected = selectedKeys.map((key) => {
        const entry = entries.get(key);
        if (!entry) throw new Error(`Unknown standard asset semantic key ${key}`);
        this.emitFile({
          type: "asset",
          fileName: `assets/apk/standard/${entry.path}`,
          source: readFileSync(path.join(standardAssetRoot, entry.path)),
        });
        return entry;
      });
      this.emitFile({
        type: "asset",
        fileName: "assets/apk/standard/standard-pack-release.json",
        source: `${JSON.stringify({ ...catalog, assets: selected })}\n`,
      });
    },
  };
}

export default defineConfig({
  root: source("."),
  publicDir: false,
  plugins: [react(), standardAssetLibrary()],
  resolve: {
    alias: [
      {
        find: "@reading-advantage/advantage-play-kit/scaffolding",
        replacement: source("../../packages/advantage-play-kit/src/scaffolding.ts"),
      },
      {
        find: "@reading-advantage/advantage-play-kit/responsive",
        replacement: source("../../packages/advantage-play-kit/src/responsive.ts"),
      },
      {
        find: "@reading-advantage/advantage-play-kit/systems",
        replacement: source("../../packages/advantage-play-kit/src/systems.ts"),
      },
      {
        find: "@reading-advantage/advantage-play-kit/runtime",
        replacement: source("../../packages/advantage-play-kit/src/runtime.ts"),
      },
      {
        find: "@reading-advantage/advantage-play-kit",
        replacement: source("../../packages/advantage-play-kit/src/index.ts"),
      },
      {
        find: "@reading-advantage/game-contracts",
        replacement: source("../../packages/game-contracts/src/index.ts"),
      },
      {
        find: "@reading-advantage/game-cartridges",
        replacement: source("../../packages/game-cartridges/src/index.ts"),
      },
    ],
  },
  build: {
    outDir: source("../../dist"),
    emptyOutDir: true,
  },
});
