// Generates all game textures procedurally
// Animals use Canvas2D for realistic rendering (see animalRenderer.ts)
// Everything else uses Phaser Graphics

import { ANIMALS } from '../data/animals';
import { renderAnimalToPhaser } from './animalRenderer';

function makeGfx(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setVisible(false);
}

export function generateAssets(scene: Phaser.Scene): void {
  generateTiles(scene);
  // Animals via Canvas2D renderer
  for (const animal of Object.values(ANIMALS)) {
    renderAnimalToPhaser(scene, animal.id, animal.color, animal.accentColor);
  }
  generateEggSprites(scene);
  generateNestSprite(scene);
  generateParticleSprite(scene);
  generateBackgroundLayers(scene);
  generateCityProps(scene);
}

// ─── CITY TILES ──────────────────────────────────────────

function generateTiles(scene: Phaser.Scene): void {
  const S = 64; // 2× resolution

  // Sidewalk (64×64)
  const sideGfx = makeGfx(scene);
  sideGfx.fillStyle(0xd7ccc8);
  sideGfx.fillRect(0, 0, S, S);
  sideGfx.lineStyle(2, 0xbcaaa4, 0.5);
  sideGfx.lineBetween(0, 0, S, 0);
  sideGfx.lineBetween(S / 2, 0, S / 2, S);
  sideGfx.fillStyle(0xcbbeb5, 0.3);
  sideGfx.fillCircle(16, 20, 4);
  sideGfx.fillCircle(48, 44, 3);
  sideGfx.generateTexture('tile_grass', S, S);
  sideGfx.destroy();

  // Foundation bricks (64×64)
  const foundGfx = makeGfx(scene);
  foundGfx.fillStyle(0x5d4037);
  foundGfx.fillRect(0, 0, S, S);
  foundGfx.lineStyle(2, 0x4e342e, 0.6);
  foundGfx.lineBetween(0, 16, S, 16);
  foundGfx.lineBetween(0, 32, S, 32);
  foundGfx.lineBetween(0, 48, S, 48);
  foundGfx.lineBetween(20, 0, 20, 16);
  foundGfx.lineBetween(44, 16, 44, 32);
  foundGfx.lineBetween(20, 32, 20, 48);
  foundGfx.generateTexture('tile_dirt', S, S);
  foundGfx.destroy();

  // Brick wall (64×64)
  const brickGfx = makeGfx(scene);
  brickGfx.fillStyle(0xc62828);
  brickGfx.fillRect(0, 0, S, S);
  brickGfx.lineStyle(2, 0x8e0000, 0.7);
  brickGfx.lineBetween(0, 16, S, 16);
  brickGfx.lineBetween(0, 32, S, 32);
  brickGfx.lineBetween(0, 48, S, 48);
  brickGfx.lineBetween(32, 0, 32, 16);
  brickGfx.lineBetween(16, 16, 16, 32);
  brickGfx.lineBetween(48, 32, 48, 48);
  brickGfx.fillStyle(0xd32f2f, 0.3);
  brickGfx.fillRect(4, 4, 24, 8);
  brickGfx.fillRect(36, 20, 20, 8);
  brickGfx.generateTexture('tile_stone', S, S);
  brickGfx.destroy();

  // Awning platform (64×28)
  const awningGfx = makeGfx(scene);
  awningGfx.fillStyle(0xe53935);
  awningGfx.fillRoundedRect(0, 0, S, 28, 6);
  awningGfx.fillStyle(0xffffff);
  for (let x = 8; x < S; x += 16) {
    awningGfx.fillRect(x, 0, 8, 28);
  }
  awningGfx.fillStyle(0xc62828);
  awningGfx.fillRoundedRect(0, 20, S, 8, 4);
  awningGfx.fillStyle(0x000000, 0.12);
  awningGfx.fillRect(0, 24, S, 4);
  awningGfx.generateTexture('tile_platform', S, 28);
  awningGfx.destroy();
}

// ─── EGGS (Canvas2D for smooth ovals) ────────────────────

function generateEggSprites(scene: Phaser.Scene): void {
  const eggs: { key: string; colors: [string, string, string] }[] = [
    { key: 'egg_white', colors: ['#fafafa', '#e8e0ee', '#fff'] },
    { key: 'egg_golden', colors: ['#ffd740', '#ffab00', '#fff8c0'] },
    { key: 'egg_rainbow', colors: ['#ff69b4', '#9c4dff', '#40e0ff'] },
    { key: 'egg_pink', colors: ['#f48fb1', '#e91e63', '#fce4ec'] },
    { key: 'egg_blue', colors: ['#64b5f6', '#1565c0', '#e3f2fd'] },
    { key: 'egg_green', colors: ['#81c784', '#2e7d32', '#e8f5e9'] },
    { key: 'egg_spotted', colors: ['#ffcc80', '#e65100', '#fff3e0'] },
  ];

  for (const egg of eggs) {
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 56;
    const ctx = c.getContext('2d')!;
    ctx.scale(2, 2);
    const cx = 10, cy = 14;

    // Egg shape with gradient
    const grad = ctx.createRadialGradient(cx - 2, cy - 4, 2, cx, cy, 13);
    grad.addColorStop(0, egg.colors[2]);
    grad.addColorStop(0.5, egg.colors[0]);
    grad.addColorStop(1, egg.colors[1]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Egg-shaped bezier (wider at bottom)
    ctx.moveTo(cx, 2);
    ctx.bezierCurveTo(cx + 9, 2, cx + 10, cy, cx + 9, cy + 6);
    ctx.bezierCurveTo(cx + 8, cy + 12, cx + 4, 27, cx, 27);
    ctx.bezierCurveTo(cx - 4, 27, cx - 8, cy + 12, cx - 9, cy + 6);
    ctx.bezierCurveTo(cx - 10, cy, cx - 9, 2, cx, 2);
    ctx.fill();

    // Spots (more prominent for spotted egg)
    const isSpotted = egg.key === 'egg_spotted';
    const spotAlpha = isSpotted ? 'cc' : '60';
    ctx.fillStyle = egg.colors[1] + spotAlpha;
    ctx.beginPath();
    ctx.arc(cx - 3, cy + 4, isSpotted ? 2.5 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4, cy, isSpotted ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 1, cy + 8, isSpotted ? 2 : 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (isSpotted) {
      ctx.beginPath();
      ctx.arc(cx + 2, cy - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 5, cy + 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight shine
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 5, 3, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    if (scene.textures.exists(egg.key)) scene.textures.remove(egg.key);
    scene.textures.addCanvas(egg.key, c);
  }

  // Cracked egg
  const cc = document.createElement('canvas');
  cc.width = 40;
  cc.height = 56;
  const cctx = cc.getContext('2d')!;
  cctx.scale(2, 2);
  cctx.fillStyle = '#f0f0f0';
  cctx.beginPath();
  cctx.ellipse(10, 20, 9, 8, 0, 0, Math.PI * 2);
  cctx.fill();
  // Jagged top
  cctx.strokeStyle = '#bbb';
  cctx.lineWidth = 1.5;
  cctx.beginPath();
  cctx.moveTo(2, 14);
  cctx.lineTo(5, 17);
  cctx.lineTo(8, 12);
  cctx.lineTo(11, 16);
  cctx.lineTo(14, 11);
  cctx.lineTo(17, 15);
  cctx.stroke();
  if (scene.textures.exists('egg_cracked')) scene.textures.remove('egg_cracked');
  scene.textures.addCanvas('egg_cracked', cc);
}

// ─── NEST ────────────────────────────────────────────────

function generateNestSprite(scene: Phaser.Scene): void {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 72;
  const ctx = c.getContext('2d')!;
  ctx.scale(2, 2);
  const cx = 32;

  // Nest bowl
  const grad = ctx.createRadialGradient(cx, 26, 4, cx, 28, 28);
  grad.addColorStop(0, '#6d4c41');
  grad.addColorStop(1, '#8d6e63');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, 28, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sticks (curved lines)
  ctx.strokeStyle = '#a1887f';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const sx = 8 + i * 10;
    ctx.moveTo(sx, 24 + Math.sin(i) * 3);
    ctx.quadraticCurveTo(sx + 5, 20 + Math.cos(i) * 4, sx + 10, 24 + Math.sin(i + 1) * 3);
    ctx.stroke();
  }

  // Straw
  ctx.strokeStyle = '#ffd54f80';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, 22);
  ctx.lineTo(14, 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(50, 22);
  ctx.lineTo(56, 16);
  ctx.stroke();

  // Inner shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, 26, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Small eggs
  ctx.fillStyle = '#fff9c4';
  ctx.beginPath();
  ctx.ellipse(26, 24, 3, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(38, 23, 3, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  if (scene.textures.exists('nest')) scene.textures.remove('nest');
  scene.textures.addCanvas('nest', c);
}

// ─── PARTICLES ───────────────────────────────────────────

function generateParticleSprite(scene: Phaser.Scene): void {
  const gfx = makeGfx(scene);
  gfx.fillStyle(0xffffff);
  gfx.fillCircle(3, 3, 3);
  gfx.generateTexture('particle', 6, 6);
  gfx.destroy();

  const sg = makeGfx(scene);
  sg.fillStyle(0xffd700);
  sg.fillTriangle(5, 0, 3, 10, 7, 10);
  sg.fillTriangle(0, 3, 10, 3, 5, 8);
  sg.generateTexture('particle_star', 10, 10);
  sg.destroy();
}

// ─── CITY PROPS (for animated background) ────────────────

function generateCityProps(scene: Phaser.Scene): void {
  // Car (side view) — 96×48
  const carC = document.createElement('canvas');
  carC.width = 96;
  carC.height = 48;
  const carCtx = carC.getContext('2d')!;
  carCtx.scale(2, 2);
  // Body
  carCtx.fillStyle = '#e53935';
  carCtx.beginPath();
  carCtx.roundRect(2, 8, 44, 12, 4);
  carCtx.fill();
  // Roof
  carCtx.fillStyle = '#c62828';
  carCtx.beginPath();
  carCtx.roundRect(12, 2, 22, 8, [4, 4, 0, 0]);
  carCtx.fill();
  // Windows
  carCtx.fillStyle = '#bbdefb';
  carCtx.beginPath();
  carCtx.roundRect(14, 3, 8, 5, 2);
  carCtx.fill();
  carCtx.beginPath();
  carCtx.roundRect(24, 3, 8, 5, 2);
  carCtx.fill();
  // Wheels
  carCtx.fillStyle = '#333';
  carCtx.beginPath();
  carCtx.arc(12, 20, 4, 0, Math.PI * 2);
  carCtx.fill();
  carCtx.beginPath();
  carCtx.arc(36, 20, 4, 0, Math.PI * 2);
  carCtx.fill();
  // Hubcaps
  carCtx.fillStyle = '#999';
  carCtx.beginPath();
  carCtx.arc(12, 20, 1.5, 0, Math.PI * 2);
  carCtx.fill();
  carCtx.beginPath();
  carCtx.arc(36, 20, 1.5, 0, Math.PI * 2);
  carCtx.fill();
  // Headlight
  carCtx.fillStyle = '#fff9c4';
  carCtx.beginPath();
  carCtx.arc(45, 13, 2, 0, Math.PI * 2);
  carCtx.fill();
  if (scene.textures.exists('prop_car')) scene.textures.remove('prop_car');
  scene.textures.addCanvas('prop_car', carC);

  // Blue car variant — 96×48
  const car2C = document.createElement('canvas');
  car2C.width = 96;
  car2C.height = 48;
  const car2Ctx = car2C.getContext('2d')!;
  car2Ctx.scale(2, 2);
  car2Ctx.fillStyle = '#1e88e5';
  car2Ctx.beginPath();
  car2Ctx.roundRect(2, 8, 44, 12, 4);
  car2Ctx.fill();
  car2Ctx.fillStyle = '#1565c0';
  car2Ctx.beginPath();
  car2Ctx.roundRect(12, 2, 22, 8, [4, 4, 0, 0]);
  car2Ctx.fill();
  car2Ctx.fillStyle = '#bbdefb';
  car2Ctx.beginPath();
  car2Ctx.roundRect(14, 3, 8, 5, 2);
  car2Ctx.fill();
  car2Ctx.beginPath();
  car2Ctx.roundRect(24, 3, 8, 5, 2);
  car2Ctx.fill();
  car2Ctx.fillStyle = '#333';
  car2Ctx.beginPath();
  car2Ctx.arc(12, 20, 4, 0, Math.PI * 2);
  car2Ctx.fill();
  car2Ctx.beginPath();
  car2Ctx.arc(36, 20, 4, 0, Math.PI * 2);
  car2Ctx.fill();
  car2Ctx.fillStyle = '#999';
  car2Ctx.beginPath();
  car2Ctx.arc(12, 20, 1.5, 0, Math.PI * 2);
  car2Ctx.fill();
  car2Ctx.beginPath();
  car2Ctx.arc(36, 20, 1.5, 0, Math.PI * 2);
  car2Ctx.fill();
  car2Ctx.fillStyle = '#fff9c4';
  car2Ctx.beginPath();
  car2Ctx.arc(45, 13, 2, 0, Math.PI * 2);
  car2Ctx.fill();
  if (scene.textures.exists('prop_car2')) scene.textures.remove('prop_car2');
  scene.textures.addCanvas('prop_car2', car2C);

  // Person silhouette (walking) — 32×64
  const personC = document.createElement('canvas');
  personC.width = 32;
  personC.height = 64;
  const pCtx = personC.getContext('2d')!;
  pCtx.scale(2, 2);
  pCtx.fillStyle = '#455a64';
  // Head
  pCtx.beginPath();
  pCtx.arc(8, 5, 4, 0, Math.PI * 2);
  pCtx.fill();
  // Body
  pCtx.beginPath();
  pCtx.roundRect(5, 9, 6, 12, 2);
  pCtx.fill();
  // Legs
  pCtx.beginPath();
  pCtx.roundRect(4, 20, 3, 10, 1);
  pCtx.fill();
  pCtx.beginPath();
  pCtx.roundRect(9, 20, 3, 10, 1);
  pCtx.fill();
  if (scene.textures.exists('prop_person')) scene.textures.remove('prop_person');
  scene.textures.addCanvas('prop_person', personC);

  // Flying bird (simple V shape) — 32×20
  const birdC = document.createElement('canvas');
  birdC.width = 32;
  birdC.height = 20;
  const bCtx = birdC.getContext('2d')!;
  bCtx.scale(2, 2);
  bCtx.strokeStyle = '#37474f';
  bCtx.lineWidth = 1.5;
  bCtx.lineCap = 'round';
  bCtx.beginPath();
  bCtx.moveTo(1, 5);
  bCtx.quadraticCurveTo(4, 1, 8, 4);
  bCtx.quadraticCurveTo(12, 1, 15, 5);
  bCtx.stroke();
  if (scene.textures.exists('prop_flybird')) scene.textures.remove('prop_flybird');
  scene.textures.addCanvas('prop_flybird', birdC);

  // Street lamp — 24×96
  const lampC = document.createElement('canvas');
  lampC.width = 24;
  lampC.height = 96;
  const lCtx = lampC.getContext('2d')!;
  lCtx.scale(2, 2);
  // Pole
  lCtx.fillStyle = '#546e7a';
  lCtx.beginPath();
  lCtx.roundRect(4, 12, 4, 36, 1);
  lCtx.fill();
  // Lamp top
  lCtx.fillStyle = '#37474f';
  lCtx.beginPath();
  lCtx.roundRect(1, 8, 10, 6, 2);
  lCtx.fill();
  // Glow
  lCtx.fillStyle = 'rgba(255,245,180,0.7)';
  lCtx.beginPath();
  lCtx.arc(6, 11, 3, 0, Math.PI * 2);
  lCtx.fill();
  // Base
  lCtx.fillStyle = '#546e7a';
  lCtx.beginPath();
  lCtx.roundRect(2, 44, 8, 4, 1);
  lCtx.fill();
  if (scene.textures.exists('prop_lamp')) scene.textures.remove('prop_lamp');
  scene.textures.addCanvas('prop_lamp', lampC);
}

// ─── CITY BACKGROUND ─────────────────────────────────────

function generateBackgroundLayers(scene: Phaser.Scene): void {
  const W = 800, H = 500;

  // ── Sky ──
  const skyC = document.createElement('canvas');
  skyC.width = W;
  skyC.height = H;
  const skyCtx = skyC.getContext('2d')!;

  // Gradient sky
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#e3f2fd');
  skyGrad.addColorStop(0.3, '#90caf9');
  skyGrad.addColorStop(0.6, '#64b5f6');
  skyGrad.addColorStop(1, '#42a5f5');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, W, H);

  // Sun with radial glow
  const sunGrad = skyCtx.createRadialGradient(650, 80, 5, 650, 80, 70);
  sunGrad.addColorStop(0, 'rgba(255,253,220,1)');
  sunGrad.addColorStop(0.3, 'rgba(255,245,157,0.8)');
  sunGrad.addColorStop(0.6, 'rgba(255,238,88,0.3)');
  sunGrad.addColorStop(1, 'rgba(255,238,88,0)');
  skyCtx.fillStyle = sunGrad;
  skyCtx.fillRect(580, 10, 140, 140);

  // Clouds
  drawCanvasCloud(skyCtx, 80, 60, 1.2);
  drawCanvasCloud(skyCtx, 300, 85, 1.5);
  drawCanvasCloud(skyCtx, 500, 40, 0.9);
  drawCanvasCloud(skyCtx, 700, 100, 1.1);

  if (scene.textures.exists('bg_sky')) scene.textures.remove('bg_sky');
  scene.textures.addCanvas('bg_sky', skyC);

  // ── City buildings ──
  const cityC = document.createElement('canvas');
  cityC.width = W;
  cityC.height = H;
  const cCtx = cityC.getContext('2d')!;

  // Buildings
  const buildings = [
    { x: 10, w: 65, h: 190, color: '#607d8b' },
    { x: 80, w: 50, h: 145, color: '#78909c' },
    { x: 135, w: 85, h: 230, color: '#546e7a' },
    { x: 225, w: 55, h: 170, color: '#78909c' },
    { x: 285, w: 75, h: 210, color: '#607d8b' },
    { x: 365, w: 60, h: 175, color: '#90a4ae' },
    { x: 430, w: 95, h: 250, color: '#546e7a' },
    { x: 530, w: 65, h: 160, color: '#78909c' },
    { x: 600, w: 55, h: 195, color: '#607d8b' },
    { x: 660, w: 85, h: 220, color: '#546e7a' },
    { x: 750, w: 55, h: 170, color: '#90a4ae' },
  ];

  for (const b of buildings) {
    const topY = H - b.h;

    // Building gradient (lighter at top)
    const bGrad = cCtx.createLinearGradient(b.x, topY, b.x, H);
    bGrad.addColorStop(0, b.color + 'dd');
    bGrad.addColorStop(1, b.color);
    cCtx.fillStyle = bGrad;
    cCtx.beginPath();
    cCtx.roundRect(b.x, topY, b.w, b.h, [4, 4, 0, 0]);
    cCtx.fill();

    // Windows with warm glow
    const winW = 5, winH = 6, padX = 9, padY = 12;
    for (let wy = topY + padY; wy < H - 35; wy += winH + padY) {
      for (let wx = b.x + padX; wx < b.x + b.w - padX; wx += winW + padX) {
        const lit = Math.random() > 0.25;
        if (lit) {
          // Warm window glow
          cCtx.fillStyle = 'rgba(255,245,180,0.15)';
          cCtx.beginPath();
          cCtx.roundRect(wx - 1, wy - 1, winW + 2, winH + 2, 1);
          cCtx.fill();
          cCtx.fillStyle = 'rgba(255,245,180,0.7)';
        } else {
          cCtx.fillStyle = 'rgba(50,70,80,0.5)';
        }
        cCtx.beginPath();
        cCtx.roundRect(wx, wy, winW, winH, 1);
        cCtx.fill();
      }
    }

    // Rooftop details
    if (Math.random() > 0.4) {
      cCtx.fillStyle = b.color;
      cCtx.beginPath();
      cCtx.roundRect(b.x + b.w / 2 - 5, topY - 12, 10, 14, 2);
      cCtx.fill();
    }
  }

  // Park trees
  const treeSpots = [180, 360, 550, 730];
  for (const tx of treeSpots) {
    // Trunk
    cCtx.fillStyle = '#5d4037';
    cCtx.beginPath();
    cCtx.roundRect(tx + 3, H - 55, 8, 35, 2);
    cCtx.fill();
    // Canopy (layered circles)
    const canopyGrad = cCtx.createRadialGradient(tx + 7, H - 60, 4, tx + 7, H - 55, 18);
    canopyGrad.addColorStop(0, '#66bb6a');
    canopyGrad.addColorStop(1, '#388e3c');
    cCtx.fillStyle = canopyGrad;
    cCtx.beginPath();
    cCtx.arc(tx + 7, H - 60, 16, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.fillStyle = '#4caf50';
    cCtx.beginPath();
    cCtx.arc(tx + 1, H - 52, 10, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.beginPath();
    cCtx.arc(tx + 14, H - 50, 10, 0, Math.PI * 2);
    cCtx.fill();
  }

  // Street / road
  const roadGrad = cCtx.createLinearGradient(0, H - 22, 0, H);
  roadGrad.addColorStop(0, '#616161');
  roadGrad.addColorStop(1, '#424242');
  cCtx.fillStyle = roadGrad;
  cCtx.fillRect(0, H - 22, W, 22);

  // Road lines
  for (let x = 0; x < W; x += 30) {
    cCtx.fillStyle = 'rgba(255,213,79,0.5)';
    cCtx.beginPath();
    cCtx.roundRect(x, H - 13, 16, 3, 1);
    cCtx.fill();
  }

  // Curb
  cCtx.fillStyle = '#9e9e9e';
  cCtx.fillRect(0, H - 22, W, 2);

  if (scene.textures.exists('bg_hills')) scene.textures.remove('bg_hills');
  scene.textures.addCanvas('bg_hills', cityC);
}

function drawCanvasCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 18 * s, y - 4 * s, 20 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 38 * s, y, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10 * s, y + 6 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 28 * s, y + 5 * s, 13 * s, 0, Math.PI * 2);
  ctx.fill();
}
