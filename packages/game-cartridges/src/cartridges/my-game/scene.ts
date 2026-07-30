import Phaser from "phaser";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";
import gameConfig from "./config";

/**
 * Creates a starter scene that dynamically registers all game scenes
 * and passes the competition context to the first scene.
 */
export function createStarterScene(context: CartridgeGameConfigContext): typeof Phaser.Scene {
  return class StarterScene extends Phaser.Scene {
    create(this: Phaser.Scene) {
      this.cameras.main.setBackgroundColor(context.edition.colors.background);

      if (gameConfig.scene) {
        const scenesToRegister = Array.isArray(gameConfig.scene)
          ? gameConfig.scene
          : [gameConfig.scene];

        scenesToRegister.forEach((sceneClass: any) => {
          if (sceneClass && typeof sceneClass === "function") {
            const sceneName = sceneClass.name;
            if (sceneName && !this.scene.manager.keys[sceneName]) {
              this.scene.add(sceneName, sceneClass as typeof Phaser.Scene, false);
            }
          }
        });

        const firstScene = scenesToRegister[0] as any;
        if (firstScene && typeof firstScene === "function") {
          const firstSceneName = firstScene.name;
          if (firstSceneName) {
            this.scene.start(firstSceneName, { contestContext: context });
          }
        }
      }

      context.diagnostic({
        code: "GAME_READY",
        message: "SpellLab Potion Master cartridge is ready",
      });
    }
  };
}
