import Phaser from "phaser";

/** Minimal boot scene — immediately starts the Title scene. */
export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.scene.start("Title");
  }
}
