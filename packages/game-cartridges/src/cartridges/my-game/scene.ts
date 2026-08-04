import Phaser from "phaser";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";
import { configureRuntime } from "./systems/runtime";
import { Title } from "./scenes/Title";
import { HowToPlay } from "./scenes/HowToPlay";
import { Game } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";
import { Win } from "./scenes/Win";
import { StarredDeck } from "./scenes/StarredDeck";
import { FONT } from "./data/visual";

/**
 * Boot scene: initialises the cartridge runtime from the host context, then
 * hands control to the title screen. Also reports readiness to the host.
 */
export function createStarterScene(context: CartridgeGameConfigContext): typeof Phaser.Scene {
  return class Boot extends Phaser.Scene {
    constructor() {
      super("Boot");
    }

    create(): void {
      configureRuntime(context);
      this.cameras.main.setBackgroundColor(context.edition.colors.background);
      // Register the full scene flow once, then start the title screen.
      for (const [key, SceneClass] of [
        ["Title", Title],
        ["HowToPlay", HowToPlay],
        ["Game", Game],
        ["GameOver", GameOver],
        ["Win", Win],
        ["StarredDeck", StarredDeck],
      ] as const) {
        if (!this.scene.manager.keys[key]) {
          this.scene.add(key, SceneClass, false);
        }
      }
      context.diagnostic({ code: "GAME_READY", message: "Gem Miner Word Spell ready" });
      this.scene.start("Title");
    }
  };
}

/** Helper: an HTML-input labelled text object. */
export function labelledText(scene: Phaser.Scene, x: number, y: number, text: string, size = 20): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color: "#ffffff" }).setOrigin(0.5);
}