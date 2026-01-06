export const recipes = [
  // === FORGE RECIPES ===
  // Basic Smelting
  { 
    id: 'iron_bar', 
    in: [{ id: 'iron_ore', q: 3 }, { id: 'coal', q: 1 }], 
    out: { id: 'iron_bar', q: 1 }, 
    time: 8, 
    station: 'forge', 
    tier: 1,
    desc: 'Smelt raw iron into usable ingots.'
  },
  { 
    id: 'silver_bar', 
    in: [{ id: 'silver_ore', q: 3 }, { id: 'coal', q: 2 }], 
    out: { id: 'silver_bar', q: 1 }, 
    time: 12, 
    station: 'forge', 
    tier: 2,
    desc: 'Refine silver ore into pure ingots.'
  },
  { 
    id: 'gold_bar', 
    in: [{ id: 'gold_ore', q: 3 }, { id: 'coal', q: 2 }], 
    out: { id: 'gold_bar', q: 1 }, 
    time: 15, 
    station: 'forge', 
    tier: 2,
    desc: 'Smelt precious gold ore.'
  },
  
  // Weapons - Tier 1
  { 
    id: 'wooden_sword', 
    in: [{ id: 'wood', q: 4 }, { id: 'fiber', q: 2 }], 
    out: { id: 'wooden_sword', q: 1 }, 
    time: 5, 
    station: 'forge', 
    tier: 0,
    desc: 'A basic training weapon.'
  },
  { 
    id: 'iron_sword', 
    in: [{ id: 'iron_bar', q: 2 }, { id: 'leather', q: 1 }], 
    out: { id: 'iron_sword', q: 1 }, 
    time: 10, 
    station: 'forge', 
    tier: 1,
    desc: 'A reliable iron blade.'
  },
  { 
    id: 'iron_axe', 
    in: [{ id: 'iron_bar', q: 3 }, { id: 'wood', q: 2 }], 
    out: { id: 'iron_axe', q: 1 }, 
    time: 12, 
    station: 'forge', 
    tier: 1,
    desc: 'A heavy battleaxe.'
  },
  { 
    id: 'iron_dagger', 
    in: [{ id: 'iron_bar', q: 1 }, { id: 'leather', q: 1 }], 
    out: { id: 'iron_dagger', q: 1 }, 
    time: 6, 
    station: 'forge', 
    tier: 1,
    desc: 'A quick, deadly dagger.'
  },
  { 
    id: 'iron_shield', 
    in: [{ id: 'iron_bar', q: 2 }, { id: 'wood', q: 2 }], 
    out: { id: 'iron_shield', q: 1 }, 
    time: 8, 
    station: 'forge', 
    tier: 1,
    desc: 'A sturdy defensive shield.'
  },
  
  // Weapons - Tier 2
  { 
    id: 'silver_sword', 
    in: [{ id: 'silver_bar', q: 3 }, { id: 'leather', q: 2 }, { id: 'moonstone', q: 1 }], 
    out: { id: 'silver_sword', q: 1 }, 
    time: 18, 
    station: 'forge', 
    tier: 2,
    desc: 'Effective against undead creatures.'
  },
  { 
    id: 'silver_shield', 
    in: [{ id: 'silver_bar', q: 2 }, { id: 'iron_bar', q: 2 }], 
    out: { id: 'silver_shield', q: 1 }, 
    time: 15, 
    station: 'forge', 
    tier: 2,
    desc: 'Deflects magical attacks.'
  },
  { 
    id: 'flame_sword', 
    in: [{ id: 'iron_bar', q: 4 }, { id: 'firebloom_crop', q: 3 }, { id: 'coal', q: 5 }], 
    out: { id: 'flame_sword', q: 1 }, 
    time: 25, 
    station: 'forge', 
    tier: 2,
    desc: 'A blade that burns with eternal flame.'
  },
  { 
    id: 'frost_axe', 
    in: [{ id: 'silver_bar', q: 3 }, { id: 'moonstone', q: 3 }, { id: 'golem_heart', q: 1 }], 
    out: { id: 'frost_axe', q: 1 }, 
    time: 28, 
    station: 'forge', 
    tier: 2,
    desc: 'An axe that freezes on impact.'
  },
  
  // Armor - Forge
  { 
    id: 'iron_helm', 
    in: [{ id: 'iron_bar', q: 3 }], 
    out: { id: 'iron_helm', q: 1 }, 
    time: 10, 
    station: 'forge', 
    tier: 2,
    desc: 'Solid iron head protection.'
  },
  { 
    id: 'chainmail', 
    in: [{ id: 'iron_bar', q: 5 }, { id: 'leather', q: 2 }], 
    out: { id: 'chainmail', q: 1 }, 
    time: 20, 
    station: 'forge', 
    tier: 2,
    desc: 'Linked metal rings for protection.'
  },
  
  // Legendary Weapons - Tier 3
  { 
    id: 'dragon_blade', 
    in: [{ id: 'dragon_scale', q: 5 }, { id: 'titan_shard', q: 2 }, { id: 'gold_bar', q: 3 }], 
    out: { id: 'dragon_blade', q: 1 }, 
    time: 45, 
    station: 'forge', 
    tier: 3,
    desc: 'Legendary blade forged from dragon scales.'
  },
  { 
    id: 'titan_hammer', 
    in: [{ id: 'titan_shard', q: 4 }, { id: 'golem_heart', q: 2 }, { id: 'iron_bar', q: 8 }], 
    out: { id: 'titan_hammer', q: 1 }, 
    time: 50, 
    station: 'forge', 
    tier: 3,
    desc: 'A hammer that shakes the earth.'
  },
  { 
    id: 'dragon_mail', 
    in: [{ id: 'dragon_scale', q: 8 }, { id: 'leather', q: 4 }, { id: 'silver_bar', q: 3 }], 
    out: { id: 'dragon_mail', q: 1 }, 
    time: 40, 
    station: 'forge', 
    tier: 3,
    desc: 'Armor of legendary dragons.'
  },
  
  // Buildable Stations
  { 
    id: 'forge_station', 
    in: [{ id: 'iron_bar', q: 5 }, { id: 'stone', q: 8 }, { id: 'coal', q: 3 }], 
    out: { id: 'forge_station', q: 1 }, 
    time: 20, 
    station: 'forge', 
    tier: 1,
    desc: 'A portable forge for your plot.'
  },
  { 
    id: 'storage_chest', 
    in: [{ id: 'wood', q: 6 }, { id: 'iron_bar', q: 1 }], 
    out: { id: 'storage_chest', q: 1 }, 
    time: 8, 
    station: 'forge', 
    tier: 0,
    desc: 'Store your items safely.'
  },
  
  // Accessories
  { 
    id: 'iron_ring', 
    in: [{ id: 'iron_bar', q: 2 }], 
    out: { id: 'iron_ring', q: 1 }, 
    time: 6, 
    station: 'forge', 
    tier: 1,
    desc: 'A simple band that increases vitality.'
  },
  { 
    id: 'silver_ring', 
    in: [{ id: 'silver_bar', q: 2 }, { id: 'moonstone', q: 1 }], 
    out: { id: 'silver_ring', q: 1 }, 
    time: 12, 
    station: 'forge', 
    tier: 2,
    desc: 'An enchanted ring of power.'
  },
  
  // === TANNER RECIPES ===
  { 
    id: 'leather', 
    in: [{ id: 'wolf_pelt', q: 2 }], 
    out: { id: 'leather', q: 2 }, 
    time: 6, 
    station: 'tanner', 
    tier: 1,
    desc: 'Tan pelts into usable leather.'
  },
  { 
    id: 'cloth', 
    in: [{ id: 'fiber', q: 4 }], 
    out: { id: 'cloth', q: 1 }, 
    time: 5, 
    station: 'tanner', 
    tier: 1,
    desc: 'Weave fibers into cloth.'
  },
  { 
    id: 'hunting_bow', 
    in: [{ id: 'wood', q: 3 }, { id: 'fiber', q: 2 }], 
    out: { id: 'hunting_bow', q: 1 }, 
    time: 6, 
    station: 'tanner', 
    tier: 1,
    desc: 'A reliable bow for ranged combat.'
  },
  { 
    id: 'enchanted_bow', 
    in: [{ id: 'wood', q: 4 }, { id: 'moonstone', q: 2 }, { id: 'fiber', q: 3 }], 
    out: { id: 'enchanted_bow', q: 1 }, 
    time: 15, 
    station: 'tanner', 
    tier: 2,
    desc: 'A bow enchanted for accuracy.'
  },
  { 
    id: 'leather_armor', 
    in: [{ id: 'leather', q: 3 }, { id: 'fiber', q: 2 }], 
    out: { id: 'leather_armor', q: 1 }, 
    time: 9, 
    station: 'tanner', 
    tier: 1,
    desc: 'Light and flexible body armor.'
  },
  { 
    id: 'leather_helm', 
    in: [{ id: 'leather', q: 2 }], 
    out: { id: 'leather_helm', q: 1 }, 
    time: 5, 
    station: 'tanner', 
    tier: 1,
    desc: 'Basic leather head protection.'
  },
  { 
    id: 'leather_boots', 
    in: [{ id: 'leather', q: 2 }, { id: 'fiber', q: 1 }], 
    out: { id: 'leather_boots', q: 1 }, 
    time: 6, 
    station: 'tanner', 
    tier: 1,
    desc: 'Light boots for quick movement.'
  },
  { 
    id: 'speed_boots', 
    in: [{ id: 'leather', q: 3 }, { id: 'moonstone', q: 2 }, { id: 'slime_core', q: 2 }], 
    out: { id: 'speed_boots', q: 1 }, 
    time: 18, 
    station: 'tanner', 
    tier: 2,
    desc: 'Boots enchanted for swiftness.'
  },
  { 
    id: 'tanner_station', 
    in: [{ id: 'wood', q: 6 }, { id: 'leather', q: 2 }, { id: 'fiber', q: 4 }], 
    out: { id: 'tanner_station', q: 1 }, 
    time: 15, 
    station: 'tanner', 
    tier: 1,
    desc: 'A tanning rack for your plot.'
  },
  { 
    id: 'farm_plot', 
    in: [{ id: 'wood', q: 4 }, { id: 'stone', q: 2 }], 
    out: { id: 'farm_plot', q: 2 }, 
    time: 8, 
    station: 'tanner', 
    tier: 0,
    desc: 'Plots for growing crops.'
  },
  
  // === ALCHEMIST RECIPES ===
  // Potions
  { 
    id: 'healing_potion', 
    in: [{ id: 'sunroot_crop', q: 2 }, { id: 'fiber', q: 1 }], 
    out: { id: 'healing_potion', q: 1 }, 
    time: 5, 
    station: 'alchemist', 
    tier: 0,
    desc: 'A basic healing draught.'
  },
  { 
    id: 'greater_healing', 
    in: [{ id: 'moonpetal_crop', q: 2 }, { id: 'sunroot_crop', q: 1 }, { id: 'slime_core', q: 1 }], 
    out: { id: 'greater_healing', q: 1 }, 
    time: 12, 
    station: 'alchemist', 
    tier: 1,
    desc: 'A powerful healing elixir.'
  },
  { 
    id: 'stamina_potion', 
    in: [{ id: 'sunroot_crop', q: 1 }, { id: 'fiber', q: 2 }], 
    out: { id: 'stamina_potion', q: 1 }, 
    time: 4, 
    station: 'alchemist', 
    tier: 0,
    desc: 'Restores stamina quickly.'
  },
  { 
    id: 'strength_potion', 
    in: [{ id: 'moonpetal_crop', q: 1 }, { id: 'orc_fang', q: 2 }, { id: 'bone', q: 1 }], 
    out: { id: 'strength_potion', q: 1 }, 
    time: 10, 
    station: 'alchemist', 
    tier: 1,
    desc: 'Temporarily increases attack power.'
  },
  { 
    id: 'speed_potion', 
    in: [{ id: 'bat_wing', q: 3 }, { id: 'fiber', q: 2 }], 
    out: { id: 'speed_potion', q: 1 }, 
    time: 8, 
    station: 'alchemist', 
    tier: 1,
    desc: 'Temporarily increases movement speed.'
  },
  { 
    id: 'antidote', 
    in: [{ id: 'sunroot_crop', q: 1 }, { id: 'slime_core', q: 1 }], 
    out: { id: 'antidote', q: 2 }, 
    time: 5, 
    station: 'alchemist', 
    tier: 0,
    desc: 'Cures poison effects.'
  },
  
  // Special Items
  { 
    id: 'bone_staff', 
    in: [{ id: 'bone', q: 5 }, { id: 'skeleton_dust', q: 3 }, { id: 'moonstone', q: 1 }], 
    out: { id: 'bone_staff', q: 1 }, 
    time: 15, 
    station: 'alchemist', 
    tier: 1,
    desc: 'A staff that channels dark magic.'
  },
  { 
    id: 'lucky_charm', 
    in: [{ id: 'bone', q: 2 }, { id: 'moonstone', q: 1 }, { id: 'gold_bar', q: 1 }], 
    out: { id: 'lucky_charm', q: 1 }, 
    time: 12, 
    station: 'alchemist', 
    tier: 1,
    desc: 'Increases luck and drop rates.'
  },
  { 
    id: 'teleport_stone', 
    in: [{ id: 'moonstone', q: 3 }, { id: 'golem_heart', q: 1 }], 
    out: { id: 'teleport_stone', q: 1 }, 
    time: 20, 
    station: 'alchemist', 
    tier: 2,
    desc: 'Instantly return to the village.'
  },
  { 
    id: 'alchemy_station', 
    in: [{ id: 'stone', q: 6 }, { id: 'iron_bar', q: 2 }, { id: 'moonpetal_crop', q: 2 }], 
    out: { id: 'alchemy_station', q: 1 }, 
    time: 18, 
    station: 'alchemist', 
    tier: 1,
    desc: 'An alchemy table for your plot.'
  },
  
  // Food
  { 
    id: 'cooked_meat', 
    in: [{ id: 'wolf_pelt', q: 1 }], 
    out: { id: 'cooked_meat', q: 2 }, 
    time: 3, 
    station: 'alchemist', 
    tier: 0,
    desc: 'Cook meat for a small heal.'
  },
];

// Recipe categories for UI
export const recipeCategories = {
  forge: ['Smelting', 'Weapons', 'Armor', 'Accessories', 'Buildables'],
  tanner: ['Processing', 'Weapons', 'Armor', 'Buildables'],
  alchemist: ['Potions', 'Special', 'Food', 'Buildables'],
};
