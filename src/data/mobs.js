export const mobTypes = {
  // Basic Mobs (Tier 0-1)
  orc: {
    name: 'Orc Forager',
    sprite: 'orc',
    hp: 30,
    speed: 45,
    attack: 6,
    attackRate: 1200,
    aggroRange: 120,
    tier: 1,
    drops: [
      { id: 'wood', chance: 0.4, q: [1, 3] },
      { id: 'iron_ore', chance: 0.25, q: [1, 2] },
      { id: 'leather', chance: 0.2, q: [1, 1] },
      { id: 'orc_fang', chance: 0.15, q: [1, 1] },
    ],
    xp: 10,
  },
  
  skeleton: {
    name: 'Crumbling Skeleton',
    sprite: 'skeleton',
    hp: 22,
    speed: 55,
    attack: 5,
    attackRate: 1000,
    aggroRange: 140,
    tier: 1,
    drops: [
      { id: 'bone', chance: 0.55, q: [1, 2] },
      { id: 'iron_bar', chance: 0.15, q: [1, 1] },
      { id: 'sunroot_seed', chance: 0.2, q: [1, 1] },
      { id: 'skeleton_dust', chance: 0.3, q: [1, 2] },
    ],
    xp: 8,
  },
  
  bat: {
    name: 'Cave Bat',
    sprite: 'bat',
    hp: 12,
    speed: 70,
    attack: 3,
    attackRate: 800,
    aggroRange: 100,
    tier: 0,
    flying: true,
    drops: [
      { id: 'bat_wing', chance: 0.6, q: [1, 2] },
      { id: 'leather', chance: 0.2, q: [1, 1] },
    ],
    xp: 5,
  },
  
  slime: {
    name: 'Green Slime',
    sprite: 'slime',
    hp: 18,
    speed: 30,
    attack: 4,
    attackRate: 1500,
    aggroRange: 80,
    tier: 0,
    tint: 0x2ecc71,
    drops: [
      { id: 'slime_core', chance: 0.4, q: [1, 1] },
      { id: 'fiber', chance: 0.5, q: [1, 3] },
    ],
    xp: 6,
  },
  
  wolf: {
    name: 'Wild Wolf',
    sprite: 'wolf',
    hp: 35,
    speed: 75,
    attack: 8,
    attackRate: 900,
    aggroRange: 160,
    tier: 1,
    drops: [
      { id: 'wolf_pelt', chance: 0.5, q: [1, 1] },
      { id: 'bone', chance: 0.3, q: [1, 2] },
      { id: 'leather', chance: 0.3, q: [1, 2] },
    ],
    xp: 12,
  },
  
  // Elite Mobs (Tier 1+)
  brute: {
    name: 'Orc Brute',
    sprite: 'orc',
    hp: 55,
    speed: 35,
    attack: 10,
    attackRate: 1600,
    aggroRange: 120,
    tier: 1,
    tint: 0xa14f4f,
    elite: true,
    drops: [
      { id: 'iron_bar', chance: 0.35, q: [1, 2] },
      { id: 'coal', chance: 0.25, q: [1, 1] },
      { id: 'leather_armor', chance: 0.05, q: [1, 1] },
      { id: 'orc_fang', chance: 0.4, q: [1, 2] },
    ],
    xp: 18,
  },
  
  skeleton_warrior: {
    name: 'Skeleton Warrior',
    sprite: 'skeleton',
    hp: 45,
    speed: 50,
    attack: 9,
    attackRate: 1100,
    aggroRange: 150,
    tier: 1,
    tint: 0x7f8c8d,
    elite: true,
    drops: [
      { id: 'bone', chance: 0.6, q: [2, 4] },
      { id: 'iron_sword', chance: 0.08, q: [1, 1] },
      { id: 'iron_shield', chance: 0.06, q: [1, 1] },
      { id: 'skeleton_dust', chance: 0.5, q: [2, 3] },
    ],
    xp: 20,
  },
  
  dire_wolf: {
    name: 'Dire Wolf',
    sprite: 'wolf',
    hp: 65,
    speed: 80,
    attack: 14,
    attackRate: 850,
    aggroRange: 180,
    tier: 2,
    tint: 0x34495e,
    elite: true,
    drops: [
      { id: 'wolf_pelt', chance: 0.7, q: [2, 3] },
      { id: 'leather', chance: 0.5, q: [2, 4] },
      { id: 'bone', chance: 0.4, q: [2, 3] },
    ],
    xp: 28,
  },
  
  // Dungeon Mobs (Tier 2+)
  golem: {
    name: 'Stone Golem',
    sprite: 'golem',
    hp: 100,
    speed: 25,
    attack: 18,
    attackRate: 2000,
    aggroRange: 100,
    tier: 2,
    tint: 0x7f8c8d,
    drops: [
      { id: 'stone', chance: 0.8, q: [3, 6] },
      { id: 'golem_heart', chance: 0.25, q: [1, 1] },
      { id: 'iron_ore', chance: 0.5, q: [2, 4] },
      { id: 'moonstone', chance: 0.1, q: [1, 1] },
    ],
    xp: 35,
  },
  
  necromancer: {
    name: 'Dark Necromancer',
    sprite: 'skeleton',
    hp: 60,
    speed: 40,
    attack: 15,
    attackRate: 1400,
    aggroRange: 200,
    tier: 2,
    tint: 0x8e44ad,
    elite: true,
    summons: ['skeleton'],
    drops: [
      { id: 'bone_staff', chance: 0.15, q: [1, 1] },
      { id: 'skeleton_dust', chance: 0.7, q: [3, 5] },
      { id: 'moonpetal_seed', chance: 0.2, q: [1, 2] },
      { id: 'dungeon_key', chance: 0.05, q: [1, 1] },
    ],
    xp: 45,
  },
  
  fire_elemental: {
    name: 'Fire Elemental',
    sprite: 'elemental',
    hp: 70,
    speed: 55,
    attack: 16,
    attackRate: 1000,
    aggroRange: 140,
    tier: 2,
    tint: 0xe74c3c,
    element: 'fire',
    drops: [
      { id: 'coal', chance: 0.8, q: [3, 6] },
      { id: 'firebloom_seed', chance: 0.15, q: [1, 1] },
      { id: 'flame_sword', chance: 0.02, q: [1, 1] },
    ],
    xp: 40,
  },
  
  ice_elemental: {
    name: 'Ice Elemental',
    sprite: 'elemental',
    hp: 75,
    speed: 45,
    attack: 14,
    attackRate: 1200,
    aggroRange: 130,
    tier: 2,
    tint: 0x3498db,
    element: 'ice',
    drops: [
      { id: 'moonstone', chance: 0.3, q: [1, 2] },
      { id: 'silver_ore', chance: 0.25, q: [1, 2] },
      { id: 'frost_axe', chance: 0.02, q: [1, 1] },
    ],
    xp: 42,
  },
  
  // Bosses (Tier 3+)
  orc_warlord: {
    name: 'Orc Warlord',
    sprite: 'orc',
    hp: 200,
    speed: 45,
    attack: 25,
    attackRate: 1400,
    aggroRange: 180,
    tier: 3,
    tint: 0xc0392b,
    boss: true,
    elite: true,
    drops: [
      { id: 'iron_bar', chance: 1.0, q: [5, 10] },
      { id: 'leather_armor', chance: 0.5, q: [1, 1] },
      { id: 'silver_sword', chance: 0.2, q: [1, 1] },
      { id: 'titan_shard', chance: 0.1, q: [1, 1] },
      { id: 'map_fragment', chance: 0.3, q: [1, 2] },
    ],
    xp: 150,
  },
  
  lich_king: {
    name: 'Lich King',
    sprite: 'skeleton',
    hp: 250,
    speed: 35,
    attack: 30,
    attackRate: 1600,
    aggroRange: 200,
    tier: 3,
    tint: 0x9b59b6,
    boss: true,
    elite: true,
    summons: ['skeleton', 'skeleton_warrior'],
    drops: [
      { id: 'bone', chance: 1.0, q: [10, 20] },
      { id: 'skeleton_dust', chance: 1.0, q: [5, 10] },
      { id: 'bone_staff', chance: 0.4, q: [1, 1] },
      { id: 'dragon_scale', chance: 0.15, q: [1, 2] },
      { id: 'ancient_relic', chance: 0.25, q: [1, 1] },
      { id: 'dungeon_key', chance: 0.5, q: [1, 2] },
    ],
    xp: 200,
  },
  
  ancient_golem: {
    name: 'Ancient Titan Golem',
    sprite: 'golem',
    hp: 400,
    speed: 20,
    attack: 40,
    attackRate: 2500,
    aggroRange: 150,
    tier: 4,
    tint: 0xf39c12,
    boss: true,
    elite: true,
    drops: [
      { id: 'golem_heart', chance: 1.0, q: [2, 3] },
      { id: 'titan_shard', chance: 0.5, q: [1, 3] },
      { id: 'dragon_scale', chance: 0.3, q: [2, 4] },
      { id: 'titan_hammer', chance: 0.1, q: [1, 1] },
      { id: 'ancient_relic', chance: 0.6, q: [1, 2] },
    ],
    xp: 350,
  },
  
  dragon: {
    name: 'Elder Dragon',
    sprite: 'dragon',
    hp: 600,
    speed: 50,
    attack: 50,
    attackRate: 2000,
    aggroRange: 250,
    tier: 5,
    tint: 0xe74c3c,
    boss: true,
    elite: true,
    flying: true,
    element: 'fire',
    drops: [
      { id: 'dragon_scale', chance: 1.0, q: [5, 10] },
      { id: 'dragon_blade', chance: 0.2, q: [1, 1] },
      { id: 'dragon_mail', chance: 0.15, q: [1, 1] },
      { id: 'titan_shard', chance: 0.8, q: [2, 4] },
      { id: 'ancient_relic', chance: 1.0, q: [2, 3] },
      { id: 'gold_bar', chance: 1.0, q: [10, 20] },
    ],
    xp: 500,
  },
};

// ==========================================
// BIOME-SPECIFIC ENEMIES (using Pixel Crawler sprites)
// ==========================================

// FOREST (North) - Elves
export const elf_scout = {
  name: 'Forest Scout',
  sprite: 'elf_base',
  hp: 28,
  speed: 60,
  attack: 6,
  attackRate: 1000,
  aggroRange: 150,
  tier: 1,
  biome: 'forest',
  drops: [
    { id: 'fiber', chance: 0.5, q: [1, 3] },
    { id: 'wood', chance: 0.4, q: [1, 2] },
    { id: 'moonpetal_seed', chance: 0.1, q: [1, 1] },
  ],
  xp: 12,
};

export const elf_hunter = {
  name: 'Elf Hunter',
  sprite: 'elf_hunter',
  hp: 38,
  speed: 55,
  attack: 9,
  attackRate: 1100,
  aggroRange: 180,
  tier: 2,
  biome: 'forest',
  drops: [
    { id: 'leather', chance: 0.4, q: [1, 2] },
    { id: 'hunting_bow', chance: 0.05, q: [1, 1] },
    { id: 'moonpetal_seed', chance: 0.15, q: [1, 1] },
  ],
  xp: 18,
};

export const elf_druid = {
  name: 'Forest Druid',
  sprite: 'elf_druid',
  hp: 32,
  speed: 45,
  attack: 11,
  attackRate: 1400,
  aggroRange: 160,
  tier: 2,
  biome: 'forest',
  elite: true,
  drops: [
    { id: 'moonpetal_seed', chance: 0.3, q: [1, 2] },
    { id: 'healing_potion', chance: 0.2, q: [1, 1] },
    { id: 'sunroot_seed', chance: 0.25, q: [1, 2] },
  ],
  xp: 22,
};

// DESERT (East) - Mummies
export const mummy = {
  name: 'Shambling Mummy',
  sprite: 'mummy_base',
  hp: 40,
  speed: 35,
  attack: 8,
  attackRate: 1400,
  aggroRange: 120,
  tier: 1,
  biome: 'desert',
  drops: [
    { id: 'cloth', chance: 0.5, q: [1, 3] },
    { id: 'bone', chance: 0.4, q: [1, 2] },
    { id: 'gold_ore', chance: 0.1, q: [1, 1] },
  ],
  xp: 14,
};

export const mummy_warrior = {
  name: 'Mummy Guardian',
  sprite: 'mummy_warrior',
  hp: 65,
  speed: 40,
  attack: 12,
  attackRate: 1200,
  aggroRange: 140,
  tier: 2,
  biome: 'desert',
  elite: true,
  drops: [
    { id: 'iron_bar', chance: 0.3, q: [1, 2] },
    { id: 'gold_ore', chance: 0.2, q: [1, 2] },
    { id: 'iron_sword', chance: 0.08, q: [1, 1] },
  ],
  xp: 25,
};

export const mummy_mage = {
  name: 'Sand Sorcerer',
  sprite: 'mummy_mage',
  hp: 35,
  speed: 45,
  attack: 14,
  attackRate: 1500,
  aggroRange: 180,
  tier: 2,
  biome: 'desert',
  elite: true,
  drops: [
    { id: 'moonstone', chance: 0.15, q: [1, 1] },
    { id: 'gold_ore', chance: 0.25, q: [1, 2] },
    { id: 'strength_potion', chance: 0.1, q: [1, 1] },
  ],
  xp: 28,
};

// CEMETERY (South) - Zombies
export const zombie = {
  name: 'Risen Corpse',
  sprite: 'zombie_base',
  hp: 35,
  speed: 30,
  attack: 7,
  attackRate: 1500,
  aggroRange: 100,
  tier: 1,
  biome: 'cemetery',
  drops: [
    { id: 'bone', chance: 0.6, q: [1, 3] },
    { id: 'cloth', chance: 0.3, q: [1, 2] },
    { id: 'skeleton_dust', chance: 0.2, q: [1, 1] },
  ],
  xp: 10,
};

export const zombie_banshee = {
  name: 'Wailing Banshee',
  sprite: 'zombie_banshee',
  hp: 28,
  speed: 55,
  attack: 10,
  attackRate: 1000,
  aggroRange: 160,
  tier: 2,
  biome: 'cemetery',
  drops: [
    { id: 'skeleton_dust', chance: 0.5, q: [2, 4] },
    { id: 'moonstone', chance: 0.1, q: [1, 1] },
    { id: 'antidote', chance: 0.15, q: [1, 1] },
  ],
  xp: 18,
};

export const zombie_brute = {
  name: 'Hulking Zombie',
  sprite: 'zombie_muscle',
  hp: 80,
  speed: 25,
  attack: 15,
  attackRate: 1800,
  aggroRange: 120,
  tier: 2,
  biome: 'cemetery',
  elite: true,
  drops: [
    { id: 'bone', chance: 0.7, q: [3, 5] },
    { id: 'leather', chance: 0.3, q: [1, 2] },
    { id: 'iron_bar', chance: 0.15, q: [1, 2] },
  ],
  xp: 30,
};

// SEWER (West) - Rats
export const rat = {
  name: 'Sewer Rat',
  sprite: 'rat_base',
  hp: 18,
  speed: 70,
  attack: 4,
  attackRate: 700,
  aggroRange: 100,
  tier: 0,
  biome: 'sewer',
  drops: [
    { id: 'leather', chance: 0.3, q: [1, 1] },
    { id: 'bone', chance: 0.4, q: [1, 1] },
  ],
  xp: 6,
};

export const rat_warrior = {
  name: 'Rat Bruiser',
  sprite: 'rat_warrior',
  hp: 40,
  speed: 55,
  attack: 9,
  attackRate: 900,
  aggroRange: 130,
  tier: 2,
  biome: 'sewer',
  drops: [
    { id: 'leather', chance: 0.4, q: [1, 2] },
    { id: 'iron_ore', chance: 0.3, q: [1, 2] },
    { id: 'iron_dagger', chance: 0.05, q: [1, 1] },
  ],
  xp: 16,
};

export const rat_mage = {
  name: 'Plague Caster',
  sprite: 'rat_mage',
  hp: 25,
  speed: 50,
  attack: 12,
  attackRate: 1200,
  aggroRange: 150,
  tier: 2,
  biome: 'sewer',
  elite: true,
  drops: [
    { id: 'antidote', chance: 0.3, q: [1, 2] },
    { id: 'moonstone', chance: 0.1, q: [1, 1] },
    { id: 'skeleton_dust', chance: 0.4, q: [1, 2] },
  ],
  xp: 22,
};

// CAVE (Corners) - Fungus
export const fungus = {
  name: 'Spore Fungus',
  sprite: 'fungus_immature',
  hp: 22,
  speed: 25,
  attack: 5,
  attackRate: 1600,
  aggroRange: 80,
  tier: 1,
  biome: 'cave',
  drops: [
    { id: 'fiber', chance: 0.5, q: [1, 3] },
    { id: 'sunroot_seed', chance: 0.15, q: [1, 1] },
  ],
  xp: 8,
};

export const fungus_heavy = {
  name: 'Bloated Fungus',
  sprite: 'fungus_heavy',
  hp: 55,
  speed: 20,
  attack: 10,
  attackRate: 2000,
  aggroRange: 90,
  tier: 2,
  biome: 'cave',
  drops: [
    { id: 'fiber', chance: 0.6, q: [2, 4] },
    { id: 'healing_potion', chance: 0.15, q: [1, 1] },
    { id: 'antidote', chance: 0.2, q: [1, 1] },
  ],
  xp: 20,
};

export const fungus_elder = {
  name: 'Elder Shroom',
  sprite: 'fungus_old',
  hp: 90,
  speed: 15,
  attack: 16,
  attackRate: 2200,
  aggroRange: 100,
  tier: 3,
  biome: 'cave',
  elite: true,
  drops: [
    { id: 'moonstone', chance: 0.2, q: [1, 2] },
    { id: 'greater_healing', chance: 0.15, q: [1, 1] },
    { id: 'antidote', chance: 0.3, q: [1, 2] },
  ],
  xp: 35,
};

// FORGE (Corners) - Stone Golems
export const stone_sentinel = {
  name: 'Stone Sentinel',
  sprite: 'stone_base',
  hp: 70,
  speed: 30,
  attack: 12,
  attackRate: 1800,
  aggroRange: 100,
  tier: 2,
  biome: 'forge',
  drops: [
    { id: 'stone', chance: 0.7, q: [2, 4] },
    { id: 'iron_ore', chance: 0.4, q: [1, 3] },
    { id: 'coal', chance: 0.3, q: [1, 2] },
  ],
  xp: 25,
};

export const lava_golem = {
  name: 'Lava Golem',
  sprite: 'stone_lava',
  hp: 120,
  speed: 25,
  attack: 20,
  attackRate: 2000,
  aggroRange: 120,
  tier: 3,
  biome: 'forge',
  elite: true,
  tint: 0xff6b35,
  drops: [
    { id: 'coal', chance: 0.8, q: [3, 6] },
    { id: 'iron_bar', chance: 0.4, q: [2, 4] },
    { id: 'golem_heart', chance: 0.15, q: [1, 1] },
  ],
  xp: 45,
};

// Add new enemies to mobTypes
Object.assign(mobTypes, {
  elf_scout, elf_hunter, elf_druid,
  mummy, mummy_warrior, mummy_mage,
  zombie, zombie_banshee, zombie_brute,
  rat, rat_warrior, rat_mage,
  fungus, fungus_heavy, fungus_elder,
  stone_sentinel, lava_golem,
});

// Mob spawn configurations by biome
export const biomeSpawns = {
  meadow: [
    { type: 'orc', weight: 4 },
    { type: 'slime', weight: 3 },
    { type: 'bat', weight: 2 },
  ],
  forest: [
    { type: 'elf_scout', weight: 5 },
    { type: 'elf_hunter', weight: 3 },
    { type: 'elf_druid', weight: 1 },
  ],
  desert: [
    { type: 'mummy', weight: 5 },
    { type: 'mummy_warrior', weight: 2 },
    { type: 'mummy_mage', weight: 1 },
  ],
  cemetery: [
    { type: 'zombie', weight: 5 },
    { type: 'zombie_banshee', weight: 2 },
    { type: 'zombie_brute', weight: 1 },
  ],
  sewer: [
    { type: 'rat', weight: 5 },
    { type: 'rat_warrior', weight: 2 },
    { type: 'rat_mage', weight: 1 },
  ],
  cave: [
    { type: 'fungus', weight: 4 },
    { type: 'fungus_heavy', weight: 2 },
    { type: 'fungus_elder', weight: 1 },
    { type: 'bat', weight: 3 },
  ],
  forge: [
    { type: 'stone_sentinel', weight: 4 },
    { type: 'lava_golem', weight: 2 },
    { type: 'golem', weight: 1 },
  ],
  ruins: [
    { type: 'skeleton', weight: 4 },
    { type: 'skeleton_warrior', weight: 2 },
    { type: 'necromancer', weight: 1 },
  ],
};
