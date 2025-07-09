# Task 6.6: Office Action Response Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the Office Action Response template. These formal USPTO responses require attorney/agent signature with registration number and follow specific formatting requirements.

## Sub-tasks

### 6.6.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate office-action-response docs/testing/scenario-inputs/tfs-02-office-action-alice.yaml
   ```

2. **Analyze generated document structure:**
   - Review USPTO response format
   - Identify remarks/arguments sections
   - Note claims amendments (if any)
   - Find signature requirements section

3. **Research legal requirements:**
   - Must be signed by registered attorney/agent
   - Registration number required
   - No initials typically needed
   - Specific USPTO formatting rules
   - Electronic filing considerations

4. **Document findings:**
   - Map response structure
   - Identify signature placement
   - Note USPTO-specific requirements
   - Consider EFS-Web compatibility

**Expected Findings:**
- Main signature: End of response/remarks
- Layout: Single signature block
- Initials: Not required
- Fields needed: Name, Registration Number, Date
- Special: USPTO format compliance critical

**Investigation Output:**
```markdown
## Office Action Response Placement Map

### Response Structure:
1. Response Header/Title
2. Application Information
3. Status of Claims
4. Claim Amendments (if any)
5. Remarks/Arguments
   - Rejections Addressed
   - Arguments
   - Conclusion
6. Signature Block

Respectfully submitted,

[SIGNATURE_BLOCK:attorney-signature]

7. Attachments/Evidence (if any)
```

### 6.6.2 Implement blocks and test

**Implementation Steps:**

1. **Update office-action-response.json:**
   ```json
   {
     "id": "office-action-response",
     "name": "Office Action Response",
     "description": "...",
     "sections": [...],
     "signatureBlocks": [
       {
         "id": "attorney-signature",
         "type": "single",
         "placement": {
           "location": "after-remarks",
           "marker": "[SIGNATURE_BLOCK:attorney-signature]"
         },
         "party": {
           "role": "attorney",
           "label": "ATTORNEY/AGENT OF RECORD",
           "fields": {
             "name": { 
               "required": true, 
               "label": "Name" 
             },
             "registrationNumber": { 
               "required": true, 
               "label": "Registration No." 
             },
             "date": { 
               "required": true, 
               "label": "Date" 
             },
             "telephone": {
               "required": false,
               "label": "Telephone"
             }
           }
         }
       }
     ]
   }
   ```

2. **Consider USPTO formatting:**
   - Registration number is mandatory
   - Specific spacing requirements
   - May need telephone for correspondence
   - Format must match USPTO expectations

3. **Test template loading:**
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```

4. **Test document generation with marker:**
   ```bash
   docker exec casethread-dev npm run cli -- generate office-action-response docs/testing/scenario-inputs/tfs-02-office-action-alice.yaml
   ```

5. **Verify marker placement:**
   - Check `[SIGNATURE_BLOCK:attorney-signature]` after remarks
   - Ensure "Respectfully submitted," precedes marker
   - Verify USPTO format compliance
   - Check spacing and alignment

6. **Test USPTO requirements:**
   - Registration number included
   - Date format appropriate
   - Professional presentation
   - No extraneous formatting

7. **Run full test suite:**
   ```bash
   docker exec casethread-dev npm test
   ```

## Testing Approach

1. **Template Loading Test:**
   - Verify signature block loads
   - Check registration number field
   - Ensure backward compatibility

2. **Document Generation Test:**
   - Generate complete response
   - Verify marker placement
   - Check USPTO format compliance

3. **Professional Standards:**
   - Attorney credentials clear
   - Format matches USPTO requirements
   - Clean, professional appearance

## Definition of Done

- [ ] Investigation complete with documented findings
- [ ] Response structure mapped
- [ ] JSON template updated with signature block
- [ ] Registration number field included
- [ ] Placement directive specified
- [ ] Marker appears after remarks section
- [ ] USPTO formatting maintained
- [ ] Template loading tests pass
- [ ] Document generation successful
- [ ] Full test suite passes

## Common Pitfalls

1. **Missing registration number** - USPTO requirement
2. **Wrong placement** - Must be after remarks
3. **Format violations** - USPTO has strict rules
4. **Unnecessary fields** - Keep minimal for USPTO
5. **Date format issues** - Use standard format

## Notes

- Office action responses have strict USPTO requirements
- Registration number is legally required
- Format must facilitate electronic filing
- No initials needed for USPTO documents
- Consider future e-filing integration needs 