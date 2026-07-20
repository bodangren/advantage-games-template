import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { PLAYER, PALETTE, TYPING } from '../core/Constants';

export class Player extends Phaser.GameObjects.Container {
    declare body: Phaser.Physics.Arcade.Body;
    private subGraphics!: Phaser.GameObjects.Graphics;
    private propellerGraphics!: Phaser.GameObjects.Graphics;
    private glowGraphics!: Phaser.GameObjects.Graphics;
    private typedText!: Phaser.GameObjects.Text;
    private invulnerable = false;
    private invulnerableTimer = 0;
    private bubbleTimer = 0;
    private propellerAngle = 0;
    private facingRight = true;
    private currentAngle = 0;
    private isMoving = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        scene.add.existing(this);

        this.glowGraphics = scene.add.graphics();
        this.add(this.glowGraphics);

        this.subGraphics = scene.add.graphics();
        this.add(this.subGraphics);

        this.propellerGraphics = scene.add.graphics();
        this.add(this.propellerGraphics);

        this.typedText = scene.add.text(0, -35, '', {
            fontSize: '16px',
            fontFamily: TYPING.WORD_FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 1);
        this.add(this.typedText);

        scene.physics.add.existing(this, false);
        this.body.setCircle(PLAYER.BODY_RADIUS);
        this.body.setCollideWorldBounds(true);

        this.setDepth(10);
        this.drawSubmarine();
    }

    private drawSubmarine() {
        this.subGraphics.clear();
        this.propellerGraphics.clear();
        this.glowGraphics.clear();

        this.glowGraphics.fillStyle(0x44aaff, 0.15);
        this.glowGraphics.fillEllipse(0, 0, 60, 30);

        this.subGraphics.fillStyle(0x2288cc, 1);
        this.subGraphics.fillEllipse(0, 0, 48, 22);

        this.subGraphics.fillStyle(0x33aaee, 1);
        this.subGraphics.fillEllipse(-5, -2, 38, 16);

        this.subGraphics.fillStyle(0x1166aa, 1);
        this.subGraphics.fillEllipse(-15, 0, 20, 10);

        this.subGraphics.fillStyle(0x88ddff, 0.8);
        this.subGraphics.fillCircle(8, -4, 5);
        this.subGraphics.fillCircle(-2, -4, 4);

        this.subGraphics.fillStyle(0xffffaa, 0.9);
        this.subGraphics.fillCircle(8, -4, 3);
        this.subGraphics.fillCircle(-2, -4, 2.5);

        this.subGraphics.fillStyle(0x1166aa, 1);
        this.subGraphics.fillRect(-2, -14, 4, 8);
        this.subGraphics.fillStyle(0x88ddff, 0.6);
        this.subGraphics.fillCircle(0, -14, 3);

        this.subGraphics.fillStyle(0x1166aa, 1);
        this.subGraphics.beginPath();
        this.subGraphics.moveTo(-24, 0);
        this.subGraphics.lineTo(-30, -8);
        this.subGraphics.lineTo(-30, 8);
        this.subGraphics.closePath();
        this.subGraphics.fillPath();

        this.subGraphics.fillStyle(0x1166aa, 1);
        this.subGraphics.beginPath();
        this.subGraphics.moveTo(-22, 0);
        this.subGraphics.lineTo(-28, -10);
        this.subGraphics.lineTo(-22, -4);
        this.subGraphics.closePath();
        this.subGraphics.fillPath();

        this.subGraphics.beginPath();
        this.subGraphics.moveTo(-22, 0);
        this.subGraphics.lineTo(-28, 10);
        this.subGraphics.lineTo(-22, 4);
        this.subGraphics.closePath();
        this.subGraphics.fillPath();

        this.drawPropeller();
    }

    private drawPropeller() {
        this.propellerGraphics.clear();

        this.propellerGraphics.save();
        this.propellerGraphics.rotateCanvas(this.propellerAngle);

        this.propellerGraphics.fillStyle(0x888888, 0.8);
        this.propellerGraphics.fillRect(-1, -8, 2, 16);
        this.propellerGraphics.fillRect(-8, -1, 16, 2);

        this.propellerGraphics.fillStyle(0xaaaaaa, 0.6);
        this.propellerGraphics.fillCircle(0, 0, 3);

        this.propellerGraphics.restore();

        this.propellerGraphics.x = -28;
        this.propellerGraphics.y = 0;
    }

    update(time: number, delta: number) {
        if (this.invulnerable) {
            this.invulnerableTimer -= delta;
            this.subGraphics.setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.3);
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
                this.subGraphics.setAlpha(1);
            }
        }

        if (this.isMoving) {
            this.propellerAngle += delta * 0.02;
            this.drawPropeller();
        }

        this.bubbleTimer -= delta;
        if (this.bubbleTimer <= 0 && this.isMoving) {
            this.spawnBubble();
            this.bubbleTimer = 150;
        }

        this.glowGraphics.setAlpha(0.1 + Math.sin(time * 0.003) * 0.05);
    }

    setDirection(vx: number, vy: number) {
        this.isMoving = vx !== 0 || vy !== 0;

        if (vx > 0) {
            this.facingRight = true;
            this.currentAngle = 0;
        } else if (vx < 0) {
            this.facingRight = false;
            this.currentAngle = 0;
        }

        if (vy < 0 && vx === 0) {
            this.currentAngle = -90;
        } else if (vy > 0 && vx === 0) {
            this.currentAngle = 90;
        } else if (vy < 0 && vx !== 0) {
            this.currentAngle = this.facingRight ? -45 : -135;
        } else if (vy > 0 && vx !== 0) {
            this.currentAngle = this.facingRight ? 45 : 135;
        }

        if (!this.facingRight) {
            this.subGraphics.setScale(-1, 1);
            this.propellerGraphics.setScale(-1, 1);
        } else {
            this.subGraphics.setScale(1, 1);
            this.propellerGraphics.setScale(1, 1);
        }

        this.subGraphics.setAngle(this.currentAngle);
        this.propellerGraphics.setAngle(this.currentAngle);
    }

    setTypedText(typed: string) {
        this.typedText.setText(typed + '_');
    }

    clearTypedText() {
        this.typedText.setText('');
    }

    takeDamage(amount: number) {
        if (this.invulnerable) return;
        const actual = gameState.takeDamage(amount);
        EventBus.emit(Events.PLAYER_DAMAGED, { damage: actual, health: gameState.health });

        this.invulnerable = true;
        this.invulnerableTimer = PLAYER.INVULNERABLE_MS;

        this.scene.tweens.add({
            targets: this.subGraphics,
            scaleX: 1.3,
            scaleY: 0.7,
            duration: 80,
            yoyo: true,
            ease: 'Quad.easeOut',
        });

        if (gameState.health <= 0) {
            EventBus.emit(Events.PLAYER_DIED);
        }
    }

    private spawnBubble() {
        const offset = this.facingRight ? -25 : 25;
        const angle = Phaser.Math.DegToRad(this.currentAngle);
        const bx = this.x + Math.cos(angle) * offset;
        const by = this.y + Math.sin(angle) * offset;

        const size = Phaser.Math.FloatBetween(2, 5);
        const bubble = this.scene.add.circle(bx, by, size, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.5));
        bubble.setDepth(9);

        this.scene.tweens.add({
            targets: bubble,
            y: by - Phaser.Math.Between(15, 30),
            x: bx + Phaser.Math.Between(-10, 10),
            alpha: 0,
            scale: 0.3,
            duration: Phaser.Math.Between(500, 1000),
            ease: 'Sine.easeOut',
            onComplete: () => bubble.destroy(),
        });
    }
}
