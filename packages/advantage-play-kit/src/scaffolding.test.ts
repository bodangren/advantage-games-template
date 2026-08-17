import { describe, expect, it } from "vitest";
import {
  ACCEPTED_STANDARD_PACK_BINDING,
  adaptCandidateManifestToRuntime,
  validateCandidateCartridgeManifest,
} from "./scaffolding";

const validManifest = {
  schemaVersion: 1,
  status: "candidate",
  id: "test-game",
  title: "Test Game",
  description: "A test candidate.",
  version: "0.1.0",
  developerKitApiVersion: "2.0.0",
  runtimeApiVersion: "1.0.0",
  inputMode: "vocabulary",
  capabilities: ["capability:result-accounting"],
  standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
  semanticAssetRequirements: ["effects/32x32/combat/hit-01"],
  responsive: {
    profiles: ["compact", "wide"],
    compactStrategy: "reflow",
    wideStrategy: "panel",
    statePreservation: "capture-recompose-restore",
  },
  attributionRegistration: {
    requiredCredit: "Pixel art assets by ElvGames",
    placement: "end-screen",
  },
  selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
  qcRegistration: { route: "/qc" },
} as const;

describe("candidate manifest adapter", () => {
  it("maps the developer-kit manifest to the runtime manifest", () => {
    const manifest = validateCandidateCartridgeManifest(validManifest);
    expect(adaptCandidateManifestToRuntime(manifest)).toEqual({
      id: "test-game",
      title: "Test Game",
      description: "A test candidate.",
      version: "0.1.0",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["effects/32x32/combat/hit-01"],
      capabilities: ["capability:result-accounting"],
    });
  });

  it("rejects stale releases and physical asset paths", () => {
    expect(() => validateCandidateCartridgeManifest({
      ...validManifest,
      standardPackBinding: { ...ACCEPTED_STANDARD_PACK_BINDING, version: "old" },
    })).toThrow();
    expect(() => validateCandidateCartridgeManifest({
      ...validManifest,
      semanticAssetRequirements: ["effects/hit.png"],
    })).toThrow(/semantic keys/i);
  });
});
