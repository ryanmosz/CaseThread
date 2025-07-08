#!/bin/bash

# CaseThread CLI Test Script - Tests all 8 document types
# This script runs the CLI for each document type and reports success/failure

echo "================================================"
echo "CaseThread CLI - Full Document Generation Test"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test output directory
OUTPUT_DIR="test-output-$(date +%Y%m%d-%H%M%S)"
FAILED_TESTS=0
PASSED_TESTS=0

# Create output directory
echo "Creating test output directory: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
echo ""

# Function to run a test
run_test() {
    local doc_type=$1
    local input_file=$2
    local test_name=$3
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    echo "Document Type: $doc_type"
    echo "Input File: $input_file"
    echo -n "Running... "
    
    # Run the command and capture output
    if npm run cli -- generate "$doc_type" "$input_file" --output "./$OUTPUT_DIR" > "$OUTPUT_DIR/$doc_type.log" 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo "Generated file saved to $OUTPUT_DIR/"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Error details in: $OUTPUT_DIR/$doc_type.log"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Test all 8 document types
echo "Starting document generation tests..."
echo "=================================="
echo ""

# 1. Patent Assignment Agreement
run_test "patent-assignment-agreement" \
    "docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml" \
    "Patent Assignment Agreement"

# 2. NDA IP Specific
run_test "nda-ip-specific" \
    "docs/testing/scenario-inputs/rtp-01-collaboration-nda.yaml" \
    "NDA with IP Provisions"

# 3. Patent License Agreement
run_test "patent-license-agreement" \
    "docs/testing/scenario-inputs/tfs-04-patent-license-cloudgiant.yaml" \
    "Patent License Agreement"

# 4. Trademark Application
run_test "trademark-application" \
    "docs/testing/scenario-inputs/rtp-02-trademark-application.yaml" \
    "Trademark Application"

# 5. Office Action Response
run_test "office-action-response" \
    "docs/testing/scenario-inputs/tfs-02-office-action-alice.yaml" \
    "Office Action Response"

# 6. Cease and Desist Letter
run_test "cease-and-desist-letter" \
    "docs/testing/scenario-inputs/tfs-05-cease-desist-cacheflow.yaml" \
    "Cease and Desist Letter"

# 7. Technology Transfer Agreement
run_test "technology-transfer-agreement" \
    "docs/testing/scenario-inputs/cil-06-tech-transfer-manufacturing.yaml" \
    "Technology Transfer Agreement"

# 8. Provisional Patent Application
run_test "provisional-patent-application" \
    "docs/testing/scenario-inputs/cil-04-provisional-patent.yaml" \
    "Provisional Patent Application"

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
    echo ""
    echo "Generated documents are in: $OUTPUT_DIR/"
    echo ""
    # List generated files
    echo "Generated files:"
    ls -la "$OUTPUT_DIR"/*.md 2>/dev/null | awk '{print "  - " $9}'
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check the log files for details.${NC}"
    echo ""
    echo "Failed test logs:"
    for log in "$OUTPUT_DIR"/*.log; do
        if grep -q "error\|Error\|ERROR" "$log" 2>/dev/null; then
            echo "  - $log"
        fi
    done
    exit 1
fi 