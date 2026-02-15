/**
 * LEVEL DESIGN RULES — Deedee's Egg Adventures
 *
 * Target audience: 7-year-old. Levels should be fun, fair, and forgiving.
 * These rules are checked by the simulator (tools/level-sim.ts).
 */

// ═══════════════════════════════════════════════════
//  PHYSICS CONSTRAINTS (derived from game code)
// ═══════════════════════════════════════════════════

export const PHYSICS = {
  TILE: 32,
  PLAYER_BODY_W: 24,
  PLAYER_BODY_H: 30,

  // Platform (type 4): thin ledge, body height 12px, placed at y*32+6
  // Full tile (type 1,2,3): body 32x32, placed at y*32+16
  PLATFORM_SURFACE_OFFSET: 6,   // surface at y*TILE + 6
  FULL_TILE_TOP: 0,             // surface at y*TILE

  // Jump heights (pixels) for the weakest animals:
  TURTLE_MAX_JUMP: 75,    // weakest single-jumper
  PENGUIN_MAX_JUMP: 83,   // second weakest
  FOX_MAX_JUMP: 92,       // third weakest (but has dash)
};

// ═══════════════════════════════════════════════════
//  STRUCTURAL RULES
// ═══════════════════════════════════════════════════

export const STRUCTURE_RULES = {
  // Gaps in the ground
  MAX_GAP_WIDTH: 2,         // tiles — must be jumpable by ALL animals
  GAP_MUST_HAVE_BRIDGE: true, // y=12 platform bridge over every gap

  // Headroom above walkable surfaces
  MIN_HEADROOM_TILES: 2,   // minimum vertical gap between surfaces
  // Exception: walls touching a platform they sit on (pillar on platform) is OK

  // Walls / pillars
  WALLS_MUST_BE_GROUNDED: true,     // bottom of wall must touch a surface (ground or platform)
  WALLS_NOT_ON_MAIN_PATH: true,     // no walls at y=12 or y=13 that block walking
  WALL_JUMP_PAIR_GAP: [3, 5],       // tiles apart for wall-jump pairs
  WALLS_CLEAR_OF_SLIDES: true,      // no walls in the bezier path of any water slide

  // No floating objects
  EGGS_MUST_HAVE_SUPPORT: true,     // egg must be on or within 1 tile above a surface
  NEST_MUST_BE_REACHABLE: true,     // walkable path from start to nest
};

// ═══════════════════════════════════════════════════
//  DIFFICULTY RULES
// ═══════════════════════════════════════════════════

export const DIFFICULTY_RULES = {
  // All mandatory actions must be achievable by the WEAKEST animal (turtle)
  MANDATORY_MAX_JUMP_PX: 64,  // ~2 tiles — comfy for turtle (75px max)
  MANDATORY_MAX_GAP_TILES: 2, // horizontal gap the player MUST cross

  // Eggs should range from easy to moderate
  EASY_EGGS_PERCENT: 60,      // % of eggs on the main ground-level path
  MEDIUM_EGGS_PERCENT: 30,    // % requiring a jump or short detour
  BONUS_EGGS_PERCENT: 10,     // % in optional challenge areas (slides, wall areas)

  // Fun score targets (from simulator)
  MIN_FUN_SCORE: 70,          // every animal must score at least this
  TARGET_AVG_FUN: 85,         // average across all animals
};

// ═══════════════════════════════════════════════════
//  PACING & FLOW RULES
// ═══════════════════════════════════════════════════

export const PACING_RULES = {
  // Level flows left-to-right. Divide into zones:
  ZONES: [
    {
      name: 'Tutorial',
      xRange: [0, 12],
      description: 'Safe flat ground. Player learns controls. First easy egg.',
      features: ['flat ground', 'first egg on ground', 'no gaps', 'wall-jump pair for practice'],
    },
    {
      name: 'First Challenge',
      xRange: [13, 25],
      description: 'First gap, platforms above ground, water slide 1 as reward.',
      features: ['gap with bridge', 'y=12 platforms', 'water slide 1 entry', 'eggs on platforms'],
    },
    {
      name: 'Mid-Section',
      xRange: [26, 37],
      description: 'Second gap, wall-jump area, more complex platforming.',
      features: ['gap with bridge', 'wall-jump pair', 'mixed platforms', 'water slide 2 entry'],
    },
    {
      name: 'Finale',
      xRange: [38, 49],
      description: 'Slide 2 is the climax. Then easy path to nest.',
      features: ['water slide 2', 'easy final stretch', 'nest with clear approach'],
    },
  ],

  // Egg spacing: spread evenly across the level length
  MIN_EGG_SPACING_TILES: 5,   // at least 5 tiles between eggs
  MAX_EGG_SPACING_TILES: 12,  // at most 12 tiles between eggs

  // Rest points: flat, safe areas where kid can stop and breathe
  REST_POINT_INTERVAL: 10,    // tiles — a safe flat area every ~10 tiles
};

// ═══════════════════════════════════════════════════
//  WATER SLIDE RULES
// ═══════════════════════════════════════════════════

export const SLIDE_RULES = {
  SLIDES_ARE_OPTIONAL: true,        // never required for egg collection or nest
  MAX_STEPS_TO_ENTRY: 2,           // max intermediate platforms to reach slide top
  STEP_HEIGHT_TILES: 2,            // vertical gap between stepping platforms
  LANDING_MUST_BE_SAFE: true,      // slide bottom lands on platform/ground, not a gap
  CLEAR_PATH_AROUND_SLIDE: 3,     // tiles of clearance from walls on each side of curve
};

// ═══════════════════════════════════════════════════
//  ABILITY SHOWCASE RULES
// ═══════════════════════════════════════════════════

export const ABILITY_RULES = {
  // Each zone should have features that let different animals shine
  WALL_JUMP_PAIRS: 3,              // number of wall-jump pairs in level
  OPEN_AIR_SECTIONS: true,         // areas with high ceilings for gliders
  SPEED_RUNS: true,                // long flat sections for fast animals
  DOUBLE_JUMP_PLATFORMS: true,     // platforms reachable only by double-jump (optional eggs)
};
