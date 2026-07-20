import Phaser from 'phaser';
import { GAME, PALETTE, UI } from '../core/Constants';

export class HowToPlay extends Phaser.Scene {
    constructor() { super('HowToPlay'); }

    create() {
        const cx = GAME.WIDTH / 2;

        this.add.rectangle(cx, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0x0a0a1a);

        this.add.text(cx, 25, 'HOW TO PLAY', {
            fontSize: '28px',
            fontFamily: UI.FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.createControlsBox(55);
        this.createGameplayBox(195);
        this.createEnemyBox(345);
        this.createVocabularyBox(470);

        this.createButton(cx, GAME.HEIGHT - 30, '← BACK', () => {
            this.scene.start('Title');
        });
    }

    private createControlsBox(y: number) {
        const x = 20;
        const w = GAME.WIDTH - 40;
        const h = 130;

        this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x111133, 0.9)
            .setStrokeStyle(1, 0x44aaff);

        this.add.text(x + 15, y + 8, '🎮 CONTROLS', {
            fontSize: '18px',
            fontFamily: UI.FONT_FAMILY,
            color: '#44aaff',
            fontStyle: 'bold',
        });

        const controls = [
            'WASD / Arrow Keys = Move player',
            'Type A-Z letters = Attack jellyfish',
            'Click on enemy = Switch typing target',
            'Space bar / ⏸ button = Pause game',
        ];

        controls.forEach((text, i) => {
            this.add.text(x + 20, y + 32 + i * 22, `• ${text}`, {
                fontSize: '14px',
                fontFamily: UI.FONT_FAMILY,
                color: '#cccccc',
            });
        });
    }

    private createGameplayBox(y: number) {
        const x = 20;
        const w = GAME.WIDTH - 40;
        const h = 140;

        this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x111133, 0.9)
            .setStrokeStyle(1, 0x44ff44);

        this.add.text(x + 15, y + 8, '⚔️ GAMEPLAY', {
            fontSize: '18px',
            fontFamily: UI.FONT_FAMILY,
            color: '#44ff44',
            fontStyle: 'bold',
        });

        const items = [
            'Type the word on a jellyfish to attack it',
            'Auto-weapons fire at Blue & Purple enemies',
            'Collect XP gems from defeated enemies',
            'Every 10 kills = Diamond item drops',
            'Diamond clears ALL enemies for 10 seconds!',
        ];

        items.forEach((text, i) => {
            this.add.text(x + 20, y + 32 + i * 20, `• ${text}`, {
                fontSize: '13px',
                fontFamily: UI.FONT_FAMILY,
                color: '#cccccc',
            });
        });
    }

    private createEnemyBox(y: number) {
        const x = 20;
        const w = GAME.WIDTH - 40;
        const h = 115;

        this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x111133, 0.9)
            .setStrokeStyle(1, 0xff6699);

        this.add.text(x + 15, y + 8, '🪼 ENEMY TYPES', {
            fontSize: '18px',
            fontFamily: UI.FONT_FAMILY,
            color: '#ff6699',
            fontStyle: 'bold',
        });

        const enemies = [
            { color: 0x00ff99, label: 'Green', desc: 'Fast, weak (1.0x speed)' },
            { color: 0xff6699, label: 'Pink', desc: 'Normal (0.8x speed)' },
            { color: 0x0066ff, label: 'Blue', desc: 'Tank, tough (0.6x speed)' },
            { color: 0x9900ff, label: 'Purple', desc: 'Elite, strongest (0.4x speed)' },
        ];

        enemies.forEach((e, i) => {
            const ey = y + 32 + i * 20;
            this.add.circle(x + 28, ey + 2, 6, e.color);
            this.add.text(x + 42, ey, `${e.label} = ${e.desc}`, {
                fontSize: '13px',
                fontFamily: UI.FONT_FAMILY,
                color: '#cccccc',
            });
        });
    }

    private createVocabularyBox(y: number) {
        const x = 20;
        const w = GAME.WIDTH - 40;
        const h = 110;

        this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x111133, 0.9)
            .setStrokeStyle(1, 0xffff44);

        this.add.text(x + 15, y + 8, '📚 VOCABULARY SETS (changes every 5 levels)', {
            fontSize: '16px',
            fontFamily: UI.FONT_FAMILY,
            color: '#ffff44',
            fontStyle: 'bold',
        });

        const sets = [
            'Lv 1-4: Basic (animals, colors, body)',
            'Lv 5-9: Daily Life (food, home, school)',
            'Lv 10-14: Nature & Actions (weather, verbs)',
            'Lv 15-19: Advanced (emotions, abstract)',
            'Lv 20-24: Expert (academic, complex)',
            'Lv 25+: Master (professional, rare)',
        ];

        sets.forEach((text, i) => {
            this.add.text(x + 20, y + 30 + i * 13, `• ${text}`, {
                fontSize: '12px',
                fontFamily: UI.FONT_FAMILY,
                color: '#cccccc',
            });
        });
    }

    private createButton(x: number, y: number, label: string, callback: () => void) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 180, 40, 0x444466, 0.9);
        bg.setStrokeStyle(1, 0x666688);
        container.add(bg);

        const text = this.add.text(0, 0, label, {
            fontSize: '18px',
            fontFamily: UI.FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add(text);

        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
            });
            bg.setFillStyle(0x555577, 1);
        });

        bg.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
            });
            bg.setFillStyle(0x444466, 0.9);
        });

        bg.on('pointerdown', callback);
    }
}
