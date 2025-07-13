#!/bin/bash

# Monitor PDF Generation Script
# This monitors the running Electron app for PDF generation activity

echo "=== PDF Generation Monitor ==="
echo "This script monitors the running Electron app for PDF generation activity"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if app is running
if ! lsof -ti:3000 > /dev/null; then
    echo -e "${RED}Error: No app running on port 3000${NC}"
    echo "Please start the app with: npm run electron:dev"
    exit 1
fi

echo -e "${GREEN}App detected on port 3000${NC}"
echo ""
echo "Monitoring for PDF generation activity..."
echo "Instructions:"
echo "1. Load a document in the app"
echo "2. Click 'Generate PDF' button"
echo "3. Watch for results below"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "=== Live Output ==="

# Monitor the most recent log file
LOG_DIR="./logs/electron"
if [ -d "$LOG_DIR" ]; then
    # Find the most recent combined log
    LATEST_LOG=$(ls -t "$LOG_DIR"/combined-*.log 2>/dev/null | head -1)
    
    if [ -n "$LATEST_LOG" ]; then
        echo "Monitoring: $LATEST_LOG"
        echo ""
        
        # Tail the log and highlight PDF-related messages
        tail -f "$LATEST_LOG" | while read line; do
            if echo "$line" | grep -q "PDF\|pdf\|generation\|Generation"; then
                if echo "$line" | grep -qi "error\|failed\|exception"; then
                    echo -e "${RED}[ERROR] $line${NC}"
                elif echo "$line" | grep -qi "success\|complete\|generated"; then
                    echo -e "${GREEN}[SUCCESS] $line${NC}"
                else
                    echo -e "${YELLOW}[PDF] $line${NC}"
                fi
            elif echo "$line" | grep -qi "error\|exception\|failed"; then
                echo -e "${RED}[ERROR] $line${NC}"
            fi
        done
    else
        echo "No log files found in $LOG_DIR"
        echo "The app may not have created logs yet"
    fi
else
    echo "Log directory not found: $LOG_DIR"
    echo "Falling back to console output monitoring..."
fi 