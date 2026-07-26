import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { GAME, PLAYER, XP, PALETTE, UI, TYPING, ENEMY } from '../core/Constants';
import { Player } from '../objects/Player';
import { EnemyGroup, Enemy } from '../objects/Enemy';
import { WeaponSystem } from '../objects/Weapon';
import { XPGroup } from '../objects/XPGem';
import { DiamondGroup } from '../objects/DiamondItem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { TypingSystem } from '../systems/TypingSystem';
import { TypingUI } from '../ui/TypingUI';

export class Game extends Phaser.Scene {
    private player!: Player;
    private enemies!: EnemyGroup;
    private xpGems!: XPGroup;
    private weaponSystem!: WeaponSystem;
    private spawnSystem!: SpawnSystem;
    private typingSystem!: TypingSystem;
    private typingUI!: TypingUI;
    private autoBullets!: Phaser.Physics.Arcade.Group;
    private autoShootTimer = 0;
    private diamonds!: DiamondGroup;
    private diamondEffectActive = false;
    private diamondEffectTimer = 0;
    private readonly DIAMOND_EFFECT_DURATION = 10000;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

    private scoreText!: Phaser.GameObjects.Text;
    private healthBar!: Phaser.GameObjects.Rectangle;
    private healthBarBg!: Phaser.GameObjects.Rectangle;
    private xpBar!: Phaser.GameObjects.Rectangle;
    private xpBarBg!: Phaser.GameObjects.Rectangle;
    private levelText!: Phaser.GameObjects.Text;
    private timeText!: Phaser.GameObjects.Text;
    private killText!: Phaser.GameObjects.Text;

    private bg!: Phaser.GameObjects.Graphics;
    private gridSize = 80;

    private spaceKey!: Phaser.Input.Keyboard.Key;
    private pauseContainer!: Phaser.GameObjects.Container;
    private pauseOverlay!: Phaser.GameObjects.Rectangle;
    private pauseTitle!: Phaser.GameObjects.Text;
    private continueBtn!: Phaser.GameObjects.Container;
    private restartBtn!: Phaser.GameObjects.Container;
    private pauseHint!: Phaser.GameObjects.Text;

    private oceanParticles: Phaser.GameObjects.Arc[] = [];
    private lightRays: Phaser.GameObjects.Graphics[] = [];
    private bubbleTimer = 0;
    private readonly BUBBLE_INTERVAL = 2000;

    constructor() { super('Game'); }

    create() {
        gameState.reset();
        gameState.started = true;

        this.createBackground();
        this.createGrid();
        this.createOceanAnimations();

        this.player = new Player(this, GAME.WIDTH / 2, GAME.HEIGHT / 2);

        this.enemies = new EnemyGroup(this);
        this.xpGems = new XPGroup(this);
        this.weaponSystem = new WeaponSystem(this, this.enemies, this.player);
        this.spawnSystem = new SpawnSystem(this, this.enemies);

        this.typingSystem = new TypingSystem(this, this.enemies, this.player);
        this.typingUI = new TypingUI(this);

        this.autoBullets = this.physics.add.group({
            classType: Phaser.GameObjects.Arc,
            maxSize: 100,
            runChildUpdate: false,
        });

        this.diamonds = new DiamondGroup(this);

        this.physics.add.overlap(
            this.weaponSystem.projectiles,
            this.enemies,
            this.onProjectileHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.enemies,
            this.onPlayerHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.autoBullets,
            this.enemies,
            this.onAutoBulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.diamonds,
            this.onPlayerHitDiamond as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (gameState.gameOver || gameState.paused) return;
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const clickedEnemy = this.enemies.getEnemyAt(worldX, worldY);
            if (clickedEnemy) {
                this.typingSystem.switchTarget(clickedEnemy);
            }
        });

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, GAME.WORLD_SIZE, GAME.WORLD_SIZE);
        this.physics.world.setBounds(0, 0, GAME.WORLD_SIZE, GAME.WORLD_SIZE);

        this.createUI();
        this.createPauseMenu();

        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', this.togglePause, this);

        EventBus.on(Events.PLAYER_DIED, this.onPlayerDied, this);
        EventBus.on(Events.PLAYER_LEVEL_UP, this.onLevelUp, this);
        EventBus.on(Events.ENEMY_KILLED, this.onEnemyKilled, this);
        EventBus.on(Events.TYPING_WORD_COMPLETE, this.onTypingWordComplete, this);
        EventBus.on(Events.TYPING_STREAK, this.onTypingStreak, this);
        EventBus.on(Events.DIAMOND_COLLECTED, this.onDiamondCollected, this);
        this.events.on('shutdown', this.cleanup, this);

        EventBus.emit(Events.SPECTACLE_ENTRANCE);
    }

    private createBackground() {
        const tileKey = 'ocean_tile';
        const tileSize = 400;

        if (!this.textures.exists(tileKey)) {
            this.generateOceanTile(tileKey, tileSize);
        }

        for (let x = 0; x < GAME.WORLD_SIZE; x += tileSize) {
            for (let y = 0; y < GAME.WORLD_SIZE; y += tileSize) {
                this.add.image(x, y, tileKey).setOrigin(0, 0).setDepth(-100);
            }
        }
    }

    private generateOceanTile(key: string, size: number) {
        const g = this.add.graphics();

        g.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x0d1a3a, 0x0d1a3a, 1);
        g.fillRect(0, 0, size, size);

        for (let i = 0; i < 6; i++) {
            const rx = (i * 67 + 13) % size;
            const ry = (i * 89 + 31) % size;
            const rw = 20 + (i * 17) % 30;
            const rh = 15 + (i * 23) % 25;
            g.fillStyle(0x1a1a2a, 0.6);
            g.fillEllipse(rx, ry, rw, rh);
        }

        for (let i = 0; i < 4; i++) {
            const rx = (i * 97 + 47) % size;
            const ry = (i * 73 + 19) % size;
            g.fillStyle(0x2a1a3a, 0.5);
            g.fillCircle(rx, ry, 8 + (i * 11) % 12);
            g.fillStyle(0x3a2a4a, 0.4);
            g.fillCircle(rx - 3, ry - 2, 5 + (i * 7) % 8);
        }

        for (let i = 0; i < 3; i++) {
            const sx = (i * 131 + 53) % size;
            const sy = (i * 107 + 29) % size;
            g.lineStyle(2, 0x1a3a1a, 0.4);
            g.beginPath();
            g.moveTo(sx, sy);
            for (let j = 1; j <= 4; j++) {
                const wx = sx + Math.sin(j * 1.5) * 8;
                const wy = sy + j * 12;
                g.lineTo(wx, wy);
            }
            g.strokePath();
        }

        for (let i = 0; i < 12; i++) {
            const px = (i * 53 + 7) % size;
            const py = (i * 41 + 11) % size;
            g.fillStyle(0xffffff, 0.15);
            g.fillCircle(px, py, 1 + (i % 2));
        }

        g.generateTexture(key, size, size);
        g.destroy();
    }

    private createGrid() {
        const g = this.add.graphics();
        g.setDepth(-99);
        g.lineStyle(1, PALETTE.BG_MID, 0.3);
        for (let x = 0; x <= GAME.WORLD_SIZE; x += this.gridSize) {
            g.moveTo(x, 0);
            g.lineTo(x, GAME.WORLD_SIZE);
        }
        for (let y = 0; y <= GAME.WORLD_SIZE; y += this.gridSize) {
            g.moveTo(0, y);
            g.lineTo(GAME.WORLD_SIZE, y);
        }
        g.strokePath();
    }

    private createOceanAnimations() {
        this.oceanParticles = [];
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, GAME.WIDTH),
                Phaser.Math.Between(0, GAME.HEIGHT),
                Phaser.Math.Between(1, 3),
                0xffffff,
                Phaser.Math.FloatBetween(0.05, 0.2)
            );
            particle.setScrollFactor(0).setDepth(-95);
            (particle as any).speedY = Phaser.Math.FloatBetween(-0.3, -0.1);
            (particle as any).speedX = Phaser.Math.FloatBetween(-0.1, 0.1);
            (particle as any).wobble = Phaser.Math.FloatBetween(0, Math.PI * 2);
            this.oceanParticles.push(particle);
        }

        this.lightRays = [];
        for (let i = 0; i < 4; i++) {
            const ray = this.add.graphics();
            ray.setScrollFactor(0).setDepth(-96);
            const baseX = 100 + i * 200;
            const baseAlpha = Phaser.Math.FloatBetween(0.02, 0.06);
            (ray as any).baseX = baseX;
            (ray as any).baseAlpha = baseAlpha;
            (ray as any).phase = i * 0.8;
            this.drawLightRay(ray, baseX, baseAlpha);
            this.lightRays.push(ray);
        }
    }

    private drawLightRay(ray: Phaser.GameObjects.Graphics, baseX: number, alpha: number) {
        ray.clear();
        ray.fillStyle(0x4488ff, alpha);
        ray.beginPath();
        ray.moveTo(baseX - 20, 0);
        ray.lineTo(baseX + 20, 0);
        ray.lineTo(baseX + 60, GAME.HEIGHT);
        ray.lineTo(baseX - 60, GAME.HEIGHT);
        ray.closePath();
        ray.fillPath();
    }

    private createUI() {
        const pad = UI.PADDING;

        this.scoreText = this.add.text(pad, pad, 'Score: 0', {
            fontSize: UI.FONT_SIZE_MD,
            color: PALETTE.UI_TEXT,
            fontFamily: UI.FONT_FAMILY,
        }).setScrollFactor(0).setDepth(100);

        this.timeText = this.add.text(pad, pad + 28, 'Time: 0:00', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#aaaaaa',
            fontFamily: UI.FONT_FAMILY,
        }).setScrollFactor(0).setDepth(100);

        this.killText = this.add.text(pad, pad + 50, 'Kills: 0', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#aaaaaa',
            fontFamily: UI.FONT_FAMILY,
        }).setScrollFactor(0).setDepth(100);

        const pauseBtnX = GAME.WIDTH - pad - 16;
        const pauseBtnY = pad + 16;
        const pauseBtn = this.add.container(pauseBtnX, pauseBtnY);
        pauseBtn.setScrollFactor(0).setDepth(100);

        const pauseBtnBg = this.add.circle(0, 0, 18, PALETTE.UI_BG, 0.8);
        pauseBtnBg.setStrokeStyle(2, 0x44aaff);
        pauseBtn.add(pauseBtnBg);

        const pauseIcon = this.add.text(0, 0, '⏸', {
            fontSize: '18px',
            color: '#ffffff',
        }).setOrigin(0.5);
        pauseBtn.add(pauseIcon);

        pauseBtnBg.setInteractive({ useHandCursor: true });
        pauseBtnBg.on('pointerover', () => pauseBtnBg.setFillStyle(0x223355, 0.9));
        pauseBtnBg.on('pointerout', () => pauseBtnBg.setFillStyle(PALETTE.UI_BG, 0.8));
        pauseBtnBg.on('pointerdown', () => this.togglePause());

        this.healthBarBg = this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT - 40, 200, 12, 0x333333)
            .setScrollFactor(0).setDepth(100);
        this.healthBar = this.add.rectangle(GAME.WIDTH / 2 - 100, GAME.HEIGHT - 40, 200, 12, 0x44ff44)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

        this.add.text(GAME.WIDTH / 2 - 115, GAME.HEIGHT - 40, 'HP', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#44ff44',
            fontFamily: UI.FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

        this.xpBarBg = this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT - 22, 200, 8, 0x333333)
            .setScrollFactor(0).setDepth(100);
        this.xpBar = this.add.rectangle(GAME.WIDTH / 2 - 100, GAME.HEIGHT - 22, 0, 8, 0xffff00)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

        this.add.text(GAME.WIDTH / 2 - 115, GAME.HEIGHT - 22, 'EXP', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#ffff00',
            fontFamily: UI.FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

        this.levelText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT - 56, 'Lv 1', {
            fontSize: UI.FONT_SIZE_MD,
            color: PALETTE.UI_ACCENT,
            fontFamily: UI.FONT_FAMILY,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    }

    private createPauseMenu() {
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;

        this.pauseContainer = this.add.container(0, 0);
        this.pauseContainer.setScrollFactor(0).setDepth(300);
        this.pauseContainer.setVisible(false);

        this.pauseOverlay = this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.7);
        this.pauseContainer.add(this.pauseOverlay);

        this.pauseTitle = this.add.text(cx, cy - 120, 'PAUSED', {
            fontSize: UI.FONT_SIZE_XL,
            color: '#ffffff',
            fontFamily: UI.FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.pauseContainer.add(this.pauseTitle);

        this.continueBtn = this.createPauseButton(cx - 100, cy, 'Continue', () => this.resumeGame());
        this.pauseContainer.add(this.continueBtn);

        this.restartBtn = this.createPauseButton(cx + 100, cy, 'Restart', () => this.restartGame());
        this.pauseContainer.add(this.restartBtn);

        const mainMenuBtn = this.createPauseButton(cx, cy + 65, 'Main Menu', () => this.goToMainMenu());
        this.pauseContainer.add(mainMenuBtn);

        this.pauseHint = this.add.text(cx, cy + 110, 'Press SPACE to resume', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#aaaaaa',
            fontFamily: UI.FONT_FAMILY,
        }).setOrigin(0.5);
        this.pauseContainer.add(this.pauseHint);
    }

    private createPauseButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 150, 50, PALETTE.UI_BG, 0.9);
        bg.setStrokeStyle(2, 0x44aaff);
        container.add(bg);

        const text = this.add.text(0, 0, label, {
            fontSize: UI.FONT_SIZE_MD,
            color: PALETTE.UI_TEXT,
            fontFamily: UI.FONT_FAMILY,
        }).setOrigin(0.5);
        container.add(text);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(0x223355));
        bg.on('pointerout', () => bg.setFillStyle(PALETTE.UI_BG));
        bg.on('pointerdown', callback);

        return container;
    }

    private togglePause() {
        if (gameState.gameOver) return;
        if (gameState.paused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    private pauseGame() {
        gameState.paused = true;
        this.physics.world.pause();
        this.showPauseMenu();
        EventBus.emit(Events.GAME_PAUSE);
    }

    private resumeGame() {
        gameState.paused = false;
        this.physics.world.resume();
        this.hidePauseMenu();
        EventBus.emit(Events.GAME_RESUME);
    }

    private restartGame() {
        gameState.paused = false;
        this.physics.world.resume();
        this.hidePauseMenu();
        EventBus.emit(Events.GAME_RESTART);
        this.scene.restart();
    }

    private goToMainMenu() {
        gameState.paused = false;
        this.physics.world.resume();
        this.hidePauseMenu();
        EventBus.emit(Events.GAME_RESTART);
        this.scene.start('Title');
    }

    private showPauseMenu() {
        this.pauseContainer.setVisible(true);
    }

    private hidePauseMenu() {
        this.pauseContainer.setVisible(false);
    }

    update(time: number, delta: number) {
        if (gameState.gameOver || gameState.paused) return;

        gameState.elapsedTime += delta;

        this.handleInput();
        this.player.update(time, delta);
        this.spawnSystem.update(time, delta);
        this.xpGems.updateAll(this.player.x, this.player.y, delta);

        this.typingSystem.update(time, delta);
        this.typingUI.update(
            this.typingSystem.getCurrentTarget(),
            this.typingSystem.getTypedCount()
        );

        this.updateUI();
        this.updateAutoShoot(delta);
        this.updateEnemyMovement();
        this.updateAutoBullets(delta);
        this.diamonds.updateAll(time, delta);
        this.updateDiamondEffect(delta);
        this.updateOceanAnimations(time, delta);
    }

    private handleInput() {
        let vx = 0;
        let vy = 0;
        const speed = gameState.playerSpeed;

        if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= speed;
        if (this.cursors.right.isDown || this.wasd.D.isDown) vx += speed;
        if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= speed;
        if (this.cursors.down.isDown || this.wasd.S.isDown) vy += speed;

        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }

        this.player.body.setVelocity(vx, vy);
        this.player.setDirection(vx, vy);
    }

    private updateUI() {
        this.scoreText.setText(`Score: ${gameState.score}`);
        this.killText.setText(`Kills: ${gameState.killCount}`);

        const totalSec = Math.floor(gameState.elapsedTime / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        this.timeText.setText(`Time: ${min}:${sec.toString().padStart(2, '0')}`);

        const hpRatio = gameState.health / gameState.maxHealth;
        this.healthBar.width = 200 * hpRatio;

        const xpRatio = gameState.xp / gameState.xpToNext;
        this.xpBar.width = 200 * xpRatio;

        this.levelText.setText(`Lv ${gameState.level}`);
    }

    private updateAutoShoot(delta: number) {
        const baseRate = 1200;
        const wpmBonus = gameState.typingWPM * 8;
        const shootRate = Math.max(300, baseRate - wpmBonus);

        this.autoShootTimer += delta;
        if (this.autoShootTimer >= shootRate) {
            this.autoShootTimer = 0;
            this.fireAutoBullet();
        }
    }

    private fireAutoBullet() {
        const allEnemies = this.enemies.getActiveEnemies();
        const validTargets = allEnemies.filter(e => 
            e.enemyType === 'tank' || e.enemyType === 'elite'
        );
        if (validTargets.length === 0) return;

        const target = validTargets[Phaser.Math.Between(0, validTargets.length - 1)];
        if (!target || !target.active) return;

        const bullet = this.autoBullets.get(this.player.x, this.player.y) as Phaser.GameObjects.Arc;
        if (!bullet) return;

        bullet.setPosition(this.player.x, this.player.y);
        bullet.setRadius(5);
        bullet.setFillStyle(0xff44ff, 1);
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setDepth(11);

        const body = bullet.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        body.setCircle(5);

        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 400;

        if (dist > 0) {
            body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
        }

        (bullet as any).damage = 15 + Math.floor(gameState.typingWPM / 5);
        (bullet as any).lifetime = 2500;
        (bullet as any).age = 0;
    }

    private updateEnemyMovement() {
        const px = this.player.x;
        const py = this.player.y;
        const adaptiveMult = Math.min(
            ENEMY.SPEED_MAX_MULT,
            ENEMY.SPEED_MIN_MULT + gameState.typingWPM / ENEMY.SPEED_WPM_DIVISOR
        );

        this.enemies.getChildren().forEach(child => {
            const enemy = child as any;
            if (!enemy.active || !enemy.body) return;

            const dx = px - enemy.x;
            const dy = py - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
                const speed = (enemy.speed || ENEMY.BASE_SPEED) * adaptiveMult;
                enemy.body.velocity.x = (dx / dist) * speed;
                enemy.body.velocity.y = (dy / dist) * speed;
            }
        });
    }

    private updateAutoBullets(delta: number) {
        this.autoBullets.getChildren().forEach(b => {
            const bullet = b as any;
            if (!bullet.active) return;
            bullet.age = (bullet.age || 0) + delta;
            if (bullet.age > (bullet.lifetime || 2500)) {
                bullet.setActive(false);
                bullet.setVisible(false);
                if (bullet.body) bullet.body.enable = false;
            }
        });
    }

    private updateDiamondEffect(delta: number) {
        if (!this.diamondEffectActive) return;

        this.diamondEffectTimer -= delta;

        const enemies = this.enemies.getActiveEnemies();
        for (const enemy of enemies) {
            enemy.die();
        }

        if (this.diamondEffectTimer <= 0) {
            this.diamondEffectActive = false;
            this.diamondEffectTimer = 0;
        }
    }

    private updateOceanAnimations(time: number, delta: number) {
        for (const particle of this.oceanParticles) {
            particle.y += (particle as any).speedY;
            particle.x += (particle as any).speedX + Math.sin(time * 0.002 + (particle as any).wobble) * 0.3;

            if (particle.y < -10) {
                particle.y = GAME.HEIGHT + 10;
                particle.x = Phaser.Math.Between(0, GAME.WIDTH);
            }
            if (particle.x < -10) particle.x = GAME.WIDTH + 10;
            if (particle.x > GAME.WIDTH + 10) particle.x = -10;
        }

        for (const ray of this.lightRays) {
            const sway = Math.sin(time * 0.001 + (ray as any).phase) * 30;
            const baseX = (ray as any).baseX + sway;
            const alpha = (ray as any).baseAlpha + Math.sin(time * 0.0015 + (ray as any).phase) * 0.02;
            this.drawLightRay(ray, baseX, Math.max(0, alpha));
        }

        this.bubbleTimer += delta;
        if (this.bubbleTimer >= this.BUBBLE_INTERVAL) {
            this.bubbleTimer = 0;
            this.spawnBubble();
        }
    }

    private spawnBubble() {
        const x = Phaser.Math.Between(0, GAME.WIDTH);
        const y = GAME.HEIGHT + 10;
        const size = Phaser.Math.FloatBetween(2, 5);
        const bubble = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.1, 0.3));
        bubble.setScrollFactor(0).setDepth(-94);

        this.tweens.add({
            targets: bubble,
            y: -20,
            x: x + Phaser.Math.Between(-50, 50),
            alpha: 0,
            duration: Phaser.Math.Between(3000, 5000),
            ease: 'Sine.easeOut',
            onComplete: () => bubble.destroy(),
        });
    }

    private onProjectileHitEnemy(
        projectileObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ) {
        const proj = projectileObj as any;
        const enemy = enemyObj as any;
        if (!proj.active || !enemy.active) return;

        enemy.takeDamage(proj.damage);
        proj.onHit();
        EventBus.emit(Events.SPECTACLE_HIT);
    }

    private onPlayerHitEnemy(
        _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ) {
        const enemy = enemyObj as any;
        if (!enemy.active) return;
        this.player.takeDamage(enemy.damage);
    }

    private onAutoBulletHitEnemy(
        bulletObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ) {
        const bullet = bulletObj as any;
        const enemy = enemyObj as any;
        if (!bullet.active || !enemy.active) return;

        enemy.takeDamage(bullet.damage || 15);

        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.enable = false;

        EventBus.emit(Events.SPECTACLE_HIT);
    }

    private onTypingWordComplete(data: { target: Enemy; word: string; damage: number; streak: number; x: number; y: number }) {
        if (data.target && data.target.active) {
            data.target.takeDamage(data.damage);
            this.weaponSystem.fireAll(data.target);
        }

        this.spawnTypingAttackEffect(data.x, data.y, data.damage);

        if (data.streak >= TYPING.STREAK_MILESTONE_1) {
            this.cameras.main.shake(100, 0.005 + data.streak * 0.001);
        }

        this.spawnSystem.getAdaptiveDifficulty().checkAndAdjust();
    }

    private onTypingStreak(data: { streak: number }) {
        const labels: Record<number, string> = {
            5: 'ON FIRE!',
            10: 'UNSTOPPABLE!',
            25: 'LEGENDARY!',
        };

        const label = labels[data.streak] || `${data.streak}x STREAK`;
        const text = this.add.text(
            this.cameras.main.scrollX + GAME.WIDTH / 2,
            this.cameras.main.scrollY + GAME.HEIGHT * 0.3,
            label,
            {
                fontSize: UI.FONT_SIZE_XL,
                fontFamily: UI.FONT_FAMILY,
                color: '#ffff00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
            }
        ).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Quad.easeOut',
            onComplete: () => text.destroy(),
        });

        this.cameras.main.shake(150, 0.015);
    }

    private spawnTypingAttackEffect(x: number, y: number, damage: number) {
        const px = this.player.x;
        const py = this.player.y;

        const count = 6;
        for (let i = 0; i < count; i++) {
            const t = (i + 1) / (count + 1);
            const bx = px + (x - px) * t;
            const by = py + (y - py) * t;

            const bullet = this.add.circle(bx, by, 4, PALETTE.WEAPON_ORB, 0.8);
            bullet.setDepth(12);

            this.tweens.add({
                targets: bullet,
                alpha: 0,
                scale: 0.2,
                duration: 300,
                delay: i * 30,
                onComplete: () => bullet.destroy(),
            });
        }

        const impact = this.add.circle(x, y, 8, 0x44ffff, 0.9);
        impact.setDepth(15);
        this.tweens.add({
            targets: impact,
            scale: 3,
            alpha: 0,
            duration: 400,
            ease: 'Quad.easeOut',
            onComplete: () => impact.destroy(),
        });

        const dmgText = this.add.text(x, y - 20, `-${damage}`, {
            fontSize: UI.FONT_SIZE_MD,
            fontFamily: UI.FONT_FAMILY,
            color: '#44ffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(16);

        this.tweens.add({
            targets: dmgText,
            y: dmgText.y - 30,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => dmgText.destroy(),
        });
    }

    private onEnemyKilled(data: { x: number; y: number; xp: number; type: string }) {
        this.xpGems.spawn(data.x, data.y, data.xp);

        if (!this.diamondEffectActive) {
            gameState.killsForItem++;
            if (gameState.killsForItem >= 10) {
                gameState.killsForItem = 0;
                this.diamonds.spawn(data.x, data.y);
            }
        }
    }

    private onPlayerHitDiamond(
        _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        diamondObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ) {
        const diamond = diamondObj as any;
        if (!diamond.active) return;
        diamond.collect();
    }

    private onDiamondCollected() {
        this.diamondEffectActive = true;
        this.diamondEffectTimer = this.DIAMOND_EFFECT_DURATION;

        const enemies = this.enemies.getActiveEnemies();
        for (const enemy of enemies) {
            enemy.die();
        }

        this.cameras.main.flash(300, 255, 255, 0);
        this.cameras.main.shake(200, 0.02);
    }

    private onLevelUp(data: { level: number }) {
        this.scene.pause();
        this.scene.launch('LevelUp', { level: data.level });
    }

    private onPlayerDied() {
        gameState.gameOver = true;
        gameState.bestScore = Math.max(gameState.bestScore, gameState.score);
        this.time.delayedCall(500, () => {
            this.scene.start('GameOver');
        });
    }

    private cleanup() {
        EventBus.off(Events.PLAYER_DIED, this.onPlayerDied, this);
        EventBus.off(Events.PLAYER_LEVEL_UP, this.onLevelUp, this);
        EventBus.off(Events.ENEMY_KILLED, this.onEnemyKilled, this);
        EventBus.off(Events.TYPING_WORD_COMPLETE, this.onTypingWordComplete, this);
        EventBus.off(Events.TYPING_STREAK, this.onTypingStreak, this);
        EventBus.off(Events.DIAMOND_COLLECTED, this.onDiamondCollected, this);
    }
}
