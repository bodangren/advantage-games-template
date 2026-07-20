import Phaser from "phaser";
import { APK_RUNTIME_API_VERSION, type RuntimeCartridge } from "@reading-advantage/advantage-play-kit";
import { createStarterScene } from "./scene";

/** Starter cartridge imported by the game lab and production hosts. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: { id: "contestant.my-game", title: "VOCABULARY TYPING SURVIVOR Devoloped idea by Sunisa Kluithong", description: "A vocabulary typing survival game where players type words to survive waves of enemies.", version: "0.1.0", runtimeApiVersion: APK_RUNTIME_API_VERSION, inputMode: "vocabulary", requiredAssetBindings: [], capabilities: ["keyboard", "pointer", "touch", "compact", "wide"] },
  createGameConfig(context) { return { type: Phaser.AUTO, width: 960, height: 640, backgroundColor: context.edition.colors.background, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [createStarterScene(context)] }; },
};
