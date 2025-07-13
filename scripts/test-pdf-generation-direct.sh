#!/bin/bash

# Direct PDF Generation Test
# Tests PDF generation after app is fully loaded

echo "=== Direct PDF Generation Test ==="
echo "This test verifies PDF generation is working after our fix"
echo ""

# Check if app is running
if ! lsof -ti:3000 > /dev/null; then
    echo "Starting Electron app..."
    npm run electron:dev > logs/automated-tests/direct-test-$(date +%s).log 2>&1 &
    
    echo "Waiting for app to start..."
    for i in {1..15}; do
        if lsof -ti:3000 > /dev/null; then
            echo "App started successfully!"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
fi

echo ""
echo "MANUAL TEST INSTRUCTIONS:"
echo "========================="
echo "1. The app should be open now"
echo "2. Click on any .md file from the list (e.g., 'nda-ip-specific-example.md')"
echo "3. Wait for the document to load"
echo "4. Click the 'Generate PDF' button"
echo ""
echo "EXPECTED RESULT:"
echo "- PDF should generate without 'An object could not be cloned' error"
echo "- PDF viewer should display the generated document"
echo "- Metadata panel should show PDF details"
echo ""
echo "You can also open DevTools (View → Toggle Developer Tools) and run:"
echo "copy(await (await fetch('/docs/devops/browser-console-pdf-test.js')).text())"
echo "Then paste and run the script to test automatically"
echo ""
echo "Monitoring logs for PDF generation activity..."
echo ""

# Monitor logs in real-time
tail -f logs/electron/combined-*.log 2>/dev/null | while read line; do
    if echo "$line" | grep -qi "pdf.*generat\|generat.*pdf"; then
        if echo "$line" | grep -qi "error\|failed\|exception"; then
            echo -e "\033[0;31m[ERROR] $line\033[0m"
        elif echo "$line" | grep -qi "success\|complete\|generated.*buffer"; then
            echo -e "\033[0;32m[SUCCESS] $line\033[0m"
        else
            echo -e "\033[1;33m[PDF] $line\033[0m"
        fi
    elif echo "$line" | grep -qi "object.*could.*not.*be.*cloned"; then
        echo -e "\033[0;31m[CRITICAL ERROR] $line\033[0m"
        echo ""
        echo "The 'object could not be cloned' error is still occurring!"
        echo "This means our fix may not have been applied correctly."
    fi
done 