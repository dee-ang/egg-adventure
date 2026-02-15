import { BIOME1_HATCH_POOL } from '../data/animals';

export interface LeaderboardEntry {
  time: number;       // milliseconds
  animal: string;     // animal id used
  eggs: number;       // eggs collected
  date: number;       // timestamp
}

export interface LevelProgress {
  levelId: number;
  bestTime: number;      // milliseconds
  bestEggs: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  completed: boolean;
}

export interface GameProgress {
  unlockedAnimals: string[];
  currentAnimal: string;
  eggsCollectedThisLevel: number;
  totalEggsCollected: number;
  stars: number;
  leaderboard: LeaderboardEntry[];
  levelProgress: Record<number, LevelProgress>;
  animalXP: Record<string, number>;
}

class ProgressSystemClass {
  private progress: GameProgress = {
    unlockedAnimals: ['bunny'],
    currentAnimal: 'bunny',
    eggsCollectedThisLevel: 0,
    totalEggsCollected: 0,
    stars: 0,
    leaderboard: [],
    levelProgress: {},
    animalXP: {},
  };

  get state(): GameProgress {
    return this.progress;
  }

  collectEgg(): void {
    this.progress.eggsCollectedThisLevel++;
    this.progress.totalEggsCollected++;
  }

  resetLevelEggs(): void {
    this.progress.eggsCollectedThisLevel = 0;
  }

  addAnimalXP(id: string, amount: number): void {
    if (!this.progress.animalXP[id]) this.progress.animalXP[id] = 0;
    this.progress.animalXP[id] += amount;
    this.save();
  }

  getAnimalLevel(id: string): number {
    const xp = this.progress.animalXP[id] || 0;
    if (xp >= 12) return 3;
    if (xp >= 5) return 2;
    return 1;
  }

  hatchCombinedEggs(eggTypes: string[]): string {
    if (eggTypes.length === 0) return 'bunny';

    const count = eggTypes.length;
    const hasRainbow = eggTypes.includes('rainbow');

    // Try guaranteed new for 3+ eggs with rainbow
    if (count >= 3 && hasRainbow) {
      const newAnimal = this.hatchGuaranteedNew();
      if (newAnimal) return newAnimal;
    }

    // Build weight multipliers based on egg count
    let commonMul = 1;
    let uncommonMul = 1;
    let rareMul = 1;

    if (count === 2) {
      commonMul = 0.7; uncommonMul = 1.5; rareMul = 2;
    } else if (count >= 3 && !hasRainbow) {
      commonMul = 0.5; uncommonMul = 2; rareMul = 3;
    } else if (count >= 3 && hasRainbow) {
      // All unlocked fallback (guaranteed-new failed above)
      commonMul = 0.3; uncommonMul = 1; rareMul = 5;
    }

    // Golden eggs also boost rarity
    const goldenCount = eggTypes.filter(t => t === 'golden').length;
    if (goldenCount > 0) {
      commonMul *= Math.pow(0.7, goldenCount);
      rareMul *= Math.pow(1.5, goldenCount);
    }

    const adjustedPool = BIOME1_HATCH_POOL.map(entry => {
      let weight = entry.weight;
      if (entry.tier === 'common') weight *= commonMul;
      else if (entry.tier === 'uncommon') weight *= uncommonMul;
      else if (entry.tier === 'rare') weight *= rareMul;
      return { ...entry, weight };
    });

    const totalWeight = adjustedPool.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of adjustedPool) {
      roll -= entry.weight;
      if (roll <= 0) {
        const animalId = entry.id;
        if (!this.progress.unlockedAnimals.includes(animalId)) {
          this.progress.unlockedAnimals.push(animalId);
          this.save();
          return animalId;
        } else {
          this.progress.stars++;
          this.save();
          return animalId;
        }
      }
    }

    return adjustedPool[0].id;
  }

  hatchEgg(eggType: 'white' | 'golden' | 'rainbow' = 'white'): string {
    // Rainbow egg: guaranteed new unlock if any remain
    if (eggType === 'rainbow') {
      const newAnimal = this.hatchGuaranteedNew();
      if (newAnimal) return newAnimal;
      // All unlocked — fall through with rare-weighted roll
    }

    // Build weighted pool with multipliers based on egg type
    const adjustedPool = BIOME1_HATCH_POOL.map(entry => {
      let weight = entry.weight;
      if (eggType === 'golden') {
        if (entry.tier === 'common') weight *= 0.5;
        else weight *= 2;
      } else if (eggType === 'rainbow') {
        // All unlocked fallback: heavily favor rares
        if (entry.tier === 'rare') weight *= 5;
      }
      return { ...entry, weight };
    });

    const totalWeight = adjustedPool.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of adjustedPool) {
      roll -= entry.weight;
      if (roll <= 0) {
        const animalId = entry.id;
        if (!this.progress.unlockedAnimals.includes(animalId)) {
          this.progress.unlockedAnimals.push(animalId);
          this.save();
          return animalId; // New unlock!
        } else {
          this.progress.stars++;
          this.save();
          return animalId; // Duplicate — earned a star
        }
      }
    }

    // Fallback
    return adjustedPool[0].id;
  }

  hatchGuaranteedNew(): string | null {
    const unlocked = this.progress.unlockedAnimals;
    const notYetUnlocked = BIOME1_HATCH_POOL.filter(e => !unlocked.includes(e.id));
    if (notYetUnlocked.length === 0) return null;

    const pick = notYetUnlocked[Math.floor(Math.random() * notYetUnlocked.length)];
    this.progress.unlockedAnimals.push(pick.id);
    this.save();
    return pick.id;
  }

  isNewAnimal(id: string): boolean {
    // Check if this animal was JUST unlocked (exists exactly once — current hatch)
    return this.progress.unlockedAnimals.filter(a => a === id).length === 1;
  }

  hasAnimal(id: string): boolean {
    return this.progress.unlockedAnimals.includes(id);
  }

  setAnimal(id: string): void {
    if (this.hasAnimal(id)) {
      this.progress.currentAnimal = id;
    }
  }

  completeLevelRun(levelId: number, timeMs: number, eggs: number, totalEggs: number, thresholds: { gold: number; silver: number; bronze: number }): 'gold' | 'silver' | 'bronze' | null {
    const timeSec = Math.max(0, timeMs / 1000);
    const allEggs = eggs >= totalEggs;

    let medal: 'gold' | 'silver' | 'bronze' | null = null;
    if (allEggs && timeSec <= thresholds.gold) medal = 'gold';
    else if ((allEggs || eggs >= 2) && timeSec <= thresholds.silver) medal = 'silver';
    else if (eggs >= 1) medal = 'bronze';

    const existing = this.progress.levelProgress[levelId];
    const medalRank = { gold: 3, silver: 2, bronze: 1 };

    if (existing) {
      if (timeMs < existing.bestTime) existing.bestTime = timeMs;
      if (eggs > existing.bestEggs) existing.bestEggs = eggs;
      const existingRank = existing.medal ? medalRank[existing.medal] : 0;
      const newRank = medal ? medalRank[medal] : 0;
      if (newRank > existingRank) existing.medal = medal;
      existing.completed = true;
    } else {
      this.progress.levelProgress[levelId] = {
        levelId,
        bestTime: timeMs,
        bestEggs: eggs,
        medal,
        completed: true,
      };
    }
    this.save();
    return medal;
  }

  getLevelProgress(levelId: number): LevelProgress | null {
    return this.progress.levelProgress[levelId] || null;
  }

  isLevelUnlocked(levelId: number): boolean {
    if (levelId <= 1) return true;
    const prev = this.progress.levelProgress[levelId - 1];
    return prev?.completed === true;
  }

  addLeaderboardEntry(time: number, animal: string, eggs: number): void {
    this.progress.leaderboard.push({
      time, animal, eggs, date: Date.now(),
    });
    // Keep top 10, sorted by fastest time
    this.progress.leaderboard.sort((a, b) => a.time - b.time);
    this.progress.leaderboard = this.progress.leaderboard.slice(0, 10);
    this.save();
  }

  get bestTime(): LeaderboardEntry | null {
    if (this.progress.leaderboard.length === 0) return null;
    return this.progress.leaderboard[0];
  }

  save(): void {
    localStorage.setItem('deedee_save', JSON.stringify(this.progress));
  }

  load(): boolean {
    const data = localStorage.getItem('deedee_save');
    if (data) {
      const parsed = JSON.parse(data);
      // Merge with defaults so old saves without leaderboard still work
      this.progress = { ...this.progress, ...parsed };
      if (!this.progress.leaderboard) this.progress.leaderboard = [];
      if (!this.progress.levelProgress) this.progress.levelProgress = {};
      if (!this.progress.animalXP) this.progress.animalXP = {};
      return true;
    }
    return false;
  }

  unlockAll(): void {
    const allIds = BIOME1_HATCH_POOL.map(e => e.id);
    for (const id of allIds) {
      if (!this.progress.unlockedAnimals.includes(id)) {
        this.progress.unlockedAnimals.push(id);
      }
    }
    // Also ensure bunny is included
    if (!this.progress.unlockedAnimals.includes('bunny')) {
      this.progress.unlockedAnimals.push('bunny');
    }
    this.save();
  }

  reset(): void {
    this.progress = {
      unlockedAnimals: ['bunny'],
      currentAnimal: 'bunny',
      eggsCollectedThisLevel: 0,
      totalEggsCollected: 0,
      stars: 0,
      leaderboard: [],
      levelProgress: {},
      animalXP: {},
    };
    localStorage.removeItem('deedee_save');
  }

  get hasSaveData(): boolean {
    return localStorage.getItem('deedee_save') !== null;
  }
}

export const ProgressSystem = new ProgressSystemClass();
