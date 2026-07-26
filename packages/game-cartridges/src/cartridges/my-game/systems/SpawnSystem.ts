import Phaser from 'phaser';
import { gameState } from '../core/GameState';
import { SPAWN, GAME, ENEMY } from '../core/Constants';
import { EnemyGroup, EnemyType } from '../objects/Enemy';
import { AdaptiveDifficulty } from './AdaptiveDifficulty';

export class SpawnSystem {
    private scene: Phaser.Scene;
    private enemies: EnemyGroup;
    private spawnTimer = 0;
    private waveTimer = 0;
    private waveNumber = 0;
    private adaptiveDifficulty: AdaptiveDifficulty;
    private spawnSector = 0;

    constructor(scene: Phaser.Scene, enemies: EnemyGroup) {
        this.scene = scene;
        this.enemies = enemies;
        this.adaptiveDifficulty = new AdaptiveDifficulty();
    }

    update(time: number, delta: number) {
        this.spawnTimer += delta;
        this.waveTimer += delta;

        const elapsed = gameState.elapsedTime;
        const minutes = elapsed / 60000;

        const spawnRate = Math.max(SPAWN.MIN_RATE, SPAWN.BASE_RATE - minutes * SPAWN.RATE_DECREASE_PER_MIN);

        if (this.spawnTimer >= spawnRate) {
            this.spawnTimer = 0;
            const activeCount = this.enemies.getActiveEnemies().length;
            if (activeCount < SPAWN.MAX_ACTIVE_ENEMIES) {
                const count = Math.min(1 + Math.floor(minutes * 0.3), SPAWN.MAX_SPAWN_PER_INTERVAL);
                const availableSlots = SPAWN.MAX_ACTIVE_ENEMIES - activeCount;
                const spawnCount = Math.min(count, availableSlots);
                for (let i = 0; i < spawnCount; i++) {
                    this.spawnEnemy();
                }
            }
        }

        if (this.waveTimer >= SPAWN.WAVE_INTERVAL) {
            this.waveTimer = 0;
            this.waveNumber++;
            this.spawnWave();
        }
    }

    getAdaptiveDifficulty(): AdaptiveDifficulty {
        return this.adaptiveDifficulty;
    }

    private spawnEnemy() {
        const activeCount = this.enemies.getActiveEnemies().length;
        if (activeCount >= SPAWN.MAX_ACTIVE_ENEMIES) return;

        const pos = this.getSpawnPosition();
        const type = this.getEnemyType();
        const enemy = this.enemies.spawn(pos.x, pos.y, type);
        if (enemy) {
            const { word, difficulty } = this.adaptiveDifficulty.getNextWord();
            enemy.setWord(word, difficulty);
        }
    }

    private spawnWave() {
        const activeCount = this.enemies.getActiveEnemies().length;
        const availableSlots = SPAWN.MAX_ACTIVE_ENEMIES - activeCount;
        const waveCount = Math.min(3 + this.waveNumber, availableSlots);

        if (waveCount <= 0) return;

        const sectorSize = Math.PI * 0.6;
        const sectorStart = this.spawnSector;
        this.spawnSector = (this.spawnSector + Math.PI * 0.8) % (Math.PI * 2);

        for (let i = 0; i < waveCount; i++) {
            const angle = sectorStart + (i / Math.max(1, waveCount - 1)) * sectorSize;
            const dist = ENEMY.SPAWN_DISTANCE_MIN + 30;
            const x = this.scene.cameras.main.scrollX + GAME.WIDTH / 2 + Math.cos(angle) * dist;
            const y = this.scene.cameras.main.scrollY + GAME.HEIGHT / 2 + Math.sin(angle) * dist;
            const type: EnemyType = i % 4 === 0 ? 'tank' : 'normal';
            const enemy = this.enemies.spawn(x, y, type);
            if (enemy) {
                const { word, difficulty } = this.adaptiveDifficulty.getNextWord();
                enemy.setWord(word, difficulty);
            }
        }
    }

    private getSpawnPosition(): { x: number; y: number } {
        const cam = this.scene.cameras.main;
        const cx = cam.scrollX + GAME.WIDTH / 2;
        const cy = cam.scrollY + GAME.HEIGHT / 2;

        const sectorSize = Math.PI * 0.5;
        const sectorStart = Math.random() * Math.PI * 2;
        const angle = sectorStart + Math.random() * sectorSize;
        const dist = Phaser.Math.Between(ENEMY.SPAWN_DISTANCE_MIN, ENEMY.SPAWN_DISTANCE_MAX);

        return {
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
        };
    }

    private getEnemyType(): EnemyType {
        const minutes = gameState.elapsedTime / 60000;
        const rand = Math.random();
        const eliteChance = SPAWN.ELITE_CHANCE_BASE + minutes * SPAWN.ELITE_CHANCE_PER_MIN;
        if (rand < eliteChance) return 'elite';
        if (rand < eliteChance + 0.15) return 'tank';
        if (rand < eliteChance + 0.35) return 'fast';
        return 'normal';
    }
}
