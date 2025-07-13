#!/bin/bash

echo "===================="
echo "Testing PDF Display Fix"
echo "===================="

# Kill any existing processes on port 3000
echo "Cleaning up port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start Electron with auto-generation
echo "Starting Electron app..."
echo "The app will:"
echo "1. Load the meeting memo"
echo "2. You need to click 'Generate PDF' button"
echo "3. Check if PDF displays properly"
echo ""
echo "Press Ctrl+C to exit when done testing"
echo ""

# Run the app
npm run electron:dev 