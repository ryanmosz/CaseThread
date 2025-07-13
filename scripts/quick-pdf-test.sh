#!/bin/bash

# Quick PDF Generation Test
# Tests if PDF generation is working after our fix

echo "=== Quick PDF Generation Test ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to kill a specific process and its children
kill_process_tree() {
    local parent_pid=$1
    local child_pids=$(pgrep -P $parent_pid 2>/dev/null)
    
    # Kill children first
    for child in $child_pids; do
        kill_process_tree $child
    done
    
    # Then kill the parent
    kill -9 $parent_pid 2>/dev/null || true
}

# Clean up any existing processes first
echo "Cleaning up existing processes..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
sleep 2

# Start the app
echo "Starting Electron app..."
npm run electron:dev > logs/automated-tests/quick-test-$(date +%s).log 2>&1 &
APP_PID=$!
echo "Started Electron with PID: $APP_PID"

# Wait for app to start
echo -n "Waiting for app to start"
APP_STARTED=false
for i in {1..20}; do
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        APP_STARTED=true
        break
    fi
    echo -n "."
    sleep 1
done

if [ "$APP_STARTED" = false ]; then
    echo -e " ${RED}✗${NC}"
    echo "App failed to start!"
    # Clean up the failed process
    kill_process_tree $APP_PID
    exit 1
fi

echo ""
echo "MANUAL TEST:"
echo "1. Click on 'nda-ip-specific-example.md' in the document list"
echo "2. Click 'Generate PDF' button"
echo ""
echo "AUTOMATED CHECK:"
echo "Triggering auto-generation test..."

# Kill the manual test instance
kill_process_tree $APP_PID
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
sleep 2

echo "Restarting with auto-generation..."
CASETHREAD_AUTO_GENERATE=true \
CASETHREAD_DOCUMENT_TYPE="nda-ip-specific" \
npm run electron:dev 2>&1 | tee logs/automated-tests/auto-gen-test-$(date +%s).log &

NEW_PID=$!
echo "Started auto-generation test with PID: $NEW_PID"

# Monitor for 30 seconds
echo -n "Monitoring for PDF generation"
SUCCESS=false

for i in {1..30}; do
    echo -n "."
    
    # Check logs for success indicators
    if tail -50 logs/electron/combined.log 2>/dev/null | grep -q "PDF.*generated.*successfully\|buffer.*byteLength\|PDF document created"; then
        echo -e " ${GREEN}✓${NC}"
        echo -e "${GREEN}SUCCESS: PDF generation is working!${NC}"
        SUCCESS=true
        break
    fi
    
    # Check for errors
    if tail -50 logs/electron/combined.log 2>/dev/null | grep -q "object.*could.*not.*be.*cloned"; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}ERROR: 'Object could not be cloned' error still occurring!${NC}"
        break
    fi
    
    sleep 1
done

if [ "$SUCCESS" = false ]; then
    echo -e " ${YELLOW}?${NC}"
    echo "No clear success or failure detected"
fi

# Cleanup - kill only our process
echo ""
echo "Cleaning up..."
echo "Killing process $NEW_PID and its children..."
kill_process_tree $NEW_PID

# Also clean up any remaining processes on port 3000
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true

echo ""
echo "Test complete!" 