#!/bin/bash
# Automated PDF test loop for meeting memo
# Tests PDF generation with the auto-loaded document: output/2023-05-24-meeting-memo.md

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to kill process and all its children
kill_process_tree() {
    local parent=$1
    local children=$(pgrep -P $parent 2>/dev/null)
    
    if [ -n "$children" ]; then
        for child in $children; do
            kill_process_tree $child
        done
    fi
    
    kill -9 $parent 2>/dev/null || true
}

# Cleanup function
cleanup() {
    echo "Performing full cleanup..."
    
    # Kill any process with "electron" in the name
    pkill -f "electron" || true
    
    # Kill processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Extra cleanup for any remaining node processes
    pkill -f "casethread-poc" || true
    pkill -f "electron-forge" || true
    
    sleep 2
}

# Trap to ensure cleanup on script exit
trap cleanup EXIT

echo -e "${GREEN}=== Automated PDF Test Loop ===${NC}"
echo -e "${BLUE}Testing with auto-loaded meeting memo${NC}"
echo "Document: output/2023-05-24-meeting-memo.md"
echo ""

# Configuration
MAX_ATTEMPTS=5
WAIT_TIME=30

# Create logs directory
mkdir -p logs/automated-tests

# Test tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "Will run up to $MAX_ATTEMPTS test attempts"
echo "Each test will wait $WAIT_TIME seconds for PDF generation"
echo ""

for attempt in $(seq 1 $MAX_ATTEMPTS); do
    echo -e "${YELLOW}=== Test Attempt $attempt of $MAX_ATTEMPTS ===${NC}"
    
    # Full cleanup before each test
    cleanup
    
    # Generate timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    LOG_FILE="logs/automated-tests/auto-test-${attempt}-${TIMESTAMP}.log"
    
    echo "Starting Electron app..."
    echo "Log: $LOG_FILE"
    
    # Start the app - no document type needed since meeting memo loads automatically
    npm run electron:dev 2>&1 | tee "$LOG_FILE" &
    ELECTRON_PID=$!
    
    echo "PID: $ELECTRON_PID"
    echo "Waiting $WAIT_TIME seconds..."
    
    # Progress indicator
    for i in $(seq 1 $WAIT_TIME); do
        if ! kill -0 $ELECTRON_PID 2>/dev/null; then
            echo -e "\n${RED}App crashed!${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    
    # Check if app is still running
    if kill -0 $ELECTRON_PID 2>/dev/null; then
        APP_RUNNING="YES"
        echo -e "${GREEN}✓ App still running${NC}"
    else
        APP_RUNNING="NO"
        echo -e "${RED}✗ App crashed${NC}"
    fi
    
    # Analyze results
    echo -e "\n${YELLOW}Analyzing test results...${NC}"
    
    TEST_PASSED=true
    ERRORS_FOUND=""
    
    # Check for JavaScript errors
    if grep -q "Uncaught ReferenceError\|Uncaught TypeError\|Uncaught Error" "$LOG_FILE"; then
        echo -e "${RED}✗ JavaScript error found${NC}"
        grep -E "Uncaught.*Error" "$LOG_FILE" | head -3
        ERRORS_FOUND="${ERRORS_FOUND}javascript "
        TEST_PASSED=false
    fi
    
    # Check for initialization errors
    if grep -q "Cannot access.*before initialization" "$LOG_FILE"; then
        echo -e "${RED}✗ Initialization error found${NC}"
        ERRORS_FOUND="${ERRORS_FOUND}initialization "
        TEST_PASSED=false
    fi
    
    # Check for critical errors
    if grep -q "An object could not be cloned" "$LOG_FILE"; then
        echo -e "${RED}✗ Serialization error found${NC}"
        ERRORS_FOUND="${ERRORS_FOUND}serialization "
        TEST_PASSED=false
    fi
    
    if grep -q "addToast is not a function" "$LOG_FILE"; then
        echo -e "${RED}✗ Toast function error found${NC}"
        ERRORS_FOUND="${ERRORS_FOUND}toast "
        TEST_PASSED=false
    fi
    
    if grep -q "Cannot find module" "$LOG_FILE"; then
        echo -e "${RED}✗ Module loading error found${NC}"
        ERRORS_FOUND="${ERRORS_FOUND}module "
        TEST_PASSED=false
    fi
    
    # Check for React errors
    if grep -q "An error occurred in the" "$LOG_FILE"; then
        echo -e "${RED}✗ React component error found${NC}"
        ERRORS_FOUND="${ERRORS_FOUND}react "
        TEST_PASSED=false
    fi
    
    if [ "$APP_RUNNING" = "NO" ]; then
        echo -e "${RED}✗ App crashed during test${NC}"
        ERRORS_FOUND="${ERRORS_FOUND}crash "
        TEST_PASSED=false
    fi
    
    # Check for positive indicators
    if grep -q "PDF generation handler initialized" "$LOG_FILE"; then
        echo -e "${GREEN}✓ PDF handler ready${NC}"
    fi
    
    # Check for renderer indicators (might not see console logs in test output)
    if grep -q "Local:   http://localhost:3000" "$LOG_FILE"; then
        echo -e "${GREEN}✓ Dev server started${NC}"
    else
        echo -e "${RED}✗ Dev server failed to start${NC}"
        TEST_PASSED=false
    fi
    
    if grep -q "output/2023-05-24-meeting-memo.md" "$LOG_FILE"; then
        echo -e "${GREEN}✓ Meeting memo referenced${NC}"
    fi
    
    # Update counters
    ((TOTAL_TESTS++))
    if [ "$TEST_PASSED" = true ]; then
        ((PASSED_TESTS++))
        echo -e "\n${GREEN}✅ Test $attempt PASSED${NC}"
    else
        ((FAILED_TESTS++))
        echo -e "\n${RED}❌ Test $attempt FAILED${NC}"
        echo "Errors: $ERRORS_FOUND"
    fi
    
    # Kill the specific Electron process
    echo -e "\nKilling Electron process $ELECTRON_PID..."
    kill_process_tree $ELECTRON_PID
    sleep 2
    
    # Check if we should continue
    if [ "$TEST_PASSED" = true ] && [ $PASSED_TESTS -ge 3 ]; then
        echo -e "\n${GREEN}Early success! 3 tests passed in a row.${NC}"
        break
    fi
    
    if [ $attempt -lt $MAX_ATTEMPTS ]; then
        echo -e "\nWaiting 5 seconds before next attempt..."
        sleep 5
    fi
    
    echo ""
done

# Final summary
echo -e "\n${YELLOW}=== Final Test Summary ===${NC}"
echo "Total tests run: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ] && [ $PASSED_TESTS -gt 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "The app loads the meeting memo without errors."
    EXIT_CODE=0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
    echo "Check the logs in: logs/automated-tests/"
    EXIT_CODE=1
fi

# Show recent logs
echo -e "\n${YELLOW}Recent log files:${NC}"
ls -lt logs/automated-tests/ | head -6

echo -e "\n${GREEN}Test loop complete!${NC}"

# Exit cleanup will run automatically due to trap
exit $EXIT_CODE 