import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { GAME, PALETTE, UI, TYPING } from '../core/Constants';
import { Enemy } from '../objects/Enemy';

export class TypingUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;

    private targetWordText: Phaser.GameObjects.Text;
    private typedText: Phaser.GameObjects.Text;
    private remainingText: Phaser.GameObjects.Text;
    private statsText: Phaser.GameObjects.Text;
    private streakText: Phaser.GameObjects.Text;
    private bgBar: Phaser.GameObjects.Rectangle;
    private difficultyDot: Phaser.GameObjects.Arc;

    private wrongFlash = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        const barY = GAME.HEIGHT - 80;
        const barWidth = GAME.WIDTH - 32;
        const barHeight = 50;

        this.container = scene.add.container(GAME.WIDTH / 2, barY);
        this.container.setScrollFactor(0).setDepth(150);

        this.bgBar = scene.add.rectangle(0, 0, barWidth, barHeight, PALETTE.UI_BG, 0.85);
        this.bgBar.setStrokeStyle(1, 0x334466);
        this.container.add(this.bgBar);

        this.difficultyDot = scene.add.circle(-barWidth / 2 + 16, 0, 6, 0x44ff44);
        this.container.add(this.difficultyDot);

        this.targetWordText = scene.add.text(-barWidth / 2 + 32, -12, 'Type to attack!', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#888888',
            fontFamily: UI.FONT_FAMILY,
        }).setOrigin(0, 0.5);
        this.container.add(this.targetWordText);

        this.typedText = scene.add.text(0, -12, '', {
            fontSize: TYPING.INPUT_FONT_SIZE,
            fontFamily: TYPING.WORD_FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);
        this.container.add(this.typedText);

        this.remainingText = scene.add.text(0, -12, '', {
            fontSize: TYPING.INPUT_FONT_SIZE,
            fontFamily: TYPING.WORD_FONT_FAMILY,
            color: '#666666',
        }).setOrigin(0, 0.5);
        this.container.add(this.remainingText);

        this.statsText = scene.add.text(barWidth / 2 - 12, -12, '', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#aaaaaa',
            fontFamily: UI.FONT_FAMILY,
        }).setOrigin(1, 0.5);
        this.container.add(this.statsText);

        this.streakText = scene.add.text(barWidth / 2 - 12, 10, '', {
            fontSize: UI.FONT_SIZE_SM,
            color: '#ff8844',
            fontFamily: UI.FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(1, 0.5);
        this.container.add(this.streakText);

        EventBus.on(Events.TYPING_WRONG_CHAR, this.onWrongChar, this);
        EventBus.on(Events.TYPING_WORD_COMPLETE, this.onWordComplete, this);
        this.scene.events.on('shutdown', this.cleanup, this);
    }

    private onWrongChar() {
        this.wrongFlash = 200;
    }

    private onWordComplete() {
        this.typedText.setText('');
        this.remainingText.setText('');
    }

    update(target: Enemy | null, typedCount: number) {
        if (target && target.active && target.word) {
            const typed = target.word.substring(0, typedCount);
            const remaining = target.word.substring(typedCount);

            this.typedText.setText(typed);
            this.remainingText.setText(remaining);

            this.remainingText.setX(this.typedText.x + this.typedText.width);

            const diffColor = this.getDifficultyColor(target.wordDifficulty);
            this.difficultyDot.setFillStyle(diffColor);

            this.targetWordText.setText('');
        } else {
            this.typedText.setText('');
            this.remainingText.setText('Type to attack!');
            this.targetWordText.setText('');
            this.difficultyDot.setFillStyle(0x888888);
        }

        if (this.wrongFlash > 0) {
            this.wrongFlash -= this.scene.game.loop.delta;
            this.bgBar.setFillStyle(0x440000, 0.85);
        } else {
            this.bgBar.setFillStyle(PALETTE.UI_BG, 0.85);
        }

        const streak = gameState.typingStreak;
        if (streak > 0) {
            this.streakText.setText(`Streak: ${streak}`);
            if (streak >= 10) {
                this.streakText.setColor('#ff4444');
            } else if (streak >= 5) {
                this.streakText.setColor('#ffff44');
            } else {
                this.streakText.setColor('#ff8844');
            }
        } else {
            this.streakText.setText('');
        }

        const wpm = gameState.typingWPM;
        const acc = gameState.typingAccuracy;
        this.statsText.setText(`WPM:${wpm}  Acc:${acc}%`);
    }

    private getDifficultyColor(difficulty: number): number {
        switch (difficulty) {
            case 1: return 0x44ff44;
            case 2: return 0xffff44;
            case 3: return 0xff8844;
            case 4: return 0xff4444;
            default: return 0x44ff44;
        }
    }

    cleanup() {
        EventBus.off(Events.TYPING_WRONG_CHAR, this.onWrongChar, this);
        EventBus.off(Events.TYPING_WORD_COMPLETE, this.onWordComplete, this);
    }
}
