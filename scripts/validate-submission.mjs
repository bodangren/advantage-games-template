import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const meta = JSON.parse(
  await readFile(path.join(root, "submission.json"), "utf8"),
);
const expected = {
  schemaVersion: "advantage-game-submission.v1",
  cartridgePath: "packages/game-cartridges/src/cartridges/my-game",
  runtimeApiVersion: "1.0.0",
};

for (const [key, value] of Object.entries(expected)) {
  if (meta[key] !== value) {
    throw new Error(`submission.json: ${key} must be ${value}`);
  }
}
if (
  !/^contestant\.[a-z0-9-]+$/.test(meta.cartridgeId) ||
  !["vocabulary", "sentence"].includes(meta.inputMode)
) {
  throw new Error("submission.json contains an invalid cartridgeId or inputMode");
}

const dir = path.join(root, expected.cartridgePath);
const required = ["blueprint.md", "definition.ts", "scene.ts", "systems.ts", "index.ts"];
const names = await readdir(dir);
for (const file of required) {
  if (!names.includes(file)) throw new Error(`Missing ${file}`);
}

const forbiddenImport =
  /(?:from\s*["']|import\s*\(["'])(next|react|@reading-advantage\/(?:auth|db)|konva|react-konva|three|@react-three\/|@\/|apps\/)/;
const forbiddenPaletteReference =
  /(?:\/assets\/competition\/crystal-courier\/|source-[a-f0-9]{12}\.(?:png|ogg)|https?:\/\/)/;

for (const file of names.filter((name) => name.endsWith(".ts"))) {
  const source = await readFile(path.join(dir, file), "utf8");
  const importMatch = source.match(forbiddenImport);
  if (importMatch) {
    throw new Error(`${file}: forbidden import ${importMatch[1]}`);
  }
  if (forbiddenPaletteReference.test(source)) {
    throw new Error(
      `${file}: competition palette assets must be resolved through context.assets`,
    );
  }
}

console.log("Submission structure, architecture, and palette boundary: PASS");
