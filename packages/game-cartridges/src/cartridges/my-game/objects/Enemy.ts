import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { ENEMY, PALETTE, TYPING } from '../core/Constants';
import { getWordDifficultyColor, registerActiveWord, unregisterActiveWord } from '../data/Vocabulary';

export type EnemyType = 'normal' | 'fast' | 'tank' | 'elite';

const ENEMY_CONFIG: Record<EnemyType, { color: number; radius: number; speedMult: number; healthMult: number; damageMult: number; xpMult: number }> = {
    normal: { color: PALETTE.ENEMY_NORMAL, radius: ENEMY.BODY_RADIUS, speedMult: 0.8, healthMult: 1, damageMult: 1, xpMult: 1 },
    fast: { color: PALETTE.ENEMY_FAST, radius: ENEMY.BODY_RADIUS * 0.8, speedMult: 1.0, healthMult: 0.6, damageMult: 0.8, xpMult: 1.5 },
    tank: { color: PALETTE.ENEMY_TANK, radius: ENEMY.BODY_RADIUS * 1.5, speedMult: 0.6, healthMult: 3, damageMult: 1.5, xpMult: 3 },
    elite: { color: PALETTE.ENEMY_ELITE, radius: ENEMY.BODY_RADIUS * 2, speedMult: 0.4, healthMult: 8, damageMult: 3, xpMult: 10 },
};

class Enemy extends Phaser.GameObjects.Container {
    declare body: Phaser.Physics.Arcade.Body;
    enemyType: EnemyType = 'normal';
    maxHp = ENEMY.BASE_HEALTH;
    hp = ENEMY.BASE_HEALTH;
    damage = ENEMY.BASE_DAMAGE;
    speed = ENEMY.BASE_SPEED;
    xpValue = 1;
    word = '';
    wordDifficulty = 1;
    private spriteGraphics!: Phaser.GameObjects.Graphics;
    private currentRadius = ENEMY.BODY_RADIUS;
    private currentColor = PALETTE.ENEMY_NORMAL;
    private hpBar!: Phaser.GameObjects.Rectangle;
    private hpBarBg!: Phaser.GameObjects.Rectangle;
    private wordText!: Phaser.GameObjects.Text;
    private wordBg!: Phaser.GameObjects.Graphics;
    private targetRing!: Phaser.GameObjects.Arc;
    private isTargeted = false;
    private isFlashing = false;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.targetRing = scene.add.circle(0, 0, ENEMY.BODY_RADIUS + 6, TYPING.TARGET_LINE_COLOR, 0);
        this.targetRing.setStrokeStyle(2, TYPING.TARGET_LINE_COLOR, 0);
        this.add(this.targetRing);

        this.spriteGraphics = scene.add.graphics();
        this.add(this.spriteGraphics);

        this.hpBarBg = scene.add.rectangle(0, -16, 24, 3, 0x333333);
        this.add(this.hpBarBg);
        this.hpBar = scene.add.rectangle(-12, -16, 24, 3, 0xff0000).setOrigin(0, 0.5);
        this.add(this.hpBar);

        this.wordBg = scene.add.graphics();
        this.add(this.wordBg);

        this.wordText = scene.add.text(0, 0, '', {
            fontSize: TYPING.WORD_FONT_SIZE,
            fontFamily: TYPING.WORD_FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5, 1);
        this.add(this.wordText);

        scene.physics.add.existing(this, false);
        this.body.setCircle(ENEMY.BODY_RADIUS);
        this.body.setCollideWorldBounds(false);

        this.setActive(false);
        this.setVisible(false);
        this.setDepth(8);
    }

    activate(x: number, y: number, type: EnemyType = 'normal') {
        const timeMult = 1 + gameState.elapsedTime / 60000 * 0.3;
        const cfg = ENEMY_CONFIG[type];
        this.enemyType = type;
        this.maxHp = ENEMY.BASE_HEALTH * cfg.healthMult * timeMult;
        this.hp = this.maxHp;
        this.damage = ENEMY.BASE_DAMAGE * cfg.damageMult * timeMult;
        this.speed = ENEMY.BASE_SPEED * cfg.speedMult;
        this.xpValue = Math.ceil(ENEMY.BASE_HEALTH * cfg.xpMult * 0.1);
        this.currentRadius = cfg.radius;
        this.currentColor = cfg.color;
        this.isFlashing = false;

        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);

        this.body.setCircle(cfg.radius, -cfg.radius, -cfg.radius);
        this.body.enable = true;

        this.hpBarBg.setPosition(0, -(cfg.radius + 6));
        this.hpBar.setPosition(-12, -(cfg.radius + 6));
        this.hpBar.width = 24;

        this.isTargeted = false;
        this.targetRing.setStrokeStyle(2, TYPING.TARGET_LINE_COLOR, 0);

        this.drawJellyfish(0);
    }

    private drawJellyfish(time: number) {
        this.spriteGraphics.clear();

        const r = this.currentRadius;
        const color = this.isFlashing ? 0xffffff : this.currentColor;

        this.spriteGraphics.fillStyle(color, 0.7);
        this.spriteGraphics.beginPath();
        this.spriteGraphics.arc(0, 0, r, Math.PI, 0, false);
        this.spriteGraphics.lineTo(r, r * 0.3);
        this.spriteGraphics.lineTo(-r, r * 0.3);
        this.spriteGraphics.closePath();
        this.spriteGraphics.fillPath();

        this.spriteGraphics.fillStyle(color, 0.5);
        this.spriteGraphics.fillEllipse(0, -r * 0.15, r * 1.8, r * 1.2);

        this.spriteGraphics.fillStyle(0xffffff, 0.6);
        this.spriteGraphics.fillCircle(-r * 0.35, -r * 0.35, r * 0.22);
        this.spriteGraphics.fillCircle(r * 0.35, -r * 0.35, r * 0.22);

        this.spriteGraphics.fillStyle(0x000000, 0.9);
        this.spriteGraphics.fillCircle(-r * 0.3, -r * 0.3, r * 0.12);
        this.spriteGraphics.fillCircle(r * 0.3, -r * 0.3, r * 0.12);

        const tentacleCount = 5;
        const tentacleLength = r * 1.8;
        const tentacleWidth = Math.max(1.5, r * 0.08);

        for (let i = 0; i < tentacleCount; i++) {
            const t = (i / (tentacleCount - 1)) * 2 - 1;
            const startX = t * r * 0.7;
            const startY = r * 0.3;

            this.spriteGraphics.lineStyle(tentacleWidth, color, 0.6);
            this.spriteGraphics.beginPath();
            this.spriteGraphics.moveTo(startX, startY);

            const segments = 6;
            for (let j = 1; j <= segments; j++) {
                const progress = j / segments;
                const waveOffset = Math.sin(time * 0.004 + i * 1.2 + progress * 3) * r * 0.4;
                const x = startX + waveOffset;
                const y = startY + progress * tentacleLength;
                this.spriteGraphics.lineTo(x, y);
            }

            this.spriteGraphics.strokePath();
        }
    }

    setWord(word: string, difficulty: number) {
        if (this.word) {
            unregisterActiveWord(this.word);
        }
        this.word = word.toLowerCase();
        this.wordDifficulty = difficulty;
        registerActiveWord(this.word);

        this.wordText.setText(this.word);
        const color = getWordDifficultyColor(difficulty);
        this.wordText.setColor(color);

        const cfg = ENEMY_CONFIG[this.enemyType];
        const wordY = -(cfg.radius + 16);
        this.wordText.setPosition(0, wordY);

        this.updateWordBg();
    }

    updateWordProgress(typedCount: number) {
        if (!this.word) return;
        const typed = this.word.substring(0, typedCount);
        const remaining = this.word.substring(typedCount);
        this.wordText.setText(typed + remaining);

        this.wordText.setColor('#ffffff');
    }

    private updateWordBg() {
        this.wordBg.clear();
        if (!this.word) return;

        const w = this.wordText.width + 10;
        const h = this.wordText.height + 4;
        const x = -w / 2;
        const y = this.wordText.y - h;

        this.wordBg.fillStyle(0x000000, 0.6);
        this.wordBg.fillRoundedRect(x, y, w, h, 4);
    }

    highlightAsTarget(active: boolean) {
        this.isTargeted = active;
        if (active) {
            this.targetRing.setStrokeStyle(2, TYPING.TARGET_LINE_COLOR, 0.8);
        } else {
            this.targetRing.setStrokeStyle(2, TYPING.TARGET_LINE_COLOR, 0);
        }
    }

    addFireGlow() {
        const glowRadius = this.currentRadius + 5;
        const glow = this.scene.add.circle(0, 0, glowRadius, 0xff6622, 0.6);
        this.add(glow);
        glow.setDepth(-1);

        this.scene.tweens.add({
            targets: glow,
            alpha: { from: 0.6, to: 0.2 },
            scale: { from: 1, to: 1.3 },
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                glow.destroy();
            },
        });
    }

    spawnFireParticles() {
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = 50 + Math.random() * 50;
            const size = 2 + Math.random() * 2;

            const particle = this.scene.add.circle(0, 0, size, 0xff6622, 0.8);
            this.add(particle);
            particle.setDepth(10);

            const targetX = Math.cos(angle) * speed;
            const targetY = Math.sin(angle) * speed;

            this.scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.3,
                duration: 400 + Math.random() * 200,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    particle.destroy();
                },
            });
        }
    }

    takeDamage(amount: number): boolean {
        this.hp -= amount;
        const ratio = Math.max(0, this.hp / this.maxHp);
        this.hpBar.width = 24 * ratio;
        this.hpBar.setFillStyle(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000);

        this.isFlashing = true;
        this.drawJellyfish(0);
        this.scene.time.delayedCall(60, () => {
            if (this.active) {
                this.isFlashing = false;
            }
        });

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        if (this.word) {
            unregisterActiveWord(this.word);
            this.word = '';
        }

        gameState.killCount++;
        gameState.score += this.xpValue;
        EventBus.emit(Events.ENEMY_KILLED, {
            x: this.x,
            y: this.y,
            xp: this.xpValue,
            type: this.enemyType,
        });
        EventBus.emit(Events.SPECTACLE_HIT, { x: this.x, y: this.y });

        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
    }

    update(time: number, delta: number) {
        if (!this.active) return;

        this.drawJellyfish(time);

        if (this.isTargeted) {
            const pulse = 0.5 + Math.sin(time * 0.008) * 0.3;
            this.targetRing.setAlpha(pulse);
        }
    }
}

export class EnemyGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene: Phaser.Scene) {
        super(scene.physics.world, scene, {
            classType: Enemy,
            maxSize: ENEMY.POOL_SIZE,
            runChildUpdate: true,
        });
    }

    spawn(x: number, y: number, type: EnemyType = 'normal'): Enemy | null {
        const enemy = this.getFirstDead(true, x, y) as Enemy | null;
        if (enemy) {
            enemy.activate(x, y, type);
        }
        return enemy;
    }

    getActiveEnemies(): Enemy[] {
        return this.getChildren().filter(c => c.active) as Enemy[];
    }

    getEnemyAt(worldX: number, worldY: number): Enemy | null {
        const enemies = this.getActiveEnemies();
        for (const enemy of enemies) {
            const dist = Phaser.Math.Distance.Between(worldX, worldY, enemy.x, enemy.y);
            const cfg = ENEMY_CONFIG[enemy.enemyType];
            if (dist <= cfg.radius + 10) {
                return enemy;
            }
        }
        return null;
    }
}

export { Enemy };
