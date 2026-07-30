import Phaser from "phaser";
import {
  APK_RUNTIME_API_VERSION,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { createStarterScene } from "./scene";

const starterAssetBindings = [
  "runner.walk",
  "enemy.sentinel",
  "environment.forest",
  "environment.clouds",
  "environment.terrain",
  "bonus.crystal-blue",
  "bonus.coin",
  "feedback.hit",
  "audio.feedback-hit",
] as const;

/** Crystal Courier reference cartridge imported by the game lab and production hosts. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.my-game",
    title: "Crystal Courier",
    description:
      "A reference vocabulary game built from the frozen competition palette.",
    version: "0.1.0",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    inputMode: "vocabulary",
    requiredAssetBindings: starterAssetBindings,
    capabilities: ["keyboard", "pointer", "touch", "compact", "wide"],
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
      scene: [createStarterScene(context)],
    };
  },
};
