import { WeaponState, gameState } from '../core/GameState';

export interface SkillDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    maxLevel: number;
    type: 'weapon' | 'passive';
    weaponType?: string;
    apply: (level: number, gs?: any) => void;
}

export const SKILLS: SkillDefinition[] = [
    {
        id: 'magic_orb',
        name: 'Magic Orb',
        description: 'Fires a magic orb at the nearest enemy',
        icon: '🔮',
        maxLevel: 8,
        type: 'weapon',
        weaponType: 'magic_orb',
        apply: () => {},
    },
    {
        id: 'lightning',
        name: 'Lightning Strike',
        description: 'Strikes nearest enemies with lightning',
        icon: '⚡',
        maxLevel: 8,
        type: 'weapon',
        weaponType: 'lightning',
        apply: () => {},
    },
    {
        id: 'fire_aura',
        name: 'Fire Aura',
        description: 'Burns enemies near you',
        icon: '🔥',
        maxLevel: 8,
        type: 'weapon',
        weaponType: 'fire_aura',
        apply: () => {},
    },
    {
        id: 'knife',
        name: 'Throwing Knife',
        description: 'Throws a knife at enemies',
        icon: '🗡️',
        maxLevel: 8,
        type: 'weapon',
        weaponType: 'knife',
        apply: () => {},
    },
    {
        id: 'max_health_up',
        name: 'Vitality',
        description: 'Increases max health by 20',
        icon: '❤️',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.maxHealth += 20; gs.health += 20; },
    },
    {
        id: 'speed_up',
        name: 'Swift Feet',
        description: 'Increases movement speed by 10%',
        icon: '👟',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.playerSpeed *= 1.1; },
    },
    {
        id: 'armor_up',
        name: 'Iron Skin',
        description: 'Reduces damage taken by 2',
        icon: '🛡️',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.armor += 2; },
    },
    {
        id: 'xp_up',
        name: 'Wisdom',
        description: 'Increases XP gain by 15%',
        icon: '📖',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.xpMultiplier += 0.15; },
    },
    {
        id: 'heal',
        name: 'Heal',
        description: 'Restores 30 HP immediately',
        icon: '💚',
        maxLevel: 3,
        type: 'passive',
        apply: (level, gs) => { gs.heal(30); },
    },
    {
        id: 'quick_fingers',
        name: 'Quick Fingers',
        description: 'Increases typing bonus damage by 25%',
        icon: '⌨️',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.typingDamageMultiplier += 0.25; },
    },
    {
        id: 'slow_field',
        name: 'Slow Field',
        description: 'Reduces enemy movement speed by 8%',
        icon: '🐌',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.playerSpeed *= 1.0; },
    },
    {
        id: 'word_shield',
        name: 'Word Shield',
        description: 'Heal 5 HP for each word typed correctly',
        icon: '🔰',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.armor += 1; },
    },
    {
        id: 'typing_mastery',
        name: 'Typing Mastery',
        description: 'Increases all weapon damage by 15%',
        icon: '🎯',
        maxLevel: 5,
        type: 'passive',
        apply: (level, gs) => { gs.xpMultiplier += 0.1; },
    },
];

export function getRandomSkills(count: number, currentWeapons: WeaponState[]): SkillDefinition[] {
    const available = SKILLS.filter(s => {
        if (s.type === 'weapon') {
            const existing = currentWeapons.find(w => w.type === s.weaponType);
            if (existing && existing.level >= s.maxLevel) return false;
        }
        return true;
    });

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
