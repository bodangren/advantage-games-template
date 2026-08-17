import {
  ACCEPTED_STANDARD_PACK_BINDING,
  REQUIRED_STANDARD_PACK_CREDIT,
  validateCandidateCartridgeManifest,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import assetRequirements from "./assets.json";

/** Validated developer-kit manifest for the intern-authored candidate. */
export const candidateManifest = validateCandidateCartridgeManifest({
  schemaVersion: 1,
  status: "candidate",
  id: "my-game",
  title: "Word Quest Starter",
  description: "A small educational choice loop ready for an intern-owned mechanic.",
  version: "0.1.0",
  developerKitApiVersion: "2.0.0",
  runtimeApiVersion: "1.0.0",
  inputMode: "vocabulary",
  capabilities: [
    "capability:nonempty-content-precondition",
    "capability:language-target-progression",
    "capability:single-completion-emission",
    "capability:result-accounting",
    "capability:input-action-normalization",
    "capability:bounded-frame-delta",
    "capability:time-and-frame-loop",
  ],
  standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
  semanticAssetRequirements: assetRequirements,
  responsive: {
    profiles: ["compact", "wide"],
    compactStrategy: "reflow",
    wideStrategy: "panel",
    statePreservation: "capture-recompose-restore",
  },
  attributionRegistration: {
    requiredCredit: REQUIRED_STANDARD_PACK_CREDIT,
    placement: "end-screen",
  },
  selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
  qcRegistration: { route: "/qc" },
});
