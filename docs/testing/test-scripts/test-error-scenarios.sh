#!/bin/bash

# CaseThread CLI Error Scenario Test Script
# Tests various failure conditions and error handling

echo "================================================"
echo "CaseThread CLI - Error Scenario Testing"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test output directory
OUTPUT_DIR="docs/testing/test-results/error-tests-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

PASSED=0
FAILED=0

# Function to test an error scenario
test_error() {
    local test_name=$1
    local command=$2
    local expected_error=$3
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    echo "Command: $command"
    echo -n "Running... "
    
    # Run command and expect it to fail
    if $command > "$OUTPUT_DIR/${test_name// /_}.log" 2>&1; then
        echo -e "${RED}✗ FAILED${NC} - Command succeeded when it should have failed"
        FAILED=$((FAILED + 1))
    else
        # Check if error message contains expected text
        if grep -q "$expected_error" "$OUTPUT_DIR/${test_name// /_}.log" 2>/dev/null; then
            echo -e "${GREEN}✓ PASSED${NC} - Failed with expected error"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗ FAILED${NC} - Failed but with unexpected error"
            echo "Check log: $OUTPUT_DIR/${test_name// /_}.log"
            FAILED=$((FAILED + 1))
        fi
    fi
    echo ""
}

echo "Starting error scenario tests..."
echo "=================================="
echo ""

# Test 1: Invalid document type
test_error "Invalid Document Type" \
    "docker exec casethread-dev npm run cli -- generate invalid-document-type test.yaml" \
    "Invalid document type"

# Test 2: Non-existent YAML file
test_error "Missing YAML File" \
    "docker exec casethread-dev npm run cli -- generate patent-assignment-agreement non-existent-file.yaml" \
    "File not found"

# Test 3: Invalid YAML format
echo "Invalid YAML content" > "$OUTPUT_DIR/invalid.yaml"
docker cp "$OUTPUT_DIR/invalid.yaml" casethread-dev:/app/invalid.yaml
test_error "Invalid YAML Format" \
    "docker exec casethread-dev npm run cli -- generate patent-assignment-agreement invalid.yaml" \
    "YAMLException\|Invalid YAML"

# Test 4: Missing required fields in YAML
cat > "$OUTPUT_DIR/missing-fields.yaml" << EOF
# Missing required fields
optional_field: value
EOF
docker cp "$OUTPUT_DIR/missing-fields.yaml" casethread-dev:/app/missing-fields.yaml
test_error "Missing Required Fields" \
    "docker exec casethread-dev npm run cli -- generate patent-assignment-agreement missing-fields.yaml" \
    "Missing required field\|required"

# Test 5: ChromaDB down scenario
echo "Testing ChromaDB resilience..."
docker stop casethread-chromadb > /dev/null 2>&1
sleep 2
if docker exec casethread-dev npm run cli -- generate patent-assignment-agreement docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml --output "$OUTPUT_DIR" > "$OUTPUT_DIR/chromadb-down.log" 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC} - System continues working without ChromaDB"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - System failed when ChromaDB was down"
    FAILED=$((FAILED + 1))
fi
docker start casethread-chromadb > /dev/null 2>&1
echo ""

# Clean up
docker exec casethread-dev rm -f invalid.yaml missing-fields.yaml 2>/dev/null

# Summary
echo "=================================="
echo "Error Test Summary"
echo "=================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All error scenarios handled correctly!${NC}"
else
    echo -e "${RED}✗ Some error scenarios not handled properly${NC}"
fi 