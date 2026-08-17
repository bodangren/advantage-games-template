import { z } from "zod";
import type { RuntimeCartridgeManifest } from "./runtime";
import {
  ACCEPTED_CAPABILITY_IDS,
} from "./systems";
import {
  APK_DEVELOPER_KIT_API_VERSION,
  APK_RUNTIME_API_VERSION,
} from "./runtime";

/** Standard-pack release accepted by the pinned APK developer-kit snapshot. */
export const ACCEPTED_STANDARD_PACK_BINDING = Object.freeze({
  version: "2026.07.23",
  catalogDigest:
    "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
  sourceReceiptDigest:
    "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
});

/** Required attribution for every candidate that requests standard-pack assets. */
export const REQUIRED_STANDARD_PACK_CREDIT =
  "Pixel art assets by ElvGames";

const semanticAssetKeySchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      !value.includes("..") &&
      !/\.(?:png|ogg|mp3|wav|webp)$/iu.test(value),
    "Asset requirements must use semantic keys, not physical paths",
  );

const standardPackBindingSchema = z
  .object({
    version: z.literal(ACCEPTED_STANDARD_PACK_BINDING.version),
    catalogDigest: z.literal(ACCEPTED_STANDARD_PACK_BINDING.catalogDigest),
    sourceReceiptDigest: z.literal(
      ACCEPTED_STANDARD_PACK_BINDING.sourceReceiptDigest,
    ),
  })
  .strict();

/** Strict candidate manifest used by intern-authored cartridges. */
export const candidateCartridgeManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.literal("candidate"),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    title: z.string().min(1),
    description: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/u),
    developerKitApiVersion: z.literal(APK_DEVELOPER_KIT_API_VERSION),
    runtimeApiVersion: z.literal(APK_RUNTIME_API_VERSION),
    inputMode: z.enum(["vocabulary", "sentence"]),
    capabilities: z
      .array(z.enum(ACCEPTED_CAPABILITY_IDS))
      .min(1),
    standardPackBinding: standardPackBindingSchema,
    semanticAssetRequirements: z.array(semanticAssetKeySchema).min(1),
    responsive: z
      .object({
        profiles: z.tuple([z.literal("compact"), z.literal("wide")]),
        compactStrategy: z.enum([
          "reveal",
          "follow",
          "reflow",
          "stage",
          "panel",
          "fixed-mechanic",
        ]),
        wideStrategy: z.enum([
          "reveal",
          "follow",
          "reflow",
          "stage",
          "panel",
          "fixed-mechanic",
        ]),
        statePreservation: z.literal("capture-recompose-restore"),
      })
      .strict(),
    attributionRegistration: z
      .object({
        requiredCredit: z.literal(REQUIRED_STANDARD_PACK_CREDIT),
        placement: z.enum(["shared-credits", "about", "end-screen"]),
      })
      .strict(),
    selectedUnionMaterialization: z.literal(
      "accepted-cartridge-selected-union-only",
    ),
    qcRegistration: z.object({ route: z.literal("/qc") }).strict(),
  })
  .strict();

/** Validated manifest for an import-candidate cartridge. */
export type CandidateCartridgeManifest = z.infer<
  typeof candidateCartridgeManifestSchema
>;

/**
 * Validates one intern-authored candidate manifest.
 * @param candidate Untrusted manifest value.
 * @returns A frozen candidate manifest.
 */
export function validateCandidateCartridgeManifest(
  candidate: unknown,
): CandidateCartridgeManifest {
  return Object.freeze(candidateCartridgeManifestSchema.parse(candidate));
}

/**
 * Adapts the current developer-kit manifest to the runtime 1.0 manifest.
 *
 * The monorepo does not yet publish this bridge. Remove this adapter when the
 * production package exposes one shared manifest contract.
 *
 * @param manifest Validated developer-kit candidate manifest.
 * @returns The eight-field runtime manifest consumed by `mountCartridge`.
 */
export function adaptCandidateManifestToRuntime(
  manifest: CandidateCartridgeManifest,
): RuntimeCartridgeManifest {
  return Object.freeze({
    id: manifest.id,
    title: manifest.title,
    description: manifest.description,
    version: manifest.version,
    runtimeApiVersion: manifest.runtimeApiVersion,
    inputMode: manifest.inputMode,
    requiredAssetBindings: Object.freeze([
      ...manifest.semanticAssetRequirements,
    ]),
    capabilities: Object.freeze([...manifest.capabilities]),
  });
}
