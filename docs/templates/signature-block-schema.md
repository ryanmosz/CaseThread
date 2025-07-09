# Signature Block Schema Documentation

## Overview

This document defines the JSON schema for signature blocks, initial blocks, and placement directives used in CaseThread legal document templates. The schema enables proper PDF generation with correctly positioned signature areas, initial blocks, and related legal elements (witnesses, notaries).

## Schema Structure

### SignatureBlock

The core structure for defining signature areas in documents.

```typescript
interface SignatureBlock {
  id: string;                              // Unique identifier
  type: 'single' | 'multiple';            // Block type
  placement: {
    location: string;                      // Where in document
    marker: string;                        // Text marker for placement
  };
  layout?: {                              // Optional layout hints
    position: 'standalone' | 'side-by-side';
    groupWith?: string;                    // ID of block to group with
    preventPageBreak?: boolean;            // Keep together on same page
  };
  party: {
    role: string;                          // Party identifier
    label: string;                         // Display label
    fields: {                              // Signature fields
      name: FieldDefinition;
      title?: FieldDefinition;
      company?: FieldDefinition;
      date?: FieldDefinition;
      registrationNumber?: FieldDefinition;
      email?: FieldDefinition;
      [key: string]: FieldDefinition | undefined;
    };
  };
  witnessRequired?: boolean;
  notaryRequired?: boolean;
}
```

### InitialBlock

Structure for defining initial areas throughout documents.

```typescript
interface InitialBlock {
  id: string;
  placement: {
    locations: string[];                   // Multiple possible locations
    marker: string;                        // Text marker
  };
  party: {
    role: string;                          // Links to signature party role
    label: string;                         // Display label
  };
  customText?: string;                     // Optional instructional text
}
```

### FieldDefinition

Defines individual fields within signature blocks.

```typescript
interface FieldDefinition {
  required: boolean;
  label: string;
  defaultValue?: string;
  maxLength?: number;
}
```

## Placement System

The placement system uses semantic location identifiers to specify where signature and initial blocks appear in the document.

### Relative Placements

- `after-section-{id}` - After a specific section (e.g., "after-section-assignment")
- `before-section-{id}` - Before a specific section
- `end-of-section-{id}` - At the end of a section's content

### Absolute Placements

- `document-end` - At the end of the entire document
- `document-start` - At the beginning (rare)
- `each-page-footer` - Bottom of every page (for initials)
- `each-page-header` - Top of every page (rare)

### Special Placements

- `after-recitals` - After WHEREAS clauses
- `before-general-provisions` - Before boilerplate sections
- `after-party-definitions` - After party introductions

## Marker System

Markers are text placeholders inserted into generated documents to indicate where signature/initial blocks will be rendered in the PDF.

### Marker Formats

1. **Signature Blocks**: `[SIGNATURE_BLOCK:{id}]`
   - Example: `[SIGNATURE_BLOCK:assignor-signature]`

2. **Initial Blocks**: `[INITIALS_BLOCK:{id}]`
   - Example: `[INITIALS_BLOCK:assignor-initials]`

3. **Witness Blocks**: `[WITNESS_BLOCK:{id}]`
   - Example: `[WITNESS_BLOCK:assignor-witness]`

4. **Notary Blocks**: `[NOTARY_BLOCK:{id}]`
   - Example: `[NOTARY_BLOCK:assignor-notary]`

### Marker Usage in Text

```markdown
5. ASSIGNMENT

The Assignor hereby assigns all rights, title, and interest...

[SIGNATURE_BLOCK:assignor-signature]
[SIGNATURE_BLOCK:assignee-signature]

6. GOVERNING LAW
```

## Initial Blocks

Initial blocks serve different purposes in legal documents:

1. **Page-by-page acknowledgment** - Confirms each page was reviewed
2. **Section-specific agreement** - Acknowledges key terms
3. **Change acknowledgment** - Confirms acceptance of modifications

### Common Patterns

```json
{
  "initialBlocks": [
    {
      "id": "page-initials",
      "placement": {
        "locations": ["each-page-footer"],
        "marker": "[INITIALS_BLOCK:page-initials]"
      },
      "party": {
        "role": "all-parties",
        "label": "Initials"
      }
    }
  ]
}
```

## Layout Options

### Side-by-Side Signatures

For two parties signing together (common in assignments):

```json
{
  "signatureBlocks": [
    {
      "id": "party1-sig",
      "type": "single",
      "placement": {
        "location": "after-section-assignment",
        "marker": "[SIGNATURE_BLOCK:party1-sig]"
      },
      "party": {
        "role": "assignor",
        "label": "ASSIGNOR",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "date": { "required": true, "label": "Date" }
        }
      }
    },
    {
      "id": "party2-sig",
      "type": "single",
      "placement": {
        "location": "after-section-assignment",
        "marker": "[SIGNATURE_BLOCK:party2-sig]"
      },
      "layout": {
        "position": "side-by-side",
        "groupWith": "party1-sig",
        "preventPageBreak": true
      },
      "party": {
        "role": "assignee",
        "label": "ASSIGNEE",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": true, "label": "Title" },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ]
}
```

### Sequential Signatures

For multiple parties signing in order:

```json
{
  "signatureBlocks": [
    {
      "id": "licensor-sig",
      "type": "single",
      "placement": {
        "location": "document-end",
        "marker": "[SIGNATURE_BLOCK:licensor-sig]"
      },
      "party": {
        "role": "licensor",
        "label": "LICENSOR",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": true, "label": "Title" },
          "company": { "required": true, "label": "By" },
          "date": { "required": true, "label": "Date" }
        }
      }
    },
    {
      "id": "licensee-sig",
      "type": "single",
      "placement": {
        "location": "document-end",
        "marker": "[SIGNATURE_BLOCK:licensee-sig]"
      },
      "party": {
        "role": "licensee",
        "label": "LICENSEE",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": true, "label": "Title" },
          "company": { "required": true, "label": "By" },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ]
}
```

## Examples by Document Type

### 1. Patent Assignment Agreement

Side-by-side signatures with optional notary:

```json
{
  "signatureBlocks": [
    {
      "id": "assignor-signature",
      "type": "single",
      "placement": {
        "location": "after-section-general",
        "marker": "[SIGNATURE_BLOCK:assignor-signature]"
      },
      "party": {
        "role": "assignor",
        "label": "ASSIGNOR",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "date": { "required": true, "label": "Date" }
        }
      },
      "notaryRequired": true
    },
    {
      "id": "assignee-signature",
      "type": "single",
      "placement": {
        "location": "after-section-general",
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
          "title": { "required": true, "label": "Title" },
          "company": { "required": true, "label": "By" },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ],
  "initialBlocks": [
    {
      "id": "assignment-initials",
      "placement": {
        "locations": ["after-section-assignment"],
        "marker": "[INITIALS_BLOCK:assignment-initials]"
      },
      "party": {
        "role": "all-parties",
        "label": "Initial to acknowledge assignment terms"
      }
    }
  ],
  "notaryBlocks": [
    {
      "id": "assignor-notary",
      "forSignatureId": "assignor-signature",
      "placement": {
        "location": "after-signature",
        "marker": "[NOTARY_BLOCK:assignor-notary]"
      }
    }
  ]
}
```

### 2. NDA (Mutual)

Sequential signatures with page initials:

```json
{
  "signatureBlocks": [
    {
      "id": "first-party-signature",
      "type": "single",
      "placement": {
        "location": "document-end",
        "marker": "[SIGNATURE_BLOCK:first-party-signature]"
      },
      "party": {
        "role": "first-party",
        "label": "FIRST PARTY",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": false, "label": "Title" },
          "date": { "required": true, "label": "Date" }
        }
      }
    },
    {
      "id": "second-party-signature",
      "type": "single",
      "placement": {
        "location": "document-end",
        "marker": "[SIGNATURE_BLOCK:second-party-signature]"
      },
      "party": {
        "role": "second-party",
        "label": "SECOND PARTY",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": false, "label": "Title" },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ],
  "initialBlocks": [
    {
      "id": "page-initials",
      "placement": {
        "locations": ["each-page-footer"],
        "marker": "[INITIALS_BLOCK:page-initials]"
      },
      "party": {
        "role": "all-parties",
        "label": "___ / ___"
      }
    }
  ]
}
```

### 3. Office Action Response

Single attorney signature:

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
        "label": "Respectfully submitted",
        "fields": {
          "name": { "required": true, "label": "Attorney Name" },
          "registrationNumber": { "required": true, "label": "Registration No." },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ]
}
```

### 4. Patent License Agreement

Sequential signatures with witness option:

```json
{
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
          "title": { "required": true, "label": "Title" },
          "date": { "required": true, "label": "Date" }
        }
      },
      "witnessRequired": true
    },
    {
      "id": "licensee-signature",
      "type": "single",
      "placement": {
        "location": "document-end",
        "marker": "[SIGNATURE_BLOCK:licensee-signature]"
      },
      "party": {
        "role": "licensee",
        "label": "LICENSEE",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": true, "label": "Title" },
          "date": { "required": true, "label": "Date" }
        }
      },
      "witnessRequired": true
    }
  ],
  "initialBlocks": [
    {
      "id": "royalty-initials",
      "placement": {
        "locations": ["after-section-royalties"],
        "marker": "[INITIALS_BLOCK:royalty-initials]"
      },
      "party": {
        "role": "licensee",
        "label": "Licensee acknowledges royalty terms"
      }
    }
  ]
}
```

### 5. Cease and Desist Letter

Single signature in letter format:

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
        "label": "Sincerely",
        "fields": {
          "name": { "required": true, "label": "[ATTORNEY NAME]" },
          "firmName": { "required": true, "label": "[FIRM NAME]" },
          "phone": { "required": true, "label": "[PHONE]" },
          "email": { "required": true, "label": "[EMAIL]" }
        }
      }
    }
  ]
}
```

## Investigation Guidelines

When adding signature blocks to a new document type:

1. **Analyze the current template**:
   - Look for existing signature sections
   - Identify all parties mentioned
   - Note any special requirements (notary, witness)

2. **Research legal requirements**:
   - Does this document type require notarization?
   - Are witness signatures needed?
   - Are initials required on specific sections?

3. **Consider jurisdiction**:
   - Federal documents may have specific formats
   - State requirements vary for notarization
   - International agreements may need apostilles

4. **Review similar documents**:
   - Look at examples from legal databases
   - Check USPTO, court filing requirements
   - Consult bar association guidelines

## Best Practices

1. **Keep schemas simple**: Start with minimal required fields, add complexity only when needed

2. **Use consistent party roles**: Maintain standard roles across document types (e.g., "assignor/assignee", "licensor/licensee")

3. **Plan for PDF rendering**: Include layout hints to help PDF generator position elements correctly

4. **Consider page breaks**: Use `preventPageBreak` for signature blocks that must stay together

5. **Document placement clearly**: Use semantic location names that are self-explanatory

6. **Support flexibility**: Allow optional fields for different use cases

7. **Think about accessibility**: Labels should be clear for screen readers

8. **Version your schemas**: As requirements evolve, maintain backward compatibility

## Implementation Notes

- Signature blocks are added to templates as optional properties
- The text generation process inserts markers at specified locations
- PDF generation reads markers and renders signature areas
- Backward compatibility is maintained - templates without signature blocks continue to work
- The schema is extensible for future requirements (e.g., digital signatures)