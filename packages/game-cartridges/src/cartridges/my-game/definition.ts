import Phaser from "phaser";
import {
  adaptCandidateManifestToRuntime,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { candidateManifest } from "./manifest";
import { createCandidateScene } from "./scene";

/** Candidate cartridge imported by the local game lab and compatibility tests. */
export const myGameCartridge: RuntimeCartridge = {
  manifest: adaptCandidateManifestToRuntime(candidateManifest),
  createGameConfig(context) {
    return {
      type: Phaser.AUTO,
      width: 390,
      height: 844,
      backgroundColor: "#0b1020",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [createCandidateScene(context)],
    };
  },
};
