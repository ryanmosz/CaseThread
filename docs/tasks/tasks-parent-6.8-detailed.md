# Task 6.8: Provisional Patent Application Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the Provisional Patent Application template. These applications require inventor signatures and have unique requirements for multiple inventors.

## Sub-tasks

### 6.8.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate provisional-patent-application docs/testing/scenario-inputs/tfs-06-non-provisional-strategy.yaml
   ```

2. **Analyze generated document structure:**
   - Review specification sections
   - Identify inventor declaration area
   - Note claims (if any)
   - Find signature requirements

3. **Research legal requirements:**
   - All inventors must sign
   - Declaration under oath required
   - No initials typically needed
   - Multiple inventors sign separately
   - Date of invention important

4. **Document findings:**
   - Map application structure
   - Identify declaration/signature area
   - Consider multiple inventor scenarios
   - Note USPTO requirements

**Expected Findings:**
- Main signatures: After inventor declaration
- Layout: Sequential for multiple inventors
- Initials: Not typically required
- Fields needed: Inventor Name, Date
- Special: May have 1-10+ inventors

**Investigation Output:**
```markdown
## Provisional Patent Application Placement Map

### Application Structure:
1. Title of Invention
2. Cross-Reference (if any)
3. Background
4. Brief Summary
5. Detailed Description
6. Claims (optional for provisional)
7. Abstract
8. Inventor Declaration

I declare that I am the original inventor...

[SIGNATURE_BLOCK:inventor-signature]

Note: Multiple inventors each sign separately
```

### 6.8.2 Implement blocks and test

**Implementation Steps:**

1. **Update provisional-patent-application.json:**
   ```json
   {
     "id": "provisional-patent-application",
     "name": "Provisional Patent Application",
     "description": "...",
     "sections": [...],
     "signatureBlocks": [
       {
         "id": "inventor-signature",
         "type": "single",
         "placement": {
           "location": "after-declaration",
           "marker": "[SIGNATURE_BLOCK:inventor-signature]"
         },
         "party": {
           "role": "inventor",
           "label": "INVENTOR",
           "fields": {
             "name": { 
               "required": true, 
               "label": "Inventor Name" 
             },
             "date": { 
               "required": true, 
               "label": "Date" 
             },
             "residence": {
               "required": false,
               "label": "City and State of Residence"
             }
           }
         },
         "notes": "For multiple inventors, PDF generator should repeat this block for each inventor"
       }
     ]
   }
   ```

2. **Handle multiple inventors:**
   - Single block definition
   - PDF generator will replicate for each inventor
   - Sequential layout (not side-by-side)
   - Each inventor signs separately

3. **Test template loading:**
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```

4. **Test document generation with marker:**
   ```bash
   docker exec casethread-dev npm run cli -- generate provisional-patent-application test-provisional.yaml
   ```

5. **Verify marker placement:**
   - Check `[SIGNATURE_BLOCK:inventor-signature]` after declaration
   - Ensure marker allows for multiple instances
   - Verify declaration text precedes signatures
   - Check formatting remains clean

6. **Test inventor scenarios:**
   - Single inventor
   - Multiple inventors (2-3)
   - Many inventors (5+)
   - Verify handling instructions clear

7. **Run full test suite:**
   ```bash
   docker exec casethread-dev npm test
   ```

## Testing Approach

1. **Template Loading Test:**
   - Verify signature block loads
   - Check inventor-specific fields
   - Ensure backward compatibility

2. **Document Generation Test:**
   - Generate with single inventor
   - Note handling for multiple inventors
   - Verify marker placement

3. **USPTO Compliance:**
   - Declaration format correct
   - Inventor information complete
   - Professional appearance

## Definition of Done

- [ ] Investigation complete with documented findings
- [ ] Application structure mapped
- [ ] JSON template updated with signature block
- [ ] Multiple inventor handling noted
- [ ] Placement directive specified
- [ ] Marker appears after declaration
- [ ] Single block handles multiple inventors
- [ ] Template loading tests pass
- [ ] Document generation successful
- [ ] Full test suite passes

## Common Pitfalls

1. **Complex multi-inventor logic** - Keep simple, let PDF handle
2. **Missing residence info** - Sometimes required
3. **Wrong declaration text** - Must be legally correct
4. **Side-by-side inventors** - Should be sequential
5. **Over-engineering** - One block definition sufficient

## Notes

- Provisional applications have simpler requirements than non-provisional
- Multiple inventors common in corporate settings
- Each inventor signs identical declaration
- No witness or notary typically required
- Consider how PDF generator will handle inventor count 