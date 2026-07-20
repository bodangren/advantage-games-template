import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
    PLAYER_DAMAGED: 'player:damaged',
    PLAYER_DIED: 'player:died',
    PLAYER_HEALED: 'player:healed',
    PLAYER_LEVEL_UP: 'player:levelup',

    ENEMY_KILLED: 'enemy:killed',
    ENEMY_SPAWNED: 'enemy:spawned',

    WEAPON_FIRED: 'weapon:fired',
    WEAPON_UPGRADED: 'weapon:upgraded',

    XP_COLLECTED: 'xp:collected',
    XP_MAGNET: 'xp:magnet',

    SKILL_CHOSEN: 'skill:chosen',

    GAME_OVER: 'game:over',
    GAME_RESTART: 'game:restart',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',

    TYPING_STARTED: 'typing:started',
    TYPING_CORRECT_CHAR: 'typing:correct',
    TYPING_WRONG_CHAR: 'typing:wrong',
    TYPING_WORD_COMPLETE: 'typing:complete',
    TYPING_TARGET_SWITCHED: 'typing:target',
    TYPING_STREAK: 'typing:streak',

    DIAMOND_COLLECTED: 'diamond:collected',

    SPECTACLE_ENTRANCE: 'spectacle:entrance',
    SPECTACLE_ACTION: 'spectacle:action',
    SPECTACLE_HIT: 'spectacle:hit',
    SPECTACLE_COMBO: 'spectacle:combo',
    SPECTACLE_STREAK: 'spectacle:streak',
} as const;
