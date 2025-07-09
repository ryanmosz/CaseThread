# Task 6.5: NDA IP Specific Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the NDA IP Specific template. NDAs typically require signatures from both disclosing and receiving parties and often include page-by-page initials to prevent tampering.

## Sub-tasks

### 6.5.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate nda-ip-specific docs/testing/scenario-inputs/cil-01-patent-assignment.yaml
   ```

2. **Analyze generated document structure:**
   - Review confidentiality terms
   - Identify key sections (definition, obligations, term)
   - Note where parties are defined
   - Look for signature section placement

3. **Research legal requirements:**
   - Both parties must sign (disclosing and receiving)
   - Side-by-side signatures common
   - Page initials often required for security
   - May need witness signatures
   - Date fields essential for term calculation

4. **Document findings:**
   - Map NDA structure
   - Identify initial placement needs
   - Note signature arrangement
   - Consider page numbering for initials

**Expected Findings:**
- Main signatures: End of agreement
- Layout: Side-by-side for two parties
- Initials: Each page footer recommended
- Fields needed: Name, Title, Company, Date
- Special: Initial blocks prevent page substitution

**Investigation Output:**
```markdown
## NDA IP Specific Placement Map

### Document Structure:
1. Title/Header
2. Party Definitions
3. Recitals
4. Definitions [INITIALS_BLOCK:disclosing-initials] [INITIALS_BLOCK:receiving-initials]
5. Confidentiality Obligations [INITIALS_BLOCK:disclosing-initials] [INITIALS_BLOCK:receiving-initials]
6. Permitted Use [INITIALS_BLOCK:disclosing-initials] [INITIALS_BLOCK:receiving-initials]
7. Term and Termination [INITIALS_BLOCK:disclosing-initials] [INITIALS_BLOCK:receiving-initials]
8. General Provisions

[SIGNATURE_BLOCK:disclosing-party-signature]
[SIGNATURE_BLOCK:receiving-party-signature]

Page initials on each page footer
```

### 6.5.2 Implement blocks and test

**Implementation Steps:**

1. **Update nda-ip-specific.json:**
   ```json
   {
     "id": "nda-ip-specific",
     "name": "Non-Disclosure Agreement (IP Specific)",
     "description": "...",
     "sections": [...],
     "signatureBlocks": [
       {
         "id": "disclosing-party-signature",
         "type": "single",
         "placement": {
           "location": "document-end",
           "marker": "[SIGNATURE_BLOCK:disclosing-party-signature]"
         },
         "party": {
           "role": "disclosing-party",
           "label": "DISCLOSING PARTY",
           "fields": {
             "name": { "required": true, "label": "Name" },
             "title": { "required": false, "label": "Title" },
             "company": { "required": false, "label": "Company" },
             "date": { "required": true, "label": "Date" }
           }
         }
       },
       {
         "id": "receiving-party-signature",
         "type": "single",
         "placement": {
           "location": "document-end",
           "marker": "[SIGNATURE_BLOCK:receiving-party-signature]"
         },
         "layout": {
           "position": "side-by-side",
           "groupWith": "disclosing-party-signature",
           "preventPageBreak": true
         },
         "party": {
           "role": "receiving-party",
           "label": "RECEIVING PARTY",
           "fields": {
             "name": { "required": true, "label": "Name" },
             "title": { "required": false, "label": "Title" },
             "company": { "required": false, "label": "Company" },
             "date": { "required": true, "label": "Date" }
           }
         }
       }
     ],
     "initialBlocks": [
       {
         "id": "disclosing-initials",
         "placement": {
           "locations": ["each-page-footer"],
           "marker": "[INITIALS_BLOCK:disclosing-initials]"
         },
         "party": {
           "role": "disclosing-party",
           "label": "DP"
         }
       },
       {
         "id": "receiving-initials",
         "placement": {
           "locations": ["each-page-footer"],
           "marker": "[INITIALS_BLOCK:receiving-initials]"
         },
         "party": {
           "role": "receiving-party",
           "label": "RP"
         }
       }
     ]
   }
   ```

2. **Handle page-by-page initials:**
   - Initial blocks should appear on each page
   - Consider footer placement
   - May need page numbering integration

3. **Test template loading:**
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```

4. **Test document generation with markers:**
   ```bash
   docker exec casethread-dev npm run cli -- generate nda-ip-specific test-nda-input.yaml
   ```

5. **Verify marker placement:**
   - Signature blocks at document end
   - Initial markers on each page footer
   - Side-by-side layout preserved
   - No overlap or formatting issues

6. **Test confidentiality aspects:**
   - Ensure initial blocks don't reveal confidential info
   - Verify markers maintain document security
   - Check page integrity markers

7. **Run full test suite:**
   ```bash
   docker exec casethread-dev npm test
   ```

## Testing Approach

1. **Template Loading Test:**
   - Verify both signature and initial blocks load
   - Check multiple placement locations
   - Ensure backward compatibility

2. **Document Generation Test:**
   - Generate multi-page NDA
   - Verify initials on each page
   - Check signature placement
   - Test side-by-side layout

3. **Security Validation:**
   - Initial blocks serve security purpose
   - Placement doesn't compromise content
   - All pages properly marked

## Definition of Done

- [ ] Investigation complete with documented findings
- [ ] NDA structure mapped with initial points
- [ ] JSON template updated with signature blocks
- [ ] Initial blocks configured for each page
- [ ] All placement directives specified
- [ ] Markers appear correctly in output
- [ ] Side-by-side signatures working
- [ ] Page initials properly placed
- [ ] Template loading tests pass
- [ ] Full test suite passes

## Common Pitfalls

1. **Missing page initials** - Critical for NDA security
2. **Wrong party labels** - Use clear DP/RP abbreviations
3. **Forgetting dates** - Essential for term calculation
4. **Page break issues** - Signatures must stay together
5. **Initial overlap** - Ensure clean footer layout

## Notes

- NDAs require high security and tamper prevention
- Page initials are industry standard for sensitive agreements
- Side-by-side signatures show mutual agreement
- Consider adding witness blocks in future
- Initial placement must not interfere with content 