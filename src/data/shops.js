// Shop configuration for village merchants

export const shops = {
  weapons: {
    id: 'weapons',
    name: 'Blade & Bow',
    npcSprite: 'knight',
    npcName: 'Sir Marcus',
    dialogues: [
      "Looking for something sharp? You've come to the right place.",
      "These blades have felled many monsters.",
      "A warrior's weapon is their life. Choose wisely.",
      "Fresh stock from the smithy. Fine quality.",
    ],
    inventory: [
      { id: 'wooden_sword', buyPrice: 15 },
      { id: 'iron_dagger', buyPrice: 35 },
      { id: 'iron_sword', buyPrice: 75 },
      { id: 'iron_axe', buyPrice: 90 },
      { id: 'hunting_bow', buyPrice: 65 },
      { id: 'silver_sword', buyPrice: 200 },
    ],
    buysTypes: ['weapon'],
    sellMultiplier: 0.4, // Sells items at 40% of buy price
  },

  armor: {
    id: 'armor',
    name: 'Iron Ward Armory',
    npcSprite: 'knight',
    npcName: 'Helena the Smith',
    dialogues: [
      "Protection is priceless, adventurer.",
      "This armor has saved many lives.",
      "Forged with care, worn with pride.",
      "Don't go into the wilds unprotected.",
    ],
    inventory: [
      { id: 'leather_helm', buyPrice: 30 },
      { id: 'leather_armor', buyPrice: 50 },
      { id: 'leather_boots', buyPrice: 35 },
      { id: 'iron_shield', buyPrice: 60 },
      { id: 'chainmail', buyPrice: 150 },
      { id: 'iron_helm', buyPrice: 80 },
    ],
    buysTypes: ['armor'],
    sellMultiplier: 0.4,
  },

  potions: {
    id: 'potions',
    name: 'The Bubbling Cauldron',
    npcSprite: 'wizard',
    npcName: 'Sage Elden',
    dialogues: [
      "What ailment troubles you, traveler?",
      "These elixirs hold ancient power.",
      "Brewed under moonlight for maximum potency.",
      "One sip could save your life out there.",
    ],
    inventory: [
      { id: 'healing_potion', buyPrice: 25 },
      { id: 'greater_healing', buyPrice: 60 },
      { id: 'stamina_potion', buyPrice: 20 },
      { id: 'antidote', buyPrice: 15 },
      { id: 'strength_potion', buyPrice: 45 },
      { id: 'speed_potion', buyPrice: 40 },
    ],
    buysTypes: ['consumable', 'crop', 'drop'],
    sellMultiplier: 0.5,
  },

  general: {
    id: 'general',
    name: 'The Trading Post',
    npcSprite: 'rogue',
    npcName: 'Trader Mira',
    dialogues: [
      "Welcome, traveler! What do you need?",
      "I buy and sell everything. Name your price!",
      "Rare goods from distant lands, right here.",
      "You look like someone who appreciates a good deal.",
    ],
    inventory: [
      { id: 'sunroot_seed', buyPrice: 10 },
      { id: 'moonpetal_seed', buyPrice: 25 },
      { id: 'torch', buyPrice: 5 },
      { id: 'rope', buyPrice: 15 },
      { id: 'lucky_charm', buyPrice: 100 },
      { id: 'teleport_stone', buyPrice: 250 },
    ],
    buysTypes: ['mat', 'drop', 'quest', 'seed'],
    sellMultiplier: 0.3,
  },
};

// Village layout configuration
export const villageLayout = {
  radius: 20, // tiles from center that are safe

  // Shop building positions (offset from village center in tiles)
  shopPositions: {
    weapons: { x: -8, y: -8 },
    armor: { x: 8, y: -8 },
    potions: { x: -8, y: 8 },
    general: { x: 8, y: 8 },
  },

  // Crafting station positions
  stationPositions: {
    forge: { x: -3, y: -2 },
    tanner: { x: 3, y: -2 },
    alchemist: { x: 0, y: 4 },
  },

  // Decorative building positions
  buildings: [
    { type: 'well', x: 0, y: 0 },
    { type: 'notice_board', x: -2, y: -6 },
  ],

  // Extra NPCs for flavor
  extraNPCs: [
    { name: 'Elder Thane', sprite: 'wizard', x: 0, y: -10, role: 'lore_keeper' },
    { name: 'Guard Captain', sprite: 'knight', x: 5, y: 0, role: 'guard' },
  ],
};

// Helper function to get sell price for an item at a shop
export function getSellPrice(shopId, item) {
  const shop = shops[shopId];
  if (!shop) return 0;

  // Check if shop buys this item type
  if (!shop.buysTypes.includes(item.type)) return 0;

  // Calculate sell price
  const baseValue = item.value || 1;
  return Math.floor(baseValue * shop.sellMultiplier);
}
