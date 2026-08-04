/** Frozen release identity for the organizer-owned Crystal Courier palette. */
export const COMPETITION_PALETTE_RELEASE = Object.freeze({
  version: "2026.08.04",
  catalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
  sourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
  requiredCredit: "Pixel art assets by ElvGames; Sound effects by Universal Sound Effects",
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
  "player.hero-1",
  "player.hero-2",
  "player.hero-3",
  "player.hero-4",
  "player.hero-5",
  "player.hero-6",
  "goblin.scout",
  "goblin.stalker",
  "goblin.brute",
  "goblin.warden",
  "orb.crystal-blue",
  "orb.crystal-green",
  "orb.crystal-yellow",
  "bonus.chest",
  "maze.wall-cavern",
  "maze.floor-cavern",
  "maze.wall-dungeon",
  "maze.floor-dungeon",
  "maze.wall-crypt",
  "maze.floor-crypt",
  "maze.gate",
  "maze.torch",
  "audio.orb-pickup",
  "audio.wrong-orb",
  "audio.power-up",
  "audio.goblin-defeat",
  "audio.sentence-complete",
  "audio.ui-confirm",
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
  "player.hero-1": Object.freeze({
    id: "player.hero-1",
    url: "/assets/competition/crystal-maze/hero-1.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 10 }),
  }),
  "player.hero-2": Object.freeze({
    id: "player.hero-2",
    url: "/assets/competition/crystal-maze/hero-2.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 10 }),
  }),
  "player.hero-3": Object.freeze({
    id: "player.hero-3",
    url: "/assets/competition/crystal-maze/hero-3.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 10 }),
  }),
  "player.hero-4": Object.freeze({
    id: "player.hero-4",
    url: "/assets/competition/crystal-maze/hero-4.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 10 }),
  }),
  "player.hero-5": Object.freeze({
    id: "player.hero-5",
    url: "/assets/competition/crystal-maze/hero-5.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 10 }),
  }),
  "player.hero-6": Object.freeze({
    id: "player.hero-6",
    url: "/assets/competition/crystal-maze/hero-6.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 10 }),
  }),
  "goblin.scout": Object.freeze({
    id: "goblin.scout",
    url: "/assets/competition/crystal-maze/goblin-scout.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 8 }),
  }),
  "goblin.stalker": Object.freeze({
    id: "goblin.stalker",
    url: "/assets/competition/crystal-maze/goblin-stalker.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 6, frameRate: 8 }),
  }),
  "goblin.brute": Object.freeze({
    id: "goblin.brute",
    url: "/assets/competition/crystal-maze/goblin-brute.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 48, height: 48, count: 6, frameRate: 8 }),
  }),
  "goblin.warden": Object.freeze({
    id: "goblin.warden",
    url: "/assets/competition/crystal-maze/goblin-warden.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 48, height: 48, count: 6, frameRate: 8 }),
  }),
  "orb.crystal-blue": Object.freeze({
    id: "orb.crystal-blue",
    url: "/assets/competition/crystal-maze/crystal-blue.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 16, height: 16, count: 8, frameRate: 9 }),
  }),
  "orb.crystal-green": Object.freeze({
    id: "orb.crystal-green",
    url: "/assets/competition/crystal-maze/crystal-green.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 16, height: 16, count: 8, frameRate: 9 }),
  }),
  "orb.crystal-yellow": Object.freeze({
    id: "orb.crystal-yellow",
    url: "/assets/competition/crystal-maze/crystal-yellow.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 16, height: 16, count: 8, frameRate: 9 }),
  }),
  "bonus.chest": Object.freeze({
    id: "bonus.chest",
    url: "/assets/competition/crystal-maze/chest.png",
    kind: "image",
  }),
  "maze.wall-cavern": Object.freeze({
    id: "maze.wall-cavern",
    url: "/assets/competition/crystal-maze/wall-cavern.png",
    kind: "image",
  }),
  "maze.floor-cavern": Object.freeze({
    id: "maze.floor-cavern",
    url: "/assets/competition/crystal-maze/floor-cavern.png",
    kind: "image",
  }),
  "maze.wall-dungeon": Object.freeze({
    id: "maze.wall-dungeon",
    url: "/assets/competition/crystal-maze/wall-dungeon.png",
    kind: "image",
  }),
  "maze.floor-dungeon": Object.freeze({
    id: "maze.floor-dungeon",
    url: "/assets/competition/crystal-maze/floor-dungeon.png",
    kind: "image",
  }),
  "maze.wall-crypt": Object.freeze({
    id: "maze.wall-crypt",
    url: "/assets/competition/crystal-maze/wall-crypt.png",
    kind: "image",
  }),
  "maze.floor-crypt": Object.freeze({
    id: "maze.floor-crypt",
    url: "/assets/competition/crystal-maze/floor-crypt.png",
    kind: "image",
  }),
  "maze.gate": Object.freeze({
    id: "maze.gate",
    url: "/assets/competition/crystal-maze/gate.png",
    kind: "image",
  }),
  "maze.torch": Object.freeze({
    id: "maze.torch",
    url: "/assets/competition/crystal-maze/torch.png",
    kind: "spritesheet",
    frame: Object.freeze({ width: 32, height: 32, count: 3, frameRate: 6 }),
  }),
  "audio.orb-pickup": Object.freeze({
    id: "audio.orb-pickup",
    url: "/assets/competition/crystal-maze/audio-orb-pickup.ogg",
    kind: "audio",
  }),
  "audio.wrong-orb": Object.freeze({
    id: "audio.wrong-orb",
    url: "/assets/competition/crystal-maze/audio-wrong-orb.ogg",
    kind: "audio",
  }),
  "audio.power-up": Object.freeze({
    id: "audio.power-up",
    url: "/assets/competition/crystal-maze/audio-power-up.ogg",
    kind: "audio",
  }),
  "audio.goblin-defeat": Object.freeze({
    id: "audio.goblin-defeat",
    url: "/assets/competition/crystal-maze/audio-goblin-defeat.ogg",
    kind: "audio",
  }),
  "audio.sentence-complete": Object.freeze({
    id: "audio.sentence-complete",
    url: "/assets/competition/crystal-maze/audio-sentence-complete.ogg",
    kind: "audio",
  }),
  "audio.ui-confirm": Object.freeze({
    id: "audio.ui-confirm",
    url: "/assets/competition/crystal-maze/audio-ui-confirm.ogg",
    kind: "audio",
  }),
} satisfies Record<CompetitionAssetId, CompetitionAssetDescriptor>);

/** Resolves only the frozen Crystal Courier palette supplied by the competition host. */
export const competitionAssetResolver: CompetitionAssetResolver = Object.freeze({
  resolve(id: CompetitionAssetId): CompetitionAssetDescriptor {
    const descriptor = palette[id];
    if (!descriptor) {
      throw new Error(`Unknown competition asset: ${id}`);
    }
    return descriptor;
  },
});
