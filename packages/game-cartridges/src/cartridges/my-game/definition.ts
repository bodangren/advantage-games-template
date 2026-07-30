import Phaser from "phaser";
import { APK_RUNTIME_API_VERSION, type RuntimeCartridge } from "@reading-advantage/advantage-play-kit";
import { createStarterScene } from "./scene";

/** SpellLab Potion Master — an alchemy vocabulary puzzle game. */
export const spelllabCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.spelllab-potion-master",
    title: "SpellLab Potion Master",
    description:
      "An alchemy-themed vocabulary puzzle where players drag potion bottles into a cauldron to spell English words using phonics-based letter grouping.",
    version: "0.1.0",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    inputMode: "vocabulary",
    requiredAssetBindings: [],
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
