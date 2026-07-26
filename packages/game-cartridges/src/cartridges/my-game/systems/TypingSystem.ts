import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { TYPING } from '../core/Constants';
import { Enemy, EnemyGroup } from '../objects/Enemy';
import { Player } from '../objects/Player';

export class TypingSystem {
    private scene: Phaser.Scene;
    private enemies: EnemyGroup;
    private player: Player;
    currentTarget: Enemy | null = null;
    private typedCount = 0;
    private retargetTimer = 0;
    private targetLine: Phaser.GameObjects.Graphics;
    private wordStartTime = 0;
    private linePulse = 0;

    constructor(scene: Phaser.Scene, enemies: EnemyGroup, player: Player) {
        this.scene = scene;
        this.enemies = enemies;
        this.player = player;

        this.targetLine = scene.add.graphics();
        this.targetLine.setDepth(5);

        scene.input.keyboard!.on('keydown', this.onKeyDown, this);

        this.scene.events.on('shutdown', this.cleanup, this);
    }

    private onKeyDown(event: KeyboardEvent) {
        if (gameState.gameOver || gameState.paused) return;

        const key = event.key.toLowerCase();

        if (key.length !== 1 || key < 'a' || key > 'z') return;

        if (!this.currentTarget || !this.currentTarget.active) {
            this.autoTarget();
            if (!this.currentTarget) return;
        }

        const expectedChar = this.currentTarget!.word[this.typedCount];

        if (!expectedChar) return;

        if (key === expectedChar) {
            this.typedCount++;
            EventBus.emit(Events.TYPING_CORRECT_CHAR, {
                char: key,
                index: this.typedCount - 1,
                target: this.currentTarget,
            });

            this.currentTarget!.updateWordProgress(this.typedCount);
            this.player.setTypedText(this.currentTarget!.word.substring(0, this.typedCount));
            this.linePulse = 1;

            if (this.typedCount >= this.currentTarget!.word.length) {
                this.onWordComplete();
            }
        } else {
            EventBus.emit(Events.TYPING_WRONG_CHAR, {
                char: key,
                expected: expectedChar,
                target: this.currentTarget,
            });
            gameState.recordTypingResult(false, this.currentTarget!.word.length);
            this.flashTypedText();
        }

        EventBus.emit(Events.SPECTACLE_ACTION, { type: 'typing', key });
    }

    private flashTypedText() {
        this.player.clearTypedText();
        this.scene.time.delayedCall(150, () => {
            if (this.currentTarget && this.currentTarget.active && this.typedCount > 0) {
                this.player.setTypedText(this.currentTarget!.word.substring(0, this.typedCount));
            }
        });
    }

    private onWordComplete() {
        const target = this.currentTarget!;
        const word = target.word;
        const wordLength = word.length;

        gameState.recordTypingResult(true, wordLength);

        const damage = gameState.getTypingDamage();

        EventBus.emit(Events.TYPING_WORD_COMPLETE, {
            target,
            word,
            damage,
            streak: gameState.typingStreak,
            x: target.x,
            y: target.y,
        });

        if (gameState.typingStreak > 0 && gameState.typingStreak % TYPING.STREAK_MILESTONE_1 === 0) {
            EventBus.emit(Events.TYPING_STREAK, { streak: gameState.typingStreak });
            EventBus.emit(Events.SPECTACLE_STREAK, { streak: gameState.typingStreak });
        }

        this.typedCount = 0;
        this.currentTarget = null;
        this.player.clearTypedText();

        this.scene.time.delayedCall(100, () => {
            this.autoTarget();
        });
    }

    autoTarget(): void {
        if (this.currentTarget) {
            this.currentTarget.highlightAsTarget(false);
        }

        const best = this.findBestTarget();
        this.currentTarget = best;
        this.typedCount = 0;
        this.wordStartTime = Date.now();
        this.player.clearTypedText();

        if (best) {
            best.highlightAsTarget(true);
            gameState.recordTypingStart();
            EventBus.emit(Events.TYPING_TARGET_SWITCHED, { target: best });
        }
    }

    switchTarget(enemy: Enemy): void {
        if (!enemy.active) return;
        if (this.currentTarget === enemy) return;

        if (this.currentTarget) {
            this.currentTarget.highlightAsTarget(false);
        }

        this.currentTarget = enemy;
        this.typedCount = 0;
        this.wordStartTime = Date.now();
        this.player.clearTypedText();
        enemy.highlightAsTarget(true);
        gameState.recordTypingStart();
        EventBus.emit(Events.TYPING_TARGET_SWITCHED, { target: enemy });
    }

    private findBestTarget(): Enemy | null {
        const enemies = this.enemies.getActiveEnemies();
        if (enemies.length === 0) return null;

        let best: Enemy | null = null;
        let bestScore = Infinity;

        for (const enemy of enemies) {
            if (!enemy.word) continue;

            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                enemy.x, enemy.y
            );

            const wordLen = enemy.word.length;
            const score = wordLen * TYPING.TARGET_SCORE_WORD_MULT + dist;

            if (score < bestScore) {
                bestScore = score;
                best = enemy;
            }
        }

        return best;
    }

    update(time: number, delta: number) {
        if (gameState.gameOver || gameState.paused) return;

        this.retargetTimer += delta;
        if (this.retargetTimer >= TYPING.AUTO_RETARGET_INTERVAL) {
            this.retargetTimer = 0;
            if (!this.currentTarget || !this.currentTarget.active) {
                this.autoTarget();
            }
        }

        if (this.linePulse > 0) {
            this.linePulse = Math.max(0, this.linePulse - delta * 0.005);
        }

        this.drawTargetLine();
    }

    private drawTargetLine() {
        this.targetLine.clear();

        if (!this.currentTarget || !this.currentTarget.active) return;

        const px = this.player.x;
        const py = this.player.y;
        const ex = this.currentTarget.x;
        const ey = this.currentTarget.y;

        const progress = this.typedCount / Math.max(1, this.currentTarget.word.length);
        const baseAlpha = TYPING.TARGET_LINE_ALPHA + progress * 0.3;
        const pulseAlpha = this.linePulse * 0.4;
        const alpha = Math.min(1, baseAlpha + pulseAlpha);

        const lineColor = this.linePulse > 0.5 ? 0xffffff : TYPING.TARGET_LINE_COLOR;

        this.targetLine.lineStyle(2, lineColor, alpha);

        const segments = 8;
        this.targetLine.beginPath();
        this.targetLine.moveTo(px, py);

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const mx = px + (ex - px) * t;
            const my = py + (ey - py) * t;
            this.targetLine.lineTo(mx, my);
        }

        this.targetLine.lineTo(ex, ey);
        this.targetLine.strokePath();
    }

    getCurrentTarget(): Enemy | null {
        return this.currentTarget;
    }

    getTypedCount(): number {
        return this.typedCount;
    }

    cleanup() {
        if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this.onKeyDown, this);
        }
    }
}
