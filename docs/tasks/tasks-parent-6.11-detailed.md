# Task 6.6: Run and Verify All Existing Tests Pass

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

After updating all templates and TypeScript interfaces, run the complete test suite to ensure no existing functionality has been broken. Fix any failing tests and verify backward compatibility.

## Sub-tasks

### 6.6.1 Run the complete test suite

**Implementation Steps:**
1. Run all tests in the Docker container:
   ```bash
   docker exec casethread-dev npm test
   ```
2. Note any failing tests
3. Capture the test output for analysis

**Expected Output:**
- All 266 tests should pass (based on current state)
- No new failures related to template changes
- TypeScript compilation should succeed

### 6.6.2 Run specific template service tests

**Implementation Steps:**
1. Focus on template-related tests:
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```
2. Verify template loading works with new structure
3. Check that signature blocks don't break existing logic

**Key Tests to Verify:**
- Template loading succeeds
- Template validation passes
- Document generation completes

### 6.6.3 Fix any TypeScript compilation issues

**Implementation Steps:**
1. If TypeScript errors occur, check:
   ```bash
   docker exec casethread-dev npm run build
   ```
2. Common issues to fix:
   - Missing imports
   - Type mismatches
   - Interface compatibility

**Potential Fixes:**
```typescript
// If template service needs updating
if (template.signatureBlocks) {
  // Handle signature blocks (currently just ignore)
  console.debug(`Template ${template.id} has ${template.signatureBlocks.length} signature blocks`);
}
```

### 6.6.4 Test document generation for each type

**Implementation Steps:**
1. Create a test script to verify all document types:
   ```bash
   #!/bin/bash
   # test-all-templates.sh
   
   echo "Testing all document types with signature blocks..."
   
   templates=(
     "cease-and-desist-letter"
     "nda-ip-specific"
     "office-action-response"
     "patent-assignment-agreement"
     "patent-license-agreement"
     "provisional-patent-application"
     "technology-transfer-agreement"
     "trademark-application"
   )
   
   for template in "${templates[@]}"; do
     echo "Testing $template..."
     docker exec casethread-dev npm run cli -- generate $template test-input.yaml --output ./test-output
     if [ $? -eq 0 ]; then
       echo "✓ $template generated successfully"
     else
       echo "✗ $template failed"
       exit 1
     fi
   done
   
   echo "All templates tested successfully!"
   ```

2. Run the script and verify all succeed

### 6.6.5 Verify backward compatibility

**Implementation Steps:**
1. Ensure generated documents are unchanged
2. Compare output with pre-change versions
3. Verify no runtime errors with signature blocks

**Test Commands:**
```bash
# Generate a document and check output
docker exec casethread-dev npm run cli -- generate patent-assignment-agreement docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml

# Check that output still contains expected content
docker exec casethread-dev cat generated-documents/*.md | head -20
```

### 6.6.6 Update test snapshots if needed

**Implementation Steps:**
1. If tests use snapshots, they may need updating
2. Review any snapshot changes carefully
3. Only update if changes are expected

**Commands:**
```bash
# Update test snapshots if legitimate changes
docker exec casethread-dev npm test -- -u

# Review changes
git diff __tests__/**/*.snap
```

### 6.6.7 Document test results

**Implementation Steps:**
1. Create a summary of test results
2. Note any issues encountered
3. Document any workarounds needed

**Test Summary Template:**
```markdown
## Test Results Summary

Date: [DATE]
Total Tests: 266
Passed: [NUMBER]
Failed: [NUMBER]

### Template Service Tests
- ✓ All templates load successfully
- ✓ Signature blocks are ignored during generation
- ✓ No TypeScript compilation errors

### Document Generation Tests
- ✓ cease-and-desist-letter
- ✓ nda-ip-specific
- ✓ office-action-response
- ✓ patent-assignment-agreement
- ✓ patent-license-agreement
- ✓ provisional-patent-application
- ✓ technology-transfer-agreement
- ✓ trademark-application

### Issues Encountered
[List any issues and how they were resolved]

### Next Steps
- Ready for PDF implementation
- Consider main branch merge
```

## Testing Approach

1. **Comprehensive Testing:**
   - Run full test suite
   - Focus on template-specific tests
   - Test actual document generation

2. **Fix Issues Immediately:**
   - Don't proceed with broken tests
   - Fix root causes, not symptoms
   - Maintain test coverage

3. **Document Everything:**
   - Keep track of what was tested
   - Note any concerning behavior
   - Create issues for future work

## Definition of Done

- [ ] All existing tests pass (266 tests)
- [ ] TypeScript compilation succeeds
- [ ] Template service tests specifically verified
- [ ] Document generation works for all 8 types
- [ ] No runtime errors with new signature blocks
- [ ] Test results documented
- [ ] Ready for coordination with Developer G

## Common Pitfalls

1. **Ignoring "minor" test failures** - All tests must pass
2. **Not testing actual CLI usage** - Manual testing is important
3. **Forgetting to run build** - TypeScript must compile
4. **Not checking generated output** - Ensure documents are unchanged

## Troubleshooting Guide

### If template tests fail:
1. Check JSON syntax in templates
2. Verify TypeScript interfaces match
3. Look for missing required fields

### If TypeScript won't compile:
1. Check for circular imports
2. Verify all types are exported
3. Look for interface mismatches

### If document generation fails:
1. Check template loading logs
2. Verify YAML test inputs
3. Look for null/undefined errors

## Notes

- This is the critical quality gate before merging
- All tests must pass before proceeding
- This validates our backward compatibility promise
- Consider creating a CI test script for future use 