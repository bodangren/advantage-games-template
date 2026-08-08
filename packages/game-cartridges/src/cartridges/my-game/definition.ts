import Phaser from "phaser";
import {
  APK_RUNTIME_API_VERSION,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { createCrystalMazeScene } from "./scene";

/** Exact frozen Week 3 roles this cartridge resolves through the host. */
const crystalMazeAssetBindings = [
  "player.hero-3",
  "goblin.scout",
  "goblin.stalker",
  "goblin.brute",
  "goblin.warden",
  "orb.crystal-blue",
  "orb.crystal-green",
  "orb.crystal-yellow",
  "bonus.coin",
  "bonus.chest",
  "maze.wall-cavern",
  "maze.floor-cavern",
  "maze.gate",
  "maze.torch",
  "feedback.hit",
  "audio.orb-pickup",
  "audio.wrong-orb",
  "audio.power-up",
  "audio.goblin-defeat",
  "audio.sentence-complete",
  "audio.ui-confirm",
] as const;

/** Crystal Maze sentence cartridge imported by the game lab and production hosts. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.my-game",
    title: "Crystal Maze",
    description:
      "A Pac-Man-style sentence maze: read the Thai sentence, then collect its English words in order while goblins patrol the cavern.",
    version: "1.0.0",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    inputMode: "sentence",
    requiredAssetBindings: crystalMazeAssetBindings,
    capabilities: ["keyboard", "pointer", "touch", "compact", "wide"],
  },
  createGameConfig(context) {
    return {
      type: Phaser.AUTO,
      width: 960,
      height: 640,
      backgroundColor: context.edition.colors.background,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [createCrystalMazeScene(context)],
    };
  },
};
