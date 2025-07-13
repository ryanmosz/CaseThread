#!/bin/bash
# Automated PDF test with programmatic triggering
# Uses Chrome DevTools Protocol to trigger PDF generation

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

echo -e "${GREEN}=== Automated PDF Generation Test ===${NC}"
echo -e "${BLUE}This test will programmatically trigger PDF generation${NC}"
echo ""

# Create logs directory
mkdir -p logs/automated-tests

# Kill any existing processes
echo "Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:9222 | xargs kill -9 2>/dev/null || true
pkill -f "electron" || true
sleep 2

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="logs/automated-tests/trigger-test-${TIMESTAMP}.log"

echo -e "${YELLOW}Starting Electron app with remote debugging...${NC}"

# Start Electron with remote debugging enabled
CASETHREAD_AUTO_GENERATE=true npm run electron:dev 2>&1 | tee "$LOG_FILE" &
ELECTRON_PID=$!

echo "Electron started with PID: $ELECTRON_PID"
echo "Waiting 15 seconds for app to fully load..."

# Wait for app to load
sleep 15

# Check if app is still running
if ! kill -0 $ELECTRON_PID 2>/dev/null; then
    echo -e "${RED}✗ App crashed during startup${NC}"
    exit 1
fi

echo -e "${GREEN}✓ App is running${NC}"
echo ""

# Create a simple Node.js script to trigger PDF generation
cat > /tmp/trigger-pdf.js << 'EOF'
const CDP = require('chrome-remote-interface');

async function triggerPDFGeneration() {
    let client;
    try {
        // Connect to Chrome DevTools Protocol
        client = await CDP({port: 9222});
        const {Runtime} = client;
        
        await client.Runtime.enable();
        
        console.log('Connected to DevTools, triggering PDF generation...');
        
        // Execute JavaScript in the renderer to trigger PDF generation
        const result = await Runtime.evaluate({
            expression: `
                // Find the Generate PDF button and click it
                const button = document.querySelector('[data-testid="generate-pdf-button"]') || 
                               document.querySelector('button:contains("Generate PDF")') ||
                               Array.from(document.querySelectorAll('button')).find(btn => 
                                   btn.textContent.includes('Generate PDF')
                               );
                
                if (button) {
                    console.log('Found PDF button, clicking...');
                    button.click();
                    'PDF generation triggered';
                } else {
                    'Could not find Generate PDF button';
                }
            `
        });
        
        console.log('Result:', result.result.value);
        
        // Wait a bit for PDF generation to start
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for PDF generation status
        const statusResult = await Runtime.evaluate({
            expression: `
                // Check if PDF was generated
                const hasPdfViewer = !!document.querySelector('[data-testid="pdf-viewer"]');
                const hasError = !!document.querySelector('[data-testid="error-message"]');
                
                JSON.stringify({
                    hasPdfViewer,
                    hasError,
                    viewMode: window.viewMode || 'unknown'
                });
            `
        });
        
        console.log('Status:', JSON.parse(statusResult.result.value));
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

// Run the trigger
triggerPDFGeneration().then(() => process.exit(0)).catch(() => process.exit(1));
EOF

echo -e "${YELLOW}Attempting to trigger PDF generation...${NC}"

# Check if chrome-remote-interface is available
if ! npm list chrome-remote-interface &>/dev/null; then
    echo "Installing chrome-remote-interface..."
    npm install --no-save chrome-remote-interface &>/dev/null
fi

# Run the trigger script
node /tmp/trigger-pdf.js 2>&1 | tee -a "$LOG_FILE"
TRIGGER_RESULT=$?

# Wait for PDF generation to complete
echo ""
echo "Waiting 10 seconds for PDF generation to complete..."
sleep 10

# Check results
echo -e "\n${YELLOW}Checking test results...${NC}"

ERROR_COUNT=0
SUCCESS_COUNT=0

# Check for errors
if grep -q "An object could not be cloned" "$LOG_FILE"; then
    echo -e "${RED}✗ Found 'object could not be cloned' error${NC}"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✓ No serialization errors${NC}"
    ((SUCCESS_COUNT++))
fi

if grep -q "addToast is not a function" "$LOG_FILE"; then
    echo -e "${RED}✗ Found 'addToast is not a function' error${NC}"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✓ No toast function errors${NC}"
    ((SUCCESS_COUNT++))
fi

if grep -q "PDF generation started" "$LOG_FILE"; then
    echo -e "${GREEN}✓ PDF generation started${NC}"
    ((SUCCESS_COUNT++))
fi

if grep -q "PDF buffer created" "$LOG_FILE"; then
    echo -e "${GREEN}✓ PDF buffer created${NC}"
    ((SUCCESS_COUNT++))
fi

if [ $TRIGGER_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ PDF trigger script succeeded${NC}"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}✗ PDF trigger script failed${NC}"
    ((ERROR_COUNT++))
fi

# Cleanup
echo -e "\n${YELLOW}Cleaning up...${NC}"
kill_process_tree $ELECTRON_PID
rm -f /tmp/trigger-pdf.js
sleep 2

# Summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo -e "Successes: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Errors: ${RED}$ERROR_COUNT${NC}"

if [ $ERROR_COUNT -eq 0 ] && [ $SUCCESS_COUNT -gt 3 ]; then
    echo -e "\n${GREEN}✅ TEST PASSED${NC}"
    echo "PDF generation is working correctly!"
else
    echo -e "\n${RED}❌ TEST FAILED${NC}"
    echo "Check the log for details: $LOG_FILE"
fi

echo ""
echo "Log file: $LOG_FILE"
echo -e "${GREEN}Test complete!${NC}"

exit $ERROR_COUNT 