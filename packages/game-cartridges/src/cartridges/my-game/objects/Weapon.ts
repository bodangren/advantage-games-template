import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState, WeaponState } from '../core/GameState';
import { WEAPON, PALETTE } from '../core/Constants';
import { EnemyGroup, Enemy } from './Enemy';

class Projectile extends Phaser.GameObjects.Arc {
    declare body: Phaser.Physics.Arcade.Body;
    damage = 0;
    pierce = 1;
    hitCount = 0;
    lifetime = 2000;
    private age = 0;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, WEAPON.MAGIC_ORB.SIZE, PALETTE.WEAPON_ORB, 1);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCircle(WEAPON.MAGIC_ORB.SIZE);
        this.setActive(false);
        this.setVisible(false);
        this.setDepth(7);
    }

    fire(x: number, y: number, vx: number, vy: number, damage: number, pierce: number, size: number, color: number, lifetime: number) {
        this.setPosition(x, y);
        this.setFillStyle(color);
        this.setRadius(size);
        this.body.setCircle(size);
        this.body.setVelocity(vx, vy);
        this.damage = damage;
        this.pierce = pierce;
        this.hitCount = 0;
        this.lifetime = lifetime;
        this.age = 0;
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.setAlpha(1);
    }

    preUpdate(time: number, delta: number) {
        this.age += delta;
        if (this.age >= this.lifetime) {
            this.deactivate();
        }
    }

    onHit() {
        this.hitCount++;
        if (this.hitCount >= this.pierce) {
            this.deactivate();
        }
    }

    deactivate() {
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
    }
}

export class WeaponSystem {
    private scene: Phaser.Scene;
    projectiles!: Phaser.Physics.Arcade.Group;
    private enemies!: EnemyGroup;
    private playerRef: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, enemies: EnemyGroup, player: Phaser.GameObjects.Container) {
        this.scene = scene;
        this.enemies = enemies;
        this.playerRef = player;

        this.projectiles = scene.physics.add.group({
            classType: Projectile,
            maxSize: 100,
            runChildUpdate: true,
        });

        this.initWeapons();
    }

    private initWeapons() {
        if (gameState.weapons.length === 0) {
            const cfg = WEAPON.MAGIC_ORB;
            gameState.weapons.push({
                type: 'magic_orb',
                level: 1,
                damage: cfg.DAMAGE,
                speed: cfg.SPEED,
                fireRate: cfg.FIRE_RATE,
                range: cfg.RANGE,
                count: cfg.COUNT,
                pierce: cfg.PIERCE,
            });
        }
    }

    addWeapon(type: string) {
        const existing = gameState.weapons.find(w => w.type === type);
        if (existing) {
            this.upgradeWeapon(existing);
            return;
        }
        const config = WEAPON[type.toUpperCase() as keyof typeof WEAPON];
        if (!config) return;
        gameState.weapons.push({
            type,
            level: 1,
            damage: config.DAMAGE,
            speed: config.SPEED,
            fireRate: config.FIRE_RATE,
            range: config.RANGE,
            count: config.COUNT,
            pierce: config.PIERCE,
        });
        EventBus.emit(Events.WEAPON_UPGRADED, { type, level: 1 });
    }

    private upgradeWeapon(weapon: WeaponState) {
        weapon.level++;
        weapon.damage = Math.floor(weapon.damage * 1.3);
        weapon.fireRate = Math.max(200, weapon.fireRate * 0.9);
        weapon.count += weapon.level % 2 === 0 ? 1 : 0;
        weapon.pierce += weapon.level % 3 === 0 ? 1 : 0;
        weapon.range *= 1.1;
        EventBus.emit(Events.WEAPON_UPGRADED, { type: weapon.type, level: weapon.level });
    }

    fireAll(target: Enemy) {
        const px = this.playerRef.x;
        const py = this.playerRef.y;

        for (const weapon of gameState.weapons) {
            this.fireWeaponAtTarget(weapon, px, py, target);
        }
    }

    private fireWeaponAtTarget(weapon: WeaponState, px: number, py: number, target: Enemy) {
        if (weapon.type === 'magic_orb') {
            this.fireOrbAtTarget(weapon, px, py, target);
        } else if (weapon.type === 'lightning') {
            this.fireLightningAtTarget(weapon, px, py, target);
        } else if (weapon.type === 'fire_aura') {
            this.fireAura(weapon, px, py);
        } else if (weapon.type === 'knife') {
            this.fireKnifeAtTarget(weapon, px, py, target);
        }
    }

    private fireOrbAtTarget(weapon: WeaponState, px: number, py: number, target: Enemy) {
        for (let i = 0; i < weapon.count; i++) {
            let angle = Phaser.Math.Angle.Between(px, py, target.x, target.y);
            const spread = (i - (weapon.count - 1) / 2) * 0.2;
            angle += spread;
            const vx = Math.cos(angle) * weapon.speed;
            const vy = Math.sin(angle) * weapon.speed;
            const proj = this.projectiles.get() as Projectile | null;
            if (proj) {
                proj.fire(px, py, vx, vy, weapon.damage, weapon.pierce, 6, PALETTE.WEAPON_ORB, 2000);
            }
        }
        EventBus.emit(Events.WEAPON_FIRED, { type: weapon.type });
    }

    private fireLightningAtTarget(weapon: WeaponState, px: number, py: number, target: Enemy) {
        this.drawLightning(px, py, target.x, target.y);
        target.takeDamage(weapon.damage);

        const enemies = this.enemies.getActiveEnemies();
        const chainCount = Math.min(weapon.count, enemies.length - 1);
        let lastX = target.x;
        let lastY = target.y;

        for (let i = 0; i < chainCount; i++) {
            const nearest = this.findNearest(lastX, lastY, weapon.range, enemies.filter(e => e !== target));
            if (nearest) {
                this.drawLightning(lastX, lastY, nearest.x, nearest.y);
                nearest.takeDamage(weapon.damage * 0.7);
                lastX = nearest.x;
                lastY = nearest.y;
            }
        }
    }

    private fireAura(weapon: WeaponState, px: number, py: number) {
        const enemies = this.enemies.getActiveEnemies();
        const range = weapon.range;
        for (const enemy of enemies) {
            const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
            if (dist <= range) {
                enemy.takeDamage(weapon.damage);
                
                // Add fire glow effect for level 2+
                if (weapon.level >= 2) {
                    enemy.addFireGlow();
                }
                
                // Spawn fire particles
                enemy.spawnFireParticles();
            }
        }
        const aura = this.scene.add.circle(px, py, range, PALETTE.WEAPON_FIRE, 0.15);
        aura.setDepth(3);
        this.scene.tweens.add({
            targets: aura,
            alpha: 0,
            scale: 1.3,
            duration: 300,
            onComplete: () => aura.destroy(),
        });
    }

    private fireKnifeAtTarget(weapon: WeaponState, px: number, py: number, target: Enemy) {
        for (let i = 0; i < weapon.count; i++) {
            let angle = Phaser.Math.Angle.Between(px, py, target.x, target.y);
            const spread = (i - (weapon.count - 1) / 2) * 0.15;
            angle += spread;
            const vx = Math.cos(angle) * weapon.speed;
            const vy = Math.sin(angle) * weapon.speed;
            const proj = this.projectiles.get() as Projectile | null;
            if (proj) {
                proj.fire(px, py, vx, vy, weapon.damage, weapon.pierce, 5, PALETTE.WEAPON_KNIFE, 1500);
            }
        }
    }

    private drawLightning(x1: number, y1: number, x2: number, y2: number) {
        const g = this.scene.add.graphics();
        g.setDepth(15);
        g.lineStyle(3, PALETTE.WEAPON_LIGHTNING, 1);
        g.beginPath();
        g.moveTo(x1, y1);
        const segments = 5;
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const mx = x1 + (x2 - x1) * t + Phaser.Math.Between(-15, 15);
            const my = y1 + (y2 - y1) * t + Phaser.Math.Between(-15, 15);
            g.lineTo(mx, my);
        }
        g.lineTo(x2, y2);
        g.strokePath();

        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 200,
            onComplete: () => g.destroy(),
        });
    }

    private findNearest(px: number, py: number, range: number, enemies: Enemy[]): Enemy | null {
        let nearest: Enemy | null = null;
        let minDist = range;
        for (const e of enemies) {
            const d = Phaser.Math.Distance.Between(px, py, e.x, e.y);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        }
        return nearest;
    }
}
