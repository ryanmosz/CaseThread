#!/bin/bash

# Real-time PDF Generation Test
# Run this while the app is already running

echo "=== Real-time PDF Generation Test ==="
echo ""

# Check if app is running
if ! lsof -ti:3000 > /dev/null; then
    echo "ERROR: App is not running on port 3000"
    echo "Please start the app first with: npm run electron:dev"
    exit 1
fi

echo "✓ App detected on port 3000"
echo ""
echo "Test Instructions:"
echo "1. Click on any document in the app (e.g., 'nda-ip-specific-example.md')"
echo "2. Click 'Generate PDF' button"
echo "3. Watch for results below"
echo ""
echo "=== Monitoring Logs ==="
echo ""

# Monitor the most recent electron log
LOG_FILE=$(ls -t logs/electron/combined.log 2>/dev/null | head -1)

if [ -z "$LOG_FILE" ]; then
    echo "No log file found. Creating log directory..."
    mkdir -p logs/electron
    touch logs/electron/combined.log
    LOG_FILE="logs/electron/combined.log"
fi

echo "Monitoring: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo ""

# Track the last position
LAST_POS=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)

while true; do
    CURRENT_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
    
    if [ $CURRENT_SIZE -gt $LAST_POS ]; then
        # Read new content
        tail -c +$((LAST_POS + 1)) "$LOG_FILE" 2>/dev/null | while IFS= read -r line; do
            # Filter for PDF-related messages
            if echo "$line" | grep -qi "pdf\|generation\|buffer\|export"; then
                # Color code the output
                if echo "$line" | grep -qi "error\|failed\|exception"; then
                    echo -e "\033[0;31m[ERROR] $line\033[0m"
                elif echo "$line" | grep -qi "success\|complete\|generated"; then
                    echo -e "\033[0;32m[SUCCESS] $line\033[0m"
                elif echo "$line" | grep -qi "started\|beginning\|init"; then
                    echo -e "\033[0;34m[START] $line\033[0m"
                else
                    echo -e "\033[1;33m[PDF] $line\033[0m"
                fi
            fi
        done
        LAST_POS=$CURRENT_SIZE
    fi
    
    sleep 0.5
done 