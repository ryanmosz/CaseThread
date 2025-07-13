# Automated PDF Testing Workflow

This document describes the automated testing loop for PDF generation in CaseThread. This workflow allows programmatic testing without human intervention, enabling efficient debugging and fixing of PDF generation issues.

## Overview

The automated testing workflow follows this loop:
1. Kill any process on port 3000
2. Start the Electron app with auto-generation enabled
3. Track the specific process ID (PID)
4. Trigger PDF generation automatically
5. Capture and analyze logs
6. Kill only the specific app instance and its children
7. Fix any errors found
8. Repeat

**Important**: Each test iteration properly manages its own process, ensuring only one Electron instance runs at a time to avoid hard-to-diagnose problems.

## Quick Start

### Simple Test (Recommended)
```bash
# Test with default document (nda-ip-specific)
./scripts/simple-pdf-test-loop.sh

# Test with specific document type
./scripts/simple-pdf-test-loop.sh patent-assignment-agreement
```

### Advanced Test (with retry loop)
```bash
# Run up to 5 attempts with automatic retry
./scripts/automated-pdf-test-loop.sh

# Test specific document type with retries
./scripts/automated-pdf-test-loop.sh trademark-application
```

### Comprehensive Test (all document types)
```bash
# Test all 8 document types sequentially
./scripts/comprehensive-pdf-test.sh
```

### Quick Validation
```bash
# Quick test to verify PDF generation is working
./scripts/quick-pdf-test.sh
```

## Process Management

All test scripts implement proper process management:

1. **Process Tracking**: Each spawned Electron instance is tracked by its PID
2. **Process Tree Killing**: When terminating, the script kills the process and all its children
3. **Port Cleanup**: Ensures port 3000 is free before starting a new instance
4. **Single Instance**: Only one Electron app runs at a time, preventing conflicts

### kill_process_tree Function
```bash
kill_process_tree() {
    local parent_pid=$1
    local child_pids=$(pgrep -P $parent_pid)
    
    # Kill children first
    for child in $child_pids; do
        kill_process_tree $child
    done
    
    # Then kill the parent
    kill -9 $parent_pid 2>/dev/null || true
}
```

## How It Works

### 1. Starting the App
```bash
CASETHREAD_AUTO_GENERATE=true \
CASETHREAD_DOCUMENT_TYPE="nda-ip-specific" \
npm run electron:dev > "$LOG_FILE" 2>&1 &

APP_PID=$!
echo "Started Electron with PID: $APP_PID"
```

### 2. Monitoring
The script monitors for:
- Successful PDF generation: `"PDF generated successfully"`, `"buffer.*byteLength"`
- Errors: `"An object could not be cloned"`, `"addToast is not a function"`
- App crashes: Process no longer exists

### 3. Cleanup
```bash
# Kill the specific app instance
kill_process_tree $APP_PID

# Also ensure port 3000 is free
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
```

## Test Scripts

### simple-pdf-test-loop.sh
- Single test run
- 30-second monitoring period
- Basic log analysis
- Proper process cleanup

### automated-pdf-test-loop.sh
- Up to 5 retry attempts
- Automatic error detection
- Progressive retry with delays
- Returns success on first passing attempt

### comprehensive-pdf-test.sh
- Tests all 8 document types
- Individual process for each document type
- Summary report with pass/fail counts
- Detailed error logging

### quick-pdf-test.sh
- Manual test instructions
- Automatic test with monitoring
- Real-time success/failure detection
- Color-coded output

## Log Analysis

Logs are stored in `./logs/automated-tests/` with timestamps:
- `electron-simple-*.log` - Simple test logs
- `electron-*.log` - Full test logs
- `test-results*.log` - Test summaries
- `comprehensive-results-*.txt` - All document type results

### Common Log Patterns

Success indicators:
```
PDF generated successfully
Generated PDF successfully
buffer.*byteLength
PDF document created
```

Error indicators:
```
An object could not be cloned
addToast is not a function
Cannot find module
Process crashed
```

## Troubleshooting

### Multiple Electron Windows
**Problem**: Multiple Electron instances running simultaneously
**Solution**: Scripts now track specific PIDs and kill process trees

### Port 3000 Already in Use
**Problem**: Previous test didn't clean up properly
**Solution**: All scripts now kill processes on port 3000 before starting

### App Crashes on Startup
**Problem**: Electron crashes before PDF generation
**Solution**: Scripts detect crashed processes and report appropriately

### No Clear Success/Failure
**Problem**: PDF generation completes but logs are unclear
**Solution**: Extended monitoring period and multiple success patterns

## Best Practices

1. **Always use the scripts** instead of manual testing for consistency
2. **Check logs** after failures for specific error messages
3. **Run comprehensive test** after making fixes to ensure all document types work
4. **Monitor process count** - ensure only one Electron instance at a time
5. **Clean environment** - kill all Electron processes before starting test suite

## Example Test Session

```bash
# 1. Clean environment
pkill -f "electron.*CaseThread" || true

# 2. Run quick test
./scripts/quick-pdf-test.sh

# 3. If issues found, check logs
cat logs/automated-tests/electron-simple-*.log | grep -i error

# 4. After fixing, run comprehensive test
./scripts/comprehensive-pdf-test.sh

# 5. Check results
cat logs/automated-tests/comprehensive-results-*.txt
```

## Integration with Development

When developing PDF features:
1. Make changes to code
2. Run `./scripts/quick-pdf-test.sh` for quick validation
3. Run `./scripts/comprehensive-pdf-test.sh` before committing
4. Check all document types pass

The automated testing ensures consistent, repeatable testing without manual intervention. 