# PRD: Parent Task 6.0 - Update JSON Templates with Signature Block Definitions

## Introduction/Overview

This feature adds signature block metadata to all 8 CaseThread document templates. Currently, the JSON templates define document structure and content requirements but lack specific information about signature blocks - who needs to sign, where signatures appear, and how they should be formatted. This is the critical foundation needed for PDF generation with proper legal document formatting.

## Goals

1. Enable all document types to define their signature requirements in a structured format
2. Support various signature layouts (single, side-by-side, multiple parties)
3. Maintain backward compatibility with existing template loading and generation
4. Provide clear schema for future template additions
5. Ensure all existing tests continue to pass without modification

## User Stories

1. **As a developer**, I want signature block definitions in JSON templates so that I can programmatically generate PDFs with properly positioned signature areas.

2. **As a legal professional**, I want documents to have correctly formatted signature blocks so that they meet legal standards and are ready for execution.

3. **As a template maintainer**, I want a clear schema for signature blocks so that I can easily add or modify signature requirements for different document types.

## Functional Requirements

1. **Add signature block schema to JSON structure**
   - Define a `signatureBlocks` array in each template
   - Each block must specify party role, layout preference, and required fields
   - Support optional fields like title, company, date

2. **Support multiple signature layouts**
   - Single signature block (one party signing)
   - Side-by-side blocks (two parties on same line)
   - Sequential blocks (multiple parties, each on own line)
   - Page-break prevention logic indicators

3. **Define party information structure**
   - Party identifier/role (e.g., "assignor", "assignee", "applicant")
   - Name field (required)
   - Title field (optional)
   - Company/organization field (optional)
   - Date field (required/optional based on document type)

4. **Update all 8 document type templates**
   - cease-and-desist-letter
   - nda-ip-specific
   - office-action-response
   - patent-assignment-agreement
   - patent-license-agreement
   - provisional-patent-application
   - technology-transfer-agreement
   - trademark-application

5. **Maintain template loading compatibility**
   - Existing template service must continue to work
   - JSON validation must accept new schema
   - Document generation must ignore signature blocks (for now)

6. **Update TypeScript interfaces**
   - Add signature block types to template interfaces
   - Ensure type safety for signature block data
   - Export types for use by PDF generation service

## Non-Goals (Out of Scope)

1. PDF generation implementation (separate parent task)
2. Signature block rendering or positioning logic
3. Digital signature functionality
4. Signature validation or verification
5. UI for signature block configuration
6. Changes to existing document generation logic

## Design Considerations

### Schema Structure Example:
```json
{
  "signatureBlocks": [
    {
      "id": "assignor-signature",
      "type": "single",
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
      "party": {
        "role": "assignee",
        "label": "ASSIGNEE",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": false, "label": "Title" },
          "company": { "required": true, "label": "Company" },
          "date": { "required": true, "label": "Date" }
        }
      },
      "layout": {
        "position": "side-by-side",
        "groupWith": "assignor-signature"
      }
    }
  ]
}
```

## Technical Considerations

1. **JSON Schema Validation**
   - Consider adding JSON schema validation for signature blocks
   - Ensure schema is flexible enough for various document types
   - Validate during template loading

2. **TypeScript Type Safety**
   - Create comprehensive types for signature blocks
   - Use discriminated unions for different signature types
   - Ensure types are exported from types/index.ts

3. **Testing Requirements**
   - All existing tests must pass without modification
   - No changes to current document generation behavior
   - Template loading must handle templates with/without signature blocks

## Success Metrics

1. All 8 document templates updated with appropriate signature block definitions
2. Zero failing tests after implementation
3. TypeScript compilation successful with new types
4. Template service loads enhanced templates without errors
5. Clear documentation for signature block schema
6. Ready for PDF generation implementation in next phase

## Open Questions

1. Should we support custom signature line text (e.g., "Authorized Representative")?
2. Do we need to specify signature line length or let PDF generator determine?
3. Should witness signatures be supported in the initial implementation?
4. How should we handle notary blocks for documents that require notarization? 