import Phaser from 'phaser';
import { GAME, PALETTE } from '../core/Constants';

export class Preloader extends Phaser.Scene {
    constructor() { super('Preloader'); }

    preload() {
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;

        const barBg = this.add.rectangle(cx, cy + 40, 300, 16, 0x333333);
        const bar = this.add.rectangle(cx - 150, cy + 40, 0, 16, PALETTE.PLAYER).setOrigin(0, 0.5);

        this.add.text(cx, cy - 20, 'SURVIVAL GAME', {
            fontSize: '32px',
            color: PALETTE.UI_TEXT,
            fontFamily: PALETTE.UI_TEXT,
        }).setOrigin(0.5);

        this.load.on('progress', (p: number) => {
            bar.width = 300 * p;
        });

        this.load.on('complete', () => this.createTextures());
    }

    private createTextures() {
        const g = this.add.graphics();

        g.fillStyle(PALETTE.PLAYER);
        g.fillCircle(16, 16, 16);
        g.generateTexture('player', 32, 32);

        g.destroy();
    }

    create() {
        this.scene.start('Game');
    }
}
