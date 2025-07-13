#!/bin/bash
# Simple PDF test - Basic app startup test with auto-loaded meeting memo
# The app automatically loads output/2023-05-24-meeting-memo.md on startup

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    echo -e "\n${YELLOW}Cleaning up all Electron processes...${NC}"
    
    # Kill any process with "electron" in the name
    pkill -f "electron" || true
    
    # Kill processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Extra cleanup for any remaining node processes related to our app
    pkill -f "casethread-poc" || true
    pkill -f "electron-forge" || true
    
    sleep 2
}

# Trap to ensure cleanup on script exit
trap cleanup EXIT

echo -e "${GREEN}=== Simple PDF Test ===${NC}"
echo -e "${BLUE}Testing basic app startup with auto-loaded meeting memo${NC}"
echo "Expected: output/2023-05-24-meeting-memo.md loads automatically"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs/automated-tests

# Initial cleanup
cleanup

# Generate timestamp for this test
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="logs/automated-tests/simple-test-${TIMESTAMP}.log"

echo -e "${YELLOW}Starting Electron app...${NC}"
echo "Log file: $LOG_FILE"
echo ""

# Start Electron normally (no auto-generation)
npm run electron:dev 2>&1 | tee "$LOG_FILE" &
ELECTRON_PID=$!

echo "Electron started with PID: $ELECTRON_PID"
echo "Waiting 20 seconds for app to load..."

# Show progress
for i in {1..20}; do
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
    echo -e "${GREEN}✓ App is still running${NC}"
else
    APP_RUNNING="NO"
    echo -e "${RED}✗ App crashed${NC}"
fi

# Check for errors in log
echo -e "\n${YELLOW}Checking for errors...${NC}"

ERROR_COUNT=0

# Check for JavaScript errors
if grep -q "Uncaught ReferenceError\|Uncaught TypeError\|Uncaught Error" "$LOG_FILE"; then
    echo -e "${RED}✗ Found JavaScript error in renderer${NC}"
    grep -E "Uncaught.*Error" "$LOG_FILE" | head -5
    ((ERROR_COUNT++))
fi

# Check for initialization errors
if grep -q "Cannot access.*before initialization" "$LOG_FILE"; then
    echo -e "${RED}✗ Found initialization error${NC}"
    grep "Cannot access.*before initialization" "$LOG_FILE" | head -3
    ((ERROR_COUNT++))
fi

# Check for common errors
if grep -q "An object could not be cloned" "$LOG_FILE"; then
    echo -e "${RED}✗ Found 'object could not be cloned' error${NC}"
    ((ERROR_COUNT++))
fi

if grep -q "addToast is not a function" "$LOG_FILE"; then
    echo -e "${RED}✗ Found 'addToast is not a function' error${NC}"
    ((ERROR_COUNT++))
fi

if grep -q "Cannot find module" "$LOG_FILE"; then
    echo -e "${RED}✗ Found module loading error${NC}"
    grep "Cannot find module" "$LOG_FILE" | head -3
    ((ERROR_COUNT++))
fi

if grep -q "failed to load" "$LOG_FILE"; then
    echo -e "${RED}✗ Found loading failure${NC}"
    ((ERROR_COUNT++))
fi

# Check for error boundaries
if grep -q "An error occurred in the" "$LOG_FILE"; then
    echo -e "${RED}✗ React component error detected${NC}"
    grep -A2 "An error occurred in the" "$LOG_FILE" | head -5
    ((ERROR_COUNT++))
fi

# Check for positive indicators
if grep -q "PDF generation handler initialized" "$LOG_FILE"; then
    echo -e "${GREEN}✓ PDF handler initialized${NC}"
fi

if grep -q "PDF export handler initialized" "$LOG_FILE"; then
    echo -e "${GREEN}✓ PDF export handler initialized${NC}"
fi

if grep -q "Local:   http://localhost:3000" "$LOG_FILE"; then
    echo -e "${GREEN}✓ Dev server started${NC}"
fi

# Kill the specific Electron process
if [ -n "$ELECTRON_PID" ]; then
    echo -e "\n${YELLOW}Killing Electron process $ELECTRON_PID...${NC}"
    kill_process_tree $ELECTRON_PID
fi

# Final summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
if [ $ERROR_COUNT -eq 0 ] && [ "$APP_RUNNING" = "YES" ]; then
    echo -e "${GREEN}✓ No critical errors detected${NC}"
    echo "The app started successfully and loaded the meeting memo"
    echo ""
    echo "Next steps:"
    echo "1. Run ./scripts/automated-pdf-test-loop.sh for full PDF generation test"
    echo "2. Or manually click 'Generate PDF' in the app to test PDF generation"
else
    echo -e "${RED}✗ Found $ERROR_COUNT critical errors${NC}"
    echo "Fix these errors before proceeding with PDF generation tests"
fi

echo ""
echo "Log file: $LOG_FILE"
echo -e "${GREEN}Test complete!${NC}"

# Exit cleanup will run automatically due to trap 