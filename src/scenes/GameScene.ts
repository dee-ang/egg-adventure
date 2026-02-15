import Phaser from 'phaser';
import { LEVEL_1, LEVELS, LevelData, WaterSlide, MovingPlatform, WindZone, Puddle, selectEggs, EggPlacement } from '../data/levels';
import { ANIMALS } from '../data/animals';
import { ProgressSystem } from '../systems/ProgressSystem';
import { SoundSystem } from '../systems/SoundSystem';

const TILE_SIZE = 32;

// Per-animal physics modifiers — makes every animal feel different
interface AnimalPhysics {
  speed: number;
  jumpVelocity: number;
  gravity: number;       // Multiplier on world gravity for this animal
  canDoubleJump: boolean;
  canGlide: boolean;     // Fall slowly when holding jump
  canDash: boolean;
  canHighJump: boolean;
  canSlide: boolean;     // Faster on ground, momentum
  jumpScale: number;     // 1.0 = normal jump, 1.5 = higher
  canWallJump: boolean;    // Cat: jump off walls
  canWaterBoost: boolean;  // Fish: super fast on water slides
  canRoll: boolean;        // Hamster: press E to roll into a ball
  canEggRadar: boolean;    // Owl: shows arrows to nearby eggs
  canBounce: boolean;      // Turtle: bounces on landing
  canGroundPound: boolean; // Panda: slam down from the air
  canSpinBounce: boolean;  // Hedgehog: super powered spin jump
  canMagnet: boolean;      // Puppy: eggs fly toward you
  isTiny: boolean;         // Mouse: smaller + faster
}

const ANIMAL_PHYSICS: Record<string, Partial<AnimalPhysics>> = {
  bunny:    { canDoubleJump: true, jumpScale: 1.1, speed: 160 },
  cat:      { canWallJump: true, speed: 190, jumpScale: 1.05 },
  bird:     { canGlide: true, gravity: 0.7, jumpScale: 1.15 },
  frog:     { canHighJump: true, jumpScale: 1.5, speed: 130 },
  fish:     { canWaterBoost: true, canDoubleJump: true, gravity: 0.8, speed: 140 },
  fox:      { canDash: true, speed: 200, jumpScale: 0.95 },
  penguin:  { canSlide: true, speed: 150, jumpScale: 0.9 },
  hamster:  { canRoll: true, canDoubleJump: true, speed: 170, jumpScale: 1.0 },
  owl:      { canGlide: true, canEggRadar: true, gravity: 0.65, speed: 140, jumpScale: 1.1 },
  turtle:   { canBounce: true, speed: 110, jumpScale: 0.9, gravity: 1.1 },
  panda:    { canGroundPound: true, canDoubleJump: true, speed: 125, jumpScale: 1.1, gravity: 1.1 },
  hedgehog: { canSpinBounce: true, speed: 175, jumpScale: 1.0 },
  puppy:    { canMagnet: true, canDoubleJump: true, speed: 185, jumpScale: 1.05 },
  mouse:    { isTiny: true, speed: 220, jumpScale: 0.95, gravity: 0.7 },
  unicorn:  { canGlide: true, canDoubleJump: true, speed: 170, jumpScale: 1.15, gravity: 0.7 },
  dragon:   { canGlide: true, canDoubleJump: true, speed: 160, jumpScale: 1.2, gravity: 0.6 },
};

const DEFAULT_PHYSICS: AnimalPhysics = {
  speed: 160, jumpVelocity: -320, gravity: 1.0,
  canDoubleJump: false, canGlide: false, canDash: false,
  canHighJump: false, canSlide: false, jumpScale: 1.0,
  canWallJump: false, canWaterBoost: false, canRoll: false,
  canEggRadar: false, canBounce: false, canGroundPound: false,
  canSpinBounce: false, canMagnet: false, isTiny: false,
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private abilityKey!: Phaser.Input.Keyboard.Key;
  private eggs!: Phaser.Physics.Arcade.StaticGroup;
  private nest!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private eggCounter!: Phaser.GameObjects.Text;
  private levelNameText!: Phaser.GameObjects.Text;
  private totalEggs = 0;
  private collectedEggs = 0;
  private hasDoubleJumped = false;
  private isOnGround = false;
  private facingRight = true;
  private collectedEggTypes: string[] = [];
  private nestReached = false;
  private animalPhysics!: AnimalPhysics;
  private dashCooldown = 0;
  private isGliding = false;
  private trailTimer = 0;
  private elapsedTime = 0;
  private timerText!: Phaser.GameObjects.Text;
  private slideZones: Phaser.Physics.Arcade.StaticGroup[] = [];
  private onSlide = false;
  private slideDir = 1;
  private slideParticleTimer = 0;

  // New ability state
  private rollTimer = 0;
  private rollCooldown = 0;
  private groundPounding = false;
  private hasBounced = false;
  private eggRadarArrows: Phaser.GameObjects.Text[] = [];

  // Coyote time & jump buffer
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private readonly COYOTE_MS = 200;
  private readonly JUMP_BUFFER_MS = 150;

  // Polish: particles & animation
  private idleTimer = 0;
  private footstepTimer = 0;
  private isPaused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;

  // Touch controls (iPad)
  private isTouchDevice = false;
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchJumpJustPressed = false;
  private touchAbility = false;
  private touchAbilityJustPressed = false;

  private currentLevel: LevelData = LEVEL_1;
  private currentLevelId = 1;

  // Obstacles
  private movingPlatformSprites: Phaser.Physics.Arcade.Sprite[] = [];
  private windZoneRects: { body: Phaser.Physics.Arcade.Sprite; direction: string; strength: number }[] = [];
  private puddleRects: { body: Phaser.Physics.Arcade.Sprite; slowFactor: number }[] = [];
  private inWindZone = false;
  private windForceX = 0;
  private windForceY = 0;
  private inPuddle = false;
  private puddleSlowFactor = 1.0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: { customLevel?: LevelData; levelId?: number }): void {
    let level: LevelData;
    if (data?.customLevel) {
      level = data.customLevel;
    } else if (data?.levelId) {
      level = LEVELS.find(l => l.id === data.levelId) || LEVEL_1;
    } else {
      level = LEVEL_1;
    }
    this.currentLevel = level;
    this.currentLevelId = level.id;
    this.nestReached = false;
    ProgressSystem.resetLevelEggs();
    this.collectedEggs = 0;
    this.collectedEggTypes = [];
    this.hasDoubleJumped = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dashCooldown = 0;
    this.isGliding = false;
    this.trailTimer = 0;
    this.elapsedTime = 0;
    this.onSlide = false;
    this.slideDir = 1;
    this.slideParticleTimer = 0;
    this.slideZones = [];
    this.rollTimer = 0;
    this.rollCooldown = 0;
    this.groundPounding = false;
    this.hasBounced = false;
    this.eggRadarArrows.forEach(a => a.destroy());
    this.eggRadarArrows = [];
    this.idleTimer = 0;
    this.footstepTimer = 0;
    this.isPaused = false;
    if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = undefined; }
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    this.touchJumpJustPressed = false;
    this.touchAbility = false;
    this.touchAbilityJustPressed = false;
    this.movingPlatformSprites = [];
    this.windZoneRects = [];
    this.puddleRects = [];
    this.inWindZone = false;
    this.windForceX = 0;
    this.windForceY = 0;
    this.inPuddle = false;
    this.puddleSlowFactor = 1.0;

    // Set up per-animal physics
    const currentAnimal = ProgressSystem.state.currentAnimal;
    const overrides = ANIMAL_PHYSICS[currentAnimal] || {};
    this.animalPhysics = { ...DEFAULT_PHYSICS, ...overrides };

    // Apply level bonuses
    const animalLevel = ProgressSystem.getAnimalLevel(currentAnimal);
    if (animalLevel >= 2) {
      const mul = animalLevel === 3 ? 1.10 : 1.05;
      this.animalPhysics.speed = Math.round(this.animalPhysics.speed * mul);
      this.animalPhysics.jumpScale *= mul;
    }

    // Base gravity (floaty for kids) modified by animal
    this.physics.world.gravity.y = 500 * this.animalPhysics.gravity;

    const worldWidth = level.tiles[0].length * TILE_SIZE;
    const worldHeight = level.tiles.length * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Background layers (parallax)
    const bg1 = this.add.image(400, 250, 'bg_sky').setScrollFactor(0);
    bg1.setDisplaySize(800, 500);

    const bg2 = this.add.image(400, 250, 'bg_hills').setScrollFactor(0.3);
    bg2.setDisplaySize(800, 500);

    // Animated background elements — LOTS of city life
    this.spawnCityLife();

    // Build tilemap
    this.platforms = this.physics.add.staticGroup();
    this.buildTilemap(level.tiles);

    // Select random eggs from spawn pool
    this.eggs = this.physics.add.staticGroup();
    const selectedEggs = selectEggs(level.eggSpawnPoints);
    this.totalEggs = selectedEggs.length;
    for (const eggData of selectedEggs) {
      const textureKey = `egg_${eggData.type}`;
      const egg = this.eggs.create(
        eggData.x * TILE_SIZE + TILE_SIZE / 2,
        eggData.y * TILE_SIZE,
        textureKey,
      ) as Phaser.Physics.Arcade.Sprite;
      egg.setScale(0.9);
      egg.setData('type', eggData.type);
      egg.refreshBody();

      // Gentle bobbing
      this.tweens.add({
        targets: egg,
        y: egg.y - 6,
        duration: 1000 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Sparkle around eggs to draw attention
      this.time.addEvent({
        delay: 800 + Math.random() * 400,
        loop: true,
        callback: () => {
          if (!egg.active) return;
          const sparkle = this.add.circle(
            egg.x + (Math.random() - 0.5) * 20,
            egg.y + (Math.random() - 0.5) * 20,
            1.5, 0xffd700, 0.8,
          ).setDepth(50);
          this.tweens.add({
            targets: sparkle,
            alpha: 0, scale: 0, y: sparkle.y - 10,
            duration: 500,
            onComplete: () => sparkle.destroy(),
          });
        },
      });
    }

    // Nest
    this.nest = this.physics.add.sprite(
      level.nest.x * TILE_SIZE + TILE_SIZE,
      level.nest.y * TILE_SIZE,
      'nest',
    );
    this.nest.setScale(0.5);
    const nestBody = this.nest.body as Phaser.Physics.Arcade.Body;
    nestBody.allowGravity = false;
    nestBody.setImmovable(true);

    // Bouncing arrow at nest
    const arrow = this.add.text(
      level.nest.x * TILE_SIZE + TILE_SIZE,
      level.nest.y * TILE_SIZE - 50,
      'v',
      { fontSize: '28px', color: '#FFD700', fontStyle: 'bold' },
    ).setOrigin(0.5);
    this.tweens.add({
      targets: arrow,
      y: arrow.y + 10,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Player
    const animalKey = `animal_${ProgressSystem.state.currentAnimal}`;
    this.player = this.physics.add.sprite(
      level.playerStart.x * TILE_SIZE,
      level.playerStart.y * TILE_SIZE,
      animalKey,
    );
    this.player.setCollideWorldBounds(true);
    // Lower max velocity so falling isn't scary
    this.player.body.setMaxVelocityY(350);

    // Mouse: tiny body + smaller scale
    if (this.animalPhysics.isTiny) {
      this.player.setScale(0.35);
      this.player.body.setSize(36, 44);
      this.player.body.setOffset(30, 36);
    } else {
      this.player.setScale(0.5);
      this.player.body.setSize(48, 60);
      this.player.body.setOffset(24, 18);
    }

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.eggs, (_player, egg) => {
      this.collectEgg(egg as Phaser.Physics.Arcade.Sprite);
    });
    this.physics.add.overlap(this.player, this.nest, () => {
      this.reachNest();
    });

    // Build water slides (after player exists, so colliders work)
    for (const slide of level.waterSlides) {
      this.buildWaterSlide(slide);
    }

    // Build obstacles (moving platforms, wind zones, puddles)
    this.buildObstacles(level);

    // Owl: create persistent arrow indicators for egg radar
    if (this.animalPhysics.canEggRadar) {
      for (let i = 0; i < this.totalEggs; i++) {
        const ar = this.add.text(0, 0, '>', {
          fontSize: '20px', color: '#FFD700', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(60).setVisible(false);
        this.eggRadarArrows.push(ar);
      }
    }

    // Camera
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(100, 50);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.abilityKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.togglePause());

    // HUD
    this.createHUD(level.name);

    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    this.cameras.main.fadeIn(500);
  }

  private buildTilemap(tiles: number[][]): void {
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        if (tile === 0) continue;

        let textureKey: string;
        switch (tile) {
          case 1: textureKey = 'tile_grass'; break;
          case 2: textureKey = 'tile_dirt'; break;
          case 3: textureKey = 'tile_stone'; break;
          case 4: textureKey = 'tile_platform'; break;
          default: continue;
        }

        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = tile === 4
          ? y * TILE_SIZE + 6
          : y * TILE_SIZE + TILE_SIZE / 2;

        const tileSprite = this.platforms.create(px, py, textureKey) as Phaser.Physics.Arcade.Sprite;
        tileSprite.setScale(0.5);
        if (tile === 4) {
          tileSprite.body!.setSize(TILE_SIZE * 2, 24);
        }
        tileSprite.refreshBody();
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  //  WATER SLIDES — smooth curved slides with rich effects
  // ═══════════════════════════════════════════════════════

  private buildWaterSlide(slide: WaterSlide): void {
    const { topX, topY, bottomX, bottomY, curveX, curveY } = slide;
    const dir = bottomX > topX ? 1 : -1;
    const STEPS = 14;
    const SLIDE_WIDTH = 28;

    // Calculate points along the quadratic bezier curve
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const x = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * curveX + t * t * bottomX;
      const y = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * curveY + t * t * bottomY;
      points.push({ x, y });
    }

    // ── Draw slide structure (behind the player) ──
    const gfx = this.add.graphics().setDepth(3);

    // Outer slide walls (darker blue)
    gfx.lineStyle(SLIDE_WIDTH + 10, 0x0277bd, 0.9);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i <= STEPS; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();

    // Main slide surface (bright blue)
    gfx.lineStyle(SLIDE_WIDTH, 0x29b6f6, 0.95);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i <= STEPS; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();

    // Inner water surface (lighter, semi-transparent)
    gfx.lineStyle(SLIDE_WIDTH - 8, 0x4fc3f7, 0.7);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i <= STEPS; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();

    // Specular highlight (thin white line along center)
    gfx.lineStyle(3, 0xffffff, 0.35);
    gfx.beginPath();
    gfx.moveTo(points[0].x - 4, points[0].y - 2);
    for (let i = 1; i <= STEPS; i++) {
      gfx.lineTo(points[i].x - 4, points[i].y - 2);
    }
    gfx.strokePath();

    // ── Slide rails (side edges) ──
    const railOffset = (SLIDE_WIDTH + 10) / 2;
    for (const side of [-1, 1]) {
      gfx.lineStyle(3, 0x01579b, 0.8);
      gfx.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const dx = 0; // Rails are simple vertical offsets
        const dy = side * railOffset;
        // Perpendicular offset: approximate with y offset since slides go mostly horizontal
        const px = points[i].x + dx;
        const py = points[i].y + dy * 0.3;
        if (i === 0) gfx.moveTo(px, py);
        else gfx.lineTo(px, py);
      }
      gfx.strokePath();
    }

    // ── Invisible collision platforms along the curve ──
    const slideGroup = this.physics.add.staticGroup();
    for (let i = 0; i < STEPS; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      const seg = slideGroup.create(mx, my, 'tile_platform') as Phaser.Physics.Arcade.Sprite;
      seg.setAlpha(0); // Invisible
      seg.body!.setSize(TILE_SIZE + 8, 10);
      seg.refreshBody();
    }
    this.slideZones.push(slideGroup);

    // Collide player with slide surfaces
    this.physics.add.collider(this.player, slideGroup, () => {
      this.onSlide = true;
      this.slideDir = dir;
    });

    // ── Animated water flow (moving highlights) ──
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        // Pick a random point along the curve
        const t = Math.random();
        const px = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * curveX + t * t * bottomX;
        const py = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * curveY + t * t * bottomY;
        const shimmer = this.add.circle(
          px + (Math.random() - 0.5) * 12,
          py + (Math.random() - 0.5) * 8,
          1 + Math.random() * 1.5,
          0xffffff, 0.4 + Math.random() * 0.3,
        ).setDepth(4);
        // Flow down the slide
        const nextT = Math.min(1, t + 0.15);
        const nx = (1 - nextT) * (1 - nextT) * topX + 2 * (1 - nextT) * nextT * curveX + nextT * nextT * bottomX;
        const ny = (1 - nextT) * (1 - nextT) * topY + 2 * (1 - nextT) * nextT * curveY + nextT * nextT * bottomY;
        this.tweens.add({
          targets: shimmer,
          x: nx, y: ny,
          alpha: 0, scale: 0,
          duration: 400 + Math.random() * 300,
          onComplete: () => shimmer.destroy(),
        });
      },
    });

    // ── Water dripping off the sides ──
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        const t = 0.3 + Math.random() * 0.6;
        const px = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * curveX + t * t * bottomX;
        const py = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * curveY + t * t * bottomY;
        const side = Math.random() > 0.5 ? 1 : -1;
        const drip = this.add.circle(
          px + side * (SLIDE_WIDTH / 2 + 2),
          py + 4,
          1.5, 0x81d4fa, 0.5,
        ).setDepth(4);
        this.tweens.add({
          targets: drip,
          y: drip.y + 20 + Math.random() * 15,
          alpha: 0,
          scale: 0.3,
          duration: 500,
          onComplete: () => drip.destroy(),
        });
      },
    });

    // ── Splash pool at the bottom ──
    const poolX = bottomX + dir * 20;
    const poolY = bottomY + 10;

    // Pool water (layered ellipses for depth)
    const poolBack = this.add.ellipse(poolX, poolY + 4, 80, 16, 0x0277bd, 0.4).setDepth(2);
    const poolMain = this.add.ellipse(poolX, poolY, 72, 18, 0x29b6f6, 0.5).setDepth(3);
    const poolSurface = this.add.ellipse(poolX, poolY - 2, 64, 12, 0x4fc3f7, 0.45).setDepth(4);
    const poolHighlight = this.add.ellipse(poolX - 8, poolY - 4, 30, 6, 0xb3e5fc, 0.35).setDepth(4);

    // Animate pool ripples
    this.tweens.add({
      targets: poolMain,
      scaleX: { from: 0.92, to: 1.08 },
      duration: 1500,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: poolSurface,
      scaleX: { from: 1.05, to: 0.95 },
      alpha: { from: 0.4, to: 0.55 },
      duration: 1200,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 300,
    });
    this.tweens.add({
      targets: poolHighlight,
      x: poolHighlight.x + 16,
      alpha: { from: 0.35, to: 0.15 },
      duration: 2000,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pool splash droplets (continuous small splashes)
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const dropX = poolX + (Math.random() - 0.5) * 50;
        const colors = [0x4fc3f7, 0x81d4fa, 0xe1f5fe];
        const drop = this.add.circle(
          dropX, poolY - 2,
          1 + Math.random() * 1.5,
          Phaser.Utils.Array.GetRandom(colors), 0.5,
        ).setDepth(5);
        this.tweens.add({
          targets: drop,
          y: drop.y - 6 - Math.random() * 10,
          x: drop.x + (Math.random() - 0.5) * 8,
          alpha: 0, scale: 0,
          duration: 350,
          onComplete: () => drop.destroy(),
        });
      },
    });

    // ── Water flowing into pool from slide end ──
    this.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        const streamDrop = this.add.circle(
          bottomX + (Math.random() - 0.5) * 8,
          bottomY + 2,
          1 + Math.random(), 0x4fc3f7, 0.4,
        ).setDepth(4);
        this.tweens.add({
          targets: streamDrop,
          x: poolX + (Math.random() - 0.5) * 20,
          y: poolY - 2,
          alpha: 0,
          duration: 300 + Math.random() * 200,
          onComplete: () => streamDrop.destroy(),
        });
      },
    });

    // ── Top entry: water pouring from above ──
    const faucetGfx = this.add.graphics().setDepth(6);
    // Small pipe at the top
    faucetGfx.fillStyle(0x78909c);
    faucetGfx.fillRoundedRect(topX - 6, topY - 20, 12, 14, 3);
    faucetGfx.fillStyle(0x546e7a);
    faucetGfx.fillRoundedRect(topX - 4, topY - 6, 8, 8, 2);

    // Water stream from pipe
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const wd = this.add.circle(
          topX + (Math.random() - 0.5) * 6,
          topY - 6,
          1 + Math.random(), 0x4fc3f7, 0.5,
        ).setDepth(5);
        this.tweens.add({
          targets: wd,
          y: topY + 6,
          x: wd.x + dir * (Math.random() * 4),
          alpha: 0.2,
          duration: 250,
          onComplete: () => wd.destroy(),
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  OBSTACLES — moving platforms, wind zones, puddles
  // ═══════════════════════════════════════════════════════

  private buildObstacles(level: LevelData): void {
    if (level.movingPlatforms) {
      for (const mp of level.movingPlatforms) {
        this.buildMovingPlatform(mp);
      }
    }
    if (level.windZones) {
      for (const wz of level.windZones) {
        this.buildWindZone(wz);
      }
    }
    if (level.puddles) {
      for (const p of level.puddles) {
        this.buildPuddle(p);
      }
    }
  }

  private buildMovingPlatform(mp: MovingPlatform): void {
    const sprite = this.physics.add.sprite(
      mp.startX * 32 + 16, mp.startY * 32 + 6,
      'tile_platform',
    );
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.setSize(32, 12);
    sprite.setDepth(5);

    this.movingPlatformSprites.push(sprite);
    this.physics.add.collider(this.player, sprite);

    this.tweens.add({
      targets: sprite,
      x: mp.endX * 32 + 16,
      y: mp.endY * 32 + 6,
      duration: mp.duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildWindZone(wz: WindZone): void {
    const zoneX = wz.x * 32 + (wz.width * 32) / 2;
    const zoneY = wz.y * 32 + (wz.height * 32) / 2;
    const zoneW = wz.width * 32;
    const zoneH = wz.height * 32;

    const zone = this.physics.add.sprite(zoneX, zoneY, 'tile_platform');
    zone.setAlpha(0);
    const body = zone.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.setSize(zoneW, zoneH);

    this.windZoneRects.push({ body: zone, direction: wz.direction, strength: wz.strength });

    // Overlap detection
    this.physics.add.overlap(this.player, zone);

    // Visual wind particles
    const dirX = wz.direction === 'right' ? 1 : wz.direction === 'left' ? -1 : 0;
    const dirY = wz.direction === 'up' ? -1 : 0;
    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const wx = wz.x * 32 + Math.random() * wz.width * 32;
        const wy = wz.y * 32 + Math.random() * wz.height * 32;
        const line = this.add.rectangle(wx, wy, dirX !== 0 ? 8 : 3, dirY !== 0 ? 8 : 3, 0xb3e5fc, 0.35)
          .setDepth(3);
        this.tweens.add({
          targets: line,
          x: line.x + dirX * 40,
          y: line.y + dirY * 40,
          alpha: 0,
          duration: 600,
          onComplete: () => line.destroy(),
        });
      },
    });
  }

  private buildPuddle(p: Puddle): void {
    const px = p.x * 32 + (p.width * 32) / 2;
    const py = p.y * 32 + 12;

    // Visual
    const gfx = this.add.graphics().setDepth(2);
    gfx.fillStyle(0x795548, 0.35);
    gfx.fillEllipse(px, py, p.width * 32, 14);
    gfx.fillStyle(0x5d4037, 0.2);
    gfx.fillEllipse(px - 3, py - 1, p.width * 28, 10);

    // Collision body
    const zone = this.physics.add.sprite(px, py, 'tile_platform');
    zone.setAlpha(0);
    const body = zone.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.setSize(p.width * 32, 16);

    this.puddleRects.push({ body: zone, slowFactor: p.slowFactor });

    this.physics.add.overlap(this.player, zone);
  }

  private createHUD(levelName: string): void {
    this.add.rectangle(0, 0, 800, 40, 0x000000, 0.3)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(100);

    const animalKey = `animal_${ProgressSystem.state.currentAnimal}`;
    this.add.image(24, 20, animalKey)
      .setScale(0.35).setScrollFactor(0).setDepth(101);

    this.levelNameText = this.add.text(400, 20, levelName, {
      fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.image(720, 20, 'egg_white')
      .setScale(0.6).setScrollFactor(0).setDepth(101);

    this.eggCounter = this.add.text(740, 20, `${this.collectedEggs}/${this.totalEggs}`, {
      fontSize: '18px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // Stopwatch
    this.timerText = this.add.text(60, 20, '0:00', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // Pause button (top-right, always visible, touch-friendly)
    const pauseBtn = this.add.text(780, 20, '||', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101)
      .setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.togglePause());
  }

  private collectEgg(egg: Phaser.Physics.Arcade.Sprite): void {
    const eggType = egg.getData('type') as string;
    this.collectedEggs++;
    this.collectedEggTypes.push(eggType);
    ProgressSystem.collectEgg();
    SoundSystem.play('collectEgg');

    this.spawnCollectParticles(egg.x, egg.y);

    const flyEgg = this.add.image(egg.x, egg.y, egg.texture.key).setScale(0.9).setDepth(200);
    egg.destroy();

    this.tweens.add({
      targets: flyEgg,
      x: this.cameras.main.scrollX + 720,
      y: this.cameras.main.scrollY + 20,
      scale: 0.5,
      duration: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        flyEgg.destroy();
        this.eggCounter.setText(`${this.collectedEggs}/${this.totalEggs}`);
        this.tweens.add({
          targets: this.eggCounter, scale: 1.4,
          duration: 150, yoyo: true, ease: 'Back.easeOut',
        });

        // "All Eggs!" celebration when all 3 collected
        if (this.collectedEggs === this.totalEggs) {
          this.showAllEggsCelebration();
        }
      },
    });

    this.cameras.main.shake(100, 0.005);
  }

  private spawnCollectParticles(x: number, y: number): void {
    const colors = [0xFFD700, 0xFF69B4, 0x4FC3F7, 0x81C784, 0xFFAB40];
    for (let i = 0; i < 12; i++) {
      const p = this.add.circle(
        x, y, 3 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)],
      ).setDepth(150);
      this.tweens.add({
        targets: p,
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 80 - 20,
        alpha: 0, scale: 0,
        duration: 400 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private showAllEggsCelebration(): void {
    SoundSystem.play('allEggs');
    // Flash "All Eggs!" text
    const allEggsText = this.add.text(
      this.cameras.main.scrollX + 400,
      this.cameras.main.scrollY + 150,
      'All Eggs!',
      {
        fontSize: '32px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
        stroke: '#5D4037', strokeThickness: 4,
      },
    ).setOrigin(0.5).setDepth(300).setScale(0);

    this.tweens.add({
      targets: allEggsText,
      scale: { from: 0, to: 1.2 },
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: allEggsText,
          alpha: 0, y: allEggsText.y - 40,
          duration: 800, delay: 600,
          onComplete: () => allEggsText.destroy(),
        });
      },
    });

    // Golden sparkle burst
    const cx = this.cameras.main.scrollX + 720;
    const cy = this.cameras.main.scrollY + 20;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const p = this.add.circle(cx, cy, 3, 0xffd700, 0.9).setDepth(200);
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * 50,
        y: cy + Math.sin(angle) * 50,
        alpha: 0, scale: 0,
        duration: 500,
        onComplete: () => p.destroy(),
      });
    }

    // Pulse the egg counter gold
    this.eggCounter.setColor('#FFD700');
    this.tweens.add({
      targets: this.eggCounter,
      scale: { from: 1, to: 1.5 },
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });
  }

  private reachNest(): void {
    if (this.nestReached) return;
    this.nestReached = true;

    this.player.setVelocity(0, 0);
    this.player.body.allowGravity = false;
    SoundSystem.play('levelComplete');

    for (let i = 0; i < 20; i++) {
      this.time.delayedCall(i * 50, () => {
        this.spawnCollectParticles(
          this.nest.x + (Math.random() - 0.5) * 60,
          this.nest.y - 20,
        );
      });
    }

    const completeText = this.add.text(
      this.cameras.main.scrollX + 400,
      this.cameras.main.scrollY + 200,
      'Level Complete!',
      {
        fontSize: '36px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
        stroke: '#5D4037', strokeThickness: 4,
      },
    ).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.tweens.add({
      targets: completeText, alpha: 1,
      scale: { from: 0.5, to: 1 }, duration: 500, ease: 'Back.easeOut',
    });

    const eggText = this.add.text(
      this.cameras.main.scrollX + 400,
      this.cameras.main.scrollY + 250,
      `Eggs: ${this.collectedEggs}/${this.totalEggs}`,
      { fontSize: '24px', color: '#ffffff', fontFamily: 'Arial' },
    ).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.tweens.add({ targets: eggText, alpha: 1, duration: 500, delay: 300 });

    // Calculate medal
    const medal = ProgressSystem.completeLevelRun(
      this.currentLevelId,
      this.elapsedTime,
      this.collectedEggs,
      this.totalEggs,
      this.currentLevel.medalThresholds,
    );

    // Award XP: 1 per egg + medal bonus
    let xp = this.collectedEggs;
    if (medal === 'gold') xp += 2;
    else if (medal) xp += 1;
    if (xp > 0) ProgressSystem.addAnimalXP(ProgressSystem.state.currentAnimal, xp);

    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(500);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('HatchScene', {
          eggsCollected: this.collectedEggTypes,
          time: this.elapsedTime,
          animal: ProgressSystem.state.currentAnimal,
          perfectCollection: this.collectedEggs === this.totalEggs,
          levelId: this.currentLevelId,
          medal,
        });
      });
    });
  }

  update(_time: number, delta: number): void {
    if (this.nestReached || this.isPaused) return;

    // Update stopwatch
    this.elapsedTime += delta;
    const totalSec = Math.floor(this.elapsedTime / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timerText.setText(`${min}:${sec.toString().padStart(2, '0')}`);

    const ap = this.animalPhysics;
    const speed = ap.speed;
    const jumpVelocity = -320 * ap.jumpScale;
    const body = this.player.body;

    // Reset obstacle flags each frame (will be set by overlap checks)
    this.inWindZone = false;
    this.windForceX = 0;
    this.windForceY = 0;
    this.inPuddle = false;
    this.puddleSlowFactor = 1.0;

    // Check obstacle overlaps manually
    for (const wz of this.windZoneRects) {
      if (this.physics.overlap(this.player, wz.body)) {
        this.inWindZone = true;
        if (wz.direction === 'right') this.windForceX = wz.strength;
        else if (wz.direction === 'left') this.windForceX = -wz.strength;
        else if (wz.direction === 'up') this.windForceY = -wz.strength;
      }
    }
    for (const pd of this.puddleRects) {
      if (this.physics.overlap(this.player, pd.body)) {
        this.inPuddle = true;
        this.puddleSlowFactor = pd.slowFactor;
      }
    }

    const wasOnGround = this.isOnGround;
    this.isOnGround = body.blocked.down || body.touching.down;
    this.dashCooldown -= delta;
    this.trailTimer -= delta;

    // ── Landing dust puffs ──
    if (this.isOnGround && !wasOnGround) {
      this.spawnLandingDust();
      SoundSystem.play('land');
    }

    // ── Footstep particles while running ──
    this.footstepTimer -= delta;
    if (this.isOnGround && Math.abs(body.velocity.x) > 60 && this.footstepTimer <= 0) {
      this.footstepTimer = 180;
      const dustColor = 0xbcaaa4;
      const fp = this.add.circle(
        this.player.x + (this.facingRight ? -8 : 8) + (Math.random() - 0.5) * 6,
        this.player.y + 18,
        1.5 + Math.random(), dustColor, 0.35,
      ).setDepth(39);
      this.tweens.add({
        targets: fp, alpha: 0, y: fp.y - 6, scale: 1.5,
        duration: 250, onComplete: () => fp.destroy(),
      });
    }

    // ── Coyote time ──
    if (this.isOnGround) {
      this.coyoteTimer = this.COYOTE_MS;
      this.hasDoubleJumped = false;
      this.isGliding = false;
    } else {
      this.coyoteTimer -= delta;
    }

    this.jumpBufferTimer -= delta;

    // ── Horizontal movement ──
    const slideMultiplier = ap.canSlide ? 0.95 : 0.8; // Penguin slides more
    if (this.cursors.left.isDown || this.wasd.A.isDown || this.touchLeft) {
      body.setVelocityX(-speed);
      if (this.facingRight) { this.player.setFlipX(true); this.facingRight = false; }
    } else if (this.cursors.right.isDown || this.wasd.D.isDown || this.touchRight) {
      body.setVelocityX(speed);
      if (!this.facingRight) { this.player.setFlipX(false); this.facingRight = true; }
    } else {
      body.setVelocityX(body.velocity.x * slideMultiplier);
    }

    // ── Obstacle effects ──
    if (this.inPuddle) {
      body.setVelocityX(body.velocity.x * this.puddleSlowFactor);
    }
    if (this.inWindZone) {
      body.setVelocityX(body.velocity.x + this.windForceX);
      if (this.windForceY !== 0) {
        body.setVelocityY(body.velocity.y + this.windForceY);
      }
    }

    // ── Water slide boost ──
    this.slideParticleTimer -= delta;
    if (this.onSlide) {
      // Fish gets 3x speed on slides, others get 2x
      const slideMult = ap.canWaterBoost ? 3.0 : 2.0;
      const slideSpeed = Math.max(Math.abs(body.velocity.x), speed * slideMult);
      body.setVelocityX(this.slideDir * slideSpeed);
      body.setVelocityY(Math.max(body.velocity.y, 80)); // Gently push down too
      const goingRight = this.slideDir > 0;
      if (this.facingRight !== goingRight) {
        this.player.setFlipX(!goingRight);
        this.facingRight = goingRight;
      }

      // Water splash particles — big spray!
      if (this.slideParticleTimer <= 0) {
        this.slideParticleTimer = 40;
        const colors = [0x29b6f6, 0x4fc3f7, 0x81d4fa, 0xb3e5fc, 0xe1f5fe, 0xffffff];
        for (let i = 0; i < 5; i++) {
          const sp = this.add.circle(
            this.player.x + (Math.random() - 0.5) * 20,
            this.player.y + 8 + Math.random() * 10,
            1 + Math.random() * 2.5,
            Phaser.Utils.Array.GetRandom(colors),
            0.6 + Math.random() * 0.3,
          ).setDepth(45);
          this.tweens.add({
            targets: sp,
            x: sp.x - this.slideDir * (10 + Math.random() * 25),
            y: sp.y - 8 - Math.random() * 18,
            alpha: 0,
            scale: 0,
            duration: 250 + Math.random() * 200,
            onComplete: () => sp.destroy(),
          });
        }
      }
      this.onSlide = false;
    }

    // ── Jump detection ──
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.cursors.space)
      || Phaser.Input.Keyboard.JustDown(this.wasd.W)
      || this.touchJumpJustPressed;

    if (jumpPressed) {
      this.jumpBufferTimer = this.JUMP_BUFFER_MS;
    }

    const canCoyoteJump = this.coyoteTimer > 0;
    const hasBufferedJump = this.jumpBufferTimer > 0;

    // ── Cat wall jump: jump off walls + slow wall slide ──
    let wallJumped = false;
    if (ap.canWallJump && !this.isOnGround) {
      const onWall = body.blocked.left || body.blocked.right;
      // Slow wall slide when touching a wall and falling
      if (onWall && body.velocity.y > 0) {
        body.setVelocityY(Math.min(body.velocity.y, 60));
        if (this.trailTimer <= 0) {
          this.trailTimer = 100;
          const wallDir = body.blocked.left ? -1 : 1;
          const p = this.add.circle(
            this.player.x + wallDir * 14, this.player.y + Math.random() * 10,
            1.5, 0xff8c00, 0.5,
          ).setDepth(40);
          this.tweens.add({
            targets: p, alpha: 0, y: p.y + 12, duration: 300,
            onComplete: () => p.destroy(),
          });
        }
      }
      // Wall jump: push away from wall + jump
      if (jumpPressed && onWall) {
        const wallDir = body.blocked.left ? 1 : -1;
        body.setVelocityX(wallDir * speed * 1.3);
        body.setVelocityY(jumpVelocity * 0.85);
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        wallJumped = true;
        SoundSystem.play('wallJump');
        for (let i = 0; i < 5; i++) {
          const p = this.add.circle(
            this.player.x - wallDir * 14, this.player.y + (Math.random() - 0.5) * 20,
            2, 0xffd700, 0.6,
          ).setDepth(40);
          this.tweens.add({
            targets: p, alpha: 0, x: p.x - wallDir * 20, duration: 300,
            onComplete: () => p.destroy(),
          });
        }
      }
    }

    // Ground jump (with coyote time)
    if (!wallJumped && hasBufferedJump && canCoyoteJump) {
      body.setVelocityY(jumpVelocity);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.hasBounced = false;
      SoundSystem.play('jump');
    } else if (!wallJumped && jumpPressed && !canCoyoteJump && !this.hasDoubleJumped) {
      if (ap.canDoubleJump) {
        // Double jump
        body.setVelocityY(jumpVelocity * 0.85);
        this.hasDoubleJumped = true;
        SoundSystem.play('doubleJump');
        this.spawnDoubleJumpEffect();
      } else if (ap.canSpinBounce) {
        // Hedgehog spin bounce: full-power second jump with spin!
        body.setVelocityY(jumpVelocity * 1.0);
        this.hasDoubleJumped = true;
        SoundSystem.play('doubleJump');
        this.tweens.add({
          targets: this.player, angle: { from: 0, to: 360 },
          duration: 400, ease: 'Linear',
          onComplete: () => { this.player.angle = 0; },
        });
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const p = this.add.circle(this.player.x, this.player.y, 2.5, 0x795548, 0.6).setDepth(40);
          this.tweens.add({
            targets: p,
            x: p.x + Math.cos(angle) * 30, y: p.y + Math.sin(angle) * 30,
            alpha: 0, duration: 300, onComplete: () => p.destroy(),
          });
        }
      }
    }

    // Auto-execute buffered jump on landing
    if (this.isOnGround && !wasOnGround && hasBufferedJump) {
      body.setVelocityY(jumpVelocity);
      this.jumpBufferTimer = 0;
      this.hasBounced = false;
      SoundSystem.play('jump');
    }

    // ── Glide (bird, owl, unicorn, dragon): hold jump while falling to float ──
    const jumpHeld = this.cursors.up.isDown || this.cursors.space.isDown || this.wasd.W.isDown || this.touchJump;
    if (ap.canGlide && !this.isOnGround && jumpHeld && body.velocity.y > 0) {
      body.setVelocityY(Math.min(body.velocity.y, 50)); // Very slow fall
      this.isGliding = true;
      // Glide particles
      if (this.trailTimer <= 0) {
        this.trailTimer = 100;
        const p = this.add.circle(
          this.player.x + (Math.random() - 0.5) * 10,
          this.player.y + 10,
          2, 0xffffff, 0.4,
        ).setDepth(40);
        this.tweens.add({
          targets: p, alpha: 0, y: p.y + 15, scale: 0,
          duration: 400, onComplete: () => p.destroy(),
        });
      }
    } else {
      this.isGliding = false;
      // Variable jump height (release = shorter jump)
      if (!jumpHeld && body.velocity.y < -50) {
        body.setVelocityY(body.velocity.y * 0.92);
      }
    }

    // ── Dash (fox): press E to burst forward ──
    if (ap.canDash && (Phaser.Input.Keyboard.JustDown(this.abilityKey) || this.touchAbilityJustPressed) && this.dashCooldown <= 0) {
      const dir = this.facingRight ? 1 : -1;
      body.setVelocityX(dir * 400);
      this.dashCooldown = 800;
      SoundSystem.play('dash');
      // Dash effect
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 40, () => {
          const ghost = this.add.image(this.player.x, this.player.y, this.player.texture.key)
            .setScale(0.5).setAlpha(0.3).setDepth(40).setFlipX(!this.facingRight);
          this.tweens.add({
            targets: ghost, alpha: 0, duration: 300,
            onComplete: () => ghost.destroy(),
          });
        });
      }
    }

    // ── Slide momentum (penguin): keeps speed longer, accelerates downhill ──
    if (ap.canSlide && this.isOnGround && Math.abs(body.velocity.x) > 50) {
      // Slide sparkles
      if (this.trailTimer <= 0) {
        this.trailTimer = 150;
        const sp = this.add.circle(
          this.player.x, this.player.y + 20,
          2, 0xbbdefb, 0.5,
        ).setDepth(40);
        this.tweens.add({
          targets: sp, alpha: 0, scale: 0, duration: 300,
          onComplete: () => sp.destroy(),
        });
      }
    }

    // ── Hamster roll: press E to roll fast ──
    if (ap.canRoll) {
      this.rollCooldown -= delta;
      if ((Phaser.Input.Keyboard.JustDown(this.abilityKey) || this.touchAbilityJustPressed) && this.rollTimer <= 0 && this.rollCooldown <= 0) {
        this.rollTimer = 1500;
        SoundSystem.play('roll');
      }
      if (this.rollTimer > 0) {
        this.rollTimer -= delta;
        const rollSpeed = this.facingRight ? speed * 1.8 : -speed * 1.8;
        body.setVelocityX(rollSpeed);
        if (this.trailTimer <= 0) {
          this.trailTimer = 60;
          const p = this.add.circle(
            this.player.x, this.player.y + 12, 2, 0xffcc80, 0.5,
          ).setDepth(40);
          this.tweens.add({
            targets: p, alpha: 0, scale: 0, duration: 300,
            onComplete: () => p.destroy(),
          });
        }
        if (this.rollTimer <= 0) {
          this.rollCooldown = 1000;
        }
      }
    }

    // ── Turtle bounce: bounces once on landing ──
    if (ap.canBounce && this.isOnGround && !wasOnGround && !this.hasBounced) {
      this.hasBounced = true;
      body.setVelocityY(jumpVelocity * 0.45);
      SoundSystem.play('bounce');
      for (let i = 0; i < 4; i++) {
        const p = this.add.circle(
          this.player.x + (Math.random() - 0.5) * 20, this.player.y + 16,
          2, 0x4caf50, 0.6,
        ).setDepth(40);
        this.tweens.add({
          targets: p, alpha: 0, y: p.y + 15, scale: 0, duration: 300,
          onComplete: () => p.destroy(),
        });
      }
    }

    // ── Panda ground pound: press DOWN or ability key while airborne to slam down ──
    if (ap.canGroundPound) {
      const downPressed = this.cursors.down.isDown || this.wasd.S.isDown
        || Phaser.Input.Keyboard.JustDown(this.abilityKey) || this.touchAbilityJustPressed;
      if (!this.isOnGround && !this.groundPounding && downPressed && body.velocity.y > 0) {
        this.groundPounding = true;
        body.setVelocityY(500);
        body.setVelocityX(0);
      }
      if (this.groundPounding && this.isOnGround) {
        this.groundPounding = false;
        SoundSystem.play('groundPound');
        this.cameras.main.shake(200, 0.015);
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const p = this.add.circle(this.player.x, this.player.y + 16, 3, 0xffab40, 0.7).setDepth(40);
          this.tweens.add({
            targets: p,
            x: p.x + Math.cos(angle) * 60, y: p.y + Math.sin(angle) * 20,
            alpha: 0, scale: 0, duration: 400,
            onComplete: () => p.destroy(),
          });
        }
      }
    }

    // ── Puppy egg magnet: nearby eggs fly toward player ──
    if (ap.canMagnet) {
      this.eggs.children.iterate((child: any) => {
        if (!child || !child.active) return true;
        const egg = child as Phaser.Physics.Arcade.Sprite;
        const dx = egg.x - this.player.x;
        const dy = egg.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          this.collectEgg(egg);
        } else if (dist < 200) {
          if (Math.random() < 0.08) {
            const p = this.add.circle(
              egg.x + (Math.random() - 0.5) * 10,
              egg.y + (Math.random() - 0.5) * 10,
              1.5, 0xFFD700, 0.5,
            ).setDepth(40);
            this.tweens.add({
              targets: p,
              x: this.player.x + (Math.random() - 0.5) * 10,
              y: this.player.y + (Math.random() - 0.5) * 10,
              alpha: 0, duration: 300, onComplete: () => p.destroy(),
            });
          }
        }
        return true;
      });
    }

    // ── Owl egg radar: arrows pointing to nearby eggs ──
    if (ap.canEggRadar) {
      let arrowIdx = 0;
      this.eggs.children.iterate((child: any) => {
        if (!child || !child.active || arrowIdx >= this.eggRadarArrows.length) return true;
        const dx = child.x - this.player.x;
        const dy = child.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const arrow = this.eggRadarArrows[arrowIdx];
        if (dist > 50 && dist < 500) {
          const angle = Math.atan2(dy, dx);
          const arrowDist = Math.min(45, dist * 0.3);
          arrow.setPosition(
            this.player.x + Math.cos(angle) * arrowDist,
            this.player.y + Math.sin(angle) * arrowDist,
          );
          arrow.setRotation(angle);
          arrow.setVisible(true);
          arrow.setAlpha(Math.max(0.3, 1 - dist / 500));
          arrowIdx++;
        }
        return true;
      });
      for (let i = arrowIdx; i < this.eggRadarArrows.length; i++) {
        this.eggRadarArrows[i].setVisible(false);
      }
    }

    // ── Fish bubble trail on slides ──
    if (ap.canWaterBoost && (Math.abs(body.velocity.x) > speed * 1.5)) {
      if (this.trailTimer <= 0) {
        this.trailTimer = 80;
        const bubble = this.add.circle(
          this.player.x + (Math.random() - 0.5) * 10,
          this.player.y - 5 - Math.random() * 10,
          1.5 + Math.random() * 2, 0x81d4fa, 0.5,
        ).setDepth(40);
        this.tweens.add({
          targets: bubble, alpha: 0, y: bubble.y - 15, scale: 1.5,
          duration: 500, onComplete: () => bubble.destroy(),
        });
      }
    }

    // ── Mouse speed ghost trail ──
    if (ap.isTiny && Math.abs(body.velocity.x) > 100) {
      if (this.trailTimer <= 0) {
        this.trailTimer = 60;
        const ghost = this.add.image(this.player.x, this.player.y, this.player.texture.key)
          .setScale(0.35).setAlpha(0.2).setDepth(39).setFlipX(!this.facingRight);
        this.tweens.add({
          targets: ghost, alpha: 0, duration: 200,
          onComplete: () => ghost.destroy(),
        });
      }
    }

    // ── Rainbow trail (unicorn) ──
    if (ProgressSystem.state.currentAnimal === 'unicorn' && (Math.abs(body.velocity.x) > 50 || !this.isOnGround)) {
      if (this.trailTimer <= 0) {
        this.trailTimer = 80;
        const rainbowColors = [0xff4081, 0xff9020, 0xffe040, 0x60e080, 0x40c0ff, 0xb080ff];
        const rc = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
        const rp = this.add.circle(
          this.player.x - (this.facingRight ? 8 : -8),
          this.player.y + 5 + Math.random() * 10,
          2.5, rc, 0.6,
        ).setDepth(40);
        this.tweens.add({
          targets: rp, alpha: 0, scale: 0, duration: 500,
          onComplete: () => rp.destroy(),
        });
      }
    }

    // ── Fire trail (dragon) ──
    if (ProgressSystem.state.currentAnimal === 'dragon' && !this.isOnGround) {
      if (this.trailTimer <= 0) {
        this.trailTimer = 60;
        const fireColors = [0xff6e40, 0xffab40, 0xffd740];
        const fc = fireColors[Math.floor(Math.random() * fireColors.length)];
        const fp = this.add.circle(
          this.player.x + (Math.random() - 0.5) * 10,
          this.player.y + 15,
          2 + Math.random() * 2, fc, 0.6,
        ).setDepth(40);
        this.tweens.add({
          targets: fp, alpha: 0, scale: 0, y: fp.y + 10,
          duration: 350, onComplete: () => fp.destroy(),
        });
      }
    }

    // ── Squash/stretch (skip for tiny mouse, adjust for rolling hamster) ──
    const baseScale = ap.isTiny ? 0.35 : 0.5;
    if (ap.canRoll && this.rollTimer > 0) {
      this.player.setScale(baseScale * 0.85, baseScale * 0.85);
      this.player.angle += (this.facingRight ? 15 : -15);
    } else if (this.groundPounding) {
      this.player.setScale(baseScale * 0.8, baseScale * 1.15);
    } else if (this.isOnGround) {
      this.player.angle = 0;
      if (Math.abs(body.velocity.x) > 10) {
        this.player.setScale(baseScale * 1.02, baseScale * 0.96);
        this.idleTimer = 0;
      } else {
        // Idle breathing animation
        this.idleTimer += delta;
        const breathe = Math.sin(this.idleTimer * 0.003) * 0.03;
        this.player.setScale(baseScale + breathe, baseScale - breathe * 0.5);
      }
    } else if (this.isGliding) {
      this.player.setScale(baseScale * 1.1, baseScale * 0.92);
    } else {
      this.player.angle = 0;
      if (body.velocity.y < 0) {
        this.player.setScale(baseScale * 0.92, baseScale * 1.08);
      } else {
        this.player.setScale(baseScale * 1.06, baseScale * 0.94);
      }
    }

    // Respawn if fell
    if (this.player.y > this.physics.world.bounds.height + 50) {
      this.player.setPosition(
        this.currentLevel.playerStart.x * TILE_SIZE,
        this.currentLevel.playerStart.y * TILE_SIZE,
      );
      this.player.setVelocity(0, 0);
    }

    // Reset touch just-pressed flags at end of frame
    this.touchJumpJustPressed = false;
    this.touchAbilityJustPressed = false;
  }

  private spawnDoubleJumpEffect(): void {
    const x = this.player.x;
    const y = this.player.y + 16;
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(
        x + (Math.random() - 0.5) * 20, y, 2.5, 0xffffff, 0.8,
      ).setDepth(50);
      this.tweens.add({
        targets: p,
        y: y + 20 + Math.random() * 15,
        alpha: 0, scale: 0, duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnLandingDust(): void {
    const x = this.player.x;
    const y = this.player.y + 18;
    const dustColors = [0xbcaaa4, 0xd7ccc8, 0xa1887f];
    for (let i = 0; i < 8; i++) {
      const dir = (i < 4) ? -1 : 1;
      const dc = dustColors[Math.floor(Math.random() * dustColors.length)];
      const p = this.add.circle(
        x + dir * (2 + Math.random() * 4), y,
        1.5 + Math.random() * 1.5, dc, 0.45,
      ).setDepth(39);
      this.tweens.add({
        targets: p,
        x: p.x + dir * (8 + Math.random() * 14),
        y: p.y - 3 - Math.random() * 6,
        alpha: 0, scale: 0.3,
        duration: 250 + Math.random() * 150,
        onComplete: () => p.destroy(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  //  PAUSE MENU
  // ═══════════════════════════════════════════════════════

  private togglePause(): void {
    if (this.nestReached) return;
    this.isPaused = !this.isPaused;
    SoundSystem.play('pause');

    if (this.isPaused) {
      this.physics.pause();
      this.tweens.pauseAll();

      const container = this.add.container(0, 0).setScrollFactor(0).setDepth(500);
      this.pauseOverlay = container;

      // Dim overlay
      const dim = this.add.rectangle(400, 250, 800, 500, 0x000000, 0.6);
      container.add(dim);

      // Title
      const title = this.add.text(400, 140, 'PAUSED', {
        fontSize: '40px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
        stroke: '#5D4037', strokeThickness: 4,
      }).setOrigin(0.5);
      container.add(title);

      // Resume button
      const resumeBg = this.add.rectangle(400, 230, 200, 50, 0x4caf50, 0.9).setInteractive({ useHandCursor: true });
      const resumeTxt = this.add.text(400, 230, 'Resume', {
        fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add([resumeBg, resumeTxt]);
      resumeBg.on('pointerdown', () => this.togglePause());

      // Restart button
      const restartBg = this.add.rectangle(400, 300, 200, 50, 0xff9800, 0.9).setInteractive({ useHandCursor: true });
      const restartTxt = this.add.text(400, 300, 'Restart', {
        fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add([restartBg, restartTxt]);
      restartBg.on('pointerdown', () => {
        this.isPaused = false;
        this.physics.resume();
        this.tweens.resumeAll();
        this.scene.restart();
      });

      // Quit button
      const quitBg = this.add.rectangle(400, 370, 200, 50, 0xf44336, 0.9).setInteractive({ useHandCursor: true });
      const quitTxt = this.add.text(400, 370, 'Quit', {
        fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add([quitBg, quitTxt]);
      quitBg.on('pointerdown', () => {
        this.isPaused = false;
        this.physics.resume();
        this.tweens.resumeAll();
        this.scene.start('TitleScene');
      });
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
      if (this.pauseOverlay) {
        this.pauseOverlay.destroy();
        this.pauseOverlay = undefined;
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  //  CITY LIFE — lots of animated background activity
  // ═══════════════════════════════════════════════════════

  private spawnCityLife(): void {
    // ── Birds: flocks flying across the sky ──
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        // Spawn a small flock (3-5 birds together)
        const flockY = 20 + Math.random() * 80;
        const goRight = Math.random() > 0.3;
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const bird = this.add.image(
            (goRight ? -30 : 830) + (Math.random() - 0.5) * 30,
            flockY + (Math.random() - 0.5) * 20,
            'prop_flybird',
          ).setScrollFactor(0.08).setScale(0.4 + Math.random() * 0.3).setAlpha(0.5 + Math.random() * 0.3).setDepth(-5);
          if (!goRight) bird.setFlipX(true);
          this.tweens.add({
            targets: bird,
            x: goRight ? 850 : -50,
            y: bird.y + (Math.random() - 0.5) * 30,
            duration: 5000 + Math.random() * 4000,
            delay: i * 200,
            onComplete: () => bird.destroy(),
          });
        }
      },
    });

    // ── Clouds drifting (multiple layers) ──
    for (let i = 0; i < 6; i++) {
      const cloudR = 10 + Math.random() * 18;
      const cloud = this.add.circle(
        Math.random() * 900, 15 + Math.random() * 70,
        cloudR, 0xffffff, 0.15 + Math.random() * 0.2,
      ).setScrollFactor(0.02 + Math.random() * 0.05).setDepth(-12);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 150 + Math.random() * 200,
        duration: 25000 + Math.random() * 20000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Cars: frequent traffic in both directions ──
    const carColors = ['prop_car', 'prop_car2'];
    // Lane 1 (faster, upper road)
    this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.4;
        const car = this.add.image(right ? -60 : 860, 466, Phaser.Utils.Array.GetRandom(carColors))
          .setScrollFactor(0.25).setDepth(-3).setScale(0.425);
        if (!right) car.setFlipX(true);
        this.tweens.add({
          targets: car, x: right ? 860 : -60,
          duration: 3500 + Math.random() * 2000,
          onComplete: () => car.destroy(),
        });
      },
    });
    // Lane 2 (slower, lower road)
    this.time.addEvent({
      delay: 3000, startAt: 1200,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.6;
        const car = this.add.image(right ? -60 : 860, 478, Phaser.Utils.Array.GetRandom(carColors))
          .setScrollFactor(0.25).setDepth(-3).setScale(0.35).setAlpha(0.85);
        if (!right) car.setFlipX(true);
        this.tweens.add({
          targets: car, x: right ? 860 : -60,
          duration: 4500 + Math.random() * 2500,
          onComplete: () => car.destroy(),
        });
      },
    });
    // Lane 3 (occasional fast car)
    this.time.addEvent({
      delay: 5000, startAt: 3000,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const car = this.add.image(right ? -60 : 860, 472, Phaser.Utils.Array.GetRandom(carColors))
          .setScrollFactor(0.25).setDepth(-3).setScale(0.375).setTint(0xffeb3b); // yellow taxi
        if (!right) car.setFlipX(true);
        this.tweens.add({
          targets: car, x: right ? 860 : -60,
          duration: 2500 + Math.random() * 1500,
          onComplete: () => car.destroy(),
        });
      },
    });

    // ── People walking: multiple streams ──
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const py = 445 + Math.random() * 10;
        const person = this.add.image(right ? -20 : 820, py, 'prop_person')
          .setScrollFactor(0.2).setDepth(-4).setScale(0.25 + Math.random() * 0.1).setAlpha(0.4 + Math.random() * 0.2);
        if (!right) person.setFlipX(true);
        // Random tint to make people look different
        const tints = [0xffffff, 0xffccbc, 0xc5cae9, 0xffe0b2, 0xb2dfdb, 0xf8bbd0, 0xd1c4e9];
        person.setTint(Phaser.Utils.Array.GetRandom(tints));
        this.tweens.add({
          targets: person, x: right ? 820 : -20,
          duration: 8000 + Math.random() * 6000,
          onComplete: () => person.destroy(),
        });
      },
    });
    // Second stream of people (different pace)
    this.time.addEvent({
      delay: 3500, startAt: 1500,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const person = this.add.image(right ? -20 : 820, 448, 'prop_person')
          .setScrollFactor(0.18).setDepth(-4).setScale(0.225).setAlpha(0.35);
        if (!right) person.setFlipX(true);
        const tints = [0xffffff, 0xffe082, 0x80cbc4, 0xef9a9a, 0xce93d8];
        person.setTint(Phaser.Utils.Array.GetRandom(tints));
        this.tweens.add({
          targets: person, x: right ? 820 : -20,
          duration: 10000 + Math.random() * 5000,
          onComplete: () => person.destroy(),
        });
      },
    });

    // ── Street lamps with warm glow ──
    for (let i = 0; i < 8; i++) {
      const lx = 50 + i * 100;
      this.add.image(lx, 435, 'prop_lamp')
        .setScrollFactor(0.25).setDepth(-2).setScale(0.4);

      // Warm glow halo
      const glow = this.add.circle(lx, 420, 12, 0xfff9c4, 0.12)
        .setScrollFactor(0.25).setDepth(-2);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.12, to: 0.04 },
        scale: { from: 1, to: 1.4 },
        duration: 2500 + Math.random() * 1500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Light cone below lamp
      const cone = this.add.circle(lx, 455, 16, 0xfff9c4, 0.04)
        .setScrollFactor(0.25).setDepth(-2);
      this.tweens.add({
        targets: cone,
        alpha: { from: 0.04, to: 0.01 },
        duration: 3000, yoyo: true, repeat: -1,
      });
    }

    // ── Floating balloons (occasional) ──
    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => {
        const bx = 100 + Math.random() * 600;
        const colors = [0xff4081, 0x40c4ff, 0xffeb3b, 0x69f0ae, 0xff6e40, 0xb388ff];
        const color = Phaser.Utils.Array.GetRandom(colors);
        const balloon = this.add.circle(bx, 500, 6, color, 0.7)
          .setScrollFactor(0.15).setDepth(-6);
        // String
        const str = this.add.line(0, 0, bx, 506, bx + 2, 520, 0x999999, 0.3)
          .setScrollFactor(0.15).setDepth(-6);
        this.tweens.add({
          targets: [balloon, str],
          y: '-=550',
          x: `+=${(Math.random() - 0.5) * 100}`,
          duration: 12000 + Math.random() * 5000,
          onComplete: () => { balloon.destroy(); str.destroy(); },
        });
      },
    });

    // ── Pigeons on ground that bob around ──
    for (let i = 0; i < 5; i++) {
      const px = 100 + Math.random() * 600;
      const pigeon = this.add.circle(px, 458, 3, 0x78909c, 0.4)
        .setScrollFactor(0.22).setDepth(-3);
      // Pecking/hopping animation
      this.tweens.add({
        targets: pigeon,
        y: pigeon.y - 3,
        x: pigeon.x + (Math.random() - 0.5) * 40,
        duration: 600 + Math.random() * 400,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }

    // ── Window lights flickering (in building area) ──
    for (let i = 0; i < 15; i++) {
      const wx = 50 + Math.random() * 700;
      const wy = 200 + Math.random() * 200;
      const win = this.add.rectangle(wx, wy, 4, 5, 0xfff9c4, 0.15 + Math.random() * 0.2)
        .setScrollFactor(0.3).setDepth(-8);
      // Random flicker
      this.tweens.add({
        targets: win,
        alpha: { from: win.alpha, to: 0.05 },
        duration: 3000 + Math.random() * 5000,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 4000,
      });
    }

    // ── Smoke/steam wisps from buildings ──
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        const sx = 100 + Math.random() * 600;
        const smoke = this.add.circle(sx, 250, 4, 0xeeeeee, 0.15)
          .setScrollFactor(0.3).setDepth(-9);
        this.tweens.add({
          targets: smoke,
          y: smoke.y - 60,
          x: smoke.x + (Math.random() - 0.5) * 30,
          alpha: 0,
          scale: 3,
          duration: 4000,
          onComplete: () => smoke.destroy(),
        });
      },
    });

    // ── Leaves/debris blowing in wind ──
    this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        const ly = 100 + Math.random() * 350;
        const leafColors = [0x8bc34a, 0xcddc39, 0xff9800, 0x795548];
        const leaf = this.add.circle(-10, ly, 1.5,
          Phaser.Utils.Array.GetRandom(leafColors), 0.4,
        ).setScrollFactor(0.15).setDepth(-7);
        this.tweens.add({
          targets: leaf,
          x: 820,
          y: ly + Math.sin(Math.random() * 6) * 60,
          duration: 6000 + Math.random() * 4000,
          onComplete: () => leaf.destroy(),
        });
      },
    });

    // ── Helicopters flying across ──
    this.time.addEvent({
      delay: 12000, startAt: 4000,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const hy = 30 + Math.random() * 60;
        const heliBody = this.add.rectangle(
          right ? -40 : 840, hy, 22, 10, 0x546e7a, 0.5,
        ).setScrollFactor(0.06).setDepth(-11);
        // Rotor (spinning line)
        const rotor = this.add.rectangle(
          heliBody.x, hy - 7, 28, 2, 0x90a4ae, 0.4,
        ).setScrollFactor(0.06).setDepth(-11);
        // Tail
        const tail = this.add.rectangle(
          heliBody.x + (right ? -14 : 14), hy, 12, 4, 0x455a64, 0.4,
        ).setScrollFactor(0.06).setDepth(-11);
        const destX = right ? 860 : -60;
        const dur = 8000 + Math.random() * 4000;
        [heliBody, rotor, tail].forEach(part => {
          this.tweens.add({
            targets: part, x: destX + (part.x - heliBody.x),
            duration: dur, onComplete: () => part.destroy(),
          });
        });
        // Rotor spin
        this.tweens.add({
          targets: rotor,
          scaleX: { from: 1, to: -1 },
          duration: 100, yoyo: true, repeat: Math.floor(dur / 200),
        });
      },
    });

    // ── Airplanes high in the sky ──
    this.time.addEvent({
      delay: 20000, startAt: 8000,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const ay = 10 + Math.random() * 30;
        const plane = this.add.triangle(
          right ? -30 : 830, ay,
          0, 4, 16, 0, 16, 8,
          0xb0bec5, 0.3,
        ).setScrollFactor(0.03).setDepth(-14);
        if (!right) plane.setScale(-1, 1);
        // Contrail
        const trailDots: Phaser.GameObjects.Arc[] = [];
        const trailEvent = this.time.addEvent({
          delay: 200, repeat: 30,
          callback: () => {
            const td = this.add.circle(plane.x, plane.y + 2, 1, 0xffffff, 0.15)
              .setScrollFactor(0.03).setDepth(-15);
            trailDots.push(td);
            this.tweens.add({
              targets: td, alpha: 0, scale: 3, duration: 3000,
              onComplete: () => td.destroy(),
            });
          },
        });
        this.tweens.add({
          targets: plane, x: right ? 860 : -60,
          duration: 15000 + Math.random() * 5000,
          onComplete: () => { plane.destroy(); trailEvent.destroy(); },
        });
      },
    });

    // ── Big fluffy cloud layers (multiple depths) ──
    for (let layer = 0; layer < 3; layer++) {
      const sf = 0.02 + layer * 0.03;
      const a = 0.12 - layer * 0.02;
      const yBase = 20 + layer * 25;
      for (let i = 0; i < 4; i++) {
        const cx = Math.random() * 900;
        const cy = yBase + Math.random() * 20;
        const r = 14 + Math.random() * 20;
        // Multi-circle cloud shape
        const c1 = this.add.circle(cx, cy, r, 0xffffff, a).setScrollFactor(sf).setDepth(-13 - layer);
        const c2 = this.add.circle(cx - r * 0.6, cy + 3, r * 0.7, 0xffffff, a * 0.8).setScrollFactor(sf).setDepth(-13 - layer);
        const c3 = this.add.circle(cx + r * 0.6, cy + 2, r * 0.75, 0xffffff, a * 0.9).setScrollFactor(sf).setDepth(-13 - layer);
        const drift = 80 + Math.random() * 120;
        [c1, c2, c3].forEach(c => {
          this.tweens.add({
            targets: c, x: `+=${drift}`,
            duration: 30000 + Math.random() * 20000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        });
      }
    }

    // ── Hot air balloons (slow, majestic) ──
    this.time.addEvent({
      delay: 25000, startAt: 2000,
      loop: true,
      callback: () => {
        const bx = 100 + Math.random() * 600;
        const by = 480;
        const colors = [0xff5252, 0x448aff, 0xffab40, 0x69f0ae, 0xea80fc];
        const col = Phaser.Utils.Array.GetRandom(colors);
        // Balloon envelope (big circle)
        const envelope = this.add.circle(bx, by, 10, col, 0.45)
          .setScrollFactor(0.08).setDepth(-10);
        // Basket (small rectangle below)
        const basket = this.add.rectangle(bx, by + 16, 6, 4, 0x795548, 0.4)
          .setScrollFactor(0.08).setDepth(-10);
        // Ropes
        const rope1 = this.add.line(0, 0, bx - 3, by + 10, bx - 2, by + 14, 0x999999, 0.25)
          .setScrollFactor(0.08).setDepth(-10);
        const rope2 = this.add.line(0, 0, bx + 3, by + 10, bx + 2, by + 14, 0x999999, 0.25)
          .setScrollFactor(0.08).setDepth(-10);
        const parts = [envelope, basket, rope1, rope2];
        const xDrift = (Math.random() - 0.5) * 150;
        parts.forEach(p => {
          this.tweens.add({
            targets: p,
            y: '-=560', x: `+=${xDrift}`,
            duration: 20000 + Math.random() * 10000,
            onComplete: () => p.destroy(),
          });
        });
        // Gentle sway
        this.tweens.add({
          targets: parts,
          x: `+=${15}`,
          duration: 3000, yoyo: true, repeat: 8,
          ease: 'Sine.easeInOut',
        });
      },
    });

    // ── Butterflies (small, colorful, fluttery) ──
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        const bx = Math.random() * 800;
        const by = 100 + Math.random() * 300;
        const bColors = [0xff80ab, 0xffff00, 0x80d8ff, 0xb9f6ca, 0xea80fc];
        const bc = Phaser.Utils.Array.GetRandom(bColors);
        const bf = this.add.circle(bx, by, 2, bc, 0.5)
          .setScrollFactor(0.12).setDepth(-5);
        // Erratic fluttery path
        const path: { x: number; y: number }[] = [];
        let px = bx; let py = by;
        for (let s = 0; s < 6; s++) {
          px += (Math.random() - 0.5) * 80;
          py += (Math.random() - 0.5) * 40;
          path.push({ x: px, y: py });
        }
        let step = 0;
        const moveNext = () => {
          if (step >= path.length) { bf.destroy(); return; }
          this.tweens.add({
            targets: bf,
            x: path[step].x, y: path[step].y,
            duration: 800 + Math.random() * 600,
            ease: 'Sine.easeInOut',
            onComplete: () => { step++; moveNext(); },
          });
        };
        moveNext();
        // Wing flap (scale pulse)
        this.tweens.add({
          targets: bf,
          scaleX: { from: 1, to: 0.3 },
          duration: 150, yoyo: true, repeat: 20,
        });
      },
    });

    // ── Kites bobbing in the wind ──
    for (let i = 0; i < 3; i++) {
      const kx = 150 + i * 250 + Math.random() * 80;
      const ky = 60 + Math.random() * 50;
      const kColors = [0xff4081, 0x40c4ff, 0xffeb3b, 0x69f0ae];
      const kc = Phaser.Utils.Array.GetRandom(kColors);
      // Diamond shape kite
      const kite = this.add.triangle(kx, ky, 0, 6, 5, 0, 10, 6, kc, 0.5)
        .setScrollFactor(0.1).setDepth(-8);
      // Kite tail (wavy line segments)
      const tailSegs: Phaser.GameObjects.Arc[] = [];
      for (let s = 0; s < 4; s++) {
        const seg = this.add.circle(kx, ky + 10 + s * 6, 1, kc, 0.3)
          .setScrollFactor(0.1).setDepth(-8);
        tailSegs.push(seg);
      }
      // Bob in wind
      this.tweens.add({
        targets: [kite, ...tailSegs],
        x: `+=${20 + Math.random() * 30}`,
        y: `-=${5 + Math.random() * 10}`,
        duration: 2000 + Math.random() * 1500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      // Extra tail wobble
      tailSegs.forEach((seg, idx) => {
        this.tweens.add({
          targets: seg,
          x: `+=${3 + idx * 2}`,
          duration: 400 + idx * 100,
          yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut',
          delay: idx * 80,
        });
      });
    }

    // ── Twinkling stars in upper sky ──
    for (let i = 0; i < 20; i++) {
      const sx = Math.random() * 800;
      const sy = Math.random() * 60;
      const star = this.add.circle(sx, sy, 0.8 + Math.random() * 0.5, 0xffffff, 0.08 + Math.random() * 0.15)
        .setScrollFactor(0.01).setDepth(-16);
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: 0.02 },
        duration: 1500 + Math.random() * 2000,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 3000,
      });
    }

    // ── Shooting stars (rare, fast) ──
    this.time.addEvent({
      delay: 15000 + Math.random() * 10000,
      loop: true,
      callback: () => {
        const sx = Math.random() * 400;
        const sy = Math.random() * 40;
        const ss = this.add.circle(sx, sy, 1.5, 0xffffff, 0.6)
          .setScrollFactor(0.01).setDepth(-15);
        this.tweens.add({
          targets: ss,
          x: sx + 200 + Math.random() * 200,
          y: sy + 40 + Math.random() * 30,
          alpha: 0,
          duration: 600 + Math.random() * 400,
          onComplete: () => ss.destroy(),
        });
        // Trail sparkles
        for (let t = 0; t < 5; t++) {
          this.time.delayedCall(t * 60, () => {
            const tp = this.add.circle(ss.x, ss.y, 0.8, 0xffffff, 0.3)
              .setScrollFactor(0.01).setDepth(-15);
            this.tweens.add({
              targets: tp, alpha: 0, scale: 0, duration: 400,
              onComplete: () => tp.destroy(),
            });
          });
        }
      },
    });

    // ── Flags/banners on buildings ──
    for (let i = 0; i < 6; i++) {
      const fx = 80 + i * 120 + Math.random() * 40;
      const fy = 180 + Math.random() * 100;
      const flagColors = [0xff4081, 0x2196f3, 0xffeb3b, 0x4caf50, 0xff9800];
      const fc = Phaser.Utils.Array.GetRandom(flagColors);
      // Pole
      this.add.rectangle(fx, fy, 1.5, 16, 0x9e9e9e, 0.4)
        .setScrollFactor(0.3).setDepth(-7);
      // Flag (small rectangle that waves)
      const flag = this.add.rectangle(fx + 6, fy - 5, 10, 6, fc, 0.4)
        .setScrollFactor(0.3).setDepth(-7);
      this.tweens.add({
        targets: flag,
        scaleX: { from: 0.8, to: 1.2 },
        scaleY: { from: 1, to: 0.85 },
        duration: 600 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Neon signs blinking on buildings ──
    const signColors = [0xff1744, 0x00e5ff, 0xffea00, 0x76ff03];
    for (let i = 0; i < 4; i++) {
      const nx = 120 + i * 180 + Math.random() * 60;
      const ny = 230 + Math.random() * 80;
      const nc = Phaser.Utils.Array.GetRandom(signColors);
      const neon = this.add.rectangle(nx, ny, 14 + Math.random() * 10, 5, nc, 0.2)
        .setScrollFactor(0.3).setDepth(-7);
      // Neon blink pattern
      this.tweens.add({
        targets: neon,
        alpha: { from: 0.2, to: 0.05 },
        duration: 200,
        yoyo: true, repeat: 1,
        delay: Math.random() * 5000,
        onComplete: () => {
          // Stay on for a while, then blink again
          this.tweens.add({
            targets: neon,
            alpha: { from: 0.2, to: 0.08 },
            duration: 2000 + Math.random() * 3000,
            yoyo: true, repeat: -1,
          });
        },
      });
      // Glow around neon
      const neonGlow = this.add.rectangle(nx, ny, 20 + Math.random() * 10, 10, nc, 0.05)
        .setScrollFactor(0.3).setDepth(-7.5);
      this.tweens.add({
        targets: neonGlow,
        alpha: { from: 0.05, to: 0.01 },
        duration: 2500, yoyo: true, repeat: -1,
      });
    }

    // ── Cats sitting in windows ──
    for (let i = 0; i < 3; i++) {
      const wx = 100 + i * 260 + Math.random() * 80;
      const wy = 220 + Math.random() * 120;
      // Window frame
      this.add.rectangle(wx, wy, 8, 8, 0xfff9c4, 0.2)
        .setScrollFactor(0.3).setDepth(-7.5);
      // Cat silhouette (small dark circle with ears)
      const catBody = this.add.circle(wx, wy + 1, 2.5, 0x37474f, 0.3)
        .setScrollFactor(0.3).setDepth(-7);
      const ear1 = this.add.triangle(wx - 2, wy - 2, 0, 3, 1.5, 0, 3, 3, 0x37474f, 0.3)
        .setScrollFactor(0.3).setDepth(-7);
      const ear2 = this.add.triangle(wx + 2, wy - 2, 0, 3, 1.5, 0, 3, 3, 0x37474f, 0.3)
        .setScrollFactor(0.3).setDepth(-7);
      // Cat head bob (looking around)
      this.tweens.add({
        targets: [catBody, ear1, ear2],
        x: `+=${2}`,
        duration: 2000 + Math.random() * 2000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Math.random() * 3000,
      });
    }

    // ── Paper airplanes ──
    this.time.addEvent({
      delay: 10000, startAt: 6000,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const py = 80 + Math.random() * 150;
        const paper = this.add.triangle(
          right ? -15 : 815, py,
          0, 3, 12, 0, 8, 6,
          0xffffff, 0.35,
        ).setScrollFactor(0.1).setDepth(-6);
        if (!right) paper.setScale(-1, 1);
        // Wobble while flying
        this.tweens.add({
          targets: paper,
          y: `+=${(Math.random() - 0.5) * 60}`,
          rotation: right ? 0.3 : -0.3,
          duration: 2000, yoyo: true, repeat: 3,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: paper,
          x: right ? 820 : -20,
          duration: 7000 + Math.random() * 4000,
          onComplete: () => paper.destroy(),
        });
      },
    });

    // ── Drones with blinking lights ──
    this.time.addEvent({
      delay: 18000, startAt: 10000,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const dy = 40 + Math.random() * 40;
        const drone = this.add.rectangle(
          right ? -20 : 820, dy, 8, 4, 0x455a64, 0.4,
        ).setScrollFactor(0.07).setDepth(-10);
        // Blinking red light
        const light = this.add.circle(drone.x, dy - 3, 1.5, 0xff1744, 0.6)
          .setScrollFactor(0.07).setDepth(-10);
        this.tweens.add({
          targets: light, alpha: { from: 0.6, to: 0.1 },
          duration: 300, yoyo: true, repeat: -1,
        });
        const destX = right ? 840 : -40;
        const dur = 10000 + Math.random() * 5000;
        [drone, light].forEach(p => {
          this.tweens.add({
            targets: p, x: destX + (p.x - drone.x),
            y: dy + Math.sin(Math.random() * 3) * 15,
            duration: dur, onComplete: () => p.destroy(),
          });
        });
      },
    });

    // ── Cherry blossom petals (seasonal touch) ──
    this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        const px = Math.random() * 850;
        const petalColors = [0xf8bbd0, 0xf48fb1, 0xfce4ec, 0xffffff];
        const pc = Phaser.Utils.Array.GetRandom(petalColors);
        const petal = this.add.circle(px, -5, 1.5 + Math.random(), pc, 0.3 + Math.random() * 0.15)
          .setScrollFactor(0.08 + Math.random() * 0.06).setDepth(-6);
        // Gentle floating descent with sway
        const swayAmt = 40 + Math.random() * 60;
        this.tweens.add({
          targets: petal,
          y: 510,
          x: px + (Math.random() - 0.5) * swayAmt,
          rotation: Math.random() * 6,
          duration: 5000 + Math.random() * 4000,
          onComplete: () => petal.destroy(),
        });
      },
    });

    // ── Bicycle riders (faster than walkers) ──
    this.time.addEvent({
      delay: 6000, startAt: 3000,
      loop: true,
      callback: () => {
        const right = Math.random() > 0.5;
        const bike = this.add.image(right ? -30 : 830, 455, 'prop_person')
          .setScrollFactor(0.22).setDepth(-3).setScale(0.275).setAlpha(0.4)
          .setTint(0xb3e5fc);
        if (!right) bike.setFlipX(true);
        this.tweens.add({
          targets: bike, x: right ? 830 : -30,
          duration: 4000 + Math.random() * 2000,
          onComplete: () => bike.destroy(),
        });
      },
    });

    // ── Fireflies (soft glowing dots that wander) ──
    for (let i = 0; i < 8; i++) {
      const fx = 50 + Math.random() * 700;
      const fy = 150 + Math.random() * 250;
      const ff = this.add.circle(fx, fy, 1.5, 0xffff00, 0.08 + Math.random() * 0.12)
        .setScrollFactor(0.15).setDepth(-5);
      // Random wandering
      const wander = () => {
        this.tweens.add({
          targets: ff,
          x: ff.x + (Math.random() - 0.5) * 60,
          y: ff.y + (Math.random() - 0.5) * 40,
          alpha: 0.05 + Math.random() * 0.15,
          duration: 2000 + Math.random() * 2000,
          ease: 'Sine.easeInOut',
          onComplete: () => { if (ff.active) wander(); },
        });
      };
      this.time.delayedCall(Math.random() * 3000, () => wander());
    }

    // ── Satellite (tiny slow dot across upper sky) ──
    this.time.addEvent({
      delay: 30000, startAt: 15000,
      loop: true,
      callback: () => {
        const sat = this.add.circle(-5, 5 + Math.random() * 15, 0.8, 0xffffff, 0.25)
          .setScrollFactor(0.01).setDepth(-16);
        this.tweens.add({
          targets: sat, x: 810, y: 10 + Math.random() * 20,
          duration: 20000,
          onComplete: () => sat.destroy(),
        });
      },
    });

    // ── Confetti bursts (occasional celebration feel) ──
    this.time.addEvent({
      delay: 20000, startAt: 12000,
      loop: true,
      callback: () => {
        const cx = 200 + Math.random() * 400;
        const cy = 120 + Math.random() * 100;
        const confettiColors = [0xff4081, 0x40c4ff, 0xffeb3b, 0x69f0ae, 0xff6e40, 0xb388ff, 0xff80ab];
        for (let c = 0; c < 15; c++) {
          const cc = Phaser.Utils.Array.GetRandom(confettiColors);
          const piece = this.add.rectangle(
            cx, cy,
            1 + Math.random() * 2, 2 + Math.random() * 3,
            cc, 0.4,
          ).setScrollFactor(0.12).setDepth(-5);
          this.tweens.add({
            targets: piece,
            x: cx + (Math.random() - 0.5) * 80,
            y: cy + 30 + Math.random() * 60,
            rotation: Math.random() * 8,
            alpha: 0,
            duration: 1500 + Math.random() * 1000,
            onComplete: () => piece.destroy(),
          });
        }
      },
    });
  }
}
