# Task 6.3: Trademark Application Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the Trademark Application template. Trademark applications typically require only the applicant's signature and rarely need initials, making this one of the simpler signature patterns.

## Sub-tasks

### 6.3.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate trademark-application docs/testing/scenario-inputs/rtp-02-trademark-application.yaml
   ```

2. **Analyze generated document structure:**
   - Review the application sections
   - Identify declaration/verification section
   - Note where applicant information appears
   - Find natural signature placement point

3. **Research legal requirements:**
   - USPTO requires signature on declaration
   - Single signature from applicant or authorized representative
   - Corporate applicants need title of signatory
   - No initials typically required
   - Electronic filing may have specific requirements

4. **Document findings:**
   - Map document structure
   - Identify signature placement
   - Note any special requirements
   - Consider future electronic filing needs

**Expected Findings:**
- Main signature: At end of application/declaration
- Layout: Single signature block
- Initials: Not typically required
- Fields needed: Name, Title (if entity), Date
- Special: May need declaration text above signature

**Investigation Output:**
```markdown
## Trademark Application Placement Map

### Document Structure:
1. Application Header
2. Applicant Information
3. Mark Description
4. Goods/Services Description
5. Basis for Filing
6. Declaration/Verification

I declare under penalty of perjury...

[SIGNATURE_BLOCK:applicant-signature]

7. Additional Statements (if any)
```

## ACTUAL INVESTIGATION FINDINGS (2025-01-08)

### Document Structure Analysis:
The generated trademark application follows this structure:
1. **Title**: "TRADEMARK APPLICATION TEAS Plus Electronic Filing"
2. **Mark Information**: Mark text and type
3. **Applicant Information**: Name, entity type, address, citizenship
4. **Goods and Services**: International classes and descriptions
5. **Filing Basis**: Section 1(a) or 1(b) with dates if applicable
6. **Specimen**: Description (only for use-based applications)
7. **Declaration**: Legal declaration text (required by USPTO)
8. **Signature Section**: Attorney/authorized signatory information

### Key Findings:
1. **Single Signature Required**: 
   - Attorney signs on behalf of applicant (most common)
   - Or authorized signatory for the applicant entity
   - No co-signatures or witness requirements

2. **Signature Placement**:
   - Immediately follows the declaration text
   - Currently includes: Signature line, Name, Date, "ATTORNEY OF RECORD", Email
   - Marker should be placed at the end of signature section content

3. **No Initial Blocks Needed**:
   - Trademark applications don't require page initials
   - No section-specific acknowledgments needed
   - Single signature suffices for entire application

4. **Fields Required**:
   - Name (always required)
   - Title (optional - only for entity representatives)
   - Date (always required)
   - Attorney registration info already handled in template

5. **Special Considerations**:
   - Declaration text is legally mandated and must precede signature
   - Title field should be conditional based on applicant type
   - Electronic filing through TEAS has specific formatting requirements
   - Current template already has attorney fields which can serve dual purpose

### 6.3.2 Implementation Results

**Completed 2025-01-08**

Initially implemented with TEAS electronic signature format `/{{attorney_name}}/` but later revised based on architectural decision.

**Key Decision: Electronic vs Physical Signatures**

After implementation review, we made a critical architectural decision:
- **Remove electronic signature formats** from all templates
- **Use traditional signature blocks only**
- **Generate PDFs for physical signing**

**Rationale:**
1. Electronic signatures like `/name/` are only valid when typed into filing systems
2. PDFs need traditional signature blocks for printing and signing
3. Users filing electronically will copy content into web forms anyway
4. Simplifies implementation without losing functionality

**Final Implementation:**
- Removed TEAS `/name/` format and redundant fields
- Single signature block for attorney
- Marker: `[SIGNATURE_BLOCK:attorney-signature]`
- Fields: name, email, date (all required)
- Label: "ATTORNEY OF RECORD"

This decision impacts only the Trademark Application template. All other templates already use or will use traditional signature formats.

## Summary

The Trademark Application template now uses a clean, traditional signature block approach consistent with all other document types. The generated PDFs will have proper signature areas for physical signing, and users filing electronically will copy the relevant content into the TEAS system where they'll type the `/name/` format directly.

## Testing Approach

1. **Template Loading Test:**
   - Verify template loads with signature block
   - Ensure no initial blocks cause issues
   - Check backward compatibility

2. **Document Generation Test:**
   - Generate with individual applicant
   - Generate with corporate applicant
   - Verify marker placement in both cases

3. **Validation:**
   - Single signature block only
   - Marker appears once
   - Document structure preserved

## Definition of Done

- [ ] Investigation complete with documented findings
- [ ] Document structure mapped
- [ ] JSON template updated with signature block
- [ ] No initial blocks (confirmed not needed)
- [ ] Placement directive specified
- [ ] Marker appears in generated document
- [ ] Works for both individual and entity applicants
- [ ] Template loading tests pass
- [ ] Document generation successful
- [ ] Full test suite passes

## Common Pitfalls

1. **Forgetting entity signatures** - Title field important for companies
2. **Wrong placement** - Must be after declaration text
3. **Over-complicating** - Keep simple for single signature
4. **Missing declaration** - Some templates may need declaration text

## Notes

- Trademark applications are straightforward single-signature documents
- Declaration text is legally required before signature
- Title field is conditional based on applicant type
- This serves as a model for other single-party filings
- Consider future electronic filing requirements 