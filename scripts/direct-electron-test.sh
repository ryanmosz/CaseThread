#!/bin/bash

# Direct Electron Test Script
# This runs Electron directly to get better error messages

LOG_DIR="./logs/automated-tests"
ELECTRON_LOG="$LOG_DIR/electron-direct-$(date +%Y%m%d-%H%M%S).log"
DOCUMENT_TYPE="${1:-nda-ip-specific}"

mkdir -p "$LOG_DIR"

echo "Direct Electron Test"
echo "==================="
echo "Document type: $DOCUMENT_TYPE"
echo "Log file: $ELECTRON_LOG"
echo ""

# Kill any existing processes
echo "Cleaning up existing processes..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
pkill -f "electron.*casethread" 2>/dev/null || true
sleep 2

# Build the app first
echo "Building the application..."
npm run build

# Run Electron directly
echo ""
echo "Starting Electron directly..."
CASETHREAD_AUTO_GENERATE=true \
CASETHREAD_DOCUMENT_TYPE="$DOCUMENT_TYPE" \
NODE_ENV=development \
./node_modules/.bin/electron . 2>&1 | tee "$ELECTRON_LOG" &

ELECTRON_PID=$!
echo "Electron PID: $ELECTRON_PID"

# Wait and monitor
echo "Waiting 30 seconds for PDF generation..."
sleep 30

# Check if still running
if ps -p $ELECTRON_PID > /dev/null; then
    echo "Electron is still running"
else
    echo "Electron has exited"
fi

# Show relevant logs
echo ""
echo "=== PDF-related logs ==="
grep -i "pdf\|generate\|auto" "$ELECTRON_LOG" | tail -20

echo ""
echo "=== Error logs ==="
grep -i "error\|exception\|failed" "$ELECTRON_LOG" | tail -20

# Kill process
kill -9 $ELECTRON_PID 2>/dev/null || true

echo ""
echo "Test complete. Check log at: $ELECTRON_LOG" 