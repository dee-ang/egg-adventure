# Deedee's Egg Adventures — Game Design Spec

## Overview

A side-scrolling platformer where the player runs, jumps, and explores colorful biomes to collect mystery eggs. Each egg hatches into a new animal companion with a unique ability, unlocking new ways to traverse levels and reach previously inaccessible eggs. Built for a 7-year-old: simple controls, frequent rewards, cute art, zero reading required.

---

## 1. Core Design Pillars

1. **Surprise over choice** — Eggs hatch into random animals. The mystery is the fun.
2. **Ability-gated exploration** — New animals unlock new movement abilities, making old levels replayable with new paths.
3. **Constant reward drip** — Something exciting happens every 30-60 seconds (egg found, egg hatched, new animal, new area).
4. **Zero frustration** — No death. Falling into hazards bounces you back. Lives are infinite. Progress is never lost.

---

## 2. Gameplay

### Genre
Side-scrolling platformer (think Kirby, not Mario — forgiving, cute, ability-focused).

### Controls
| Action      | Key           |
|-------------|---------------|
| Move left   | A / Left arrow |
| Move right  | D / Right arrow |
| Jump        | Space / W / Up arrow |
| Use ability | E / Shift |
| Switch animal | Q / Tab |

Touch/mobile controls: on-screen buttons (future phase).

### Core Loop (moment-to-moment)
1. Run and jump through a scrolling level
2. Collect eggs placed along the path (some easy, some require skill/abilities)
3. Avoid simple hazards (bounce-back, no death)
4. Reach the end-of-level nest
5. Hatch collected eggs — animated reveal of new animal
6. Switch to new animal to reach previously blocked areas
7. Complete all levels in a biome to unlock the next one

### Hazards (bounce-back, not lethal)
- **Thorns/spikes** — static, placed on surfaces. Touching them bounces the player backward and plays a "bonk" sound. Brief invincibility frames.
- **Moving platforms** — platforms that slide or rotate. Not harmful, just tricky to ride.
- **Water** — without the Fish animal, water acts as a hazard (bounce out). With Fish, you swim through.
- **Wind gusts** — push the player sideways. With Bird, you can glide through them.

---

## 3. Animals & Abilities

The player starts as a **Bunny** (the default). New animals are unlocked by hatching eggs. Each animal replaces the player sprite AND changes the ability available.

### Animal Roster (MVP — 6 animals)

| Animal | Ability         | Description                                      | Unlock    |
|--------|-----------------|--------------------------------------------------|-----------|
| Bunny  | Double Jump     | Jump again mid-air. Default starter animal.      | Start     |
| Cat    | Wall Climb      | Cling to and climb up walls briefly.             | Egg hatch |
| Bird   | Glide           | Hold jump while airborne to fall slowly.         | Egg hatch |
| Frog   | High Jump       | Jump 2x higher than normal.                      | Egg hatch |
| Fish   | Swim            | Move freely through water sections.              | Egg hatch |
| Fox    | Dash            | Quick horizontal burst of speed. Breaks through cracked walls. | Egg hatch |

### Switching Animals
- Press Q/Tab to cycle through unlocked animals
- A radial menu appears (brief pause, icons around a circle)
- Current animal sprite swaps immediately with a puff-of-smoke particle effect

### Stats
All animals share the same base speed and jump height. Abilities are the only differentiator. This keeps things simple — no stat balancing needed.

---

## 4. Egg System

### Placement
- Each level contains **3-5 eggs**
- Eggs are color-coded by rarity (visual only — the animal inside is random from a weighted pool)
  - **White egg** — common (appears frequently)
  - **Golden egg** — uncommon (placed in harder-to-reach spots)
  - **Rainbow egg** — rare (one per biome, well hidden)

### Collection
- Walk into an egg to collect it
- Egg flies into the UI inventory bar with a satisfying arc animation
- Counter updates: "3/5 eggs"
- Sparkle particle burst at collection point

### Hatching (End-of-Level Nest)
- At the end of each level is a **nest** (the finish point)
- When the player reaches the nest, a hatching screen appears
- Each collected egg is shown in a row
- Player taps/clicks each egg to hatch it one-by-one
- **Hatch animation**: egg wobbles → cracks appear → breaks open → animal pops out with confetti particles
- If the animal is new: "NEW!" banner, animal added to roster, brief showcase of ability
- If the animal is a duplicate: "You found another [animal]!" — awards a **star** (cosmetic currency for future use)

### Weighted Hatch Pool
- Each biome has its own pool of hatchable animals
- Animals needed for the current/next biome have higher weight
- This prevents soft-locks (player always gets the animal they need within a few eggs)

```
Biome 1 pool: Bunny (already owned), Cat (40%), Bird (40%), Frog (20%)
Biome 2 pool: Frog (35%), Fish (35%), Fox (30%)
Biome 3 pool: All animals equal weight + rare special variant
```

---

## 5. Biomes & Levels

### Structure
- 3 biomes in MVP
- Each biome has **4 levels** + 1 **bonus level** (unlocked by finding all eggs)
- Levels are single-direction scrolling (left to right), ~60-90 seconds to complete

### Biome 1 — Sunny Meadow
- **Visual theme**: Green grass, blue sky, flowers, butterflies in background
- **Colors**: Bright greens, yellows, sky blue
- **Hazards**: Basic thorns, small gaps
- **Ability focus**: Bunny (double jump), introduces Cat (wall climb) and Bird (glide)
- **Level 1**: Tutorial — flat ground, a few platforms, 3 easy eggs, teaches movement
- **Level 2**: Introduces gaps requiring double jump, 4 eggs
- **Level 3**: Introduces walls that Cat can climb, 4 eggs (1 requires wall climb)
- **Level 4**: Combines all abilities, 5 eggs, includes 1 golden egg requiring Bird glide
- **Bonus**: Hidden paths, requires all 3 biome-1 animals, 1 rainbow egg

### Biome 2 — Crystal Caves
- **Visual theme**: Underground, glowing crystals, underground streams
- **Colors**: Deep purples, teals, glowing cyan accents
- **Hazards**: Water pools, moving platforms, wind gusts from vents
- **Ability focus**: Frog (high jump), Fish (swim), Fox (dash)
- **Levels**: Progressively introduce water traversal, high vertical sections, cracked walls

### Biome 3 — Sky Islands
- **Visual theme**: Floating islands, clouds, rainbow bridges, sunset sky
- **Colors**: Warm oranges, pinks, gold, white clouds
- **Hazards**: Moving cloud platforms, wind gusts, long gaps
- **Ability focus**: All animals needed. This is the "mastery" biome.
- **Final level**: Large multi-section level requiring frequent animal switching

---

## 6. Level Design Principles

1. **Every egg is visible** — the player can always SEE the egg, even if they can't reach it yet. This creates desire ("I need to come back with Bird!").
2. **Main path is always completable** — you can reach the nest with just Bunny. Eggs off the main path require specific abilities.
3. **No backtracking required within a level** — scrolling is one-direction. Ability-gated eggs are on alternate paths, not behind the player.
4. **Teach through level design, not text** — first encounter with a wall-climb section has a single obvious wall with an egg on top. No tutorial popups.
5. **Short levels** — 60-90 seconds. A 7-year-old's attention span is the constraint.

---

## 7. UI & Screens

### Title Screen
- Game logo: "Deedee's Egg Adventures" in playful, bubbly font
- Background: animated meadow scene with animals walking by
- Single big button: **PLAY** (no menus, no settings for MVP)
- Small button: **Collection** (view unlocked animals)

### Animal Select (before entering a level)
- Shows all unlocked animals as clickable icons in a row
- Selected animal is highlighted with a bounce animation
- "GO!" button to start the level
- Player can also switch mid-level, so this is just the starting pick

### In-Game HUD
- **Top-left**: Current animal icon + ability icon
- **Top-right**: Egg counter (e.g., "2/5" with egg icon)
- **Top-center**: Biome + Level name (e.g., "Sunny Meadow - 3")
- No health bar (no health system)
- No timer (no time pressure)
- No score (eggs ARE the score)

### Hatch Screen
- Full-screen overlay after reaching the nest
- Eggs displayed in a row, wobbling gently
- Tap to hatch each one (see Section 4)
- "Continue" button appears after all eggs hatched
- Transitions to level select or next level

### Level Select (per biome)
- Shows biome as a path/map with level nodes
- Completed levels show a checkmark
- Egg count shown per level (e.g., "3/5")
- Locked levels shown as greyed-out
- Biome transition: locked biomes show a big egg that "cracks" when requirements are met

### Collection Screen
- Grid of all animals (silhouetted if locked, full art if unlocked)
- Tapping an unlocked animal shows: name, ability description (as an icon, not text), animation preview

---

## 8. Art Style & Assets

### Style
- **Pixel art, 32x32 tile size** for characters and tiles
- **16-color palette per biome** (limited palette = cohesive look, faster to create)
- Clean outlines, chunky proportions (big heads, small bodies — cute factor)
- Parallax scrolling backgrounds (3 layers: far sky, mid elements, near ground)

### Asset List (MVP)

**Characters (32x32 spritesheet each, 4-frame walk cycle + idle + jump + ability)**
- Bunny
- Cat
- Bird
- Frog
- Fish
- Fox

**Eggs (16x16)**
- White egg (idle wobble animation, 2 frames)
- Golden egg (idle wobble + sparkle, 3 frames)
- Rainbow egg (color-cycling animation, 4 frames)
- Cracking animation (shared, 5 frames)

**Tiles (32x32 each)**
- Biome 1: grass, dirt, stone, flower decorations, thorns
- Biome 2: cave rock, crystal, water surface, water deep, cave moss
- Biome 3: cloud platform, sky brick, rainbow bridge, gold trim

**Backgrounds (parallax layers, tiling)**
- Biome 1: sky gradient, distant hills, nearby trees
- Biome 2: cave gradient, far crystals, near stalactites
- Biome 3: sunset gradient, far clouds, near floating islands

**UI**
- Animal icons (32x32 portrait for each animal)
- Egg icon for HUD
- Button sprites (Play, Go, Continue)
- Nest sprite (end-of-level marker)

**Particles (code-generated, not sprites)**
- Sparkles (egg collection)
- Confetti (egg hatch)
- Smoke puff (animal switch)
- Bounce stars (hazard hit)

---

## 9. Sound Design

All sounds should be synthesized or sourced from free libraries. No licensed music.

- **BGM**: One looping track per biome (cheerful, upbeat, not distracting)
- **Egg collect**: Bright chime (ascending pitch per consecutive egg)
- **Egg hatch**: Cracking sound → triumphant jingle
- **Jump**: Soft boing
- **Hazard bounce**: Comedic bonk
- **Animal switch**: Whoosh + pop
- **Level complete**: Celebratory fanfare (short, 2-3 seconds)
- **New animal unlocked**: Extended fanfare + sparkle sounds

---

## 10. Technical Architecture

### Framework
**Phaser 3** with TypeScript
- Built-in physics (Arcade physics for simple platformer)
- Sprite animation system
- Tilemap support (design levels in Tiled, export as JSON)
- Camera follow and bounds
- Input handling (keyboard + future touch)
- Asset loading and caching
- Scene management

### Build Tooling
- **Vite** for dev server and bundling
- TypeScript strict mode
- Output: static files deployable anywhere (Netlify, GitHub Pages, etc.)

### Project Structure
```
danae_game/
  src/
    main.ts                 # Phaser game config, entry point
    scenes/
      BootScene.ts          # Asset preloading
      TitleScene.ts         # Title screen
      LevelSelectScene.ts   # Biome/level selection
      GameScene.ts          # Main gameplay
      HatchScene.ts         # Egg hatching screen
      CollectionScene.ts    # Animal collection viewer
    entities/
      Player.ts             # Player controller (movement, abilities, animal switching)
      Egg.ts                # Egg collectible behavior
      Hazard.ts             # Hazard bounce-back behavior
    data/
      animals.ts            # Animal definitions (stats, abilities, sprite keys)
      biomes.ts             # Biome definitions (levels, egg pools, themes)
      levels.ts             # Level data or Tiled JSON references
    systems/
      AbilitySystem.ts      # Handles ability activation per animal type
      HatchSystem.ts        # Egg hatching logic, weighted random
      ProgressSystem.ts     # Tracks eggs, unlocks, biome completion
      SaveSystem.ts         # LocalStorage save/load
    ui/
      HUD.ts                # In-game HUD overlay
      AnimalSelect.ts       # Animal switching radial menu
    utils/
      particles.ts          # Particle effect helpers
  assets/
    sprites/                # Character spritesheets
    tiles/                  # Tilemap tilesets
    maps/                   # Tiled JSON level maps
    audio/                  # Sound effects and music
    ui/                     # UI element images
  index.html
  vite.config.ts
  tsconfig.json
  package.json
```

### Key Technical Decisions

**Physics**: Phaser Arcade Physics. Gravity-based, AABB collision. Simple and fast.

**Levels**: Designed in [Tiled Map Editor](https://www.mapeditor.org/) (free), exported as JSON. Phaser has native Tiled support. Each level is a tilemap with object layers for egg placement, hazard zones, and the nest.

**Save System**: LocalStorage. Save structure:
```typescript
interface SaveData {
  unlockedAnimals: string[];       // animal IDs
  eggsPerLevel: Record<string, number>;  // "biome1-level2": 3
  currentBiome: number;
  stars: number;                   // duplicate hatch currency
}
```

**State Management**: Simple singleton GameState object. No need for Redux/MobX — game state is small.

**Camera**: Phaser camera follows player with deadzone (player stays in left-center, level scrolls right).

---

## 11. Scope & Phases

### Phase 1 — Playable Core (build this first)
- [ ] Project setup (Vite + Phaser + TypeScript)
- [ ] Player movement: run, jump (Bunny only)
- [ ] Single test level: platforms, eggs, nest
- [ ] Egg collection with counter
- [ ] Basic hatch screen (egg → animal reveal)
- [ ] One biome tileset (Sunny Meadow)
- [ ] Placeholder art (colored rectangles → replace with pixel art)

**Deliverable**: You can run, jump, collect eggs, and hatch them in one level.

### Phase 2 — Animals & Abilities
- [ ] Animal switching system (Q/Tab)
- [ ] Implement all 6 animal abilities
- [ ] Ability-gated egg placements in levels
- [ ] Animal select screen before level
- [ ] Collection screen

**Deliverable**: Full animal roster with abilities affecting gameplay.

### Phase 3 — Full Biome 1
- [ ] Design 4 levels + 1 bonus in Tiled
- [ ] Final pixel art for Biome 1 tileset
- [ ] All 6 animal spritesheets (walk, jump, idle, ability)
- [ ] Egg art (white, golden, rainbow)
- [ ] Parallax background for Biome 1
- [ ] Level select screen
- [ ] Save/load system
- [ ] Hatch pool weighting for Biome 1

**Deliverable**: Complete, polished Biome 1 experience.

### Phase 4 — Biomes 2 & 3
- [ ] Crystal Caves tileset, backgrounds, levels
- [ ] Sky Islands tileset, backgrounds, levels
- [ ] Biome unlock flow (egg cracking animation)
- [ ] Final level (multi-section, all abilities)
- [ ] Title screen

### Phase 5 — Polish & Juice
- [ ] Sound effects
- [ ] Background music
- [ ] Particle effects (collection, hatch, switch, bounce)
- [ ] Screen shake on events
- [ ] UI animations and transitions
- [ ] Mobile/touch controls

### Future (post-MVP)
- Master Mode (replay with harder levels)
- Special character unlocks (yearly system from original spec)
- Cosmetic customization (hats, colors for animals)
- More biomes
- Achievements/badges

---

## 12. What Makes This Fun for a 7-Year-Old

1. **Mystery eggs** — "What's inside?!" is irresistible. Every egg is a present.
2. **Cute animals** — Collecting cute things is inherently satisfying.
3. **No failure** — Bounce-back hazards mean no frustration, just silly bonk sounds.
4. **Frequent rewards** — An egg every 15-20 seconds of play. A hatch every 60-90 seconds.
5. **Visible goals** — "I can SEE that egg but I can't reach it... I need the bird!" creates desire without frustration.
6. **Short sessions** — 60-90 second levels. Perfect for kid attention spans.
7. **Animal switching** — Choosing which animal to be is a power fantasy. "Now I'm a fox! Now I'm a bird!"
8. **Personalization** — It's literally called "Deedee's Egg Adventures." It's HER game.

---

## 13. Non-Goals (Explicitly Out of Scope)

- No combat / no enemies with AI
- No health / death / game over
- No text-heavy story or dialogue
- No multiplayer
- No microtransactions
- No external accounts or login
- No procedural generation (all levels hand-designed)
- No complex inventory management
