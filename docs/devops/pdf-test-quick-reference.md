# PDF Test Quick Reference

## 🚀 Quick Test (30 seconds)
```bash
./scripts/simple-pdf-test-loop.sh
```

## 🔄 Full Test Loop (with retries)
```bash
./scripts/automated-pdf-test-loop.sh
```

## 📋 Test Specific Document
```bash
./scripts/simple-pdf-test-loop.sh patent-assignment-agreement
```

## 📁 Check Results
```bash
# View summary
cat logs/automated-tests/test-results-simple.log

# View full logs
less logs/automated-tests/electron-simple-*.log

# Search for errors
grep -i "error" logs/automated-tests/electron-*.log
```

## 🛠 Common Fixes

| Error | Fix |
|-------|-----|
| "An object could not be cloned" | Check IPC serialization in `usePDFGeneration` |
| "addToast is not a function" | Remove toast dependencies from hooks |
| "Cannot find module" | Install missing package |
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` |

## 📊 Test Workflow
1. **Kill** port 3000 → 2. **Start** with auto-gen → 3. **Wait** 30s → 4. **Analyze** logs → 5. **Fix** errors → 6. **Repeat**

## 🎯 Success Indicator
Look for: `"PDF generated successfully"` in logs

---
*Full docs: `docs/devops/automated-pdf-testing-workflow.md`* 