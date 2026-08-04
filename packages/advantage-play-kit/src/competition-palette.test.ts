import { describe, expect, it } from "vitest";
import {
  COMPETITION_ASSET_IDS,
  competitionAssetResolver,
  type CompetitionAssetId,
} from "./competition-palette";

describe("Crystal Courier competition palette", () => {
  it("exposes the frozen selected union with Phaser metadata", () => {
    expect(COMPETITION_ASSET_IDS).toEqual([
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
    ] satisfies readonly CompetitionAssetId[]);

    const runner = competitionAssetResolver.resolve("runner.walk");
    expect(runner.kind).toBe("spritesheet");
    expect(runner.frame).toEqual({ width: 32, height: 32, count: 6, frameRate: 10 });
    expect(runner.url).toMatch(/^\/assets\/competition\/crystal-courier\//);

    const background = competitionAssetResolver.resolve("environment.forest");
    expect(background.kind).toBe("image");
    expect(background.frame).toBeUndefined();
  });

  it("rejects an asset outside the organizer-owned palette", () => {
    expect(() => competitionAssetResolver.resolve("legacy.dragon" as CompetitionAssetId)).toThrow(
      /Unknown competition asset/u,
    );
  });
});
