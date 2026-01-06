# Arcforge Shard (browser MMO slice)

A lightweight prototype of the high-fantasy MMO crafting world. Runs entirely in the browser with Phaser 3, using the Pixel Crawler free pack sprites already in `assets/`.

## Run it

1) From this folder start a local server (any static server works):

```bash
python3 -m http.server 8080
```

2) Visit http://localhost:8080 in your browser.

Phaser is pulled from a CDN; no build step is required.

## What’s implemented

- **Exploration:** Procedurally assembled 2D overworld with collision on walls/water, village clearing at the center, camera follow, 2x zoom.
- **Movement & combat:** WASD/arrow move, space to slash. Simple melee damage, aggro/wander AI for orcs, skeletons, and an elite brute variant. Respawn in the village on death.
- **Loot & XP:** Each mob has drop tables and XP rewards; pickups auto-add to inventory.
- **Crafting:** Stand near forge/tanner/alchemist (or your own placed stations) and press `C` to open recipes. Crafting consumes materials and finishes after a short timer.
- **Farming:** Sunroot plots south of the village; press `E` to plant seeds or harvest when ripe.
- **Land/plots:** Claim signposts near the village; costs coins. After owning, press `P` while standing on your plot to place a forge/tanner you crafted.
- **Inventory/overlay:** `I` opens inventory and plot info. HUD shows HP/stamina/coins/XP. Event log at bottom shows recent actions.

## Controls

- Move: WASD / Arrow keys
- Attack: Space
- Interact (plots/farming/stations): E
- Crafting panel: C (when a station is nearby)
- Inventory & plot list: I
- Place a crafted station on owned plot: P

## Data-driven pieces

- Item definitions: `src/data/items.js`
- Crafting recipes: `src/data/recipes.js`
- Mobs and drop tables: `src/data/mobs.js`
- Plot locations and prices: `src/data/plots.js`
- Biome tile picks: `src/data/biomes.js`

## Notes and next steps

- Hooking in real netcode/authoritative server: slot a socket layer for movement/combat and move crafting/loot validation server-side (Colyseus/Nakama fits).
- On-chain layer: expose a mint/burn API from the server for plot deeds (ERC-721) and later high-value items (ERC-1155). Client would request `mintPlot(plotId)` when purchase succeeds.
- Content: expand tile/biome variety, add dungeon instances, ranged combat, vendors, and more recipes. Tile art pulled from `assets/Pixel Crawler - Free Pack/...`; other packs in `assets/` are unused but ready.
- UX polish: add tooltips, better stamina/combat feedback, sound, and save/load persistence.
