# PRD: Parent Task 6.0 - Update JSON Templates with Signature Block Definitions

## Introduction/Overview

This feature adds signature block, initial block, and placement metadata to all 8 CaseThread document templates. Currently, the JSON templates define document structure and content requirements but lack specific information about signature blocks, initial blocks, and their placement within documents. This is the critical foundation needed for PDF generation with proper legal document formatting.

## Goals

1. Enable all document types to define their signature requirements in a structured format
2. Support various signature layouts (single, side-by-side, multiple parties)
3. Support initial blocks throughout documents where legally required
4. Define placement system for both signatures and initials
5. Implement marker system for text output that indicates block positions
6. Maintain backward compatibility with existing template loading and generation
7. Provide clear schema for future template additions
8. Ensure all existing tests continue to pass without modification

## User Stories

1. **As a developer**, I want signature block definitions in JSON templates so that I can programmatically generate PDFs with properly positioned signature areas.

2. **As a legal professional**, I want documents to have correctly formatted signature blocks and initial blocks so that they meet legal standards and are ready for execution.

3. **As a template maintainer**, I want a clear schema for signature blocks, initial blocks, and placement so that I can easily add or modify signature requirements for different document types.

4. **As a CLI user**, I want generated text documents to include clear markers showing where signature and initial blocks will appear in the PDF version.

## Functional Requirements

1. **Add signature block schema to JSON structure**
   - Define a `signatureBlocks` array in each template
   - Each block must specify party role, layout preference, and required fields
   - Support optional fields like title, company, date

2. **Add initial block schema to JSON structure**
   - Define an `initialBlocks` array where needed
   - Specify locations (e.g., "each-page-footer", "after-section-3")
   - Link to appropriate party roles

3. **Support multiple signature layouts**
   - Single signature block (one party signing)
   - Side-by-side blocks (two parties on same line)
   - Sequential blocks (multiple parties, each on own line)
   - Page-break prevention logic indicators

4. **Define placement system**
   - Specify WHERE in document each block appears
   - Support relative placement (e.g., "after-section-5")
   - Support absolute placement (e.g., "each-page-bottom")
   - Allow multiple placement points per document

5. **Implement marker system for text output**
   - `[SIGNATURE_BLOCK:id]` - Full signature block markers
   - `[INITIALS_BLOCK:id]` - Initial block markers
   - `[WITNESS_BLOCK:id]` - Witness signature markers (if needed)
   - `[NOTARY_BLOCK]` - Notary section markers (if needed)
   - Markers should appear in generated text documents

6. **Define party information structure**
   - Party identifier/role (e.g., "assignor", "assignee", "applicant")
   - Name field (required)
   - Title field (optional)
   - Company/organization field (optional)
   - Date field (required/optional based on document type)

7. **Update all 8 document type templates**
   - Investigate each document type for signature/initial requirements
   - cease-and-desist-letter
   - nda-ip-specific
   - office-action-response
   - patent-assignment-agreement
   - patent-license-agreement
   - provisional-patent-application
   - technology-transfer-agreement
   - trademark-application

8. **Maintain template loading compatibility**
   - Existing template service must continue to work
   - JSON validation must accept new schema
   - Document generation must handle markers appropriately

9. **Update TypeScript interfaces**
   - Add signature block types to template interfaces
   - Add initial block types
   - Add placement directive types
   - Ensure type safety for all block data
   - Export types for use by PDF generation service

## Non-Goals (Out of Scope)

1. PDF generation implementation (separate parent task)
2. Signature block rendering or positioning logic
3. Digital signature functionality
4. Signature validation or verification
5. UI for signature block configuration
6. Changes to existing document generation logic (beyond adding markers)
7. Actual drawing of signature lines in PDF

## Design Considerations

### Schema Structure Example:
```json
{
  "signatureBlocks": [
    {
      "id": "assignor-signature",
      "type": "single",
      "placement": {
        "location": "after-section-5",
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
        "location": "after-section-5",
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
        "locations": ["each-page-footer"],
        "marker": "[INITIALS_BLOCK:assignor-initials]"
      },
      "party": {
        "role": "assignor",
        "label": "Assignor Initials"
      }
    }
  ]
}
```

### Marker Usage in Generated Text:
```
... end of warranty section ...

[SIGNATURE_BLOCK:assignor-signature]
[SIGNATURE_BLOCK:assignee-signature]

This agreement shall be binding...
```

## Technical Considerations

1. **JSON Schema Validation**
   - Consider adding JSON schema validation for signature blocks
   - Ensure schema is flexible enough for various document types
   - Validate during template loading
   - Support both signature and initial blocks

2. **TypeScript Type Safety**
   - Create comprehensive types for signature blocks
   - Create types for initial blocks
   - Create types for placement directives
   - Use discriminated unions for different signature types
   - Ensure types are exported from types/index.ts

3. **Testing Requirements**
   - All existing tests must pass without modification
   - No changes to current document generation behavior (except markers)
   - Template loading must handle templates with/without blocks
   - Verify markers appear in correct positions

4. **Investigation Phase**
   - Each document type needs investigation before implementation
   - Analyze current generated documents for signature patterns
   - Research legal requirements for each document type
   - Document findings before implementing

## Success Metrics

1. All 8 document templates updated with appropriate signature and initial block definitions
2. Zero failing tests after implementation
3. TypeScript compilation successful with new types
4. Template service loads enhanced templates without errors
5. Generated text documents include proper markers
6. Clear documentation for signature block schema
7. Each document type individually tested and verified
8. Ready for PDF generation implementation in next phase

## Open Questions

1. Should we support custom signature line text (e.g., "Authorized Representative")?
2. Do we need to specify signature line length or let PDF generator determine?
3. Should witness signatures be supported in the initial implementation?
4. How should we handle notary blocks for documents that require notarization?
5. Should initial blocks support custom text (e.g., "Initial here to acknowledge")?
6. Do we need different marker types for different signature line styles? 