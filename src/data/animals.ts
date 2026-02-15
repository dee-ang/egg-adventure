export interface AnimalDef {
  id: string;
  name: string;
  ability: string;
  abilityDesc: string;
  color: number;
  accentColor: number;
}

export const ANIMALS: Record<string, AnimalDef> = {
  bunny: {
    id: 'bunny',
    name: 'Bunny',
    ability: 'doubleJump',
    abilityDesc: 'Jump again mid-air!',
    color: 0xf5f5dc,
    accentColor: 0xffb6c1,
  },
  cat: {
    id: 'cat',
    name: 'Cat',
    ability: 'wallJump',
    abilityDesc: 'Jump off walls!',
    color: 0xff8c00,
    accentColor: 0xffd700,
  },
  bird: {
    id: 'bird',
    name: 'Bird',
    ability: 'glide',
    abilityDesc: 'Float through the air!',
    color: 0x4fc3f7,
    accentColor: 0xffeb3b,
  },
  frog: {
    id: 'frog',
    name: 'Frog',
    ability: 'highJump',
    abilityDesc: 'Jump super high!',
    color: 0x66bb6a,
    accentColor: 0xa5d6a7,
  },
  fish: {
    id: 'fish',
    name: 'Fish',
    ability: 'waterBoost',
    abilityDesc: 'Super fast on slides!',
    color: 0x42a5f5,
    accentColor: 0xef5350,
  },
  fox: {
    id: 'fox',
    name: 'Fox',
    ability: 'dash',
    abilityDesc: 'Dash forward fast!',
    color: 0xff7043,
    accentColor: 0xf5f5dc,
  },
  penguin: {
    id: 'penguin',
    name: 'Penguin',
    ability: 'slide',
    abilityDesc: 'Slide on your belly!',
    color: 0x263238,
    accentColor: 0xffffff,
  },
  hamster: {
    id: 'hamster',
    name: 'Hamster',
    ability: 'roll',
    abilityDesc: 'Press E to roll fast!',
    color: 0xffcc80,
    accentColor: 0xffe0b2,
  },
  owl: {
    id: 'owl',
    name: 'Owl',
    ability: 'eggRadar',
    abilityDesc: 'Glide + find eggs!',
    color: 0x8d6e63,
    accentColor: 0xffcc00,
  },
  turtle: {
    id: 'turtle',
    name: 'Turtle',
    ability: 'bounce',
    abilityDesc: 'Bouncy shell landing!',
    color: 0x4caf50,
    accentColor: 0x795548,
  },
  panda: {
    id: 'panda',
    name: 'Panda',
    ability: 'groundPound',
    abilityDesc: 'Slam down from the air!',
    color: 0xfafafa,
    accentColor: 0x212121,
  },
  hedgehog: {
    id: 'hedgehog',
    name: 'Hedgehog',
    ability: 'spinBounce',
    abilityDesc: 'Super spin bounce!',
    color: 0x795548,
    accentColor: 0xbcaaa4,
  },
  puppy: {
    id: 'puppy',
    name: 'Puppy',
    ability: 'magnet',
    abilityDesc: 'Eggs come to you!',
    color: 0xc8a86e,
    accentColor: 0x8d6e42,
  },
  mouse: {
    id: 'mouse',
    name: 'Mouse',
    ability: 'tiny',
    abilityDesc: 'Tiny and super fast!',
    color: 0xbdbdbd,
    accentColor: 0xf48fb1,
  },
  unicorn: {
    id: 'unicorn',
    name: 'Unicorn',
    ability: 'rainbow',
    abilityDesc: 'Leave a rainbow trail!',
    color: 0xf8f8ff,
    accentColor: 0xe1bee7,
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    ability: 'fly',
    abilityDesc: 'Fly anywhere!',
    color: 0x7e57c2,
    accentColor: 0xffab40,
  },
};

export const ANIMAL_LIST = Object.values(ANIMALS);

export type AnimalTier = 'common' | 'uncommon' | 'rare';

export const BIOME1_HATCH_POOL: { id: string; weight: number; tier: AnimalTier }[] = [
  { id: 'cat', weight: 15, tier: 'common' },
  { id: 'bird', weight: 15, tier: 'common' },
  { id: 'frog', weight: 12, tier: 'common' },
  { id: 'penguin', weight: 12, tier: 'common' },
  { id: 'fish', weight: 12, tier: 'common' },
  { id: 'hamster', weight: 10, tier: 'common' },
  { id: 'puppy', weight: 10, tier: 'common' },
  { id: 'owl', weight: 8, tier: 'uncommon' },
  { id: 'turtle', weight: 6, tier: 'uncommon' },
  { id: 'mouse', weight: 5, tier: 'uncommon' },
  { id: 'hedgehog', weight: 4, tier: 'uncommon' },
  { id: 'panda', weight: 3, tier: 'rare' },
  { id: 'fox', weight: 3, tier: 'rare' },
  { id: 'unicorn', weight: 2, tier: 'rare' },
  { id: 'dragon', weight: 1, tier: 'rare' },
];
