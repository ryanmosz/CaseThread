# Task 6.2: Patent Assignment Agreement Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the Patent Assignment Agreement template. This document typically involves transfer of patent rights from assignor to assignee and may require initials on key sections.

## Sub-tasks

### 6.2.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate patent-assignment-agreement docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
   ```

2. **Analyze generated document structure:**
   - Open the generated markdown file
   - Identify major sections (e.g., recitals, assignment clause, warranties)
   - Note current placement of party information
   - Look for natural signature placement points

3. **Research legal requirements:**
   - Patent assignments typically require both parties' signatures
   - Side-by-side format is standard for two-party agreements
   - May need initials on assignment clause itself
   - Some jurisdictions require witness signatures

4. **Document findings:**
   - Create a placement map showing:
     - Section names and numbers
     - Recommended signature placement
     - Initial requirements (if any)
     - Special considerations

**Expected Findings:**
- Main signatures: After assignment section, before governing law
- Layout: Side-by-side for assignor/assignee
- Initials: Possibly on assignment clause page
- Fields needed: Name, Title (optional), Date, Company (for assignee)

**Investigation Output:**
```markdown
## Patent Assignment Placement Map

### Document Structure:
1. Header/Title
2. Party Information
3. Recitals/Background
4. Assignment Clause [INITIALS_BLOCK:assignor-initials] [INITIALS_BLOCK:assignee-initials]
5. Warranties and Representations
6. General Provisions

[SIGNATURE_BLOCK:assignor-signature]
[SIGNATURE_BLOCK:assignee-signature]

7. Governing Law
```

### 6.2.2 Implement blocks and test

**Implementation Steps:**

1. **Update patent-assignment-agreement.json:**
   ```json
   {
     "id": "patent-assignment-agreement",
     "name": "Patent Assignment Agreement",
     "description": "...",
     "sections": [...],
     "signatureBlocks": [
       {
         "id": "assignor-signature",
         "type": "single",
         "placement": {
           "location": "after-section-assignment",
           "marker": "[SIGNATURE_BLOCK:assignor-signature]"
         },
         "party": {
           "role": "assignor",
           "label": "ASSIGNOR",
           "fields": {
             "name": { "required": true, "label": "Name" },
             "title": { "required": false, "label": "Title" },
             "date": { "required": true, "label": "Date" }
           }
         }
       },
       {
         "id": "assignee-signature",
         "type": "single",
         "placement": {
           "location": "after-section-assignment",
           "marker": "[SIGNATURE_BLOCK:assignee-signature]"
         },
         "layout": {
           "position": "side-by-side",
           "groupWith": "assignor-signature",
           "preventPageBreak": true
         },
         "party": {
           "role": "assignee",
           "label": "ASSIGNEE",
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
         "id": "assignor-initials",
         "placement": {
           "locations": ["after-assignment-clause"],
           "marker": "[INITIALS_BLOCK:assignor-initials]"
         },
         "party": {
           "role": "assignor",
           "label": "Assignor"
         }
       },
       {
         "id": "assignee-initials",
         "placement": {
           "locations": ["after-assignment-clause"],
           "marker": "[INITIALS_BLOCK:assignee-initials]"
         },
         "party": {
           "role": "assignee",
           "label": "Assignee"
         }
       }
     ]
   }
   ```

2. **Update document generation to include markers:**
   - Ensure OpenAI service includes markers in appropriate positions
   - May need to modify prompt or post-process output

3. **Test template loading:**
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```

4. **Test document generation with markers:**
   ```bash
   docker exec casethread-dev npm run cli -- generate patent-assignment-agreement docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
   ```

5. **Verify marker placement:**
   - Check that `[SIGNATURE_BLOCK:assignor-signature]` appears after assignment section
   - Check that `[SIGNATURE_BLOCK:assignee-signature]` appears in correct position
   - Verify initial blocks appear where expected
   - Ensure no disruption to document flow

6. **Run full test suite:**
   ```bash
   docker exec casethread-dev npm test
   ```

## Testing Approach

1. **Template Loading Test:**
   - Verify template loads with new blocks
   - Check signature blocks are accessible
   - Ensure backward compatibility

2. **Document Generation Test:**
   - Generate document with test scenario
   - Verify markers appear in output
   - Check document remains readable
   - Ensure no content is lost

3. **Marker Validation:**
   - Confirm all markers are unique
   - Verify marker format is consistent
   - Check markers are in logical positions

## Definition of Done

- [ ] Investigation complete with documented findings
- [ ] Placement map created showing marker positions
- [ ] JSON template updated with signature blocks
- [ ] Initial blocks added where needed
- [ ] All placement directives specified
- [ ] Markers appear in generated documents
- [ ] Template loading tests pass
- [ ] Document generation works correctly
- [ ] Full test suite passes

## Common Pitfalls

1. **Incorrect marker placement** - Ensure markers don't break document flow
2. **Missing company field** - Assignee often needs company name
3. **Forgetting initials** - Assignment clause may need initials
4. **Invalid JSON** - Always validate after editing
5. **Breaking existing functionality** - Test thoroughly

## Notes

- Patent assignments are legally binding transfers of rights
- Side-by-side signatures are industry standard
- Initial blocks on key clauses add legal weight
- This template serves as a model for other two-party agreements
- Consider future needs for witness signatures 