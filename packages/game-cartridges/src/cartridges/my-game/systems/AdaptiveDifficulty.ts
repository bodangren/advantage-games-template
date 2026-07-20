import { gameState } from '../core/GameState';
import { TYPING } from '../core/Constants';
import { getRandomWord } from '../data/Vocabulary';

export class AdaptiveDifficulty {
    private windowSize: number;
    private checkInterval: number;
    private wordsSinceCheck = 0;

    constructor() {
        this.windowSize = TYPING.ADAPTIVE_WINDOW_SIZE;
        this.checkInterval = TYPING.ADAPTIVE_CHECK_INTERVAL;
    }

    getNextWord(): { word: string; difficulty: number } {
        const difficulty = gameState.currentTypingDifficulty;
        const word = getRandomWord(difficulty, gameState.level);
        return { word, difficulty };
    }

    checkAndAdjust(): void {
        this.wordsSinceCheck++;
        if (this.wordsSinceCheck < this.checkInterval) return;
        this.wordsSinceCheck = 0;

        const wpm = gameState.typingWPM;
        const accuracy = gameState.typingAccuracy;
        let newDifficulty = gameState.currentTypingDifficulty;

        if (wpm >= TYPING.ADAPTIVE_WPM_HARD && accuracy >= TYPING.ADAPTIVE_ACCURACY_EXPERT) {
            newDifficulty = 4;
        } else if (wpm >= TYPING.ADAPTIVE_WPM_MEDIUM && accuracy >= TYPING.ADAPTIVE_ACCURACY_HIGH) {
            newDifficulty = 3;
        } else if (wpm >= TYPING.ADAPTIVE_WPM_EASY && accuracy >= TYPING.ADAPTIVE_ACCURACY_MID) {
            newDifficulty = 2;
        } else {
            newDifficulty = 1;
        }

        if (accuracy < 60 && newDifficulty > 1) {
            newDifficulty = Math.max(1, newDifficulty - 1);
        }

        const currentDiff = gameState.currentTypingDifficulty;
        if (newDifficulty > currentDiff) {
            newDifficulty = currentDiff + 1;
        }

        gameState.currentTypingDifficulty = newDifficulty;
    }

    reset(): void {
        this.wordsSinceCheck = 0;
        gameState.currentTypingDifficulty = 1;
    }
}
