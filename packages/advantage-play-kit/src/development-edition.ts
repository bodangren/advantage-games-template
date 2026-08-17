import {
  APK_RUNTIME_API_VERSION,
  type PhysicalAssetFile,
  type RuntimeEdition,
  type SemanticAssetBinding,
} from "./runtime";
import { ACCEPTED_STANDARD_PACK_BINDING } from "./scaffolding";

/** Browser URL that exposes the canonical library during local authoring. */
export const STANDARD_ASSET_BASE_URL = "/assets/apk/standard";

/** One catalog row used to create a development edition. */
export interface DevelopmentCatalogEntry {
  readonly path: string;
  readonly key: string;
  readonly extension: string;
  readonly physical: {
    readonly kind: "image" | "audio";
    readonly byteSize: number;
    readonly sha256: string;
    readonly dimensions: Readonly<{ width: number; height: number }> | null;
    readonly frameGrid: null;
  };
}

/** Browser-safe release catalog used by the game lab. */
export interface DevelopmentAssetCatalog {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly digest: string;
  readonly sourceReceiptDigest: string;
  readonly requiredCredit: "Pixel art assets by ElvGames";
  readonly assets: readonly DevelopmentCatalogEntry[];
}

/** Fetch seam used by tests and browser hosts. */
export type DevelopmentCatalogLoader = () => Promise<DevelopmentAssetCatalog>;

/**
 * Loads the full catalog in development or the selected catalog in a build.
 * @returns A browser-safe standard asset catalog.
 */
export async function loadDevelopmentAssetCatalog(): Promise<DevelopmentAssetCatalog> {
  const response = await fetch(`${STANDARD_ASSET_BASE_URL}/standard-pack-release.json`);
  if (!response.ok) throw new Error(`Standard asset catalog request failed: ${response.status}`);
  return response.json() as Promise<DevelopmentAssetCatalog>;
}

/**
 * Creates a host edition containing only the candidate's declared semantic union.
 * @param semanticKeys Semantic keys declared by the candidate manifest.
 * @param loadCatalog Catalog loader supplied by the browser host or a test.
 * @returns A runtime edition backed by canonical standard-pack files.
 */
export async function createDevelopmentEdition(
  semanticKeys: readonly string[],
  loadCatalog: DevelopmentCatalogLoader = loadDevelopmentAssetCatalog,
): Promise<RuntimeEdition> {
  const catalog = await loadCatalog();
  assertCatalogRelease(catalog);
  const entries = new Map(catalog.assets.map((entry) => [entry.key, entry]));
  const files: Record<string, PhysicalAssetFile> = {};
  const bindings: Record<string, SemanticAssetBinding> = {};

  for (const [index, key] of [...new Set(semanticKeys)].entries()) {
    const entry = entries.get(key);
    if (!entry) throw new Error(`Unknown standard asset semantic key ${JSON.stringify(key)}`);
    const id = `asset-${index}-${entry.physical.sha256.slice(0, 12)}`;
    const dimensions = entry.physical.dimensions ?? { width: 1, height: 1 };
    files[id] = Object.freeze({
      id,
      path: entry.path,
      kind: entry.physical.kind,
      width: dimensions.width,
      height: dimensions.height,
      format: entry.extension === "ogg" ? "ogg" : "png",
      byteSize: entry.physical.byteSize,
      sha256: entry.physical.sha256,
      provenance: Object.freeze({
        source: `standard-pack:${entry.key}`,
        license: "See packages/advantage-play-kit/assets/standard/LICENSE-ELVGAMES.txt",
        creator: "ElvGames",
      }),
    });
    bindings[key] = Object.freeze({
      key,
      file: id,
      usage: entry.physical.kind === "audio" ? "audio" : "image",
    });
  }

  return Object.freeze({
    id: "apk-beta-standard-pack",
    title: "APK beta standard-pack development edition",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    pack: Object.freeze({
      id: "apk-beta-standard-pack",
      version: "0.1.0",
      root: STANDARD_ASSET_BASE_URL,
      files: Object.freeze(files),
    }),
    bindings: Object.freeze(bindings),
    tuning: Object.freeze({
      speed: 1,
      targetScale: 1,
      collisionScale: 1,
      intensity: 0.7,
    }),
  });
}

/** Static two-file edition used by runtime unit tests. */
export const developmentEdition: RuntimeEdition = Object.freeze({
  id: "apk-beta-test-edition",
  title: "APK beta test edition",
  runtimeApiVersion: APK_RUNTIME_API_VERSION,
  pack: Object.freeze({
    id: "apk-beta-test-edition",
    version: "0.1.0",
    root: STANDARD_ASSET_BASE_URL,
    files: Object.freeze({
      slot: Object.freeze({
        id: "slot",
        path: "ui/20x20/inventory/slot.png",
        kind: "image",
        width: 20,
        height: 20,
        format: "png",
        byteSize: 212,
        sha256: "364560d9df9ebc14a2806d687776015624af79430e5f5b1e192de3fcf1db7524",
        provenance: Object.freeze({ source: "standard-pack:ui/20x20/inventory/slot", license: "ElvGames", creator: "ElvGames" }),
      }),
      audio: Object.freeze({
        id: "audio",
        path: "audio/native/combat/hit-01.ogg",
        kind: "audio",
        width: 1,
        height: 1,
        format: "ogg",
        byteSize: 20_939,
        sha256: "25c239ed9b6c9cd898a2ffb2c2760e87499ee5f6330060aa51be87f548bd5f23",
        provenance: Object.freeze({ source: "standard-pack:audio/native/combat/hit-01", license: "ElvGames", creator: "ElvGames" }),
      }),
    }),
  }),
  bindings: Object.freeze({
    "ui/20x20/inventory/slot": Object.freeze({ key: "ui/20x20/inventory/slot", file: "slot", usage: "image" }),
    "audio/native/combat/hit-01": Object.freeze({ key: "audio/native/combat/hit-01", file: "audio", usage: "audio" }),
  }),
  tuning: Object.freeze({ speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.7 }),
});

function assertCatalogRelease(catalog: DevelopmentAssetCatalog): void {
  if (
    catalog.schemaVersion !== 1 ||
    catalog.version !== ACCEPTED_STANDARD_PACK_BINDING.version ||
    catalog.digest !== ACCEPTED_STANDARD_PACK_BINDING.catalogDigest ||
    catalog.sourceReceiptDigest !== ACCEPTED_STANDARD_PACK_BINDING.sourceReceiptDigest ||
    catalog.requiredCredit !== "Pixel art assets by ElvGames"
  ) {
    throw new Error("Development catalog does not match the accepted standard-pack release");
  }
}
