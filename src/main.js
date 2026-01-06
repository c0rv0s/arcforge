import { items } from './data/items.js';
import { recipes } from './data/recipes.js';
import { mobTypes, biomeSpawns } from './data/mobs.js';
import { plotConfig } from './data/plots.js';
import { biomes } from './data/biomes.js';
import { assetConfig, biomeColors } from './data/assets.js';
import { shops, villageLayout, getSellPrice } from './data/shops.js';

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

// Tile and world configuration
const TILE = 32; // Display tile size
const WORLD_SIZE = 256; // tiles per side (can be much larger with chunks)
const VILLAGE_CENTER = { x: 128, y: 128 }; // Center of world
const VILLAGE_RADIUS = 20; // Safe zone radius in tiles
const PLAYER_SCALE = 1.0;
const MOB_SCALE = 1.0;
const LOG_LIMIT = 6;

// Chunk-based loading system for performance
const CHUNK_SIZE = 16; // tiles per chunk side
const RENDER_DISTANCE = 3; // chunks to load in each direction
const MOBS_PER_CHUNK = 2; // max mobs spawned per chunk

// Directional biome determination based on angle from village center
function getDirectionalBiome(tileX, tileY) {
  const dx = tileX - VILLAGE_CENTER.x;
  const dy = tileY - VILLAGE_CENTER.y;
  const distFromCenter = Math.hypot(dx, dy);

  // Village safe zone
  if (distFromCenter < VILLAGE_RADIUS) return 'village';
  if (distFromCenter < VILLAGE_RADIUS + 5) return 'meadow'; // Village outskirts

  // Calculate angle (0 = East, PI/2 = South, PI = West, -PI/2 = North)
  const angle = Math.atan2(dy, dx);
  // Normalize to 0-1 range where 0 = East going clockwise
  const normalizedAngle = ((angle + Math.PI) / (2 * Math.PI) + 0.25) % 1;

  // Corner detection for cave/forge biomes (corners of the map)
  const cornerDist = Math.min(
    Math.hypot(tileX, tileY),
    Math.hypot(tileX - WORLD_SIZE, tileY),
    Math.hypot(tileX, tileY - WORLD_SIZE),
    Math.hypot(tileX - WORLD_SIZE, tileY - WORLD_SIZE)
  );
  if (cornerDist < 50) {
    // NW and SE corners are caves, NE and SW are forge
    if ((tileX < WORLD_SIZE / 2 && tileY < WORLD_SIZE / 2) ||
        (tileX > WORLD_SIZE / 2 && tileY > WORLD_SIZE / 2)) {
      return 'cave';
    }
    return 'forge';
  }

  // Cardinal directions (with some blending at edges)
  // North: Forest (Elves) - angles around 0 (top)
  // East: Desert (Mummies) - angles around 0.25
  // South: Cemetery (Zombies) - angles around 0.5
  // West: Sewer (Rats) - angles around 0.75

  if (normalizedAngle < 0.125 || normalizedAngle >= 0.875) {
    return 'forest'; // North
  } else if (normalizedAngle < 0.375) {
    return 'desert'; // East
  } else if (normalizedAngle < 0.625) {
    return 'cemetery'; // South
  } else {
    return 'sewer'; // West
  }
}

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

// Note: biomeColors is now imported from assets.js

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  preload() {
    // Create DOM-based loading screen (crisp text)
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-screen';
    loadingDiv.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#080a10;z-index:1000;font-family:'Cinzel',serif;">
        <div style="color:#ffd66b;font-size:24px;margin-bottom:20px;letter-spacing:2px;">LOADING ARCFORGE</div>
        <div style="width:320px;height:12px;background:rgba(255,255,255,0.1);border-radius:6px;overflow:hidden;margin-bottom:12px;">
          <div id="load-progress" style="width:0%;height:100%;background:linear-gradient(90deg,#7af5d7,#3ba7f8);transition:width 0.1s;"></div>
        </div>
        <div id="load-status" style="color:#6a7a8a;font-size:13px;font-family:'Crimson Text',serif;">Initializing...</div>
        <div id="load-count" style="color:#4a5a6a;font-size:11px;margin-top:6px;font-family:'Crimson Text',serif;">0 / 0</div>
      </div>
    `;
    document.body.appendChild(loadingDiv);

    const progressEl = document.getElementById('load-progress');
    const statusEl = document.getElementById('load-status');
    const countEl = document.getElementById('load-count');

    this.load.on('progress', (value) => {
      progressEl.style.width = `${value * 100}%`;
    });

    this.load.on('fileprogress', (file) => {
      statusEl.textContent = file.key;
      const loaded = this.load.totalComplete;
      const total = this.load.totalToLoad;
      countEl.textContent = `${loaded} / ${total}`;
    });

    this.load.on('loaderror', (file) => {
      console.error(`[Arcforge] Failed to load: ${file.src}`);
      statusEl.textContent = `Error: ${file.key}`;
      statusEl.style.color = '#ff6b6b';
    });

    this.load.on('complete', () => {
      loadingDiv.remove();
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

    // Load all biome-specific enemy sprites from Pixel Crawler packs
    this.loadBiomeEnemies();

    // Load NPC sprites
    this.loadNPCSprites();

    // Load environment assets (buildings, props, stations)
    this.loadEnvironmentAssets();
  }

  loadEnvironmentAssets() {
    const envBase = 'assets/Pixel Crawler - Free Pack/Environment';

    // Station sprites
    this.load.image('station-furnace', `${envBase}/Structures/Stations/Furnace/Furnace.png`);
    this.load.image('station-anvil', `${envBase}/Structures/Stations/Anvil/Anvil.png`);
    this.load.image('station-workbench', `${envBase}/Structures/Stations/Workbench/Workbench.png`);

    // Trees - multiple models and sizes for variety
    this.load.image('tree-1-small', `${envBase}/Props/Static/Trees/Model_01/Size_02.png`);
    this.load.image('tree-1-medium', `${envBase}/Props/Static/Trees/Model_01/Size_03.png`);
    this.load.image('tree-1-large', `${envBase}/Props/Static/Trees/Model_01/Size_04.png`);
    this.load.image('tree-2-small', `${envBase}/Props/Static/Trees/Model_02/Size_02.png`);
    this.load.image('tree-2-medium', `${envBase}/Props/Static/Trees/Model_02/Size_03.png`);
    this.load.image('tree-3-small', `${envBase}/Props/Static/Trees/Model_03/Size_02.png`);

    // General props (spritesheet format - 16x16 frames)
    this.load.spritesheet('props-vegetation', `${envBase}/Props/Static/Vegetation.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-rocks', `${envBase}/Props/Static/Rocks.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-farm', `${envBase}/Props/Static/Farm.png`, { frameWidth: 16, frameHeight: 16 });

    // Biome-specific props (spritesheet format - 16x16 frames)
    this.load.spritesheet('props-desert', 'assets/Pixel Crawler - Desert/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-forest', 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-cemetery', 'assets/Pixel Crawler - Cemetery/Environment/Props/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-sewer', 'assets/Pixel Crawler - Sewer/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-cave', 'assets/Pixel Crawler - Cave/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });

    // Cemetery graves and forest tree
    this.load.spritesheet('props-graves', 'assets/Pixel Crawler - Cemetery/Environment/Props/Graves.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('tree-forest', 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tree.png');
    this.load.image('tree-cemetery', 'assets/Pixel Crawler - Cemetery/Environment/Props/Tree.png');
  }

  loadBiomeEnemies() {
    // Only load base enemy type per biome for faster loading
    // Variants use the same base sprite with tint

    // Forest - Elf Base
    const elfBase = 'assets/Pixel Crawler - Fairy Forest 1.7/Enemies';
    this.load.spritesheet('elf_base-idle', `${elfBase}/Elf - Base/Idle/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('elf_base-run', `${elfBase}/Elf - Base/Run/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });

    // Desert - Mummy Base
    const mummyBase = 'assets/Pixel Crawler - Desert/Enemy';
    this.load.spritesheet('mummy_base-idle', `${mummyBase}/Mummy - Base/Idle/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('mummy_base-run', `${mummyBase}/Mummy - Base/Run/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });

    // Cemetery - Zombie Base
    const zombieBase = 'assets/Pixel Crawler - Cemetery/Entities/Mobs';
    this.load.spritesheet('zombie_base-idle', `${zombieBase}/Zombie - Base/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('zombie_base-run', `${zombieBase}/Zombie - Base/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });

    // Sewer - Rat Base
    const ratBase = 'assets/Pixel Crawler - Sewer/Enemy';
    this.load.spritesheet('rat_base-idle', `${ratBase}/Rat - Base/Idle/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('rat_base-run', `${ratBase}/Rat - Base/Run/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });

    // Cave - Fungus Immature
    const fungusBase = 'assets/Pixel Crawler - Cave/Enemies';
    this.load.spritesheet('fungus_immature-idle', `${fungusBase}/Immature Fungus/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('fungus_immature-run', `${fungusBase}/Immature Fungus/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });

    // Forge - Stone Base
    const stoneBase = 'assets/Pixel Crawler - Forge/Enemy';
    this.load.spritesheet('stone_base-idle', `${stoneBase}/Stone - Base/Idle/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('stone_base-run', `${stoneBase}/Stone - Base/Run/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
  }

  loadNPCSprites() {
    const npcBase = "assets/Pixel Crawler - Free Pack/Entities/Npc's";
    this.load.spritesheet('npc-knight-idle', `${npcBase}/Knight/Idle/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc-knight-run', `${npcBase}/Knight/Run/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc-wizard-idle', `${npcBase}/Wizzard/Idle/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc-wizard-run', `${npcBase}/Wizzard/Run/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc-rogue-idle', `${npcBase}/Rogue/Idle/Idle-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc-rogue-run', `${npcBase}/Rogue/Run/Run-Sheet.png`, { frameWidth: 64, frameHeight: 64 });
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

    // Create animations for all biome-specific enemies
    this.createBiomeEnemyAnimations();

    // Create NPC animations
    this.createNPCAnimations();
  }

  createBiomeEnemyAnimations() {
    // Helper to create enemy animations if textures exist
    const createEnemyAnim = (key, idleFrames = 4, runFrames = 6) => {
      if (this.textures.exists(`${key}-idle`)) {
        this.anims.create({
          key: `${key}-idle`,
          frames: this.anims.generateFrameNumbers(`${key}-idle`, { start: 0, end: idleFrames - 1 }),
          frameRate: 4,
          repeat: -1,
        });
      }
      if (this.textures.exists(`${key}-run`)) {
        this.anims.create({
          key: `${key}-run`,
          frames: this.anims.generateFrameNumbers(`${key}-run`, { start: 0, end: runFrames - 1 }),
          frameRate: 8,
          repeat: -1,
        });
      }
    };

    // Biome enemies (only base types loaded for performance)
    ['elf_base', 'mummy_base', 'zombie_base', 'rat_base', 'fungus_immature', 'stone_base'].forEach(k => createEnemyAnim(k));
  }

  createNPCAnimations() {
    const createNPCAnim = (key) => {
      try {
        const idleKey = `npc-${key}-idle`;
        if (this.textures.exists(idleKey)) {
          const idleFrameCount = this.textures.get(idleKey).frameTotal - 1;
          if (idleFrameCount > 0) {
            this.anims.create({
              key: idleKey,
              frames: this.anims.generateFrameNumbers(idleKey, { start: 0, end: Math.min(3, idleFrameCount - 1) }),
              frameRate: 4,
              repeat: -1,
            });
          }
        }
        const runKey = `npc-${key}-run`;
        if (this.textures.exists(runKey)) {
          const runFrameCount = this.textures.get(runKey).frameTotal - 1;
          if (runFrameCount > 0) {
            this.anims.create({
              key: runKey,
              frames: this.anims.generateFrameNumbers(runKey, { start: 0, end: Math.min(5, runFrameCount - 1) }),
              frameRate: 8,
              repeat: -1,
            });
          }
        }
      } catch (e) {
        console.warn('[Arcforge] Failed to create NPC animation:', key, e);
      }
    };

    ['knight', 'wizard', 'rogue'].forEach(k => createNPCAnim(k));
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

    // Chunk system
    this.chunks = new Map(); // "chunkX,chunkY" -> chunk data
    this.loadedChunks = new Set(); // Currently loaded chunk keys
    this.lastChunkX = null;
    this.lastChunkY = null;
  }

  create() {
    try {
      window.gameScene = this;

      // Initialize chunk system
      this.initChunkSystem();

      // Create player at village center
      this.createPlayer();

      // Load initial chunks around player
      this.updateChunks(true);

      // Create village structures
      this.createVillage();

      // Setup other systems
      this.createPlots();
      this.createFarmland();
      this.createDungeonEntrances();
      this.initInput();

      // Camera
      this.cameras.main.setZoom(1.5);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.cameras.main.setDeadzone(100, 100);
      this.createMinimap();
      this.createParticleSystems();

      updateHUD('Explore the world, seek the village forge.');
      renderLog();
      logEvent('Welcome to Arcforge Shard! Explore and survive.');
    } catch (err) {
      // Show error on screen
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:red;color:white;padding:20px;z-index:9999;font-family:monospace;max-width:80%;';
      errDiv.innerHTML = `<b>Error in create():</b><br>${err.message}<br><br><small>${err.stack}</small>`;
      document.body.appendChild(errDiv);
      console.error('[Arcforge] Create error:', err);
    }
  }

  // ========== CHUNK SYSTEM ==========

  initChunkSystem() {
    const worldWidth = WORLD_SIZE * TILE;
    const worldHeight = WORLD_SIZE * TILE;

    // Set world bounds
    this.physics.world.bounds.width = worldWidth;
    this.physics.world.bounds.height = worldHeight;

    // Create collision groups
    this.obstacles = this.physics.add.staticGroup();
    this.waterBodies = this.physics.add.staticGroup();

    // Terrain data is generated on-demand per chunk
    this.terrainData = [];
  }

  getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
  }

  worldToChunk(worldX, worldY) {
    return {
      x: Math.floor(worldX / (CHUNK_SIZE * TILE)),
      y: Math.floor(worldY / (CHUNK_SIZE * TILE))
    };
  }

  updateChunks(forceUpdate = false) {
    const playerChunk = this.worldToChunk(this.player.x, this.player.y);

    // Only update if player moved to new chunk
    if (!forceUpdate && playerChunk.x === this.lastChunkX && playerChunk.y === this.lastChunkY) {
      return;
    }
    this.lastChunkX = playerChunk.x;
    this.lastChunkY = playerChunk.y;

    // Determine which chunks should be loaded
    const chunksToLoad = new Set();
    for (let dy = -RENDER_DISTANCE; dy <= RENDER_DISTANCE; dy++) {
      for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        const cx = playerChunk.x + dx;
        const cy = playerChunk.y + dy;
        // Clamp to world bounds
        if (cx >= 0 && cy >= 0 && cx < Math.ceil(WORLD_SIZE / CHUNK_SIZE) && cy < Math.ceil(WORLD_SIZE / CHUNK_SIZE)) {
          chunksToLoad.add(this.getChunkKey(cx, cy));
        }
      }
    }

    // Unload chunks that are out of range
    for (const key of this.loadedChunks) {
      if (!chunksToLoad.has(key)) {
        this.unloadChunk(key);
      }
    }

    // Load new chunks
    for (const key of chunksToLoad) {
      if (!this.loadedChunks.has(key)) {
        this.loadChunk(key);
      }
    }
  }

  loadChunk(key) {
    const [cx, cy] = key.split(',').map(Number);
    const startX = cx * CHUNK_SIZE;
    const startY = cy * CHUNK_SIZE;

    // Create graphics for this chunk
    const graphics = this.add.graphics();
    graphics.setDepth(0);

    // Debug: log first chunk load
    if (this.loadedChunks.size === 0) {
      console.log('[Arcforge] Loading first chunk:', key, 'at tile', startX, startY);
    }

    const chunkData = {
      key,
      graphics,
      obstacles: [],
      waterColliders: [],
      mobs: [],
    };

    // Generate terrain for this chunk
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldTileX = startX + tx;
        const worldTileY = startY + ty;

        // Skip if outside world bounds
        if (worldTileX >= WORLD_SIZE || worldTileY >= WORLD_SIZE) continue;

        // Get biome for this tile
        let biome = getDirectionalBiome(worldTileX, worldTileY);

        // Add water features
        const waterNoise = perlinNoise(worldTileX, worldTileY, 2, 0.5, this.worldSeed + 3000);
        if (waterNoise < 0.15 && biome !== 'village' && biome !== 'desert' && biome !== 'forge') {
          biome = 'water';
        }

        const px = worldTileX * TILE;
        const py = worldTileY * TILE;

        // Draw tile
        const colors = biomeColors[biome] || biomeColors.meadow;
        const variation = noise2D(worldTileX, worldTileY, this.worldSeed + 500) * 0.15;

        const baseColor = Phaser.Display.Color.IntegerToColor(colors.ground);
        const r = Math.max(0, Math.min(255, Math.floor(baseColor.red * (1 + variation))));
        const g = Math.max(0, Math.min(255, Math.floor(baseColor.green * (1 + variation))));
        const b = Math.max(0, Math.min(255, Math.floor(baseColor.blue * (1 + variation))));
        const finalColor = Phaser.Display.Color.GetColor(r, g, b);

        graphics.fillStyle(finalColor, 1);
        graphics.fillRect(px, py, TILE, TILE);

        // Store terrain data
        if (!this.terrainData[worldTileY]) this.terrainData[worldTileY] = [];
        this.terrainData[worldTileY][worldTileX] = { biome };

        // Add ground decorations (moderate density - no collision)
        const decorRand = seededRandom(worldTileX * 3000 + worldTileY + this.worldSeed);
        if (biome !== 'water' && decorRand < 0.25) {
          const decor = this.addGroundDecoration(px, py, biome, decorRand);
          if (decor) chunkData.obstacles.push(decor);
        }

        // Create obstacles with collision (trees, rocks)
        if (biome !== 'water' && biome !== 'village') {
          const obstacleChances = { forest: 0.05, cave: 0.03, cemetery: 0.04, sewer: 0.02, forge: 0.03, desert: 0.025, meadow: 0.02 };
          const obstacleRand = seededRandom(worldTileX * 2000 + worldTileY + this.worldSeed);
          if (obstacleRand < (obstacleChances[biome] || 0.015)) {
            const obs = this.createObstacle(px + TILE/2, py + TILE/2, biome);
            if (obs) chunkData.obstacles.push(obs);
          }
        }

        // Water collision
        if (biome === 'water') {
          const waterRect = this.add.rectangle(px + TILE/2, py + TILE/2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(waterRect, true);
          this.waterBodies.add(waterRect);
          chunkData.waterColliders.push(waterRect);
        }
      }
    }

    // Spawn mobs in this chunk (if not village)
    const chunkCenterX = (startX + CHUNK_SIZE/2);
    const chunkCenterY = (startY + CHUNK_SIZE/2);
    const distFromVillage = Math.hypot(chunkCenterX - VILLAGE_CENTER.x, chunkCenterY - VILLAGE_CENTER.y);

    if (distFromVillage > VILLAGE_RADIUS + 5) {
      for (let i = 0; i < MOBS_PER_CHUNK; i++) {
        const mobX = (startX + Math.random() * CHUNK_SIZE) * TILE;
        const mobY = (startY + Math.random() * CHUNK_SIZE) * TILE;
        const mob = this.spawnMobAt(mobX, mobY);
        if (mob) chunkData.mobs.push(mob);
      }
    }

    this.chunks.set(key, chunkData);
    this.loadedChunks.add(key);
  }

  unloadChunk(key) {
    const chunkData = this.chunks.get(key);
    if (!chunkData) return;

    // Destroy terrain graphics
    chunkData.graphics.destroy();

    // Remove obstacles (visual, shadow, and collider)
    chunkData.obstacles.forEach(obs => {
      if (obs) {
        if (obs.visual && obs.visual.destroy) obs.visual.destroy();
        if (obs.shadow && obs.shadow.destroy) obs.shadow.destroy();
        if (obs.collider) {
          this.obstacles.remove(obs.collider, true, true);
        }
      }
    });

    // Remove water colliders
    chunkData.waterColliders.forEach(w => {
      this.waterBodies.remove(w, true, true);
    });

    // Remove mobs
    chunkData.mobs.forEach(mob => {
      if (mob && mob.destroy) {
        const idx = this.mobs.indexOf(mob);
        if (idx > -1) this.mobs.splice(idx, 1);
        mob.destroy();
      }
    });

    this.chunks.delete(key);
    this.loadedChunks.delete(key);
  }

  addGroundDecoration(px, py, biome, rand) {
    // Use simple colored circles/ellipses for ground decoration instead of problematic spritesheets
    const offsetX = (rand * 100) % TILE;
    const offsetY = ((rand * 200) % TILE);

    // Biome-specific decoration colors and types
    const decorColors = {
      meadow: [0x4a7c3f, 0x5a9c4f, 0x3d6b32], // Grass greens
      village: [0x6b5a3a, 0x7a6944], // Dirt patches
      forest: [0x2d5a2d, 0x3d6b3d, 0x1a4a1a], // Dark forest greens
      desert: [0xc4913a, 0xb4814a], // Sand variations
      cemetery: [0x4a4a5a, 0x3a3a4a], // Gray stones
      sewer: [0x3d4a3d, 0x4d5a4d], // Murky greens
      cave: [0x3d3d4d, 0x4d4d5d], // Cave grays
      forge: [0x5a3d3d, 0x6a4d4d], // Reddish rocks
    };

    const colors = decorColors[biome] || decorColors.meadow;
    const color = colors[Math.floor(rand * 100) % colors.length];

    // Small grass tufts or pebbles
    const size = 3 + rand * 4;
    const decoration = this.add.ellipse(px + offsetX, py + offsetY, size, size * 0.6, color, 0.6);
    decoration.setDepth(1);

    return { visual: decoration, shadow: null, collider: null };
  }

  drawBiomeDetail(graphics, biome, px, py, colors, detailRand) {
    // Draw subtle ground texture variations
    if (biome === 'water') {
      graphics.fillStyle(0x3498db, 0.9);
      graphics.fillRect(px, py, TILE, TILE);
      if (detailRand < 0.1) {
        graphics.lineStyle(1, 0x5dade2, 0.4);
        graphics.strokeCircle(px + TILE/2, py + TILE/2, 5);
      }
    }
  }

  spawnMobAt(x, y) {
    // Get biome at position
    const tileX = Math.floor(x / TILE);
    const tileY = Math.floor(y / TILE);
    const biome = getDirectionalBiome(tileX, tileY);

    // Get valid mob types for this biome
    const validTypes = biomeSpawns[biome] || biomeSpawns.meadow || ['orc'];
    const mobType = validTypes[Math.floor(Math.random() * validTypes.length)];
    const data = mobTypes[mobType];
    if (!data) return null;

    // Get sprite key
    const spriteToIdle = {
      'orc': 'orc-idle', 'skeleton': 'skeleton-idle', 'bat': 'bat-idle',
      'golem': 'orc-idle', 'elemental': 'orc-idle', 'wolf': 'orc-idle', 'slime': 'orc-idle', 'dragon': 'orc-idle',
      'elf_base': 'elf_base-idle', 'elf_hunter': 'elf_base-idle', 'elf_druid': 'elf_base-idle', 'elf_ranger': 'elf_base-idle',
      'mummy_base': 'mummy_base-idle', 'mummy_warrior': 'mummy_base-idle', 'mummy_rogue': 'mummy_base-idle', 'mummy_mage': 'mummy_base-idle',
      'zombie_base': 'zombie_base-idle', 'zombie_banshee': 'zombie_base-idle', 'zombie_muscle': 'zombie_base-idle', 'zombie_fat': 'zombie_base-idle',
      'rat_base': 'rat_base-idle', 'rat_warrior': 'rat_base-idle', 'rat_rogue': 'rat_base-idle', 'rat_mage': 'rat_base-idle',
      'fungus_immature': 'fungus_immature-idle', 'fungus_long': 'fungus_immature-idle', 'fungus_heavy': 'fungus_immature-idle', 'fungus_old': 'fungus_immature-idle',
      'stone_base': 'stone_base-idle', 'stone_golem': 'stone_base-idle', 'stone_lava': 'stone_base-idle',
    };
    const spriteKey = spriteToIdle[data.sprite] || 'orc-idle';

    if (!this.textures.exists(spriteKey)) return null;

    const mob = this.physics.add.sprite(x, y, spriteKey);
    mob.setScale(MOB_SCALE);
    mob.setDataEnabled();
    mob.data.set('type', mobType);
    mob.data.set('hp', data.hp);
    mob.data.set('maxHp', data.hp);
    mob.data.set('state', 'idle');
    mob.data.set('lastWander', 0);
    mob.setCollideWorldBounds(true);

    if (this.anims.exists(spriteKey)) mob.play(spriteKey);

    this.mobs.push(mob);
    this.physics.add.collider(mob, this.obstacles);
    this.physics.add.collider(mob, this.waterBodies);

    return mob;
  }

  // ========== END CHUNK SYSTEM ==========
  
  debugLog(msg) {
    console.log('[Arcforge]', msg);
  }
  
  createObstacle(x, y, biome) {
    let visual = null;
    const rand = Math.random();

    let shadow = null;

    if (biome === 'forest' || biome === 'meadow') {
      // Use varied tree sprites - these are large images so scale down appropriately
      const treeOptions = ['tree-1-small', 'tree-1-medium', 'tree-2-small', 'tree-2-medium', 'tree-3-small'];
      const treeKey = treeOptions[Math.floor(rand * treeOptions.length)];
      const scale = 0.35 + rand * 0.15; // Trees at 35-50% scale

      if (this.textures.exists(treeKey)) {
        // Tree shadow
        shadow = this.add.ellipse(x, y + 10, 30, 12, 0x000000, 0.25);
        shadow.setDepth(y - 1);

        visual = this.add.sprite(x, y, treeKey);
        visual.setScale(scale);
        visual.setOrigin(0.5, 0.95); // Anchor at bottom of tree
        visual.setDepth(y);
      }
    } else if (biome === 'desert') {
      // Desert - use rocks/boulders (simple shapes for now)
      const rockSize = 12 + rand * 8;
      shadow = this.add.ellipse(x, y + 4, rockSize, rockSize * 0.4, 0x000000, 0.2);
      shadow.setDepth(y - 1);
      visual = this.add.ellipse(x, y - rockSize/3, rockSize, rockSize * 0.7, 0xb8956a, 1);
      visual.setDepth(y);
    } else if (biome === 'cemetery') {
      // Cemetery - use dead tree if available, otherwise simple gravestones
      if (rand < 0.3 && this.textures.exists('tree-cemetery')) {
        const scale = 0.25 + rand * 0.1;
        shadow = this.add.ellipse(x, y + 8, 25, 10, 0x000000, 0.25);
        shadow.setDepth(y - 1);
        visual = this.add.sprite(x, y, 'tree-cemetery');
        visual.setScale(scale);
        visual.setOrigin(0.5, 0.95);
        visual.setDepth(y);
      } else {
        // Simple gravestone shape
        const height = 16 + rand * 8;
        shadow = this.add.ellipse(x, y + 2, 10, 4, 0x000000, 0.2);
        shadow.setDepth(y - 1);
        visual = this.add.rectangle(x, y - height/2, 8, height, 0x5a5a6a);
        visual.setDepth(y);
      }
    } else if (biome === 'cave' || biome === 'sewer' || biome === 'forge') {
      // Cave/Sewer/Forge - rock formations
      const rockSize = 10 + rand * 10;
      const rockColor = biome === 'forge' ? 0x5a3d3d : 0x4a4a5a;
      shadow = this.add.ellipse(x, y + 3, rockSize, rockSize * 0.3, 0x000000, 0.2);
      shadow.setDepth(y - 1);
      visual = this.add.ellipse(x, y - rockSize/4, rockSize, rockSize * 0.6, rockColor, 1);
      visual.setDepth(y);
    } else if (biome === 'village') {
      // Village - skip obstacles, keep it clear
      return null;
    }

    // Fallback - small rock
    if (!visual) {
      const rockSize = 8 + rand * 6;
      shadow = this.add.ellipse(x, y + 2, rockSize, rockSize * 0.3, 0x000000, 0.2);
      shadow.setDepth(y - 1);
      visual = this.add.ellipse(x, y - rockSize/4, rockSize, rockSize * 0.5, 0x6a6a6a, 1);
      visual.setDepth(y);
    }

    // Add collision
    const collider = this.add.rectangle(x, y + 4, 16, 16, 0x000000, 0);
    this.physics.add.existing(collider, true);
    this.obstacles.add(collider);

    return { visual, shadow, collider };
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
    const centerX = VILLAGE_CENTER.x * TILE;
    const centerY = VILLAGE_CENTER.y * TILE;

    // Village crafting stations (from villageLayout)
    const stationPositions = villageLayout.stationPositions;
    this.addStation({
      x: centerX + stationPositions.forge.x * TILE,
      y: centerY + stationPositions.forge.y * TILE,
      type: 'forge',
      label: 'Village Forge'
    });
    this.addStation({
      x: centerX + stationPositions.tanner.x * TILE,
      y: centerY + stationPositions.tanner.y * TILE,
      type: 'tanner',
      label: 'Tanner'
    });
    this.addStation({
      x: centerX + stationPositions.alchemist.x * TILE,
      y: centerY + stationPositions.alchemist.y * TILE,
      type: 'alchemist',
      label: 'Alchemist'
    });

    // Create shop buildings and NPCs
    Object.entries(shops).forEach(([shopId, shop]) => {
      const pos = villageLayout.shopPositions[shopId];
      if (!pos) return;

      const shopX = centerX + pos.x * TILE;
      const shopY = centerY + pos.y * TILE;

      // Create shop building
      this.createShopBuilding(shopX, shopY, shop);

      // Create shop NPC
      this.createShopNPC(shopX, shopY + 30, shopId, shop);
    });

    // Add extra NPCs for flavor
    villageLayout.extraNPCs.forEach((npc) => {
      const npcX = centerX + npc.x * TILE;
      const npcY = centerY + npc.y * TILE;
      this.createNPC(npcX, npcY, npc.role, npc.name, npc.sprite);
    });

    // Village decorations
    const graphics = this.add.graphics();
    graphics.setDepth(1);

    // Well at center
    graphics.fillStyle(0x5a5a6a, 1);
    graphics.fillCircle(centerX, centerY, 20);
    graphics.fillStyle(0x3498db, 0.7);
    graphics.fillCircle(centerX, centerY, 12);
    graphics.lineStyle(3, 0x4a3728);
    graphics.strokeCircle(centerX, centerY, 20);

    // Add well collision
    const well = this.add.rectangle(centerX, centerY, 40, 40, 0x000000, 0);
    this.physics.add.existing(well, true);
    this.obstacles.add(well);

    // Village paths - cross pattern
    graphics.fillStyle(0x8b7355, 0.6);
    // North-South path
    for (let i = -10; i <= 10; i++) {
      graphics.fillRect(centerX - TILE, centerY + i * TILE - TILE/2, TILE * 2, TILE);
    }
    // East-West path
    for (let i = -10; i <= 10; i++) {
      graphics.fillRect(centerX + i * TILE - TILE/2, centerY - TILE, TILE, TILE * 2);
    }
  }

  createShopBuilding(x, y, shop) {
    const graphics = this.add.graphics();
    graphics.setDepth(2);

    // Building base
    graphics.fillStyle(0x6b5a3a, 1);
    graphics.fillRect(x - 40, y - 35, 80, 70);

    // Building roof
    graphics.fillStyle(0x8b4513, 1);
    graphics.beginPath();
    graphics.moveTo(x - 50, y - 30);
    graphics.lineTo(x, y - 60);
    graphics.lineTo(x + 50, y - 30);
    graphics.closePath();
    graphics.fillPath();

    // Door
    graphics.fillStyle(0x4a3728, 1);
    graphics.fillRect(x - 10, y + 10, 20, 25);

    // Window
    graphics.fillStyle(0x87ceeb, 0.7);
    graphics.fillRect(x - 30, y - 15, 15, 15);
    graphics.fillRect(x + 15, y - 15, 15, 15);

    // Sign
    const sign = this.add.text(x, y - 70, shop.name, {
      fontSize: '11px',
      color: '#ffd66b',
      fontFamily: 'Space Grotesk',
      backgroundColor: '#2c2c2c88',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(10);

    // Building collision
    const building = this.add.rectangle(x, y - 10, 75, 60, 0x000000, 0);
    this.physics.add.existing(building, true);
    this.obstacles.add(building);
  }

  createShopNPC(x, y, shopId, shop) {
    // Use Pixel Crawler NPC sprites if available (note: loaded with 'npc-' prefix)
    const spriteKey = `npc-${shop.npcSprite}-idle`;
    let npcSprite;

    if (this.textures.exists(spriteKey)) {
      npcSprite = this.add.sprite(x, y, spriteKey);
      npcSprite.setScale(1.0);
      // Safely try to play animation
      try {
        if (this.anims.exists(spriteKey)) {
          npcSprite.play(spriteKey);
        }
      } catch (e) {
        // Animation failed, sprite will show static
      }
      npcSprite.setDepth(5);
    } else {
      // Fallback to colored circle
      const graphics = this.add.graphics();
      graphics.setDepth(5);
      const colors = { knight: 0x7f8c8d, wizard: 0x9b59b6, rogue: 0x27ae60 };
      graphics.fillStyle(colors[shop.npcSprite] || 0x7f8c8d, 1);
      graphics.fillCircle(x, y - 8, 12);
      graphics.fillStyle(0xf5deb3, 1);
      graphics.fillCircle(x, y - 18, 8);
    }

    // Name tag
    const nameText = this.add.text(x, y - 40, shop.npcName, {
      fontSize: '10px',
      color: '#ffd66b',
      fontFamily: 'Space Grotesk',
    }).setOrigin(0.5).setDepth(10);

    // NPC collision/interaction zone
    const npcHitbox = this.add.rectangle(x, y, 30, 30, 0x000000, 0);
    this.physics.add.existing(npcHitbox, true);
    this.obstacles.add(npcHitbox);

    this.npcs.push({
      x, y,
      type: 'shop',
      shopId: shopId,
      name: shop.npcName,
      sprite: npcSprite,
      nameText,
      hitbox: npcHitbox
    });
  }
  
  createNPC(x, y, type, name, spriteType = null) {
    let npcSprite = null;

    // Try to use Pixel Crawler sprite if specified (note: loaded with 'npc-' prefix)
    if (spriteType) {
      const spriteKey = `npc-${spriteType}-idle`;
      if (this.textures.exists(spriteKey)) {
        npcSprite = this.add.sprite(x, y, spriteKey);
        npcSprite.setScale(1.0);
        try {
          if (this.anims.exists(spriteKey)) {
            npcSprite.play(spriteKey);
          }
        } catch (e) {
          // Animation failed, sprite will show static
        }
        npcSprite.setDepth(5);
      }
    }

    // Fallback to graphics if no sprite
    if (!npcSprite) {
      const graphics = this.add.graphics();
      graphics.setDepth(3);

      // NPC body
      const colors = {
        blacksmith: 0x8b4513,
        merchant: 0x9b59b6,
        alchemist: 0x27ae60,
        lore_keeper: 0x6b5b95,
        guard: 0x7f8c8d,
      };

      graphics.fillStyle(colors[type] || 0x7f8c8d, 1);
      graphics.fillCircle(x, y - 8, 10);
      graphics.fillStyle(0xf5deb3, 1);
      graphics.fillCircle(x, y - 16, 8);
    }

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

    this.npcs.push({ x, y, type, name, sprite: npcSprite, nameText, hitbox: npcHitbox });
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

    // Generate spawn points based on terrain (more mobs for larger world)
    const mobCount = 80; // Balanced for performance

    for (let i = 0; i < mobCount; i++) {
      const x = Phaser.Math.Between(15, WORLD_SIZE - 15);
      const y = Phaser.Math.Between(15, WORLD_SIZE - 15);

      // Don't spawn in village safe zone
      const centerDist = Math.hypot(x - VILLAGE_CENTER.x, y - VILLAGE_CENTER.y);
      if (centerDist < VILLAGE_RADIUS + 5) continue;

      // Get biome at this location
      const tileBiome = getDirectionalBiome(x, y);
      if (tileBiome === 'water' || tileBiome === 'village') continue;

      // Get spawn table for this biome, default to meadow
      const spawnTable = biomeSpawns[tileBiome] || biomeSpawns.meadow;

      // Calculate weighted random selection
      const totalWeight = spawnTable.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = Math.random() * totalWeight;
      let mobType = spawnTable[0].type;

      for (const entry of spawnTable) {
        roll -= entry.weight;
        if (roll <= 0) {
          mobType = entry.type;
          break;
        }
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
      // Original enemies
      'orc': 'orc-idle',
      'skeleton': 'skeleton-idle',
      'bat': 'bat-idle',
      'golem': 'orc-idle',
      'elemental': 'orc-idle',
      'wolf': 'orc-idle',
      'slime': 'orc-idle',
      'dragon': 'orc-idle',
      // Forest - Elves (all use base sprite)
      'elf_base': 'elf_base-idle',
      'elf_hunter': 'elf_base-idle',
      'elf_druid': 'elf_base-idle',
      'elf_ranger': 'elf_base-idle',
      // Desert - Mummies (all use base sprite)
      'mummy_base': 'mummy_base-idle',
      'mummy_warrior': 'mummy_base-idle',
      'mummy_rogue': 'mummy_base-idle',
      'mummy_mage': 'mummy_base-idle',
      // Cemetery - Zombies (all use base sprite)
      'zombie_base': 'zombie_base-idle',
      'zombie_banshee': 'zombie_base-idle',
      'zombie_muscle': 'zombie_base-idle',
      'zombie_fat': 'zombie_base-idle',
      // Sewer - Rats (all use base sprite)
      'rat_base': 'rat_base-idle',
      'rat_warrior': 'rat_base-idle',
      'rat_rogue': 'rat_base-idle',
      'rat_mage': 'rat_base-idle',
      // Cave - Fungus (all use immature sprite)
      'fungus_immature': 'fungus_immature-idle',
      'fungus_long': 'fungus_immature-idle',
      'fungus_heavy': 'fungus_immature-idle',
      'fungus_old': 'fungus_immature-idle',
      // Forge - Stone Golems (all use base sprite)
      'stone_base': 'stone_base-idle',
      'stone_golem': 'stone_base-idle',
      'stone_lava': 'stone_base-idle',
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
    // Update chunks based on player position (loads/unloads terrain)
    this.updateChunks();

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
        // Original enemies
        'orc': 'orc-run',
        'skeleton': 'skeleton-run',
        'bat': 'bat-move',
        'golem': 'orc-run',
        'elemental': 'orc-run',
        'wolf': 'orc-run',
        'slime': 'orc-run',
        'dragon': 'orc-run',
        // Forest - Elves (all use base sprite)
        'elf_base': 'elf_base-run',
        'elf_hunter': 'elf_base-run',
        'elf_druid': 'elf_base-run',
        'elf_ranger': 'elf_base-run',
        // Desert - Mummies (all use base sprite)
        'mummy_base': 'mummy_base-run',
        'mummy_warrior': 'mummy_base-run',
        'mummy_rogue': 'mummy_base-run',
        'mummy_mage': 'mummy_base-run',
        // Cemetery - Zombies (all use base sprite)
        'zombie_base': 'zombie_base-run',
        'zombie_banshee': 'zombie_base-run',
        'zombie_muscle': 'zombie_base-run',
        'zombie_fat': 'zombie_base-run',
        // Sewer - Rats (all use base sprite)
        'rat_base': 'rat_base-run',
        'rat_warrior': 'rat_base-run',
        'rat_rogue': 'rat_base-run',
        'rat_mage': 'rat_base-run',
        // Cave - Fungus (all use immature sprite)
        'fungus_immature': 'fungus_immature-run',
        'fungus_long': 'fungus_immature-run',
        'fungus_heavy': 'fungus_immature-run',
        'fungus_old': 'fungus_immature-run',
        // Forge - Stone Golems (all use base sprite)
        'stone_base': 'stone_base-run',
        'stone_golem': 'stone_base-run',
        'stone_lava': 'stone_base-run',
      };
      const spriteToIdle = {
        // Original enemies
        'orc': 'orc-idle',
        'skeleton': 'skeleton-idle',
        'bat': 'bat-idle',
        'golem': 'orc-idle',
        'elemental': 'orc-idle',
        'wolf': 'orc-idle',
        'slime': 'orc-idle',
        'dragon': 'orc-idle',
        // Forest - Elves (all use base sprite)
        'elf_base': 'elf_base-idle',
        'elf_hunter': 'elf_base-idle',
        'elf_druid': 'elf_base-idle',
        'elf_ranger': 'elf_base-idle',
        // Desert - Mummies (all use base sprite)
        'mummy_base': 'mummy_base-idle',
        'mummy_warrior': 'mummy_base-idle',
        'mummy_rogue': 'mummy_base-idle',
        'mummy_mage': 'mummy_base-idle',
        // Cemetery - Zombies (all use base sprite)
        'zombie_base': 'zombie_base-idle',
        'zombie_banshee': 'zombie_base-idle',
        'zombie_muscle': 'zombie_base-idle',
        'zombie_fat': 'zombie_base-idle',
        // Sewer - Rats (all use base sprite)
        'rat_base': 'rat_base-idle',
        'rat_warrior': 'rat_base-idle',
        'rat_rogue': 'rat_base-idle',
        'rat_mage': 'rat_base-idle',
        // Cave - Fungus (all use immature sprite)
        'fungus_immature': 'fungus_immature-idle',
        'fungus_long': 'fungus_immature-idle',
        'fungus_heavy': 'fungus_immature-idle',
        'fungus_old': 'fungus_immature-idle',
        // Forge - Stone Golems (all use base sprite)
        'stone_base': 'stone_base-idle',
        'stone_golem': 'stone_base-idle',
        'stone_lava': 'stone_base-idle',
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

    // Handle shop NPCs
    if (nearNPC.type === 'shop' && nearNPC.shopId) {
      this.renderShopPanel(nearNPC.shopId);
      return true;
    }

    // Handle flavor NPCs with dialogue
    if (nearNPC.type === 'lore_keeper') {
      content = `
        <h2>${nearNPC.name}</h2>
        <section>"The world grows darker beyond the village walls. To the north, the forest elves guard ancient secrets. East lies the scorched desert, home to the restless dead. South, the cemetery holds terrors untold. And to the west... the sewers breed unspeakable creatures."</section>
        <section class="keybinds">Seek strength before venturing far.</section>
      `;
    } else if (nearNPC.type === 'guard') {
      content = `
        <h2>${nearNPC.name}</h2>
        <section>"Keep your blade sharp, adventurer. The creatures grow bolder each day. We've lost good men to those elves in the northern woods."</section>
        <section class="keybinds">The village is safe. Beyond... be wary.</section>
      `;
    } else if (nearNPC.type === 'merchant') {
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

    if (content) {
      renderPanel(content);
      return true;
    }

    return false;
  }

  renderShopPanel(shopId) {
    const shop = shops[shopId];
    if (!shop) return;

    // Get random dialogue
    const dialogue = shop.dialogues[Math.floor(Math.random() * shop.dialogues.length)];

    // Build inventory buttons
    let buyButtons = shop.inventory.map((item) => {
      const itemData = items[item.id];
      const canAfford = playerState.coins >= item.buyPrice;
      const name = itemData?.name || item.id;
      return `<button class="${canAfford ? '' : 'disabled'}" onclick="window.buyFromShop('${shopId}', '${item.id}', ${item.buyPrice})">${name} - ${item.buyPrice}g</button>`;
    }).join('');

    // Build sell buttons for items player has that this shop buys
    let sellButtons = '';
    const sellableItems = Object.entries(playerState.inventory)
      .filter(([id, qty]) => {
        const itemData = items[id];
        return qty > 0 && itemData && shop.buysTypes.includes(itemData.type);
      })
      .map(([id, qty]) => {
        const itemData = items[id];
        const sellPrice = Math.floor((itemData.value || 1) * shop.sellMultiplier);
        return `<button onclick="window.sellToShop('${shopId}', '${id}', ${sellPrice})">${itemData.name} x${qty} - ${sellPrice}g ea</button>`;
      });

    if (sellableItems.length > 0) {
      sellButtons = `<section class="shop-sell"><h3>Sell Items</h3>${sellableItems.join('')}</section>`;
    }

    const content = `
      <h2>${shop.name}</h2>
      <section class="npc-dialogue">"${dialogue}"</section>
      <section class="shop-info">Your Gold: <span class="gold">${playerState.coins}g</span></section>
      <section class="shop-buy"><h3>Buy Items</h3>${buyButtons}</section>
      ${sellButtons}
    `;

    renderPanel(content);
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
    // Map station types to sprite keys
    const stationSprites = {
      forge: 'station-furnace',
      tanner: 'station-workbench',
      alchemist: 'station-alchemy',
    };

    const spriteKey = stationSprites[station.type];
    let stationSprite = null;

    // Try to use actual sprite
    if (spriteKey && this.textures.exists(spriteKey)) {
      stationSprite = this.add.sprite(station.x, station.y, spriteKey);
      stationSprite.setScale(0.5); // Scale down from 192x384 to reasonable size
      stationSprite.setOrigin(0.5, 0.7); // Adjust origin so it sits on ground
      stationSprite.setDepth(3);

      // If it's a spritesheet (like alchemy), set to first frame
      if (spriteKey === 'station-alchemy' && this.anims.exists('station-alchemy')) {
        stationSprite.play('station-alchemy');
      }
    } else {
      // Fallback to graphics
      const graphics = this.add.graphics();
      graphics.setDepth(3);

      const colors = {
        forge: { fill: 0xd35400, stroke: 0xff6b35 },
        tanner: { fill: 0x8b4513, stroke: 0xcd853f },
        alchemist: { fill: 0x27ae60, stroke: 0x2ecc71 },
      };

      const color = colors[station.type] || colors.forge;

      graphics.fillStyle(color.fill, 0.9);
      graphics.fillRect(station.x - 16, station.y - 12, 32, 24);
      graphics.lineStyle(2, color.stroke, 1);
      graphics.strokeRect(station.x - 16, station.y - 12, 32, 24);

      graphics.fillStyle(0xffffff, 0.3);
      if (station.type === 'forge') {
        graphics.fillTriangle(station.x, station.y - 8, station.x - 6, station.y + 4, station.x + 6, station.y + 4);
      } else if (station.type === 'alchemist') {
        graphics.fillCircle(station.x, station.y, 6);
      } else {
        graphics.fillRect(station.x - 6, station.y - 4, 12, 8);
      }

      stationSprite = graphics;
    }

    const label = this.add.text(station.x, station.y - 35, station.label || station.type, {
      fontSize: '9px',
      color: '#ffd66b',
      fontFamily: 'Space Grotesk',
    }).setOrigin(0.5).setDepth(10);

    const full = { ...station, graphics: stationSprite, labelText: label };
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

// Shop-specific buy/sell functions
window.buyFromShop = (shopId, itemId, cost) => {
  const shop = shops[shopId];
  if (!shop) return;

  if (playerState.coins < cost) {
    logEvent(`Not enough coins. Need ${cost}g.`);
    return;
  }

  // Verify item is in shop inventory
  const shopItem = shop.inventory.find(i => i.id === itemId);
  if (!shopItem) {
    logEvent('Item not available.');
    return;
  }

  playerState.coins -= cost;
  addItem(itemId, 1);
  logEvent(`Bought ${items[itemId]?.name || itemId} for ${cost}g.`);
  updateHUD();

  // Refresh shop panel
  if (window.gameScene && window.gameScene.renderShopPanel) {
    window.gameScene.renderShopPanel(shopId);
  }
};

window.sellToShop = (shopId, itemId, priceEach) => {
  const shop = shops[shopId];
  if (!shop) return;

  const itemData = items[itemId];
  if (!itemData) return;

  // Check shop buys this type
  if (!shop.buysTypes.includes(itemData.type)) {
    logEvent(`${shop.name} doesn't buy that.`);
    return;
  }

  const qty = playerState.inventory[itemId] || 0;
  if (qty <= 0) {
    logEvent('You don\'t have any to sell.');
    return;
  }

  // Sell one item at a time
  playerState.inventory[itemId]--;
  if (playerState.inventory[itemId] <= 0) {
    delete playerState.inventory[itemId];
  }

  playerState.coins += priceEach;
  logEvent(`Sold ${itemData.name} for ${priceEach}g.`);
  updateHUD();

  // Refresh shop panel
  if (window.gameScene && window.gameScene.renderShopPanel) {
    window.gameScene.renderShopPanel(shopId);
  }
};

const config = {
  type: Phaser.AUTO,
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
  },
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

updateHUD();
renderLog();
