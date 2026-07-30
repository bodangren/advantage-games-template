import Phaser from "phaser";
import { COLORS, GAME, BOTTLE } from "../core/Constants";
import { EventBus, Events } from "../core/EventBus";
import { Bottle } from "../objects/Bottle";
import { Cauldron } from "../objects/Cauldron";
import { WordDisplay } from "../ui/WordDisplay";
import {
  createGameState,
  pourCorrect,
  pourWrong,
  restartWord,
  getExpectedLetter,
  isCorrectPour,
  startNextBatch,
  type AlchemyState,
} from "../systems";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";

/** Main gameplay scene — alchemy word crafting. */
export class Game extends Phaser.Scene {
  private context!: CartridgeGameConfigContext;
  private state!: AlchemyState;
  private cauldron!: Cauldron;
  private bottles: Bottle[] = [];
  private wordDisplay!: WordDisplay;
  private helpButton!: Phaser.GameObjects.Text;
  private selectedBottleIndex = -1;
  private isProcessing = false;

  constructor() {
    super("Game");
  }

  init(data?: { contestContext?: CartridgeGameConfigContext }): void {
    if (!data?.contestContext) {
      console.warn("[Game] contestContext missing in init data, using fallback");
    }
    this.context = data?.contestContext ?? ({} as CartridgeGameConfigContext);
    this.state = createGameState();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    this.drawBackground();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const w = this.scale.width;
    const h = this.scale.height;

    // Help button — top-right corner (draw first, high depth)
    this.helpButton = this.add.text(w - 16, 16, "?", {
      fontSize: "22px",
      fontFamily: "Georgia, serif",
      color: COLORS.TEXT_SECONDARY,
      backgroundColor: "#1a1730",
      padding: { x: 8, y: 4 },
    });
    this.helpButton.setOrigin(1, 0);
    this.helpButton.setInteractive({ useHandCursor: true });
    this.helpButton.setScrollFactor(0);
    this.helpButton.setDepth(200);
    this.helpButton.on("pointerdown", () => {
      this.scene.launch("HowToPlay", { fromGame: true });
      this.scene.pause();
    });

    // Word display — top center (below help button)
    this.wordDisplay = new WordDisplay(this, cx, 60);
    this.updateWordDisplay();

    // Cauldron — center of screen
    this.cauldron = new Cauldron(this, cx, cy + 30);

    // Create bottles
    this.createBottles();

    // Keyboard controls
    this.setupKeyboard();

    // Layout handling
    this.scale.on("resize", this.onResize, this);
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    const w = this.scale.width;
    const h = this.scale.height;

    // Dark gradient
    for (let i = 0; i < h; i += 2) {
      const t = i / h;
      const r = Math.floor(13 + t * 10);
      const gb = Math.floor(11 + t * 8);
      const b = Math.floor(26 + t * 15);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gb, b), 1);
      g.fillRect(0, i, w, 2);
    }

    // Mystical circles
    g.lineStyle(1, COLORS.GLOW_PURPLE, 0.05);
    g.strokeCircle(w / 2, h / 2, 200);
    g.strokeCircle(w / 2, h / 2, 300);
    g.strokeCircle(w / 2, h / 2, 400);

    // Pentagram lines (subtle)
    g.lineStyle(1, COLORS.GLOW_PURPLE, 0.03);
    for (let i = 0; i < 5; i++) {
      const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a2 = (Math.PI * 2 * ((i + 2) % 5)) / 5 - Math.PI / 2;
      g.lineBetween(
        w / 2 + Math.cos(a1) * 200,
        h / 2 + Math.sin(a1) * 200,
        w / 2 + Math.cos(a2) * 200,
        h / 2 + Math.sin(a2) * 200,
      );
    }
  }

  private createBottles(): void {
    // Clear old bottles
    this.bottles.forEach((b) => b.destroy());
    this.bottles = [];

    const bottleData = this.state.currentBottles;
    const totalWidth =
      bottleData.length * BOTTLE.WIDTH + (bottleData.length - 1) * BOTTLE.SPACING;
    const startX = this.scale.width / 2 - totalWidth / 2 + BOTTLE.WIDTH / 2;
    const y = this.scale.height - BOTTLE.HEIGHT - 30;

    bottleData.forEach((data, i) => {
      const x = startX + i * (BOTTLE.WIDTH + BOTTLE.SPACING);
      const bottle = new Bottle(this, x, y, data);
      bottle.setOriginalPosition(x, y);

      // Tap interaction
      bottle.on("pointerdown", () => this.onBottleTap(i));

      // Drag interactions
      bottle.on("dragstart", () => {
        bottle.highlight(true);
        this.selectedBottleIndex = i;
      });

      bottle.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        bottle.x = dragX;
        bottle.y = dragY;
      });

      bottle.on("dragend", () => {
        bottle.highlight(false);
        // Check if dropped on cauldron
        const bounds = this.cauldron.getBounds();
        if (bounds.contains(bottle.x, bottle.y)) {
          this.onBottlePour(i);
        } else {
          bottle.returnToOriginal();
        }
      });

      this.bottles.push(bottle);
    });
  }

  private setupKeyboard(): void {
    // Number keys 1-5 to select bottles
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (this.isProcessing) return;
      const num = parseInt(event.key);
      if (num >= 1 && num <= this.bottles.length) {
        this.onBottleTap(num - 1);
      }
      // Enter to pour selected bottle
      if (event.key === "Enter" && this.selectedBottleIndex >= 0) {
        this.onBottlePour(this.selectedBottleIndex);
        this.selectedBottleIndex = -1;
      }
    });
  }

  private onBottleTap(index: number): void {
    if (this.isProcessing) return;
    this.onBottlePour(index);
  }

  private onBottlePour(index: number): void {
    if (this.isProcessing) return;
    if (!this.state.currentWord) return;

    const bottle = this.bottles[index];
    if (!bottle) return;

    this.isProcessing = true;
    const bottleId = bottle.getBottleId();
    const expected = getExpectedLetter(this.state);

    if (isCorrectPour(this.state, bottleId)) {
      // Correct!
      const targetX = this.cauldron.x;
      const targetY = this.cauldron.y;

      bottle.playPourAnimation(targetX, targetY, () => {
        this.cauldron.addPouredLetter(expected!);
        bottle.removeLetter(expected!);
        bottle.playCorrectEffect();
        bottle.returnToOriginal();

        // Add letter to used letters display above cauldron
        this.cauldron.addUsedLetter(expected!);

        this.state = pourCorrect(this.state, bottleId);

        // Check if word complete — keep isProcessing true during transition
        if (this.state.phase === "review") {
          this.time.delayedCall(600, () => {
            this.showReview();
          });
        } else if (this.state.phase === "gameover") {
          this.time.delayedCall(600, () => {
            this.showGameOver();
          });
        } else {
          // Word complete, next word loaded — transition immediately
          this.transitionToNextWord();
        }
      });
    } else {
      // Wrong!
      bottle.playWrongEffect();
      this.cauldron.playShakeAnimation();

      this.state = pourWrong(this.state);

      // Flash the expected letter hint
      this.showLetterHint(expected);

      this.time.delayedCall(800, () => {
        this.cauldron.clearPouredLetters();
        this.state = restartWord(this.state);
        this.createBottles();
        this.updateWordDisplay();
        this.isProcessing = false;
      });
    }
  }

  private showLetterHint(expected: string | null): void {
    if (!expected) return;
    const hint = this.add.text(this.cauldron.x, this.cauldron.y - 100, expected, {
      fontSize: "48px",
      fontFamily: "Georgia, serif",
      color: COLORS.LETTER_WRONG,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    });
    hint.setOrigin(0.5);
    this.tweens.add({
      targets: hint,
      y: hint.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => hint.destroy(),
    });
  }

  /** Transition to the next word after successful completion. */
  private transitionToNextWord(): void {
    // Clear cauldron and used letters
    this.cauldron.clearPouredLetters();

    // Destroy old bottles
    this.bottles.forEach((b) => b.destroy());
    this.bottles = [];

    // Create new bottles for the next word
    this.createBottles();

    // Update word display
    this.updateWordDisplay();

    // Reset processing flag
    this.isProcessing = false;
  }

  private updateWordDisplay(): void {
    if (!this.state.currentWord) return;
    this.wordDisplay.setWord(
      this.state.currentWord.word,
      this.state.currentWord.thai,
      this.state.wordIndexInBatch,
      GAME.BATCH_SIZE,
    );
    this.wordDisplay.highlightLetter(this.state.letterIndex);
  }

  private showReview(): void {
    this.scene.launch("ReviewCard", {
      completedWords: this.state.completedWords.slice(-GAME.BATCH_SIZE),
      batchIndex: this.state.batchIndex,
      contestContext: this.context,
    });
    this.scene.pause();

    // Listen for review dismissed event from EventBus
    const onReviewDismissed = () => {
      EventBus.off(Events.REVIEW_DISMISSED, onReviewDismissed);
      this.scene.resume();
      this.state = startNextBatch(this.state);
      this.cauldron.clearPouredLetters();
      this.createBottles();
      this.updateWordDisplay();
      this.isProcessing = false;
    };
    EventBus.on(Events.REVIEW_DISMISSED, onReviewDismissed);
  }

  private showGameOver(): void {
    // Don't call context.complete() here — let GameOver scene handle it
    // This prevents the host from tearing down the game before GameOver renders
    this.scene.start("GameOver", {
      state: this.state,
      contestContext: this.context,
    });
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    const w = gameSize.width;
    const h = gameSize.height;

    this.cauldron.setPosition(w / 2, h / 2 + 30);
    this.helpButton.setPosition(w - 16, 16);

    // Reposition bottles
    if (this.bottles.length > 0) {
      const totalWidth =
        this.bottles.length * BOTTLE.WIDTH +
        (this.bottles.length - 1) * BOTTLE.SPACING;
      const startX = w / 2 - totalWidth / 2 + BOTTLE.WIDTH / 2;
      const y = h - BOTTLE.HEIGHT - 40;

      this.bottles.forEach((bottle, i) => {
        const x = startX + i * (BOTTLE.WIDTH + BOTTLE.SPACING);
        bottle.setOriginalPosition(x, y);
        bottle.setPosition(x, y);
      });
    }
  }

  shutdown(): void {
    this.bottles.forEach((b) => b.destroy());
    this.bottles = [];
  }
}
