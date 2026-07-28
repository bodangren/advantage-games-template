import Phaser from "phaser";
import {
  APK_RUNTIME_API_VERSION,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { createGameScene } from "./scene";

/** Star Speller 2D — neon synthwave space shooter for vocabulary learning. */
export const starSpeller2DCartridge: RuntimeCartridge = {
  manifest: {
    id: "contestant.star-speller-2d",
    title: "Star Speller 2D",
    description:
      "ยานพิฆาตสะกดคำในห้วงอวกาศนีออน — เรียนรู้คำศัพท์ผ่านการยิงทำลายบอส 3 เลนในธีม synthwave ย้อนยุค",
    version: "1.0.0",
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
      scene: [createGameScene(context)],
    };
  },
};
