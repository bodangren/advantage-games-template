export const GAME = {
    WIDTH: 800,
    HEIGHT: 600,
    BACKGROUND_COLOR: '#0a0a1a',
    WORLD_SIZE: 3000,
};

export const PLAYER = {
    SPEED: 160,
    MAX_HEALTH: 100,
    BODY_RADIUS: 14,
    INVULNERABLE_MS: 500,
    XP_MAGNET_RANGE: 80,
};

export const ENEMY = {
    BASE_SPEED: 25,
    BASE_HEALTH: 10,
    BASE_DAMAGE: 5,
    POOL_SIZE: 200,
    SPAWN_DISTANCE_MIN: 300,
    SPAWN_DISTANCE_MAX: 450,
    BODY_RADIUS: 10,
    XP_DROP_CHANCE: 0.8,
    SPEED_MIN_MULT: 0.3,
    SPEED_MAX_MULT: 1.5,
    SPEED_WPM_DIVISOR: 40,
};

export const WEAPON = {
    MAGIC_ORB: {
        DAMAGE: 15,
        SPEED: 250,
        FIRE_RATE: 800,
        RANGE: 250,
        COUNT: 1,
        PIERCE: 1,
        SIZE: 6,
    },
    LIGHTNING: {
        DAMAGE: 25,
        SPEED: 0,
        FIRE_RATE: 1500,
        RANGE: 180,
        COUNT: 1,
        PIERCE: 999,
        SIZE: 4,
        CHAIN_COUNT: 3,
    },
    FIRE_AURA: {
        DAMAGE: 8,
        SPEED: 0,
        FIRE_RATE: 500,
        RANGE: 60,
        COUNT: 1,
        PIERCE: 999,
        SIZE: 0,
    },
    KNIFE: {
        DAMAGE: 20,
        SPEED: 350,
        FIRE_RATE: 600,
        RANGE: 300,
        COUNT: 1,
        PIERCE: 1,
        SIZE: 5,
    },
};

export const XP = {
    BASE_VALUE: 1,
    MAGNET_SPEED: 200,
    MAGNET_RANGE: 80,
    COLLECT_RANGE: 20,
    SIZE: 6,
    LEVEL_REQUIREMENTS: [0, 10, 25, 50, 85, 130, 190, 260, 340, 440, 560, 700, 860, 1050, 1270],
};

export const SPAWN = {
    BASE_RATE: 3500,
    MIN_RATE: 800,
    RATE_DECREASE_PER_MIN: 50,
    WAVE_INTERVAL: 60000,
    ELITE_CHANCE_BASE: 0.05,
    ELITE_CHANCE_PER_MIN: 0.02,
    MAX_ACTIVE_ENEMIES: 15,
    MAX_SPAWN_PER_INTERVAL: 3,
};

export const PALETTE = {
    BG_DARK: 0x0a0a1a,
    BG_MID: 0x111133,
    PLAYER: 0x44aaff,
    PLAYER_GLOW: 0x2266cc,
    ENEMY_NORMAL: 0xff6699,
    ENEMY_FAST: 0x00ff99,
    ENEMY_TANK: 0x0066ff,
    ENEMY_ELITE: 0x9900ff,
    XP_GEM: 0x44ff44,
    XP_GEM_HIGH: 0xffff44,
    WEAPON_ORB: 0x44ccff,
    WEAPON_LIGHTNING: 0xffff44,
    WEAPON_FIRE: 0xff6622,
    WEAPON_KNIFE: 0xcccccc,
    UI_TEXT: '#ffffff',
    UI_ACCENT: '#44aaff',
    UI_HEALTH: '#ff4444',
    UI_XP: '#44ff44',
    UI_BG: 0x111122,
    DAMAGE_FLASH: 0xff0000,
    LEVEL_UP_GLOW: 0xffff00,
};

export const UI = {
    FONT_SIZE_SM: '14px',
    FONT_SIZE_MD: '20px',
    FONT_SIZE_LG: '32px',
    FONT_SIZE_XL: '48px',
    FONT_FAMILY: 'Arial, sans-serif',
    PADDING: 16,
};

export const TYPING = {
    WORD_FONT_SIZE: '14px',
    WORD_FONT_FAMILY: 'Courier New, monospace',
    INPUT_FONT_SIZE: '20px',
    TARGET_LINE_COLOR: 0x44ffff,
    TARGET_LINE_ALPHA: 0.3,
    TYPING_BASE_DAMAGE: 30,
    TYPING_DAMAGE_PER_CHAR: 5,
    STREAK_BONUS_MULT: 0.5,
    MAX_STREAK_BONUS: 5,
    AUTO_RETARGET_INTERVAL: 500,
    ADAPTIVE_WPM_EASY: 20,
    ADAPTIVE_WPM_MEDIUM: 40,
    ADAPTIVE_WPM_HARD: 60,
    ADAPTIVE_ACCURACY_LOW: 70,
    ADAPTIVE_ACCURACY_MID: 75,
    ADAPTIVE_ACCURACY_HIGH: 80,
    ADAPTIVE_ACCURACY_EXPERT: 85,
    ADAPTIVE_WINDOW_SIZE: 10,
    ADAPTIVE_CHECK_INTERVAL: 5,
    STREAK_MILESTONE_1: 5,
    STREAK_MILESTONE_2: 10,
    STREAK_MILESTONE_3: 25,
    TARGET_SCORE_WORD_MULT: 100,
    TARGET_LINE_PULSE_SPEED: 0.008,
};
