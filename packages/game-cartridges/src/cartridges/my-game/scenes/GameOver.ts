import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { GAME, PALETTE, UI } from '../core/Constants';

export class GameOver extends Phaser.Scene {
    constructor() { super('GameOver'); }

    create() {
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;

        this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.8);

        const title = this.add.text(cx, cy - 120, 'GAME OVER', {
            fontSize: UI.FONT_SIZE_XL,
            color: '#ff4444',
            fontFamily: UI.FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            scale: { from: 2, to: 1 },
            duration: 500,
            ease: 'Bounce.easeOut',
        });

        const totalSec = Math.floor(gameState.elapsedTime / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;

        const stats = [
            `Score: ${gameState.score}`,
            `Kills: ${gameState.killCount}`,
            `Level: ${gameState.level}`,
            `Time: ${min}:${sec.toString().padStart(2, '0')}`,
            `Best Score: ${gameState.bestScore}`,
        ];

        stats.forEach((text, i) => {
            this.add.text(cx, cy - 40 + i * 32, text, {
                fontSize: UI.FONT_SIZE_MD,
                color: PALETTE.UI_TEXT,
                fontFamily: UI.FONT_FAMILY,
            }).setOrigin(0.5);
        });

        const restartText = this.add.text(cx, cy + 140, 'Click to Restart', {
            fontSize: UI.FONT_SIZE_LG,
            color: PALETTE.UI_ACCENT,
            fontFamily: UI.FONT_FAMILY,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: restartText,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
        });

        this.input.once('pointerdown', () => {
            EventBus.emit(Events.GAME_RESTART);
            this.scene.start('Game');
        });
    }
}
