import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Title } from './scenes/Title';
import { HowToPlay } from './scenes/HowToPlay';
import { Game } from './scenes/Game';
import { LevelUp } from './scenes/LevelUp';
import { GameOver } from './scenes/GameOver';

// ส่งออกอาเรย์ฉากเพียงอย่างเดียว ไม่มีการเรียกใช้ gameConfig อีกต่อไป
export const gameScenes = [Boot, Preloader, Title, HowToPlay, Game, LevelUp, GameOver];
