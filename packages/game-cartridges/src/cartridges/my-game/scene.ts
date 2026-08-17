import Phaser from "phaser";
import {
  createCompletionLatch,
  preloadAssetBindings,
  resolveAssetBinding,
  type CartridgeGameConfigContext,
  type CompletionLatch,
  type SupportedResponsiveComposition,
} from "@reading-advantage/advantage-play-kit";
import { candidateManifest } from "./manifest";
import {
  answer,
  choicesFor,
  createGameState,
  results,
  type GameState,
} from "./systems";

/** Creates the replaceable Phaser scene for the candidate cartridge. */
export function createCandidateScene(
  context: CartridgeGameConfigContext,
): typeof Phaser.Scene {
  return class CandidateScene extends Phaser.Scene {
    private state: GameState = createGameState(
      context.input,
      candidateManifest.inputMode,
    );
    private completion!: CompletionLatch;
    private transitioning = false;
    private profile = context.composition?.profile ?? "compact";
    private prompt?: Phaser.GameObjects.Text;
    private progress?: Phaser.GameObjects.Text;
    private marker?: Phaser.GameObjects.Image;
    private credit?: Phaser.GameObjects.Text;
    private readonly choices: Phaser.GameObjects.Text[] = [];

    preload(): void {
      preloadAssetBindings(
        this.load,
        context.edition,
        candidateManifest.semanticAssetRequirements,
      );
    }

    create(): void {
      this.completion = createCompletionLatch(context.complete);
      const marker = resolveAssetBinding(
        context.edition,
        "ui/20x20/inventory/slot",
      );

      this.add.rectangle(0, 0, 1, 1, 0x0b1020).setOrigin(0).setName("background");
      this.add.rectangle(0, 0, 1, 1, 0x151d34).setOrigin(0).setName("panel");
      this.marker = this.add.image(0, 0, marker.textureKey).setScale(3);

      this.prompt = this.add
        .text(0, 0, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "30px",
          color: "#f8fafc",
          align: "center",
          lineSpacing: 8,
          wordWrap: { width: 640 },
        })
        .setOrigin(0.5);
      this.progress = this.add
        .text(0, 0, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "18px",
          color: "#93c5fd",
        })
        .setOrigin(0.5);

      for (let index = 0; index < 2; index += 1) {
        const choice = this.add
          .text(0, 0, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "24px",
            color: "#ffffff",
            backgroundColor: index === 0 ? "#1d4ed8" : "#6d28d9",
            padding: { x: 22, y: 18 },
            align: "center",
            wordWrap: { width: 520 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        choice.on("pointerdown", () => this.choose(index));
        this.choices.push(choice);
      }

      this.credit = this.add
        .text(0, 0, candidateManifest.attributionRegistration.requiredCredit, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#94a3b8",
        })
        .setOrigin(0.5);
      this.scale.on("resize", this.layout, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.release, this);
      this.renderPrompt();
      context.diagnostic({
        level: "info",
        code: "GAME_READY",
        message: "Candidate cartridge is ready",
      });
    }

    update(): void {
      if (this.transitioning || this.state.completed) return;
      const pressed = context.inputController.snapshot().pressed;
      if (pressed.includes("Digit1") || pressed.includes("Numpad1")) this.choose(0);
      if (pressed.includes("Digit2") || pressed.includes("Numpad2")) this.choose(1);
    }

    /** Applies a host-owned responsive profile without resetting game state. */
    apkRecompose(composition: SupportedResponsiveComposition): void {
      this.profile = composition.profile;
      this.layout();
    }

    private choose(choiceIndex: number): void {
      if (this.transitioning || this.state.completed) return;
      this.transitioning = true;
      const choices = choicesFor(context.input, this.state.index);
      const correct =
        choices[choiceIndex] === context.input[this.state.index]?.translation;
      this.state = answer(this.state, correct);
      this.playFeedback(correct);
      this.time.delayedCall(280, () => {
        if (this.state.completed) {
          this.completion.complete(results(this.state));
          this.prompt?.setText("Session complete");
          this.progress?.setText(`${this.state.correctAnswers}/${this.state.totalAttempts} correct`);
          this.choices.forEach((choice) => choice.setVisible(false));
          return;
        }
        this.transitioning = false;
        this.renderPrompt();
      });
    }

    private playFeedback(correct: boolean): void {
      if (this.marker) {
        this.tweens.add({
          targets: this.marker,
          scale: correct ? 3.6 : 2.3,
          angle: correct ? 0 : 12,
          duration: 140,
          yoyo: true,
        });
      }
      const audio = resolveAssetBinding(
        context.edition,
        "audio/native/combat/hit-01",
      );
      this.sound.play(audio.textureKey, { volume: correct ? 0.2 : 0.35 });
    }

    private renderPrompt(): void {
      const item = context.input[this.state.index];
      if (!item) return;
      this.prompt?.setText(`Choose the translation\n\n${item.term}`);
      this.progress?.setText(`Question ${this.state.index + 1} of ${this.state.itemCount}`);
      const choices = choicesFor(context.input, this.state.index);
      this.choices.forEach((choice, index) => {
        choice.setText(`${index + 1}. ${choices[index]}`);
      });
      this.layout();
    }

    private layout(): void {
      const { width, height } = this.scale;
      const compact = this.profile === "compact" || width < 800;
      const background = this.children.getByName("background") as Phaser.GameObjects.Rectangle;
      const panel = this.children.getByName("panel") as Phaser.GameObjects.Rectangle;
      background.setSize(width, height);
      panel
        .setSize(compact ? width - 32 : width * 0.78, compact ? height * 0.72 : height * 0.7)
        .setPosition(compact ? 16 : width * 0.11, compact ? height * 0.12 : height * 0.13);
      this.prompt?.setPosition(width / 2, compact ? height * 0.22 : height * 0.23);
      this.prompt?.setWordWrapWidth(Math.min(compact ? width - 56 : width * 0.64, 720));
      this.progress?.setPosition(width / 2, compact ? height * 0.38 : height * 0.39);
      this.marker?.setPosition(width / 2, compact ? height * 0.49 : height * 0.52);
      this.choices.forEach((choice, index) => {
        choice.setWordWrapWidth(Math.min(compact ? width - 64 : width * 0.34, 520));
        choice.setPosition(
          compact ? width / 2 : width * (0.32 + index * 0.36),
          compact ? height * (0.65 + index * 0.13) : height * 0.72,
        );
      });
      this.credit?.setPosition(width / 2, height - 18);
    }

    private release(): void {
      this.scale.off("resize", this.layout, this);
      this.choices.forEach((choice) => choice.removeAllListeners());
    }
  };
}
