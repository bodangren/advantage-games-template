import Phaser from 'phaser';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { GAME, PALETTE, UI, WEAPON } from '../core/Constants';
import { getRandomSkills, SkillDefinition } from '../systems/SkillSystem';

export class LevelUp extends Phaser.Scene {
    private skills: SkillDefinition[] = [];
    private buttons: Phaser.GameObjects.Container[] = [];

    constructor() { super('LevelUp'); }

    create(data: { level: number }) {
        this.skills = getRandomSkills(3, gameState.weapons);
        this.buttons = [];

        const overlay = this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.7);
        overlay.setDepth(200);

        const title = this.add.text(GAME.WIDTH / 2, 80, `LEVEL UP! Lv ${data.level}`, {
            fontSize: UI.FONT_SIZE_XL,
            color: '#ffff00',
            fontFamily: UI.FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(201);

        this.tweens.add({
            targets: title,
            scale: { from: 0.5, to: 1 },
            duration: 300,
            ease: 'Back.easeOut',
        });

        this.skills.forEach((skill, i) => {
            this.createSkillButton(skill, i);
        });
    }

    private createSkillButton(skill: SkillDefinition, index: number) {
        const y = 200 + index * 130;
        const cx = GAME.WIDTH / 2;

        const container = this.add.container(cx, y);
        container.setDepth(201);

        const bg = this.add.rectangle(0, 0, 350, 100, PALETTE.UI_BG, 0.9);
        bg.setStrokeStyle(2, 0x44aaff);
        container.add(bg);

        const icon = this.add.text(-140, -20, skill.icon, { fontSize: '32px' }).setOrigin(0.5);
        container.add(icon);

        const name = this.add.text(-100, -25, skill.name, {
            fontSize: UI.FONT_SIZE_MD,
            color: PALETTE.UI_ACCENT,
            fontFamily: UI.FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);
        container.add(name);

        const desc = this.add.text(-100, 5, skill.description, {
            fontSize: UI.FONT_SIZE_SM,
            color: '#cccccc',
            fontFamily: UI.FONT_FAMILY,
            wordWrap: { width: 250 },
        }).setOrigin(0, 0.5);
        container.add(desc);

        const currentLevel = this.getCurrentLevel(skill);
        const levelText = this.add.text(150, -20, `Lv ${currentLevel + 1}`, {
            fontSize: UI.FONT_SIZE_SM,
            color: '#ffff44',
            fontFamily: UI.FONT_FAMILY,
        }).setOrigin(0.5);
        container.add(levelText);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(0x223355));
        bg.on('pointerout', () => bg.setFillStyle(PALETTE.UI_BG));
        bg.on('pointerdown', () => this.selectSkill(skill));

        container.setScale(0.8);
        container.setAlpha(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 200,
            delay: index * 100,
            ease: 'Back.easeOut',
        });

        this.buttons.push(container);
    }

    private getCurrentLevel(skill: SkillDefinition): number {
        if (skill.type === 'weapon') {
            const existing = gameState.weapons.find(w => w.type === skill.weaponType);
            return existing ? existing.level : 0;
        }
        return 0;
    }

    private selectSkill(skill: SkillDefinition) {
        if (skill.type === 'weapon' && skill.weaponType) {
            const existing = gameState.weapons.find(w => w.type === skill.weaponType);
            if (existing) {
                existing.level++;
                existing.damage = Math.floor(existing.damage * 1.3);
                existing.fireRate = Math.max(200, existing.fireRate * 0.9);
                existing.count += existing.level % 2 === 0 ? 1 : 0;
                existing.pierce += existing.level % 3 === 0 ? 1 : 0;
                existing.range *= 1.1;
            } else {
                const config = WEAPON[skill.weaponType!.toUpperCase() as keyof typeof WEAPON];
                if (config) {
                    gameState.weapons.push({
                        type: skill.weaponType!,
                        level: 1,
                        damage: config.DAMAGE,
                        speed: config.SPEED,
                        fireRate: config.FIRE_RATE,
                        range: config.RANGE,
                        count: config.COUNT,
                        pierce: config.PIERCE,
                    });
                }
            }
        } else {
            skill.apply(gameState.level, gameState);
        }

        EventBus.emit(Events.SKILL_CHOSEN, { skill: skill.id });

        this.buttons.forEach(b => b.destroy());
        this.scene.resume('Game');
        this.scene.stop();
    }
}
