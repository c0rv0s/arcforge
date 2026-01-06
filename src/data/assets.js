// Asset configuration for all Pixel Crawler sprite packs
// Frame sizes are typically 64x64 for enemies, 32x32 for some smaller ones

export const assetConfig = {
  // Biome tilesets
  tilesets: {
    village: {
      floor: 'assets/Pixel Crawler - Free Pack/Environment/Tilesets/Floors_Tiles.png',
      walls: 'assets/Pixel Crawler - Free Pack/Environment/Tilesets/Wall_Tiles.png',
      props: 'assets/Pixel Crawler - Free Pack/Environment/Props/Static Props/Props.png',
    },
    forest: {
      tiles: 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tiles.png',
      props: 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Props.png',
      trees: 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tree.png',
    },
    desert: {
      ground: 'assets/Pixel Crawler - Desert/Assets/Ground.png',
      sand: 'assets/Pixel Crawler - Desert/Assets/Sand.png',
      props: 'assets/Pixel Crawler - Desert/Assets/Props.png',
    },
    cemetery: {
      tiles: 'assets/Pixel Crawler - Cemetery/Environment/TileSets/Tiles.png',
      floor: 'assets/Pixel Crawler - Cemetery/Environment/TileSets/Floor.png',
      graves: 'assets/Pixel Crawler - Cemetery/Environment/Props/Graves.png',
    },
    sewer: {
      tiles: 'assets/Pixel Crawler - Sewer/Assets/Tiles.png',
      props: 'assets/Pixel Crawler - Sewer/Assets/Props.png',
      water: 'assets/Pixel Crawler - Sewer/Assets/Water.png',
    },
    cave: {
      tiles: 'assets/Pixel Crawler - Cave/Assets/Tiles.png',
      props: 'assets/Pixel Crawler - Cave/Assets/Props.png',
    },
    forge: {
      tiles: 'assets/Pixel Crawler - Forge/Assets/Tiles.png',
    },
  },

  // Enemy sprites organized by biome
  enemies: {
    // Forest (North) - Elves
    elf_base: {
      idle: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Base/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Base/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Base/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    elf_hunter: {
      idle: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Hunter/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Hunter/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Hunter/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    elf_druid: {
      idle: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Druid/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Druid/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Druid/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    elf_ranger: {
      idle: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Ranger/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Ranger/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies/Elf - Ranger/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },

    // Desert (East) - Mummies
    mummy_base: {
      idle: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Base/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Base/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Base/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    mummy_warrior: {
      idle: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Warrior/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Warrior/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Warrior/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    mummy_rogue: {
      idle: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Rogue/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Rogue/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Rogue/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    mummy_mage: {
      idle: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Mage/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Mage/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Desert/Enemy/Mummy - Mage/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },

    // Cemetery (South) - Zombies
    zombie_base: {
      idle: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Base/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Base/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Base/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    zombie_banshee: {
      idle: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Banshee/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Banshee/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Banshee/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    zombie_muscle: {
      idle: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Muscle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Muscle/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Muscle/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    zombie_fat: {
      idle: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Overweight/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Overweight/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cemetery/Entities/Mobs/Zombie - Overweight/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },

    // Sewer (West) - Rats
    rat_base: {
      idle: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Base/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Base/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Base/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    rat_warrior: {
      idle: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Warrior/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Warrior/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Warrior/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    rat_rogue: {
      idle: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Rogue/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Rogue/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Rogue/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    rat_mage: {
      idle: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Mage/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Mage/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Sewer/Enemy/Rat - Mage/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },

    // Cave - Fungus creatures
    fungus_immature: {
      idle: 'assets/Pixel Crawler - Cave/Enemies/Immature Fungus/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cave/Enemies/Immature Fungus/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cave/Enemies/Immature Fungus/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    fungus_long: {
      idle: 'assets/Pixel Crawler - Cave/Enemies/Long Fungus/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cave/Enemies/Long Fungus/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cave/Enemies/Long Fungus/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    fungus_heavy: {
      idle: 'assets/Pixel Crawler - Cave/Enemies/Heavy Fungus/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cave/Enemies/Heavy Fungus/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cave/Enemies/Heavy Fungus/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    fungus_old: {
      idle: 'assets/Pixel Crawler - Cave/Enemies/Old Fungus/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Cave/Enemies/Old Fungus/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Cave/Enemies/Old Fungus/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },

    // Forge - Stone/Golem creatures
    stone_base: {
      idle: 'assets/Pixel Crawler - Forge/Enemy/Stone - Base/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Forge/Enemy/Stone - Base/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Forge/Enemy/Stone - Base/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    stone_golem: {
      idle: 'assets/Pixel Crawler - Forge/Enemy/Stone - Golem/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Forge/Enemy/Stone - Golem/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Forge/Enemy/Stone - Golem/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    stone_lava: {
      idle: 'assets/Pixel Crawler - Forge/Enemy/Stone - Lava/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Forge/Enemy/Stone - Lava/Run/Run-Sheet.png',
      death: 'assets/Pixel Crawler - Forge/Enemy/Stone - Lava/Death/Death-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
  },

  // Friendly NPC sprites
  npcs: {
    knight: {
      idle: 'assets/Pixel Crawler - Free Pack/Entities/Npc\'s/Knight/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Free Pack/Entities/Npc\'s/Knight/Run/Run-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    wizard: {
      idle: 'assets/Pixel Crawler - Free Pack/Entities/Npc\'s/Wizzard/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Free Pack/Entities/Npc\'s/Wizzard/Run/Run-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    rogue: {
      idle: 'assets/Pixel Crawler - Free Pack/Entities/Npc\'s/Rogue/Idle/Idle-Sheet.png',
      run: 'assets/Pixel Crawler - Free Pack/Entities/Npc\'s/Rogue/Run/Run-Sheet.png',
      frameWidth: 64,
      frameHeight: 64,
    },
  },

  // Existing player sprites (already loaded)
  player: {
    runDown: 'assets/player/run/Run_Down-Sheet.png',
    runUp: 'assets/player/run/Run_Up-Sheet.png',
    runSide: 'assets/player/run/Run_Side-Sheet.png',
    attackDown: 'assets/player/attack/Slice_Down-Sheet.png',
    attackUp: 'assets/player/attack/Slice_Up-Sheet.png',
    attackSide: 'assets/player/attack/Slice_Side-Sheet.png',
  },
};

// Biome colors for procedural world coloring (fallback when tiles not loaded)
export const biomeColors = {
  village: { ground: 0x8b7355, accent: 0x6b5335 },
  forest: { ground: 0x2d5a2d, accent: 0x1a3d1a },
  desert: { ground: 0xd4a754, accent: 0xc4913a },
  cemetery: { ground: 0x4a4a5a, accent: 0x3a3a4a },
  sewer: { ground: 0x3d4a3d, accent: 0x2d3a2d },
  cave: { ground: 0x3d3d4d, accent: 0x2d2d3d },
  forge: { ground: 0x5a3d3d, accent: 0x4a2d2d },
  meadow: { ground: 0x4a7c3f, accent: 0x5a9c4f },
  water: { ground: 0x3498db, accent: 0x2980b9 },
};
