import Phaser from "phaser";
import {
  APK_RUNTIME_API_VERSION,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { createRunnerScene } from "./scene";

const runnerAssetBindings = [
  "runner.idle",
  "runner.walk",
  "enemy.sentinel",
  "enemy.scout",
  "environment.forest",
  "environment.clouds",
  "environment.terrain",
  "bonus.crystal-blue",
  "bonus.crystal-green",
  "bonus.crystal-yellow",
  "bonus.coin",
  "feedback.hit",
  "audio.feedback-hit",
] as const;

/** Vocabulary Runner - A 2.5D magical vocabulary game cartridge. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.my-game",
    title: "Vocabulary Runner",
    description:
      "A 2.5D vocabulary runner where a witch chooses magical doors with correct translations.",
    version: "0.1.0",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    inputMode: "vocabulary",
    requiredAssetBindings: runnerAssetBindings,
    capabilities: ["keyboard", "pointer", "touch", "compact", "wide"],
  },
  createGameConfig(context) {
    return {
      type: Phaser.AUTO,
      width: 960,
      height: 640,
      backgroundColor: "#1a0a2e",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [createRunnerScene(context)],
    };
  },
};
