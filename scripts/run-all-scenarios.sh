#!/bin/bash

# CaseThread - Run All Test Scenarios
# This script runs all YAML scenario files through the document generation system

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCENARIO_DIR="docs/testing/scenario-inputs"
OUTPUT_DIR="output/test-scenarios"
LOG_FILE="output/test-scenarios.log"
RESULTS_FILE="output/test-results.txt"

# Create output directory
mkdir -p "$OUTPUT_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Initialize results tracking
echo "CaseThread Test Scenarios - $(date)" > "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Counters
total_files=0
successful=0
failed=0
declare -a failed_files

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
    mkdir -p "$client_dir"
    
    # Set output file name
    local output_file="$client_dir/${basename}.md"
    
    # Run the generation command
    local start_time=$(date +%s)
    
    if npm run cli -- generate "$document_type" "$input_file" --output "$output_file" --quality >> "$LOG_FILE" 2>&1; then
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
        failed_files+=("$basename")
        ((failed++))
    fi
    
    echo ""
}

# Main execution
echo -e "${BLUE}CaseThread Test Scenarios Runner${NC}"
echo "=================================="
echo ""

# Check if scenario directory exists
if [ ! -d "$SCENARIO_DIR" ]; then
    echo -e "${RED}Error: Scenario directory not found: $SCENARIO_DIR${NC}"
    exit 1
fi

# Find all YAML files
yaml_files=($(find "$SCENARIO_DIR" -name "*.yaml" -type f | sort))

if [ ${#yaml_files[@]} -eq 0 ]; then
    echo -e "${RED}Error: No YAML files found in $SCENARIO_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}Found ${#yaml_files[@]} scenario files${NC}"
echo ""

# Process each file
for yaml_file in "${yaml_files[@]}"; do
    ((total_files++))
    run_scenario "$yaml_file"
done

# Summary
echo "=================================="
echo -e "${BLUE}Test Scenarios Complete${NC}"
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

# List failed files if any
if [ ${#failed_files[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed scenarios:${NC}"
    for failed_file in "${failed_files[@]}"; do
        echo -e "${RED}  - $failed_file${NC}"
    done
    
    echo "" >> "$RESULTS_FILE"
    echo "FAILED FILES:" >> "$RESULTS_FILE"
    for failed_file in "${failed_files[@]}"; do
        echo "  - $failed_file" >> "$RESULTS_FILE"
    done
fi

echo ""
echo -e "${BLUE}Results saved to:${NC} $RESULTS_FILE"
echo -e "${BLUE}Detailed logs:${NC} $LOG_FILE"
echo -e "${BLUE}Generated files:${NC} $OUTPUT_DIR"

# Exit with error code if any failures
if [ $failed -gt 0 ]; then
    exit 1
fi 