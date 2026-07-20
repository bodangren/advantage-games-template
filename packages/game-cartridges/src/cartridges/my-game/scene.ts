import Phaser from "phaser";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";
import { answer, choicesFor, createGameState, results, type GameState } from "./systems";

/** Creates the starter scene; replace its mechanic while preserving the contract. */
export function createStarterScene(context: CartridgeGameConfigContext): typeof Phaser.Scene {
  return class StarterScene extends Phaser.Scene {
    private state: GameState = createGameState();
    private prompt?: Phaser.GameObjects.Text;
    private choiceTexts: Phaser.GameObjects.Text[] = [];
    create() {
      this.cameras.main.setBackgroundColor(context.edition.colors.background);
      this.prompt = this.add.text(0, 0, "", { fontFamily: "Arial, sans-serif", fontSize: "32px", color: context.edition.colors.text, align: "center", wordWrap: { width: 700 } }).setOrigin(0.5);
      for (let i = 0; i < 2; i += 1) {
        const text = this.add.text(0, 0, "", { fontFamily: "Arial, sans-serif", fontSize: "25px", color: context.edition.colors.text, backgroundColor: i === 0 ? "#ff7a59" : "#60a5fa", padding: { x: 22, y: 18 }, align: "center", wordWrap: { width: 500 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        text.on("pointerdown", () => this.choose(i)); this.choiceTexts.push(text);
      }
      this.input.keyboard?.on("keydown-ONE", () => this.choose(0));
      this.input.keyboard?.on("keydown-TWO", () => this.choose(1));
      this.scale.on("resize", () => this.layout());
      this.renderPrompt(); context.diagnostic({ code: "GAME_READY", message: "Starter scene is ready" });
    }
    private choose(choiceIndex: number) {
      if (this.state.completed) return;
      const choices = choicesFor(context.input, this.state.index);
      const correct = choices[choiceIndex] === context.input[this.state.index]!.translation;
      this.state = answer(this.state, correct, context.input.length);
      if (this.state.completed) { context.complete(results(this.state)); this.prompt?.setText("Complete!"); this.choiceTexts.forEach((text) => text.setVisible(false)); return; }
      this.renderPrompt();
    }
    private renderPrompt() { const item = context.input[this.state.index]!; this.prompt?.setText(`Choose the translation\n\n${item.term}`); const choices = choicesFor(context.input, this.state.index); this.choiceTexts.forEach((text, index) => text.setText(`${index + 1}. ${choices[index]}`)); this.layout(); }
    private layout() { const width = this.scale.width; const height = this.scale.height; const compact = height > width; this.prompt?.setPosition(width / 2, compact ? height * 0.25 : height * 0.3); this.choiceTexts.forEach((text, index) => text.setPosition(compact ? width / 2 : width * (0.35 + index * 0.3), compact ? height * (0.52 + index * 0.17) : height * 0.65)); }
  };
}
