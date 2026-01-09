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
const TILE = 32; // Display tile size (sprites are 16x16 and scaled 2x)
const WORLD_SIZE = 256; // tiles per side (can be much larger with chunks)
const VILLAGE_CENTER = { x: 128, y: 128 }; // Center of world
const VILLAGE_RADIUS = 18; // Safe zone radius in tiles
const PLAYER_SCALE = 1.0;
const MOB_SCALE = 1.0;
const LOG_LIMIT = 6;

// Ground tilesheet mapping by biome
const GROUND_SHEETS = {
  village: { key: 'tileset-floors', scale: 2 },
  meadow: { key: 'tileset-floors', scale: 2 },
  road: { key: 'tileset-floors', scale: 2 },
  forest: { key: 'tiles-forest', scale: 2 },
  desert: { key: 'tiles-desert-ground', scale: 2 },
  cemetery: { key: 'tiles-cemetery', scale: 2 },
  sewer: { key: 'tiles-sewer', scale: 2 },
  cave: { key: 'tiles-cave', scale: 2 },
  forge: { key: 'tiles-forge', scale: 2 },
  castle: { key: 'tiles-castle', scale: 2 },
  water: { key: 'tiles-water', scale: 2 },
};

const GROUND_FRAMES = {
  village: 0,
  meadow: 1,
  road: 2,
  forest: 3,
  desert: 4,
  cemetery: 5,
  sewer: 6,
  cave: 7,
  forge: 8,
  castle: 9,
  water: 0,
};

// Chunk-based loading system for performance
const CHUNK_SIZE = 12; // smaller chunks for better performance
const RENDER_DISTANCE = 2; // chunks to load in each direction
const MOBS_PER_CHUNK = 1; // max mobs spawned per chunk

// Hand-authored layout with clear zones and landmarks
const OVERWORLD_LAYOUT = {
  desert: { x1: 12, y1: 90, x2: 116, y2: 210 },
  southForest: { x1: 80, y1: 170, x2: 210, y2: 250 },
  northForest: { x1: 80, y1: 20, x2: 200, y2: 90 },
  cemetery: { x1: 120, y1: 30, x2: 170, y2: 70 },
  hideout: { x1: 130, y1: 6, x2: 170, y2: 24 },
  eastForest: { x1: 190, y1: 90, x2: 250, y2: 180 },
  castle: { x1: 205, y1: 110, x2: 240, y2: 150 },
};

const PATHS = [
  { from: VILLAGE_CENTER, to: { x: 60, y: 150 } }, // west / desert
  { from: VILLAGE_CENTER, to: { x: 130, y: 200 } }, // south forest / cave
  { from: VILLAGE_CENTER, to: { x: 130, y: 50 } }, // north forest / cemetery
  { from: { x: 130, y: 50 }, to: { x: 150, y: 18 } }, // up to hideout
  { from: VILLAGE_CENTER, to: { x: 215, y: 130 } }, // east forest / castle
];

const PORTALS = {
  cave: { x: 140, y: 210, radius: 4, scene: 'cave' },
  castle: { x: 220, y: 130, radius: 4, scene: 'castle' },
  hideout: { x: 150, y: 14, radius: 3, scene: 'hideout' },
};

function tileInRect(x, y, rect) {
  return x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
}

function tileOnPath(x, y) {
  // Simple point-to-point walkway lines with thickness
  for (const path of PATHS) {
    const dx = path.to.x - path.from.x;
    const dy = path.to.y - path.from.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    const t = ((x - path.from.x) * dx + (y - path.from.y) * dy) / lenSq;
    if (t < -0.05 || t > 1.05) continue;
    const projX = path.from.x + t * dx;
    const projY = path.from.y + t * dy;
    const dist = Math.hypot(x - projX, y - projY);
    if (dist < 2.2) return true;
  }
  return false;
}

function getBiomeAt(tileX, tileY) {
  const dx = tileX - VILLAGE_CENTER.x;
  const dy = tileY - VILLAGE_CENTER.y;
  const distFromCenter = Math.hypot(dx, dy);

  // Village core and outskirts
  if (distFromCenter < VILLAGE_RADIUS) return 'village';
  if (distFromCenter < VILLAGE_RADIUS + 4) return tileOnPath(tileX, tileY) ? 'road' : 'meadow';

  // Landmark regions
  if (tileOnPath(tileX, tileY)) return 'road';
  if (tileInRect(tileX, tileY, OVERWORLD_LAYOUT.cemetery)) return 'cemetery';
  if (tileInRect(tileX, tileY, OVERWORLD_LAYOUT.castle)) return 'castle';
  if (tileInRect(tileX, tileY, OVERWORLD_LAYOUT.hideout)) return 'forest';
  if (tileInRect(tileX, tileY, OVERWORLD_LAYOUT.desert)) return 'desert';
  if (tileInRect(tileX, tileY, OVERWORLD_LAYOUT.southForest)) return 'forest';
  if (tileInRect(tileX, tileY, OVERWORLD_LAYOUT.northForest)) return 'forest';
  if (tileInRect(tileX, tileY, OVERWORLD_LAYOUT.eastForest)) return 'forest';

  // Edge water to frame the world lightly
  if (tileX < 6 || tileY < 6 || tileX > WORLD_SIZE - 6 || tileY > WORLD_SIZE - 6) return 'water';

  return 'meadow';
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
    <div class="stat-line keybinds">Move: WASD · Attack: Space · Interact: E · Craft: C · Inventory: I · Map: M</div>
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

    // Floor tilesets - 16x16 pixel tiles (we scale to 32 in-game)
    this.load.spritesheet('tileset-floors', `${envBase}/Tilesets/Floors_Tiles.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tileset-walls', `${envBase}/Tilesets/Wall_Tiles.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-water', `${envBase}/Tilesets/Water_tiles.png`, { frameWidth: 16, frameHeight: 16 });

    // Biome ground tiles
    this.load.spritesheet('tiles-forest', 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tiles.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-desert-ground', 'assets/Pixel Crawler - Desert/Assets/Ground.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-desert-sand', 'assets/Pixel Crawler - Desert/Assets/Sand.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-cemetery', 'assets/Pixel Crawler - Cemetery/Environment/TileSets/Tiles.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-sewer', 'assets/Pixel Crawler - Sewer/Assets/Tiles.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-cave', 'assets/Pixel Crawler - Cave/Assets/Tiles.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-forge', 'assets/Pixel Crawler - Forge/Assets/Tiles.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tiles-castle', 'assets/Pixel Crawler - Castle Environment 0.3/Assets/Tiles.png', { frameWidth: 16, frameHeight: 16 });
    
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
    
    // Biome-specific prop sheets (16x16 tiles, we scale up)
    this.load.spritesheet('props-forest-full', 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-desert-full', 'assets/Pixel Crawler - Desert/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-cave-full', 'assets/Pixel Crawler - Cave/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-sewer-full', 'assets/Pixel Crawler - Sewer/Assets/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-cemetery-full', 'assets/Pixel Crawler - Cemetery/Environment/Props/Props.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('props-graves-full', 'assets/Pixel Crawler - Cemetery/Environment/Props/Graves.png', { frameWidth: 16, frameHeight: 16 });
    
    // Shadows for props
    this.load.image('shadows', `${envBase}/Props/Static/Shadows.png`);

    // Forest-specific large tree - using Phaser's native Aseprite support
    // Phaser can load Aseprite animations directly if you export JSON from Aseprite
    // To export: Open Tree.aseprite > File > Export Sprite Sheet > Check "JSON Data"
    // This will create Tree.json with frame metadata
    const treeJsonPath = 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tree.json';
    const treePngPath = 'assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tree.png';
    
    // Load as Aseprite atlas (will work if Tree.json exists)
    // If JSON doesn't exist, Phaser will fail to load this, so we also load as fallback spritesheet
    this.load.aseprite('tree-forest-atlas', treePngPath, treeJsonPath);
    
    // Fallback: manual spritesheet if JSON not available (frame size is estimated)
    this.load.spritesheet('tree-forest-sheet', treePngPath, { 
      frameWidth: 156, 
      frameHeight: 208 
    });
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
      this.createMapButton();

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
      this.events.on('resume', (_scene, data) => {
        if (data?.returnPosition) {
          this.player.setPosition(data.returnPosition.x, data.returnPosition.y);
          this.physics.world.resume();
          this.updateChunks(true);
        }
      });

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

        let biome = getBiomeAt(worldTileX, worldTileY);

        const px = worldTileX * TILE;
        const py = worldTileY * TILE;

        // Store terrain data
        if (!this.terrainData[worldTileY]) this.terrainData[worldTileY] = [];
        this.terrainData[worldTileY][worldTileX] = { biome };

        // Draw rich textured ground
        this.drawRichGround(graphics, px, py, worldTileX, worldTileY, biome, chunkData);

        // Portal markers (visible cues)
        Object.values(PORTALS).forEach((portal) => {
          if (Math.abs(worldTileX - portal.x) < 1 && Math.abs(worldTileY - portal.y) < 1) {
            const marker = this.add.circle(px + TILE / 2, py + TILE / 2, TILE * 0.6, 0x5de6c2, 0.25);
            marker.setStrokeStyle(2, 0x9af5ff, 0.7);
            marker.setDepth(1);
            chunkData.decorations.push(marker);
          }
        });

        // Water collision
        if (biome === 'water') {
          const waterRect = this.add.rectangle(px + TILE/2, py + TILE/2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(waterRect, true);
          this.waterBodies.add(waterRect);
          chunkData.waterColliders.push(waterRect);
        }
      }
    }

    // Skip ground details and mid-level props for performance
    // Only render trees/obstacles (fourth pass below)

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
        const tileBiome = this.terrainData[Math.floor(mobY / TILE)]?.[Math.floor(mobX / TILE)]?.biome;
        if (tileBiome === 'village' || tileBiome === 'road' || tileBiome === 'castle') continue;
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
    const variation = (noiseVal - 0.5) * 0.15;
    
    const baseColor = Phaser.Display.Color.IntegerToColor(colors.ground);
    const r = Math.max(0, Math.min(255, Math.floor(baseColor.red * (1 + variation))));
    const g = Math.max(0, Math.min(255, Math.floor(baseColor.green * (1 + variation))));
    const b = Math.max(0, Math.min(255, Math.floor(baseColor.blue * (1 + variation))));
    
    graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
    graphics.fillRect(px, py, TILE, TILE);

    // Overlay an actual ground tile frame from the biome sheet
    const sheet = GROUND_SHEETS[biome] || GROUND_SHEETS.meadow;
    if (sheet && this.textures.exists(sheet.key)) {
      const tex = this.textures.get(sheet.key);
      const baseFrame = GROUND_FRAMES[biome] ?? 0;
      const totalFrames = Math.max(1, tex.frameTotal - 1);
      const frameIdx = Math.min(totalFrames - 1, baseFrame);
      const sprite = this.add.image(px + TILE / 2, py + TILE / 2, sheet.key, frameIdx);
      const scale = sheet.scale || 2;
      sprite.setDisplaySize(TILE, TILE);
      sprite.setDepth(0.05);
      chunkData.tiles.push(sprite);
    }

    // Add subtle texture pattern based on biome
    const patternRand = seededRandom(tileX * 500 + tileY + this.worldSeed);
    
    if (biome === 'forest' || biome === 'meadow') {
      // Grass texture - small darker patches
      for (let i = 0; i < 2; i++) {
        const ox = (seededRandom(tileX * 100 + tileY * 10 + i + this.worldSeed) * TILE) | 0;
        const oy = (seededRandom(tileX * 10 + tileY * 100 + i + this.worldSeed) * TILE) | 0;
        const size = 3 + patternRand * 4;
        graphics.fillStyle(colors.accent || colors.ground, 0.25);
        graphics.fillEllipse(px + ox, py + oy, size, size * 0.6);
      }
    } else if (biome === 'desert') {
      // Sand ripples
      if (patternRand < 0.3) {
        graphics.lineStyle(1, 0xc4913a, 0.15);
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
    if (biome === 'village' || biome === 'road' || biome === 'castle') return false;
    // Very sparse for performance
    const baseDensity = {
      forest: 0.015,
      meadow: 0.004,
      cemetery: 0.006,
      cave: 0.005,
      forge: 0.003,
      sewer: 0.003,
      desert: 0.002,
    }[biome] || 0.003;
    
    // Use perlin noise for natural clustering
    const clusterNoise = perlinNoise(tileX * 0.12, tileY * 0.12, 2, 0.5, this.worldSeed + 7777);
    const detailNoise = seededRandom(tileX * 9999 + tileY + this.worldSeed);
    
    const threshold = baseDensity * (0.4 + clusterNoise * 0.8);
    return detailNoise < threshold;
  }

  // Mid-level biome-specific props (bushes, plants, rocks)
  addBiomeProp(px, py, tileX, tileY, biome, chunkData) {
    if (biome === 'road' || biome === 'village' || biome === 'castle') return;
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

    // Remove mobs and their HP bars
    chunkData.mobs.forEach(mob => {
      if (mob) {
        const idx = this.mobs.indexOf(mob);
        if (idx > -1) this.mobs.splice(idx, 1);
        // Destroy HP bars first
        if (mob.hpBar) mob.hpBar.destroy();
        if (mob.hpBarBg) mob.hpBarBg.destroy();
        if (mob.destroy) mob.destroy();
      }
    });

    this.chunks.delete(key);
    this.loadedChunks.delete(key);
  }


  spawnMobAt(x, y) {
    // Get biome at position
    const tileX = Math.floor(x / TILE);
    const tileY = Math.floor(y / TILE);
    const biome = getBiomeAt(tileX, tileY);

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
    const rand4 = seededRandom(tileX * 1111 + tileY * 23 + this.worldSeed + 1500);
    const rand5 = seededRandom(tileX * 2222 + tileY * 29 + this.worldSeed + 2000);
    let shadow = null;
    let extras = [];
    
    // Add organic position offset (up to half a tile in any direction)
    const offsetX = (rand4 - 0.5) * TILE * 0.7;
    const offsetY = (rand5 - 0.5) * TILE * 0.5;
    const actualX = x + offsetX;
    const actualY = y + offsetY;

    if (biome === 'forest') {
      // Use perlin noise to determine tree FAMILY for this region (creates consistent groves)
      const regionNoise = perlinNoise(tileX * 0.08, tileY * 0.08, 2, 0.5, this.worldSeed + 3333);
      const treeFamily = Math.floor(regionNoise * 3) + 1; // 1, 2, or 3
      const treeKey = `tree-${treeFamily}-medium`;
      
      // Occasional fairy tree in glades - prefer Aseprite atlas if available, else use spritesheet
      if (rand < 0.08) {
        let treeKey = null;
        let frameIndex = null;
        
        // Check if Aseprite atlas loaded successfully (Tree.json was exported)
        if (this.textures.exists('tree-forest-atlas')) {
          treeKey = 'tree-forest-atlas';
          const texture = this.textures.get('tree-forest-atlas');
          // Aseprite atlases have named frames, get all frame names and pick random
          const frameNames = texture.getFrameNames();
          if (frameNames.length > 0) {
            frameIndex = frameNames[Math.floor(Math.random() * frameNames.length)];
          } else {
            // Fallback to frame index if no named frames
            frameIndex = Math.floor(Math.random() * texture.frameTotal);
          }
        } else if (this.textures.exists('tree-forest-sheet')) {
          // Fallback to manual spritesheet
          treeKey = 'tree-forest-sheet';
          const texture = this.textures.get('tree-forest-sheet');
          frameIndex = Math.floor(Math.random() * texture.frameTotal);
        }
        
        if (treeKey) {
          const scale = 0.28 + rand2 * 0.12;
          shadow = this.add.ellipse(actualX, actualY + 15, 40 * scale, 16 * scale, 0x000000, 0.3);
          shadow.setDepth(actualY - 1);
          visual = this.add.sprite(actualX, actualY, treeKey, frameIndex);
          visual.setScale(scale);
          visual.setOrigin(0.5, 0.95);
          visual.setDepth(actualY);
          visual.setFlipX(rand3 > 0.5);
        }
      } else if (this.textures.exists(treeKey)) {
        // Use consistent tree family with size variation only
        const scale = 0.35 + rand2 * 0.18; // Size variation within same type
        shadow = this.add.ellipse(actualX, actualY + 12, 28 * scale, 11 * scale, 0x000000, 0.25);
        shadow.setDepth(actualY - 1);
        visual = this.add.sprite(actualX, actualY, treeKey);
        visual.setScale(scale);
        visual.setOrigin(0.5, 0.95);
        visual.setDepth(actualY);
        visual.setFlipX(rand3 > 0.5);
      }
    } else if (biome === 'meadow') {
      // Meadow - sparse small trees or bushes
      if (rand < 0.7) {
        // Use same tree family concept for meadow
        const regionNoise = perlinNoise(tileX * 0.1, tileY * 0.1, 2, 0.5, this.worldSeed + 4444);
        const treeFamily = Math.floor(regionNoise * 3) + 1;
        const treeKey = `tree-${treeFamily}-small`;
        const scale = 0.28 + rand2 * 0.12;
        
        if (this.textures.exists(treeKey)) {
          shadow = this.add.ellipse(actualX, actualY + 8, 20 * scale, 8 * scale, 0x000000, 0.2);
          shadow.setDepth(actualY - 1);
          visual = this.add.sprite(actualX, actualY, treeKey);
          visual.setScale(scale);
          visual.setOrigin(0.5, 0.95);
          visual.setDepth(actualY);
          visual.setFlipX(rand3 > 0.5);
        }
      } else {
        // Simple bush (no flowers for performance)
        const bushSize = 12 + rand * 8;
        shadow = this.add.ellipse(actualX, actualY + bushSize * 0.2, bushSize * 0.7, bushSize * 0.2, 0x000000, 0.15);
        shadow.setDepth(actualY - 1);
        visual = this.add.ellipse(actualX, actualY - bushSize * 0.1, bushSize, bushSize * 0.6, 0x4a8c3f, 1);
        visual.setDepth(actualY);
      }
    } else if (biome === 'desert') {
      // Desert - use props sheet for cacti/bones/ruins
      if (this.textures.exists('props-desert-full')) {
        const tex = this.textures.get('props-desert-full');
        const totalFrames = Math.max(1, tex.frameTotal - 1);
        // Bias to earlier frames which tend to be small props
        const frameIdx = Math.floor(rand * Math.min(totalFrames, 80));
        shadow = this.add.ellipse(actualX, actualY + 6, 18, 8, 0x000000, 0.18);
        shadow.setDepth(actualY - 1);
        visual = this.add.sprite(actualX, actualY, 'props-desert-full', frameIdx);
        visual.setOrigin(0.5, 0.8);
        visual.setScale(2);
        visual.setDepth(actualY);
      } else {
        // Fallback simple cactus
        const height = 25 + rand * 15;
        shadow = this.add.ellipse(actualX, actualY + 3, 12, 5, 0x000000, 0.15);
        shadow.setDepth(actualY - 1);
        visual = this.add.rectangle(actualX, actualY - height/2, 8, height, 0x2d8659, 1);
        visual.setDepth(actualY);
      }
    } else if (biome === 'cemetery') {
      // Cemetery - graves, monuments, sparse dead trees
      if (this.textures.exists('props-graves-full') && rand < 0.55) {
        const tex = this.textures.get('props-graves-full');
        const totalFrames = Math.max(1, tex.frameTotal - 1);
        const frameIdx = Math.floor(rand * Math.min(totalFrames, 50));
        shadow = this.add.ellipse(actualX, actualY + 4, 14, 6, 0x000000, 0.2);
        shadow.setDepth(actualY - 1);
        visual = this.add.sprite(actualX, actualY, 'props-graves-full', frameIdx);
        visual.setOrigin(0.5, 0.9);
        visual.setScale(2);
        visual.setDepth(actualY);
      } else if (rand < 0.75 && this.textures.exists('tree-cemetery')) {
        const scale = 0.3 + rand2 * 0.15;
        shadow = this.add.ellipse(actualX, actualY + 10, 30 * scale, 12 * scale, 0x000000, 0.25);
        shadow.setDepth(actualY - 1);
        visual = this.add.sprite(actualX, actualY, 'tree-cemetery');
        visual.setScale(scale);
        visual.setOrigin(0.5, 0.95);
        visual.setDepth(actualY);
        visual.setFlipX(rand3 > 0.5);
      } else if (rand < 0.9) {
        // Large gravestone monument
        const height = 24 + rand * 12;
        shadow = this.add.ellipse(actualX, actualY + 3, 14, 5, 0x000000, 0.2);
        shadow.setDepth(actualY - 1);
        visual = this.add.polygon(actualX, actualY, [
          -8, height/2, -8, -height/3, -5, -height/2, 5, -height/2, 8, -height/3, 8, height/2
        ], 0x5a5a6a, 1);
        visual.setDepth(actualY);
        // Cross or decoration on top
        const cross = this.add.polygon(actualX, actualY - height/2 - 4, [
          -2, 4, -2, 0, -5, 0, -5, -2, -2, -2, -2, -6, 2, -6, 2, -2, 5, -2, 5, 0, 2, 0, 2, 4
        ], 0x4a4a5a, 1);
        cross.setDepth(actualY + 0.1);
        extras.push(cross);
      } else {
        // Gnarled dead tree (no sprite)
        const trunkHeight = 20 + rand * 10;
        shadow = this.add.ellipse(actualX, actualY + 3, 15, 6, 0x000000, 0.2);
        shadow.setDepth(actualY - 1);
        visual = this.add.polygon(actualX, actualY, [
          -4, trunkHeight/2, -5, 0, -3, -trunkHeight/2, 
          -8, -trunkHeight * 0.7, -2, -trunkHeight * 0.6,
          0, -trunkHeight, 2, -trunkHeight * 0.6, 8, -trunkHeight * 0.7,
          3, -trunkHeight/2, 5, 0, 4, trunkHeight/2
        ], 0x3a2a1a, 1);
        visual.setDepth(actualY);
      }
    } else if (biome === 'cave') {
      // Cave - large stalagmites and crystal formations
      if (rand < 0.5) {
        const height = 25 + rand * 20;
        visual = this.add.polygon(actualX, actualY, [
          0, -height, -8, 0, -4, height/3, 4, height/3, 8, 0
        ], 0x5a5a6a, 1);
        visual.setDepth(actualY);
        // Darker base
        const base = this.add.polygon(actualX, actualY + height/3 - 2, [
          -6, -4, -4, 4, 4, 4, 6, -4
        ], 0x4a4a5a, 1);
        base.setDepth(actualY - 0.1);
        extras.push(base);
      } else {
        // Large crystal cluster
        const crystalColor = rand2 < 0.5 ? 0x7a7aaa : 0x5a9a9a;
        visual = this.add.polygon(actualX, actualY, [
          0, -25, -5, -10, -10, 0, -5, 5, 5, 5, 10, 0, 5, -10
        ], crystalColor, 0.9);
        visual.setDepth(actualY);
        // Glow effect
        const glow = this.add.circle(actualX, actualY - 12, 18, crystalColor, 0.15);
        glow.setDepth(actualY - 0.5);
        extras.push(glow);
      }
    } else if (biome === 'forge') {
      // Forge - volcanic rocks with lava cracks
      const rockSize = 20 + rand * 15;
      shadow = this.add.ellipse(actualX, actualY + rockSize * 0.15, rockSize * 0.9, rockSize * 0.3, 0x000000, 0.2);
      shadow.setDepth(actualY - 1);
      visual = this.add.ellipse(actualX, actualY - rockSize * 0.2, rockSize, rockSize * 0.65, 0x4a2a2a, 1);
      visual.setDepth(actualY);
      // Lava cracks (seeded positions)
      for (let i = 0; i < 3; i++) {
        const crackX = actualX + (seededRandom(tileX * 50 + i + this.worldSeed) - 0.5) * rockSize * 0.6;
        const crackY = actualY - rockSize * 0.2 + (seededRandom(tileY * 50 + i + this.worldSeed) - 0.5) * rockSize * 0.4;
        const crack = this.add.ellipse(crackX, crackY, 3 + rand2 * 4, 2, 0xff6b35, 0.8);
        crack.setDepth(actualY + 0.1);
        extras.push(crack);
      }
      // Smoke/heat shimmer
      const smoke = this.add.circle(actualX, actualY - rockSize * 0.5, 8, 0xff6b35, 0.1);
      smoke.setDepth(actualY + 0.2);
      extras.push(smoke);
    } else if (biome === 'sewer') {
      // Sewer - pipes and debris piles
      if (rand < 0.5) {
        // Large pipe
        const pipeWidth = 20 + rand * 10;
        shadow = this.add.ellipse(actualX, actualY + 3, pipeWidth * 0.8, 4, 0x000000, 0.15);
        shadow.setDepth(actualY - 1);
        visual = this.add.ellipse(actualX, actualY - 4, pipeWidth, 12, 0x5a5a5a, 1);
        visual.setDepth(actualY);
        // Pipe opening
        const opening = this.add.ellipse(actualX + pipeWidth * 0.4, actualY - 4, 6, 10, 0x2a2a2a, 1);
        opening.setDepth(actualY + 0.1);
        extras.push(opening);
      } else {
        // Debris pile
        const pileSize = 15 + rand * 10;
        shadow = this.add.ellipse(actualX, actualY + 2, pileSize, pileSize * 0.3, 0x000000, 0.15);
        shadow.setDepth(actualY - 1);
        visual = this.add.ellipse(actualX, actualY - pileSize * 0.15, pileSize, pileSize * 0.5, 0x4a4a4a, 1);
        visual.setDepth(actualY);
        // Debris items on top (seeded positions)
        for (let i = 0; i < 3; i++) {
          const debrisX = actualX + (seededRandom(tileX * 60 + i + this.worldSeed) - 0.5) * pileSize * 0.6;
          const debrisY = actualY - pileSize * 0.2 + (seededRandom(tileY * 60 + i + this.worldSeed) - 0.5) * pileSize * 0.3;
          const debris = this.add.rectangle(debrisX, debrisY, 4 + rand2 * 4, 3 + rand3 * 3, 0x5a4a3a, 0.8);
          debris.setDepth(actualY + 0.1);
          extras.push(debris);
        }
      }
    } else if (biome === 'village') {
      return null;
    }

    // Fallback - medium rock
    if (!visual) {
      const rockSize = 12 + rand * 8;
      shadow = this.add.ellipse(actualX, actualY + 3, rockSize, rockSize * 0.3, 0x000000, 0.2);
      shadow.setDepth(actualY - 1);
      visual = this.add.ellipse(actualX, actualY - rockSize/4, rockSize, rockSize * 0.55, 0x6a6a6a, 1);
      visual.setDepth(actualY);
    }

    // Add collision at actual position
    const colliderSize = biome === 'forest' ? 20 : 18;
    const collider = this.add.rectangle(actualX, actualY + 4, colliderSize, colliderSize, 0x000000, 0);
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
    const graphics = this.add.graphics();
    graphics.setDepth(1);

    // === VILLAGE GROUND ===
    // Main village square - packed dirt
    graphics.fillStyle(0xc4a574, 1);
    graphics.fillRect(centerX - TILE * 8, centerY - TILE * 8, TILE * 16, TILE * 16);
    
    // Cobblestone paths
    graphics.fillStyle(0x8b8b8b, 0.8);
    // Main crossroads
    for (let i = -8; i <= 8; i++) {
      graphics.fillRect(centerX - TILE * 1.5, centerY + i * TILE, TILE * 3, TILE);
      graphics.fillRect(centerX + i * TILE, centerY - TILE * 1.5, TILE, TILE * 3);
    }

    // === CENTRAL WELL ===
    graphics.fillStyle(0x5a5a6a, 1);
    graphics.fillCircle(centerX, centerY, 18);
    graphics.fillStyle(0x3498db, 0.8);
    graphics.fillCircle(centerX, centerY, 10);
    graphics.lineStyle(3, 0x4a3728);
    graphics.strokeCircle(centerX, centerY, 18);
    
    const well = this.add.rectangle(centerX, centerY, 36, 36, 0x000000, 0);
    this.physics.add.existing(well, true);
    this.obstacles.add(well);

    // === SINGLE FORGE (not a grid of them) ===
    this.addStation({
      x: centerX - TILE * 4,
      y: centerY - TILE * 3,
      type: 'forge',
      label: 'Village Forge'
    });

    // === TANNER STATION ===
    this.addStation({
      x: centerX + TILE * 4,
      y: centerY - TILE * 3,
      type: 'tanner',
      label: 'Tanner'
    });

    // === ALCHEMIST STATION ===
    this.addStation({
      x: centerX,
      y: centerY + TILE * 5,
      type: 'alchemist',
      label: 'Alchemist'
    });

    // === SHOP BUILDINGS (simplified - 4 shops in corners) ===
    const shopLayout = [
      { id: 'weapons', x: -6, y: -6, name: 'Blade & Bow' },
      { id: 'armor', x: 6, y: -6, name: 'Iron Ward Armory' },
      { id: 'potions', x: -6, y: 6, name: 'The Bubbling Cauldron' },
      { id: 'general', x: 6, y: 6, name: 'The Trading Post' },
    ];

    shopLayout.forEach(layout => {
      const shop = shops[layout.id];
      if (!shop) return;
      const shopX = centerX + layout.x * TILE;
      const shopY = centerY + layout.y * TILE;
      
      this.createShopBuilding(shopX, shopY, { ...shop, name: layout.name });
      this.createShopNPC(shopX, shopY + 35, layout.id, shop);
    });

    // === KEY NPCS ===
    // Elder in the center-north area
    this.createNPC(centerX, centerY - TILE * 5, 'lore_keeper', 'Elder Thane', 'wizard');
    // Guard near the forge
    this.createNPC(centerX + TILE * 2, centerY, 'guard', 'Guard Captain', 'knight');

    // === DECORATIVE TREES (just a few, placed intentionally) ===
    const villageTrees = [
      { x: -7, y: -2 }, { x: 7, y: -2 }, // Flanking paths
      { x: -7, y: 3 }, { x: 7, y: 3 },
      { x: 0, y: -7 }, // Near elder
    ];
    
    villageTrees.forEach(pos => {
      const tx = centerX + pos.x * TILE;
      const ty = centerY + pos.y * TILE;
      if (this.textures.exists('tree-1-small')) {
        const tree = this.add.sprite(tx, ty, 'tree-1-small');
        tree.setScale(0.35);
        tree.setOrigin(0.5, 0.95);
        tree.setDepth(ty);
        this.hideFromMinimap(tree);
        
        // Tree collision
        const treeCol = this.add.rectangle(tx, ty + 5, 16, 16, 0x000000, 0);
        this.physics.add.existing(treeCol, true);
        this.obstacles.add(treeCol);
      }
    });
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
      const tileBiome = getBiomeAt(x, y);
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
  
  createMapButton() {
    // Map hint in top-right corner
    const hintX = this.cameras.main.width - 60;
    const hintY = 25;
    
    const mapHintBg = this.add.rectangle(hintX, hintY, 80, 28, 0x0a0c16, 0.85);
    mapHintBg.setScrollFactor(0);
    mapHintBg.setDepth(100);
    mapHintBg.setStrokeStyle(1, 0x7af5d7, 0.6);
    mapHintBg.setInteractive({ useHandCursor: true });
    
    const mapHintLabel = this.add.text(hintX, hintY, '[M] Map', {
      fontSize: '12px',
      color: '#7af5d7',
      fontFamily: 'Cinzel',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    
    mapHintBg.on('pointerdown', () => this.toggleWorldMap());
    
    // Store reference
    this.mapHint = { bg: mapHintBg, label: mapHintLabel };
    this.mapOpen = false;
    this.mapOverlay = null;
  }
  
  toggleWorldMap() {
    if (this.mapOpen) {
      this.closeWorldMap();
    } else {
      this.openWorldMap();
    }
  }
  
  openWorldMap() {
    if (this.mapOpen) return;
    this.mapOpen = true;
    
    const camWidth = this.cameras.main.width;
    const camHeight = this.cameras.main.height;
    const mapSize = Math.min(camWidth, camHeight) - 100;
    const centerX = camWidth / 2;
    const centerY = camHeight / 2;
    
    // Full screen dark overlay - completely opaque to hide game world
    const overlay = this.add.rectangle(centerX, centerY, camWidth * 3, camHeight * 3, 0x0a0a12, 1);
    overlay.setScrollFactor(0).setDepth(20000);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.closeWorldMap());
    
    // Map container background
    const mapBg = this.add.rectangle(centerX, centerY, mapSize + 16, mapSize + 16, 0x1a1a2e, 1);
    mapBg.setScrollFactor(0).setDepth(20010);
    mapBg.setStrokeStyle(3, 0x7af5d7, 1);
    
    // Map title
    const title = this.add.text(centerX, centerY - mapSize/2 - 25, 'WORLD MAP', {
      fontSize: '20px',
      color: '#ffd66b',
      fontFamily: 'Cinzel',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20020);
    
    // Create a render texture for the map itself
    const mapStartX = centerX - mapSize/2;
    const mapStartY = centerY - mapSize/2;
    
    // Draw the actual map (simplified terrain view)
    const mapGraphics = this.add.graphics();
    mapGraphics.setScrollFactor(0).setDepth(20015);
    
    const tileSize = mapSize / WORLD_SIZE;
    
    // Draw terrain colors
    for (let y = 0; y < WORLD_SIZE; y += 2) {
      for (let x = 0; x < WORLD_SIZE; x += 2) {
        const biome = this.terrainData[y]?.[x]?.biome || 'meadow';
        const colors = {
          village: 0xc4a574,
          meadow: 0x5a8c4a,
          forest: 0x2d5a2d,
          desert: 0xc4a060,
          cemetery: 0x4a4a5a,
          cave: 0x3a3a4a,
          forge: 0x5a3a2a,
          sewer: 0x4a5a4a,
          water: 0x3498db,
        };
        mapGraphics.fillStyle(colors[biome] || 0x5a8c4a, 1);
        mapGraphics.fillRect(mapStartX + x * tileSize, mapStartY + y * tileSize, tileSize * 2 + 1, tileSize * 2 + 1);
      }
    }
    
    // Player marker (red dot with white outline)
    const playerMapX = mapStartX + (this.player.x / TILE) * tileSize;
    const playerMapY = mapStartY + (this.player.y / TILE) * tileSize;
    mapGraphics.lineStyle(3, 0xffffff, 1);
    mapGraphics.strokeCircle(playerMapX, playerMapY, 8);
    mapGraphics.fillStyle(0xff3333, 1);
    mapGraphics.fillCircle(playerMapX, playerMapY, 6);
    
    // Village marker (gold square)
    const villageMapX = mapStartX + VILLAGE_CENTER.x * tileSize;
    const villageMapY = mapStartY + VILLAGE_CENTER.y * tileSize;
    mapGraphics.lineStyle(2, 0xffffff, 1);
    mapGraphics.strokeRect(villageMapX - 5, villageMapY - 5, 10, 10);
    mapGraphics.fillStyle(0xffd66b, 1);
    mapGraphics.fillRect(villageMapX - 4, villageMapY - 4, 8, 8);
    
    // Legend
    const legendY = centerY + mapSize/2 + 20;
    const legendText = this.add.text(centerX, legendY, '● You    ■ Village    Click or [M] to close', {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: 'Crimson Text',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20020);
    
    // Store references for cleanup
    this.mapOverlay = { overlay, mapBg, title, mapGraphics, legendText };
  }
  
  closeWorldMap() {
    if (!this.mapOpen || !this.mapOverlay) return;
    this.mapOpen = false;
    
    // Destroy all map elements
    this.mapOverlay.overlay.destroy();
    this.mapOverlay.mapBg.destroy();
    this.mapOverlay.title.destroy();
    this.mapOverlay.mapGraphics.destroy();
    this.mapOverlay.legendText.destroy();
    this.mapOverlay = null;
  }
  
  // No-op now that minimap is removed - keep for compatibility
  hideFromMinimap(obj) {
    // No longer needed - world map renders on demand
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
      M: Phaser.Input.Keyboard.KeyCodes.M,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    
    this.keys.I.on('down', () => renderInventoryPanel());
    this.keys.M.on('down', () => this.toggleWorldMap());
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
    // Portals to interiors (cave, castle, hideout)
    if (this.checkPortals()) return;

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

  checkPortals() {
    const p = this.player;
    if (!p) return false;
    for (const key of Object.keys(PORTALS)) {
      const portal = PORTALS[key];
      const dist = Phaser.Math.Distance.Between(p.x / TILE, p.y / TILE, portal.x, portal.y);
      if (dist < portal.radius) {
        if (this.portalCooldown && this.time.now < this.portalCooldown) return true;
        this.portalCooldown = this.time.now + 1000;
        this.scene.pause();
        this.scene.launch(portal.scene, { returnScene: 'main', returnPosition: { x: p.x, y: p.y } });
        this.scene.bringToTop(portal.scene);
        logEvent(`Entering ${key}...`);
        return true;
      }
    }
    return false;
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

// Simple interior base for contained dungeons/hideouts
class InteriorScene extends Phaser.Scene {
  constructor(key, sheetKey, biome = 'cave') {
    super({ key });
    this.sheetKey = sheetKey;
    this.biome = biome;
  }

  create(data) {
    this.returnScene = data?.returnScene || 'main';
    this.returnPosition = data?.returnPosition;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      E: Phaser.Input.Keyboard.KeyCodes.E,
    });

    // Background tiling
    const width = 40 * TILE;
    const height = 30 * TILE;
    const tileSprite = this.add.tileSprite(width / 2, height / 2, width, height, this.sheetKey, 0);
    tileSprite.setDisplaySize(width, height);

    // Some props for flavor
    this.addInteriorProps(width, height);

    // Player (spawn a few tiles away from exit zone)
    this.player = this.physics.add.sprite(width / 2, height - TILE * 6, 'player-run-down');
    this.player.setScale(PLAYER_SCALE);
    this.player.setSize(20, 24).setOffset(22, 28);
    this.player.direction = 'up';

    // Exit zone near entrance (press E to exit)
    this.exitZone = this.add.rectangle(width / 2, height - TILE * 1.5, TILE * 2, TILE * 2, 0x00ff00, 0.2);
    this.physics.add.existing(this.exitZone, true);

    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  addInteriorProps(width, height) {
    const props = [
      { key: 'props-cave-full', count: 8, area: { x1: 4, y1: 4, x2: width / TILE - 4, y2: height / TILE - 8 }, scale: 2 },
      { key: 'props-forest-full', count: 4, area: { x1: 6, y1: 6, x2: width / TILE - 6, y2: height / TILE - 10 }, scale: 2 },
    ];
    props.forEach((p) => {
      if (!this.textures.exists(p.key)) return;
      const tex = this.textures.get(p.key);
      const totalFrames = Math.max(1, tex.frameTotal - 1);
      for (let i = 0; i < p.count; i++) {
        const x = Phaser.Math.Between(p.area.x1, p.area.x2) * TILE;
        const y = Phaser.Math.Between(p.area.y1, p.area.y2) * TILE;
        const frame = Phaser.Math.Between(0, totalFrames - 1);
        const sprite = this.add.sprite(x, y, p.key, frame);
        sprite.setScale(p.scale || 2);
        sprite.setOrigin(0.5, 0.8);
        sprite.setDepth(y);
      }
    });
  }

  update() {
    if (!this.player) return;
    const speed = 110;
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
      const anim = this.player.direction === 'up' ? 'player-run-up' : this.player.direction === 'down' ? 'player-run-down' : 'player-run-side';
      this.player.play(anim, true);
      this.player.setFlipX(this.player.direction === 'left');
    } else {
      this.player.stop();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitZone.x, this.exitZone.y);
      if (dist < TILE * 2.5) this.exitInterior();
    }
  }

  exitInterior() {
    this.scene.stop();
    this.scene.resume(this.returnScene, { returnPosition: this.returnPosition || { x: VILLAGE_CENTER.x * TILE, y: VILLAGE_CENTER.y * TILE } });
  }
}

class CaveScene extends InteriorScene {
  constructor() {
    super('cave', 'tiles-cave', 'cave');
  }
}

class CastleScene extends InteriorScene {
  constructor() {
    super('castle', 'tiles-castle', 'castle');
  }
}

class HideoutScene extends InteriorScene {
  constructor() {
    super('hideout', 'tiles-forest', 'forest');
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
  scene: [BootScene, MainScene, CaveScene, CastleScene, HideoutScene],
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
