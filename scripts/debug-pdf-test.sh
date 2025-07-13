#!/bin/bash

# Debug PDF Testing Script
# This captures more detailed error information

# Configuration
LOG_DIR="./logs/automated-tests"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ELECTRON_LOG="$LOG_DIR/electron-debug-$TIMESTAMP.log"
ERROR_LOG="$LOG_DIR/electron-error-$TIMESTAMP.log"
COMBINED_LOG="$LOG_DIR/electron-combined-$TIMESTAMP.log"
DOCUMENT_TYPE="${1:-nda-ip-specific}"

# Create log directory
mkdir -p "$LOG_DIR"

echo "[$(date)] Starting debug PDF test"
echo "[$(date)] Document type: $DOCUMENT_TYPE"
echo "[$(date)] Logs will be saved to:"
echo "  - Combined: $COMBINED_LOG"
echo "  - Stdout: $ELECTRON_LOG"
echo "  - Stderr: $ERROR_LOG"

# Kill any process on port 3000
echo "[$(date)] Killing any process on port 3000..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
sleep 2

# Also kill any existing Electron processes
echo "[$(date)] Killing any existing Electron processes..."
pkill -f "electron.*casethread" 2>/dev/null || true
sleep 2

# Start Electron with auto-generation and capture all output
echo "[$(date)] Starting Electron with detailed logging..."
CASETHREAD_AUTO_GENERATE=true \
CASETHREAD_DOCUMENT_TYPE="$DOCUMENT_TYPE" \
NODE_ENV=development \
DEBUG=* \
npm run electron:dev 2>&1 | tee "$COMBINED_LOG" &

# Get the process ID
ELECTRON_PID=$!
echo "[$(date)] Electron process started with PID: $ELECTRON_PID"

# Wait for 45 seconds
echo "[$(date)] Monitoring for 45 seconds..."
sleep 45

# Check if process is still running
if ps -p $ELECTRON_PID > /dev/null; then
    echo "[$(date)] Electron is still running, killing..."
    kill -TERM $ELECTRON_PID 2>/dev/null || true
    sleep 2
    kill -9 $ELECTRON_PID 2>/dev/null || true
else
    echo "[$(date)] Electron has crashed or exited"
fi

# Analyze logs
echo ""
echo "[$(date)] === Log Analysis ==="
echo ""

echo "[$(date)] === Errors found ==="
grep -i "error\|exception\|failed\|crashed" "$COMBINED_LOG" | tail -20

echo ""
echo "[$(date)] === PDF generation attempts ==="
grep -i "pdf\|generation\|auto.*generate" "$COMBINED_LOG" | tail -20

echo ""
echo "[$(date)] === Last 20 lines of log ==="
tail -20 "$COMBINED_LOG"

echo ""
echo "[$(date)] Test complete. Full log saved to: $COMBINED_LOG" 