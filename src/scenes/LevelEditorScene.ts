import Phaser from 'phaser';
import { LevelData } from '../data/levels';
import { SoundSystem } from '../systems/SoundSystem';

const TILE_SIZE = 32;
const TOOLBAR_HEIGHT = 56;
const GRID_WIDTH = 50;
const GRID_HEIGHT = 16;
const STORAGE_KEY = 'deedee_custom_level';

type EditMode = 'tile' | 'player' | 'nest' | 'egg';

export class LevelEditorScene extends Phaser.Scene {
  private levelData!: LevelData;
  private editMode: EditMode = 'tile';
  private selectedTileType = 1;
  private tileSprites: Phaser.GameObjects.Sprite[] = [];
  private markerSprites: Phaser.GameObjects.GameObject[] = [];
  private cursorGfx!: Phaser.GameObjects.Graphics;
  private isDirty = false;
  private saveTimer = 0;
  private isPainting = false;
  private toolbarContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'LevelEditorScene' });
  }

  create(): void {
    this.loadOrCreateLevel();

    const worldW = GRID_WIDTH * TILE_SIZE;
    const worldH = GRID_HEIGHT * TILE_SIZE;
    this.cameras.main.setBounds(-100, -100, worldW + 200, worldH + 200);
    this.cameras.main.setScroll(0, 0);

    // Sky background (parallax behind grid)
    const bg1 = this.add.image(worldW / 2, worldH / 2, 'bg_sky').setDepth(-2);
    bg1.setDisplaySize(worldW, worldH);
    const bg2 = this.add.image(worldW / 2, worldH / 2, 'bg_hills').setDepth(-1);
    bg2.setDisplaySize(worldW, worldH).setAlpha(0.5);

    // Grid lines
    const gridGfx = this.add.graphics().setDepth(0);
    gridGfx.lineStyle(1, 0x37474f, 0.3);
    for (let x = 0; x <= GRID_WIDTH; x++) gridGfx.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, worldH);
    for (let y = 0; y <= GRID_HEIGHT; y++) gridGfx.lineBetween(0, y * TILE_SIZE, worldW, y * TILE_SIZE);
    gridGfx.lineStyle(2, 0x546e7a, 0.4);
    for (let x = 0; x <= GRID_WIDTH; x += 5) gridGfx.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, worldH);
    for (let y = 0; y <= GRID_HEIGHT; y += 5) gridGfx.lineBetween(0, y * TILE_SIZE, worldW, y * TILE_SIZE);

    // Cursor marker
    this.cursorGfx = this.add.graphics().setDepth(50);

    // Render level
    this.renderLevel();

    // Toolbar
    this.buildToolbar();

    // Input
    this.setupInput();

    this.cameras.main.fadeIn(400);
  }

  private loadOrCreateLevel(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.levelData = JSON.parse(saved);
        if (!this.levelData.tiles || this.levelData.tiles.length !== GRID_HEIGHT) throw new Error('bad');
      } catch {
        this.createDefaultLevel();
      }
    } else {
      this.createDefaultLevel();
    }
  }

  private createDefaultLevel(): void {
    const tiles: number[][] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      tiles[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (y === 13) tiles[y][x] = 1;
        else if (y >= 14) tiles[y][x] = 2;
        else tiles[y][x] = 0;
      }
    }
    this.levelData = {
      id: 99,
      name: 'My Level',
      theme: 'rooftop',
      tiles,
      playerStart: { x: 2, y: 12 },
      nest: { x: 47, y: 12 },
      eggSpawnPoints: [
        { x: 12, y: 12, difficulty: 'easy' },
        { x: 25, y: 12, difficulty: 'medium' },
        { x: 38, y: 12, difficulty: 'hard' },
      ],
      waterSlides: [],
      medalThresholds: { gold: 45, silver: 75, bronze: 120 },
    };
  }

  private renderLevel(): void {
    // Clear old sprites
    this.tileSprites.forEach(s => s.destroy());
    this.tileSprites = [];
    this.markerSprites.forEach(m => (m as any).destroy());
    this.markerSprites = [];

    // Tiles
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = this.levelData.tiles[y][x];
        if (tile === 0) continue;
        let key: string;
        switch (tile) {
          case 1: key = 'tile_grass'; break;
          case 2: key = 'tile_dirt'; break;
          case 3: key = 'tile_stone'; break;
          case 4: key = 'tile_platform'; break;
          default: continue;
        }
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = tile === 4 ? y * TILE_SIZE + 6 : y * TILE_SIZE + TILE_SIZE / 2;
        const s = this.add.sprite(px, py, key).setScale(0.5).setDepth(1);
        this.tileSprites.push(s);
      }
    }

    // Player start marker
    const ps = this.levelData.playerStart;
    const pc = this.add.circle(ps.x * TILE_SIZE + 16, ps.y * TILE_SIZE + 16, 12, 0x4caf50, 0.8).setDepth(2).setStrokeStyle(2, 0x2e7d32);
    const pt = this.add.text(ps.x * TILE_SIZE + 16, ps.y * TILE_SIZE + 16, 'P', { fontSize: '12px', color: '#fff', fontStyle: 'bold', fontFamily: 'Arial' }).setOrigin(0.5).setDepth(3);
    this.markerSprites.push(pc, pt);

    // Nest marker
    const ns = this.levelData.nest;
    const nc = this.add.circle(ns.x * TILE_SIZE + 16, ns.y * TILE_SIZE + 16, 12, 0xffd700, 0.8).setDepth(2).setStrokeStyle(2, 0xff8f00);
    const nt = this.add.text(ns.x * TILE_SIZE + 16, ns.y * TILE_SIZE + 16, 'N', { fontSize: '12px', color: '#000', fontStyle: 'bold', fontFamily: 'Arial' }).setOrigin(0.5).setDepth(3);
    this.markerSprites.push(nc, nt);

    // Egg markers
    for (const egg of this.levelData.eggSpawnPoints) {
      const col = egg.difficulty === 'easy' ? 0x81c784 : egg.difficulty === 'medium' ? 0xffd54f : 0xff6b6b;
      const ec = this.add.circle(egg.x * TILE_SIZE + 16, egg.y * TILE_SIZE + 16, 7, col, 0.9).setDepth(2).setStrokeStyle(1, 0xffffff);
      this.markerSprites.push(ec);
    }
  }

  private buildToolbar(): void {
    this.toolbarContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Background bar
    const bg = this.add.rectangle(400, TOOLBAR_HEIGHT / 2, 800, TOOLBAR_HEIGHT, 0x1a1a2e, 0.92);
    this.toolbarContainer.add(bg);

    // Mode buttons with icons
    const modeY = TOOLBAR_HEIGHT / 2;
    const modes: { mode: EditMode; label: string; icon: string; x: number; color: number }[] = [
      { mode: 'tile', label: 'Tiles', icon: 'tile_grass', x: 40, color: 0x42a5f5 },
      { mode: 'player', label: 'Start', icon: 'animal_bunny', x: 110, color: 0x66bb6a },
      { mode: 'nest', label: 'Nest', icon: 'nest', x: 175, color: 0xffca28 },
      { mode: 'egg', label: 'Eggs', icon: 'egg_golden', x: 240, color: 0xff7043 },
    ];

    for (const m of modes) {
      const active = this.editMode === m.mode;
      const btnBg = this.add.rectangle(m.x, modeY, 58, 36, active ? m.color : 0x37474f)
        .setStrokeStyle(active ? 2 : 1, active ? 0xffffff : 0x455a64);
      const iconImg = this.add.image(m.x - 12, modeY, m.icon).setScale(0.225);
      const btnTxt = this.add.text(m.x + 12, modeY, m.label, {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.toolbarContainer.add([btnBg, iconImg, btnTxt]);

      const zone = this.add.zone(m.x, modeY, 58, 36).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
      const mode = m.mode;
      const color = m.color;
      zone.on('pointerdown', () => { SoundSystem.play('buttonClick'); this.editMode = mode; this.rebuildToolbar(); });
      zone.on('pointerover', () => btnBg.setFillStyle(color, 0.8));
      zone.on('pointerout', () => btnBg.setFillStyle(active ? color : 0x37474f));
    }

    // Tile palette with actual tile textures (only in tile mode)
    if (this.editMode === 'tile') {
      const sep = this.add.rectangle(285, modeY, 1, 36, 0x546e7a, 0.5);
      this.toolbarContainer.add(sep);

      const tileTypes: { type: number; texture: string | null; label: string }[] = [
        { type: 0, texture: null, label: 'Erase' },
        { type: 1, texture: 'tile_grass', label: 'Grass' },
        { type: 2, texture: 'tile_dirt', label: 'Dirt' },
        { type: 3, texture: 'tile_stone', label: 'Wall' },
        { type: 4, texture: 'tile_platform', label: 'Ledge' },
      ];

      for (let i = 0; i < tileTypes.length; i++) {
        const t = tileTypes[i];
        const tx = 318 + i * 40;
        const active = this.selectedTileType === t.type;
        const tileBg = this.add.rectangle(tx, modeY, 34, 34, active ? 0x546e7a : 0x263238)
          .setStrokeStyle(active ? 2 : 1, active ? 0xffffff : 0x455a64);
        this.toolbarContainer.add(tileBg);

        if (t.texture) {
          const tileImg = this.add.image(tx, modeY, t.texture).setScale(0.45);
          this.toolbarContainer.add(tileImg);
        } else {
          // Erase: draw X
          const xTxt = this.add.text(tx, modeY, 'X', {
            fontSize: '16px', color: '#ef5350', fontFamily: 'Arial', fontStyle: 'bold',
          }).setOrigin(0.5);
          this.toolbarContainer.add(xTxt);
        }

        // Tooltip label below
        const tipTxt = this.add.text(tx, modeY + 22, t.label, {
          fontSize: '7px', color: '#90a4ae', fontFamily: 'Arial',
        }).setOrigin(0.5);
        this.toolbarContainer.add(tipTxt);

        const zone = this.add.zone(tx, modeY, 34, 34).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
        const tileType = t.type;
        zone.on('pointerdown', () => { SoundSystem.play('buttonClick'); this.selectedTileType = tileType; this.rebuildToolbar(); });
        zone.on('pointerover', () => tileBg.setFillStyle(0x455a64));
        zone.on('pointerout', () => tileBg.setFillStyle(active ? 0x546e7a : 0x263238));
      }
    }

    // Separator before action buttons
    const sep2 = this.add.rectangle(555, modeY, 1, 36, 0x546e7a, 0.5);
    this.toolbarContainer.add(sep2);

    // Action buttons
    const actions: { label: string; x: number; color: number; onClick: () => void }[] = [
      { label: 'Test', x: 590, color: 0x8e24aa, onClick: () => this.playTest() },
      { label: 'Export', x: 650, color: 0x1565c0, onClick: () => this.exportLevel() },
      { label: 'Import', x: 710, color: 0x00838f, onClick: () => this.importLevel() },
      { label: 'Back', x: 770, color: 0x546e7a, onClick: () => this.goBack() },
    ];
    for (const a of actions) {
      this.createTextButton(a.label, a.x, 52, 26, a.color, a.onClick);
    }
  }

  private createTextButton(label: string, x: number, w: number, h: number, color: number, onClick: () => void): void {
    const modeY = TOOLBAR_HEIGHT / 2;
    const btnBg = this.add.rectangle(x, modeY, w, h, 0x37474f)
      .setStrokeStyle(1, 0x455a64);
    const btnTxt = this.add.text(x, modeY, label, {
      fontSize: '11px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.toolbarContainer.add([btnBg, btnTxt]);

    const zone = this.add.zone(x, modeY, w, h).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => { SoundSystem.play('buttonClick'); onClick(); });
    zone.on('pointerover', () => btnBg.setFillStyle(color, 0.8));
    zone.on('pointerout', () => btnBg.setFillStyle(0x37474f));
  }

  private rebuildToolbar(): void {
    this.toolbarContainer.destroy();
    this.buildToolbar();
  }

  private setupInput(): void {
    // Click/tap to place
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < TOOLBAR_HEIGHT) return;
      this.isPainting = true;
      this.handlePaint(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPainting && pointer.isDown && this.editMode === 'tile') {
        this.handlePaint(pointer);
      }
    });

    this.input.on('pointerup', () => { this.isPainting = false; });

    // Camera pan with right-click drag or two-finger
    let dragX = 0, dragY = 0;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        dragX = pointer.x; dragY = pointer.y;
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.cameras.main.scrollX -= (pointer.x - dragX);
        this.cameras.main.scrollY -= (pointer.y - dragY);
        dragX = pointer.x; dragY = pointer.y;
      }
    });

    // Keyboard shortcuts
    this.input.keyboard!.on('keydown-ONE', () => { this.selectedTileType = 1; this.editMode = 'tile'; this.rebuildToolbar(); });
    this.input.keyboard!.on('keydown-TWO', () => { this.selectedTileType = 2; this.editMode = 'tile'; this.rebuildToolbar(); });
    this.input.keyboard!.on('keydown-THREE', () => { this.selectedTileType = 3; this.editMode = 'tile'; this.rebuildToolbar(); });
    this.input.keyboard!.on('keydown-FOUR', () => { this.selectedTileType = 4; this.editMode = 'tile'; this.rebuildToolbar(); });
    this.input.keyboard!.on('keydown-ZERO', () => { this.selectedTileType = 0; this.editMode = 'tile'; this.rebuildToolbar(); });
    this.input.keyboard!.on('keydown-SPACE', () => this.playTest());
    this.input.keyboard!.on('keydown-ESC', () => this.goBack());
  }

  private handlePaint(pointer: Phaser.Input.Pointer): void {
    const tileX = Math.floor(pointer.worldX / TILE_SIZE);
    const tileY = Math.floor(pointer.worldY / TILE_SIZE);
    if (tileX < 0 || tileX >= GRID_WIDTH || tileY < 0 || tileY >= GRID_HEIGHT) return;

    switch (this.editMode) {
      case 'tile':
        if (this.levelData.tiles[tileY][tileX] !== this.selectedTileType) {
          this.levelData.tiles[tileY][tileX] = this.selectedTileType;
          this.isDirty = true;
          this.saveTimer = 500;
          this.renderLevel();
        }
        break;
      case 'player':
        this.levelData.playerStart = { x: tileX, y: tileY };
        this.isDirty = true;
        this.saveTimer = 500;
        this.renderLevel();
        break;
      case 'nest':
        this.levelData.nest = { x: tileX, y: tileY };
        this.isDirty = true;
        this.saveTimer = 500;
        this.renderLevel();
        break;
      case 'egg': {
        const idx = this.levelData.eggSpawnPoints.findIndex(e => e.x === tileX && e.y === tileY);
        if (idx >= 0) {
          this.levelData.eggSpawnPoints.splice(idx, 1);
        } else {
          // Cycle difficulty based on count
          const diffs: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
          const d = diffs[this.levelData.eggSpawnPoints.length % 3];
          this.levelData.eggSpawnPoints.push({ x: tileX, y: tileY, difficulty: d });
        }
        this.isDirty = true;
        this.saveTimer = 500;
        this.renderLevel();
        break;
      }
    }
  }

  private saveLevelToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.levelData));
      this.isDirty = false;
      const txt = this.add.text(400, TOOLBAR_HEIGHT + 25, 'Saved!', {
        fontSize: '16px', color: '#4caf50', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 15, duration: 800, onComplete: () => txt.destroy() });
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  private exportLevel(): void {
    this.saveLevelToStorage();
    const json = JSON.stringify(this.levelData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.levelData.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const txt = this.add.text(400, TOOLBAR_HEIGHT + 25, 'Exported!', {
      fontSize: '16px', color: '#4fc3f7', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 15, duration: 800, onComplete: () => txt.destroy() });
  }

  private importLevel(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as LevelData;
          if (!data.tiles || !Array.isArray(data.tiles) || !data.playerStart || !data.nest) {
            throw new Error('Invalid level format');
          }
          this.levelData = {
            id: data.id ?? 99,
            name: data.name || 'Imported Level',
            theme: data.theme || 'rooftop',
            tiles: data.tiles,
            playerStart: data.playerStart,
            nest: data.nest,
            eggSpawnPoints: data.eggSpawnPoints || [],
            waterSlides: data.waterSlides || [],
            medalThresholds: data.medalThresholds || { gold: 45, silver: 75, bronze: 120 },
          };
          this.isDirty = true;
          this.saveLevelToStorage();
          this.renderLevel();
          this.rebuildToolbar();

          const txt = this.add.text(400, TOOLBAR_HEIGHT + 25, 'Imported!', {
            fontSize: '16px', color: '#69f0ae', fontFamily: 'Arial', fontStyle: 'bold',
          }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
          this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 15, duration: 800, onComplete: () => txt.destroy() });
        } catch {
          const txt = this.add.text(400, TOOLBAR_HEIGHT + 25, 'Invalid file!', {
            fontSize: '16px', color: '#ef5350', fontFamily: 'Arial', fontStyle: 'bold',
          }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
          this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 15, duration: 800, onComplete: () => txt.destroy() });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private playTest(): void {
    this.saveLevelToStorage();
    SoundSystem.play('buttonClick');
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { customLevel: this.levelData });
    });
  }

  private goBack(): void {
    if (this.isDirty) this.saveLevelToStorage();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TitleScene');
    });
  }

  update(_time: number, delta: number): void {
    // Auto-save
    if (this.saveTimer > 0) {
      this.saveTimer -= delta;
      if (this.saveTimer <= 0 && this.isDirty) this.saveLevelToStorage();
    }

    // Camera keyboard pan
    const speed = 6;
    const cursors = this.input.keyboard!.createCursorKeys();
    if (cursors.left.isDown) this.cameras.main.scrollX -= speed;
    if (cursors.right.isDown) this.cameras.main.scrollX += speed;
    if (cursors.up.isDown) this.cameras.main.scrollY -= speed;
    if (cursors.down.isDown) this.cameras.main.scrollY += speed;

    // Cursor highlight
    const pointer = this.input.activePointer;
    this.cursorGfx.clear();
    if (pointer.y > TOOLBAR_HEIGHT) {
      const tileX = Math.floor(pointer.worldX / TILE_SIZE);
      const tileY = Math.floor(pointer.worldY / TILE_SIZE);
      if (tileX >= 0 && tileX < GRID_WIDTH && tileY >= 0 && tileY < GRID_HEIGHT) {
        const colors: Record<EditMode, number> = { tile: 0x42a5f5, player: 0x66bb6a, nest: 0xffca28, egg: 0xff7043 };
        this.cursorGfx.lineStyle(2, colors[this.editMode], 0.8);
        this.cursorGfx.strokeRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.cursorGfx.fillStyle(colors[this.editMode], 0.15);
        this.cursorGfx.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}
