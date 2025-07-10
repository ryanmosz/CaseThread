#!/bin/bash

# Generate PNG images from Mermaid diagrams

echo "🎨 Generating PNG images from Mermaid diagrams..."

# Change to the diagrams directory
cd "$(dirname "$0")"

# Process each markdown file (except README)
for file in *.md; do
    if [ "$file" != "README.md" ]; then
        # Extract filename without extension
        base="${file%.md}"
        
        echo "Processing $file..."
        
        # Extract mermaid code block to temp file
        sed -n '/```mermaid/,/```/{//!p;}' "$file" > "temp_${base}.mmd"
        
        # Generate PNG with high quality
        mmdc -i "temp_${base}.mmd" -o "${base}.png" -b white -w 1200 -H 800
        
        # Clean up temp file
        rm "temp_${base}.mmd"
        
        echo "✅ Generated ${base}.png"
    fi
done

echo "🎉 All diagrams converted to PNG images!"
echo ""
echo "Generated images:"
ls -la *.png 