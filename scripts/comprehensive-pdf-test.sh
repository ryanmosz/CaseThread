#!/bin/bash

# Comprehensive PDF Testing Script
# Tests all 8 document types with detailed reporting

LOG_DIR="./logs/automated-tests"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_FILE="$LOG_DIR/comprehensive-results-$TIMESTAMP.txt"
mkdir -p "$LOG_DIR"

# Document types to test
DOCUMENT_TYPES=(
    "cease-and-desist-letter"
    "nda-ip-specific"
    "office-action-response"
    "patent-assignment-agreement"
    "patent-license-agreement"
    "provisional-patent-application"
    "technology-transfer-agreement"
    "trademark-application"
)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Comprehensive PDF Generation Test ===" | tee "$RESULTS_FILE"
echo "Testing all 8 document types" | tee -a "$RESULTS_FILE"
echo "Started at: $(date)" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Track results
PASSED=0
FAILED=0

# Function to kill a specific process and its children
kill_process_tree() {
    local parent_pid=$1
    local child_pids=$(pgrep -P $parent_pid)
    
    # Kill children first
    for child in $child_pids; do
        kill_process_tree $child
    done
    
    # Then kill the parent
    kill -9 $parent_pid 2>/dev/null || true
}

# Function to test a single document type
test_document_type() {
    local DOC_TYPE=$1
    local INDEX=$2
    local TOTAL=$3
    
    echo -e "${BLUE}[$INDEX/$TOTAL] Testing: $DOC_TYPE${NC}" | tee -a "$RESULTS_FILE"
    
    # Kill any existing processes on port 3000 (from previous runs)
    lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
    sleep 2
    
    # Start the app with auto-generation
    CASETHREAD_AUTO_GENERATE=true \
    CASETHREAD_DOCUMENT_TYPE="$DOC_TYPE" \
    npm run electron:dev > "$LOG_DIR/test-$DOC_TYPE-$TIMESTAMP.log" 2>&1 &
    
    local APP_PID=$!
    echo "  Started Electron with PID: $APP_PID"
    
    # Wait for app to start and attempt generation
    echo -n "  Starting app and generating PDF"
    for i in {1..30}; do
        echo -n "."
        sleep 1
    done
    echo ""
    
    # Check if process is still running
    if ps -p $APP_PID > /dev/null; then
        # Look for success indicators in the log
        if grep -q "PDF generated successfully\|Generated PDF successfully\|buffer.*byteLength" "$LOG_DIR/test-$DOC_TYPE-$TIMESTAMP.log"; then
            echo -e "  ${GREEN}✓ PASSED: PDF generation succeeded${NC}" | tee -a "$RESULTS_FILE"
            ((PASSED++))
        else
            # Check for errors
            if grep -q "error\|Error\|exception\|failed" "$LOG_DIR/test-$DOC_TYPE-$TIMESTAMP.log"; then
                echo -e "  ${RED}✗ FAILED: PDF generation error${NC}" | tee -a "$RESULTS_FILE"
                echo "  Error details:" | tee -a "$RESULTS_FILE"
                grep -i "error\|exception" "$LOG_DIR/test-$DOC_TYPE-$TIMESTAMP.log" | head -3 | tee -a "$RESULTS_FILE"
                ((FAILED++))
            else
                echo -e "  ${YELLOW}? UNKNOWN: No clear success or failure${NC}" | tee -a "$RESULTS_FILE"
                ((FAILED++))
            fi
        fi
        
        # Kill this specific app instance and all its children
        echo "  Killing Electron process $APP_PID and its children..."
        kill_process_tree $APP_PID
        
        # Also kill any remaining processes on port 3000
        lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
    else
        echo -e "  ${RED}✗ FAILED: App crashed${NC}" | tee -a "$RESULTS_FILE"
        ((FAILED++))
    fi
    
    echo "" | tee -a "$RESULTS_FILE"
    
    # Wait a bit to ensure everything is cleaned up
    sleep 3
}

# Run all tests
TOTAL=${#DOCUMENT_TYPES[@]}
for i in "${!DOCUMENT_TYPES[@]}"; do
    test_document_type "${DOCUMENT_TYPES[$i]}" $((i + 1)) "$TOTAL"
done

# Summary
echo "=== Test Summary ===" | tee -a "$RESULTS_FILE"
echo -e "${GREEN}Passed: $PASSED${NC}" | tee -a "$RESULTS_FILE"
echo -e "${RED}Failed: $FAILED${NC}" | tee -a "$RESULTS_FILE"
echo "Total: $TOTAL" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}Some tests failed. Check logs in $LOG_DIR${NC}" | tee -a "$RESULTS_FILE"
fi

echo "Completed at: $(date)" | tee -a "$RESULTS_FILE"
echo "Full results saved to: $RESULTS_FILE" 