import Phaser from 'phaser';
import { ANIMALS } from '../data/animals';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SoundSystem } from '../systems/SoundSystem';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${min}:${sec.toString().padStart(2, '0')}.${tenths}`;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    // Background
    this.add.image(400, 250, 'bg_sky');

    // Title text with shadow
    this.add.text(402, 82, "Deedee's Egg Adventures", {
      fontSize: '40px',
      color: '#5D4037',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 80, "Deedee's Egg Adventures", {
      fontSize: '40px',
      color: '#FFD54F',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#FF8F00',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(400, 125, 'Collect eggs, hatch animals!', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Animated eggs on title screen
    const eggTypes = ['egg_white', 'egg_golden', 'egg_pink', 'egg_blue', 'egg_rainbow'];
    for (let i = 0; i < 5; i++) {
      const egg = this.add.image(120 + i * 140, 185, eggTypes[i]).setScale(1.25);
      this.tweens.add({
        targets: egg,
        y: 175,
        duration: 800 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Play button (rounded, bigger)
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x4CAF50);
    btnBg.fillRoundedRect(300, 250, 200, 60, 16);
    btnBg.lineStyle(3, 0x388E3C);
    btnBg.strokeRoundedRect(300, 250, 200, 60, 16);

    const btnZone = this.add.zone(400, 280, 200, 60).setInteractive({ useHandCursor: true });

    const btnText = this.add.text(400, 280, 'PLAY!', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnZone.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x66BB6A);
      btnBg.fillRoundedRect(300, 250, 200, 60, 16);
      btnBg.lineStyle(3, 0x388E3C);
      btnBg.strokeRoundedRect(300, 250, 200, 60, 16);
      btnText.setScale(1.1);
    });

    btnZone.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x4CAF50);
      btnBg.fillRoundedRect(300, 250, 200, 60, 16);
      btnBg.lineStyle(3, 0x388E3C);
      btnBg.strokeRoundedRect(300, 250, 200, 60, 16);
      btnText.setScale(1.0);
    });

    const startGame = () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('AnimalSelectScene');
      });
    };

    btnZone.on('pointerdown', () => { SoundSystem.play('buttonClick'); startGame(); });

    // Show saved progress info + New Game button if save exists
    if (ProgressSystem.hasSaveData) {
      const count = ProgressSystem.state.unlockedAnimals.length;
      this.add.text(400, 325, `${count} animals collected`, {
        fontSize: '14px',
        color: '#81d4fa',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);

      // New Game button (smaller, subtle)
      const newBtnBg = this.add.graphics();
      newBtnBg.fillStyle(0x78909c);
      newBtnBg.fillRoundedRect(330, 345, 140, 36, 10);
      newBtnBg.lineStyle(2, 0x546e7a);
      newBtnBg.strokeRoundedRect(330, 345, 140, 36, 10);

      const newBtnZone = this.add.zone(400, 363, 140, 36).setInteractive({ useHandCursor: true });

      const newBtnText = this.add.text(400, 363, 'New Game', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);

      newBtnZone.on('pointerover', () => {
        newBtnBg.clear();
        newBtnBg.fillStyle(0xef5350);
        newBtnBg.fillRoundedRect(330, 345, 140, 36, 10);
        newBtnBg.lineStyle(2, 0xc62828);
        newBtnBg.strokeRoundedRect(330, 345, 140, 36, 10);
        newBtnText.setScale(1.05);
      });

      newBtnZone.on('pointerout', () => {
        newBtnBg.clear();
        newBtnBg.fillStyle(0x78909c);
        newBtnBg.fillRoundedRect(330, 345, 140, 36, 10);
        newBtnBg.lineStyle(2, 0x546e7a);
        newBtnBg.strokeRoundedRect(330, 345, 140, 36, 10);
        newBtnText.setScale(1.0);
      });

      newBtnZone.on('pointerdown', () => {
        this.showNewGameConfirm();
      });
    }

    // Leaderboard button (top-right corner)
    if (ProgressSystem.state.leaderboard.length > 0) {
      const lbBg = this.add.graphics();
      lbBg.fillStyle(0x1565c0);
      lbBg.fillRoundedRect(660, 10, 120, 32, 8);
      lbBg.lineStyle(2, 0x0d47a1);
      lbBg.strokeRoundedRect(660, 10, 120, 32, 8);

      const lbZone = this.add.zone(720, 26, 120, 32).setInteractive({ useHandCursor: true });
      this.add.text(720, 26, 'Best Times', {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);

      lbZone.on('pointerover', () => {
        lbBg.clear();
        lbBg.fillStyle(0x1e88e5);
        lbBg.fillRoundedRect(660, 10, 120, 32, 8);
        lbBg.lineStyle(2, 0x0d47a1);
        lbBg.strokeRoundedRect(660, 10, 120, 32, 8);
      });
      lbZone.on('pointerout', () => {
        lbBg.clear();
        lbBg.fillStyle(0x1565c0);
        lbBg.fillRoundedRect(660, 10, 120, 32, 8);
        lbBg.lineStyle(2, 0x0d47a1);
        lbBg.strokeRoundedRect(660, 10, 120, 32, 8);
      });

      lbZone.on('pointerdown', () => {
        this.showLeaderboard();
      });
    }

    // Level Editor button (bottom-right)
    const edBg = this.add.graphics();
    edBg.fillStyle(0xffa726);
    edBg.fillRoundedRect(640, 455, 140, 34, 10);
    edBg.lineStyle(2, 0xf57c00);
    edBg.strokeRoundedRect(640, 455, 140, 34, 10);
    const edZone = this.add.zone(710, 472, 140, 34).setInteractive({ useHandCursor: true });
    const edText = this.add.text(710, 472, 'Level Editor', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    edZone.on('pointerover', () => {
      edBg.clear(); edBg.fillStyle(0xffb74d);
      edBg.fillRoundedRect(640, 455, 140, 34, 10);
      edBg.lineStyle(2, 0xf57c00); edBg.strokeRoundedRect(640, 455, 140, 34, 10);
    });
    edZone.on('pointerout', () => {
      edBg.clear(); edBg.fillStyle(0xffa726);
      edBg.fillRoundedRect(640, 455, 140, 34, 10);
      edBg.lineStyle(2, 0xf57c00); edBg.strokeRoundedRect(640, 455, 140, 34, 10);
    });
    edZone.on('pointerdown', () => {
      SoundSystem.play('buttonClick');
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('LevelEditorScene');
      });
    });

    // Debug: unlock all animals (small button, bottom-left)
    const dbgZone = this.add.zone(40, 485, 70, 24).setInteractive({ useHandCursor: true });
    const dbgText = this.add.text(40, 485, 'Unlock All', {
      fontSize: '10px', color: '#546e7a', fontFamily: 'Arial',
    }).setOrigin(0.5);
    dbgZone.on('pointerover', () => dbgText.setColor('#81d4fa'));
    dbgZone.on('pointerout', () => dbgText.setColor('#546e7a'));
    dbgZone.on('pointerdown', () => {
      ProgressSystem.unlockAll();
      dbgText.setText('Done!').setColor('#69f0ae');
      this.time.delayedCall(800, () => this.scene.restart());
    });

    // Parade of animals at the bottom
    const animals = ['bunny', 'cat', 'bird', 'penguin', 'puppy', 'frog', 'fox', 'panda', 'unicorn', 'dragon'];
    for (let i = 0; i < animals.length; i++) {
      const ax = 80 + i * 72;
      const a = this.add.image(ax, 420, `animal_${animals[i]}`).setScale(0.55);
      this.tweens.add({
        targets: a,
        y: 412,
        duration: 500 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 80,
      });
    }

    // Fade in
    this.cameras.main.fadeIn(500);

    // Press any key to start
    this.add.text(400, 470, 'Press SPACE or click PLAY', {
      fontSize: '14px',
      color: '#B0BEC5',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', startGame);
  }

  private showLeaderboard(): void {
    const entries = ProgressSystem.state.leaderboard;
    const els: Phaser.GameObjects.GameObject[] = [];

    // Overlay
    els.push(this.add.rectangle(400, 250, 800, 500, 0x000000, 0.85)
      .setDepth(500).setInteractive());

    // Panel
    els.push(this.add.rectangle(400, 250, 520, 400, 0x1a1a2e, 1)
      .setStrokeStyle(3, 0xffd740).setDepth(501));

    els.push(this.add.text(400, 75, 'Best Times', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(502));

    // Column positions (left-aligned within panel)
    const colRank = 185;
    const colTime = 220;
    const colAnimal = 360;
    const colEggs = 560;
    const headerY = 110;

    // Headers
    els.push(this.add.text(colRank, headerY, '#', {
      fontSize: '13px', color: '#78909c', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(502));
    els.push(this.add.text(colTime, headerY, 'Time', {
      fontSize: '13px', color: '#78909c', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(502));
    els.push(this.add.text(colAnimal, headerY, 'Animal', {
      fontSize: '13px', color: '#78909c', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(502));
    els.push(this.add.text(colEggs, headerY, 'Eggs', {
      fontSize: '13px', color: '#78909c', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(502));

    // Divider line
    const divider = this.add.rectangle(400, headerY + 16, 460, 1, 0x546e7a).setDepth(502);
    els.push(divider);

    // Rows
    for (let i = 0; i < Math.min(entries.length, 10); i++) {
      const e = entries[i];
      const y = headerY + 30 + i * 26;
      const color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#FFAB40' : '#ffffff';

      els.push(this.add.text(colRank, y, `${i + 1}.`, {
        fontSize: '15px', color, fontFamily: 'Arial', fontStyle: 'bold',
      }).setDepth(502));

      els.push(this.add.text(colTime, y, formatTime(e.time), {
        fontSize: '15px', color, fontFamily: 'Arial',
      }).setDepth(502));

      const animalData = ANIMALS[e.animal];
      const animalName = animalData ? animalData.name : e.animal;
      els.push(this.add.image(colAnimal, y + 8, `animal_${e.animal}`)
        .setScale(0.225).setDepth(502));
      els.push(this.add.text(colAnimal + 18, y, animalName, {
        fontSize: '14px', color: '#B0BEC5', fontFamily: 'Arial',
      }).setDepth(502));

      els.push(this.add.text(colEggs + 10, y, `${e.eggs}`, {
        fontSize: '15px', color: '#81d4fa', fontFamily: 'Arial',
      }).setDepth(502));
    }

    // Close button
    const closeBg = this.add.rectangle(400, 425, 120, 40, 0x78909c, 1)
      .setStrokeStyle(2, 0x546e7a)
      .setInteractive({ useHandCursor: true })
      .setDepth(502);
    els.push(closeBg);
    els.push(this.add.text(400, 425, 'Close', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(503));

    closeBg.on('pointerover', () => closeBg.setFillStyle(0x90a4ae));
    closeBg.on('pointerout', () => closeBg.setFillStyle(0x78909c));
    closeBg.on('pointerdown', () => {
      els.forEach(el => el.destroy());
    });
  }

  private showNewGameConfirm(): void {
    const els: Phaser.GameObjects.GameObject[] = [];

    // Overlay
    els.push(this.add.rectangle(400, 250, 800, 500, 0x000000, 0.85)
      .setDepth(500).setInteractive());

    // Panel
    els.push(this.add.rectangle(400, 250, 380, 200, 0x1a1a2e, 1)
      .setStrokeStyle(3, 0xef5350).setDepth(501));

    els.push(this.add.text(400, 190, 'Start a New Game?', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(502));

    els.push(this.add.text(400, 225, 'All animals and scores\nwill be lost!', {
      fontSize: '15px', color: '#ef9a9a', fontFamily: 'Arial', align: 'center',
    }).setOrigin(0.5).setDepth(502));

    // Yes button
    const yesBg = this.add.rectangle(340, 290, 100, 40, 0xef5350, 1)
      .setStrokeStyle(2, 0xc62828)
      .setInteractive({ useHandCursor: true }).setDepth(502);
    els.push(yesBg);
    els.push(this.add.text(340, 290, 'Yes', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(503));

    yesBg.on('pointerover', () => yesBg.setFillStyle(0xf44336));
    yesBg.on('pointerout', () => yesBg.setFillStyle(0xef5350));
    yesBg.on('pointerdown', () => {
      ProgressSystem.reset();
      els.forEach(el => el.destroy());
      this.scene.restart();
    });

    // No button
    const noBg = this.add.rectangle(460, 290, 100, 40, 0x4CAF50, 1)
      .setStrokeStyle(2, 0x388E3C)
      .setInteractive({ useHandCursor: true }).setDepth(502);
    els.push(noBg);
    els.push(this.add.text(460, 290, 'No', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(503));

    noBg.on('pointerover', () => noBg.setFillStyle(0x66BB6A));
    noBg.on('pointerout', () => noBg.setFillStyle(0x4CAF50));
    noBg.on('pointerdown', () => {
      els.forEach(el => el.destroy());
    });
  }
}
