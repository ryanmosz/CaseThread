# Task 6.1: Design and Document Signature Block JSON Schema

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Design a comprehensive, flexible JSON schema for signature blocks, initial blocks, and placement directives that can accommodate all 8 document types while supporting various layouts and legal requirements.

## Sub-tasks

### 6.1.1 Research signature and initial requirements for document types

**Implementation Steps:**
1. Review each of the 8 template files in `templates/core/`
2. Identify signature requirements:
   - Number of parties who need to sign
   - Whether signatures appear together or separately
   - Required vs optional fields (name, title, company, date)
   - Any special requirements (e.g., witness, notary)
3. Identify initial requirements:
   - Which documents need initials
   - Where initials typically appear
   - Whether initials are page-by-page or section-specific

**Expected Findings:**
- Patent Assignment: Assignor and Assignee signatures (side-by-side), may need initials on key sections
- NDA: Two parties (Disclosing and Receiving), often initials on each page
- Trademark Application: Single applicant signature, rarely needs initials
- Office Action Response: Attorney/Agent signature only
- License Agreements: Often require initials on key terms pages
- etc.

### 6.1.2 Define core signature block data structure

**Implementation Steps:**
1. Create a flexible schema that supports:
   - Single party signatures
   - Multiple party signatures
   - Side-by-side layout options
   - Sequential layout options
   - Placement directives
   - Marker definitions

**Code Example:**
```typescript
interface SignatureBlock {
  id: string;                    // Unique identifier
  type: 'single' | 'multiple';   // Block type
  placement: {
    location: string;            // e.g., "after-section-5", "document-end"
    marker: string;              // e.g., "[SIGNATURE_BLOCK:assignor-signature]"
  };
  layout?: {
    position: 'standalone' | 'side-by-side';
    groupWith?: string;          // ID of block to group with
    preventPageBreak?: boolean;  // Keep together on same page
  };
  party: {
    role: string;                // e.g., "assignor", "licensee"
    label: string;               // Display label, e.g., "ASSIGNOR"
    fields: {
      name: FieldDefinition;
      title?: FieldDefinition;
      company?: FieldDefinition;
      date?: FieldDefinition;
      [key: string]: FieldDefinition | undefined;
    };
  };
}
```

### 6.1.3 Define initial block data structure

**Implementation Steps:**
1. Create schema for initial blocks:
   - Support multiple placement locations
   - Link to party roles
   - Define marker format

**Code Example:**
```typescript
interface InitialBlock {
  id: string;                    // Unique identifier
  placement: {
    locations: string[];         // e.g., ["each-page-footer", "after-section-3.2"]
    marker: string;              // e.g., "[INITIALS_BLOCK:assignor-initials]"
  };
  party: {
    role: string;                // Links to signature block party role
    label: string;               // e.g., "Initials"
  };
  customText?: string;           // Optional text like "Initial here to acknowledge"
}
```

### 6.1.4 Define placement system

**Implementation Steps:**
1. Create a comprehensive placement vocabulary:
   - Relative placements: "after-section-X", "before-section-Y"
   - Absolute placements: "document-end", "each-page-footer"
   - Special placements: "above-party-info", "after-recitals"

**Placement Examples:**
```json
{
  "placement": {
    "location": "after-section-5",
    "marker": "[SIGNATURE_BLOCK:id]"
  }
}

{
  "placement": {
    "locations": ["each-page-footer", "after-warranties"],
    "marker": "[INITIALS_BLOCK:id]"
  }
}
```

### 6.1.5 Define marker system

**Implementation Steps:**
1. Establish marker format standards:
   - `[SIGNATURE_BLOCK:id]` - Full signature blocks
   - `[INITIALS_BLOCK:id]` - Initial blocks
   - `[WITNESS_BLOCK:id]` - Witness signatures
   - `[NOTARY_BLOCK]` - Notary acknowledgment
2. Document how markers integrate with text generation
3. Ensure markers are unique and parseable

**Marker Usage Example:**
```markdown
5. ASSIGNMENT

The Assignor hereby assigns all rights...

[SIGNATURE_BLOCK:assignor-signature]
[SIGNATURE_BLOCK:assignee-signature]

6. GOVERNING LAW
```

### 6.1.6 Create example schemas for different patterns

**Implementation Steps:**
1. Create examples for common patterns:
   - Single signature (e.g., office action response)
   - Side-by-side signatures (e.g., patent assignment)
   - Multiple sequential signatures (e.g., multi-party agreement)
   - Documents with initials throughout
   - Complex layouts with witnesses

**Example 1 - Single Signature with Placement:**
```json
{
  "signatureBlocks": [
    {
      "id": "attorney-signature",
      "type": "single",
      "placement": {
        "location": "document-end",
        "marker": "[SIGNATURE_BLOCK:attorney-signature]"
      },
      "party": {
        "role": "attorney",
        "label": "ATTORNEY/AGENT OF RECORD",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "registrationNumber": { "required": false, "label": "Reg. No." },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ]
}
```

**Example 2 - Side-by-Side with Initials:**
```json
{
  "signatureBlocks": [
    {
      "id": "assignor-sig",
      "type": "single",
      "placement": {
        "location": "after-section-assignment",
        "marker": "[SIGNATURE_BLOCK:assignor-sig]"
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
      "id": "assignee-sig",
      "type": "single",
      "placement": {
        "location": "after-section-assignment",
        "marker": "[SIGNATURE_BLOCK:assignee-sig]"
      },
      "layout": {
        "position": "side-by-side",
        "groupWith": "assignor-sig",
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
        "label": "Assignor"
      }
    },
    {
      "id": "assignee-initials",
      "placement": {
        "locations": ["each-page-footer"],
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

### 6.1.7 Document schema with detailed explanations

**Implementation Steps:**
1. Create comprehensive documentation covering:
   - Each field in the schema
   - How to use placement directives
   - Marker system usage
   - Examples for each document type
   - Best practices for investigations

**File to Create:** `docs/templates/signature-block-schema.md`

**Content Structure:**
```markdown
# Signature Block Schema Documentation

## Overview
[Explanation of purpose and usage]

## Schema Structure
[Detailed field-by-field documentation]

## Placement System
[How to specify where blocks appear]

## Marker System
[How markers work in text output]

## Initial Blocks
[When and how to use initial blocks]

## Layout Options
[Different layout possibilities]

## Examples by Document Type
[One example per document type]

## Investigation Guidelines
[How to analyze documents for requirements]

## Best Practices
[Guidelines for template creators]
```

## Testing Approach

1. No automated tests for this design task
2. Validate schema structure with JSON linting
3. Review schema with team for completeness
4. Ensure schema examples are valid JSON
5. Verify marker format is consistent and parseable

## Definition of Done

- [ ] All 8 document types analyzed for signature and initial requirements
- [ ] Core schema structure defined for both signatures and initials
- [ ] Placement system fully specified
- [ ] Marker system documented and examples created
- [ ] At least 5 different layout examples created
- [ ] Comprehensive documentation written
- [ ] Schema supports all identified use cases
- [ ] Schema is extensible for future needs

## Common Pitfalls

1. **Over-complicating the schema** - Keep it as simple as possible while meeting all needs
2. **Hard-coding assumptions** - Make sure schema is flexible for future document types
3. **Missing edge cases** - Consider documents with 3+ parties, witnesses, notaries
4. **Forgetting about page breaks** - Include layout hints for PDF generation
5. **Inconsistent markers** - Ensure marker format is standardized
6. **Missing placement scenarios** - Consider all possible locations for blocks

## Notes

- This schema will be the foundation for all PDF signature/initial block rendering
- Placement directives must be clear enough for accurate positioning
- Marker system must integrate smoothly with text generation
- Consider future GUI needs when designing the schema
- Investigation of each document type is critical before implementation 