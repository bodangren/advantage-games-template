import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findProtectedPaths,
  validateCandidateMetadata,
} from "./candidate-validation.mjs";

const schema = JSON.parse(
  await readFile(path.join(process.cwd(), "cartridge-candidate.schema.json"), "utf8"),
);
const validMetadata = JSON.parse(
  await readFile(path.join(process.cwd(), "cartridge-candidate.json"), "utf8"),
);

describe("candidate metadata validation", () => {
  it("accepts metadata that matches the repository schema", () => {
    expect(() => validateCandidateMetadata(validMetadata, schema)).not.toThrow();
  });

  it("rejects stale pins and unknown fields", () => {
    expect(() =>
      validateCandidateMetadata(
        { ...validMetadata, runtimeApiVersion: "0.9.0" },
        schema,
      ),
    ).toThrow(/must be equal to constant/u);
    expect(() =>
      validateCandidateMetadata({ ...validMetadata, approved: true }, schema),
    ).toThrow(/additional properties/u);
  });
});

describe("candidate change boundary", () => {
  it("allows only candidate metadata and the intern cartridge", () => {
    expect(
      findProtectedPaths([
        "cartridge-candidate.json",
        "packages/game-cartridges/src/cartridges/my-game/scene.ts",
        "packages/game-cartridges/src/cartridges/my-game/assets.json",
      ]),
    ).toEqual([]);
  });

  it("rejects maintainer files and similarly named paths", () => {
    expect(
      findProtectedPaths([
        "package.json",
        "packages/game-cartridges/src/cartridges/another-game/scene.ts",
        "cartridge-candidate.json.backup",
      ]),
    ).toEqual([
      "cartridge-candidate.json.backup",
      "package.json",
      "packages/game-cartridges/src/cartridges/another-game/scene.ts",
    ]);
  });
});
