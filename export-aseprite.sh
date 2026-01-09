#!/bin/bash

# Batch export all Aseprite files to PNG + JSON for Phaser
# Usage: ./export-aseprite.sh [--dry-run]

ASEPRITE="/Applications/Aseprite.app/Contents/MacOS/aseprite"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "=== DRY RUN MODE - No files will be exported ==="
fi

# Check if Aseprite exists
if [[ ! -f "$ASEPRITE" ]]; then
    echo "Error: Aseprite not found at $ASEPRITE"
    echo "Please update the ASEPRITE path in this script"
    exit 1
fi

# Count files
total=$(find assets -name "*.aseprite" | wc -l | tr -d ' ')
echo "Found $total Aseprite files to export"
echo ""

count=0
skipped=0
exported=0

find assets -name "*.aseprite" | while read -r file; do
    count=$((count + 1))

    # Get directory and base name
    dir=$(dirname "$file")
    base=$(basename "$file" .aseprite)

    # Output paths
    png_out="$dir/$base.png"
    json_out="$dir/$base.json"

    # Skip if JSON already exists (already exported)
    if [[ -f "$json_out" ]]; then
        echo "[$count/$total] SKIP (exists): $base.json"
        continue
    fi

    echo "[$count/$total] Exporting: $file"

    if [[ "$DRY_RUN" == false ]]; then
        "$ASEPRITE" -b "$file" \
            --sheet "$png_out" \
            --data "$json_out" \
            --format json-array \
            --sheet-type packed \
            --trim \
            --list-tags \
            --list-layers \
            --list-slices

        if [[ $? -eq 0 ]]; then
            echo "         -> $base.png + $base.json"
        else
            echo "         -> FAILED"
        fi
    else
        echo "         -> Would create: $base.png + $base.json"
    fi
done

echo ""
echo "Export complete!"
