import Phaser from "phaser";
import {
  APK_RUNTIME_API_VERSION,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { createCourierScene } from "./scene";

const courierAssetBindings = [
  "orb.crystal-blue",
  "orb.crystal-green",
  "orb.crystal-yellow",
  "bonus.chest",
  "maze.floor-dungeon",
  "maze.wall-dungeon",
  "maze.torch",
  "feedback.hit",
  "audio.orb-pickup",
  "audio.wrong-orb",
  "audio.power-up",
  "audio.sentence-complete",
  "audio.ui-confirm",
] as const;

/** Crystal Courier cartridge imported by the game lab and production hosts. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.my-game",
    title: "Crystal Courier • ผู้จัดส่งคริสตัล",
    description:
      "Match each English place to its Thai name before the timer runs out and deliver the right crystal.",
    version: "0.1.0",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    inputMode: "vocabulary",
    requiredAssetBindings: courierAssetBindings,
    capabilities: ["keyboard", "pointer", "touch", "compact", "wide"],
  },
  createGameConfig(context) {
    return {
      type: Phaser.AUTO,
      width: 390,
      height: 844,
      backgroundColor: 0x0f0c1b,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [createCourierScene(context)],
    };
  },
};
