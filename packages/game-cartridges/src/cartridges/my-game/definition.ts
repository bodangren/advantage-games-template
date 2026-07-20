import Phaser from "phaser";
import { APK_RUNTIME_API_VERSION, type RuntimeCartridge } from "@reading-advantage/advantage-play-kit";
import { createMonsterScene } from "./scene";

/** Monster room shooting cartridge imported by the game lab and production hosts. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.my-game",
    title: "Escape the Monster Room",
    description: "Shoot the monster matching the translation to clear the room and escape!",
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
      scene: [createMonsterScene(context)],
    };
  },
};
