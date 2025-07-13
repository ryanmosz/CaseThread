#!/bin/bash

# CaseThread - Run Test Scenarios with Quality Mode
# This script runs scenarios through the new LangGraph quality pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCENARIO_DIR="docs/testing/scenario-inputs"
OUTPUT_DIR="output/quality-test"
LOG_FILE="output/quality-test.log"
RESULTS_FILE="output/quality-results.txt"

# Parse command line arguments
DRY_RUN=false
QUALITY_MODE=false
SINGLE_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --quality)
            QUALITY_MODE=true
            shift
            ;;
        --file)
            SINGLE_FILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] [--quality] [--file filename.yaml]"
            echo "  --dry-run    Show commands without executing"
            echo "  --quality    Use LangGraph quality pipeline"
            echo "  --file       Run single file instead of all"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create output directory
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    echo "CaseThread Quality Test - $(date)" > "$RESULTS_FILE"
    echo "Mode: $([ "$QUALITY_MODE" = true ] && echo "Quality (LangGraph)" || echo "Standard")" >> "$RESULTS_FILE"
    echo "=============================================" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
fi

# Counters
total_files=0
successful=0
failed=0

# Function to extract document type from YAML
extract_document_type() {
    local file="$1"
    grep "^document_type:" "$file" | cut -d '"' -f 2 | tr -d '"' | tr -d "'" | xargs
}

# Function to extract client name from YAML
extract_client() {
    local file="$1"
    grep "^client:" "$file" | cut -d '"' -f 2 | tr -d '"' | tr -d "'" | xargs
}

# Function to run a single scenario
run_scenario() {
    local input_file="$1"
    local basename=$(basename "$input_file" .yaml)
    local document_type=$(extract_document_type "$input_file")
    local client=$(extract_client "$input_file")
    
    echo -e "${BLUE}Processing:${NC} $basename"
    echo -e "${BLUE}Client:${NC} $client"
    echo -e "${BLUE}Document Type:${NC} $document_type"
    
    # Create client-specific output directory
    local client_dir="$OUTPUT_DIR/${client// /-}"
    local output_file="$client_dir/${basename}.md"
    
    # Build command
    local cmd="npm run cli -- generate \"$document_type\" \"$input_file\" --output \"$output_file\""
    if [ "$QUALITY_MODE" = true ]; then
        cmd="$cmd --quality"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}DRY RUN:${NC} $cmd"
        echo ""
        return
    fi
    
    mkdir -p "$client_dir"
    
    # Run the generation command
    local start_time=$(date +%s)
    
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${GREEN}✓ SUCCESS${NC} - Generated in ${duration}s"
        echo "✓ $basename - $document_type ($duration s)" >> "$RESULTS_FILE"
        ((successful++))
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${RED}✗ FAILED${NC} - After ${duration}s"
        echo "✗ $basename - $document_type (FAILED after $duration s)" >> "$RESULTS_FILE"
        ((failed++))
    fi
    
    echo ""
}

# Main execution
echo -e "${BLUE}CaseThread Quality Test Runner${NC}"
echo "=================================="
echo -e "Mode: $([ "$QUALITY_MODE" = true ] && echo "${GREEN}Quality (LangGraph)${NC}" || echo "${YELLOW}Standard${NC}")"
echo -e "Dry Run: $([ "$DRY_RUN" = true ] && echo "${YELLOW}YES${NC}" || echo "${GREEN}NO${NC}")"
echo ""

# Check if scenario directory exists
if [ ! -d "$SCENARIO_DIR" ]; then
    echo -e "${RED}Error: Scenario directory not found: $SCENARIO_DIR${NC}"
    exit 1
fi

# Determine files to process
if [ -n "$SINGLE_FILE" ]; then
    if [ ! -f "$SCENARIO_DIR/$SINGLE_FILE" ]; then
        echo -e "${RED}Error: File not found: $SCENARIO_DIR/$SINGLE_FILE${NC}"
        exit 1
    fi
    yaml_files=("$SCENARIO_DIR/$SINGLE_FILE")
else
    yaml_files=($(find "$SCENARIO_DIR" -name "*.yaml" -type f | sort))
fi

if [ ${#yaml_files[@]} -eq 0 ]; then
    echo -e "${RED}Error: No YAML files found${NC}"
    exit 1
fi

echo -e "${BLUE}Found ${#yaml_files[@]} scenario file(s)${NC}"
echo ""

# Process each file
for yaml_file in "${yaml_files[@]}"; do
    ((total_files++))
    run_scenario "$yaml_file"
done

# Summary
if [ "$DRY_RUN" = false ]; then
    echo "=================================="
    echo -e "${BLUE}Quality Test Complete${NC}"
    echo ""
    echo -e "Total Files: ${total_files}"
    echo -e "${GREEN}Successful: ${successful}${NC}"
    echo -e "${RED}Failed: ${failed}${NC}"
    
    # Add summary to results file
    echo "" >> "$RESULTS_FILE"
    echo "=============================================" >> "$RESULTS_FILE"
    echo "SUMMARY:" >> "$RESULTS_FILE"
    echo "Total Files: $total_files" >> "$RESULTS_FILE"
    echo "Successful: $successful" >> "$RESULTS_FILE"
    echo "Failed: $failed" >> "$RESULTS_FILE"
    
    echo ""
    echo -e "${BLUE}Results saved to:${NC} $RESULTS_FILE"
    echo -e "${BLUE}Detailed logs:${NC} $LOG_FILE"
    echo -e "${BLUE}Generated files:${NC} $OUTPUT_DIR"
else
    echo "=================================="
    echo -e "${BLUE}Dry Run Complete${NC}"
    echo -e "Would process ${total_files} files"
fi 