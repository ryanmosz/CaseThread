#!/bin/bash

echo "=================================="
echo "Testing PDF Export Functionality"
echo "=================================="

# Kill any existing processes on port 3000
echo "Cleaning up port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start Electron
echo "Starting Electron app..."
echo ""
echo "To test PDF export:"
echo "1. Wait for the meeting memo to load"
echo "2. Click 'Generate PDF' button"
echo "3. Wait for PDF to display"
echo "4. Click 'Export PDF' button"
echo "5. Choose a save location"
echo "6. Verify the PDF file is saved correctly"
echo ""
echo "Press Ctrl+C to exit when done testing"
echo ""

# Run the app
npm run electron:dev 