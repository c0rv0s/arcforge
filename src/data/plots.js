export const plotConfig = [
  // Village Plots - Close to center, affordable
  { 
    id: 'village-1', 
    tile: { x: 59, y: 68 }, 
    price: 40, 
    size: 2,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm'],
    description: 'Prime village real estate near the forge.',
  },
  { 
    id: 'village-2', 
    tile: { x: 69, y: 68 }, 
    price: 45, 
    size: 2,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm'],
    description: 'Village plot near the merchant district.',
  },
  { 
    id: 'village-3', 
    tile: { x: 59, y: 59 }, 
    price: 50, 
    size: 2,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm'],
    description: 'Northern village plot with good visibility.',
  },
  { 
    id: 'village-4', 
    tile: { x: 69, y: 59 }, 
    price: 55, 
    size: 2,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm'],
    description: 'Corner plot in the village square.',
  },
  
  // Outskirts Plots - Further out, medium price
  { 
    id: 'outskirts-1', 
    tile: { x: 79, y: 64 }, 
    price: 60, 
    size: 3,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well'],
    description: 'Spacious plot on the eastern outskirts.',
  },
  { 
    id: 'outskirts-2', 
    tile: { x: 49, y: 64 }, 
    price: 60, 
    size: 3,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well'],
    description: 'Western outskirts with forest access.',
  },
  { 
    id: 'outskirts-3', 
    tile: { x: 64, y: 79 }, 
    price: 65, 
    size: 3,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well'],
    description: 'Southern outskirts near the farmlands.',
  },
  { 
    id: 'outskirts-4', 
    tile: { x: 64, y: 49 }, 
    price: 65, 
    size: 3,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well'],
    description: 'Northern outskirts with mountain views.',
  },
  
  // Frontier Plots - Resource-rich areas, expensive
  { 
    id: 'forest-1', 
    tile: { x: 35, y: 64 }, 
    price: 100, 
    size: 4,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well', 'watchtower'],
    description: 'Deep in the Whispering Woods. Rich in lumber.',
    bonuses: { woodGather: 1.5 },
  },
  { 
    id: 'forest-2', 
    tile: { x: 40, y: 50 }, 
    price: 110, 
    size: 4,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well', 'watchtower'],
    description: 'Forest clearing with rare herb spawns.',
    bonuses: { herbGather: 2.0 },
  },
  { 
    id: 'cave-1', 
    tile: { x: 90, y: 45 }, 
    price: 120, 
    size: 3,
    buildables: ['forge', 'chest', 'well', 'mine'],
    description: 'Near the crystal caves. Mining bonus.',
    bonuses: { oreGather: 1.5 },
  },
  { 
    id: 'ruins-1', 
    tile: { x: 25, y: 25 }, 
    price: 150, 
    size: 4,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'watchtower', 'altar'],
    description: 'Ancient ruins with magical properties.',
    bonuses: { xpGain: 1.2 },
  },
  
  // Premium Plots - Special locations
  { 
    id: 'river-1', 
    tile: { x: 80, y: 70 }, 
    price: 90, 
    size: 3,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well', 'dock'],
    description: 'Riverside plot with water access.',
    bonuses: { farmSpeed: 1.3 },
  },
  { 
    id: 'hilltop-1', 
    tile: { x: 100, y: 30 }, 
    price: 200, 
    size: 5,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well', 'watchtower', 'castle'],
    description: 'Elevated plot with commanding views.',
    bonuses: { defenseBonus: 1.5 },
  },
  { 
    id: 'oasis-1', 
    tile: { x: 100, y: 100 }, 
    price: 180, 
    size: 4,
    buildables: ['forge', 'tanner', 'alchemist', 'chest', 'farm', 'well'],
    description: 'Desert oasis with rare resources.',
    bonuses: { rareDrops: 1.3 },
  },
];

// Plot upgrade tiers
export const plotUpgrades = {
  size: [
    { level: 1, size: 2, cost: 0 },
    { level: 2, size: 3, cost: 50 },
    { level: 3, size: 4, cost: 150 },
    { level: 4, size: 5, cost: 400 },
    { level: 5, size: 6, cost: 1000 },
  ],
  security: [
    { level: 1, protection: 0, cost: 0 },
    { level: 2, protection: 0.1, cost: 30 },
    { level: 3, protection: 0.25, cost: 80 },
    { level: 4, protection: 0.5, cost: 200 },
  ],
  production: [
    { level: 1, bonus: 1.0, cost: 0 },
    { level: 2, bonus: 1.1, cost: 40 },
    { level: 3, bonus: 1.25, cost: 100 },
    { level: 4, bonus: 1.5, cost: 250 },
  ],
};

// Buildable structures for plots
export const structures = {
  forge: {
    name: 'Personal Forge',
    description: 'Smelt ores and craft metal items.',
    cost: { iron_bar: 5, stone: 8, coal: 3 },
    size: 1,
    recipes: 'forge',
  },
  tanner: {
    name: 'Tanning Rack',
    description: 'Process leather and craft cloth items.',
    cost: { wood: 6, leather: 2, fiber: 4 },
    size: 1,
    recipes: 'tanner',
  },
  alchemist: {
    name: 'Alchemy Table',
    description: 'Brew potions and enchant items.',
    cost: { stone: 6, iron_bar: 2, moonpetal_crop: 2 },
    size: 1,
    recipes: 'alchemist',
  },
  chest: {
    name: 'Storage Chest',
    description: 'Store up to 50 item stacks.',
    cost: { wood: 6, iron_bar: 1 },
    size: 1,
    storage: 50,
  },
  farm: {
    name: 'Farm Plot',
    description: 'Grow crops on your land.',
    cost: { wood: 4, stone: 2 },
    size: 1,
    slots: 4,
  },
  well: {
    name: 'Water Well',
    description: 'Provides water for farming. +20% crop speed.',
    cost: { stone: 10, iron_bar: 2 },
    size: 1,
    bonus: { farmSpeed: 1.2 },
  },
  watchtower: {
    name: 'Watchtower',
    description: 'Protects your plot from raids.',
    cost: { wood: 12, stone: 8, iron_bar: 4 },
    size: 2,
    bonus: { protection: 0.3 },
  },
  mine: {
    name: 'Mine Entrance',
    description: 'Generate ore over time.',
    cost: { wood: 8, stone: 15, iron_bar: 6 },
    size: 2,
    generates: ['iron_ore', 'coal', 'stone'],
    rate: 3600, // seconds per generation
  },
  dock: {
    name: 'Fishing Dock',
    description: 'Catch fish for food and materials.',
    cost: { wood: 10, fiber: 6 },
    size: 1,
    generates: ['cooked_meat', 'bone'],
    rate: 1800,
    requires: 'water',
  },
  altar: {
    name: 'Ancient Altar',
    description: 'Mysterious altar with magical properties.',
    cost: { stone: 20, moonstone: 5, ancient_relic: 1 },
    size: 2,
    bonus: { xpGain: 1.15 },
  },
  castle: {
    name: 'Castle Foundation',
    description: 'The beginning of a grand fortress.',
    cost: { stone: 50, iron_bar: 20, gold_bar: 5 },
    size: 4,
    bonus: { protection: 0.5, storage: 100 },
  },
};

// Plot rental/economy settings (for future on-chain economy)
export const economyConfig = {
  plotTax: 0.02, // 2% daily tax on plot value
  tradeFee: 0.05, // 5% fee on plot trades
  minTradePrice: 10, // Minimum trade price
  rentalEnabled: true,
  rentalFeePercent: 0.1, // 10% of plot value per rental period
  rentalPeriodDays: 7,
};
