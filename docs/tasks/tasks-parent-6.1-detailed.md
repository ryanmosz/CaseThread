# Task 6.1: Design and Document Signature Block JSON Schema

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Design a comprehensive, flexible JSON schema for signature blocks that can accommodate all 8 document types while supporting various signature layouts and requirements.

## Sub-tasks

### 6.1.1 Research signature requirements for each document type

**Implementation Steps:**
1. Review each of the 8 template files in `templates/core/`
2. Identify signature requirements:
   - Number of parties who need to sign
   - Whether signatures appear together or separately
   - Required vs optional fields (name, title, company, date)
   - Any special requirements (e.g., witness, notary)

**Expected Findings:**
- Patent Assignment: Assignor and Assignee (side-by-side preferred)
- NDA: Two parties (Disclosing and Receiving)
- Trademark Application: Single applicant signature
- Office Action Response: Attorney/Agent signature
- etc.

### 6.1.2 Define core signature block data structure

**Implementation Steps:**
1. Create a flexible schema that supports:
   - Single party signatures
   - Multiple party signatures
   - Side-by-side layout options
   - Sequential layout options

**Code Example:**
```typescript
interface SignatureBlock {
  id: string;                    // Unique identifier
  type: 'single' | 'multiple';   // Block type
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

interface FieldDefinition {
  required: boolean;
  label: string;
  defaultValue?: string;
}
```

### 6.1.3 Create example schemas for different layouts

**Implementation Steps:**
1. Create examples for common patterns:
   - Single signature (e.g., office action response)
   - Side-by-side signatures (e.g., patent assignment)
   - Multiple sequential signatures (e.g., multi-party agreement)

**Example 1 - Single Signature:**
```json
{
  "signatureBlocks": [
    {
      "id": "attorney-signature",
      "type": "single",
      "party": {
        "role": "attorney",
        "label": "ATTORNEY/AGENT OF RECORD",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ]
}
```

**Example 2 - Side-by-Side:**
```json
{
  "signatureBlocks": [
    {
      "id": "assignor-sig",
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
      "id": "assignee-sig",
      "type": "single",
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
  ]
}
```

### 6.1.4 Document schema with detailed explanations

**Implementation Steps:**
1. Create a comprehensive markdown document explaining:
   - Each field in the schema
   - How to use the schema
   - Examples for each document type
   - Best practices

**File to Create:** `docs/templates/signature-block-schema.md`

**Content Structure:**
```markdown
# Signature Block Schema Documentation

## Overview
[Explanation of purpose and usage]

## Schema Structure
[Detailed field-by-field documentation]

## Layout Options
[Explanation of different layout possibilities]

## Examples by Document Type
[One example per document type]

## Best Practices
[Guidelines for template creators]
```

## Testing Approach

1. No automated tests for this design task
2. Validate schema structure with JSON linting
3. Review schema with team for completeness
4. Ensure schema examples are valid JSON

## Definition of Done

- [ ] All 8 document types analyzed for signature requirements
- [ ] Core schema structure defined in TypeScript format
- [ ] At least 3 different layout examples created
- [ ] Comprehensive documentation written
- [ ] Schema supports all identified use cases
- [ ] Schema is extensible for future needs

## Common Pitfalls

1. **Over-complicating the schema** - Keep it as simple as possible while meeting all needs
2. **Hard-coding assumptions** - Make sure schema is flexible for future document types
3. **Missing edge cases** - Consider documents with 3+ parties, witnesses, notaries
4. **Forgetting about page breaks** - Include layout hints for PDF generation

## Notes

- This schema will be the foundation for all PDF signature block rendering
- Coordinate with PDF generation task to ensure schema meets rendering needs
- Consider future GUI needs when designing the schema 