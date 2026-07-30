import Phaser from "phaser";
import type {
  CartridgeGameConfigContext,
  CompetitionAssetId,
} from "@reading-advantage/advantage-play-kit";
import {
  answer,
  choicesFor,
  createGameState,
  results,
  type GameState,
} from "./systems";

/** Creates the Crystal Courier reference scene while preserving the cartridge contract. */
export function createStarterScene(
  context: CartridgeGameConfigContext,
): typeof Phaser.Scene {
  return class StarterScene extends Phaser.Scene {
    private state: GameState = createGameState();
    private transitioning = false;
    private prompt?: Phaser.GameObjects.Text;
    private choiceTexts: Phaser.GameObjects.Text[] = [];
    private forest?: Phaser.GameObjects.TileSprite;
    private clouds?: Phaser.GameObjects.TileSprite;
    private terrain?: Phaser.GameObjects.TileSprite;
    private runner?: Phaser.GameObjects.Sprite;
    private sentinel?: Phaser.GameObjects.Sprite;
    private crystal?: Phaser.GameObjects.Sprite;
    private coin?: Phaser.GameObjects.Sprite;
    private hit?: Phaser.GameObjects.Sprite;

    private readonly chooseFirst = () => this.choose(0);
    private readonly chooseSecond = () => this.choose(1);

    preload(): void {
      this.load.image(
        "cc-forest",
        context.assets.resolve("environment.forest").url,
      );
      this.load.image(
        "cc-clouds",
        context.assets.resolve("environment.clouds").url,
      );
      this.load.image(
        "cc-terrain",
        context.assets.resolve("environment.terrain").url,
      );
      this.loadSpriteSheet("cc-runner", "runner.walk");
      this.loadSpriteSheet("cc-sentinel", "enemy.sentinel");
      this.loadSpriteSheet("cc-crystal", "bonus.crystal-blue");
      this.loadSpriteSheet("cc-coin", "bonus.coin");
      this.loadSpriteSheet("cc-hit", "feedback.hit");
      this.load.audio(
        "cc-feedback",
        context.assets.resolve("audio.feedback-hit").url,
      );
    }

    create(): void {
      this.cameras.main.setBackgroundColor(context.edition.colors.background);
      this.forest = this.add.tileSprite(0, 0, 1, 1, "cc-forest").setOrigin(0);
      this.clouds = this.add
        .tileSprite(0, 0, 1, 1, "cc-clouds")
        .setOrigin(0)
        .setAlpha(0.65);
      this.terrain = this.add
        .tileSprite(0, 0, 1, 1, "cc-terrain")
        .setOrigin(0);

      this.createAnimation("cc-runner-walk", "cc-runner", "runner.walk");
      this.createAnimation(
        "cc-sentinel-idle",
        "cc-sentinel",
        "enemy.sentinel",
      );
      this.createAnimation(
        "cc-crystal-spin",
        "cc-crystal",
        "bonus.crystal-blue",
      );
      this.createAnimation("cc-coin-spin", "cc-coin", "bonus.coin");
      this.createAnimation("cc-hit", "cc-hit", "feedback.hit", 0);

      this.runner = this.add.sprite(0, 0, "cc-runner").setScale(3);
      this.runner.play("cc-runner-walk");
      this.sentinel = this.add.sprite(0, 0, "cc-sentinel").setScale(3);
      this.sentinel.play("cc-sentinel-idle");
      this.crystal = this.add.sprite(0, 0, "cc-crystal").setScale(2);
      this.crystal.play("cc-crystal-spin");
      this.coin = this.add.sprite(0, 0, "cc-coin").setScale(2);
      this.coin.play("cc-coin-spin");
      this.hit = this.add.sprite(0, 0, "cc-hit").setScale(2).setVisible(false);

      this.prompt = this.add
        .text(0, 0, "", {
          fontFamily: "Arial, sans-serif",
          fontSize: "32px",
          color: context.edition.colors.text,
          align: "center",
          wordWrap: { width: 700 },
        })
        .setOrigin(0.5);

      for (let index = 0; index < 2; index += 1) {
        const text = this.add
          .text(0, 0, "", {
            fontFamily: "Arial, sans-serif",
            fontSize: "25px",
            color: context.edition.colors.text,
            backgroundColor: index === 0 ? "#1d4ed8" : "#7c3aed",
            padding: { x: 22, y: 18 },
            align: "center",
            wordWrap: { width: 500 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        text.on("pointerdown", () => this.choose(index));
        this.choiceTexts.push(text);
      }

      this.input.keyboard?.on("keydown-ONE", this.chooseFirst);
      this.input.keyboard?.on("keydown-TWO", this.chooseSecond);
      this.scale.on("resize", this.layout, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.release, this);

      this.renderPrompt();
      context.diagnostic({
        code: "GAME_READY",
        message: "Crystal Courier reference scene is ready",
      });
    }

    /** Loads one selected-union spritesheet using descriptor-owned frame metadata. */
    private loadSpriteSheet(key: string, assetId: CompetitionAssetId): void {
      const asset = context.assets.resolve(assetId);
      if (asset.kind !== "spritesheet" || !asset.frame) {
        throw new Error(`${assetId} is not a selected-union spritesheet`);
      }

      this.load.spritesheet(key, asset.url, {
        frameWidth: asset.frame.width,
        frameHeight: asset.frame.height,
      });
    }

    /** Registers a looping animation from the frozen palette descriptor. */
    private createAnimation(
      key: string,
      texture: string,
      assetId: CompetitionAssetId,
      repeat = -1,
    ): void {
      if (this.anims.exists(key)) return;
      const asset = context.assets.resolve(assetId);
      if (!asset.frame) {
        throw new Error(`${assetId} is missing animation frame metadata`);
      }

      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, {
          start: 0,
          end: asset.frame.count - 1,
        }),
        frameRate: asset.frame.frameRate,
        repeat,
      });
    }

    /** Handles a learner's two-choice response and shows the matching game consequence. */
    private choose(choiceIndex: number): void {
      if (this.state.completed || this.transitioning) return;

      this.transitioning = true;
      const choices = choicesFor(context.input, this.state.index);
      const correct =
        choices[choiceIndex] === context.input[this.state.index]!.translation;
      this.state = answer(this.state, correct, context.input.length);
      this.playConsequence(correct);

      this.time.delayedCall(320, () => {
        if (this.state.completed) {
          context.complete(results(this.state));
          this.prompt?.setText("Courier route complete!");
          this.choiceTexts.forEach((text) => text.setVisible(false));
          return;
        }

        this.transitioning = false;
        this.renderPrompt();
      });
    }

    /** Plays the visual and audio response to a correct or incorrect answer. */
    private playConsequence(correct: boolean): void {
      const actor = correct ? this.runner : this.sentinel;
      const reward = correct ? this.crystal : this.coin;

      if (actor) {
        const startingY = actor.y;
        this.tweens.add({
          targets: actor,
          y: startingY - 14,
          duration: 150,
          yoyo: true,
        });
      }
      if (reward) {
        this.tweens.add({
          targets: reward,
          alpha: 0.25,
          duration: 150,
          yoyo: true,
        });
      }
      if (this.hit && actor) {
        this.hit
          .setPosition(actor.x, actor.y - 18)
          .setVisible(true)
          .play("cc-hit");
      }
      this.sound.play("cc-feedback", { volume: 0.35 });
    }

    /** Renders the next vocabulary prompt and choices. */
    private renderPrompt(): void {
      const item = context.input[this.state.index]!;
      this.prompt?.setText(`Choose the translation\n\n${item.term}`);
      const choices = choicesFor(context.input, this.state.index);
      this.choiceTexts.forEach((text, index) => {
        text.setText(`${index + 1}. ${choices[index]}`);
      });
      this.layout();
    }

    /** Repositions the reference game for the host's compact and wide layouts. */
    private layout(): void {
      const { width, height } = this.scale;
      const compact = height > width;

      this.forest?.setSize(width, height).setPosition(0, 0);
      this.clouds?.setSize(width, height * 0.4).setPosition(0, 0);
      this.terrain
        ?.setSize(width, height * 0.34)
        .setPosition(0, height * 0.66);
      this.prompt?.setPosition(width / 2, compact ? height * 0.17 : height * 0.2);
      this.runner?.setPosition(width * 0.24, compact ? height * 0.42 : height * 0.5);
      this.sentinel?.setPosition(
        width * 0.76,
        compact ? height * 0.42 : height * 0.5,
      );
      this.crystal?.setPosition(width * 0.45, compact ? height * 0.42 : height * 0.5);
      this.coin?.setPosition(width * 0.55, compact ? height * 0.42 : height * 0.5);

      this.choiceTexts.forEach((text, index) => {
        text.setPosition(
          compact ? width / 2 : width * (0.35 + index * 0.3),
          compact ? height * (0.66 + index * 0.16) : height * 0.78,
        );
      });
    }

    /** Removes host-level listeners when Phaser shuts down this scene. */
    private release(): void {
      this.scale.off("resize", this.layout, this);
      this.input.keyboard?.off("keydown-ONE", this.chooseFirst);
      this.input.keyboard?.off("keydown-TWO", this.chooseSecond);
    }
  };
}
