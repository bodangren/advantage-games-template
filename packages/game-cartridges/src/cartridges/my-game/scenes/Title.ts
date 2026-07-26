import Phaser from 'phaser';
import { GAME, PALETTE, UI } from '../core/Constants';

const FUN_WORDS = [
    'hello', 'cool', 'awesome', 'vibe', 'chill', 'happy', 'sunny', 'magic',
    'ocean', 'wave', 'coral', 'star', 'moon', 'dream', 'sparkle', 'shine',
    'bubble', 'splash', 'giggle', 'yay', 'wow', 'fun', 'party', 'dance',
    'smile', 'laugh', 'joy', 'peace', 'love', 'hope', 'wish', 'glow',
    'fuzzy', 'cozy', 'snug', 'warm', 'bright', 'sweet', 'nice', 'kind',
    'brave', 'bold', 'wild', 'free', 'calm', 'zen', 'groove', 'funky',
    'rad', 'epic', 'lit', 'fire', 'dope', 'sick', 'neat', 'swell',
];

interface JellyfishData {
    graphics: Phaser.GameObjects.Container;
    radius: number;
    floatTween: Phaser.Tweens.Tween | null;
    wobbleOffset: number;
}

export class Title extends Phaser.Scene {
    private jellyfish: JellyfishData[] = [];

    constructor() { super('Title'); }

    create() {
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;

        this.createOceanBackground();
        this.createDecorativeJellyfish();

        const title = this.add.text(cx, cy - 150, 'VOCABULARY\nTYPING SURVIVOR', {
            fontSize: '48px',
            fontFamily: UI.FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5).setDepth(10);

        this.tweens.add({
            targets: title,
            scale: { from: 0.8, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 1000,
            ease: 'Back.easeOut',
        });

        this.tweens.add({
            targets: title,
            y: title.y - 5,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        const subtitle = this.add.text(cx, cy - 70, 'Type words to defeat jellyfish!', {
            fontSize: UI.FONT_SIZE_MD,
            fontFamily: UI.FONT_FAMILY,
            color: '#88ccff',
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        this.tweens.add({
            targets: subtitle,
            alpha: 1,
            duration: 800,
            delay: 500,
        });

        this.createButton(cx, cy + 20, '▶  START GAME', 0x44aaff, () => {
            this.scene.start('Preloader');
        });

        this.createButton(cx, cy + 90, '❓  HOW TO PLAY', 0x666699, () => {
            this.scene.start('HowToPlay');
        });

        this.add.text(cx, GAME.HEIGHT - 30, 'Click the jellyfish!', {
            fontSize: '14px',
            fontFamily: UI.FONT_FAMILY,
            color: '#446688',
        }).setOrigin(0.5).setDepth(10);
    }

    private createDecorativeJellyfish() {
        const count = 10;
        const colors = [0xff6699, 0x00ff99, 0x0066ff, 0x9900ff, 0xff44cc, 0x44ffff];

        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(50, GAME.WIDTH - 50);
            const y = Phaser.Math.Between(50, GAME.HEIGHT - 100);
            const radius = Phaser.Math.Between(12, 22);
            const color = colors[i % colors.length];

            const container = this.add.container(x, y);
            container.setDepth(5);

            const glow = this.add.circle(0, 0, radius + 8, color, 0.15);
            container.add(glow);

            const body = this.add.graphics();
            body.fillStyle(color, 0.7);
            body.beginPath();
            body.arc(0, 0, radius, Math.PI, 0, false);
            body.lineTo(radius, radius * 0.3);
            body.lineTo(-radius, radius * 0.3);
            body.closePath();
            body.fillPath();

            body.fillStyle(color, 0.5);
            body.fillEllipse(0, -radius * 0.15, radius * 1.6, radius * 1.0);

            body.fillStyle(0xffffff, 0.6);
            body.fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.18);
            body.fillCircle(radius * 0.3, -radius * 0.3, radius * 0.18);
            container.add(body);

            const tentacles = this.add.graphics();
            container.add(tentacles);
            this.drawTentacles(tentacles, radius, color, 0);

            const hitArea = this.add.circle(0, 0, radius + 5, 0xffffff, 0);
            hitArea.setInteractive({ useHandCursor: true });
            container.add(hitArea);

            hitArea.on('pointerover', () => {
                this.tweens.add({
                    targets: container,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 150,
                });
                glow.setAlpha(0.3);
            });

            hitArea.on('pointerout', () => {
                this.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                });
                glow.setAlpha(0.15);
            });

            hitArea.on('pointerdown', () => {
                this.onJellyfishClick(container, x, y, radius, color);
            });

            const wobbleOffset = Math.random() * Math.PI * 2;

            this.tweens.add({
                targets: container,
                y: y - 15,
                duration: 2000 + Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            this.jellyfish.push({
                graphics: container,
                radius,
                floatTween: null,
                wobbleOffset,
            });
        }

        this.time.addEvent({
            delay: 50,
            callback: () => this.updateTentacles(),
            loop: true,
        });
    }

    private drawTentacles(g: Phaser.GameObjects.Graphics, radius: number, color: number, time: number) {
        g.clear();
        const count = 4;
        for (let i = 0; i < count; i++) {
            const t = (i / (count - 1)) * 2 - 1;
            const startX = t * radius * 0.6;
            const startY = radius * 0.3;

            g.lineStyle(2, color, 0.5);
            g.beginPath();
            g.moveTo(startX, startY);

            for (let j = 1; j <= 4; j++) {
                const progress = j / 4;
                const wx = startX + Math.sin(time * 0.003 + i * 1.2 + progress * 3) * radius * 0.4;
                const wy = startY + progress * radius * 1.2;
                g.lineTo(wx, wy);
            }
            g.strokePath();
        }
    }

    private updateTentacles() {
        const time = Date.now();
        for (const jf of this.jellyfish) {
            if (!jf.graphics.active) continue;
            const tentacles = jf.graphics.getAt(2) as Phaser.GameObjects.Graphics;
            if (tentacles && tentacles.active) {
                this.drawTentacles(tentacles, jf.radius, 0xff6699, time + jf.wobbleOffset * 1000);
            }
        }
    }

    private onJellyfishClick(container: Phaser.GameObjects.Container, x: number, y: number, radius: number, color: number) {
        const word = FUN_WORDS[Phaser.Math.Between(0, FUN_WORDS.length - 1)];

        this.popJellyfish(container, x, y, radius, color);
        this.showFloatingWord(x, y - radius - 10, word);
    }

    private popJellyfish(container: Phaser.GameObjects.Container, x: number, y: number, radius: number, color: number) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const speed = 80 + Math.random() * 60;
            const particle = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, 1);
            particle.setDepth(6);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.2,
                duration: 500 + Math.random() * 300,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy(),
            });
        }

        const flash = this.add.circle(x, y, radius * 2, 0xffffff, 0.6);
        flash.setDepth(7);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => flash.destroy(),
        });

        container.setVisible(false);
        container.setActive(false);

        this.time.delayedCall(Phaser.Math.Between(3000, 5000), () => {
            this.respawnJellyfish(container);
        });
    }

    private respawnJellyfish(container: Phaser.GameObjects.Container) {
        const newX = Phaser.Math.Between(50, GAME.WIDTH - 50);
        const newY = Phaser.Math.Between(50, GAME.HEIGHT - 100);

        container.setPosition(newX, newY);
        container.setScale(0);
        container.setAlpha(0);
        container.setVisible(true);
        container.setActive(true);

        this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.easeOut',
        });

        this.tweens.add({
            targets: container,
            y: newY - 15,
            duration: 2000 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private showFloatingWord(x: number, y: number, word: string) {
        const text = this.add.text(x, y, word, {
            fontSize: '18px',
            fontFamily: UI.FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: text,
            y: y - 60,
            alpha: 0,
            scale: 1.3,
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: () => text.destroy(),
        });
    }

    private createButton(x: number, y: number, label: string, color: number, callback: () => void) {
        const container = this.add.container(x, y);
        container.setDepth(10);

        const bg = this.add.rectangle(0, 0, 280, 55, color, 0.9);
        bg.setStrokeStyle(2, 0xffffff, 0.3);
        container.add(bg);

        const text = this.add.text(0, 0, label, {
            fontSize: UI.FONT_SIZE_LG,
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
            bg.setFillStyle(color, 1);
        });

        bg.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
            });
            bg.setFillStyle(color, 0.9);
        });

        bg.on('pointerdown', callback);

        container.setAlpha(0);
        container.setScale(0.8);
        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            duration: 500,
            delay: 300,
            ease: 'Back.easeOut',
        });
    }

    private createOceanBackground() {
        const g = this.add.graphics();
        g.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x0d1a3a, 0x0d1a3a, 1);
        g.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        g.setDepth(-100);

        for (let i = 0; i < 15; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, GAME.WIDTH),
                Phaser.Math.Between(0, GAME.HEIGHT),
                Phaser.Math.Between(1, 3),
                0xffffff,
                Phaser.Math.FloatBetween(0.05, 0.2)
            );
            particle.setDepth(-95);

            this.tweens.add({
                targets: particle,
                y: particle.y - 50,
                alpha: 0,
                duration: Phaser.Math.Between(3000, 6000),
                repeat: -1,
                onRepeat: () => {
                    particle.y = GAME.HEIGHT + 10;
                    particle.x = Phaser.Math.Between(0, GAME.WIDTH);
                    particle.alpha = Phaser.Math.FloatBetween(0.05, 0.2);
                },
            });
        }

        for (let i = 0; i < 3; i++) {
            const ray = this.add.graphics();
            ray.setDepth(-96);
            const baseX = 150 + i * 250;
            ray.fillStyle(0x4488ff, 0.03);
            ray.beginPath();
            ray.moveTo(baseX - 20, 0);
            ray.lineTo(baseX + 20, 0);
            ray.lineTo(baseX + 60, GAME.HEIGHT);
            ray.lineTo(baseX - 60, GAME.HEIGHT);
            ray.closePath();
            ray.fillPath();
        }
    }
}
