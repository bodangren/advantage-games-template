import Phaser from "phaser";
import type {
  CartridgeGameConfigContext,
  CompetitionAssetId,
} from "@reading-advantage/advantage-play-kit";
import {
  answer,
  choicesFor,
  createGameState,
  moveToLane,
  results,
  updateTimer,
  isGameComplete,
  NUM_CHOICES,
  type GameState,
} from "./systems";

/** Creates the Vocabulary Runner 2.5D forward-facing scene. */
export function createRunnerScene(
  context: CartridgeGameConfigContext,
): typeof Phaser.Scene {
  return class RunnerScene extends Phaser.Scene {
    private state: GameState = createGameState();
    private transitioning = false;
    private timerEvent?: Phaser.Time.TimerEvent;

    // UI Elements
    private promptText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private scoreText?: Phaser.GameObjects.Text;
    private livesText?: Phaser.GameObjects.Text;
    private gameOverText?: Phaser.GameObjects.Text;
    private completionText?: Phaser.GameObjects.Text;

    // Game Objects
    private witch?: Phaser.GameObjects.Sprite;
    private witchShadow?: Phaser.GameObjects.Ellipse;
    private doors: Phaser.GameObjects.Container[] = [];
    private doorLabels: Phaser.GameObjects.Text[] = [];
    private doorGlows: Phaser.GameObjects.Graphics[] = [];
    private crystals: Phaser.GameObjects.Sprite[] = [];
    private hitEffect?: Phaser.GameObjects.Sprite;

    // Background Layers
    private clouds?: Phaser.GameObjects.TileSprite;

    // Corridor & Perspective Graphics
    private corridorGraphics?: Phaser.GameObjects.Graphics;
    private floorGraphics?: Phaser.GameObjects.Graphics;
    private vpGlow?: Phaser.GameObjects.Graphics;

    // Perspective System
    private vanishingPoint = { x: 0, y: 0 };
    private floorLineOffsets: number[] = [];
    private readonly NUM_FLOOR_LINES = 12;

    // Lane positions (calculated in layout)
    private lanePositions: number[] = [0, 0, 0];
    private doorLanePositions: number[] = [0, 0, 0];
    private doorStartLanePositions: number[] = [0, 0, 0];

    // Door approach animation
    private doorApproachTweens: Phaser.Tweens.Tween[] = [];
    private doorEndY = 0;
    private readonly doorStartScale = 0.15;
    private doorEndScale = 0.6;
    private readonly doorApproachDuration = 6000;
    private selectedDoorLane = -1;
    private doorsApproaching = false;

    // Input handlers
    private readonly moveLeft = () =>
      this.moveToLane(this.state.currentLane - 1);
    private readonly moveRight = () =>
      this.moveToLane(this.state.currentLane + 1);

    preload(): void {
      // Load background assets
      this.load.image(
        "cc-clouds",
        context.assets.resolve("environment.clouds").url,
      );
      this.load.image(
        "cc-terrain",
        context.assets.resolve("environment.terrain").url,
      );

      // Load sprite sheets
      this.loadSpriteSheet("cc-runner-idle", "runner.idle");
      this.loadSpriteSheet("cc-runner-walk", "runner.walk");
      this.loadSpriteSheet("cc-sentinel", "enemy.sentinel");
      this.loadSpriteSheet("cc-crystal-blue", "bonus.crystal-blue");
      this.loadSpriteSheet("cc-crystal-green", "bonus.crystal-green");
      this.loadSpriteSheet("cc-crystal-yellow", "bonus.crystal-yellow");
      this.loadSpriteSheet("cc-coin", "bonus.coin");
      this.loadSpriteSheet("cc-hit", "feedback.hit");

      // Load audio
      this.load.audio(
        "cc-feedback",
        context.assets.resolve("audio.feedback-hit").url,
      );
    }

    create(): void {
      this.cameras.main.setBackgroundColor("#0a0515");

      // Calculate vanishing point
      this.calculatePerspective();

      // Create background layers
      this.createBackground();

      // Create corridor with perspective
      this.createCorridor();

      // Create floor grid
      this.createFloorGrid();

      // Create animations
      this.createAnimations();

      // Create game objects
      this.createWitch();
      this.createDoors();
      this.createUI();
      this.createEffects();

      // Set up input
      this.setupInput();

      // Start timer
      this.startTimer();

      // Initial layout
      this.scale.on("resize", this.layout, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.release, this);

      // Render first prompt
      this.renderPrompt();

      context.diagnostic({
        code: "GAME_READY",
        message: "Vocabulary Runner forward-facing scene is ready",
      });
    }

    update(_time: number, delta: number): void {
      if (this.state.gameOver) return;

      // Update scrolling backgrounds (forward movement)
      this.updateBackground(delta);

      // Update timer display
      this.updateTimerDisplay();
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

    /** Creates all sprite animations. */
    private createAnimations(): void {
      this.createAnimation("cc-runner-idle", "cc-runner-idle", "runner.idle");
      this.createAnimation("cc-runner-walk", "cc-runner-walk", "runner.walk");
      this.createAnimation(
        "cc-sentinel-idle",
        "cc-sentinel",
        "enemy.sentinel",
      );
      this.createAnimation(
        "cc-crystal-spin",
        "cc-crystal-blue",
        "bonus.crystal-blue",
      );
      this.createAnimation(
        "cc-crystal-green-spin",
        "cc-crystal-green",
        "bonus.crystal-green",
      );
      this.createAnimation(
        "cc-crystal-yellow-spin",
        "cc-crystal-yellow",
        "bonus.crystal-yellow",
      );
      this.createAnimation("cc-coin-spin", "cc-coin", "bonus.coin");
      this.createAnimation("cc-hit", "cc-hit", "feedback.hit", 0);
    }

    /** Calculates perspective vanishing point and lane positions. */
    private calculatePerspective(): void {
      const { width, height } = this.scale;

      // Vanishing point at 25% height, centered horizontally
      this.vanishingPoint = {
        x: width / 2,
        y: height * 0.25,
      };

      // Initialize floor line offsets
      this.floorLineOffsets = [];
      for (let i = 0; i < this.NUM_FLOOR_LINES; i++) {
        this.floorLineOffsets.push(i / this.NUM_FLOOR_LINES);
      }
    }

    /** Creates background sky layer. */
    private createBackground(): void {
      const { width, height } = this.scale;

      // Clouds as far background (scrolls slowly)
      this.clouds = this.add
        .tileSprite(0, 0, width, height, "cc-clouds")
        .setOrigin(0)
        .setAlpha(0.4)
        .setScrollFactor(0)
        .setDepth(0);
    }

    /** Creates corridor walls with perspective convergence. */
    private createCorridor(): void {
      this.corridorGraphics = this.add
        .graphics()
        .setScrollFactor(0)
        .setDepth(1);

      this.vpGlow = this.add
        .graphics()
        .setScrollFactor(0)
        .setDepth(2);

      this.drawCorridor();
    }

    /** Draws corridor walls converging to vanishing point. */
    private drawCorridor(): void {
      if (!this.corridorGraphics || !this.vpGlow) return;

      const { width, height } = this.scale;
      const vp = this.vanishingPoint;

      this.corridorGraphics.clear();
      this.vpGlow.clear();

      // Corridor wall thickness at bottom
      const wallThickness = width * 0.08;

      // Left wall - trapezoid from bottom-left to vanishing point
      this.corridorGraphics.fillStyle(0x1a0a2e, 0.95);
      this.corridorGraphics.beginPath();
      this.corridorGraphics.moveTo(0, height); // Bottom-left corner
      this.corridorGraphics.lineTo(0, vp.y); // Top-left (at VP height)
      this.corridorGraphics.lineTo(vp.x, vp.y); // Vanishing point
      this.corridorGraphics.lineTo(vp.x - wallThickness, height); // Inner bottom
      this.corridorGraphics.closePath();
      this.corridorGraphics.fillPath();

      // Left wall highlight edge
      this.corridorGraphics.lineStyle(2, 0x9b59b6, 0.6);
      this.corridorGraphics.beginPath();
      this.corridorGraphics.moveTo(wallThickness, height);
      this.corridorGraphics.lineTo(vp.x, vp.y);
      this.corridorGraphics.strokePath();

      // Left wall inner gold trim
      this.corridorGraphics.lineStyle(1, 0xffd700, 0.4);
      this.corridorGraphics.beginPath();
      this.corridorGraphics.moveTo(wallThickness + 5, height);
      this.corridorGraphics.lineTo(vp.x, vp.y);
      this.corridorGraphics.strokePath();

      // Right wall - mirror of left wall
      this.corridorGraphics.fillStyle(0x1a0a2e, 0.95);
      this.corridorGraphics.beginPath();
      this.corridorGraphics.moveTo(width, height); // Bottom-right corner
      this.corridorGraphics.lineTo(width, vp.y); // Top-right (at VP height)
      this.corridorGraphics.lineTo(vp.x, vp.y); // Vanishing point
      this.corridorGraphics.lineTo(vp.x + wallThickness, height); // Inner bottom
      this.corridorGraphics.closePath();
      this.corridorGraphics.fillPath();

      // Right wall highlight edge
      this.corridorGraphics.lineStyle(2, 0x9b59b6, 0.6);
      this.corridorGraphics.beginPath();
      this.corridorGraphics.moveTo(width - wallThickness, height);
      this.corridorGraphics.lineTo(vp.x, vp.y);
      this.corridorGraphics.strokePath();

      // Right wall inner gold trim
      this.corridorGraphics.lineStyle(1, 0xffd700, 0.4);
      this.corridorGraphics.beginPath();
      this.corridorGraphics.moveTo(width - wallThickness - 5, height);
      this.corridorGraphics.lineTo(vp.x, vp.y);
      this.corridorGraphics.strokePath();

      // Ceiling line at vanishing point height
      this.corridorGraphics.lineStyle(2, 0x3d1f6d, 0.5);
      this.corridorGraphics.beginPath();
      this.corridorGraphics.moveTo(0, vp.y);
      this.corridorGraphics.lineTo(width, vp.y);
      this.corridorGraphics.strokePath();

      // Vanishing point glow effect
      const glowRadius = 30;
      const vpGlowGradient = this.vpGlow;
      vpGlowGradient.fillStyle(0x9b59b6, 0.3);
      vpGlowGradient.fillCircle(vp.x, vp.y, glowRadius);
      vpGlowGradient.fillStyle(0xffd700, 0.2);
      vpGlowGradient.fillCircle(vp.x, vp.y, glowRadius * 0.6);
      vpGlowGradient.fillStyle(0xffffff, 0.4);
      vpGlowGradient.fillCircle(vp.x, vp.y, 8);
    }

    /** Creates floor grid with perspective lines. */
    private createFloorGrid(): void {
      this.floorGraphics = this.add
        .graphics()
        .setScrollFactor(0)
        .setDepth(3);

      this.drawFloorGrid();
    }

    /** Draws floor grid lines with perspective spacing. */
    private drawFloorGrid(): void {
      if (!this.floorGraphics) return;

      const { width, height } = this.scale;
      const vp = this.vanishingPoint;

      this.floorGraphics.clear();

      // Floor area starts below vanishing point
      const floorTop = vp.y;
      const floorBottom = height;
      const floorHeight = floorBottom - floorTop;

      // Draw perspective horizontal lines
      for (let i = 0; i < this.NUM_FLOOR_LINES; i++) {
        // Calculate perspective position (lines closer together near VP)
        const t =
          ((i + this.floorLineOffsets[i]!) % this.NUM_FLOOR_LINES) /
          this.NUM_FLOOR_LINES;

        // Non-linear spacing for perspective effect
        const perspectiveT = t * t; // Quadratic for perspective
        const y = floorTop + perspectiveT * floorHeight;

        // Line gets thinner and more transparent near VP
        const alpha = 0.2 + t * 0.5;
        const lineWidth = 1 + t * 2;

        // Calculate line width at this Y position (converges to VP)
        const convergence = (y - vp.y) / (height - vp.y);
        const lineWidthAtY = width * 0.8 * convergence;
        const lineStartX = vp.x - lineWidthAtY / 2;
        const lineEndX = vp.x + lineWidthAtY / 2;

        // Gold floor line
        this.floorGraphics.lineStyle(lineWidth, 0xffd700, alpha);
        this.floorGraphics.beginPath();
        this.floorGraphics.moveTo(lineStartX, y);
        this.floorGraphics.lineTo(lineEndX, y);
        this.floorGraphics.strokePath();

        // Subtle purple shadow below each line
        if (t > 0.3) {
          this.floorGraphics.lineStyle(1, 0x9b59b6, alpha * 0.3);
          this.floorGraphics.beginPath();
          this.floorGraphics.moveTo(lineStartX, y + 3);
          this.floorGraphics.lineTo(lineEndX, y + 3);
          this.floorGraphics.strokePath();
        }
      }

      // Draw perspective vertical lines (converge to VP)
      const numVerticalLines = 5;
      for (let i = 0; i <= numVerticalLines; i++) {
        const t = i / numVerticalLines;
        const bottomX = width * 0.1 + t * width * 0.8; // Spread at bottom

        this.floorGraphics.lineStyle(1, 0x9b59b6, 0.3);
        this.floorGraphics.beginPath();
        this.floorGraphics.moveTo(bottomX, height);
        this.floorGraphics.lineTo(vp.x, vp.y);
        this.floorGraphics.strokePath();
      }

      // Floor border at bottom
      this.floorGraphics.lineStyle(3, 0xffd700, 0.6);
      this.floorGraphics.beginPath();
      this.floorGraphics.moveTo(width * 0.08, height);
      this.floorGraphics.lineTo(width * 0.92, height);
      this.floorGraphics.strokePath();
    }

    /** Updates background and floor for forward movement illusion. */
    private updateBackground(delta: number): void {
      const speed = delta * 0.04;

      // Scroll clouds vertically (far background moves slowly)
      if (this.clouds) {
        this.clouds.tilePositionY -= speed * 0.3;
      }

      // Animate floor lines moving toward camera (downward)
      for (let i = 0; i < this.floorLineOffsets.length; i++) {
        this.floorLineOffsets[i] =
          (this.floorLineOffsets[i]! + speed * 0.02) % 1;
      }

      // Redraw floor grid with new offsets
      this.drawFloorGrid();
    }

    /** Creates the witch character sprite. */
    private createWitch(): void {
      const { width, height } = this.scale;

      // Witch shadow (ellipse below witch)
      this.witchShadow = this.add
        .ellipse(width / 2, height * 0.73, 60, 20, 0x000000, 0.4)
        .setDepth(9);

      // Witch sprite
      this.witch = this.add
        .sprite(width / 2, height * 0.68, "cc-runner-idle")
        .setScale(3)
        .setDepth(10);

      this.witch.play("cc-runner-walk");
    }

    /** Creates the three magical doors with perspective positioning. */
    private createDoors(): void {
      this.doors = [];
      this.doorLabels = [];
      this.doorGlows = [];

      for (let i = 0; i < NUM_CHOICES; i++) {
        const doorContainer = this.add.container(0, 0).setDepth(5);

        // Create ornate door background with Phaser graphics
        const doorGraphics = this.add.graphics();
        this.drawOrnateDoor(doorGraphics, 0, 0, 100, 140);
        doorContainer.add(doorGraphics);
        this.doorGlows.push(doorGraphics);

        // Door label (English word)
        const label = this.add
          .text(0, 0, "", {
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "#ffd700",
            align: "center",
            wordWrap: { width: 80 },
          })
          .setOrigin(0.5);
        doorContainer.add(label);
        this.doorLabels.push(label);

        // Make door interactive
        doorContainer.setSize(100, 140);
        doorContainer.setInteractive({ useHandCursor: true });
        doorContainer.on("pointerdown", () => this.selectDoor(i));

        this.doors.push(doorContainer);
      }
    }

    /** Draws an ornate magical door with purple/gold borders. */
    private drawOrnateDoor(
      graphics: Phaser.GameObjects.Graphics,
      x: number,
      y: number,
      width: number,
      height: number,
    ): void {
      graphics.clear();

      // Door shadow (perspective depth)
      graphics.fillStyle(0x000000, 0.4);
      graphics.fillRoundedRect(x + 4, y + 4, width, height, 6);

      // Outer glow
      graphics.fillStyle(0x9b59b6, 0.3);
      graphics.fillRoundedRect(x - 6, y - 6, width + 12, height + 12, 10);

      // Main door body
      graphics.fillStyle(0x2c1810, 0.95);
      graphics.fillRoundedRect(x, y, width, height, 6);

      // Inner panel
      graphics.fillStyle(0x1a0a2e, 0.8);
      graphics.fillRoundedRect(x + 8, y + 8, width - 16, height - 16, 4);

      // Outer border
      graphics.lineStyle(3, 0xffd700, 0.8);
      graphics.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, 6);

      // Inner border
      graphics.lineStyle(1, 0x9b59b6, 0.6);
      graphics.strokeRoundedRect(x + 8, y + 8, width - 16, height - 16, 4);

      // Decorative corners
      const cornerSize = 10;
      graphics.fillStyle(0xffd700, 0.9);
      // Top-left
      graphics.fillRect(x + 10, y + 10, cornerSize, 2);
      graphics.fillRect(x + 10, y + 10, 2, cornerSize);
      // Top-right
      graphics.fillRect(x + width - 20, y + 10, cornerSize, 2);
      graphics.fillRect(x + width - 12, y + 10, 2, cornerSize);
      // Bottom-left
      graphics.fillRect(x + 10, y + height - 12, cornerSize, 2);
      graphics.fillRect(x + 10, y + height - 20, 2, cornerSize);
      // Bottom-right
      graphics.fillRect(x + width - 20, y + height - 12, cornerSize, 2);
      graphics.fillRect(x + width - 12, y + height - 20, 2, cornerSize);

      // Magical rune circle
      graphics.lineStyle(1, 0x9b59b6, 0.5);
      graphics.strokeCircle(x + width / 2, y + height * 0.35, 12);
      graphics.lineStyle(1, 0xffd700, 0.3);
      graphics.strokeCircle(x + width / 2, y + height * 0.35, 8);
    }

    /** Creates UI elements (prompt, timer, score, lives). */
    private createUI(): void {
      const { width, height } = this.scale;

      // Thai prompt text at top
      this.promptText = this.add
        .text(width / 2, height * 0.08, "", {
          fontFamily: "Arial, sans-serif",
          fontSize: "26px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: width * 0.7 },
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(20);

      // Timer in top-right
      this.timerText = this.add
        .text(width * 0.9, height * 0.03, "1:30", {
          fontFamily: "monospace",
          fontSize: "22px",
          color: "#ffd700",
          align: "right",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(1, 0)
        .setDepth(20);

      // Score in top-center
      this.scoreText = this.add
        .text(width / 2, height * 0.02, "Score: 0", {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          color: "#ffd700",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(20);

      // Lives in top-left
      this.livesText = this.add
        .text(width * 0.08, height * 0.03, "Lives: 3", {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          color: "#ff6b6b",
          align: "left",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setDepth(20);

      // Game over text (hidden)
      this.gameOverText = this.add
        .text(width / 2, height / 2, "", {
          fontFamily: "Georgia, serif",
          fontSize: "44px",
          color: "#ff0000",
          align: "center",
          stroke: "#000000",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setVisible(false);

      // Completion text (hidden)
      this.completionText = this.add
        .text(width / 2, height / 2, "", {
          fontFamily: "Georgia, serif",
          fontSize: "32px",
          color: "#ffd700",
          align: "center",
          stroke: "#000000",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setVisible(false);
    }

    /** Creates visual effects (particles, hit effect). */
    private createEffects(): void {
      // Create crystal sprites for life display
      const { width, height } = this.scale;
      for (let i = 0; i < 3; i++) {
        const crystal = this.add
          .sprite(width * 0.04 + i * 28, height * 0.09, "cc-crystal-blue")
          .setScale(1.3)
          .setDepth(20);
        crystal.play("cc-crystal-spin");
        this.crystals.push(crystal);
      }

      // Hit effect sprite (hidden)
      this.hitEffect = this.add
        .sprite(0, 0, "cc-hit")
        .setScale(3)
        .setDepth(25)
        .setVisible(false);
    }

    /** Sets up keyboard and touch input. */
    private setupInput(): void {
      // Keyboard controls
      this.input.keyboard?.on("keydown-LEFT", this.moveLeft);
      this.input.keyboard?.on("keydown-A", this.moveLeft);
      this.input.keyboard?.on("keydown-RIGHT", this.moveRight);
      this.input.keyboard?.on("keydown-D", this.moveRight);
    }

    /** Starts the game timer. */
    private startTimer(): void {
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.onTimerTick,
        callbackScope: this,
        loop: true,
      });
    }

    /** Called every second by the timer. */
    private onTimerTick(): void {
      if (this.state.gameOver) return;

      this.state = updateTimer(this.state, 1);
      this.updateTimerDisplay();

      if (this.state.gameOver) {
        this.endGame();
      }
    }

    /** Updates the timer display text. */
    private updateTimerDisplay(): void {
      if (!this.timerText) return;
      const minutes = Math.floor(this.state.timeRemaining / 60);
      const seconds = this.state.timeRemaining % 60;
      this.timerText.setText(
        `${minutes}:${seconds.toString().padStart(2, "0")}`,
      );

      // Flash timer when low
      if (this.state.timeRemaining <= 10) {
        this.timerText.setColor("#ff0000");
      }
    }

    /** Moves the witch to a new lane. */
    private moveToLane(lane: number): void {
      if (this.transitioning || this.state.gameOver) return;

      this.state = moveToLane(this.state, lane);
      this.updateWitchPosition();
    }

    /** Updates witch sprite position based on current lane. */
    private updateWitchPosition(): void {
      if (!this.witch || !this.witchShadow) return;

      const targetX =
        this.lanePositions[this.state.currentLane] || this.lanePositions[1]!;
      this.tweens.add({
        targets: [this.witch, this.witchShadow],
        x: targetX,
        duration: 200,
        ease: "Power2",
      });
    }

    /** Selects the door in the current lane. */
    private selectDoor(lane: number): void {
      if (!this.doorsApproaching || this.state.gameOver) return;
      if (lane < 0 || lane >= NUM_CHOICES) return;
      if (this.selectedDoorLane !== -1) return;

      this.selectedDoorLane = lane;
      this.transitioning = true;

      // Move witch to selected lane
      this.state = moveToLane(this.state, lane);
      this.updateWitchPosition();

      // Fade out non-selected doors
      this.doors.forEach((door, index) => {
        if (index !== lane) {
          this.tweens.add({
            targets: door,
            alpha: 0,
            duration: 300,
          });
        }
      });

      // Speed up selected door approach
      const selectedTween = this.doorApproachTweens[lane];
      if (selectedTween) {
        selectedTween.timeScale = 1.5;
      }
    }

    /** Animates doors approaching from vanishing point to witch position. */
    private animateDoorsApproach(): void {
      const vp = this.vanishingPoint;
      const { width } = this.scale;

      this.doorsApproaching = true;
      this.selectedDoorLane = -1;
      this.doorApproachTweens = [];

      // Update door highlights for current lane
      this.updateDoorHighlights();

      this.doors.forEach((door, index) => {
        // Reset door visibility and alpha
        door.setAlpha(0.9);

        // Spawn at vanishing point in correct lane with small scale
        door.setPosition(this.doorStartLanePositions[index] ?? width / 2, vp.y);
        door.setScale(this.doorStartScale);

        // Animate toward final position (near witch) - only animate y, scale
        const tween = this.tweens.add({
          targets: door,
          y: this.doorEndY,
          scaleX: this.doorEndScale,
          scaleY: this.doorEndScale,
          duration: this.doorApproachDuration,
          ease: "Quad.easeIn",
          onComplete: () => {
            // If this is the last tween to complete, check if player selected
            if (index === NUM_CHOICES - 1) {
              this.onDoorsReached();
            }
          },
        });

        this.doorApproachTweens.push(tween);
      });
    }

    /** Called when doors reach the witch position. */
    private onDoorsReached(): void {
      if (!this.doorsApproaching) return;
      this.doorsApproaching = false;

      // If no door selected, auto-select center (penalty)
      if (this.selectedDoorLane === -1) {
        this.selectedDoorLane = 1; // Center lane
        this.transitioning = true;

        // Move witch to center
        this.state = moveToLane(this.state, 1);
        this.updateWitchPosition();
      }

      // Process the answer
      this.time.delayedCall(200, () => {
        this.processAnswer(this.selectedDoorLane);
      });
    }

    /** Processes the answer for the selected door. */
    private processAnswer(choiceIndex: number): void {
      const choices = choicesFor(context.input, this.state.index);
      const correct =
        choices[choiceIndex] === context.input[this.state.index]!.translation;

      this.state = answer(this.state, correct, context.input.length);
      this.playConsequence(correct);

      // Update UI
      this.updateScoreDisplay();
      this.updateLivesDisplay();

      // Check if game should end (lives depleted)
      if (this.state.gameOver) {
        this.time.delayedCall(500, () => this.endGame());
        return;
      }

      // Different timing for correct vs incorrect answers
      if (correct) {
        // Correct: door passes through witch, then reset
        this.time.delayedCall(1000, () => {
          this.resetWitchPosition();
          this.transitioning = false;
          this.renderPrompt();
        });
      } else {
        // Incorrect: door passes by, witch bounces back
        this.time.delayedCall(700, () => {
          this.transitioning = false;
          this.renderPrompt();
        });
      }
    }

    /** Plays visual and audio consequence for answer. */
    private playConsequence(correct: boolean): void {
      // Play hit effect
      if (this.hitEffect && this.witch) {
        this.hitEffect
          .setPosition(this.witch.x, this.witch.y - 20)
          .setVisible(true)
          .play("cc-hit");
      }

      // Play sound
      this.sound.play("cc-feedback", { volume: 0.35 });

      if (correct) {
        this.playCorrectDoorPass();
      } else {
        this.playIncorrectDoorPass();
      }
    }

    /** Plays correct answer - door passes through witch. */
    private playCorrectDoorPass(): void {
      if (!this.witch) return;

      const selectedDoor = this.doors[this.selectedDoorLane];
      const { height } = this.scale;

      // Crystal celebration at witch position
      const crystal = this.add
        .sprite(this.witch.x, this.witch.y - 30, "cc-crystal-blue")
        .setScale(2)
        .setDepth(15);
      crystal.play("cc-crystal-spin");

      this.tweens.add({
        targets: crystal,
        y: crystal.y - 50,
        alpha: 0,
        duration: 600,
        onComplete: () => crystal.destroy(),
      });

      // Selected door continues past witch (shrinks and moves down)
      if (selectedDoor) {
        this.tweens.add({
          targets: selectedDoor,
          y: height + 100,
          scaleX: 1.4,
          scaleY: 1.4,
          alpha: 0,
          duration: 500,
          ease: "Power2",
        });
      }

      // Witch jump animation
      this.tweens.add({
        targets: this.witch,
        y: this.witch.y - 15,
        duration: 150,
        yoyo: true,
      });
    }

    /** Plays incorrect answer - door passes by witch, witch bounces back. */
    private playIncorrectDoorPass(): void {
      // Screen shake
      this.cameras.main.shake(200, 0.01);

      // Flash red overlay
      const { width, height } = this.scale;
      const flash = this.add
        .rectangle(width / 2, height / 2, width, height, 0xff0000, 0.3)
        .setDepth(25);

      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        onComplete: () => flash.destroy(),
      });

      // Selected door passes by witch (misses)
      const selectedDoor = this.doors[this.selectedDoorLane];
      if (selectedDoor) {
        this.tweens.add({
          targets: selectedDoor,
          y: height + 100,
          alpha: 0,
          duration: 400,
        });
      }

      // Sentinel appears briefly
      if (this.witch) {
        const sentinel = this.add
          .sprite(this.witch.x, this.witch.y, "cc-sentinel")
          .setScale(3)
          .setDepth(15);
        sentinel.play("cc-sentinel-idle");

        this.tweens.add({
          targets: sentinel,
          alpha: 0,
          duration: 500,
          onComplete: () => sentinel.destroy(),
        });
      }

      // Witch bounces back to center lane
      this.animateWitchBounceBack();
    }

    /** Plays correct answer visual effect - witch runs through door. */
    private playCorrectEffect(): void {
      if (!this.witch || !this.witchShadow) return;

      const vp = this.vanishingPoint;
      const selectedLane = this.state.currentLane;

      // Crystal celebration at current position
      const crystal = this.add
        .sprite(this.witch.x, this.witch.y - 30, "cc-crystal-blue")
        .setScale(2)
        .setDepth(15);
      crystal.play("cc-crystal-spin");

      this.tweens.add({
        targets: crystal,
        y: crystal.y - 50,
        alpha: 0,
        duration: 600,
        onComplete: () => crystal.destroy(),
      });

      // Fade and expand the selected door (witch passes through it)
      const selectedDoor = this.doors[selectedLane];
      if (selectedDoor) {
        this.tweens.add({
          targets: selectedDoor,
          alpha: 0,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 400,
          ease: "Power2",
        });
      }

      // Witch runs toward vanishing point (shrinks, fades)
      this.tweens.add({
        targets: this.witch,
        x: vp.x,
        y: vp.y,
        scaleX: 0.5,
        scaleY: 0.5,
        alpha: 0,
        duration: 800,
        ease: "Power2",
      });

      // Witch shadow fades
      this.tweens.add({
        targets: this.witchShadow,
        alpha: 0,
        duration: 400,
      });
    }

    /** Plays incorrect answer visual effect - witch bounces back. */
    private playIncorrectEffect(): void {
      // Screen shake
      this.cameras.main.shake(200, 0.01);

      // Flash red overlay
      const { width, height } = this.scale;
      const flash = this.add
        .rectangle(width / 2, height / 2, width, height, 0xff0000, 0.3)
        .setDepth(25);

      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        onComplete: () => flash.destroy(),
      });

      // Sentinel appears briefly
      if (this.witch) {
        const sentinel = this.add
          .sprite(this.witch.x, this.witch.y, "cc-sentinel")
          .setScale(3)
          .setDepth(15);
        sentinel.play("cc-sentinel-idle");

        this.tweens.add({
          targets: sentinel,
          alpha: 0,
          duration: 500,
          onComplete: () => sentinel.destroy(),
        });
      }

      // Witch bounces back to center lane
      this.animateWitchBounceBack();
    }

    /** Animates witch bouncing back to center lane after wrong answer. */
    private animateWitchBounceBack(): void {
      if (!this.witch || !this.witchShadow) return;

      const centerLaneX = this.lanePositions[1] || this.lanePositions[0]!;

      // Bounce back to center with easing
      this.tweens.add({
        targets: [this.witch, this.witchShadow],
        x: centerLaneX,
        duration: 400,
        ease: "Back.easeOut",
      });

      // Small jump during bounce
      if (this.witch) {
        const originalY = this.witch.y;
        this.tweens.add({
          targets: this.witch,
          y: originalY - 10,
          duration: 150,
          yoyo: true,
          ease: "Power2",
        });
      }
    }

    /** Resets witch to starting position after run-through animation. */
    private resetWitchPosition(): void {
      if (!this.witch || !this.witchShadow) return;

      const { width, height } = this.scale;
      const witchY = height * 0.68;
      const witchScale = height > width ? 2.2 : 2.8;

      // Instantly reset witch to center lane, bottom position
      this.witch.setPosition(width / 2, witchY);
      this.witch.setScale(witchScale);
      this.witch.setAlpha(1);

      // Reset shadow
      this.witchShadow.setPosition(width / 2, witchY + 30);
      this.witchShadow.setAlpha(0.4);
      this.witchShadow.setScale(witchScale * 0.8);

      // Reset lane state to center
      this.state = moveToLane(this.state, 1);

      // Reset all doors
      this.doors.forEach((door) => {
        door.setAlpha(1);
      });
    }

    /** Renders the next vocabulary prompt and choices. */
    private renderPrompt(): void {
      const item = context.input[this.state.index]!;
      const choices = choicesFor(context.input, this.state.index);

      // Update prompt text
      this.promptText?.setText(`เลือกคำแปลของ:\n${item.term}`);

      // Update door labels
      choices.forEach((choice, index) => {
        if (this.doorLabels[index]) {
          this.doorLabels[index]!.setText(choice);
        }
      });

      this.layout();

      // Start door approach animation
      this.time.delayedCall(100, () => {
        this.animateDoorsApproach();
      });
    }

    /** Updates door visual highlights based on current lane. */
    private updateDoorHighlights(): void {
      this.doorGlows.forEach((graphics, index) => {
        const doorWidth = 100;
        const doorHeight = 140;

        this.drawOrnateDoor(
          graphics,
          -doorWidth / 2,
          -doorHeight / 2,
          doorWidth,
          doorHeight,
        );

        if (index === this.state.currentLane) {
          // Highlight current lane with green glow
          graphics.lineStyle(3, 0x00ff00, 0.8);
          graphics.strokeRoundedRect(
            -doorWidth / 2 - 3,
            -doorHeight / 2 - 3,
            doorWidth + 6,
            doorHeight + 6,
            8,
          );
        }
      });
    }

    /** Updates score display. */
    private updateScoreDisplay(): void {
      this.scoreText?.setText(`Score: ${this.state.score}`);
    }

    /** Updates lives display and crystal icons. */
    private updateLivesDisplay(): void {
      this.livesText?.setText(`Lives: ${this.state.lives}`);

      // Update crystal visibility
      this.crystals.forEach((crystal, index) => {
        crystal.setVisible(index < this.state.lives);
      });
    }

    /** Ends the game with appropriate message. */
    private endGame(): void {
      this.timerEvent?.remove();

      // Calculate final results
      const finalResults = results(this.state);

      // Determine success based on lives remaining
      const success = this.state.lives > 0;

      if (success) {
        // Timer ran out with lives remaining - "Time's Up!"
        this.completionText?.setText(
          `Time's Up!\nScore: ${this.state.score}\nXP: ${finalResults.xp}\nAccuracy: ${Math.round(finalResults.accuracy * 100)}%`,
        );
        this.completionText?.setVisible(true);
      } else {
        // Lives reached 0 - "Game Over"
        this.gameOverText?.setText(
          `Game Over\nNo lives remaining!\nScore: ${this.state.score}\nXP: ${finalResults.xp}\nAccuracy: ${Math.round(finalResults.accuracy * 100)}%`,
        );
        this.gameOverText?.setVisible(true);
      }

      // Hide doors
      this.doors.forEach((door) => door.setVisible(false));

      // Emit results
      this.time.delayedCall(1500, () => {
        context.complete(finalResults);
      });
    }

    /** Repositions game objects for responsive layout with perspective. */
    private layout(): void {
      const { width, height } = this.scale;
      const compact = height > width;
      const vp = this.vanishingPoint;

      // Update background sizes
      this.clouds?.setSize(width, height).setPosition(0, 0);

      // Recalculate vanishing point
      this.vanishingPoint = {
        x: width / 2,
        y: height * 0.25,
      };

      // Redraw corridor and floor
      this.drawCorridor();
      this.drawFloorGrid();

      // Calculate perspective convergence factor for doors
      const doorY = height * 0.38;
      const convergenceFactor = (doorY - vp.y) / (height - vp.y);

      // Lane positions at bottom of screen (full spread)
      const laneBottomPositions = [
        width * 0.2,
        width * 0.5,
        width * 0.8,
      ];

      // Lane positions at vanishing point (small separation)
      const vanishingPointConvergence = 0.1;
      this.doorStartLanePositions = laneBottomPositions.map(
        (x) => vp.x + (x - vp.x) * vanishingPointConvergence,
      );

      // Lane positions at door height (converged toward VP)
      this.doorLanePositions = laneBottomPositions.map(
        (x) => vp.x + (x - vp.x) * convergenceFactor,
      );

      // Store door end Y position (near witch)
      this.doorEndY = height * 0.68;

      // Lane positions at witch height (less converged)
      const witchY = height * 0.68;
      const witchConvergence = (witchY - vp.y) / (height - vp.y);
      this.lanePositions = laneBottomPositions.map(
        (x) => vp.x + (x - vp.x) * witchConvergence,
      );

      // Position doors with perspective
      const doorScale = compact ? 0.5 : 0.6;
      this.doorEndScale = doorScale;
      this.doors.forEach((door, index) => {
        door.setPosition(this.doorLanePositions[index]!, doorY);
        door.setScale(doorScale);
      });

      // Position witch
      const witchScale = compact ? 2.2 : 2.8;
      this.witch?.setPosition(
        this.lanePositions[this.state.currentLane] || width / 2,
        witchY,
      );
      this.witch?.setScale(witchScale);

      // Position witch shadow
      this.witchShadow?.setPosition(
        this.lanePositions[this.state.currentLane] || width / 2,
        witchY + 30,
      );
      this.witchShadow?.setScale(witchScale * 0.8);

      // Update UI positions
      this.promptText?.setPosition(width / 2, height * 0.06);
      this.timerText?.setPosition(width * 0.92, height * 0.02);
      this.scoreText?.setPosition(width / 2, height * 0.015);
      this.livesText?.setPosition(width * 0.05, height * 0.02);

      // Update crystal positions
      this.crystals.forEach((crystal, index) => {
        crystal.setPosition(width * 0.04 + index * 28, height * 0.07);
      });

      // Update door highlights
      this.updateDoorHighlights();
    }

    /** Removes host-level listeners when Phaser shuts down this scene. */
    private release(): void {
      this.scale.off("resize", this.layout, this);
      this.input.keyboard?.off("keydown-LEFT", this.moveLeft);
      this.input.keyboard?.off("keydown-A", this.moveLeft);
      this.input.keyboard?.off("keydown-RIGHT", this.moveRight);
      this.input.keyboard?.off("keydown-D", this.moveRight);
      this.timerEvent?.remove();
    }
  };
}
