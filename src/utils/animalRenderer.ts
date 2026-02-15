// Renders detailed animal sprites using raw Canvas2D
// This gives us bezier curves, gradients, and shadows for a more realistic look

type Ctx = CanvasRenderingContext2D;

function createCanvas(size: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  return [c, ctx];
}

function addToPhaser(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

// ── shared helpers ─────────────────────────────────────

function radialGrad(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

function drawEye(ctx: Ctx, x: number, y: number, r: number, pupilColor = '#1a1a1a'): void {
  // White
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Iris
  ctx.fillStyle = pupilColor;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.12, y, r * 0.6, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pupil
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y, r * 0.35, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawNose(ctx: Ctx, x: number, y: number, w: number, color = '#333'): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - w * 0.4);
  ctx.bezierCurveTo(x + w, y - w * 0.2, x + w, y + w * 0.5, x, y + w * 0.3);
  ctx.bezierCurveTo(x - w, y + w * 0.5, x - w, y - w * 0.2, x, y - w * 0.4);
  ctx.fill();
  // Nostril highlights
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(x - w * 0.2, y - w * 0.1, w * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmile(ctx: Ctx, x: number, y: number, w: number): void {
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x, y + w * 0.8, x + w, y);
  ctx.stroke();
}

function drawCheekBlush(ctx: Ctx, lx: number, ly: number, rx: number, ry: number, r: number): void {
  ctx.fillStyle = 'rgba(255,150,150,0.25)';
  ctx.beginPath();
  ctx.ellipse(lx, ly, r, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(rx, ry, r, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWhiskers(ctx: Ctx, cx: number, cy: number, len: number): void {
  ctx.strokeStyle = 'rgba(80,80,80,0.4)';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  const angles = [-0.15, 0.05, 0.25];
  for (const a of angles) {
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + a * 10);
    ctx.lineTo(cx - len, cy + a * 10 - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + a * 10);
    ctx.lineTo(cx + len, cy + a * 10 - 2);
    ctx.stroke();
  }
}

// ── individual animals ────────────────────────────────

function renderBunny(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Ears
  ctx.fillStyle = radialGrad(ctx, cx - 8, 12, 18, '#f5eedd', '#e8dcc8');
  ctx.beginPath();
  ctx.ellipse(cx - 9, 14, 6, 16, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 9, 14, 6, 16, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Inner ear
  ctx.fillStyle = 'rgba(255,180,190,0.6)';
  ctx.beginPath();
  ctx.ellipse(cx - 9, 14, 3.5, 12, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 9, 14, 3.5, 12, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 8, 16, '#faf5e8', '#e8dcc8');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 15, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 2, 14, '#faf5e8', '#ece3d0');
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, 14, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = radialGrad(ctx, cx + 16, cy + 6, 5, '#fff', '#eee');
  ctx.beginPath();
  ctx.arc(cx + 16, cy + 6, 5, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.fillStyle = '#ece3d0';
  ctx.beginPath();
  ctx.ellipse(cx - 8, S - 5, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 8, S - 5, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  drawEye(ctx, cx - 5, cy - 4, 4, '#4a3520');
  drawEye(ctx, cx + 5, cy - 4, 4, '#4a3520');
  // Nose
  drawNose(ctx, cx, cy + 2, 2.5, '#ffb6c1');
  drawSmile(ctx, cx, cy + 5, 3);
  drawCheekBlush(ctx, cx - 10, cy, cx + 10, cy, 4);
}

function renderCat(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Ears (triangular)
  ctx.fillStyle = '#f09030';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 3);
  ctx.lineTo(cx - 6, cy - 18);
  ctx.lineTo(cx - 1, cy - 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy - 3);
  ctx.lineTo(cx + 6, cy - 18);
  ctx.lineTo(cx + 1, cy - 3);
  ctx.fill();
  // Inner ear
  ctx.fillStyle = 'rgba(255,200,100,0.7)';
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 4);
  ctx.lineTo(cx - 7, cy - 14);
  ctx.lineTo(cx - 3, cy - 4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy - 4);
  ctx.lineTo(cx + 7, cy - 14);
  ctx.lineTo(cx + 3, cy - 4);
  ctx.fill();

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 7, 15, '#ffa040', '#e88020');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 14, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 2, 14, '#ffa040', '#e88020');
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tabby stripes
  ctx.strokeStyle = 'rgba(180,100,30,0.3)';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 5 - 2, cy - 10);
    ctx.quadraticCurveTo(cx + i * 4, cy - 5, cx + i * 5 + 2, cy - 1);
    ctx.stroke();
  }

  // Belly
  ctx.fillStyle = 'rgba(255,230,180,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.strokeStyle = '#e88020';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy + 6);
  ctx.bezierCurveTo(cx + 22, cy + 2, cx + 24, cy - 6, cx + 20, cy - 10);
  ctx.stroke();

  // Feet
  ctx.fillStyle = '#e88020';
  ctx.beginPath();
  ctx.ellipse(cx - 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face
  drawEye(ctx, cx - 5, cy - 3, 4, '#4a8030');
  drawEye(ctx, cx + 5, cy - 3, 4, '#4a8030');
  drawNose(ctx, cx, cy + 2, 2, '#ffb6c1');
  drawWhiskers(ctx, cx, cy + 3, 16);
  drawSmile(ctx, cx, cy + 5, 2.5);
}

function renderBird(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Wings
  ctx.fillStyle = 'rgba(60,180,240,0.6)';
  ctx.beginPath();
  ctx.ellipse(cx - 16, cy + 2, 8, 14, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 16, cy + 2, 8, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 4, 13, '#5cc8f8', '#3098d0');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 12, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 7, 10, '#5cc8f8', '#3098d0');
  ctx.beginPath();
  ctx.arc(cx, cy - 7, 10, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 8, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crest
  ctx.fillStyle = '#ffe040';
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 17);
  ctx.bezierCurveTo(cx + 4, cy - 22, cx + 8, cy - 16, cx + 3, cy - 10);
  ctx.bezierCurveTo(cx, cy - 12, cx - 3, cy - 13, cx - 2, cy - 17);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy - 5);
  ctx.lineTo(cx + 12, cy - 3);
  ctx.lineTo(cx + 2, cy - 1);
  ctx.closePath();
  ctx.fill();

  // Tail
  ctx.fillStyle = 'rgba(40,150,220,0.7)';
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 16);
  ctx.lineTo(cx, cy + 24);
  ctx.lineTo(cx + 4, cy + 16);
  ctx.fill();

  drawEye(ctx, cx - 4, cy - 8, 3, '#1a1a1a');
  drawEye(ctx, cx + 4, cy - 8, 3, '#1a1a1a');
  drawCheekBlush(ctx, cx - 7, cy - 4, cx + 7, cy - 4, 3);
}

function renderFrog(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 4, 16, '#70d070', '#409040');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 4, 14, '#70d070', '#409040');
  ctx.beginPath();
  ctx.ellipse(cx, cy - 4, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = 'rgba(200,240,200,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye bumps
  ctx.fillStyle = '#80e080';
  ctx.beginPath();
  ctx.arc(cx - 9, cy - 13, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 9, cy - 13, 7, 0, Math.PI * 2);
  ctx.fill();

  drawEye(ctx, cx - 9, cy - 13, 5, '#4a6030');
  drawEye(ctx, cx + 9, cy - 13, 5, '#4a6030');

  // Wide mouth
  ctx.strokeStyle = '#306030';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy + 1);
  ctx.quadraticCurveTo(cx, cy + 5, cx + 10, cy + 1);
  ctx.stroke();

  // Feet
  ctx.fillStyle = '#60b060';
  ctx.beginPath();
  ctx.ellipse(cx - 10, S - 4, 8, 4, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 10, S - 4, 8, 4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Toe lines
  ctx.strokeStyle = '#409040';
  ctx.lineWidth = 0.8;
  for (const side of [-1, 1]) {
    for (let t = -1; t <= 1; t++) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 10 + t * 3, S - 5);
      ctx.lineTo(cx + side * 10 + t * 4.5, S - 1);
      ctx.stroke();
    }
  }
  drawCheekBlush(ctx, cx - 12, cy - 2, cx + 12, cy - 2, 4);
}

function renderFox(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Bushy tail
  ctx.fillStyle = radialGrad(ctx, cx + 18, cy + 2, 12, '#ff8040', '#d06020');
  ctx.beginPath();
  ctx.ellipse(cx + 17, cy + 2, 10, 14, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#faf5e8';
  ctx.beginPath();
  ctx.ellipse(cx + 22, cy - 4, 4, 5, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#e06020';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 2);
  ctx.lineTo(cx - 7, cy - 20);
  ctx.lineTo(cx - 1, cy - 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy - 2);
  ctx.lineTo(cx + 7, cy - 20);
  ctx.lineTo(cx + 1, cy - 2);
  ctx.fill();
  ctx.fillStyle = '#faf5e8';
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy - 3);
  ctx.lineTo(cx - 7, cy - 14);
  ctx.lineTo(cx - 3, cy - 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 11, cy - 3);
  ctx.lineTo(cx + 7, cy - 14);
  ctx.lineTo(cx + 3, cy - 3);
  ctx.fill();

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 7, 14, '#ff8040', '#d06020');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 2, 13, '#ff8040', '#d06020');
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // White muzzle
  ctx.fillStyle = '#faf5e8';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // White chest
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d06020';
  ctx.beginPath();
  ctx.ellipse(cx - 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawEye(ctx, cx - 5, cy - 4, 3.5, '#b08020');
  drawEye(ctx, cx + 5, cy - 4, 3.5, '#b08020');
  drawNose(ctx, cx, cy + 1, 2.5, '#222');
  drawSmile(ctx, cx, cy + 4, 3);
}

function renderPenguin(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 4, 15, '#3a4a55', '#1a2a35');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // White belly
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 9, 10, '#3a4a55', '#1a2a35');
  ctx.beginPath();
  ctx.arc(cx, cy - 9, 11, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = '#2a3a45';
  ctx.beginPath();
  ctx.ellipse(cx - 16, cy + 3, 5, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 16, cy + 3, 5, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 7, cy - 5);
  ctx.lineTo(cx, cy - 2);
  ctx.closePath();
  ctx.fill();

  // Feet
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.ellipse(cx - 6, S - 3, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 6, S - 3, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  drawEye(ctx, cx - 4, cy - 10, 3, '#1a1a1a');
  drawEye(ctx, cx + 4, cy - 10, 3, '#1a1a1a');
  drawCheekBlush(ctx, cx - 8, cy - 6, cx + 8, cy - 6, 3);
}

function renderPuppy(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Floppy ears
  ctx.fillStyle = '#8d6540';
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 1, 6, 13, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 14, cy - 1, 6, 13, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 7, 14, '#d4a86e', '#b08850');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 3, 13, '#d4a86e', '#b08850');
  ctx.beginPath();
  ctx.ellipse(cx, cy - 3, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle
  ctx.fillStyle = 'rgba(255,240,220,0.8)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = 'rgba(255,240,220,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.strokeStyle = '#b08850';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy + 5);
  ctx.bezierCurveTo(cx + 20, cy + 2, cx + 22, cy - 4, cx + 18, cy - 6);
  ctx.stroke();

  // Feet
  ctx.fillStyle = '#b08850';
  ctx.beginPath();
  ctx.ellipse(cx - 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawEye(ctx, cx - 5, cy - 5, 4, '#4a3520');
  drawEye(ctx, cx + 5, cy - 5, 4, '#4a3520');
  drawNose(ctx, cx, cy, 2.5, '#333');
  // Tongue
  ctx.fillStyle = '#ff7070';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 5, 3, 4, 0.15, 0, Math.PI * 2);
  ctx.fill();
  drawCheekBlush(ctx, cx - 10, cy - 1, cx + 10, cy - 1, 3.5);
}

function renderPanda(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Black arms
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy + 5, 6, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 14, cy + 5, 6, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // White body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 6, 14, '#fafafa', '#e0e0e0');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 13, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // White head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 5, 13, '#fafafa', '#e8e8e8');
  ctx.beginPath();
  ctx.arc(cx, cy - 5, 13, 0, Math.PI * 2);
  ctx.fill();

  // Black ears
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 16, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 10, cy - 16, 5, 0, Math.PI * 2);
  ctx.fill();

  // Eye patches
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(cx - 6, cy - 5, 6, 5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 6, cy - 5, 6, 5, 0.15, 0, Math.PI * 2);
  ctx.fill();

  drawEye(ctx, cx - 5, cy - 5, 3, '#4a3520');
  drawEye(ctx, cx + 5, cy - 5, 3, '#4a3520');
  drawNose(ctx, cx, cy + 1, 2, '#333');
  drawSmile(ctx, cx, cy + 4, 3);

  // Black legs
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(cx - 7, S - 4, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, S - 4, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawCheekBlush(ctx, cx - 11, cy - 1, cx + 11, cy - 1, 3);
}

function renderUnicorn(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Mane (rainbow)
  const maneColors = ['#ff4081', '#ff9020', '#ffe040', '#60e080', '#40c0ff', '#b080ff'];
  for (let i = 0; i < maneColors.length; i++) {
    ctx.fillStyle = maneColors[i];
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(cx - 9 + i * 2, cy - 10 + i * 3, 5, 7, -0.3 + i * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 6, 14, '#fff', '#e8e0f0');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 13, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 4, 12, '#fff', '#ece0f5');
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 12, 0, Math.PI * 2);
  ctx.fill();

  // Horn (golden, spiral)
  const hornGrad = ctx.createLinearGradient(cx, cy - 24, cx, cy - 10);
  hornGrad.addColorStop(0, '#ffe060');
  hornGrad.addColorStop(1, '#ffc020');
  ctx.fillStyle = hornGrad;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 24);
  ctx.lineTo(cx - 4, cy - 10);
  ctx.lineTo(cx + 4, cy - 10);
  ctx.closePath();
  ctx.fill();
  // Spiral lines on horn
  ctx.strokeStyle = 'rgba(200,160,40,0.4)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    const hy = cy - 22 + i * 3.5;
    const hw = 1 + i * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - hw, hy);
    ctx.lineTo(cx + hw, hy);
    ctx.stroke();
  }

  // Ears
  ctx.fillStyle = '#ece0f5';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 15);
  ctx.lineTo(cx - 5, cy - 6);
  ctx.lineTo(cx - 11, cy - 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 8, cy - 15);
  ctx.lineTo(cx + 5, cy - 6);
  ctx.lineTo(cx + 11, cy - 8);
  ctx.fill();

  // Sparkle eyes
  drawEye(ctx, cx - 5, cy - 5, 3.5, '#8040b0');
  drawEye(ctx, cx + 5, cy - 5, 3.5, '#8040b0');
  drawSmile(ctx, cx, cy + 2, 3);

  // Feet
  ctx.fillStyle = '#e0d0f0';
  ctx.beginPath();
  ctx.ellipse(cx - 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sparkles
  ctx.fillStyle = 'rgba(255,220,80,0.7)';
  for (const [sx, sy] of [[-16, -8], [18, -2], [-13, 10], [16, 8]]) {
    ctx.beginPath();
    ctx.arc(cx + sx, cy + sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderDragon(ctx: Ctx, S: number): void {
  const cx = S / 2, cy = S / 2;

  // Wings
  ctx.fillStyle = 'rgba(100,60,180,0.5)';
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + 2);
  ctx.bezierCurveTo(cx - 24, cy - 14, cx - 20, cy - 20, cx - 8, cy - 12);
  ctx.lineTo(cx - 6, cy - 4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy + 2);
  ctx.bezierCurveTo(cx + 24, cy - 14, cx + 20, cy - 20, cx + 8, cy - 12);
  ctx.lineTo(cx + 6, cy - 4);
  ctx.fill();

  // Body
  ctx.fillStyle = radialGrad(ctx, cx, cy + 5, 13, '#9060d0', '#6030a0');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 12, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = radialGrad(ctx, cx, cy - 5, 11, '#9060d0', '#6030a0');
  ctx.beginPath();
  ctx.arc(cx, cy - 5, 11, 0, Math.PI * 2);
  ctx.fill();

  // Horns
  ctx.fillStyle = '#ffaa30';
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy - 16);
  ctx.lineTo(cx - 4, cy - 7);
  ctx.lineTo(cx - 10, cy - 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy - 16);
  ctx.lineTo(cx + 4, cy - 7);
  ctx.lineTo(cx + 10, cy - 8);
  ctx.fill();

  // Belly
  ctx.fillStyle = 'rgba(255,180,80,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Belly scales
  ctx.strokeStyle = 'rgba(255,180,80,0.3)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy + 2 + i * 4, 4, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }

  // Snout
  ctx.fillStyle = '#8050c0';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.strokeStyle = '#7040b0';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy + 10);
  ctx.bezierCurveTo(cx + 20, cy + 8, cx + 22, cy + 2, cx + 18, cy - 1);
  ctx.stroke();
  // Tail tip
  ctx.fillStyle = '#ffaa30';
  ctx.beginPath();
  ctx.moveTo(cx + 18, cy - 1);
  ctx.lineTo(cx + 22, cy - 4);
  ctx.lineTo(cx + 20, cy + 2);
  ctx.fill();

  drawEye(ctx, cx - 5, cy - 7, 3.5, '#ffaa30');
  drawEye(ctx, cx + 5, cy - 7, 3.5, '#ffaa30');
  // Nostrils
  ctx.fillStyle = '#ffaa30';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 2, cy - 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  drawSmile(ctx, cx, cy + 2, 3);

  ctx.fillStyle = '#7040b0';
  ctx.beginPath();
  ctx.ellipse(cx - 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Generic renderer for animals without a specific drawing
function renderGeneric(ctx: Ctx, S: number, color: string, accentColor: string): void {
  const cx = S / 2, cy = S / 2;
  // Ears
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx - 9, cy - 14, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 9, cy - 14, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(cx - 9, cy - 14, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 9, cy - 14, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 13, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 12, 0, Math.PI * 2);
  ctx.fill();
  drawEye(ctx, cx - 5, cy - 6, 3.5);
  drawEye(ctx, cx + 5, cy - 6, 3.5);
  drawNose(ctx, cx, cy, 2, '#333');
  drawSmile(ctx, cx, cy + 3, 3);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx - 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, S - 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCheekBlush(ctx, cx - 9, cy - 1, cx + 9, cy - 1, 3.5);
}

// ── hex to CSS color ──
function hexToCSS(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

// ── public API ────────────────────────────────────────

const renderers: Record<string, (ctx: Ctx, S: number) => void> = {
  bunny: renderBunny,
  cat: renderCat,
  bird: renderBird,
  frog: renderFrog,
  fox: renderFox,
  penguin: renderPenguin,
  puppy: renderPuppy,
  panda: renderPanda,
  unicorn: renderUnicorn,
  dragon: renderDragon,
};

export function renderAnimalToPhaser(scene: Phaser.Scene, id: string, color: number, accentColor: number): void {
  const S = 48;
  const [canvas, ctx] = createCanvas(S * 2);
  ctx.scale(2, 2);

  const renderer = renderers[id];
  if (renderer) {
    renderer(ctx, S);
  } else {
    renderGeneric(ctx, S, hexToCSS(color), hexToCSS(accentColor));
  }

  addToPhaser(scene, `animal_${id}`, canvas);
}
