// Level data: 2D tile arrays
// 0 = empty, 1 = sidewalk/ground, 2 = foundation/underground, 3 = brick wall, 4 = awning/ledge
// Level dimensions: each tile is 32x32

export interface EggPlacement {
  x: number;
  y: number;
  type: 'white' | 'golden' | 'rainbow';
}

export interface EggSpawnPoint {
  x: number;
  y: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface NestPlacement {
  x: number;
  y: number;
}

export interface WaterSlide {
  // All coordinates in pixels
  topX: number;
  topY: number;
  bottomX: number;
  bottomY: number;
  // Control point for the bezier curve (makes the slide curved)
  curveX: number;
  curveY: number;
}

export interface MovingPlatform {
  startX: number;  // tile coordinates
  startY: number;
  endX: number;
  endY: number;
  duration: number; // ms for full cycle
}

export interface WindZone {
  x: number;       // tile coordinates
  y: number;
  width: number;   // in tiles
  height: number;
  direction: 'left' | 'right' | 'up';
  strength: number; // velocity added per frame
}

export interface Puddle {
  x: number;       // tile coordinates
  y: number;
  width: number;   // in tiles
  slowFactor: number; // 0.5 = half speed
}

export interface LevelData {
  id: number;
  name: string;
  theme: 'rooftop' | 'park' | 'underground';
  tiles: number[][];
  eggSpawnPoints: EggSpawnPoint[];
  nest: NestPlacement;
  playerStart: { x: number; y: number };
  waterSlides: WaterSlide[];
  movingPlatforms?: MovingPlatform[];
  windZones?: WindZone[];
  puddles?: Puddle[];
  medalThresholds: {
    gold: number;   // seconds
    silver: number;
    bronze: number;
  };
}

/** Pick 3 eggs from the spawn pool: 1 easy (white), 1 medium (golden), 1 hard (rainbow) */
export function selectEggs(spawnPoints: EggSpawnPoint[]): EggPlacement[] {
  const easy = spawnPoints.filter(p => p.difficulty === 'easy');
  const medium = spawnPoints.filter(p => p.difficulty === 'medium');
  const hard = spawnPoints.filter(p => p.difficulty === 'hard');

  const pick = (arr: EggSpawnPoint[]) => arr[Math.floor(Math.random() * arr.length)];

  const eggs: EggPlacement[] = [];
  if (easy.length > 0) {
    const p = pick(easy);
    eggs.push({ x: p.x, y: p.y, type: 'white' });
  }
  if (medium.length > 0) {
    const p = pick(medium);
    eggs.push({ x: p.x, y: p.y, type: 'golden' });
  }
  if (hard.length > 0) {
    const p = pick(hard);
    eggs.push({ x: p.x, y: p.y, type: 'rainbow' });
  }

  return eggs;
}

// ═══════════════════════════════════════════════════════════════
//  LEVEL 1: Rooftop Garden
// ═══════════════════════════════════════════════════════════════

export const LEVEL_1: LevelData = {
  id: 1,
  name: 'Rooftop Garden',
  theme: 'rooftop',
  playerStart: { x: 2, y: 12 },
  nest: { x: 48, y: 12 },
  medalThresholds: { gold: 40, silver: 65, bronze: 120 },

  eggSpawnPoints: [
    // Easy (6): on ground level, safe flat areas
    { x: 4,  y: 12, difficulty: 'easy' },
    { x: 10, y: 12, difficulty: 'easy' },
    { x: 22, y: 12, difficulty: 'easy' },
    { x: 30, y: 12, difficulty: 'easy' },
    { x: 42, y: 12, difficulty: 'easy' },
    { x: 46, y: 12, difficulty: 'easy' },

    // Medium (4): on gap bridges or near slide entry platforms
    { x: 15, y: 11, difficulty: 'medium' },
    { x: 17, y: 11, difficulty: 'medium' },
    { x: 35, y: 11, difficulty: 'medium' },
    { x: 37, y: 10, difficulty: 'medium' },

    // Hard (2): high platforms or wall-jump area
    { x: 19, y: 10, difficulty: 'hard' },
    { x: 38, y: 8,  difficulty: 'hard' },
  ],

  waterSlides: [
    // Slide 1: gentle intro slide (entry at y=10, x=19-20)
    {
      topX: 20 * 32, topY: 10 * 32,
      bottomX: 25 * 32, bottomY: 12.5 * 32,
      curveX: 23 * 32, curveY: 10 * 32,
    },
    // Slide 2: taller, faster climax slide (entry at y=8, x=38-39)
    {
      topX: 39 * 32, topY: 8 * 32,
      bottomX: 44 * 32, bottomY: 12.5 * 32,
      curveX: 42 * 32, curveY: 8.5 * 32,
    },
  ],

  tiles: buildCityLevel(),
};

function buildCityLevel(): number[][] {
  const W = 50;
  const H = 16;
  const tiles: number[][] = [];

  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    for (let x = 0; x < W; x++) {
      if (y === 13) tiles[y][x] = 1;       // Sidewalk
      else if (y >= 14) tiles[y][x] = 2;   // Underground
      else tiles[y][x] = 0;                // Sky
    }
  }

  // Two small gaps
  for (let x = 15; x <= 16; x++) {
    tiles[13][x] = 0; tiles[14][x] = 0; tiles[15][x] = 0;
  }
  for (let x = 32; x <= 33; x++) {
    tiles[13][x] = 0; tiles[14][x] = 0; tiles[15][x] = 0;
  }

  // Gap bridges
  for (let x = 14; x <= 17; x++) tiles[11][x] = 4;
  for (let x = 31; x <= 34; x++) tiles[11][x] = 4;

  // Wall-jump pair
  for (let y = 7; y <= 10; y++) tiles[y][28] = 3;
  for (let y = 7; y <= 10; y++) tiles[y][31] = 3;

  // Slide 1 stepping platforms
  tiles[11][17] = 4; tiles[11][18] = 4;
  tiles[10][19] = 4; tiles[10][20] = 4;

  // Slide 2 stepping platforms
  tiles[11][35] = 4; tiles[11][36] = 4;
  tiles[10][37] = 4; tiles[10][38] = 4;
  tiles[8][38] = 4; tiles[8][39] = 4;

  return tiles;
}

// ═══════════════════════════════════════════════════════════════
//  LEVEL 2: City Park — wider, more vertical, obstacles
// ═══════════════════════════════════════════════════════════════

export const LEVEL_2: LevelData = {
  id: 2,
  name: 'City Park',
  theme: 'park',
  playerStart: { x: 2, y: 12 },
  nest: { x: 50, y: 12 },
  medalThresholds: { gold: 50, silver: 80, bronze: 150 },

  eggSpawnPoints: [
    // Easy (5): ground level
    { x: 6,  y: 12, difficulty: 'easy' },
    { x: 14, y: 12, difficulty: 'easy' },
    { x: 26, y: 12, difficulty: 'easy' },
    { x: 38, y: 12, difficulty: 'easy' },
    { x: 48, y: 12, difficulty: 'easy' },

    // Medium (4): on platforms
    { x: 10, y: 10, difficulty: 'medium' },
    { x: 22, y: 9,  difficulty: 'medium' },
    { x: 34, y: 10, difficulty: 'medium' },
    { x: 44, y: 9,  difficulty: 'medium' },

    // Hard (3): high up, wall-jump area
    { x: 18, y: 7,  difficulty: 'hard' },
    { x: 30, y: 6,  difficulty: 'hard' },
    { x: 42, y: 7,  difficulty: 'hard' },
  ],

  waterSlides: [
    // Short gentle slide
    {
      topX: 18 * 32, topY: 7 * 32,
      bottomX: 22 * 32, bottomY: 12.5 * 32,
      curveX: 20 * 32, curveY: 7 * 32,
    },
    // Tall S-curve slide
    {
      topX: 42 * 32, topY: 7 * 32,
      bottomX: 47 * 32, bottomY: 12.5 * 32,
      curveX: 45 * 32, curveY: 7.5 * 32,
    },
  ],

  movingPlatforms: [
    // Horizontal patrol between trees
    { startX: 10, startY: 10, endX: 16, endY: 10, duration: 3000 },
    // Vertical lift
    { startX: 30, startY: 12, endX: 30, endY: 6, duration: 4000 },
  ],

  windZones: [
    // Gust pushing right near a gap
    { x: 23, y: 10, width: 4, height: 3, direction: 'right', strength: 120 },
  ],

  puddles: [
    // Muddy patch slowing the player
    { x: 35, y: 13, width: 3, slowFactor: 0.5 },
  ],

  tiles: buildParkLevel(),
};

function buildParkLevel(): number[][] {
  const W = 52;
  const H = 16;
  const tiles: number[][] = [];

  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    for (let x = 0; x < W; x++) {
      if (y === 13) tiles[y][x] = 1;
      else if (y >= 14) tiles[y][x] = 2;
      else tiles[y][x] = 0;
    }
  }

  // Three gaps (2 tiles each)
  for (let x = 19; x <= 20; x++) {
    tiles[13][x] = 0; tiles[14][x] = 0; tiles[15][x] = 0;
  }
  for (let x = 33; x <= 34; x++) {
    tiles[13][x] = 0; tiles[14][x] = 0; tiles[15][x] = 0;
  }
  for (let x = 45; x <= 46; x++) {
    tiles[13][x] = 0; tiles[14][x] = 0; tiles[15][x] = 0;
  }

  // Platform layers — tree canopy areas
  // Layer 1: y=11 (low platforms)
  for (let x = 8; x <= 11; x++) tiles[11][x] = 4;
  for (let x = 24; x <= 27; x++) tiles[11][x] = 4;
  for (let x = 40; x <= 43; x++) tiles[11][x] = 4;

  // Layer 2: y=9 (mid platforms)
  for (let x = 10; x <= 12; x++) tiles[9][x] = 4;
  for (let x = 21; x <= 23; x++) tiles[9][x] = 4;
  for (let x = 43; x <= 45; x++) tiles[9][x] = 4;

  // Layer 3: y=7 (high platforms)
  for (let x = 17; x <= 19; x++) tiles[7][x] = 4;
  for (let x = 41; x <= 43; x++) tiles[7][x] = 4;

  // Wall-jump pair (two pillars)
  for (let y = 6; y <= 10; y++) tiles[y][28] = 3;
  for (let y = 6; y <= 10; y++) tiles[y][32] = 3;
  // Small platform between walls at top for hard egg
  tiles[6][29] = 4; tiles[6][30] = 4; tiles[6][31] = 4;

  // Stepping platforms for slide 1 entry
  tiles[10][16] = 4; tiles[10][17] = 4;
  tiles[8][17] = 4; tiles[8][18] = 4;

  // Stepping platforms for slide 2 entry
  tiles[10][40] = 4; tiles[10][41] = 4;
  tiles[8][41] = 4; tiles[8][42] = 4;

  // Gap bridges (platforms over the gaps)
  for (let x = 18; x <= 21; x++) tiles[11][x] = 4;
  for (let x = 32; x <= 35; x++) tiles[11][x] = 4;
  for (let x = 44; x <= 47; x++) tiles[11][x] = 4;

  return tiles;
}

// ═══════════════════════════════════════════════════════════════
//  LEVEL 3: Underground Tunnels — maze-like, tighter spaces
// ═══════════════════════════════════════════════════════════════

export const LEVEL_3: LevelData = {
  id: 3,
  name: 'Underground Tunnels',
  theme: 'underground',
  playerStart: { x: 2, y: 14 },
  nest: { x: 45, y: 14 },
  medalThresholds: { gold: 55, silver: 90, bronze: 160 },

  eggSpawnPoints: [
    // Easy (3): on main ground
    { x: 8,  y: 14, difficulty: 'easy' },
    { x: 24, y: 14, difficulty: 'easy' },
    { x: 40, y: 14, difficulty: 'easy' },

    // Medium (5): on platforms in corridors
    { x: 12, y: 11, difficulty: 'medium' },
    { x: 18, y: 8,  difficulty: 'medium' },
    { x: 28, y: 11, difficulty: 'medium' },
    { x: 34, y: 8,  difficulty: 'medium' },
    { x: 42, y: 11, difficulty: 'medium' },

    // Hard (4): in hidden alcoves or behind obstacles
    { x: 6,  y: 5,  difficulty: 'hard' },
    { x: 22, y: 5,  difficulty: 'hard' },
    { x: 36, y: 5,  difficulty: 'hard' },
    { x: 44, y: 5,  difficulty: 'hard' },
  ],

  waterSlides: [
    // Vertical drop from upper corridor
    {
      topX: 22 * 32, topY: 5 * 32,
      bottomX: 26 * 32, bottomY: 14 * 32,
      curveX: 25 * 32, curveY: 8 * 32,
    },
  ],

  movingPlatforms: [
    // Vertical elevator shaft 1
    { startX: 15, startY: 14, endX: 15, endY: 8, duration: 3500 },
    // Vertical elevator shaft 2
    { startX: 38, startY: 14, endX: 38, endY: 5, duration: 4000 },
  ],

  windZones: [
    // Air vent pushing up (helps reach upper corridor)
    { x: 10, y: 8, width: 2, height: 6, direction: 'up', strength: 180 },
    // Wind tunnel pushing right
    { x: 30, y: 7, width: 5, height: 2, direction: 'right', strength: 100 },
  ],

  puddles: [
    // Muddy patches in the tunnels
    { x: 8, y: 15, width: 3, slowFactor: 0.4 },
    { x: 32, y: 15, width: 3, slowFactor: 0.4 },
  ],

  tiles: buildUndergroundLevel(),
};

function buildUndergroundLevel(): number[][] {
  const W = 48;
  const H = 18;
  const tiles: number[][] = [];

  // Start with everything as stone (cave walls)
  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    for (let x = 0; x < W; x++) {
      tiles[y][x] = 3; // Stone everywhere
    }
  }

  // Carve out the main lower corridor (y=13-14 walkable, y=15 is ground)
  for (let x = 0; x < W; x++) {
    tiles[15][x] = 2; // Floor (dirt)
    for (let y = 12; y <= 14; y++) {
      tiles[y][x] = 0; // Air (walking space)
    }
  }

  // Carve out upper corridor (y=6-8 walkable, y=9 is ground)
  for (let x = 4; x < W - 2; x++) {
    tiles[9][x] = 1; // Upper floor (grass-colored for variety)
    for (let y = 4; y <= 8; y++) {
      tiles[y][x] = 0; // Air
    }
  }

  // Carve vertical shafts connecting upper and lower corridors
  // Shaft 1: x=14-16
  for (let y = 8; y <= 14; y++) {
    tiles[y][14] = 0; tiles[y][15] = 0; tiles[y][16] = 0;
  }
  // Shaft 2: x=22-24 (wider for water slide)
  for (let y = 4; y <= 14; y++) {
    tiles[y][22] = 0; tiles[y][23] = 0; tiles[y][24] = 0; tiles[y][25] = 0; tiles[y][26] = 0;
  }
  // Shaft 3: x=37-39
  for (let y = 4; y <= 14; y++) {
    tiles[y][37] = 0; tiles[y][38] = 0; tiles[y][39] = 0;
  }

  // Air vent shaft (x=10-11, for wind zone)
  for (let y = 8; y <= 14; y++) {
    tiles[y][10] = 0; tiles[y][11] = 0;
  }

  // Platforms inside shafts for climbing
  // Shaft 1 stepping platforms
  tiles[12][14] = 4; tiles[12][15] = 4;
  tiles[10][15] = 4; tiles[10][16] = 4;

  // Shaft 3 stepping platforms
  tiles[12][38] = 4; tiles[12][39] = 4;
  tiles[10][37] = 4; tiles[10][38] = 4;
  tiles[7][38] = 4; tiles[7][39] = 4;

  // Hidden alcoves (small rooms with hard eggs)
  // Alcove at x=5-7, y=4-6 (already open from upper corridor)
  // Alcove at x=35-37, y=4-6 (also from upper corridor)
  // Alcove at x=43-45, y=4-6
  for (let y = 4; y <= 6; y++) {
    tiles[y][43] = 0; tiles[y][44] = 0; tiles[y][45] = 0;
  }

  // Ceiling openings (skylights) — decorative
  tiles[3][20] = 0; tiles[3][21] = 0;
  tiles[3][35] = 0; tiles[3][36] = 0;

  // Some wall pillars in lower corridor for variety
  for (let y = 12; y <= 13; y++) {
    tiles[y][20] = 3;
    tiles[y][30] = 3;
  }

  // Platforms in lower corridor
  tiles[12][10] = 4; tiles[12][11] = 4;
  tiles[11][27] = 4; tiles[11][28] = 4; tiles[11][29] = 4;
  tiles[11][41] = 4; tiles[11][42] = 4;

  return tiles;
}

// ═══════════════════════════════════════════════════════════════
//  ALL LEVELS
// ═══════════════════════════════════════════════════════════════

export const LEVELS: LevelData[] = [LEVEL_1, LEVEL_2, LEVEL_3];
