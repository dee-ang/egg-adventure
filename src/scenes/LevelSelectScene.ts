import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { ProgressSystem, LevelProgress } from '../systems/ProgressSystem';
import { SoundSystem } from '../systems/SoundSystem';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${min}:${sec.toString().padStart(2, '0')}.${tenths}`;
}

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    // Background
    this.add.rectangle(400, 250, 800, 500, 0x1a1a2e);

    // Stars
    for (let i = 0; i < 30; i++) {
      const star = this.add.rectangle(
        Math.random() * 800, Math.random() * 500,
        2, 2, 0xffffff, 0.2 + Math.random() * 0.5,
      );
      this.tweens.add({
        targets: star, alpha: 0.1,
        duration: 1500 + Math.random() * 2000,
        yoyo: true, repeat: -1,
      });
    }

    // Title
    this.add.text(400, 45, 'Select Level', {
      fontSize: '32px', color: '#FFD54F', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#FF8F00', strokeThickness: 3,
    }).setOrigin(0.5);

    // Back button
    const backBg = this.add.rectangle(60, 45, 90, 34, 0x546e7a, 0.8)
      .setStrokeStyle(2, 0x78909c)
      .setInteractive({ useHandCursor: true });
    this.add.text(60, 45, 'Back', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    backBg.on('pointerover', () => backBg.setFillStyle(0x78909c));
    backBg.on('pointerout', () => backBg.setFillStyle(0x546e7a));
    backBg.on('pointerdown', () => {
      SoundSystem.play('buttonClick');
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('AnimalSelectScene');
      });
    });

    // Level cards
    const cardX = [140, 400, 660];
    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const progress = ProgressSystem.getLevelProgress(level.id);
      const unlocked = ProgressSystem.isLevelUnlocked(level.id);
      this.createLevelCard(cardX[i], 270, level, progress, unlocked);
    }

    this.cameras.main.fadeIn(400);
  }

  private createLevelCard(
    x: number, y: number,
    level: typeof LEVELS[number],
    progress: LevelProgress | null,
    unlocked: boolean,
  ): void {
    const cardW = 200;
    const cardH = 300;

    // Card background
    const borderColor = unlocked ? 0x4fc3f7 : 0x37474f;
    const card = this.add.rectangle(x, y, cardW, cardH, 0x263238)
      .setStrokeStyle(3, borderColor);

    // Level number badge
    const badgeColor = unlocked ? 0x4fc3f7 : 0x546e7a;
    this.add.circle(x - cardW / 2 + 24, y - cardH / 2 + 24, 18, badgeColor);
    this.add.text(x - cardW / 2 + 24, y - cardH / 2 + 24, `${level.id}`, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Theme preview (colored rectangle with icon)
    const themeColors: Record<string, number> = {
      rooftop: 0x81c784,
      park: 0x4fc3f7,
      underground: 0x795548,
    };
    const themeIcons: Record<string, string> = {
      rooftop: 'City',
      park: 'Park',
      underground: 'Cave',
    };
    const previewColor = unlocked ? themeColors[level.theme] : 0x37474f;
    this.add.rectangle(x, y - 50, cardW - 24, 90, previewColor, 0.6);
    this.add.text(x, y - 50, themeIcons[level.theme], {
      fontSize: '20px', color: unlocked ? '#ffffff' : '#546e7a',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.7);

    // Level name
    this.add.text(x, y + 20, level.name, {
      fontSize: '16px', color: unlocked ? '#ffffff' : '#546e7a',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Medal display
    if (progress?.medal) {
      const medalColors: Record<string, number> = {
        gold: 0xffd700, silver: 0xc0c0c0, bronze: 0xcd7f32,
      };
      const medalNames: Record<string, string> = {
        gold: 'Gold', silver: 'Silver', bronze: 'Bronze',
      };
      const mc = medalColors[progress.medal];

      // Draw a star shape using graphics
      const gfx = this.add.graphics();
      this.drawStar(gfx, x, y + 55, 5, 10, 20, mc);

      this.add.text(x, y + 80, `${medalNames[progress.medal]} Medal`, {
        fontSize: '13px', color: `#${mc.toString(16).padStart(6, '0')}`,
        fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
    } else if (progress?.completed) {
      this.add.text(x, y + 65, 'Completed', {
        fontSize: '13px', color: '#81c784', fontFamily: 'Arial',
      }).setOrigin(0.5);
    } else if (unlocked) {
      this.add.text(x, y + 65, 'Not Completed', {
        fontSize: '13px', color: '#78909c', fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // Best time
    if (progress?.bestTime) {
      this.add.text(x, y + 100, `Best: ${formatTime(progress.bestTime)}`, {
        fontSize: '13px', color: '#B0BEC5', fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // Medal thresholds hint
    if (unlocked) {
      const { gold, silver } = level.medalThresholds;
      this.add.text(x, y + 120, `Gold < ${gold}s | Silver < ${silver}s`, {
        fontSize: '10px', color: '#546e7a', fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // Lock overlay
    if (!unlocked) {
      this.add.rectangle(x, y, cardW, cardH, 0x000000, 0.6);
      // Draw lock icon with graphics
      const lockGfx = this.add.graphics();
      lockGfx.fillStyle(0x78909c);
      lockGfx.fillRoundedRect(x - 15, y - 5, 30, 24, 4);
      lockGfx.lineStyle(3, 0x78909c);
      lockGfx.beginPath();
      lockGfx.arc(x, y - 10, 12, Math.PI, 0, false);
      lockGfx.strokePath();
      this.add.text(x, y + 35, 'Complete previous\nlevel to unlock', {
        fontSize: '11px', color: '#78909c', fontFamily: 'Arial', align: 'center',
      }).setOrigin(0.5);
      return;
    }

    // Interactive (only if unlocked)
    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => card.setStrokeStyle(3, 0x81d4fa));
    card.on('pointerout', () => card.setStrokeStyle(3, 0x4fc3f7));
    card.on('pointerdown', () => {
      SoundSystem.play('buttonClick');
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { levelId: level.id });
      });
    });
  }

  private drawStar(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, points: number, innerR: number, outerR: number, color: number): void {
    gfx.fillStyle(color);
    gfx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.fillPath();
  }
}
