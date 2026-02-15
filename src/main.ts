import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { AnimalSelectScene } from './scenes/AnimalSelectScene';
import { GameScene } from './scenes/GameScene';
import { HatchScene } from './scenes/HatchScene';
import { LevelEditorScene } from './scenes/LevelEditorScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: 'game-container',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  input: {
    activePointers: 4,
  },
  pixelArt: false,
  scene: [BootScene, TitleScene, AnimalSelectScene, LevelSelectScene, GameScene, HatchScene, LevelEditorScene],
};

new Phaser.Game(config);
