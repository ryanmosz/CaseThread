# Task 6.7: Patent License Agreement Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the Patent License Agreement template. License agreements involve licensor and licensee parties and often require initials on key commercial terms sections.

## Sub-tasks

### 6.7.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate patent-license-agreement docs/testing/scenario-inputs/tfs-04-patent-license-cloudgiant.yaml
   ```

2. **Analyze generated document structure:**
   - Review grant of license section
   - Identify payment/royalty terms
   - Note territory and field restrictions
   - Find termination provisions

3. **Research legal requirements:**
   - Both licensor and licensee must sign
   - Side-by-side signatures typical
   - Initials on financial terms common
   - May need initials on exclusivity clauses
   - Witness signatures for high-value licenses

4. **Document findings:**
   - Map agreement structure
   - Identify critical sections needing initials
   - Note signature arrangement
   - Consider commercial importance

**Expected Findings:**
- Main signatures: End of agreement
- Layout: Side-by-side for two parties
- Initials: On grant clause, payment terms, exclusivity
- Fields needed: Name, Title, Company, Date
- Special: Financial terms need extra attention

**Investigation Output:**
```markdown
## Patent License Agreement Placement Map

### Agreement Structure:
1. Title and Parties
2. Recitals
3. Grant of License [INITIALS_BLOCK:licensor-initials] [INITIALS_BLOCK:licensee-initials]
4. License Fees/Royalties [INITIALS_BLOCK:licensor-initials] [INITIALS_BLOCK:licensee-initials]
5. Territory and Field
6. Term and Termination
7. Warranties and Indemnification
8. General Provisions

[SIGNATURE_BLOCK:licensor-signature]
[SIGNATURE_BLOCK:licensee-signature]

Critical sections requiring initials for clarity
```

### 6.7.2 Implement blocks and test

**Implementation Steps:**

1. **Update patent-license-agreement.json:**
   ```json
   {
     "id": "patent-license-agreement",
     "name": "Patent License Agreement",
     "description": "...",
     "sections": [...],
     "signatureBlocks": [
       {
         "id": "licensor-signature",
         "type": "single",
         "placement": {
           "location": "document-end",
           "marker": "[SIGNATURE_BLOCK:licensor-signature]"
         },
         "party": {
           "role": "licensor",
           "label": "LICENSOR",
           "fields": {
             "name": { "required": true, "label": "Name" },
             "title": { "required": false, "label": "Title" },
             "company": { "required": true, "label": "Company" },
             "date": { "required": true, "label": "Date" }
           }
         }
       },
       {
         "id": "licensee-signature",
         "type": "single",
         "placement": {
           "location": "document-end",
           "marker": "[SIGNATURE_BLOCK:licensee-signature]"
         },
         "layout": {
           "position": "side-by-side",
           "groupWith": "licensor-signature",
           "preventPageBreak": true
         },
         "party": {
           "role": "licensee",
           "label": "LICENSEE",
           "fields": {
             "name": { "required": true, "label": "Name" },
             "title": { "required": false, "label": "Title" },
             "company": { "required": true, "label": "Company" },
             "date": { "required": true, "label": "Date" }
           }
         }
       }
     ],
     "initialBlocks": [
       {
         "id": "licensor-initials",
         "placement": {
           "locations": [
             "after-grant-section",
             "after-payment-terms",
             "after-exclusivity-clause"
           ],
           "marker": "[INITIALS_BLOCK:licensor-initials]"
         },
         "party": {
           "role": "licensor",
           "label": "Licensor"
         }
       },
       {
         "id": "licensee-initials",
         "placement": {
           "locations": [
             "after-grant-section",
             "after-payment-terms",
             "after-exclusivity-clause"
           ],
           "marker": "[INITIALS_BLOCK:licensee-initials]"
         },
         "party": {
           "role": "licensee",
           "label": "Licensee"
         }
       }
     ]
   }
   ```

2. **Focus on commercial terms:**
   - Grant of license needs initials
   - Payment/royalty sections critical
   - Exclusivity provisions important
   - Strategic initial placement

3. **Test template loading:**
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```

4. **Test document generation with markers:**
   ```bash
   docker exec casethread-dev npm run cli -- generate patent-license-agreement docs/testing/scenario-inputs/tfs-04-patent-license-cloudgiant.yaml
   ```

5. **Verify marker placement:**
   - Signatures at end, side-by-side
   - Initials after key commercial terms
   - No disruption to agreement flow
   - Clear marking of critical sections

6. **Test different license types:**
   - Exclusive licenses
   - Non-exclusive licenses
   - Field-limited licenses
   - Verify appropriate sections marked

7. **Run full test suite:**
   ```bash
   docker exec casethread-dev npm test
   ```

## Testing Approach

1. **Template Loading Test:**
   - Both signature and initial blocks load
   - Multiple initial locations work
   - Backward compatibility maintained

2. **Document Generation Test:**
   - Generate complete license
   - Verify initial placement on key terms
   - Check signature arrangement
   - Test with complex payment structures

3. **Commercial Validation:**
   - Critical terms properly marked
   - Initial blocks enhance clarity
   - Professional appearance maintained

## Definition of Done

- [ ] Investigation complete with documented findings
- [ ] License structure mapped with initial points
- [ ] JSON template updated with signature blocks
- [ ] Initial blocks on commercial terms
- [ ] All placement directives specified
- [ ] Markers appear correctly in output
- [ ] Side-by-side signatures working
- [ ] Strategic initials properly placed
- [ ] Template loading tests pass
- [ ] Full test suite passes

## Common Pitfalls

1. **Missing payment term initials** - Critical for disputes
2. **Wrong company fields** - Both parties are usually companies
3. **Forgetting exclusivity initials** - Important for scope
4. **Too many initial points** - Focus on key terms only
5. **Signature spacing issues** - Maintain professional look

## Notes

- License agreements are complex commercial documents
- Initial blocks on financial terms prevent disputes
- Side-by-side signatures show mutual agreement
- Company information usually required for both parties
- Consider different license types in testing 