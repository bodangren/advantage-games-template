import { PLAYER, XP } from './Constants';

export interface WeaponState {
    type: string;
    level: number;
    damage: number;
    speed: number;
    fireRate: number;
    range: number;
    count: number;
    pierce: number;
}

class GameState {
    score = 0;
    bestScore = 0;
    health = PLAYER.MAX_HEALTH;
    maxHealth = PLAYER.MAX_HEALTH;
    xp = 0;
    level = 1;
    xpToNext = XP.LEVEL_REQUIREMENTS[1] || 10;
    killCount = 0;
    combo = 0;
    comboTimer = 0;
    elapsedTime = 0;
    started = false;
    paused = false;
    gameOver = false;
    weapons: WeaponState[] = [];
    playerSpeed = PLAYER.SPEED;
    armor = 0;
    xpMultiplier = 1;
    luck = 0;
    killsForItem = 0;

    wordsTyped = 0;
    typingAccuracy = 100;
    typingWPM = 0;
    typingStreak = 0;
    typingBestStreak = 0;
    currentTypingDifficulty = 1;
    typingDamageMultiplier = 1;

    private typingResults: { correct: boolean; timestamp: number; wordLength: number }[] = [];
    private typingStartTime = 0;

    reset() {
        this.score = 0;
        this.health = PLAYER.MAX_HEALTH;
        this.maxHealth = PLAYER.MAX_HEALTH;
        this.xp = 0;
        this.level = 1;
        this.xpToNext = XP.LEVEL_REQUIREMENTS[1] || 10;
        this.killCount = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.elapsedTime = 0;
        this.started = false;
        this.paused = false;
        this.gameOver = false;
        this.weapons = [];
        this.playerSpeed = PLAYER.SPEED;
        this.armor = 0;
        this.xpMultiplier = 1;
        this.luck = 0;
        this.killsForItem = 0;

        this.wordsTyped = 0;
        this.typingAccuracy = 100;
        this.typingWPM = 0;
        this.typingStreak = 0;
        this.typingBestStreak = 0;
        this.currentTypingDifficulty = 1;
        this.typingDamageMultiplier = 1;
        this.typingResults = [];
        this.typingStartTime = 0;
    }

    addXp(amount: number): boolean {
        this.xp += Math.floor(amount * this.xpMultiplier);
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            const idx = Math.min(this.level, XP.LEVEL_REQUIREMENTS.length - 1);
            this.xpToNext = XP.LEVEL_REQUIREMENTS[idx] || Math.floor(this.xpToNext * 1.5);
            return true;
        }
        return false;
    }

    takeDamage(amount: number): number {
        const actual = Math.max(1, amount - this.armor);
        this.health = Math.max(0, this.health - actual);
        return actual;
    }

    heal(amount: number) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    recordTypingStart(): void {
        this.typingStartTime = Date.now();
    }

    recordTypingResult(correct: boolean, wordLength: number): void {
        const now = Date.now();
        this.typingResults.push({ correct, timestamp: now, wordLength });

        if (this.typingResults.length > 20) {
            this.typingResults.shift();
        }

        if (correct) {
            this.wordsTyped++;
            this.typingStreak++;
            this.typingBestStreak = Math.max(this.typingBestStreak, this.typingStreak);
        } else {
            this.typingStreak = 0;
        }

        this.updateTypingStats();
    }

    private updateTypingStats(): void {
        if (this.typingResults.length === 0) return;

        const correctCount = this.typingResults.filter(r => r.correct).length;
        this.typingAccuracy = Math.round((correctCount / this.typingResults.length) * 100);

        const recentResults = this.typingResults.slice(-10);
        if (recentResults.length >= 2) {
            const timeSpan = recentResults[recentResults.length - 1].timestamp - recentResults[0].timestamp;
            const wordsCompleted = recentResults.filter(r => r.correct).length;
            if (timeSpan > 0) {
                this.typingWPM = Math.round((wordsCompleted / (timeSpan / 1000)) * 60);
            }
        }
    }

    getTypingDamage(): number {
        const TYPING = { BASE_DAMAGE: 30, DAMAGE_PER_CHAR: 5, STREAK_BONUS_MULT: 0.5, MAX_STREAK_BONUS: 5 };
        const baseDmg = TYPING.BASE_DAMAGE;
        const streakMult = 1 + Math.min(this.typingStreak * TYPING.STREAK_BONUS_MULT, TYPING.MAX_STREAK_BONUS);
        return Math.floor(baseDmg * streakMult * this.typingDamageMultiplier);
    }
}

export const gameState = new GameState();
