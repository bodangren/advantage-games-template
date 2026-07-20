import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { XP, PALETTE } from '../core/Constants';

class XPGem extends Phaser.GameObjects.Arc {
    declare body: Phaser.Physics.Arcade.Body;
    value = 1;
    private magnetized = false;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, XP.SIZE, PALETTE.XP_GEM, 1);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCircle(XP.SIZE);
        this.setActive(false);
        this.setVisible(false);
        this.setDepth(6);
    }

    spawn(x: number, y: number, value: number) {
        this.setPosition(x, y);
        this.value = value;
        this.magnetized = false;
        this.setFillStyle(value >= 5 ? PALETTE.XP_GEM_HIGH : PALETTE.XP_GEM);
        this.setRadius(Math.min(XP.SIZE + value, 12));
        this.body.setCircle(this.radius);
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.setAlpha(0);
        this.setScale(0);

        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });
    }

    magnetize(playerX: number, playerY: number) {
        this.magnetized = true;
    }

    updateFromPlayer(playerX: number, playerY: number, delta: number) {
        if (!this.active) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

        if (dist < XP.COLLECT_RANGE) {
            this.collect();
            return;
        }

        if (this.magnetized || dist < XP.MAGNET_RANGE) {
            this.magnetized = true;
            const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
            const speed = XP.MAGNET_SPEED * (1 - dist / 300);
            this.body.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        }
    }

    private collect() {
        const leveled = gameState.addXp(this.value);
        EventBus.emit(Events.XP_COLLECTED, { xp: this.value, total: gameState.xp, level: gameState.level });
        if (leveled) {
            EventBus.emit(Events.PLAYER_LEVEL_UP, { level: gameState.level });
        }

        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
    }
}

export class XPGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene: Phaser.Scene) {
        super(scene.physics.world, scene, {
            classType: XPGem,
            maxSize: 300,
            runChildUpdate: false,
        });
    }

    spawn(x: number, y: number, value: number) {
        const gem = this.getFirstDead(true, x, y) as XPGem | null;
        if (gem) {
            gem.spawn(x, y, value);
        }
    }

    updateAll(playerX: number, playerY: number, delta: number) {
        this.getChildren().forEach(c => {
            const gem = c as XPGem;
            if (gem.active) {
                gem.updateFromPlayer(playerX, playerY, delta);
            }
        });
    }
}
