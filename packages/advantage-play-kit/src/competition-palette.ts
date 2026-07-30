/** Frozen release identity for the organizer-owned Crystal Courier palette. */
export const COMPETITION_PALETTE_RELEASE = Object.freeze({
  version: "2026.07.23",
  catalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
  sourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
  requiredCredit: "Pixel art assets by ElvGames",
});

/** Stable role identifiers for the complete Crystal Courier selected union. */
export const COMPETITION_ASSET_IDS = Object.freeze([
  "runner.idle",
  "runner.walk",
  "enemy.sentinel",
  "enemy.scout",
  "enemy.brute",
  "environment.forest",
  "environment.clouds",
  "environment.terrain",
  "bonus.crystal-blue",
  "bonus.crystal-green",
  "bonus.crystal-yellow",
  "bonus.coin",
  "feedback.hit",
  "audio.feedback-hit",
] as const);

/** One stable organizer-owned asset role available to a competition cartridge. */
export type CompetitionAssetId = (typeof COMPETITION_ASSET_IDS)[number];

/** Loading shape used by Phaser for a competition palette item. */
export type CompetitionAssetKind = "audio" | "image" | "spritesheet";

/** Descriptor-owned sprite timing and frame geometry. */
export interface CompetitionAssetFrame {
  /** Width of one source frame in pixels. */
  readonly width: number;
  /** Height of one source frame in pixels. */
  readonly height: number;
  /** Number of sequential frames exposed by the organizer. */
  readonly count: number;
  /** Animation speed recommended by the organizer. */
  readonly frameRate: number;
}

/** Protected host descriptor for a selected competition asset. */
export interface CompetitionAssetDescriptor {
  /** Stable role used by cartridge code. */
  readonly id: CompetitionAssetId;
  /** Public host URL; cartridge code must obtain it through the resolver. */
  readonly url: string;
  /** Phaser loader method required by the source. */
  readonly kind: CompetitionAssetKind;
  /** Descriptor-owned sprite metadata when this asset is animated. */
  readonly frame?: CompetitionAssetFrame;
}

/** Resolver supplied by the host so cartridges never encode public URLs or physical paths. */
export interface CompetitionAssetResolver {
  /**
   * Resolves one organizer-approved role to its host descriptor.
   * @param id The stable competition role requested by cartridge code.
   * @returns The protected descriptor for the requested role.
   * @throws When the role is outside the frozen competition palette.
   */
  resolve(id: CompetitionAssetId): CompetitionAssetDescriptor;
}

const palette = Object.freeze({
  "runner.idle": Object.freeze({
    id: "runner.idle",
    url: "/assets/competition/crystal-courier/runner-idle.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 8 }),
  }),
  "runner.walk": Object.freeze({
    id: "runner.walk",
    url: "/assets/competition/crystal-courier/runner-walk.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 10 }),
  }),
  "enemy.sentinel": Object.freeze({
    id: "enemy.sentinel",
    url: "/assets/competition/crystal-courier/sentinel-idle.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 8 }),
  }),
  "enemy.scout": Object.freeze({
    id: "enemy.scout",
    url: "/assets/competition/crystal-courier/scout-walk.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 48, height: 48, count: 6, frameRate: 8 }),
  }),
  "enemy.brute": Object.freeze({
    id: "enemy.brute",
    url: "/assets/competition/crystal-courier/brute-idle.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 48, height: 48, count: 6, frameRate: 6 }),
  }),
  "environment.forest": Object.freeze({
    id: "environment.forest",
    url: "/assets/competition/crystal-courier/forest.png",
    kind: "image",
  }),
  "environment.clouds": Object.freeze({
    id: "environment.clouds",
    url: "/assets/competition/crystal-courier/clouds.png",
    kind: "image",
  }),
  "environment.terrain": Object.freeze({
    id: "environment.terrain",
    url: "/assets/competition/crystal-courier/terrain.png",
    kind: "image",
  }),
  "bonus.crystal-blue": Object.freeze({
    id: "bonus.crystal-blue",
    url: "/assets/competition/crystal-courier/crystal-blue.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 16, height: 16, count: 8, frameRate: 9 }),
  }),
  "bonus.crystal-green": Object.freeze({
    id: "bonus.crystal-green",
    url: "/assets/competition/crystal-courier/crystal-green.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 16, height: 16, count: 8, frameRate: 9 }),
  }),
  "bonus.crystal-yellow": Object.freeze({
    id: "bonus.crystal-yellow",
    url: "/assets/competition/crystal-courier/crystal-yellow.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 16, height: 16, count: 8, frameRate: 9 }),
  }),
  "bonus.coin": Object.freeze({
    id: "bonus.coin",
    url: "/assets/competition/crystal-courier/coin.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 16, height: 16, count: 8, frameRate: 9 }),
  }),
  "feedback.hit": Object.freeze({
    id: "feedback.hit",
    url: "/assets/competition/crystal-courier/hit.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 24, frameRate: 18 }),
  }),
  "audio.feedback-hit": Object.freeze({
    id: "audio.feedback-hit",
    url: "/assets/competition/crystal-courier/feedback-hit.ogg",
    kind: "audio",
  }),
} satisfies Record<CompetitionAssetId, CompetitionAssetDescriptor>);

/** Resolves only the frozen Crystal Courier palette supplied by the competition host. */
export const competitionAssetResolver: CompetitionAssetResolver = Object.freeze({
  resolve(id: CompetitionAssetId): CompetitionAssetDescriptor {
    const descriptor = palette[id];
    if (!descriptor) {
      throw new Error(`Unknown Crystal Courier competition asset: ${id}`);
    }
    return descriptor;
  },
});
