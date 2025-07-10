# Task 6.5: NDA IP Specific Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the NDA IP Specific template. This template can be either mutual (both parties sign) or unilateral (two parties sign), requiring flexible signature configurations.

## Sub-tasks

### 6.5.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate nda-ip-specific docs/testing/scenario-inputs/rtp-01-collaboration-nda.yaml
   ```

2. **Analyze generated document structure:**
   - Review mutual vs unilateral configurations
   - Identify signature placement
   - Check for initial requirements
   - Note party configurations

3. **Research legal requirements:**
   - Both parties must sign (mutual or unilateral)
   - Standard contract signatures
   - Page initials commonly required
   - No witness/notary typically needed
   - Entity signers need title

4. **Document findings:**
   - Map document structure
   - Identify signature placement
   - Note party label differences
   - Consider initial block needs

**Expected Findings:**
- Main signatures: Two blocks at document end
- Layout: Sequential (stacked)
- Initials: Page-by-page common
- Fields needed: Name, Title, Date
- Special: Labels vary by agreement type

**Investigation Output:**
```markdown
## NDA Placement Map

### Document Structure:
1. Title (MUTUAL or standard)
2. Parties
3. Recitals
4. Confidential Information
5. Obligations
6. IP Provisions (optional)
7. Term
8. Governing Law
9. Signatures

IN WITNESS WHEREOF...

[SIGNATURE_BLOCK:first-party]
[SIGNATURE_BLOCK:second-party]

### Page Initials:
[INITIALS_BLOCK:page-initials]
```

## ACTUAL INVESTIGATION FINDINGS (2025-01-08)

### Document Structure Analysis:
The generated NDA IP Specific document follows this structure:
1. **Title**: "MUTUAL NON-DISCLOSURE AGREEMENT" (or just "NON-DISCLOSURE AGREEMENT" for unilateral)
2. **Parties**: Introduction with effective date and party names
3. **Recitals**: WHEREAS clauses explaining purpose
4. **Section 1 - Confidential Information**: Definitions
5. **Section 2 - Obligations**: Receiving party obligations
6. **Section 3 - IP Provisions**: Intellectual property protections (optional)
7. **Section 4 - Term**: Duration and survival
8. **Section 5 - Governing Law**: Applicable law
9. **Section 6 - Miscellaneous**: Standard boilerplate
10. **Signatures**: Signature blocks for both parties

### Key Findings:
1. **Two Signatures Required**:
   - Both parties must sign (whether mutual or unilateral)
   - Sequential layout (stacked vertically)
   - Standard contract signature format

2. **Signature Placement**:
   - After "IN WITNESS WHEREOF" clause
   - Current template has placeholders for both parties
   - Labels change based on agreement type:
     - Mutual: "FIRST PARTY:" and "SECOND PARTY:"
     - Unilateral: "DISCLOSING PARTY:" and "RECEIVING PARTY:"

3. **Initial Blocks Commonly Used**:
   - NDAs often require page-by-page initials
   - Ensures all pages reviewed and accepted
   - Typically placed at bottom of each page

4. **Fields Required**:
   - Name (always required)
   - Title (always required for entities)
   - Date (always required)
   - "By:" line for actual signature

5. **Special Considerations**:
   - Agreement type affects party labels
   - Both mutual and unilateral use same signature format
   - No witness or notary requirements
   - Standard business agreement format

### Template Current State:
The signatures section already has party placeholders but needs proper signature block definitions with markers and support for page initials.

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