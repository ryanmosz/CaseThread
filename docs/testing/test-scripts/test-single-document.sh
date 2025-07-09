#!/bin/bash

# Simple single document test script

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}CaseThread Single Document Test${NC}"
echo "================================"
echo ""

# Test parameters
DOC_TYPE="patent-assignment-agreement"
INPUT_FILE="docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml"
OUTPUT_DIR="docs/testing/test-results/single-test-$(date +%Y%m%d-%H%M%S)"

echo -e "${YELLOW}Testing:${NC} Patent Assignment Agreement"
echo -e "${YELLOW}Input:${NC} $INPUT_FILE"
echo -e "${YELLOW}Output:${NC} $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Show input preview
echo -e "${BLUE}Input Preview:${NC}"
head -5 "$INPUT_FILE"
echo "..."
echo ""

echo -e "${YELLOW}Generating document...${NC}"
echo ""

# Track time
START_TIME=$(date +%s)

# Run the command without tee to avoid issues
if docker exec casethread-dev npm run cli -- generate "$DOC_TYPE" "$INPUT_FILE" --output "$OUTPUT_DIR"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    echo -e "${GREEN}✅ SUCCESS!${NC} Generated in ${DURATION} seconds"
    
    # List generated files
    echo ""
    echo -e "${BLUE}Generated files:${NC}"
    ls -la "$OUTPUT_DIR"/*.md 2>/dev/null || echo "No .md files found"
else
    echo ""
    echo -e "${RED}❌ FAILED!${NC}"
    exit 1
fi

echo ""
echo "Test complete!" 