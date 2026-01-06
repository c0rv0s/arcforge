export const items = {
  // Basic Materials (Tier 0)
  wood: { name: 'Oak Log', type: 'mat', tier: 0, stack: 99, value: 2, desc: 'Sturdy timber from the forest.' },
  fiber: { name: 'Wild Fiber', type: 'mat', tier: 0, stack: 99, value: 3, desc: 'Gathered from wild plants.' },
  stone: { name: 'Rough Stone', type: 'mat', tier: 0, stack: 99, value: 2, desc: 'Common stone, useful for building.' },
  clay: { name: 'River Clay', type: 'mat', tier: 0, stack: 99, value: 3, desc: 'Soft clay from riverbeds.' },
  
  // Intermediate Materials (Tier 1)
  coal: { name: 'Coal Chunk', type: 'mat', tier: 1, stack: 99, value: 6, desc: 'Burns hot for smelting.' },
  iron_ore: { name: 'Iron Ore', type: 'mat', tier: 1, stack: 99, value: 5, desc: 'Raw iron, needs smelting.' },
  iron_bar: { name: 'Iron Ingot', type: 'mat', tier: 1, stack: 99, value: 12, desc: 'Refined iron, ready for smithing.' },
  leather: { name: 'Treated Leather', type: 'mat', tier: 1, stack: 99, value: 8, desc: 'Cured and ready for crafting.' },
  bone: { name: 'Ancient Bone', type: 'mat', tier: 1, stack: 99, value: 10, desc: 'Hard bones from undead creatures.' },
  cloth: { name: 'Woven Cloth', type: 'mat', tier: 1, stack: 99, value: 8, desc: 'Fabric woven from fibers.' },
  
  // Advanced Materials (Tier 2)
  silver_ore: { name: 'Silver Ore', type: 'mat', tier: 2, stack: 99, value: 15, desc: 'Precious metal ore.' },
  silver_bar: { name: 'Silver Ingot', type: 'mat', tier: 2, stack: 99, value: 30, desc: 'Refined silver, conducts magic.' },
  gold_ore: { name: 'Gold Ore', type: 'mat', tier: 2, stack: 99, value: 25, desc: 'Rare and valuable ore.' },
  gold_bar: { name: 'Gold Ingot', type: 'mat', tier: 2, stack: 99, value: 50, desc: 'Pure gold, for fine crafting.' },
  moonstone: { name: 'Moonstone Shard', type: 'mat', tier: 2, stack: 50, value: 40, desc: 'Glows with inner light.' },
  dragon_scale: { name: 'Dragon Scale', type: 'mat', tier: 3, stack: 20, value: 100, desc: 'Nearly indestructible.' },
  
  // Monster Drops
  orc_fang: { name: 'Orc Tusk', type: 'drop', tier: 1, stack: 99, value: 8, desc: 'Trophy from an orc.' },
  skeleton_dust: { name: 'Bone Dust', type: 'drop', tier: 1, stack: 99, value: 6, desc: 'Powdered bones with magic potential.' },
  bat_wing: { name: 'Bat Wing', type: 'drop', tier: 0, stack: 99, value: 4, desc: 'Leathery wing membrane.' },
  slime_core: { name: 'Slime Core', type: 'drop', tier: 1, stack: 50, value: 12, desc: 'Gelatinous essence.' },
  wolf_pelt: { name: 'Wolf Pelt', type: 'drop', tier: 1, stack: 50, value: 15, desc: 'Thick fur, warm and durable.' },
  golem_heart: { name: 'Golem Core', type: 'drop', tier: 2, stack: 20, value: 45, desc: 'Magical animation core.' },
  titan_shard: { name: 'Titan Shard', type: 'drop', tier: 3, stack: 10, value: 200, desc: 'Fragment of primordial power.' },
  
  // Seeds & Crops
  sunroot_seed: { name: 'Sunroot Seed', type: 'seed', tier: 0, stack: 50, value: 4, desc: 'Grows quickly in any soil.' },
  sunroot_crop: { name: 'Sunroot Bulb', type: 'crop', tier: 0, stack: 50, value: 8, desc: 'Nourishing and versatile.' },
  moonpetal_seed: { name: 'Moonpetal Seed', type: 'seed', tier: 1, stack: 50, value: 12, desc: 'Blooms under moonlight.' },
  moonpetal_crop: { name: 'Moonpetal Flower', type: 'crop', tier: 1, stack: 50, value: 25, desc: 'Used in potent elixirs.' },
  firebloom_seed: { name: 'Firebloom Seed', type: 'seed', tier: 2, stack: 30, value: 30, desc: 'Requires volcanic soil.' },
  firebloom_crop: { name: 'Firebloom', type: 'crop', tier: 2, stack: 30, value: 60, desc: 'Burns with magical flame.' },
  
  // Consumables
  healing_potion: { name: 'Healing Draught', type: 'consumable', heal: 35, stack: 10, value: 20, desc: 'Restores health quickly.' },
  greater_healing: { name: 'Greater Healing', type: 'consumable', heal: 75, stack: 10, value: 50, desc: 'Powerful healing elixir.' },
  stamina_potion: { name: 'Stamina Tonic', type: 'consumable', stamina: 50, stack: 10, value: 18, desc: 'Refreshes the body.' },
  strength_potion: { name: 'Might Elixir', type: 'consumable', buff: 'strength', duration: 60, stack: 5, value: 35, desc: '+50% damage for 1 minute.' },
  speed_potion: { name: 'Swiftness Draught', type: 'consumable', buff: 'speed', duration: 45, stack: 5, value: 30, desc: '+30% speed for 45 seconds.' },
  antidote: { name: 'Antidote', type: 'consumable', cure: 'poison', stack: 10, value: 15, desc: 'Cures poison ailments.' },
  cooked_meat: { name: 'Roasted Meat', type: 'food', heal: 15, stack: 20, value: 8, desc: 'Restores a small amount of health.' },
  
  // Weapons (Tier 1)
  wooden_sword: { name: 'Wooden Sword', type: 'weapon', tier: 0, dmg: [3, 5], spd: 1.2, dur: 50, value: 10, desc: 'Basic training weapon.' },
  iron_sword: { name: 'Iron Sword', type: 'weapon', tier: 1, dmg: [6, 10], spd: 1.0, dur: 120, value: 40, desc: 'Reliable and sturdy blade.' },
  iron_axe: { name: 'Iron Battleaxe', type: 'weapon', tier: 1, dmg: [8, 14], spd: 0.8, dur: 100, value: 50, desc: 'Heavy but devastating.' },
  hunting_bow: { name: 'Hunting Bow', type: 'weapon', tier: 1, dmg: [4, 7], spd: 1.2, dur: 90, value: 35, desc: 'Attack from a distance.' },
  iron_dagger: { name: 'Iron Dagger', type: 'weapon', tier: 1, dmg: [4, 6], spd: 1.5, dur: 80, value: 25, desc: 'Quick strikes.' },
  bone_staff: { name: 'Bone Staff', type: 'weapon', tier: 1, dmg: [5, 9], spd: 0.9, dur: 70, value: 45, desc: 'Channels dark energy.' },
  
  // Weapons (Tier 2)
  silver_sword: { name: 'Silver Longsword', type: 'weapon', tier: 2, dmg: [10, 16], spd: 1.0, dur: 150, value: 120, desc: 'Effective against undead.' },
  enchanted_bow: { name: 'Enchanted Bow', type: 'weapon', tier: 2, dmg: [8, 12], spd: 1.3, dur: 120, value: 100, desc: 'Arrows fly true.' },
  flame_sword: { name: 'Flamebrand', type: 'weapon', tier: 2, dmg: [12, 18], spd: 0.9, element: 'fire', dur: 140, value: 180, desc: 'Burns with eternal flame.' },
  frost_axe: { name: 'Frostbite Axe', type: 'weapon', tier: 2, dmg: [14, 22], spd: 0.7, element: 'ice', dur: 130, value: 200, desc: 'Chills foes to the bone.' },
  
  // Weapons (Tier 3)
  dragon_blade: { name: 'Dragonslayer', type: 'weapon', tier: 3, dmg: [20, 35], spd: 0.9, dur: 200, value: 500, desc: 'Legendary blade of heroes.' },
  titan_hammer: { name: 'Titan\'s Wrath', type: 'weapon', tier: 3, dmg: [25, 45], spd: 0.5, dur: 250, value: 600, desc: 'Shakes the earth with each blow.' },
  
  // Armor (Tier 1)
  leather_armor: { name: 'Leather Jerkin', type: 'armor', slot: 'body', tier: 1, armor: 4, dur: 100, value: 30, desc: 'Light and flexible.' },
  leather_helm: { name: 'Leather Cap', type: 'armor', slot: 'head', tier: 1, armor: 2, dur: 80, value: 20, desc: 'Basic head protection.' },
  leather_boots: { name: 'Leather Boots', type: 'armor', slot: 'feet', tier: 1, armor: 2, speed: 5, dur: 90, value: 25, desc: 'Light footwear.' },
  iron_shield: { name: 'Iron Buckler', type: 'armor', slot: 'offhand', tier: 1, armor: 3, dur: 110, value: 28, desc: 'Blocks incoming attacks.' },
  
  // Armor (Tier 2)
  chainmail: { name: 'Chainmail Hauberk', type: 'armor', slot: 'body', tier: 2, armor: 8, dur: 150, value: 80, desc: 'Linked metal rings.' },
  iron_helm: { name: 'Iron Helm', type: 'armor', slot: 'head', tier: 2, armor: 5, dur: 130, value: 50, desc: 'Solid head protection.' },
  silver_shield: { name: 'Silver Aegis', type: 'armor', slot: 'offhand', tier: 2, armor: 6, dur: 140, value: 90, desc: 'Deflects magic attacks.' },
  
  // Armor (Tier 3)
  dragon_mail: { name: 'Dragon Scale Armor', type: 'armor', slot: 'body', tier: 3, armor: 15, dur: 250, value: 400, desc: 'Nearly impenetrable.' },
  titan_helm: { name: 'Titan Helm', type: 'armor', slot: 'head', tier: 3, armor: 10, dur: 200, value: 300, desc: 'Worn by giants.' },
  
  // Accessories
  iron_ring: { name: 'Iron Band', type: 'accessory', tier: 1, bonus: { hp: 10 }, value: 30, desc: '+10 Max HP' },
  silver_ring: { name: 'Silver Ring', type: 'accessory', tier: 2, bonus: { hp: 20, stamina: 10 }, value: 80, desc: '+20 HP, +10 Stamina' },
  lucky_charm: { name: 'Lucky Charm', type: 'accessory', tier: 1, bonus: { luck: 5 }, value: 50, desc: 'Better drop rates.' },
  speed_boots: { name: 'Boots of Speed', type: 'accessory', tier: 2, bonus: { speed: 15 }, value: 100, desc: '+15% movement speed.' },
  
  // Buildable Stations
  forge_station: { name: 'Forge Frame', type: 'buildable', tier: 1, stack: 5, value: 45, desc: 'Place on your plot to smith.' },
  tanner_station: { name: 'Tanner Rack', type: 'buildable', tier: 1, stack: 5, value: 35, desc: 'Place on your plot to tan leather.' },
  alchemy_station: { name: 'Alchemy Table', type: 'buildable', tier: 1, stack: 5, value: 50, desc: 'Place on your plot to brew.' },
  storage_chest: { name: 'Storage Chest', type: 'buildable', tier: 0, stack: 10, value: 20, desc: 'Store items on your plot.' },
  farm_plot: { name: 'Farm Plot', type: 'buildable', tier: 0, stack: 20, value: 15, desc: 'Grow crops on your land.' },
  
  // Special Items
  plot_deed: { name: 'Plot Deed', type: 'key', stack: 10, value: 0, desc: 'Proof of land ownership.' },
  dungeon_key: { name: 'Dungeon Key', type: 'key', stack: 5, value: 100, desc: 'Opens sealed dungeon doors.' },
  teleport_stone: { name: 'Waystone Shard', type: 'key', stack: 3, value: 150, desc: 'Return to the village instantly.' },
  map_fragment: { name: 'Map Fragment', type: 'quest', stack: 20, value: 25, desc: 'Reveals hidden locations.' },
  ancient_relic: { name: 'Ancient Relic', type: 'quest', stack: 10, value: 200, desc: 'Artifact of a lost civilization.' },
};
