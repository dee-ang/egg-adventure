#!/usr/bin/env npx tsx
/**
 * Level Feasibility + Fun Simulator
 *
 * Imports level data from src/data/levels.ts (single source of truth).
 * Mirrors animal physics from GameScene.ts.
 *
 * Run: npx tsx tools/level-sim.ts
 */

import { LEVEL_1, EggSpawnPoint } from '../src/data/levels.js';

const level = LEVEL_1;
const tiles = level.tiles;
const PLAYER_START = level.playerStart;
const NEST = level.nest;
const SPAWN_POINTS = level.eggSpawnPoints;
// For backward compat with existing sim logic, treat spawn points like eggs
const EGGS = SPAWN_POINTS.map(sp => ({ x: sp.x, y: sp.y, type: sp.difficulty }));

const TILE = 32;
const W = tiles[0].length;
const H = tiles.length;
const BASE_GRAVITY = 500;
const BASE_JUMP_V = 320;
const DT = 1 / 120;
const PLAYER_H = 30;
const PLAYER_HALF_W = 12;

// ─── Animal physics (mirrors GameScene.ts ANIMAL_PHYSICS) ───

interface Physics {
  name: string;
  speed: number;
  jumpScale: number;
  gravity: number;
  canDoubleJump: boolean;
  canGlide: boolean;
  canHighJump: boolean;
  canWallJump: boolean;
  canSpinBounce: boolean;
  canDash: boolean;
}

const DEFAULTS: Omit<Physics, 'name'> = {
  speed: 160, jumpScale: 1.0, gravity: 1.0,
  canDoubleJump: false, canGlide: false, canHighJump: false,
  canWallJump: false, canSpinBounce: false, canDash: false,
};

const ANIMALS_RAW: Record<string, Partial<Omit<Physics, 'name'>>> = {
  bunny:    { canDoubleJump: true, jumpScale: 1.1, speed: 160 },
  cat:      { canWallJump: true, speed: 190, jumpScale: 1.05 },
  bird:     { canGlide: true, gravity: 0.7, jumpScale: 1.15 },
  frog:     { canHighJump: true, jumpScale: 1.5, speed: 130 },
  fish:     { canDoubleJump: true, gravity: 0.8, speed: 140 },
  fox:      { canDash: true, speed: 200, jumpScale: 0.95 },
  penguin:  { speed: 150, jumpScale: 0.9 },
  hamster:  { canDoubleJump: true, speed: 170, jumpScale: 1.0 },
  owl:      { canGlide: true, gravity: 0.65, speed: 140, jumpScale: 1.1 },
  turtle:   { speed: 110, jumpScale: 0.9, gravity: 1.1 },
  panda:    { canDoubleJump: true, speed: 125, jumpScale: 1.1, gravity: 1.1 },
  hedgehog: { canSpinBounce: true, speed: 175, jumpScale: 1.0 },
  puppy:    { canDoubleJump: true, speed: 185, jumpScale: 1.05 },
  mouse:    { speed: 220, jumpScale: 0.95, gravity: 0.7 },
  unicorn:  { canGlide: true, canDoubleJump: true, speed: 170, jumpScale: 1.15, gravity: 0.7 },
  dragon:   { canGlide: true, canDoubleJump: true, speed: 160, jumpScale: 1.2, gravity: 0.6 },
};

const ANIMALS: Physics[] = Object.entries(ANIMALS_RAW).map(([name, ov]) => ({
  name, ...DEFAULTS, ...ov,
}));

// ─── Tile queries ───

function tileAt(tx: number, ty: number): number {
  if (tx < 0 || tx >= W || ty < 0 || ty >= H) return 0;
  return tiles[ty][tx];
}

function isFullSolid(tx: number, ty: number): boolean {
  const t = tileAt(tx, ty);
  return t === 1 || t === 2 || t === 3;
}

function isAnySolid(tx: number, ty: number): boolean {
  const t = tileAt(tx, ty);
  return t !== 0;
}

/** Pixel Y of top surface where a player's feet would rest */
function surfacePixY(tx: number, ty: number): number {
  const t = tileAt(tx, ty);
  if (t === 4) return ty * TILE + 6;    // Platform: thin at top of tile
  if (t !== 0) return ty * TILE;         // Full tile: top edge
  return -1;
}

// ─── Standable positions ───

interface Stand {
  tx: number;
  ty: number;
  feetY: number;
}

function allStands(): Stand[] {
  const out: Stand[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (tileAt(x, y) === 0) continue;
      const feetY = surfacePixY(x, y);
      if (feetY < 0) continue;
      const headY = feetY - PLAYER_H;
      const headTileY = Math.floor(headY / TILE);
      if (headTileY >= 0 && isFullSolid(x, headTileY)) continue;
      out.push({ tx: x, ty: y, feetY });
    }
  }
  return out;
}

// ─── Headroom check ───

function actualJumpHeight(stand: Stand): number {
  const headY = stand.feetY - PLAYER_H;
  for (let py = headY - 1; py >= 0; py--) {
    const ty = Math.floor(py / TILE);
    if (isFullSolid(stand.tx, ty)) {
      const ceilingBottom = (ty + 1) * TILE;
      return headY - ceilingBottom;
    }
  }
  return 9999;
}

// ─── Physics: max jump heights ───

function maxSingleJump(p: Physics): number {
  const v = BASE_JUMP_V * p.jumpScale;
  const g = BASE_GRAVITY * p.gravity;
  return (v * v) / (2 * g);
}

function maxDoubleJump(p: Physics): number {
  const h1 = maxSingleJump(p);
  const v2 = BASE_JUMP_V * p.jumpScale * 0.85;
  const g = BASE_GRAVITY * p.gravity;
  return h1 + (v2 * v2) / (2 * g);
}

function maxSpinJump(p: Physics): number {
  const h1 = maxSingleJump(p);
  const v2 = BASE_JUMP_V * p.jumpScale * 1.0;
  const g = BASE_GRAVITY * p.gravity;
  return h1 + (v2 * v2) / (2 * g);
}

function effectiveMaxH(p: Physics): number {
  if (p.canDoubleJump) return maxDoubleJump(p);
  if (p.canSpinBounce) return maxSpinJump(p);
  return maxSingleJump(p);
}

// ─── Simulated jump arc ───

function simJumpArc(p: Physics, targetRise: number, direction: 1 | -1 = 1): { maxX: number; maxRise: number } {
  const g = BASE_GRAVITY * p.gravity;
  const jv = BASE_JUMP_V * p.jumpScale;
  let vy = -jv;
  let y = 0;
  let x = 0;
  let maxRise = 0;
  let usedDouble = false;
  const maxTime = 5;
  let t = 0;
  let bestX = 0;

  while (t < maxTime) {
    vy += g * DT;
    if (p.canGlide && vy > 50) vy = 50;
    y += vy * DT;
    x += p.speed * DT;
    if (-y > maxRise) maxRise = -y;

    if (!usedDouble && vy > 0 && (p.canDoubleJump || p.canSpinBounce)) {
      const mult = p.canSpinBounce ? 1.0 : 0.85;
      vy = -jv * mult;
      usedDouble = true;
    }

    if (-y >= targetRise - 5) {
      bestX = Math.max(bestX, x);
    }
    if (y > 10 && targetRise <= 0) {
      bestX = Math.max(bestX, x);
    }
    if (y > 200) break;
    t += DT;
  }

  return { maxX: bestX, maxRise };
}

// ─── Can we get from stand A to stand B? ───

interface Transition {
  from: Stand;
  to: Stand;
  difficulty: 'walk' | 'easy' | 'medium' | 'hard' | 'impossible';
  margin: number;
}

function evalTransition(from: Stand, to: Stand, p: Physics): Transition {
  const dx = Math.abs(to.tx - from.tx) * TILE;
  const rise = from.feetY - to.feetY;

  if (Math.abs(rise) < 10 && dx <= TILE * 2) {
    const minX = Math.min(from.tx, to.tx);
    const maxX = Math.max(from.tx, to.tx);
    let continuous = true;
    for (let x = minX; x <= maxX; x++) {
      const gy = surfacePixY(x, from.ty);
      if (gy < 0 || Math.abs(gy - from.feetY) > 10) { continuous = false; break; }
    }
    if (continuous) return { from, to, difficulty: 'walk', margin: 999 };
  }

  const headroom = actualJumpHeight(from);
  const maxH = Math.min(effectiveMaxH(p), headroom);

  if (rise > 0) {
    if (rise > maxH + 5) {
      if (p.canWallJump) {
        const wallBoost = maxSingleJump(p) * 0.7 * 3;
        if (rise > maxH + wallBoost) {
          return { from, to, difficulty: 'impossible', margin: -(rise - maxH - wallBoost) };
        }
        let wallFound = false;
        for (let wx = Math.min(from.tx, to.tx) - 1; wx <= Math.max(from.tx, to.tx) + 1; wx++) {
          for (let wy = 0; wy < H; wy++) {
            if (isFullSolid(wx, wy) && tileAt(wx, wy) === 3) wallFound = true;
          }
        }
        if (!wallFound) return { from, to, difficulty: 'impossible', margin: -(rise - maxH) };
        const margin = maxH + wallBoost - rise;
        const diff = margin > 40 ? 'medium' : 'hard';
        return { from, to, difficulty: diff, margin };
      }
      return { from, to, difficulty: 'impossible', margin: -(rise - maxH) };
    }

    const arc = simJumpArc(p, rise);
    if (arc.maxX < dx - 10) {
      if (p.canDash && arc.maxX + 160 >= dx) {
        const margin = arc.maxX + 160 - dx;
        return { from, to, difficulty: margin > 40 ? 'medium' : 'hard', margin };
      }
      return { from, to, difficulty: 'impossible', margin: arc.maxX - dx };
    }

    const heightMargin = maxH - rise;
    const horizMargin = arc.maxX - dx;
    const margin = Math.min(heightMargin, horizMargin);
    if (margin > 60) return { from, to, difficulty: 'easy', margin };
    if (margin > 25) return { from, to, difficulty: 'medium', margin };
    return { from, to, difficulty: 'hard', margin };
  }

  const fall = Math.abs(rise);
  const g = BASE_GRAVITY * p.gravity;
  const fallTime = Math.sqrt(2 * fall / g);
  const jumpTime = (2 * BASE_JUMP_V * p.jumpScale) / g;
  let totalAirTime = jumpTime + fallTime;
  if (p.canDoubleJump || p.canSpinBounce) totalAirTime *= 1.6;

  let horizReach = p.speed * totalAirTime;
  if (p.canGlide && fall > 20) {
    horizReach += p.speed * (fall / 50);
  }
  if (p.canDash) horizReach += 160;

  if (horizReach < dx - 10) {
    return { from, to, difficulty: 'impossible', margin: horizReach - dx };
  }

  const margin = horizReach - dx;
  if (margin > 100) return { from, to, difficulty: 'easy', margin };
  if (margin > 40) return { from, to, difficulty: 'medium', margin };
  return { from, to, difficulty: 'hard', margin };
}

// ─── BFS reachability ───

function reachableFrom(startTx: number, startTy: number, p: Physics): { stands: Set<string>; transitions: Transition[] } {
  const allS = allStands();
  const key = (s: Stand) => `${s.tx},${s.feetY}`;

  const startFeetY = (() => {
    for (let y = startTy; y < H; y++) {
      const sy = surfacePixY(startTx, y);
      if (sy >= 0) return sy;
    }
    return 13 * TILE;
  })();

  const startStand: Stand = { tx: startTx, ty: Math.floor(startFeetY / TILE), feetY: startFeetY };
  const visited = new Set<string>();
  const queue: Stand[] = [startStand];
  visited.add(key(startStand));
  const transitions: Transition[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const target of allS) {
      const k = key(target);
      if (visited.has(k)) continue;
      if (Math.abs(target.tx - cur.tx) > 15) continue;

      const trans = evalTransition(cur, target, p);
      if (trans.difficulty !== 'impossible') {
        visited.add(k);
        queue.push(target);
        transitions.push(trans);
      }
    }
  }

  return { stands: visited, transitions };
}

// ─── Check if egg is collectable ───

function eggCollectable(
  egg: { x: number; y: number; type: string },
  reachable: Set<string>,
  p: Physics,
): { collectable: boolean; difficulty: 'easy' | 'medium' | 'hard' | 'impossible'; reason: string } {
  const eggPixX = egg.x * TILE + TILE / 2;
  const eggPixY = egg.y * TILE;

  for (const posKey of reachable) {
    const [txStr, feetYStr] = posKey.split(',');
    const tx = parseInt(txStr);
    const feetY = parseInt(feetYStr);
    const playerCenterX = tx * TILE + TILE / 2;

    const hDist = Math.abs(playerCenterX - eggPixX);
    if (hDist > TILE * 2) continue;

    const eggTop = eggPixY - 25;
    const eggBot = eggPixY + 25;
    const playerTop = feetY - PLAYER_H;
    const playerBot = feetY;

    if (hDist < TILE * 1.2 && playerTop < eggBot && playerBot > eggTop) {
      return { collectable: true, difficulty: 'easy', reason: 'walk to it' };
    }

    const jumpRise = feetY - eggTop;
    if (jumpRise > 0) {
      const headroom = actualJumpHeight({ tx, ty: Math.floor(feetY / TILE), feetY });
      const maxH = Math.min(effectiveMaxH(p), headroom);
      if (maxH >= jumpRise - 10 && hDist < TILE * 1.5) {
        const margin = maxH - jumpRise;
        if (margin > 40) return { collectable: true, difficulty: 'easy', reason: 'short jump' };
        if (margin > 15) return { collectable: true, difficulty: 'medium', reason: 'jump up' };
        return { collectable: true, difficulty: 'hard', reason: 'precise jump needed' };
      }
    }
  }

  return { collectable: false, difficulty: 'impossible', reason: 'no reachable position near egg' };
}

// ═══════════════════════════════════════════════════
//  STRUCTURAL CHECKS (based on level-design-rules.ts)
// ═══════════════════════════════════════════════════

function structuralChecks(): string[] {
  const issues: string[] = [];

  // ── Rule: Eggs must have support (surface within 1 tile below) ──
  for (const egg of EGGS) {
    let hasSupport = false;
    for (let dy = 0; dy <= 1; dy++) {
      if (tileAt(egg.x, egg.y + dy) !== 0) { hasSupport = true; break; }
    }
    if (!hasSupport) {
      issues.push(`FLOATING EGG at (${egg.x},${egg.y}) [${egg.type}] — no surface within 1 tile below`);
    }
  }

  // ── Rule: Spawn points should have at least 1 of each difficulty ──
  const easyCount = SPAWN_POINTS.filter(s => s.difficulty === 'easy').length;
  const medCount = SPAWN_POINTS.filter(s => s.difficulty === 'medium').length;
  const hardCount = SPAWN_POINTS.filter(s => s.difficulty === 'hard').length;
  if (easyCount < 1) issues.push('NO EASY spawn points — need at least 1 for white egg');
  if (medCount < 1) issues.push('NO MEDIUM spawn points — need at least 1 for golden egg');
  if (hardCount < 1) issues.push('NO HARD spawn points — need at least 1 for rainbow egg');

  // ── Rule: Gaps must be ≤ 2 tiles wide ──
  for (let x = 0; x < W - 1; x++) {
    if (tileAt(x, 13) !== 0 && tileAt(x + 1, 13) === 0) {
      // Found gap start. Measure width.
      let gapWidth = 0;
      for (let gx = x + 1; gx < W; gx++) {
        if (tileAt(gx, 13) !== 0) break;
        gapWidth++;
      }
      if (gapWidth > 2) {
        issues.push(`GAP TOO WIDE at x=${x + 1} (${gapWidth} tiles, max 2)`);
      }
      // Rule: Gap must have a bridge (platform at y=11 or y=12 spanning it)
      let bridged = true;
      for (let gx = x + 1; gx < x + 1 + gapWidth; gx++) {
        if (tileAt(gx, 12) === 0 && tileAt(gx, 11) === 0) { bridged = false; break; }
      }
      if (!bridged) {
        issues.push(`UNBRIDGED GAP at x=${x + 1}-${x + gapWidth} — no platform bridge`);
      }
    }
  }

  // ── Rule: Find wall columns ──
  const wallColumns: { x: number; yMin: number; yMax: number }[] = [];
  for (let x = 0; x < W; x++) {
    let yMin = -1, yMax = -1;
    for (let y = 0; y < H; y++) {
      if (tileAt(x, y) === 3) {
        if (yMin < 0) yMin = y;
        yMax = y;
      }
    }
    if (yMin >= 0) wallColumns.push({ x, yMin, yMax });
  }

  // ── Rule: Walls must not block the main walking path ──
  // Player walks on y=13 (surface at pixel 416, head at 386).
  // Wall at y=12: body 384-416 → head at 386 is INSIDE → blocks player!
  // Wall at y=11: body 352-384 → head at 386 is BELOW → OK (2px margin)
  for (const col of wallColumns) {
    if (col.yMax >= 12) {
      issues.push(`WALL BLOCKS PATH at x=${col.x} — wall at y=${col.yMax} collides with player on y=13 ground`);
    }
  }

  // ── Rule: Walls should not be too tall (max 6 tiles for level 1) ──
  for (const col of wallColumns) {
    const height = col.yMax - col.yMin + 1;
    if (height > 6) {
      issues.push(`WALL TOO TALL at x=${col.x} (${height} tiles, max 6)`);
    }
  }

  // ── Rule: Walls must not intersect water slide bezier paths ──
  for (let si = 0; si < level.waterSlides.length; si++) {
    const s = level.waterSlides[si];
    // Sample bezier at 20 points and check for wall tiles
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const px = (1 - t) * (1 - t) * s.topX + 2 * (1 - t) * t * s.curveX + t * t * s.bottomX;
      const py = (1 - t) * (1 - t) * s.topY + 2 * (1 - t) * t * s.curveY + t * t * s.bottomY;
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      // Check a 3-tile corridor around the slide center
      for (let dx = -1; dx <= 1; dx++) {
        if (tileAt(tx + dx, ty) === 3) {
          issues.push(`WALL IN SLIDE ${si + 1} PATH at tile (${tx + dx},${ty}) — wall intersects slide bezier`);
        }
      }
    }
  }

  // ── Rule: Wall-jump pairs should be 3-5 tiles apart ──
  // Detect pairs: walls at similar y ranges, close together
  for (let i = 0; i < wallColumns.length; i++) {
    for (let j = i + 1; j < wallColumns.length; j++) {
      const a = wallColumns[i], b = wallColumns[j];
      const dist = Math.abs(a.x - b.x);
      // Consider a pair if they overlap vertically
      const overlapTop = Math.max(a.yMin, b.yMin);
      const overlapBot = Math.min(a.yMax, b.yMax);
      if (overlapBot - overlapTop >= 3) {
        // They share enough vertical range to be a wall-jump pair
        if (dist < 3) {
          issues.push(`WALL-JUMP PAIR TOO CLOSE: x=${a.x} & x=${b.x} (${dist} tiles, min 3)`);
        } else if (dist > 5) {
          // Only flag if they're the closest pair — not a real pair
          // Just informational, don't add to issues
        }
      }
    }
  }

  // ── Rule: Stepping platforms must have ≥2 tile vertical gaps ──
  // Check all platform (type 4) positions for stacking issues
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (tileAt(x, y) !== 4) continue;
      // Check if there's another platform or wall 1 tile above (too close)
      if (y > 0 && tileAt(x, y - 1) === 4) {
        issues.push(`PLATFORMS TOO CLOSE at (${x},${y}) and (${x},${y - 1}) — need 2+ tile gap`);
      }
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║         LEVEL FEASIBILITY + FUN SIMULATOR            ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

console.log(`Level: ${level.name}  (${W}x${H} tiles)`);
console.log(`Player start: (${PLAYER_START.x}, ${PLAYER_START.y})  Nest: (${NEST.x}, ${NEST.y})`);
console.log(`Egg spawn points: ${EGGS.length} (${SPAWN_POINTS.filter(s => s.difficulty === 'easy').length} easy, ${SPAWN_POINTS.filter(s => s.difficulty === 'medium').length} medium, ${SPAWN_POINTS.filter(s => s.difficulty === 'hard').length} hard)  Water slides: ${level.waterSlides.length}\n`);

// Print level
console.log('LEVEL MAP:');
for (let y = 0; y < H; y++) {
  let row = `${y.toString().padStart(2)}│`;
  for (let x = 0; x < W; x++) {
    if (x === PLAYER_START.x && y === PLAYER_START.y) { row += 'P'; continue; }
    if (x === NEST.x && y === NEST.y) { row += 'N'; continue; }
    const egg = EGGS.find(e => e.x === x && e.y === y);
    if (egg) { row += 'E'; continue; }
    switch (tiles[y][x]) {
      case 0: row += '.'; break;
      case 1: row += '='; break;
      case 2: row += '~'; break;
      case 3: row += '#'; break;
      case 4: row += '-'; break;
    }
  }
  console.log(row);
}
console.log('  │' + Array.from({ length: 5 }, (_, i) => '0123456789').join(''));

// Structural checks
console.log('\n\n── STRUCTURAL ANALYSIS ──');
const structIssues = structuralChecks();
if (structIssues.length === 0) {
  console.log('  ✅ No structural issues found');
} else {
  for (const issue of structIssues) {
    console.log(`  ❌ ${issue}`);
  }
}

// Physics summary
console.log('\n── PHYSICS SUMMARY ──');
console.log(
  '  ' + 'Animal'.padEnd(10),
  'Spd'.padStart(4),
  'JmpH'.padStart(6),
  'EffH'.padStart(6),
  'Abilities',
);
for (const p of ANIMALS) {
  const abilities: string[] = [];
  if (p.canDoubleJump) abilities.push('2xJ');
  if (p.canGlide) abilities.push('Gli');
  if (p.canWallJump) abilities.push('WaJ');
  if (p.canSpinBounce) abilities.push('Spn');
  if (p.canDash) abilities.push('Dsh');
  if (p.canHighJump) abilities.push('HiJ');

  console.log(
    '  ' + p.name.padEnd(10),
    p.speed.toString().padStart(4),
    maxSingleJump(p).toFixed(0).padStart(6),
    effectiveMaxH(p).toFixed(0).padStart(6),
    abilities.join(' ') || '—',
  );
}

// Per-animal analysis
console.log('\n── REACHABILITY PER ANIMAL ──');
console.log('═'.repeat(110));

interface Result {
  name: string;
  nestOk: boolean;
  eggResults: { egg: typeof EGGS[0]; collectable: boolean; difficulty: string; reason: string }[];
  slide1: boolean;
  slide2: boolean;
  hardTransitions: number;
  funScore: number;
  issues: string[];
}

const results: Result[] = [];

// Water slide launch platform positions (from level data)
const slide1Platforms = level.waterSlides[0] ? {
  topTileX: Math.round(level.waterSlides[0].topX / TILE),
  topTileY: Math.round(level.waterSlides[0].topY / TILE),
} : null;
const slide2Platforms = level.waterSlides[1] ? {
  topTileX: Math.round(level.waterSlides[1].topX / TILE),
  topTileY: Math.round(level.waterSlides[1].topY / TILE),
} : null;

for (const p of ANIMALS) {
  const { stands, transitions } = reachableFrom(PLAYER_START.x, PLAYER_START.y, p);
  const issues: string[] = [];

  // Nest reachable?
  let nestOk = false;
  for (const key of stands) {
    const [tx] = key.split(',').map(Number);
    if (Math.abs(tx - NEST.x) <= 1) { nestOk = true; break; }
  }
  if (!nestOk) issues.push('CANNOT REACH NEST');

  // Eggs
  const eggResults = EGGS.map(egg => {
    const result = eggCollectable(egg, stands, p);
    if (!result.collectable) issues.push(`Cannot get egg (${egg.x},${egg.y}) [${egg.type}]: ${result.reason}`);
    return { egg, ...result };
  });

  // Slides
  let slide1 = false, slide2 = false;
  for (const key of stands) {
    const [tx, fy] = key.split(',').map(Number);
    if (slide1Platforms) {
      const sx = slide1Platforms.topTileX;
      const sy = slide1Platforms.topTileY;
      if (Math.abs(tx - sx) <= 1 && Math.abs(fy - (sy * TILE + 6)) < 20) slide1 = true;
    }
    if (slide2Platforms) {
      const sx = slide2Platforms.topTileX;
      const sy = slide2Platforms.topTileY;
      if (Math.abs(tx - sx) <= 1 && Math.abs(fy - (sy * TILE + 6)) < 20) slide2 = true;
    }
  }
  if (!slide1) issues.push('Cannot reach water slide 1');
  if (!slide2) issues.push('Cannot reach water slide 2');

  // Count hard transitions
  const hardTrans = transitions.filter(t => t.difficulty === 'hard').length;

  // Fun score
  let fun = 50;
  const eggsFound = eggResults.filter(e => e.collectable).length;
  fun += eggsFound * 5;                                     // +35 max
  if (nestOk) fun += 10;
  if (slide1) fun += 5;
  if (slide2) fun += 5;
  if (p.canGlide) fun += 3;
  if (p.canDoubleJump || p.canSpinBounce) fun += 2;
  if (p.canDash) fun += 2;
  if (p.canWallJump) fun += 2;
  // Penalize hard transition RATIO, not raw count (many transitions exist between all pairs)
  const totalTrans = transitions.length;
  const hardRatio = totalTrans > 0 ? hardTrans / totalTrans : 0;
  fun -= Math.round(hardRatio * 30);                        // -30 max if all transitions hard
  fun -= issues.length * 20;                                // -20 per critical issue
  fun -= eggResults.filter(e => e.difficulty === 'hard').length * 5;
  fun = Math.max(0, Math.min(100, fun));

  results.push({ name: p.name, nestOk, eggResults, slide1, slide2, hardTransitions: hardTrans, funScore: fun, issues });

  const eggStr = eggResults.map(e =>
    e.collectable
      ? (e.difficulty === 'easy' ? '✓' : e.difficulty === 'medium' ? '○' : '△')
      : '✗'
  ).join(' ');
  const status = issues.length === 0 ? '✅' : `⚠️  ${issues.length} issues`;

  console.log(
    `${p.name.padEnd(10)} │ Eggs[${eggStr}] │ Nest:${nestOk ? '✓' : '✗'} S1:${slide1 ? '✓' : '✗'} S2:${slide2 ? '✓' : '✗'} │ Hard:${hardTrans} │ Fun:${fun.toString().padStart(3)} │ ${status}`,
  );
  for (const iss of issues) {
    console.log(`           │   └─ ${iss}`);
  }
}

// Summary
console.log('\n═'.repeat(110));
const allOk = results.every(r => r.issues.length === 0);
const avgFun = results.reduce((s, r) => s + r.funScore, 0) / results.length;

console.log(`\nOVERALL: ${allOk ? '✅ ALL PASS' : '❌ ISSUES FOUND'}  │  Avg fun: ${avgFun.toFixed(1)}/100`);

// Egg difficulty breakdown
console.log('\nEGG DIFFICULTY MATRIX (✓=easy ○=medium △=hard ✗=impossible):');
console.log('  ' + 'Animal'.padEnd(10) + EGGS.map(e => `(${e.x},${e.y})`.padStart(8)).join(''));
for (const r of results) {
  const row = r.eggResults.map(e => {
    const sym = e.collectable
      ? (e.difficulty === 'easy' ? '  ✓  ' : e.difficulty === 'medium' ? '  ○  ' : '  △  ')
      : '  ✗  ';
    return sym.padStart(8);
  }).join('');
  console.log('  ' + r.name.padEnd(10) + row);
}

// Fun ranking
console.log('\nFUN RANKING:');
[...results].sort((a, b) => b.funScore - a.funScore).forEach((r, i) => {
  const bar = '█'.repeat(Math.floor(r.funScore / 5));
  console.log(`  ${(i + 1).toString().padStart(2)}. ${r.name.padEnd(10)} ${r.funScore.toString().padStart(3)} ${bar}`);
});

if (!allOk) {
  console.log('\n❌ LEVEL NEEDS FIXES — see issues above');
  process.exit(1);
}
