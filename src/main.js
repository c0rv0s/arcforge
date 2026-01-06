import { items } from './data/items.js';
import { recipes } from './data/recipes.js';
import { mobTypes } from './data/mobs.js';
import { plotConfig } from './data/plots.js';
import { biomes } from './data/biomes.js';

// Check for CORS issues (running from file:// protocol)
if (window.location.protocol === 'file:') {
  console.error('[Arcforge] ERROR: Game is running from file:// protocol.');
  console.error('[Arcforge] Browsers block loading local assets due to CORS restrictions.');
  console.error('[Arcforge] To fix, run a local server:');
  console.error('[Arcforge]   npx serve .');
  console.error('[Arcforge]   python -m http.server 8000');
  console.error('[Arcforge]   php -S localhost:8000');
  alert('Game must be run from a local server, not opened directly.\n\nRun: npx serve .\nThen open: http://localhost:3000');
}

// Tile and world configuration - adjusted for actual asset sizes
const TILE = 32; // Display tile size
const WORLD_SIZE = 64; // tiles per side
const PLAYER_SCALE = 1.0;
const MOB_SCALE = 1.0;
const LOG_LIMIT = 6;

// Noise function for procedural terrain
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function noise2D(x, y, seed = 12345) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, seed) {
  const corners = (noise2D(x-1, y-1, seed) + noise2D(x+1, y-1, seed) + 
                   noise2D(x-1, y+1, seed) + noise2D(x+1, y+1, seed)) / 16;
  const sides = (noise2D(x-1, y, seed) + noise2D(x+1, y, seed) + 
                 noise2D(x, y-1, seed) + noise2D(x, y+1, seed)) / 8;
  const center = noise2D(x, y, seed) / 4;
  return corners + sides + center;
}

function interpolatedNoise(x, y, seed) {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const intY = Math.floor(y);
  const fracY = y - intY;
  
  const v1 = smoothNoise(intX, intY, seed);
  const v2 = smoothNoise(intX + 1, intY, seed);
  const v3 = smoothNoise(intX, intY + 1, seed);
  const v4 = smoothNoise(intX + 1, intY + 1, seed);
  
  const i1 = v1 * (1 - fracX) + v2 * fracX;
  const i2 = v3 * (1 - fracX) + v4 * fracX;
  
  return i1 * (1 - fracY) + i2 * fracY;
}

function perlinNoise(x, y, octaves = 4, persistence = 0.5, seed = 12345) {
  let total = 0;
  let frequency = 0.05;
  let amplitude = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    total += interpolatedNoise(x * frequency, y * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  return total / maxValue;
}

const playerState = {
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  coins: 120,
  xp: 0,
  level: 1,
  inventory: {
    wood: 8,
    fiber: 6,
    stone: 8,
    sunroot_seed: 4,
    healing_potion: 2,
    iron_bar: 1,
  },
  plots: [],
  equipped: { weapon: null, armor: null },
};

const logMessages = [];

function addItem(id, qty = 1) {
  playerState.inventory[id] = (playerState.inventory[id] || 0) + qty;
}

function hasItems(requirements) {
  return requirements.every(({ id, q }) => (playerState.inventory[id] || 0) >= q);
}

function spendItems(requirements) {
  requirements.forEach(({ id, q }) => {
    playerState.inventory[id] = (playerState.inventory[id] || 0) - q;
    if (playerState.inventory[id] <= 0) delete playerState.inventory[id];
  });
}

function logEvent(text) {
  logMessages.unshift({ text, at: Date.now() });
  while (logMessages.length > LOG_LIMIT) logMessages.pop();
  renderLog();
}

function renderLog() {
  const el = document.getElementById('log');
  el.innerHTML = logMessages
    .map((l) => `<div>${l.text}</div>`)
    .join('') || 'Explore, fight, craft, claim land.';
}

function formatInventory() {
  return Object.entries(playerState.inventory)
    .map(([id, q]) => `${items[id]?.name || id} x${q}`)
    .join(', ');
}

function updateHUD(taskText = '') {
  const hud = document.getElementById('hud');
  const hpPercent = Math.max(0, Math.min(100, Math.floor((playerState.hp / playerState.maxHp) * 100)));
  const stamPercent = Math.max(0, Math.min(100, Math.floor((playerState.stamina / playerState.maxStamina) * 100)));
  hud.innerHTML = `
    <h1>Arcforge Shard</h1>
    <div class="stat-line"><span>HP</span><span>${playerState.hp}/${playerState.maxHp}</span></div>
    <div class="bar"><span style="width:${hpPercent}%"></span></div>
    <div class="stat-line"><span>Stamina</span><span>${playerState.stamina}/${playerState.maxStamina}</span></div>
    <div class="bar"><span style="width:${stamPercent}%;background:linear-gradient(90deg,#ffd66b,#ff7c52)"></span></div>
    <div class="stat-line"><span>Coins</span><span>${playerState.coins}</span></div>
    <div class="stat-line"><span>XP</span><span>${playerState.xp} (Lv ${playerState.level})</span></div>
    <div class="stat-line keybinds">Move: WASD · Attack: Space · Interact: E · Craft: C · Inventory: I</div>
    ${taskText ? `<div style="font-size:12px;color:#8df2c5;">${taskText}</div>` : ''}
  `;
}

function renderPanel(content) {
  const panel = document.getElementById('panel');
  panel.style.display = content ? 'block' : 'none';
  panel.innerHTML = content || '';
}

function renderInventoryPanel() {
  const entries = Object.entries(playerState.inventory).sort();
  const inv = entries
    .map(([id, q]) => `<div class="pill">${items[id]?.name || id} x${q}</div>`)
    .join('');
  renderPanel(`
    <h2>Inventory</h2>
    <section>${inv || 'Empty backpack'}</section>
    <section><strong>Plots Owned:</strong> ${playerState.plots.length ? playerState.plots.join(', ') : 'None'}</section>
    <section class="keybinds">Press C near a station to craft · Press P while on your plot to build.</section>
  `);
}

// Biome color palette for procedural generation
const biomeColors = {
  meadow: { ground: 0x4a7c3f, accent: 0x5a9c4f },
  forest: { ground: 0x2d5a2d, accent: 0x1a3d1a },
  desert: { ground: 0xd4a754, accent: 0xc4913a },
  cave: { ground: 0x3d3d4d, accent: 0x2d2d3d },
  water: { ground: 0x3498db, accent: 0x2980b9 },
  ruins: { ground: 0x6b6b7b, accent: 0x4b4b5b },
  village: { ground: 0x8b7355, accent: 0x6b5335 },
};

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading Arcforge...', {
      fontSize: '20px',
      fill: '#9ad8ff',
      fontFamily: 'Space Grotesk, sans-serif'
    }).setOrigin(0.5);
    
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x7af5d7, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('loaderror', (file) => {
      console.error(`[Arcforge] Failed to load: ${file.src}`);
      loadingText.setText(`Error loading: ${file.key}`);
      loadingText.setColor('#ff6b6b');
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load tile spritesheets - using correct frame sizes
    this.load.spritesheet('tiles', 'assets/tiles/Floors_Tiles.png', { frameWidth: 96, frameHeight: 96 });
    this.load.spritesheet('walls', 'assets/tiles/Wall_Tiles.png', { frameWidth: 96, frameHeight: 96 });
    this.load.spritesheet('water', 'assets/tiles/Water_tiles.png', { frameWidth: 96, frameHeight: 96 });
    
    // Load player spritesheets
    this.load.spritesheet('player-run-down', 'assets/player/run/Run_Down-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player-run-up', 'assets/player/run/Run_Up-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player-run-side', 'assets/player/run/Run_Side-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player-attack-down', 'assets/player/attack/Slice_Down-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player-attack-up', 'assets/player/attack/Slice_Up-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player-attack-side', 'assets/player/attack/Slice_Side-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    
    // Load mob spritesheets - run is 64x64, idle is 32x32
    this.load.spritesheet('orc-run', 'assets/mobs/orc/run.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('orc-idle', 'assets/mobs/orc/idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton-run', 'assets/mobs/skeleton/run.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('skeleton-idle', 'assets/mobs/skeleton/idle.png', { frameWidth: 32, frameHeight: 32 });
    
    // Load additional creature sprites from asset packs
    this.load.spritesheet('bat-idle', 'assets/Small_Bat/Idle/Idle_Down-Sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('bat-move', 'assets/Small_Bat/Move/Move_Down-Sheet.png', { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    // Create all animations
    this.createAnimations();
    this.scene.start('main');
  }
  
  createAnimations() {
    // Player animations
    this.anims.create({
      key: 'player-run-down',
      frames: this.anims.generateFrameNumbers('player-run-down', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-run-up',
      frames: this.anims.generateFrameNumbers('player-run-up', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-run-side',
      frames: this.anims.generateFrameNumbers('player-run-side', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-attack-down',
      frames: this.anims.generateFrameNumbers('player-attack-down', { start: 0, end: 7 }),
      frameRate: 18,
      repeat: 0,
    });
    this.anims.create({
      key: 'player-attack-up',
      frames: this.anims.generateFrameNumbers('player-attack-up', { start: 0, end: 7 }),
      frameRate: 18,
      repeat: 0,
    });
    this.anims.create({
      key: 'player-attack-side',
      frames: this.anims.generateFrameNumbers('player-attack-side', { start: 0, end: 7 }),
      frameRate: 18,
      repeat: 0,
    });
    
    // Mob animations
    this.anims.create({
      key: 'orc-run',
      frames: this.anims.generateFrameNumbers('orc-run', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'orc-idle',
      frames: this.anims.generateFrameNumbers('orc-idle', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'skeleton-run',
      frames: this.anims.generateFrameNumbers('skeleton-run', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'skeleton-idle',
      frames: this.anims.generateFrameNumbers('skeleton-idle', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    
    // Bat animations
    this.anims.create({
      key: 'bat-idle',
      frames: this.anims.generateFrameNumbers('bat-idle', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'bat-move',
      frames: this.anims.generateFrameNumbers('bat-move', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'main' });
    this.worldData = null;
    this.player = null;
    this.mobs = [];
    this.craftingTask = null;
    this.farmland = [];
    this.plots = [];
    this.stations = [];
    this.resources = [];
    this.npcs = [];
    this.dungeonEntrances = [];
    this.worldSeed = Date.now();
  }

  create() {
    console.log('[Arcforge] Starting create()');
    updateHUD('Explore the world, seek the village forge.');
    renderLog();
    
    console.log('[Arcforge] Building world...');
    this.buildProceduralWorld();
    
    console.log('[Arcforge] Creating player...');
    this.createPlayer();
    
    console.log('[Arcforge] Creating village...');
    this.createVillage();
    
    console.log('[Arcforge] Creating plots...');
    this.createPlots();
    
    console.log('[Arcforge] Creating farmland...');
    this.createFarmland();
    
    console.log('[Arcforge] Spawning resources...');
    this.spawnResources();
    
    console.log('[Arcforge] Spawning mobs...');
    this.spawnMobs();
    
    console.log('[Arcforge] Creating dungeons...');
    this.createDungeonEntrances();
    
    console.log('[Arcforge] Init input...');
    this.initInput();
    
    // Camera setup
    console.log('[Arcforge] Setting up camera...');
    this.cameras.main.setZoom(1.5);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(100, 100);
    
    // Create minimap camera
    console.log('[Arcforge] Creating minimap...');
    this.createMinimap();
    
    // Particle effects
    this.createParticleSystems();
    
    logEvent('Welcome to Arcforge Shard! Explore and survive.');
    console.log('[Arcforge] Create complete!');
    
    // Debug: add bright test rectangle
    const testRect = this.add.rectangle(this.player.x, this.player.y - 50, 100, 100, 0xff0000);
    testRect.setDepth(1000);
    console.log('[Arcforge] Player position:', this.player.x, this.player.y);
  }

  buildProceduralWorld() {
    const worldWidth = WORLD_SIZE * TILE;
    const worldHeight = WORLD_SIZE * TILE;
    
    // Set world bounds
    this.physics.world.bounds.width = worldWidth;
    this.physics.world.bounds.height = worldHeight;
    
    // Create collision groups for obstacles
    this.obstacles = this.physics.add.staticGroup();
    this.waterBodies = this.physics.add.staticGroup();
    
    // Generate terrain using noise
    const terrainData = [];
    
    for (let y = 0; y < WORLD_SIZE; y++) {
      terrainData[y] = [];
      for (let x = 0; x < WORLD_SIZE; x++) {
        const elevation = perlinNoise(x, y, 4, 0.5, this.worldSeed);
        const moisture = perlinNoise(x, y, 3, 0.6, this.worldSeed + 1000);
        const temperature = perlinNoise(x, y, 2, 0.4, this.worldSeed + 2000);
        
        let biome = 'meadow';
        
        // Determine biome based on noise values
        if (elevation < 0.3) {
          biome = 'water';
        } else if (elevation < 0.35) {
          biome = moisture > 0.5 ? 'meadow' : 'desert';
        } else if (elevation < 0.55) {
          if (moisture > 0.6) biome = 'forest';
          else if (moisture < 0.35) biome = 'desert';
          else biome = 'meadow';
        } else if (elevation < 0.7) {
          biome = temperature < 0.4 ? 'cave' : 'ruins';
        } else {
          biome = 'cave';
        }
        
        // Distance from center for village placement
        const centerDist = Math.hypot(x - WORLD_SIZE/2, y - WORLD_SIZE/2);
        if (centerDist < 12) {
          biome = 'village';
        }
        
        terrainData[y][x] = { elevation, moisture, biome };
      }
    }
    
    // Create terrain graphics directly (simple and reliable)
    const graphics = this.add.graphics();
    graphics.setDepth(0);
    
    // Render terrain tiles
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        const tile = terrainData[y][x];
        const px = x * TILE;
        const py = y * TILE;
        
        const colors = biomeColors[tile.biome] || biomeColors.meadow;
        const variation = noise2D(x, y, this.worldSeed + 500) * 0.15;
        
        // Draw base tile with variation
        const baseColor = Phaser.Display.Color.IntegerToColor(colors.ground);
        const r = Math.max(0, Math.min(255, Math.floor(baseColor.red * (1 + variation))));
        const g = Math.max(0, Math.min(255, Math.floor(baseColor.green * (1 + variation))));
        const b = Math.max(0, Math.min(255, Math.floor(baseColor.blue * (1 + variation))));
        const finalColor = Phaser.Display.Color.GetColor(r, g, b);
        
        graphics.fillStyle(finalColor, 1);
        graphics.fillRect(px, py, TILE, TILE);
        
        // Add texture details
        const detailRand = seededRandom(x * 1000 + y);
        if (tile.biome === 'meadow' || tile.biome === 'forest') {
          if (detailRand < 0.2) {
            graphics.fillStyle(colors.accent, 0.5);
            graphics.fillCircle(px + TILE * 0.3, py + TILE * 0.6, 2);
            graphics.fillCircle(px + TILE * 0.7, py + TILE * 0.4, 2);
          }
        } else if (tile.biome === 'desert') {
          if (detailRand < 0.15) {
            graphics.fillStyle(0xe8c36a, 0.4);
            graphics.fillCircle(px + TILE * 0.5, py + TILE * 0.5, 1);
          }
        } else if (tile.biome === 'water') {
          // Blue water overlay
          graphics.fillStyle(0x3498db, 0.9);
          graphics.fillRect(px, py, TILE, TILE);
          if (detailRand < 0.1) {
            graphics.lineStyle(1, 0x5dade2, 0.4);
            graphics.strokeCircle(px + TILE/2, py + TILE/2, 5);
          }
        }
      }
    }
    
    // Now add obstacles and water collisions on top
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        const tile = terrainData[y][x];
        const px = x * TILE;
        const py = y * TILE;
        
        // Create obstacles (trees, rocks) - less dense for performance
        if (tile.biome !== 'water' && tile.biome !== 'village') {
          const obstacleChance = tile.biome === 'forest' ? 0.06 : tile.biome === 'cave' ? 0.04 : 0.02;
          const obstacleRand = seededRandom(x * 2000 + y + this.worldSeed);
          if (obstacleRand < obstacleChance) {
            this.createObstacle(px + TILE/2, py + TILE/2, tile.biome);
          }
        }
        
        // Create water collision
        if (tile.biome === 'water') {
          const waterRect = this.add.rectangle(px + TILE/2, py + TILE/2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(waterRect, true);
          this.waterBodies.add(waterRect);
        }
      }
    }
    
    this.terrainData = terrainData;
    console.log('World generated:', WORLD_SIZE, 'x', WORLD_SIZE, 'tiles');
  }
  
  debugLog(msg) {
    console.log('[Arcforge]', msg);
  }
  
  createObstacle(x, y, biome) {
    const graphics = this.add.graphics();
    graphics.setDepth(2);
    
    if (biome === 'forest' || biome === 'meadow') {
      // Tree
      graphics.fillStyle(0x4a3728, 1);
      graphics.fillRect(x - 4, y, 8, 16);
      graphics.fillStyle(0x2d5a2d, 1);
      graphics.fillCircle(x, y - 8, 14);
      graphics.fillStyle(0x3d7a3d, 0.8);
      graphics.fillCircle(x - 4, y - 6, 8);
      graphics.fillCircle(x + 5, y - 10, 10);
    } else if (biome === 'desert') {
      // Cactus
      graphics.fillStyle(0x4a8f4a, 1);
      graphics.fillRect(x - 3, y - 10, 6, 20);
      graphics.fillRect(x - 10, y - 6, 8, 4);
      graphics.fillRect(x + 2, y - 2, 8, 4);
    } else if (biome === 'cave' || biome === 'ruins') {
      // Rock
      graphics.fillStyle(0x5a5a6a, 1);
      graphics.fillCircle(x, y, 10);
      graphics.fillStyle(0x4a4a5a, 0.8);
      graphics.fillCircle(x - 3, y + 2, 6);
    }
    
    // Add collision
    const obstacle = this.add.rectangle(x, y + 4, 16, 16, 0x000000, 0);
    this.physics.add.existing(obstacle, true);
    this.obstacles.add(obstacle);
  }

  createPlayer() {
    const spawnX = (WORLD_SIZE / 2) * TILE;
    const spawnY = (WORLD_SIZE / 2) * TILE;
    
    this.player = this.physics.add.sprite(spawnX, spawnY, 'player-run-down');
    this.player.setScale(PLAYER_SCALE);
    this.player.setSize(20, 24).setOffset(22, 28);
    this.player.direction = 'down';
    this.player.lastAttack = 0;
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);
    
    // Collisions
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.player, this.waterBodies, () => {
      // Push player back from water
      const angle = Math.atan2(
        this.player.y - (WORLD_SIZE / 2) * TILE,
        this.player.x - (WORLD_SIZE / 2) * TILE
      );
      this.player.setVelocity(Math.cos(angle) * 50, Math.sin(angle) * 50);
    });
    
    // Player shadow
    this.playerShadow = this.add.ellipse(spawnX, spawnY + 20, 20, 8, 0x000000, 0.3);
    this.playerShadow.setDepth(4);
  }

  createVillage() {
    const centerX = (WORLD_SIZE / 2) * TILE;
    const centerY = (WORLD_SIZE / 2) * TILE;
    
    // Village stations
    this.addStation({ x: centerX - 80, y: centerY - 40, type: 'forge', label: 'Village Forge' });
    this.addStation({ x: centerX + 80, y: centerY - 40, type: 'tanner', label: 'Tanner' });
    this.addStation({ x: centerX, y: centerY + 60, type: 'alchemist', label: 'Alchemist' });
    
    // Add village NPCs
    this.createNPC(centerX - 30, centerY - 20, 'blacksmith', 'Forge Master Kern');
    this.createNPC(centerX + 100, centerY - 20, 'merchant', 'Trader Mira');
    this.createNPC(centerX, centerY + 80, 'alchemist', 'Sage Elden');
    
    // Village decorations
    const graphics = this.add.graphics();
    graphics.setDepth(1);
    
    // Well
    graphics.fillStyle(0x5a5a6a, 1);
    graphics.fillCircle(centerX + 40, centerY, 16);
    graphics.fillStyle(0x3498db, 0.7);
    graphics.fillCircle(centerX + 40, centerY, 10);
    graphics.lineStyle(2, 0x4a3728);
    graphics.strokeCircle(centerX + 40, centerY, 16);
    
    // Add well collision
    const well = this.add.rectangle(centerX + 40, centerY, 32, 32, 0x000000, 0);
    this.physics.add.existing(well, true);
    this.obstacles.add(well);
    
    // Village paths
    graphics.fillStyle(0x8b7355, 0.6);
    for (let i = -6; i <= 6; i++) {
      graphics.fillRect(centerX + i * TILE - TILE/2, centerY - 100, TILE, 200);
    }
    for (let i = -4; i <= 4; i++) {
      graphics.fillRect(centerX - 100, centerY + i * TILE - TILE/2, 200, TILE);
    }
  }
  
  createNPC(x, y, type, name) {
    const graphics = this.add.graphics();
    graphics.setDepth(3);
    
    // NPC body
    const colors = {
      blacksmith: 0x8b4513,
      merchant: 0x9b59b6,
      alchemist: 0x27ae60,
    };
    
    graphics.fillStyle(colors[type] || 0x7f8c8d, 1);
    graphics.fillCircle(x, y - 8, 10);
    graphics.fillStyle(0xf5deb3, 1);
    graphics.fillCircle(x, y - 16, 8);
    
    // Name tag
    const nameText = this.add.text(x, y - 32, name, {
      fontSize: '10px',
      color: '#ffd66b',
      fontFamily: 'Space Grotesk',
    }).setOrigin(0.5).setDepth(10);
    
    // NPC collision
    const npcHitbox = this.add.rectangle(x, y, 24, 24, 0x000000, 0);
    this.physics.add.existing(npcHitbox, true);
    this.obstacles.add(npcHitbox);
    
    this.npcs.push({ x, y, type, name, graphics, nameText, hitbox: npcHitbox });
  }

  createPlots() {
    // Create more plots around the village
    const centerX = Math.floor(WORLD_SIZE / 2);
    const centerY = Math.floor(WORLD_SIZE / 2);
    
    const plotPositions = [
      { id: 'village-1', x: centerX - 5, y: centerY + 4, price: 40 },
      { id: 'village-2', x: centerX + 5, y: centerY + 4, price: 45 },
      { id: 'village-3', x: centerX - 5, y: centerY - 5, price: 50 },
      { id: 'village-4', x: centerX + 5, y: centerY - 5, price: 55 },
      { id: 'river-1', x: centerX + 15, y: centerY, price: 60 },
      { id: 'forest-1', x: centerX - 18, y: centerY + 10, price: 70 },
    ];
    
    plotPositions.forEach((plot) => {
      const px = plot.x * TILE;
      const py = plot.y * TILE;
      
      const sprite = this.add.rectangle(px, py, TILE * 2, TILE * 2, 0x29414f, 0.5);
      sprite.setStrokeStyle(2, 0x7af5d7, 0.8);
      sprite.setDepth(1);
      
      const label = this.add.text(px, py - TILE - 5, `${plot.id}\n${plot.price}g`, {
        fontSize: '9px',
        color: '#7af5d7',
        align: 'center',
      }).setOrigin(0.5).setDepth(10);
      
      this.plots.push({ ...plot, tile: { x: plot.x, y: plot.y }, sprite, label, owner: null, structure: null });
    });
  }

  createFarmland() {
    const start = { x: Math.floor(WORLD_SIZE / 2) - 8, y: Math.floor(WORLD_SIZE / 2) + 8 };
    
    for (let i = 0; i < 8; i++) {
      const tile = { x: start.x + (i % 4), y: start.y + Math.floor(i / 4) };
      const px = tile.x * TILE;
      const py = tile.y * TILE;
      
      const sprite = this.add.rectangle(px, py, TILE - 2, TILE - 2, 0x5a3f23, 0.8);
      sprite.setStrokeStyle(1, 0xf7c173, 0.7);
      sprite.setDepth(1);
      
      this.farmland.push({ tile, sprite, seed: null, plantedAt: 0, ready: false });
    }
  }
  
  spawnResources() {
    // Spawn gatherable resources around the world
    const resourceTypes = [
      { type: 'wood', biomes: ['forest', 'meadow'], color: 0x8b4513 },
      { type: 'stone', biomes: ['cave', 'ruins'], color: 0x7f8c8d },
      { type: 'fiber', biomes: ['meadow', 'forest'], color: 0x9acd32 },
      { type: 'iron_ore', biomes: ['cave', 'ruins'], color: 0x7f7f7f },
      { type: 'coal', biomes: ['cave'], color: 0x2c2c2c },
    ];
    
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(10, WORLD_SIZE - 10);
      const y = Phaser.Math.Between(10, WORLD_SIZE - 10);
      
      const tileBiome = this.terrainData?.[y]?.[x]?.biome || 'meadow';
      const validResources = resourceTypes.filter(r => r.biomes.includes(tileBiome));
      
      if (validResources.length > 0) {
        const resource = Phaser.Utils.Array.GetRandom(validResources);
        const px = x * TILE;
        const py = y * TILE;
        
        const graphics = this.add.graphics();
        graphics.setDepth(2);
        graphics.fillStyle(resource.color, 0.9);
        
        if (resource.type === 'wood') {
          graphics.fillRect(px - 3, py - 6, 6, 12);
          graphics.fillStyle(0x228b22, 0.8);
          graphics.fillCircle(px, py - 10, 6);
        } else if (resource.type === 'stone' || resource.type === 'iron_ore') {
          graphics.fillCircle(px, py, 6);
        } else if (resource.type === 'fiber') {
          graphics.lineStyle(2, resource.color);
          graphics.lineBetween(px - 4, py + 4, px, py - 4);
          graphics.lineBetween(px, py + 4, px + 4, py - 6);
        } else if (resource.type === 'coal') {
          graphics.fillCircle(px, py, 5);
          graphics.fillStyle(0x1a1a1a, 0.8);
          graphics.fillCircle(px + 2, py - 2, 3);
        }
        
        const hitbox = this.add.rectangle(px, py, 16, 16, 0x000000, 0);
        this.physics.add.existing(hitbox, true);
        
        this.resources.push({
          type: resource.type,
          x: px,
          y: py,
          graphics,
          hitbox,
          respawnTime: 0,
        });
      }
    }
  }

  spawnMobs() {
    const mobSpawns = [];
    
    // Generate spawn points based on terrain
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(15, WORLD_SIZE - 15);
      const y = Phaser.Math.Between(15, WORLD_SIZE - 15);
      
      // Don't spawn in village
      const centerDist = Math.hypot(x - WORLD_SIZE/2, y - WORLD_SIZE/2);
      if (centerDist < 15) continue;
      
      const tileBiome = this.terrainData?.[y]?.[x]?.biome || 'meadow';
      if (tileBiome === 'water') continue;
      
      let mobType = 'orc';
      
      // Biome-specific mobs
      if (tileBiome === 'cave' || tileBiome === 'ruins') {
        mobType = Math.random() < 0.4 ? 'skeleton' : Math.random() < 0.7 ? 'brute' : 'skeleton';
      } else if (tileBiome === 'forest') {
        mobType = Math.random() < 0.3 ? 'skeleton' : 'orc';
      } else if (tileBiome === 'desert') {
        mobType = Math.random() < 0.5 ? 'brute' : 'orc';
      }
      
      mobSpawns.push({ x: x * TILE, y: y * TILE, type: mobType });
    }
    
    mobSpawns.forEach((spawn) => {
      this.spawnMob(spawn.type, spawn.x, spawn.y);
    });
  }

  spawnMob(type, x, y) {
    const data = mobTypes[type];
    if (!data) return;

    // Map sprite types to their idle animation keys
    const spriteToIdle = {
      'orc': 'orc-idle',
      'skeleton': 'skeleton-idle',
      'bat': 'bat-idle',
    };
    const spriteKey = spriteToIdle[data.sprite] || 'orc-idle';

    // Check if texture exists before creating sprite
    if (!this.textures.exists(spriteKey)) {
      console.warn(`[Arcforge] Missing sprite texture: ${spriteKey}, using fallback`);
      const fallbackKey = 'orc-idle';
      if (!this.textures.exists(fallbackKey)) {
        console.error(`[Arcforge] Fallback texture also missing, skipping mob spawn`);
        return;
      }
    }

    const mob = this.physics.add.sprite(x, y, spriteKey);
    
    mob.setScale(MOB_SCALE);
    mob.setDataEnabled();
    mob.data.set({
      type,
      hp: data.hp,
      maxHp: data.hp,
      speed: data.speed,
      attack: data.attack,
      attackRate: data.attackRate,
      aggroRange: data.aggroRange,
      nextAttack: 0,
      wanderDir: new Phaser.Math.Vector2(0, 0),
      lastWander: 0,
      elite: !!data.elite,
      state: 'idle',
    });
    
    if (data.tint) mob.setTint(data.tint);
    mob.play(spriteKey);
    mob.body.setSize(20, 24).setOffset(22, 28);
    mob.setDepth(4);
    
    // HP bar
    const hpBarBg = this.add.rectangle(x, y - 24, 24, 4, 0x333333, 0.8).setDepth(6);
    const hpBar = this.add.rectangle(x, y - 24, 24, 4, 0xe74c3c, 1).setDepth(7);
    mob.hpBarBg = hpBarBg;
    mob.hpBar = hpBar;
    
    this.physics.add.collider(mob, this.obstacles);
    this.physics.add.overlap(this.player, mob, () => this.handlePlayerHit(mob), null, this);
    this.mobs.push(mob);
  }
  
  createDungeonEntrances() {
    // Create dungeon entrances at various locations
    const dungeonLocations = [
      { x: 25, y: 25, name: 'Forgotten Crypt', level: 1 },
      { x: WORLD_SIZE - 25, y: 25, name: 'Desert Ruins', level: 2 },
      { x: 25, y: WORLD_SIZE - 25, name: 'Deep Caves', level: 3 },
      { x: WORLD_SIZE - 25, y: WORLD_SIZE - 25, name: 'Titan\'s Rest', level: 5 },
    ];
    
    dungeonLocations.forEach((dungeon) => {
      const px = dungeon.x * TILE;
      const py = dungeon.y * TILE;
      
      const graphics = this.add.graphics();
      graphics.setDepth(3);
      
      // Dungeon entrance visual
      graphics.fillStyle(0x1a1a2e, 1);
      graphics.fillRect(px - 20, py - 16, 40, 32);
      graphics.fillStyle(0x0d0d1a, 1);
      graphics.fillRect(px - 12, py - 8, 24, 24);
      
      // Arch
      graphics.lineStyle(3, 0x4a4a6a);
      graphics.strokeRect(px - 20, py - 16, 40, 32);
      
      // Torches
      graphics.fillStyle(0xff6b35, 0.8);
      graphics.fillCircle(px - 18, py - 12, 4);
      graphics.fillCircle(px + 18, py - 12, 4);
      
      // Label
      const label = this.add.text(px, py - 28, `${dungeon.name}\nLv.${dungeon.level}`, {
        fontSize: '9px',
        color: '#ff7c52',
        align: 'center',
      }).setOrigin(0.5).setDepth(10);
      
      // Interaction zone
      const zone = this.add.rectangle(px, py, 48, 40, 0x000000, 0);
      this.physics.add.existing(zone, true);
      
      this.dungeonEntrances.push({
        ...dungeon,
        x: px,
        y: py,
        graphics,
        label,
        zone,
      });
    });
  }
  
  createMinimap() {
    const minimapSize = 150;
    const minimapX = this.cameras.main.width - minimapSize - 20;
    const minimapY = 20;
    
    // Minimap background
    const minimapBg = this.add.rectangle(minimapX + minimapSize/2, minimapY + minimapSize/2, 
      minimapSize + 4, minimapSize + 4, 0x0a0c16, 0.9);
    minimapBg.setScrollFactor(0);
    minimapBg.setDepth(100);
    minimapBg.setStrokeStyle(2, 0x7af5d7, 0.8);
    
    // Minimap camera
    this.minimapCam = this.cameras.add(minimapX, minimapY, minimapSize, minimapSize);
    this.minimapCam.setZoom(minimapSize / (WORLD_SIZE * TILE));
    this.minimapCam.startFollow(this.player);
    this.minimapCam.setBackgroundColor(0x0a0c16);
    
    // Hide UI elements from minimap
    this.minimapCam.ignore([minimapBg]);
  }
  
  createParticleSystems() {
    // Attack hit particles will be created on demand
  }

  initInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      C: Phaser.Input.Keyboard.KeyCodes.C,
      I: Phaser.Input.Keyboard.KeyCodes.I,
      P: Phaser.Input.Keyboard.KeyCodes.P,
      H: Phaser.Input.Keyboard.KeyCodes.H,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    
    this.keys.I.on('down', () => renderInventoryPanel());
    this.keys.C.on('down', () => this.tryCraft());
    this.keys.E.on('down', () => this.tryInteract());
    this.keys.P.on('down', () => this.tryPlaceOnPlot());
    this.keys.SPACE.on('down', () => this.doAttack());
    this.keys.H.on('down', () => this.useHealingPotion());
    
    // Close panel on click outside
    this.input.on('pointerdown', () => {
      renderPanel('');
    });
  }

  update(_, delta) {
    this.updatePlayerMovement(delta);
    this.updateMobs(delta);
    this.updateCrafting(delta);
    this.tickFarming();
    this.updateUI();
    this.checkDungeonInteraction();
    
    // Update player shadow
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 18);
    }
  }
  
  updateUI() {
    // Update mob HP bars
    this.mobs.forEach((mob) => {
      if (!mob.active) return;
      const hp = mob.data.get('hp');
      const maxHp = mob.data.get('maxHp');
      const hpPercent = hp / maxHp;
      
      mob.hpBarBg.setPosition(mob.x, mob.y - 28);
      mob.hpBar.setPosition(mob.x - 12 + (12 * hpPercent), mob.y - 28);
      mob.hpBar.setSize(24 * hpPercent, 4);
      
      // Color based on HP
      if (hpPercent > 0.6) {
        mob.hpBar.setFillStyle(0x2ecc71);
      } else if (hpPercent > 0.3) {
        mob.hpBar.setFillStyle(0xf39c12);
      } else {
        mob.hpBar.setFillStyle(0xe74c3c);
      }
    });
  }

  updatePlayerMovement(delta) {
    const speed = 140;
    const velocity = new Phaser.Math.Vector2(0, 0);
    
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      velocity.x = -1;
      this.player.direction = 'left';
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      velocity.x = 1;
      this.player.direction = 'right';
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      velocity.y = -1;
      this.player.direction = 'up';
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      velocity.y = 1;
      this.player.direction = 'down';
    }
    
    velocity.normalize().scale(speed);
    this.player.setVelocity(velocity.x, velocity.y);
    
    if (velocity.lengthSq() > 0) {
      const anim = this.player.direction === 'up' ? 'player-run-up' : 
                   this.player.direction === 'down' ? 'player-run-down' : 'player-run-side';
      this.player.play(anim, true);
      this.player.setFlipX(this.player.direction === 'left');
    } else {
      this.player.stop();
    }
  }

  doAttack() {
    const now = this.time.now;
    if (now - (this.player.lastAttack || 0) < 400) return;
    this.player.lastAttack = now;
    
    const anim = this.player.direction === 'up' ? 'player-attack-up' : 
                 this.player.direction === 'down' ? 'player-attack-down' : 'player-attack-side';
    this.player.play(anim, true);
    
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.player.play('player-run-down');
    });
    
    // Attack range
    const radius = 52;
    const attackAngle = this.getDirectionAngle();
    
    // Create attack effect
    const attackEffect = this.add.graphics();
    attackEffect.setDepth(6);
    attackEffect.fillStyle(0xffffff, 0.3);
    attackEffect.slice(
      this.player.x + Math.cos(attackAngle) * 20,
      this.player.y + Math.sin(attackAngle) * 20,
      30, attackAngle - 0.5, attackAngle + 0.5, false
    );
    attackEffect.fillPath();
    this.time.delayedCall(150, () => attackEffect.destroy());
    
    // Damage mobs in range
    this.mobs.forEach((mob) => {
      if (!mob.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
      if (dist <= radius) {
        const angleTo = Math.atan2(mob.y - this.player.y, mob.x - this.player.x);
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleTo - attackAngle));
        
        if (angleDiff < 0.8) {
          const weaponDmg = playerState.equipped.weapon ? 
            Math.max(...(items[playerState.equipped.weapon].dmg || [0])) : 6;
          const dmg = weaponDmg + Phaser.Math.Between(0, 3);
        this.damageMob(mob, dmg);
          
          // Damage number
          const txt = this.add.text(mob.x, mob.y - 24, `-${dmg}`, { 
            fontSize: '12px', 
            color: '#ff7171',
            fontFamily: 'Space Grotesk',
            fontStyle: 'bold',
          }).setDepth(10).setOrigin(0.5);
          
          this.tweens.add({
            targets: txt,
            y: mob.y - 44,
            alpha: 0,
            duration: 600,
            onComplete: () => txt.destroy(),
          });
        }
      }
    });
    
    // Gather resources
    this.resources.forEach((resource, index) => {
      if (resource.respawnTime > 0) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, resource.x, resource.y);
      if (dist <= radius) {
        const qty = Phaser.Math.Between(1, 3);
        addItem(resource.type, qty);
        logEvent(`Gathered ${items[resource.type]?.name || resource.type} x${qty}`);
        
        // Hide resource temporarily
        resource.graphics.setAlpha(0);
        resource.hitbox.setActive(false);
        resource.respawnTime = this.time.now + 30000;
        
        // Respawn after delay
        this.time.delayedCall(30000, () => {
          resource.graphics.setAlpha(1);
          resource.hitbox.setActive(true);
          resource.respawnTime = 0;
        });
      }
    });
  }
  
  getDirectionAngle() {
    switch (this.player.direction) {
      case 'up': return -Math.PI / 2;
      case 'down': return Math.PI / 2;
      case 'left': return Math.PI;
      case 'right': return 0;
      default: return Math.PI / 2;
    }
  }

  damageMob(mob, amount) {
    const hp = mob.data.get('hp') - amount;
    if (hp <= 0) {
      this.killMob(mob);
    } else {
      mob.data.set('hp', hp);
      mob.setTintFill(0xffffff);
      this.time.delayedCall(80, () => {
        if (mob.data.get('elite')) {
          mob.setTint(mobTypes[mob.data.get('type')].tint || 0xffffff);
        } else {
          mob.clearTint();
        }
      });
      
      // Knockback
      const angle = Math.atan2(mob.y - this.player.y, mob.x - this.player.x);
      mob.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);
    }
  }

  killMob(mob) {
    mob.disableBody(true, true);
    mob.hpBar.destroy();
    mob.hpBarBg.destroy();
    
    const type = mob.data.get('type');
    const data = mobTypes[type];
    logEvent(`${data.name} defeated! +${data.xp} XP`);
    this.dropLoot(data.drops, mob.x, mob.y);
    playerState.xp += data.xp;
    
    // Check level up
    const xpNeeded = playerState.level * 50;
    if (playerState.xp >= xpNeeded) {
      playerState.level++;
      playerState.xp -= xpNeeded;
      playerState.maxHp += 10;
      playerState.hp = playerState.maxHp;
      playerState.maxStamina += 5;
      logEvent(`Level up! Now level ${playerState.level}`);
    }
    
    updateHUD();
    
    // Death effect
    const deathEffect = this.add.graphics();
    deathEffect.fillStyle(0xff4444, 0.6);
    deathEffect.fillCircle(mob.x, mob.y, 20);
    this.tweens.add({
      targets: deathEffect,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 300,
      onComplete: () => deathEffect.destroy(),
    });
    
    // Respawn mob after delay
    this.time.delayedCall(15000, () => {
      const x = Phaser.Math.Between(15, WORLD_SIZE - 15) * TILE;
      const y = Phaser.Math.Between(15, WORLD_SIZE - 15) * TILE;
      this.spawnMob(type, x, y);
    });
  }

  dropLoot(drops, x, y) {
    drops.forEach((drop) => {
      if (Math.random() <= drop.chance) {
        const qty = Phaser.Math.Between(drop.q[0], drop.q[1]);
        addItem(drop.id, qty);
        logEvent(`Looted ${items[drop.id]?.name || drop.id} x${qty}`);
        
        // Visual loot drop
        const lootText = this.add.text(x + Phaser.Math.Between(-10, 10), y, 
          `+${qty} ${items[drop.id]?.name || drop.id}`, {
          fontSize: '10px',
          color: '#ffd66b',
        }).setDepth(10).setOrigin(0.5);
        
        this.tweens.add({
          targets: lootText,
          y: y - 30,
          alpha: 0,
          duration: 1000,
          onComplete: () => lootText.destroy(),
        });
      }
    });
  }

  handlePlayerHit(mob) {
    const now = this.time.now;
    if (now < mob.data.get('nextAttack')) return;
    mob.data.set('nextAttack', now + mob.data.get('attackRate'));
    
    const baseDmg = mob.data.get('attack');
    const armorReduction = playerState.equipped.armor ? items[playerState.equipped.armor]?.armor || 0 : 0;
    const dmg = Math.max(1, baseDmg - armorReduction);
    
    playerState.hp = Math.max(0, playerState.hp - dmg);
    updateHUD();
    logEvent(`Hit for ${dmg} damage!`);
    
    // Screen shake
    this.cameras.main.shake(100, 0.01);
    
    // Flash red
    this.player.setTintFill(0xff0000);
    this.time.delayedCall(100, () => this.player.clearTint());
    
    if (playerState.hp <= 0) {
      this.handlePlayerDeath();
    }
  }
  
  handlePlayerDeath() {
      this.player.setTint(0xff0000);
      this.player.setVelocity(0, 0);
    logEvent('You have fallen...');
    
    this.time.delayedCall(1500, () => {
      playerState.hp = Math.floor(playerState.maxHp * 0.5);
      playerState.coins = Math.max(0, playerState.coins - 20);
        this.player.clearTint();
        this.player.setPosition((WORLD_SIZE / 2) * TILE, (WORLD_SIZE / 2) * TILE);
        updateHUD();
      logEvent('You respawned in the village. Lost 20 coins.');
      });
  }

  updateMobs(delta) {
    const now = this.time.now;
    
    this.mobs.forEach((mob) => {
      if (!mob.active) return;
      
      const data = mobTypes[mob.data.get('type')];
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
      
      // Map sprite types to animation keys
      const spriteToRun = {
        'orc': 'orc-run',
        'skeleton': 'skeleton-run',
        'bat': 'bat-move',
      };
      const spriteToIdle = {
        'orc': 'orc-idle',
        'skeleton': 'skeleton-idle',
        'bat': 'bat-idle',
      };

      if (dist < data.aggroRange) {
        // Chase player
        mob.data.set('state', 'chase');
        const dir = new Phaser.Math.Vector2(this.player.x - mob.x, this.player.y - mob.y).normalize();
        mob.setVelocity(dir.x * data.speed, dir.y * data.speed);

        const runAnim = spriteToRun[data.sprite] || 'orc-run';
        if (this.anims.exists(runAnim)) {
          mob.play(runAnim, true);
        }
        mob.setFlipX(dir.x < 0);

      } else {
        // Wander
        mob.data.set('state', 'idle');

        if (now - mob.data.get('lastWander') > 2500) {
          mob.data.set('lastWander', now);
          const newDir = new Phaser.Math.Vector2(
            Phaser.Math.FloatBetween(-1, 1),
            Phaser.Math.FloatBetween(-1, 1)
          ).normalize();
          mob.data.set('wanderDir', newDir);
        }

        const dir = mob.data.get('wanderDir');
        const wanderSpeed = data.speed * 0.3;
        mob.setVelocity(dir.x * wanderSpeed, dir.y * wanderSpeed);

        const idleAnim = spriteToIdle[data.sprite] || 'orc-idle';
        if (this.anims.exists(idleAnim)) {
          mob.play(idleAnim, true);
        }
        mob.setFlipX(dir.x < 0);
      }
    });
  }
  
  useHealingPotion() {
    if (!playerState.inventory.healing_potion || playerState.inventory.healing_potion <= 0) {
      logEvent('No healing potions!');
      return;
    }
    
    if (playerState.hp >= playerState.maxHp) {
      logEvent('Already at full health.');
      return;
    }
    
    spendItems([{ id: 'healing_potion', q: 1 }]);
    const healAmount = items.healing_potion.heal;
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + healAmount);
    logEvent(`Used Healing Draught. +${healAmount} HP`);
    updateHUD();
    
    // Heal effect
    const healEffect = this.add.graphics();
    healEffect.fillStyle(0x2ecc71, 0.4);
    healEffect.fillCircle(this.player.x, this.player.y, 30);
    this.tweens.add({
      targets: healEffect,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      onComplete: () => healEffect.destroy(),
    });
  }

  tryCraft() {
    const station = this.findNearbyStation();
    if (!station) {
      renderPanel('<h2>No Station Nearby</h2><section>Stand near a forge, tanner, or alchemist to craft.</section>');
      return;
    }
    
    const available = recipes.filter((r) => r.station === station.type);
    const buttons = available.map((r) => {
        const can = hasItems(r.in);
        const cost = r.in.map((i) => `${items[i.id]?.name || i.id} x${i.q}`).join(', ');
      return `<button data-id="${r.id}" ${can ? '' : 'disabled'} 
        style="margin-bottom:8px;width:100%;padding:8px;border-radius:6px;
        background:${can ? 'rgba(122,245,215,0.2)' : 'rgba(255,255,255,0.05)'};
        color:${can ? '#7af5d7' : '#666'};border:1px solid ${can ? 'rgba(122,245,215,0.5)' : 'rgba(255,255,255,0.1)'};
        cursor:${can ? 'pointer' : 'not-allowed'};">
        <strong>${items[r.out.id].name}</strong><br>
        <small style="opacity:0.7">${cost} · ${r.time}s</small>
      </button>`;
    }).join('');
    
    renderPanel(`
      <h2>${station.label || station.type}</h2>
      <section>${buttons || 'No recipes available for this station.'}</section>
      <section class="keybinds">Click a recipe to start crafting.</section>
    `);
    
    document.querySelectorAll('#panel button[data-id]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const recipe = recipes.find((r) => r.id === btn.dataset.id);
        if (!recipe) return;
        if (this.craftingTask) return logEvent('Already crafting.');
        if (!hasItems(recipe.in)) return logEvent('Missing ingredients.');
        
        spendItems(recipe.in);
        this.craftingTask = {
          recipe,
          station,
          doneAt: this.time.now + recipe.time * 1000,
        };
        renderPanel('');
        logEvent(`Crafting ${items[recipe.out.id].name}... (${recipe.time}s)`);
        updateHUD(`Crafting: ${items[recipe.out.id].name}`);
      };
    });
  }

  updateCrafting() {
    if (!this.craftingTask) return;
    
    const remaining = Math.ceil((this.craftingTask.doneAt - this.time.now) / 1000);
    if (remaining > 0) {
      updateHUD(`Crafting: ${items[this.craftingTask.recipe.out.id].name} (${remaining}s)`);
    }
    
    if (this.time.now >= this.craftingTask.doneAt) {
      const { recipe, station } = this.craftingTask;
      addItem(recipe.out.id, recipe.out.q);
      logEvent(`${items[recipe.out.id].name} crafted!`);
      this.craftingTask = null;
      updateHUD();
    }
  }

  tryInteract() {
    // Check for dungeon interaction first
    if (this.checkDungeonInteraction(true)) return;
    
    // Check for plot purchase
    if (this.handlePlotInteraction()) return;
    
    // Check for farming
    if (this.handleFarmInteraction()) return;
    
    // Check for NPC interaction
    if (this.handleNPCInteraction()) return;
    
    // Default to crafting
    this.tryCraft();
  }
  
  handleNPCInteraction() {
    const nearNPC = this.npcs.find((npc) => 
      Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 50
    );
    
    if (!nearNPC) return false;
    
    let content = '';
    
    if (nearNPC.type === 'merchant') {
      content = `
        <h2>${nearNPC.name}</h2>
        <section>"Welcome, traveler! Looking to trade?"</section>
        <section>
          <button onclick="window.buyItem('healing_potion', 25)">Healing Draught - 25g</button>
          <button onclick="window.buyItem('sunroot_seed', 10)">Sunroot Seed - 10g</button>
          <button onclick="window.sellAll()">Sell All Loot</button>
        </section>
      `;
    } else if (nearNPC.type === 'blacksmith') {
      content = `
        <h2>${nearNPC.name}</h2>
        <section>"The forge burns eternal. What do you need crafted?"</section>
        <section class="keybinds">Press C to open crafting menu while near the forge.</section>
      `;
    } else if (nearNPC.type === 'alchemist') {
      content = `
        <h2>${nearNPC.name}</h2>
        <section>"The secrets of transformation await those who seek them."</section>
        <section class="keybinds">Bring Sunroot Bulbs to create potions.</section>
      `;
    }
    
    renderPanel(content);
    return true;
  }
  
  checkDungeonInteraction(interact = false) {
    const nearDungeon = this.dungeonEntrances.find((d) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y) < 40
    );
    
    if (!nearDungeon) return false;
    
    if (interact) {
      renderPanel(`
        <h2>${nearDungeon.name}</h2>
        <section>A dark entrance leads into the depths...</section>
        <section>Recommended Level: ${nearDungeon.level}</section>
        <section class="keybinds">Dungeons coming soon! Prepare your gear.</section>
      `);
      return true;
    }
    
    return false;
  }

  findNearbyStation() {
    const plotStation = this.tryCraftingWithPlot();
    if (plotStation) return plotStation;
    
    const near = this.stations.find((s) => 
      Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y) < 50
    );
    return near || null;
  }

  handlePlotInteraction() {
    const plot = this.plots.find((p) => 
      Phaser.Math.Distance.Between(this.player.x, this.player.y, p.tile.x * TILE, p.tile.y * TILE) < 40
    );
    
    if (!plot) return false;
    
    if (plot.owner === 'you') {
      logEvent(`You own ${plot.id}. Press P to place a structure.`);
      return true;
    }
    
    if (plot.owner) {
      logEvent(`${plot.id} is already claimed.`);
      return true;
    }
    
    if (playerState.coins < plot.price) {
      logEvent(`Need ${plot.price} coins to buy ${plot.id}. You have ${playerState.coins}.`);
      return true;
    }
    
    playerState.coins -= plot.price;
    plot.owner = 'you';
    playerState.plots.push(plot.id);
    plot.sprite.setFillStyle(0x2f7f5f, 0.6);
    plot.label.setColor('#2ecc71');
    plot.label.setText(`${plot.id}\nOWNED`);
    logEvent(`Purchased ${plot.id}! Press P to build.`);
    updateHUD();
    return true;
  }

  tryPlaceOnPlot() {
    const plot = this.plots.find((p) => 
      p.owner === 'you' && 
      Phaser.Math.Distance.Between(this.player.x, this.player.y, p.tile.x * TILE, p.tile.y * TILE) < 40
    );
    
    if (!plot) {
      logEvent('Stand on your plot to build.');
      return;
    }
    
    if (plot.structure) {
      logEvent(`${plot.id} already has a ${plot.structure}.`);
      return;
    }
    
    const buildables = [
      { key: 'forge_station', station: 'forge', label: 'Forge' },
      { key: 'tanner_station', station: 'tanner', label: 'Tanner' },
    ];
    
    const choice = buildables.find((b) => playerState.inventory[b.key] > 0);
    
    if (!choice) {
      logEvent('Craft a Forge Frame or Tanner Rack first.');
      return;
    }
    
    spendItems([{ id: choice.key, q: 1 }]);
    plot.structure = choice.station;
    
    this.addStation({ 
      x: plot.tile.x * TILE, 
      y: plot.tile.y * TILE, 
      type: choice.station, 
      label: `${plot.id} ${choice.label}` 
    });
    
    logEvent(`${choice.label} built on ${plot.id}!`);
    updateHUD();
  }

  handleFarmInteraction() {
    const patch = this.farmland.find((f) => 
      Phaser.Math.Distance.Between(this.player.x, this.player.y, f.tile.x * TILE, f.tile.y * TILE) < 24
    );
    
    if (!patch) return false;
    
    if (!patch.seed) {
      if ((playerState.inventory.sunroot_seed || 0) <= 0) {
        logEvent('Need a Sunroot Seed to plant.');
        return true;
      }
      spendItems([{ id: 'sunroot_seed', q: 1 }]);
      patch.seed = 'sunroot_seed';
      patch.plantedAt = this.time.now;
      patch.ready = false;
      patch.sprite.setFillStyle(0x4a6f3c, 0.9);
      logEvent('Planted Sunroot! Ready in ~12 seconds.');
      return true;
    }
    
    if (patch.ready) {
      const qty = Phaser.Math.Between(2, 4);
      addItem('sunroot_crop', qty);
      patch.seed = null;
      patch.ready = false;
      patch.sprite.setFillStyle(0x5a3f23, 0.8);
      logEvent(`Harvested Sunroot Bulb x${qty}!`);
      updateHUD();
      return true;
    }
    
    const elapsed = Math.floor((this.time.now - patch.plantedAt) / 1000);
    logEvent(`Growing... ${elapsed}/12 seconds`);
    return true;
  }

  tickFarming() {
    this.farmland.forEach((patch) => {
      if (patch.seed && !patch.ready && this.time.now - patch.plantedAt > 12000) {
        patch.ready = true;
        patch.sprite.setFillStyle(0x7abf58, 1);
        logEvent('A crop is ready to harvest!');
      }
    });
  }

  tryCraftingWithPlot() {
    const plot = this.plots.find((p) => 
      p.owner === 'you' && 
      Phaser.Math.Distance.Between(this.player.x, this.player.y, p.tile.x * TILE, p.tile.y * TILE) < 40
    );
    
    if (plot && plot.structure) {
      return { 
        type: plot.structure, 
        label: `${plot.id} ${plot.structure}`, 
        x: plot.tile.x * TILE, 
        y: plot.tile.y * TILE 
      };
    }
    return null;
  }

  addStation(station) {
    const graphics = this.add.graphics();
    graphics.setDepth(3);
    
    // Station colors
    const colors = {
      forge: { fill: 0xd35400, stroke: 0xff6b35 },
      tanner: { fill: 0x8b4513, stroke: 0xcd853f },
      alchemist: { fill: 0x27ae60, stroke: 0x2ecc71 },
    };
    
    const color = colors[station.type] || colors.forge;
    
    // Draw station
    graphics.fillStyle(color.fill, 0.9);
    graphics.fillRect(station.x - 16, station.y - 12, 32, 24);
    graphics.lineStyle(2, color.stroke, 1);
    graphics.strokeRect(station.x - 16, station.y - 12, 32, 24);
    
    // Icon
    graphics.fillStyle(0xffffff, 0.3);
    if (station.type === 'forge') {
      graphics.fillTriangle(station.x, station.y - 8, station.x - 6, station.y + 4, station.x + 6, station.y + 4);
    } else if (station.type === 'alchemist') {
      graphics.fillCircle(station.x, station.y, 6);
    } else {
      graphics.fillRect(station.x - 6, station.y - 4, 12, 8);
    }
    
    const label = this.add.text(station.x, station.y - 22, station.label || station.type, {
      fontSize: '9px',
      color: '#ffd66b',
      fontFamily: 'Space Grotesk',
    }).setOrigin(0.5).setDepth(10);
    
    const full = { ...station, graphics, labelText: label };
    this.stations.push(full);
    return full;
  }
}

// Global functions for NPC shop
window.buyItem = (itemId, cost) => {
  if (playerState.coins < cost) {
    logEvent(`Not enough coins. Need ${cost}g.`);
    return;
  }
  playerState.coins -= cost;
  addItem(itemId, 1);
  logEvent(`Bought ${items[itemId]?.name || itemId} for ${cost}g.`);
  updateHUD();
};

window.sellAll = () => {
  const sellable = ['bone', 'leather', 'iron_ore', 'coal'];
  let total = 0;
  
  sellable.forEach((id) => {
    const qty = playerState.inventory[id] || 0;
    if (qty > 0) {
      const value = (items[id]?.value || 1) * qty;
      total += value;
      delete playerState.inventory[id];
    }
  });
  
  if (total > 0) {
    playerState.coins += total;
    logEvent(`Sold loot for ${total}g!`);
    updateHUD();
  } else {
    logEvent('Nothing to sell.');
  }
};

const config = {
  type: Phaser.CANVAS, // Use CANVAS for better compatibility
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-root',
  backgroundColor: '#0a0c16',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, MainScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

updateHUD();
renderLog();
