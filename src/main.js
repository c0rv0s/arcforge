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
const RENDER_DISTANCE = 2; // chunks to load in each direction (reduced for performance)
const MOBS_PER_CHUNK = 1; // max mobs spawned per chunk

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

let logExpanded = false;
const LOG_VISIBLE_TIME = 8000; // 8 seconds

function logEvent(text) {
  logMessages.unshift({ text, at: Date.now() });
  while (logMessages.length > LOG_LIMIT) logMessages.pop();
  renderLog();
}

function renderLog() {
  const el = document.getElementById('log');
  const now = Date.now();
  
  // Filter messages based on expanded state
  let visibleMessages = logExpanded 
    ? logMessages 
    : logMessages.filter(l => (now - l.at) < LOG_VISIBLE_TIME);
  
  // If collapsed and no recent messages, show nothing or minimal
  if (!logExpanded && visibleMessages.length === 0) {
    el.innerHTML = `<div class="log-header"><span>Events</span><span>click to expand</span></div>`;
    return;
  }
  
  const headerText = logExpanded ? 'Events (click to collapse)' : 'Events';
  const countText = logExpanded ? `${logMessages.length} total` : `${visibleMessages.length} recent`;
  
  el.innerHTML = `<div class="log-header"><span>${headerText}</span><span>${countText}</span></div>` +
    visibleMessages.slice(0, logExpanded ? 20 : 5)
      .map((l, i) => {
        const age = now - l.at;
        const fading = !logExpanded && age > LOG_VISIBLE_TIME * 0.7 ? 'fading' : '';
        return `<div class="log-entry ${fading}">${l.text}</div>`;
      })
      .join('');
}

function initLogToggle() {
  const el = document.getElementById('log');
  el.addEventListener('click', () => {
    logExpanded = !logExpanded;
    el.classList.toggle('expanded', logExpanded);
    renderLog();
  });
  
  // Auto-refresh log to fade old messages
  setInterval(renderLog, 2000);
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

    // Floor tilesets - 96x96 pixel tiles
    this.load.spritesheet('tileset-floors', `${envBase}/Tilesets/Floors_Tiles.png`, { frameWidth: 96, frameHeight: 96 });
    
    // Trees - ALL models and sizes for maximum variety
    this.load.image('tree-1-small', `${envBase}/Props/Static/Trees/Model_01/Size_02.png`);
    this.load.image('tree-1-medium', `${envBase}/Props/Static/Trees/Model_01/Size_03.png`);
    this.load.image('tree-1-large', `${envBase}/Props/Static/Trees/Model_01/Size_04.png`);
    this.load.image('tree-1-xlarge', `${envBase}/Props/Static/Trees/Model_01/Size_05.png`);
    this.load.image('tree-2-small', `${envBase}/Props/Static/Trees/Model_02/Size_02.png`);
    this.load.image('tree-2-medium', `${envBase}/Props/Static/Trees/Model_02/Size_03.png`);
    this.load.image('tree-2-large', `${envBase}/Props/Static/Trees/Model_02/Size_04.png`);
    this.load.image('tree-2-xlarge', `${envBase}/Props/Static/Trees/Model_02/Size_05.png`);
    this.load.image('tree-3-small', `${envBase}/Props/Static/Trees/Model_03/Size_02.png`);
    this.load.image('tree-3-medium', `${envBase}/Props/Static/Trees/Model_03/Size_03.png`);
    this.load.image('tree-3-large', `${envBase}/Props/Static/Trees/Model_03/Size_04.png`);

    // Full vegetation and rock images for precise frame extraction
    this.load.image('vegetation-full', `${envBase}/Props/Static/Vegetation.png`);
    this.load.image('rocks-full', `${envBase}/Props/Static/Rocks.png`);
    
    // Biome-specific full prop images
    this.load.image('props-forest-full', 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Props.png');
    this.load.image('props-desert-full', 'assets/Pixel Crawler - Desert/Assets/Props.png');
    this.load.image('props-cave-full', 'assets/Pixel Crawler - Cave/Assets/Props.png');
    this.load.image('props-sewer-full', 'assets/Pixel Crawler - Sewer/Assets/Props.png');
    this.load.image('props-cemetery-full', 'assets/Pixel Crawler - Cemetery/Environment/Props/Props.png');
    this.load.image('props-graves-full', 'assets/Pixel Crawler - Cemetery/Environment/Props/Graves.png');
    
    // Shadows for props
    this.load.image('shadows', `${envBase}/Props/Static/Shadows.png`);

    // Forest-specific large tree
    this.load.image('tree-forest', 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tree.png');
    this.load.image('tree-cemetery', 'assets/Pixel Crawler - Cemetery/Environment/Props/Tree.png');
    
    // Light/glow effects for atmosphere
    this.load.image('forest-light', 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Light.png');
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
    // NPC sprites are 32x32 per frame
    this.load.spritesheet('npc-knight-idle', `${npcBase}/Knight/Idle/Idle-Sheet.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('npc-knight-run', `${npcBase}/Knight/Run/Run-Sheet.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('npc-wizard-idle', `${npcBase}/Wizzard/Idle/Idle-Sheet.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('npc-wizard-run', `${npcBase}/Wizzard/Run/Run-Sheet.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('npc-rogue-idle', `${npcBase}/Rogue/Idle/Idle-Sheet.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('npc-rogue-run', `${npcBase}/Rogue/Run/Run-Sheet.png`, { frameWidth: 32, frameHeight: 32 });
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

      // Camera and minimap BEFORE chunks load (so hideFromMinimap works)
      this.cameras.main.setZoom(1.5);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.cameras.main.setDeadzone(100, 100);
      this.createMinimap();

      // Load initial chunks around player
      this.updateChunks(true);

      // Create village structures
      this.createVillage();

      // Setup other systems
      this.createPlots();
      this.createFarmland();
      this.createDungeonEntrances();
      this.initInput();
      this.createParticleSystems();

      updateHUD('Explore the world, seek the village forge.');
      initLogToggle();
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

    // Create graphics for this chunk's ground layer
    const graphics = this.add.graphics();
    graphics.setDepth(0);

    const chunkData = {
      key,
      graphics,
      tiles: [],
      decorations: [],
      obstacles: [],
      waterColliders: [],
      mobs: [],
    };

    // Generate terrain for this chunk
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldTileX = startX + tx;
        const worldTileY = startY + ty;

        if (worldTileX >= WORLD_SIZE || worldTileY >= WORLD_SIZE) continue;

        let biome = getDirectionalBiome(worldTileX, worldTileY);

        // Water features (reduced for cleaner biomes)
        const waterNoise = perlinNoise(worldTileX, worldTileY, 2, 0.5, this.worldSeed + 3000);
        if (waterNoise < 0.08 && biome !== 'village' && biome !== 'desert' && biome !== 'forge') {
          biome = 'water';
        }

        const px = worldTileX * TILE;
        const py = worldTileY * TILE;

        // Store terrain data
        if (!this.terrainData[worldTileY]) this.terrainData[worldTileY] = [];
        this.terrainData[worldTileY][worldTileX] = { biome };

        // Draw rich textured ground
        this.drawRichGround(graphics, px, py, worldTileX, worldTileY, biome, chunkData);

        // Water collision
        if (biome === 'water') {
          const waterRect = this.add.rectangle(px + TILE/2, py + TILE/2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(waterRect, true);
          this.waterBodies.add(waterRect);
          chunkData.waterColliders.push(waterRect);
        }
      }
    }

    // Second pass: Add sparse ground decorations (grass tufts, flowers, pebbles)
    // Skip every other tile for performance
    for (let ty = 0; ty < CHUNK_SIZE; ty += 2) {
      for (let tx = 0; tx < CHUNK_SIZE; tx += 2) {
        const worldTileX = startX + tx;
        const worldTileY = startY + ty;
        if (worldTileX >= WORLD_SIZE || worldTileY >= WORLD_SIZE) continue;

        const biome = this.terrainData[worldTileY]?.[worldTileX]?.biome || 'meadow';
        if (biome === 'water' || biome === 'village') continue;

        const px = worldTileX * TILE;
        const py = worldTileY * TILE;

        // Ground details - reduced count
        this.addDenseGroundDetails(px, py, worldTileX, worldTileY, biome, chunkData);
      }
    }

    // Third pass: Add mid-level decorations (bushes, small rocks, plants)
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldTileX = startX + tx;
        const worldTileY = startY + ty;
        if (worldTileX >= WORLD_SIZE || worldTileY >= WORLD_SIZE) continue;

        const biome = this.terrainData[worldTileY]?.[worldTileX]?.biome || 'meadow';
        if (biome === 'water' || biome === 'village') continue;

        const px = worldTileX * TILE;
        const py = worldTileY * TILE;

        // Mid-level props with moderate density
        const propRand = seededRandom(worldTileX * 4000 + worldTileY + this.worldSeed);
        if (propRand < this.getBiomePropDensity(biome)) {
          const prop = this.addBiomeProp(px, py, worldTileX, worldTileY, biome, chunkData);
          // Hide props from minimap
          if (prop) this.hideFromMinimap(prop);
        }
      }
    }

    // Fourth pass: Add large obstacles (trees, large rocks) with collision
    // Use organic clustering via perlin noise
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldTileX = startX + tx;
        const worldTileY = startY + ty;
        if (worldTileX >= WORLD_SIZE || worldTileY >= WORLD_SIZE) continue;

        const biome = this.terrainData[worldTileY]?.[worldTileX]?.biome || 'meadow';
        if (biome === 'water' || biome === 'village') continue;

        const px = worldTileX * TILE;
        const py = worldTileY * TILE;

        // Use organic clustering for tree/obstacle placement
        if (this.shouldSpawnTree(worldTileX, worldTileY, biome)) {
          const obs = this.createObstacle(px + TILE/2, py + TILE/2, biome, worldTileX, worldTileY);
          if (obs) {
            chunkData.obstacles.push(obs);
            // Hide from minimap for performance
            if (obs.visual) this.hideFromMinimap(obs.visual);
            if (obs.shadow) this.hideFromMinimap(obs.shadow);
            if (obs.extras) obs.extras.forEach(e => this.hideFromMinimap(e));
          }
        }
      }
    }

    // Spawn mobs
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

    // Hide all decorations from minimap for cleaner view
    chunkData.decorations.forEach(dec => this.hideFromMinimap(dec));

    this.chunks.set(key, chunkData);
    this.loadedChunks.add(key);
  }

  // Rich ground rendering with texture variation
  drawRichGround(graphics, px, py, tileX, tileY, biome, chunkData) {
    const colors = biomeColors[biome] || biomeColors.meadow;
    
    // Base color with perlin noise variation for organic look
    const noiseVal = perlinNoise(tileX, tileY, 3, 0.6, this.worldSeed + 100);
    const variation = (noiseVal - 0.5) * 0.25;
    
    const baseColor = Phaser.Display.Color.IntegerToColor(colors.ground);
    const r = Math.max(0, Math.min(255, Math.floor(baseColor.red * (1 + variation))));
    const g = Math.max(0, Math.min(255, Math.floor(baseColor.green * (1 + variation))));
    const b = Math.max(0, Math.min(255, Math.floor(baseColor.blue * (1 + variation))));
    
    graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
    graphics.fillRect(px, py, TILE, TILE);

    // Add subtle texture pattern based on biome
    const patternRand = seededRandom(tileX * 500 + tileY + this.worldSeed);
    
    if (biome === 'forest' || biome === 'meadow') {
      // Grass texture - small darker patches
      for (let i = 0; i < 3; i++) {
        const ox = (seededRandom(tileX * 100 + tileY * 10 + i + this.worldSeed) * TILE) | 0;
        const oy = (seededRandom(tileX * 10 + tileY * 100 + i + this.worldSeed) * TILE) | 0;
        const size = 3 + patternRand * 4;
        graphics.fillStyle(colors.accent || colors.ground, 0.3);
        graphics.fillEllipse(px + ox, py + oy, size, size * 0.6);
      }
    } else if (biome === 'desert') {
      // Sand ripples
      if (patternRand < 0.3) {
        graphics.lineStyle(1, 0xc4913a, 0.2);
        const rippleY = py + patternRand * TILE;
        graphics.lineBetween(px, rippleY, px + TILE, rippleY + 2);
      }
    } else if (biome === 'cemetery' || biome === 'cave') {
      // Rocky texture - small stone patches
      for (let i = 0; i < 2; i++) {
        const ox = (seededRandom(tileX * 80 + tileY * 8 + i + this.worldSeed) * TILE) | 0;
        const oy = (seededRandom(tileX * 8 + tileY * 80 + i + this.worldSeed) * TILE) | 0;
        graphics.fillStyle(0x3a3a4a, 0.25);
        graphics.fillEllipse(px + ox, py + oy, 4, 3);
      }
    } else if (biome === 'water') {
      // Water with wave effect
      graphics.fillStyle(0x3498db, 0.9);
      graphics.fillRect(px, py, TILE, TILE);
      // Ripple highlights
      const waveOffset = (tileX + tileY) * 0.5;
      graphics.fillStyle(0x5dade2, 0.3);
      graphics.fillEllipse(px + TILE/2 + Math.sin(waveOffset) * 8, py + TILE/2, 8, 4);
    }
  }

  // Dense ground details - grass tufts, tiny flowers, pebbles
  addDenseGroundDetails(px, py, tileX, tileY, biome, chunkData) {
    const detailCount = this.getBiomeDetailDensity(biome);
    
    for (let i = 0; i < detailCount; i++) {
      const seed = tileX * 1000 + tileY * 100 + i + this.worldSeed;
      const rand = seededRandom(seed);
      const rand2 = seededRandom(seed + 500);
      const rand3 = seededRandom(seed + 1000);
      
      const ox = rand * TILE;
      const oy = rand2 * TILE;
      const detailType = rand3;
      
      const detail = this.createGroundDetail(px + ox, py + oy, biome, detailType, rand);
      if (detail) chunkData.decorations.push(detail);
    }
  }

  createGroundDetail(x, y, biome, type, rand) {
    let detail = null;
    const depth = y + 1;
    
    if (biome === 'forest' || biome === 'meadow') {
      if (type < 0.4) {
        // Grass tuft
        const height = 4 + rand * 4;
        const color = biome === 'forest' ? 0x2d5a2d : 0x4a7c3f;
        detail = this.add.polygon(x, y, [0, 0, -2, height, 0, height - 2, 2, height], color, 0.8);
        detail.setDepth(depth);
      } else if (type < 0.6) {
        // Small flower
        const colors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0x9b59b6];
        const flowerColor = colors[Math.floor(rand * colors.length)];
        detail = this.add.circle(x, y, 2 + rand * 2, flowerColor, 0.9);
        detail.setDepth(depth);
      } else if (type < 0.8) {
        // Tiny pebble
        detail = this.add.ellipse(x, y, 3 + rand * 3, 2 + rand * 2, 0x7a7a7a, 0.6);
        detail.setDepth(depth);
      } else {
        // Clover/small plant
        const cloverColor = biome === 'forest' ? 0x1a4a1a : 0x3d6b32;
        detail = this.add.circle(x, y, 2 + rand, cloverColor, 0.7);
        detail.setDepth(depth);
      }
    } else if (biome === 'desert') {
      if (type < 0.5) {
        // Small rock
        detail = this.add.ellipse(x, y, 3 + rand * 4, 2 + rand * 3, 0xb8956a, 0.7);
        detail.setDepth(depth);
      } else if (type < 0.7) {
        // Sand mound
        detail = this.add.ellipse(x, y, 5 + rand * 5, 3 + rand * 2, 0xc4913a, 0.4);
        detail.setDepth(depth);
      } else {
        // Bone fragment (rare)
        detail = this.add.ellipse(x, y, 4, 2, 0xe8dcc8, 0.5);
        detail.setDepth(depth);
      }
    } else if (biome === 'cemetery') {
      if (type < 0.4) {
        // Dead grass
        const height = 3 + rand * 3;
        detail = this.add.polygon(x, y, [0, 0, -1, height, 1, height], 0x5a5a4a, 0.6);
        detail.setDepth(depth);
      } else if (type < 0.7) {
        // Small stone
        detail = this.add.ellipse(x, y, 3 + rand * 3, 2 + rand * 2, 0x5a5a6a, 0.6);
        detail.setDepth(depth);
      } else {
        // Bone shard
        detail = this.add.ellipse(x, y, 3 + rand * 2, 2, 0xd4c4b4, 0.5);
        detail.setDepth(depth);
      }
    } else if (biome === 'cave' || biome === 'forge') {
      if (type < 0.6) {
        // Small rock
        const rockColor = biome === 'forge' ? 0x5a3d3d : 0x4a4a5a;
        detail = this.add.ellipse(x, y, 3 + rand * 4, 2 + rand * 3, rockColor, 0.7);
        detail.setDepth(depth);
      } else if (type < 0.85) {
        // Crystal shard (cave) or ember (forge)
        const shardColor = biome === 'forge' ? 0xff6b35 : 0x7a7aaa;
        detail = this.add.polygon(x, y, [0, -4, -2, 0, 0, 2, 2, 0], shardColor, 0.6);
        detail.setDepth(depth);
      }
    } else if (biome === 'sewer') {
      if (type < 0.5) {
        // Moss patch
        detail = this.add.ellipse(x, y, 4 + rand * 4, 3 + rand * 2, 0x3d5a3d, 0.5);
        detail.setDepth(depth);
      } else {
        // Debris
        detail = this.add.ellipse(x, y, 3 + rand * 3, 2 + rand * 2, 0x4a4a4a, 0.4);
        detail.setDepth(depth);
      }
    }
    
    return detail;
  }

  getBiomeDetailDensity(biome) {
    // Minimal density for performance - just 1 detail per tile max
    return 1;
  }

  getBiomePropDensity(biome) {
    // Very sparse props for performance
    const densities = {
      forest: 0.04,
      meadow: 0.03,
      desert: 0.02,
      cemetery: 0.04,
      cave: 0.03,
      forge: 0.03,
      sewer: 0.03,
    };
    return densities[biome] || 0.02;
  }
  
  // Use perlin noise for organic tree clustering
  shouldSpawnTree(tileX, tileY, biome) {
    // Very sparse for performance - only ~2-4% coverage in forests
    const baseDensity = {
      forest: 0.025,
      meadow: 0.008,
      cemetery: 0.012,
      cave: 0.01,
      forge: 0.008,
      sewer: 0.006,
      desert: 0.005,
    }[biome] || 0.006;
    
    // Use perlin noise for natural clustering - trees group together
    const clusterNoise = perlinNoise(tileX * 0.2, tileY * 0.2, 2, 0.5, this.worldSeed + 7777);
    const detailNoise = seededRandom(tileX * 9999 + tileY + this.worldSeed);
    
    // Trees spawn more in high-noise areas (creates groves/clearings)
    const threshold = baseDensity * (0.3 + clusterNoise * 1.0);
    return detailNoise < threshold;
  }

  // Mid-level biome-specific props (bushes, plants, rocks)
  addBiomeProp(px, py, tileX, tileY, biome, chunkData) {
    const seed = tileX * 5000 + tileY + this.worldSeed;
    const rand = seededRandom(seed);
    const rand2 = seededRandom(seed + 100);
    
    const ox = rand * TILE * 0.5;
    const oy = rand2 * TILE * 0.5;
    const x = px + ox;
    const y = py + oy;
    const depth = y + 2;
    
    let prop = null;
    let shadow = null;
    
    if (biome === 'forest') {
      const propType = rand;
      if (propType < 0.3) {
        // Large bush
        const bushSize = 12 + rand * 8;
        shadow = this.add.ellipse(x, y + bushSize * 0.3, bushSize, bushSize * 0.3, 0x000000, 0.2);
        shadow.setDepth(depth - 1);
        prop = this.add.ellipse(x, y - bushSize * 0.2, bushSize, bushSize * 0.7, 0x2d5a2d, 1);
        prop.setDepth(depth);
        // Add highlight
        const highlight = this.add.ellipse(x - bushSize * 0.2, y - bushSize * 0.4, bushSize * 0.4, bushSize * 0.25, 0x3d7a3d, 0.6);
        highlight.setDepth(depth + 0.1);
        chunkData.decorations.push(highlight);
      } else if (propType < 0.5) {
        // Mushroom cluster
        const mushColor = rand2 < 0.5 ? 0xe74c3c : 0x9b59b6;
        prop = this.add.circle(x, y, 5 + rand * 3, mushColor, 0.9);
        prop.setDepth(depth);
        const stem = this.add.rectangle(x, y + 4, 3, 6, 0xf5deb3, 0.8);
        stem.setDepth(depth - 0.1);
        chunkData.decorations.push(stem);
      } else if (propType < 0.7) {
        // Fern
        const fernSize = 8 + rand * 6;
        prop = this.add.polygon(x, y, [0, -fernSize, -fernSize/2, 0, 0, fernSize/3, fernSize/2, 0], 0x228b22, 0.8);
        prop.setDepth(depth);
      } else {
        // Rock with moss
        const rockSize = 8 + rand * 8;
        shadow = this.add.ellipse(x, y + rockSize * 0.2, rockSize, rockSize * 0.3, 0x000000, 0.2);
        shadow.setDepth(depth - 1);
        prop = this.add.ellipse(x, y - rockSize * 0.15, rockSize, rockSize * 0.6, 0x6a6a6a, 1);
        prop.setDepth(depth);
        // Moss on top
        const moss = this.add.ellipse(x - rockSize * 0.1, y - rockSize * 0.3, rockSize * 0.5, rockSize * 0.25, 0x3d6b3d, 0.7);
        moss.setDepth(depth + 0.1);
        chunkData.decorations.push(moss);
      }
    } else if (biome === 'meadow') {
      const propType = rand;
      if (propType < 0.35) {
        // Flower cluster
        const colors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff9ff3];
        for (let i = 0; i < 3; i++) {
          const flowerX = x + (seededRandom(seed + i * 10) - 0.5) * 12;
          const flowerY = y + (seededRandom(seed + i * 20) - 0.5) * 8;
          const flowerColor = colors[Math.floor(seededRandom(seed + i * 30) * colors.length)];
          const flower = this.add.circle(flowerX, flowerY, 3 + seededRandom(seed + i * 40) * 2, flowerColor, 0.9);
          flower.setDepth(flowerY + 2);
          chunkData.decorations.push(flower);
        }
        return; // Skip prop assignment
      } else if (propType < 0.6) {
        // Small bush
        const bushSize = 10 + rand * 6;
        shadow = this.add.ellipse(x, y + bushSize * 0.25, bushSize * 0.8, bushSize * 0.25, 0x000000, 0.15);
        shadow.setDepth(depth - 1);
        prop = this.add.ellipse(x, y - bushSize * 0.1, bushSize, bushSize * 0.6, 0x4a8c3f, 1);
        prop.setDepth(depth);
      } else {
        // Tall grass clump
        const grassHeight = 10 + rand * 8;
        prop = this.add.polygon(x, y, [
          -4, 0, -6, -grassHeight * 0.7, -2, -grassHeight,
          0, -grassHeight * 0.8, 2, -grassHeight,
          6, -grassHeight * 0.7, 4, 0
        ], 0x5a9c4f, 0.85);
        prop.setDepth(depth);
      }
    } else if (biome === 'desert') {
      const propType = rand;
      if (propType < 0.4) {
        // Cactus
        const cactusHeight = 12 + rand * 10;
        shadow = this.add.ellipse(x, y + 2, 6, 3, 0x000000, 0.15);
        shadow.setDepth(depth - 1);
        prop = this.add.rectangle(x, y - cactusHeight/2, 6, cactusHeight, 0x2d8659, 1);
        prop.setDepth(depth);
        // Arms
        if (rand2 > 0.5) {
          const arm = this.add.rectangle(x + 6, y - cactusHeight * 0.4, 8, 4, 0x2d8659, 1);
          arm.setDepth(depth);
          chunkData.decorations.push(arm);
        }
      } else if (propType < 0.7) {
        // Desert rock
        const rockSize = 10 + rand * 10;
        shadow = this.add.ellipse(x, y + rockSize * 0.15, rockSize, rockSize * 0.25, 0x000000, 0.15);
        shadow.setDepth(depth - 1);
        prop = this.add.ellipse(x, y - rockSize * 0.1, rockSize, rockSize * 0.5, 0xb8956a, 1);
        prop.setDepth(depth);
      } else {
        // Skull/bones
        prop = this.add.ellipse(x, y, 8, 6, 0xe8dcc8, 0.9);
        prop.setDepth(depth);
      }
    } else if (biome === 'cemetery') {
      const propType = rand;
      if (propType < 0.4) {
        // Gravestone
        const height = 14 + rand * 8;
        shadow = this.add.ellipse(x, y + 2, 8, 3, 0x000000, 0.15);
        shadow.setDepth(depth - 1);
        prop = this.add.polygon(x, y, [
          -5, height/2, -5, -height/3, -3, -height/2, 3, -height/2, 5, -height/3, 5, height/2
        ], 0x5a5a6a, 1);
        prop.setDepth(depth);
      } else if (propType < 0.6) {
        // Dead bush
        const bushSize = 8 + rand * 6;
        prop = this.add.polygon(x, y, [
          0, -bushSize, -bushSize/2, -bushSize/2, -bushSize/3, 0,
          bushSize/3, 0, bushSize/2, -bushSize/2
        ], 0x4a3a2a, 0.8);
        prop.setDepth(depth);
      } else {
        // Broken cross
        const crossHeight = 10 + rand * 6;
        prop = this.add.polygon(x, y, [
          -2, crossHeight/2, -2, -crossHeight/3, -6, -crossHeight/3, 
          -6, -crossHeight/2, 6, -crossHeight/2, 6, -crossHeight/3,
          2, -crossHeight/3, 2, crossHeight/2
        ], 0x4a4a5a, 0.9);
        prop.setDepth(depth);
      }
    } else if (biome === 'cave') {
      const propType = rand;
      if (propType < 0.5) {
        // Stalagmite
        const height = 10 + rand * 12;
        prop = this.add.polygon(x, y, [0, -height, -5, 0, 5, 0], 0x5a5a6a, 1);
        prop.setDepth(depth);
      } else if (propType < 0.8) {
        // Crystal cluster
        const crystalColor = rand2 < 0.5 ? 0x7a7aaa : 0x5a9a9a;
        prop = this.add.polygon(x, y, [
          0, -12, -3, -6, -6, 0, 0, -4, 6, 0, 3, -6
        ], crystalColor, 0.8);
        prop.setDepth(depth);
        // Glow effect
        const glow = this.add.circle(x, y - 6, 8, crystalColor, 0.2);
        glow.setDepth(depth - 0.5);
        chunkData.decorations.push(glow);
      } else {
        // Glowing mushroom
        const mushColor = 0x4ecdc4;
        prop = this.add.circle(x, y - 4, 6, mushColor, 0.9);
        prop.setDepth(depth);
        const stem = this.add.rectangle(x, y + 2, 4, 8, 0x8a8a8a, 0.8);
        stem.setDepth(depth - 0.1);
        chunkData.decorations.push(stem);
        // Glow
        const glow = this.add.circle(x, y - 4, 10, mushColor, 0.15);
        glow.setDepth(depth - 0.5);
        chunkData.decorations.push(glow);
      }
    } else if (biome === 'forge') {
      const propType = rand;
      if (propType < 0.4) {
        // Lava rock
        const rockSize = 10 + rand * 10;
        shadow = this.add.ellipse(x, y + rockSize * 0.15, rockSize, rockSize * 0.25, 0x000000, 0.15);
        shadow.setDepth(depth - 1);
        prop = this.add.ellipse(x, y - rockSize * 0.1, rockSize, rockSize * 0.5, 0x5a3030, 1);
        prop.setDepth(depth);
        // Glow cracks
        const crack = this.add.ellipse(x, y - rockSize * 0.15, rockSize * 0.3, 2, 0xff6b35, 0.7);
        crack.setDepth(depth + 0.1);
        chunkData.decorations.push(crack);
      } else if (propType < 0.7) {
        // Ember cluster
        for (let i = 0; i < 3; i++) {
          const emberX = x + (seededRandom(seed + i * 10) - 0.5) * 10;
          const emberY = y + (seededRandom(seed + i * 20) - 0.5) * 6;
          const ember = this.add.circle(emberX, emberY, 2 + seededRandom(seed + i * 30) * 2, 0xff6b35, 0.8);
          ember.setDepth(emberY + 2);
          chunkData.decorations.push(ember);
        }
        return;
      } else {
        // Obsidian shard
        const shardSize = 8 + rand * 8;
        prop = this.add.polygon(x, y, [0, -shardSize, -4, 0, 0, 4, 4, 0], 0x2a2a3a, 1);
        prop.setDepth(depth);
      }
    } else if (biome === 'sewer') {
      const propType = rand;
      if (propType < 0.4) {
        // Slime puddle
        const puddleSize = 10 + rand * 8;
        prop = this.add.ellipse(x, y, puddleSize, puddleSize * 0.5, 0x4a6a4a, 0.7);
        prop.setDepth(1); // Low depth for puddles
      } else if (propType < 0.7) {
        // Barrel/debris
        prop = this.add.ellipse(x, y - 4, 8, 10, 0x6a5a4a, 0.9);
        prop.setDepth(depth);
      } else {
        // Pipe piece
        prop = this.add.rectangle(x, y, 12, 6, 0x5a5a5a, 0.8);
        prop.setDepth(depth);
      }
    }
    
    if (prop) chunkData.decorations.push(prop);
    if (shadow) chunkData.decorations.push(shadow);
  }

  unloadChunk(key) {
    const chunkData = this.chunks.get(key);
    if (!chunkData) return;

    // Destroy terrain graphics
    chunkData.graphics.destroy();

    // Remove tile sprites
    if (chunkData.tiles) {
      chunkData.tiles.forEach(tile => {
        if (tile && tile.destroy) tile.destroy();
      });
    }

    // Remove decorations (grass, flowers, props)
    if (chunkData.decorations) {
      chunkData.decorations.forEach(decor => {
        if (decor && decor.destroy) decor.destroy();
      });
    }

    // Remove obstacles (visual, shadow, extras, and collider)
    chunkData.obstacles.forEach(obs => {
      if (obs) {
        if (obs.visual && obs.visual.destroy) obs.visual.destroy();
        if (obs.shadow && obs.shadow.destroy) obs.shadow.destroy();
        if (obs.extras) {
          obs.extras.forEach(extra => {
            if (extra && extra.destroy) extra.destroy();
          });
        }
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


  spawnMobAt(x, y) {
    // Get biome at position
    const tileX = Math.floor(x / TILE);
    const tileY = Math.floor(y / TILE);
    const biome = getDirectionalBiome(tileX, tileY);

    // Get valid mob types for this biome - biomeSpawns has {type, weight} objects
    const spawnTable = biomeSpawns[biome] || biomeSpawns.meadow;
    if (!spawnTable || spawnTable.length === 0) return null;
    
    // Weighted random selection
    const totalWeight = spawnTable.reduce((sum, entry) => sum + (entry.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    let mobType = spawnTable[0].type;
    
    for (const entry of spawnTable) {
      roll -= (entry.weight || 1);
      if (roll <= 0) {
        mobType = entry.type;
        break;
      }
    }
    
    const data = mobTypes[mobType];
    if (!data) {
      console.warn('[Arcforge] Unknown mob type:', mobType);
      return null;
    }

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
    mob.data.set('speed', data.speed || 50);
    mob.data.set('attack', data.attack || 5);
    mob.data.set('attackRate', data.attackRate || 1000);
    mob.data.set('aggroRange', data.aggroRange || 120);
    mob.data.set('nextAttack', 0);
    mob.setCollideWorldBounds(true);
    mob.setDepth(4);

    if (this.anims.exists(spriteKey)) mob.play(spriteKey);
    
    // Apply tint if specified
    if (data.tint) mob.setTint(data.tint);

    // Create HP bar
    const hpBarBg = this.add.rectangle(x, y - 24, 24, 4, 0x333333, 0.8).setDepth(6);
    const hpBar = this.add.rectangle(x, y - 24, 24, 4, 0x2ecc71, 1).setDepth(7);
    mob.hpBarBg = hpBarBg;
    mob.hpBar = hpBar;
    
    // Hide mob and HP bars from minimap
    this.hideFromMinimap(mob);
    this.hideFromMinimap(hpBarBg);
    this.hideFromMinimap(hpBar);

    this.mobs.push(mob);
    this.physics.add.collider(mob, this.obstacles);
    this.physics.add.collider(mob, this.waterBodies);
    this.physics.add.overlap(this.player, mob, () => this.handlePlayerHit(mob), null, this);

    return mob;
  }

  // ========== END CHUNK SYSTEM ==========
  
  debugLog(msg) {
    console.log('[Arcforge]', msg);
  }
  
  createObstacle(x, y, biome, tileX = 0, tileY = 0) {
    let visual = null;
    // Use seeded random for consistent, organic placement
    const rand = seededRandom(tileX * 7777 + tileY * 13 + this.worldSeed);
    const rand2 = seededRandom(tileX * 3333 + tileY * 17 + this.worldSeed + 500);
    const rand3 = seededRandom(tileX * 5555 + tileY * 19 + this.worldSeed + 1000);
    let shadow = null;
    let extras = [];

    if (biome === 'forest') {
      // Forest trees - use only 2-3 tree types for consistency, vary by position
      const treeModels = [
        { key: 'tree-1-medium', scale: 0.42 },
        { key: 'tree-2-medium', scale: 0.45 },
        { key: 'tree-3-medium', scale: 0.38 },
      ];
      
      // Use fairy forest tree occasionally for variety
      if (rand < 0.15 && this.textures.exists('tree-forest')) {
        const scale = 0.28 + rand2 * 0.12;
        shadow = this.add.ellipse(x, y + 15, 45 * scale, 18 * scale, 0x000000, 0.3);
        shadow.setDepth(y - 1);
        visual = this.add.sprite(x, y, 'tree-forest');
        visual.setScale(scale);
        visual.setOrigin(0.5, 0.95);
        visual.setDepth(y);
      } else {
        // Pick tree model based on position for local consistency
        const modelIndex = Math.floor((tileX + tileY * 3) % treeModels.length);
        const tree = treeModels[modelIndex];
        if (this.textures.exists(tree.key)) {
          // Slight scale variation
          const scale = tree.scale + (rand2 - 0.5) * 0.08;
          shadow = this.add.ellipse(x, y + 12, 32 * scale, 13 * scale, 0x000000, 0.25);
          shadow.setDepth(y - 1);
          visual = this.add.sprite(x, y, tree.key);
          visual.setScale(scale);
          visual.setOrigin(0.5, 0.95);
          visual.setDepth(y);
        }
      }
    } else if (biome === 'meadow') {
      // Meadow - smaller trees and large bushes
      if (rand < 0.65) {
        const treeModels = ['tree-1-small', 'tree-2-small', 'tree-3-small'];
        // Pick based on position for local consistency
        const modelIndex = Math.floor((tileX * 2 + tileY) % treeModels.length);
        const treeKey = treeModels[modelIndex];
        const scale = 0.32 + rand2 * 0.1;
        
        if (this.textures.exists(treeKey)) {
          shadow = this.add.ellipse(x, y + 10, 26 * scale, 10 * scale, 0x000000, 0.2);
          shadow.setDepth(y - 1);
          visual = this.add.sprite(x, y, treeKey);
          visual.setScale(scale);
          visual.setOrigin(0.5, 0.95);
          visual.setDepth(y);
        }
      } else {
        // Large flowering bush
        const bushSize = 16 + rand * 10;
        shadow = this.add.ellipse(x, y + bushSize * 0.25, bushSize * 0.8, bushSize * 0.25, 0x000000, 0.15);
        shadow.setDepth(y - 1);
        visual = this.add.ellipse(x, y - bushSize * 0.15, bushSize, bushSize * 0.7, 0x4a8c3f, 1);
        visual.setDepth(y);
        // Flowers on bush (seeded positions)
        const flowerColors = [0xff6b6b, 0xffd93d, 0xff9ff3, 0x6bcb77];
        for (let i = 0; i < 3; i++) {
          const fx = x + (seededRandom(tileX * 100 + i + this.worldSeed) - 0.5) * bushSize * 0.7;
          const fy = y - bushSize * 0.15 + (seededRandom(tileY * 100 + i + this.worldSeed) - 0.5) * bushSize * 0.4;
          const flower = this.add.circle(fx, fy, 2.5, flowerColors[i % flowerColors.length], 0.9);
          flower.setDepth(y + 1);
          extras.push(flower);
        }
      }
    } else if (biome === 'desert') {
      // Desert - large rocks and dead trees
      if (rand < 0.7) {
        const rockSize = 18 + rand * 15;
        shadow = this.add.ellipse(x, y + rockSize * 0.15, rockSize * 0.9, rockSize * 0.3, 0x000000, 0.2);
        shadow.setDepth(y - 1);
        // Main rock body
        visual = this.add.ellipse(x, y - rockSize * 0.2, rockSize, rockSize * 0.65, 0xb8956a, 1);
        visual.setDepth(y);
        // Rock highlight
        const highlight = this.add.ellipse(x - rockSize * 0.2, y - rockSize * 0.35, rockSize * 0.35, rockSize * 0.2, 0xc8a57a, 0.6);
        highlight.setDepth(y + 0.1);
        extras.push(highlight);
      } else {
        // Dead tree / cactus large
        const height = 25 + rand * 15;
        shadow = this.add.ellipse(x, y + 3, 12, 5, 0x000000, 0.15);
        shadow.setDepth(y - 1);
        visual = this.add.rectangle(x, y - height/2, 8, height, 0x2d8659, 1);
        visual.setDepth(y);
        // Side arms
        const arm1 = this.add.rectangle(x - 10, y - height * 0.5, 12, 6, 0x2d8659, 1);
        arm1.setDepth(y);
        extras.push(arm1);
        const arm2 = this.add.rectangle(x + 10, y - height * 0.3, 12, 6, 0x2d8659, 1);
        arm2.setDepth(y);
        extras.push(arm2);
      }
    } else if (biome === 'cemetery') {
      // Cemetery - dead trees and large monuments
      if (rand < 0.3 && this.textures.exists('tree-cemetery')) {
        const scale = 0.3 + rand2 * 0.15;
        shadow = this.add.ellipse(x, y + 10, 30 * scale, 12 * scale, 0x000000, 0.25);
        shadow.setDepth(y - 1);
        visual = this.add.sprite(x, y, 'tree-cemetery');
        visual.setScale(scale);
        visual.setOrigin(0.5, 0.95);
        visual.setDepth(y);
      } else if (rand < 0.6) {
        // Large gravestone monument
        const height = 24 + rand * 12;
        shadow = this.add.ellipse(x, y + 3, 14, 5, 0x000000, 0.2);
        shadow.setDepth(y - 1);
        visual = this.add.polygon(x, y, [
          -8, height/2, -8, -height/3, -5, -height/2, 5, -height/2, 8, -height/3, 8, height/2
        ], 0x5a5a6a, 1);
        visual.setDepth(y);
        // Cross or decoration on top
        const cross = this.add.polygon(x, y - height/2 - 4, [
          -2, 4, -2, 0, -5, 0, -5, -2, -2, -2, -2, -6, 2, -6, 2, -2, 5, -2, 5, 0, 2, 0, 2, 4
        ], 0x4a4a5a, 1);
        cross.setDepth(y + 0.1);
        extras.push(cross);
      } else {
        // Gnarled dead tree (no sprite)
        const trunkHeight = 20 + rand * 10;
        shadow = this.add.ellipse(x, y + 3, 15, 6, 0x000000, 0.2);
        shadow.setDepth(y - 1);
        visual = this.add.polygon(x, y, [
          -4, trunkHeight/2, -5, 0, -3, -trunkHeight/2, 
          -8, -trunkHeight * 0.7, -2, -trunkHeight * 0.6,
          0, -trunkHeight, 2, -trunkHeight * 0.6, 8, -trunkHeight * 0.7,
          3, -trunkHeight/2, 5, 0, 4, trunkHeight/2
        ], 0x3a2a1a, 1);
        visual.setDepth(y);
      }
    } else if (biome === 'cave') {
      // Cave - large stalagmites and crystal formations
      if (rand < 0.5) {
        const height = 25 + rand * 20;
        visual = this.add.polygon(x, y, [
          0, -height, -8, 0, -4, height/3, 4, height/3, 8, 0
        ], 0x5a5a6a, 1);
        visual.setDepth(y);
        // Darker base
        const base = this.add.polygon(x, y + height/3 - 2, [
          -6, -4, -4, 4, 4, 4, 6, -4
        ], 0x4a4a5a, 1);
        base.setDepth(y - 0.1);
        extras.push(base);
      } else {
        // Large crystal cluster
        const crystalColor = rand2 < 0.5 ? 0x7a7aaa : 0x5a9a9a;
        visual = this.add.polygon(x, y, [
          0, -25, -5, -10, -10, 0, -5, 5, 5, 5, 10, 0, 5, -10
        ], crystalColor, 0.9);
        visual.setDepth(y);
        // Glow effect
        const glow = this.add.circle(x, y - 12, 18, crystalColor, 0.15);
        glow.setDepth(y - 0.5);
        extras.push(glow);
      }
    } else if (biome === 'forge') {
      // Forge - volcanic rocks with lava cracks
      const rockSize = 20 + rand * 15;
      shadow = this.add.ellipse(x, y + rockSize * 0.15, rockSize * 0.9, rockSize * 0.3, 0x000000, 0.2);
      shadow.setDepth(y - 1);
      visual = this.add.ellipse(x, y - rockSize * 0.2, rockSize, rockSize * 0.65, 0x4a2a2a, 1);
      visual.setDepth(y);
      // Lava cracks
      for (let i = 0; i < 3; i++) {
        const crackX = x + (Math.random() - 0.5) * rockSize * 0.6;
        const crackY = y - rockSize * 0.2 + (Math.random() - 0.5) * rockSize * 0.4;
        const crack = this.add.ellipse(crackX, crackY, 3 + Math.random() * 4, 2, 0xff6b35, 0.8);
        crack.setDepth(y + 0.1);
        extras.push(crack);
      }
      // Smoke/heat shimmer
      const smoke = this.add.circle(x, y - rockSize * 0.5, 8, 0xff6b35, 0.1);
      smoke.setDepth(y + 0.2);
      extras.push(smoke);
    } else if (biome === 'sewer') {
      // Sewer - pipes and debris piles
      if (rand < 0.5) {
        // Large pipe
        const pipeWidth = 20 + rand * 10;
        shadow = this.add.ellipse(x, y + 3, pipeWidth * 0.8, 4, 0x000000, 0.15);
        shadow.setDepth(y - 1);
        visual = this.add.ellipse(x, y - 4, pipeWidth, 12, 0x5a5a5a, 1);
        visual.setDepth(y);
        // Pipe opening
        const opening = this.add.ellipse(x + pipeWidth * 0.4, y - 4, 6, 10, 0x2a2a2a, 1);
        opening.setDepth(y + 0.1);
        extras.push(opening);
      } else {
        // Debris pile
        const pileSize = 15 + rand * 10;
        shadow = this.add.ellipse(x, y + 2, pileSize, pileSize * 0.3, 0x000000, 0.15);
        shadow.setDepth(y - 1);
        visual = this.add.ellipse(x, y - pileSize * 0.15, pileSize, pileSize * 0.5, 0x4a4a4a, 1);
        visual.setDepth(y);
        // Debris items on top
        for (let i = 0; i < 3; i++) {
          const debrisX = x + (Math.random() - 0.5) * pileSize * 0.6;
          const debrisY = y - pileSize * 0.2 + (Math.random() - 0.5) * pileSize * 0.3;
          const debris = this.add.rectangle(debrisX, debrisY, 4 + Math.random() * 4, 3 + Math.random() * 3, 0x5a4a3a, 0.8);
          debris.setDepth(y + 0.1);
          extras.push(debris);
        }
      }
    } else if (biome === 'village') {
      return null;
    }

    // Fallback - medium rock
    if (!visual) {
      const rockSize = 12 + rand * 8;
      shadow = this.add.ellipse(x, y + 3, rockSize, rockSize * 0.3, 0x000000, 0.2);
      shadow.setDepth(y - 1);
      visual = this.add.ellipse(x, y - rockSize/4, rockSize, rockSize * 0.55, 0x6a6a6a, 1);
      visual.setDepth(y);
    }

    // Add collision
    const colliderSize = biome === 'forest' ? 20 : 18;
    const collider = this.add.rectangle(x, y + 4, colliderSize, colliderSize, 0x000000, 0);
    this.physics.add.existing(collider, true);
    this.obstacles.add(collider);

    return { visual, shadow, collider, extras };
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
    
    // Store reference for ignoring decorations/obstacles later
    this.minimapIgnoreList = [minimapBg];
  }
  
  // Add object to minimap ignore list (call for trees, decorations, etc)
  hideFromMinimap(obj) {
    if (!obj || !this.minimapCam) return;
    try {
      this.minimapCam.ignore(obj);
    } catch (e) {
      // Silently fail if object can't be ignored
    }
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
      if (!mob.hpBar || !mob.hpBarBg) return; // Safety check
      
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
        if (dir) {
          const wanderSpeed = data.speed * 0.3;
          mob.setVelocity(dir.x * wanderSpeed, dir.y * wanderSpeed);
        } else {
          mob.setVelocity(0, 0);
        }

        const idleAnim = spriteToIdle[data.sprite] || 'orc-idle';
        if (this.anims.exists(idleAnim)) {
          mob.play(idleAnim, true);
        }
        if (dir) mob.setFlipX(dir.x < 0);
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
