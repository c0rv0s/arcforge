# How to Export Aseprite JSON for Phaser

Phaser 3 has native support for Aseprite files, but you need to export the JSON metadata file from Aseprite.

## Steps to Export Tree.json

1. **Open Aseprite** and open the file:
   ```
   assets/Pixel Crawler - Fairy Forest 1.7/Assets/Tree.aseprite
   ```

2. **Go to File > Export Sprite Sheet** (or press `Ctrl+Shift+E` / `Cmd+Shift+E`)

3. **Configure Export Settings:**

   **Layout Tab:**
   - Sheet type: "Packed" or "Horizontal" or "Vertical" (whatever matches your current layout)
   - Constraints: "None"
   - Check "Merge Duplicates" if available

   **Sprite Tab:**
   - Layers: "Visible layers"
   - Frames: "All frames"

   **Borders Tab:**
   - Check "Trim Sprite" and "Trim Cells"
   - Border Padding: 1 (or more)
   - Spacing: 1 (or more)
   - Inner Padding: 1 (or more)

   **Output Tab:**
   - ✅ Check "Output File"
     - Name: `Tree.png`
     - Type: PNG files
     - Save to: `assets/Pixel Crawler - Fairy Forest 1.7/Assets/`
   
   - ✅ Check "JSON Data"
     - Name: `Tree.json`
     - Save to: `assets/Pixel Crawler - Fairy Forest 1.7/Assets/`
     - ✅ Check "Tags" in Meta options
     - Item Filename: `{frame}` (optional, for frame naming)

4. **Click "Export"**

5. **Verify** that both `Tree.png` and `Tree.json` are in the Assets folder.

## What This Does

The JSON file contains:
- Frame positions and sizes
- Frame names/tags
- Animation data
- Exact frame boundaries (no guessing frame dimensions!)

This allows Phaser to automatically parse individual tree sprites from the sheet, so you'll get individual trees instead of the entire sprite sheet.

## After Exporting

Once `Tree.json` exists, the game will automatically use the Aseprite loader instead of manual spritesheet parsing. The code will:
1. Try to load as Aseprite atlas (if JSON exists)
2. Fall back to manual spritesheet if JSON doesn't exist

No code changes needed after exporting!

