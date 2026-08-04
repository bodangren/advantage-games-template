import Phaser from "phaser";
import {
  APK_RUNTIME_API_VERSION,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { createCrystalMazeScene } from "./scene";

const crystalMazeAssetBindings = [
  "player.hero-1",
  "goblin.scout",
  "orb.crystal-blue",
  "bonus.chest",
  "maze.wall-cavern",
  "maze.floor-cavern",
  "maze.gate",
  "feedback.hit",
  "audio.orb-pickup",
  "audio.wrong-orb",
  "audio.power-up",
  "audio.goblin-defeat",
  "audio.sentence-complete",
  "audio.ui-confirm",
] as const;

/** Crystal Maze cartridge — Week 3 fixed brief: Pac-Man-style sentence game. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.my-game",
    title: "Crystal Maze",
    description:
      "Navigate the crystal cavern, collect English words in sentence order, dodge goblins, and unlock the Goblin Hunt power-up.",
    version: "0.1.0",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    inputMode: "sentence",
    requiredAssetBindings: crystalMazeAssetBindings,
    capabilities: ["keyboard", "pointer", "touch", "compact", "wide", "audio"],
  },
  createGameConfig(context) {
    return {
      type: Phaser.AUTO,
      width: 960,
      height: 640,
      backgroundColor: context.edition.colors.background,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [createCrystalMazeScene(context)],
    };
  },
};
