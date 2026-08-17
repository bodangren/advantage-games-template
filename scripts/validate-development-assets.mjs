import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standardRoot = path.join(
  root,
  "packages/advantage-play-kit/assets/standard",
);
const releasePath = path.join(standardRoot, "standard-pack-release.json");
const releaseBytes = await readFile(releasePath);
const artifactDigest = createHash("sha256").update(releaseBytes).digest("hex");
if (artifactDigest !== "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932") {
  throw new Error("The standard-pack release artifact digest is invalid");
}

const catalog = JSON.parse(releaseBytes.toString("utf8"));
if (
  catalog.schemaVersion !== 1 ||
  catalog.version !== "2026.07.23" ||
  catalog.digest !== "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087" ||
  catalog.sourceReceiptDigest !== "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9" ||
  catalog.requiredCredit !== "Pixel art assets by ElvGames" ||
  catalog.assets.length !== 43_075
) {
  throw new Error("The standard-pack release identity or asset count is invalid");
}

const selectedKeys = JSON.parse(
  await readFile(
    path.join(
      root,
      "packages/game-cartridges/src/cartridges/my-game/assets.json",
    ),
    "utf8",
  ),
);
const catalogKeys = new Set(catalog.assets.map((asset) => asset.key));
for (const key of selectedKeys) {
  if (!catalogKeys.has(key)) throw new Error(`Unknown selected semantic key ${key}`);
}

const batchSize = 128;
for (let index = 0; index < catalog.assets.length; index += batchSize) {
  const batch = catalog.assets.slice(index, index + batchSize);
  await Promise.all(batch.map(async (asset) => {
    const bytes = await readFile(path.join(standardRoot, asset.path));
    if (bytes.byteLength !== asset.physical.byteSize) {
      throw new Error(`${asset.path}: byte size does not match the catalog`);
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== asset.physical.sha256) {
      throw new Error(`${asset.path}: digest does not match the catalog`);
    }
  }));
}

console.log(`Full standard asset library: PASS (${catalog.assets.length} files)`);
