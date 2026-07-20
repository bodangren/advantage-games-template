import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { PALETTE } from '../core/Constants';

export class DiamondItem extends Phaser.GameObjects.Container {
    declare body: Phaser.Physics.Arcade.Body;
    private diamondGraphics!: Phaser.GameObjects.Graphics;
    private glowGraphics!: Phaser.GameObjects.Graphics;
    private blinkTimer = 0;
    private glowAlpha = 0;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.glowGraphics = scene.add.graphics();
        this.add(this.glowGraphics);

        this.diamondGraphics = scene.add.graphics();
        this.add(this.diamondGraphics);

        scene.physics.add.existing(this);
        this.body.setCircle(20);
        this.body.setOffset(-20, -20);
        this.body.setCollideWorldBounds(false);

        this.setActive(false);
        this.setVisible(false);
        this.setDepth(15);
    }

    spawn(x: number, y: number) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.blinkTimer = 0;
        this.glowAlpha = 0;

        this.drawDiamond();

        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0, to: 1 },
            scale: { from: 0.5, to: 1 },
            duration: 500,
            ease: 'Back.easeOut',
        });
    }

    private drawDiamond() {
        this.diamondGraphics.clear();
        this.glowGraphics.clear();

        const size = 18;

        this.glowGraphics.fillStyle(0xffff00, this.glowAlpha * 0.3);
        this.glowGraphics.fillCircle(0, 0, size + 10);

        this.diamondGraphics.fillStyle(0xffff00, 1);
        this.diamondGraphics.beginPath();
        this.diamondGraphics.moveTo(0, -size);
        this.diamondGraphics.lineTo(size, 0);
        this.diamondGraphics.lineTo(0, size);
        this.diamondGraphics.lineTo(-size, 0);
        this.diamondGraphics.closePath();
        this.diamondGraphics.fillPath();

        this.diamondGraphics.fillStyle(0xffffff, 0.6);
        this.diamondGraphics.beginPath();
        this.diamondGraphics.moveTo(0, -size + 4);
        this.diamondGraphics.lineTo(size - 6, 0);
        this.diamondGraphics.lineTo(0, size - 8);
        this.diamondGraphics.lineTo(-size + 6, 0);
        this.diamondGraphics.closePath();
        this.diamondGraphics.fillPath();
    }

    update(time: number, delta: number) {
        if (!this.active) return;

        this.blinkTimer += delta;
        const blink = Math.sin(this.blinkTimer * 0.01) * 0.5 + 0.5;
        this.diamondGraphics.setAlpha(0.5 + blink * 0.5);

        this.glowAlpha = Math.sin(this.blinkTimer * 0.008) * 0.5 + 0.5;
        this.drawDiamond();

        this.rotation += delta * 0.002;
    }

    collect() {
        EventBus.emit(Events.DIAMOND_COLLECTED);

        this.scene.tweens.add({
            targets: this,
            scale: 2,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.setActive(false);
                this.setVisible(false);
                this.body.enable = false;
            },
        });
    }
}

export class DiamondGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene: Phaser.Scene) {
        super(scene.physics.world, scene, {
            classType: DiamondItem,
            maxSize: 10,
            runChildUpdate: true,
        });
    }

    spawn(x: number, y: number) {
        const diamond = this.getFirstDead(true, x, y) as DiamondItem | null;
        if (diamond) {
            diamond.spawn(x, y);
        }
    }

    updateAll(time: number, delta: number) {
        this.getChildren().forEach(c => {
            const diamond = c as DiamondItem;
            if (diamond.active) {
                diamond.update(time, delta);
            }
        });
    }
}
