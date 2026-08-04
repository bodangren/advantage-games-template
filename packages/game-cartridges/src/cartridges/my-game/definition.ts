import Phaser from "phaser";
import { APK_RUNTIME_API_VERSION, type RuntimeCartridge } from "@reading-advantage/advantage-play-kit";
import { createStarterScene } from "./scene";

/** Gem Miner Word Spell cartridge, import-ready for the production host. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.my-game",
    title: "Gem Miner Word Spell",
    description: "Arcade mining survival: dig glowing letters to spell vocabulary words while dodging sweeping lasers.",
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
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [createStarterScene(context)],
    };
  },
}