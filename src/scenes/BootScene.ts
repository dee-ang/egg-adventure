import Phaser from 'phaser';
import { generateAssets } from '../utils/assetGenerator';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SoundSystem } from '../systems/SoundSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Load saved progress
    ProgressSystem.load();
    SoundSystem.init();

    // Generate all textures procedurally
    generateAssets(this);

    // Show brief loading indicator then go to title
    const text = this.add.text(400, 250, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.time.delayedCall(300, () => {
      text.destroy();
      this.scene.start('TitleScene');
    });
  }
}
