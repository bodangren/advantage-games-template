import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { validateCandidateMetadata } from "./candidate-validation.mjs";

const root = process.cwd();
const metadata = JSON.parse(
  await readFile(path.join(root, "cartridge-candidate.json"), "utf8"),
);
const metadataSchema = JSON.parse(
  await readFile(path.join(root, "cartridge-candidate.schema.json"), "utf8"),
);
validateCandidateMetadata(metadata, metadataSchema);

const cartridgeDirectory = path.join(root, metadata.cartridgePath);
const requiredFiles = [
  "blueprint.md",
  "assets.json",
  "definition.ts",
  "index.ts",
  "manifest.ts",
  "scene.ts",
  "systems.test.ts",
  "systems.ts",
];
const names = await readdir(cartridgeDirectory);
for (const requiredFile of requiredFiles) {
  if (!names.includes(requiredFile)) throw new Error(`Missing ${requiredFile}`);
}

const forbiddenImport =
  /(?:from\s*["']|import\s*\(["'])(next|react|react-dom|@reading-advantage\/(?:auth|db|domain|api)|konva|react-konva|three|@react-three\/|@\/|apps\/)/u;
const directAssetReference =
  /(?:https?:\/\/|\/assets\/|\.(?:png|ogg|mp3|wav|webp)["'])/iu;
const retiredApiReference = /context\.assets|edition\.colors/u;

for (const name of names.filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))) {
  const source = await readFile(path.join(cartridgeDirectory, name), "utf8");
  const importMatch = source.match(forbiddenImport);
  if (importMatch) throw new Error(`${name}: forbidden import ${importMatch[1]}`);
  if (directAssetReference.test(source)) {
    throw new Error(`${name}: use semantic asset requirements instead of physical paths`);
  }
  if (retiredApiReference.test(source)) {
    throw new Error(`${name}: uses a retired competition API`);
  }
}

console.log("Candidate metadata and cartridge architecture: PASS");
