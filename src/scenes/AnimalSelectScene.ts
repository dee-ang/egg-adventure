import Phaser from 'phaser';
import { ANIMALS } from '../data/animals';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SoundSystem } from '../systems/SoundSystem';

export class AnimalSelectScene extends Phaser.Scene {
  private selectedAnimal: string = '';
  private animalSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private nameText!: Phaser.GameObjects.Text;
  private abilityText!: Phaser.GameObjects.Text;
  private selectGlow!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'AnimalSelectScene' });
  }

  create(): void {
    this.animalSprites.clear();

    // Background
    this.add.rectangle(400, 250, 800, 500, 0x263238);

    // Title
    this.add.text(400, 30, 'Choose Your Animal!', {
      fontSize: '28px',
      color: '#FFD54F',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#FF8F00',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Calculate grid layout
    const unlocked = ProgressSystem.state.unlockedAnimals;
    const allAnimalIds = Object.keys(ANIMALS);
    const cols = 8;
    const rows = Math.ceil(allAnimalIds.length / cols);
    const cellW = 90;
    const cellH = 80;

    // Calculate total content height to center everything vertically
    const gridHeight = rows * cellH + 20; // +20 for name labels
    const infoPanelHeight = 65;
    const buttonHeight = 50;
    const gaps = 15;
    const totalHeight = gridHeight + infoPanelHeight + buttonHeight + gaps * 2;
    const topY = Math.max(60, (500 - totalHeight) / 2);

    const startX = 400 - ((Math.min(cols, allAnimalIds.length) - 1) * cellW) / 2;
    const gridStartY = topY;

    // Selection glow (drawn behind selected animal)
    this.selectGlow = this.add.graphics().setDepth(0);

    for (let i = 0; i < allAnimalIds.length; i++) {
      const animalId = allAnimalIds[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = gridStartY + row * cellH;
      const isUnlocked = unlocked.includes(animalId);

      const sprite = this.add.image(x, y, `animal_${animalId}`)
        .setScale(0.5)
        .setDepth(1);

      if (isUnlocked) {
        sprite.setInteractive({ useHandCursor: true });

        sprite.on('pointerover', () => {
          if (this.selectedAnimal !== animalId) {
            sprite.setScale(0.575);
          }
        });

        sprite.on('pointerout', () => {
          if (this.selectedAnimal !== animalId) {
            sprite.setScale(0.5);
          }
        });

        sprite.on('pointerdown', () => {
          SoundSystem.play('buttonClick');
          this.selectAnimal(animalId, x, y);
        });

        this.add.text(x, y + 28, ANIMALS[animalId].name, {
          fontSize: '11px',
          color: '#B0BEC5',
          fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(1);

        // Level indicator
        const lvl = ProgressSystem.getAnimalLevel(animalId);
        if (lvl > 1) {
          this.add.text(x, y + 38, `Lv.${lvl}`, {
            fontSize: '9px',
            color: lvl === 3 ? '#FFD700' : '#81d4fa',
            fontFamily: 'Arial',
            fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(2);
        }

        // Level 3 golden glow ring
        if (lvl === 3) {
          const glow = this.add.graphics().setDepth(0);
          glow.lineStyle(2, 0xffd700, 0.5);
          glow.strokeCircle(x, y, 28);
          glow.fillStyle(0xffd700, 0.06);
          glow.fillCircle(x, y, 28);
        }
      } else {
        sprite.setTint(0x111111);
        sprite.setAlpha(0.4);
        this.add.text(x, y + 28, '???', {
          fontSize: '11px',
          color: '#546e7a',
          fontFamily: 'Arial',
        }).setOrigin(0.5);
      }

      this.animalSprites.set(animalId, sprite);
    }

    // Info panel — right below the grid
    const panelY = gridStartY + rows * cellH + 30;
    this.add.rectangle(400, panelY, 460, infoPanelHeight, 0x37474f, 0.8)
      .setStrokeStyle(2, 0x546e7a);

    this.nameText = this.add.text(400, panelY - 14, '', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.abilityText = this.add.text(400, panelY + 12, '', {
      fontSize: '15px',
      color: '#81d4fa',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // GO button — right below info panel
    const btnY = panelY + infoPanelHeight / 2 + gaps + buttonHeight / 2;
    const btnX = 400;
    const btnW = 160;
    const btnH = buttonHeight;

    const btnBg = this.add.graphics().setDepth(10);
    const drawBtn = (color: number) => {
      btnBg.clear();
      btnBg.fillStyle(color);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
      btnBg.lineStyle(2, 0x388e3c);
      btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
    };
    drawBtn(0x4caf50);
    btnBg.setVisible(false);

    const btnText = this.add.text(btnX, btnY, 'GO!', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    const btnZone = this.add.zone(btnX, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);
    btnZone.setVisible(false);

    btnZone.on('pointerover', () => { drawBtn(0x66bb6a); });
    btnZone.on('pointerout', () => { drawBtn(0x4caf50); });

    btnZone.on('pointerdown', () => {
      if (this.selectedAnimal) {
        SoundSystem.play('buttonClick');
        ProgressSystem.setAnimal(this.selectedAnimal);
        this.cameras.main.fadeOut(400);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('LevelSelectScene');
        });
      }
    });

    // Store refs
    this.data.set('btnBg', btnBg);
    this.data.set('btnText', btnText);
    this.data.set('btnZone', btnZone);

    // Auto-select current animal
    const current = ProgressSystem.state.currentAnimal;
    const currentSprite = this.animalSprites.get(current);
    if (currentSprite) {
      const bounds = currentSprite.getBounds();
      this.selectAnimal(current, bounds.centerX, bounds.centerY);
    }

    this.cameras.main.fadeIn(400);
  }

  private selectAnimal(id: string, x: number, y: number): void {
    if (this.selectedAnimal) {
      const prev = this.animalSprites.get(this.selectedAnimal);
      if (prev) prev.setScale(0.5);
    }

    this.selectedAnimal = id;
    const sprite = this.animalSprites.get(id);
    if (sprite) {
      sprite.setScale(0.65);
      this.tweens.add({
        targets: sprite,
        scale: 0.625,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }

    // Glow ring
    this.selectGlow.clear();
    this.selectGlow.lineStyle(3, 0xffd740, 0.8);
    this.selectGlow.strokeCircle(x, y, 26);
    this.selectGlow.fillStyle(0xffd740, 0.1);
    this.selectGlow.fillCircle(x, y, 26);

    // Update info
    const animal = ANIMALS[id];
    this.nameText.setText(animal.name);
    this.abilityText.setText(animal.abilityDesc);

    // Show GO button
    const btnBg = this.data.get('btnBg') as Phaser.GameObjects.Graphics;
    const btnText = this.data.get('btnText') as Phaser.GameObjects.Text;
    const btnZone = this.data.get('btnZone') as Phaser.GameObjects.Zone;
    btnBg.setVisible(true);
    btnText.setVisible(true);
    btnZone.setVisible(true);
  }
}
