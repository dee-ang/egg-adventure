import Phaser from 'phaser';
import { ANIMALS } from '../data/animals';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SoundSystem } from '../systems/SoundSystem';

interface HatchSceneData {
  eggsCollected: string[];
  time: number;      // milliseconds
  animal: string;    // animal id used
  perfectCollection?: boolean;
  levelId?: number;
  medal?: 'gold' | 'silver' | 'bronze' | null;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${min}:${sec.toString().padStart(2, '0')}.${tenths}`;
}

export class HatchScene extends Phaser.Scene {
  private eggsToHatch: string[] = [];
  private runTime = 0;
  private runAnimal = '';
  private perfectCollection = false;
  private levelId = 1;
  private medal: 'gold' | 'silver' | 'bronze' | null = null;

  constructor() {
    super({ key: 'HatchScene' });
  }

  init(data: HatchSceneData): void {
    this.eggsToHatch = data.eggsCollected || [];
    this.runTime = data.time || 0;
    this.runAnimal = data.animal || 'bunny';
    this.perfectCollection = data.perfectCollection || false;
    this.levelId = data.levelId || 1;
    this.medal = data.medal || null;
  }

  create(): void {
    // Save this run to leaderboard
    if (this.eggsToHatch.length > 0) {
      ProgressSystem.addLeaderboardEntry(this.runTime, this.runAnimal, this.eggsToHatch.length);
    }

    // Dark cozy background
    this.add.rectangle(400, 250, 800, 500, 0x1a1a2e);

    // Stars in background
    for (let i = 0; i < 40; i++) {
      const star = this.add.rectangle(
        Math.random() * 800,
        Math.random() * 500,
        2, 2,
        0xffffff,
        0.3 + Math.random() * 0.7,
      );
      this.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }

    // Title
    this.add.text(400, 30, 'Hatching Time!', {
      fontSize: '28px',
      color: '#FFD700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#5D4037',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Time display
    const best = ProgressSystem.bestTime;
    const isNewBest = best && best.time === this.runTime;

    const timeStr = formatTime(this.runTime);
    const timeColor = isNewBest ? '#69f0ae' : '#ffffff';
    this.add.text(400, 58, `Time: ${timeStr}`, {
      fontSize: '18px',
      color: timeColor,
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (isNewBest && ProgressSystem.state.leaderboard.length > 1) {
      this.add.text(400, 78, 'New Best!', {
        fontSize: '14px',
        color: '#69f0ae',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    } else if (best) {
      const bestAnimal = ANIMALS[best.animal];
      const bestName = bestAnimal ? bestAnimal.name : best.animal;
      this.add.text(400, 78, `Best: ${formatTime(best.time)} (${bestName})`, {
        fontSize: '13px',
        color: '#B0BEC5',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    if (this.eggsToHatch.length === 0) {
      this.add.text(400, 250, 'No eggs collected!\nTry again!', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
      }).setOrigin(0.5);

      this.showContinueButton();
      return;
    }

    this.cameras.main.fadeIn(500);

    // Show "All Eggs Collected!" banner if perfect
    if (this.perfectCollection) {
      const banner = this.add.text(400, 100, 'All Eggs Collected!', {
        fontSize: '22px',
        color: '#FFD700',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#5D4037',
        strokeThickness: 3,
      }).setOrigin(0.5).setScale(0).setDepth(50);

      this.tweens.add({
        targets: banner,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut',
      });
    }

    this.autoHatchSequence();
  }

  private autoHatchSequence(): void {
    // Include bonus egg if perfect collection
    const allEggs = [...this.eggsToHatch];
    if (this.perfectCollection) {
      allEggs.push('rainbow');
    }

    const spacing = Math.min(140, 500 / allEggs.length);
    const startX = 400 - ((allEggs.length - 1) * spacing) / 2;
    const cx = 400, cy = 180;

    // Phase 1: Drop all eggs in
    const eggSprites: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < allEggs.length; i++) {
      const x = startX + i * spacing;
      const eggType = allEggs[i];
      const isBonus = this.perfectCollection && i === allEggs.length - 1;
      const egg = this.add.image(x, -50, `egg_${eggType}`)
        .setScale(1.25)
        .setDepth(10);
      eggSprites.push(egg);

      const dropDelay = isBonus ? allEggs.length * 150 + 400 : i * 150;
      this.tweens.add({
        targets: egg,
        y: cy,
        duration: 400,
        delay: dropDelay,
        ease: 'Bounce.easeOut',
      });

      if (isBonus) {
        this.time.delayedCall(dropDelay, () => {
          const bonusLabel = this.add.text(x, cy - 40, 'BONUS!', {
            fontSize: '16px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
            stroke: '#5D4037', strokeThickness: 2,
          }).setOrigin(0.5).setDepth(50).setAlpha(0);
          this.tweens.add({ targets: bonusLabel, alpha: 1, duration: 300, delay: 200 });
        });
      }
    }

    // Phase 2: Merge eggs to center
    const allLandDelay = this.perfectCollection
      ? allEggs.length * 150 + 400 + 400 + 400
      : allEggs.length * 150 + 800;

    this.time.delayedCall(allLandDelay, () => {
      // Slide all eggs to center
      for (const egg of eggSprites) {
        this.tweens.add({
          targets: egg,
          x: cx,
          y: cy,
          scale: 0.75,
          alpha: 0.7,
          duration: 500,
          ease: 'Cubic.easeIn',
        });
      }

      // After merge — flash + create big glowing egg
      this.time.delayedCall(550, () => {
        for (const egg of eggSprites) egg.destroy();

        // Flash
        const flash = this.add.rectangle(400, 250, 800, 500, 0xffffff, 0.6).setDepth(200);
        this.tweens.add({
          targets: flash, alpha: 0, duration: 300,
          onComplete: () => flash.destroy(),
        });

        // Big combined egg (use rainbow if we have one, else golden, else white)
        const bestEggType = allEggs.includes('rainbow') ? 'rainbow'
          : allEggs.includes('golden') ? 'golden' : allEggs[0];
        const bigEgg = this.add.image(cx, cy, `egg_${bestEggType}`)
          .setScale(0).setDepth(20);

        // Glow ring behind egg
        const glowRing = this.add.graphics().setDepth(19);
        const drawGlow = (radius: number, alpha: number) => {
          glowRing.clear();
          glowRing.fillStyle(0xffd700, alpha);
          glowRing.fillCircle(cx, cy, radius);
        };
        drawGlow(40, 0.15);

        // Pop in the big egg
        this.tweens.add({
          targets: bigEgg,
          scale: 2,
          duration: 400,
          ease: 'Back.easeOut',
        });

        // Pulsing glow
        let glowPhase = 0;
        const glowEvent = this.time.addEvent({
          delay: 50, loop: true,
          callback: () => {
            glowPhase += 0.15;
            drawGlow(40 + Math.sin(glowPhase) * 8, 0.1 + Math.sin(glowPhase) * 0.05);
          },
        });

        // Sparkles around combined egg
        this.time.addEvent({
          delay: 150, repeat: 12,
          callback: () => {
            const sp = this.add.circle(
              cx + (Math.random() - 0.5) * 60,
              cy + (Math.random() - 0.5) * 60,
              2, 0xffd700, 0.8,
            ).setDepth(25);
            this.tweens.add({
              targets: sp, alpha: 0, scale: 0, y: sp.y - 15, duration: 500,
              onComplete: () => sp.destroy(),
            });
          },
        });

        // Phase 3: Wobble + crack the big egg
        this.time.delayedCall(800, () => {
          // Wobble
          this.tweens.add({
            targets: bigEgg,
            angle: { from: -15, to: 15 },
            duration: 80,
            yoyo: true,
            repeat: 8,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              // HATCH!
              glowEvent.destroy();
              glowRing.destroy();
              SoundSystem.play('hatchCrack');
              this.spawnCrackParticles(cx, cy);
              this.cameras.main.shake(400, 0.012);

              bigEgg.destroy();

              // Big flash
              const hatchFlash = this.add.rectangle(400, 250, 800, 500, 0xffffff, 0.7).setDepth(200);
              this.tweens.add({
                targets: hatchFlash, alpha: 0, duration: 300,
                onComplete: () => hatchFlash.destroy(),
              });

              // Combined hatch — one roll for all eggs
              const hadBefore = ProgressSystem.state.unlockedAnimals.slice();
              const animalId = ProgressSystem.hatchCombinedEggs(allEggs);
              const animal = ANIMALS[animalId];
              const isNew = !hadBefore.includes(animalId);

              this.revealAnimal(cx, cy, animal, isNew);

              // Medal + continue after reveal
              let nextDelay = 1200;
              if (this.medal) {
                this.time.delayedCall(nextDelay, () => {
                  this.showMedalEarned(this.medal!);
                });
                nextDelay += 1500;
              }
              this.time.delayedCall(nextDelay, () => {
                this.showContinueButton();
              });
            },
          });
        });
      });
    });
  }

  private revealAnimal(
    x: number, y: number,
    animal: typeof ANIMALS[string],
    isNew: boolean,
  ): void {
    SoundSystem.play(isNew ? 'newAnimal' : 'hatchReveal');
    this.spawnConfetti(x, y);

    const animalSprite = this.add.image(x, y, `animal_${animal.id}`)
      .setScale(0)
      .setDepth(100);

    this.tweens.add({
      targets: animalSprite,
      scale: 1.1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    const nameText = this.add.text(x, y + 55, animal.name, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    this.tweens.add({
      targets: nameText,
      alpha: 1,
      duration: 300,
      delay: 200,
    });

    if (isNew) {
      const newText = this.add.text(x, y - 55, 'NEW!', {
        fontSize: '24px',
        color: '#FF4081',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 3,
      }).setOrigin(0.5).setScale(0).setDepth(101);

      this.tweens.add({
        targets: newText,
        scale: 1,
        duration: 300,
        delay: 150,
        ease: 'Back.easeOut',
      });
    } else {
      const starText = this.add.text(x, y - 50, '★ +1', {
        fontSize: '20px',
        color: '#FFD700',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0).setDepth(101);

      this.tweens.add({
        targets: starText,
        alpha: 1,
        y: y - 58,
        duration: 300,
        delay: 150,
      });
    }
  }

  private spawnCrackParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const shard = this.add.circle(x, y, 3 + Math.random() * 3, 0xfafafa).setDepth(150);
      this.tweens.add({
        targets: shard,
        x: x + (Math.random() - 0.5) * 100,
        y: y + Math.random() * 60 - 30,
        alpha: 0,
        angle: Math.random() * 360,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private spawnConfetti(x: number, y: number): void {
    const colors = [0xFF4081, 0xFFD700, 0x4FC3F7, 0x81C784, 0xFFAB40, 0x7C4DFF, 0xFF5722];
    for (let i = 0; i < 25; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const confetti = this.add.circle(x, y, 3 + Math.random() * 4, color).setDepth(150);
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 120;
      this.tweens.add({
        targets: confetti,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        angle: Math.random() * 720 - 360,
        scale: { from: 1, to: 0 },
        duration: 700 + Math.random() * 400,
        ease: 'Cubic.easeOut',
        onComplete: () => confetti.destroy(),
      });
    }
  }

  private showMedalEarned(medal: 'gold' | 'silver' | 'bronze'): void {
    const colors: Record<string, number> = { gold: 0xffd700, silver: 0xc0c0c0, bronze: 0xcd7f32 };
    const names: Record<string, string> = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
    const color = colors[medal];

    // Star shape
    const gfx = this.add.graphics().setDepth(600);
    const cx = 400;
    const cy = 180;
    gfx.fillStyle(color);
    gfx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 30 : 14;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.fillPath();
    gfx.setScale(0);

    this.tweens.add({
      targets: gfx, scale: 1,
      duration: 500, ease: 'Bounce.easeOut',
    });

    // Medal text
    const medalText = this.add.text(cx, cy + 50, `${names[medal]} Medal!`, {
      fontSize: '24px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#5D4037', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(601);

    this.tweens.add({
      targets: medalText, alpha: 1,
      duration: 400, delay: 500,
    });

    // Confetti burst
    this.time.delayedCall(600, () => {
      this.spawnConfetti(cx, cy);
    });
  }

  private showContinueButton(): void {
    // Collection summary
    const unlocked = ProgressSystem.state.unlockedAnimals;
    const totalAnimals = Object.keys(ANIMALS).length;
    const summaryY = 330;
    this.add.text(400, summaryY, `Animals: ${unlocked.length}/${totalAnimals}`, {
      fontSize: '16px',
      color: '#B0BEC5',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(300);

    const maxPerRow = 16;
    const iconScale = unlocked.length > 8 ? 0.225 : 0.275;
    const iconSpacing = unlocked.length > 8 ? 28 : 36;
    const iconStartX = 400 - ((Math.min(unlocked.length, maxPerRow) - 1) * iconSpacing) / 2;
    for (let i = 0; i < unlocked.length; i++) {
      const col = i % maxPerRow;
      const row = Math.floor(i / maxPerRow);
      this.add.image(iconStartX + col * iconSpacing, summaryY + 24 + row * 30, `animal_${unlocked[i]}`)
        .setScale(iconScale)
        .setDepth(300);
    }

    const btnY = 460;
    const btnBg = this.add.rectangle(400, btnY, 220, 50, 0x4CAF50, 1)
      .setStrokeStyle(3, 0x388E3C)
      .setInteractive({ useHandCursor: true })
      .setDepth(300);

    const btnText = this.add.text(400, btnY, 'Continue!', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301);

    btnBg.setScale(0);
    btnText.setScale(0);
    this.tweens.add({
      targets: [btnBg, btnText],
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    btnBg.on('pointerover', () => { btnBg.setFillStyle(0x66BB6A); btnText.setScale(1.05); });
    btnBg.on('pointerout', () => { btnBg.setFillStyle(0x4CAF50); btnText.setScale(1); });
    btnBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('LevelSelectScene');
      });
    });
  }
}
