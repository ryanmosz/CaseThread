# Signature Block Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Schema Structure](#schema-structure)
3. [Field Definitions](#field-definitions)
4. [Layout Options](#layout-options)
5. [Examples by Document Type](#examples-by-document-type)
6. [Initial Blocks](#initial-blocks)
7. [Notary Blocks](#notary-blocks)
8. [Best Practices](#best-practices)
9. [Migration Guide](#migration-guide)
10. [Quick Reference](#quick-reference)

## Overview

The signature block schema defines how signature areas are structured in CaseThread legal document templates. This schema enables:

- **Consistent signature placement** across all document types
- **Flexible layouts** supporting single or side-by-side signatures
- **Rich metadata** for PDF generation with proper spacing and formatting
- **Support for initials, witnesses, and notary blocks**

Signature blocks are defined in the template JSON files and rendered as markers in the generated documents, which are then parsed by the PDF generator to create properly formatted signature areas.

## Schema Structure

### TypeScript Interfaces

```typescript
// Standard signature block format (most templates)
interface StandardSignatureBlock {
  id: string;                              // Unique identifier
  type: 'single' | 'multiple';            // Block type
  placement: {
    location: string;                      // e.g., "after-section-5"
    marker: string;                        // e.g., "[SIGNATURE_BLOCK:assignor-signature]"
  };
  layout?: string | {                      // Layout configuration
    position: 'standalone' | 'side-by-side';
    groupWith?: string;                    // ID of block to group with
    preventPageBreak?: boolean;            // Keep together on same page
  };
  party: {
    role: string;                          // e.g., "assignor", "licensee"
    label: string;                         // Display label, e.g., "ASSIGNOR"
    fields: {
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

// Office action response format (simplified)
interface OfficeActionSignatureBlock {
  id: string;
  type: 'single' | 'multiple';
  label: string;
  position: string;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
  }>;
}

// Field definition
interface FieldDefinition {
  required: boolean;
  label: string;
  defaultValue?: string;
  maxLength?: number;
}
```

## Field Definitions

### Core Fields

| Field | Description | Typically Required | Common Usage |
|-------|-------------|-------------------|--------------|
| `name` | Signatory's full name | Always | All signature blocks |
| `title` | Professional title or position | Sometimes | Corporate signers |
| `company` | Organization name | Context-dependent | When signing on behalf of entity |
| `date` | Date of signature | Usually | Most agreements |
| `registrationNumber` | Professional license/bar number | For attorneys | USPTO filings |
| `email` | Email address | Rarely | Electronic signature systems |

### Field Properties

- **`required`**: Boolean indicating if the field must be filled
- **`label`**: Display text shown above/beside the field
- **`defaultValue`**: Optional pre-filled value (e.g., current date)
- **`maxLength`**: Maximum character length for the field

## Layout Options

### 1. Standalone (Default)
Single signature block on its own line:

```
________________________     ____________
Signature                    Date

John Doe
Title: CEO
Company: Acme Corp
```

**JSON Example:**
```json
{
  "id": "ceo-signature",
  "type": "single",
  "placement": {
    "location": "after-section-signatures",
    "marker": "[SIGNATURE_BLOCK:ceo-signature]"
  },
  "party": {
    "role": "ceo",
    "label": "CHIEF EXECUTIVE OFFICER",
    "fields": {
      "name": { "required": true, "label": "Name" },
      "title": { "required": true, "label": "Title" },
      "company": { "required": true, "label": "Company" },
      "date": { "required": true, "label": "Date" }
    }
  }
}
```

### 2. Side-by-Side
Two or more signature blocks on the same line:

```
ASSIGNOR                                    ASSIGNEE
________________________                    ________________________
Signature                                   Signature

Name: ___________________                   Name: ___________________
Date: ___________________                   Date: ___________________
```

**JSON Example:**
```json
{
  "id": "assignor-signature",
  "type": "single",
  "layout": "side-by-side",  // Can be string
  "placement": {
    "location": "after-section-signatures",
    "marker": "[SIGNATURE_BLOCK:assignor-signature]"
  },
  "party": {
    "role": "assignor",
    "label": "ASSIGNOR",
    "fields": {
      "name": { "required": true, "label": "Name" },
      "date": { "required": true, "label": "Date" }
    }
  }
}
```

### 3. Grouped with Page Break Prevention
Ensures related signatures stay together:

```json
{
  "layout": {
    "position": "side-by-side",
    "groupWith": "assignor-signature",
    "preventPageBreak": true
  }
}
```

## Examples by Document Type

### 1. Patent Assignment Agreement
**Layout**: Side-by-side with notary
**Reason**: Standard for property transfers requiring witnessed execution

```json
"signatureBlocks": [
  {
    "id": "assignor-signature",
    "type": "single",
    "placement": {
      "location": "after-section-signature",
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
      "location": "after-section-signature",
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
        "company": { "required": false, "label": "By" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

### 2. Trademark Application
**Layout**: Single attorney signature
**Reason**: Only authorized practitioner signs USPTO filings

```json
"signatureBlocks": [
  {
    "id": "attorney-signature",
    "type": "single",
    "placement": {
      "location": "after-declaration",
      "marker": "[SIGNATURE_BLOCK:attorney-signature]"
    },
    "party": {
      "role": "attorney",
      "label": "ATTORNEY OF RECORD",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "registrationNumber": { "required": true, "label": "Registration Number" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

### 3. Cease and Desist Letter
**Layout**: Single sender signature
**Reason**: Unilateral correspondence from one party

```json
"signatureBlocks": [
  {
    "id": "sender-signature",
    "type": "single",
    "placement": {
      "location": "after-section-signature",
      "marker": "[SIGNATURE_BLOCK:sender-signature]"
    },
    "party": {
      "role": "sender",
      "label": "SENDER",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": false, "label": "Title" },
        "company": { "required": false, "label": "Company" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

### 4. NDA IP Specific
**Layout**: Side-by-side for mutual NDA
**Reason**: Both parties sign mutual confidentiality agreements

```json
"signatureBlocks": [
  {
    "id": "disclosing-party-signature",
    "type": "single",
    "placement": {
      "location": "after-section-signature",
      "marker": "[SIGNATURE_BLOCK:disclosing-party-signature]"
    },
    "layout": "side-by-side",
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
      "location": "after-section-signature",
      "marker": "[SIGNATURE_BLOCK:receiving-party-signature]"
    },
    "layout": "side-by-side",
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
]
```

### 5. Office Action Response
**Layout**: Simplified structure for USPTO forms
**Reason**: Specific formatting requirements for government filings

```json
"signatureBlocks": [
  {
    "id": "attorney-signature",
    "type": "single",
    "label": "Attorney/Agent Signature",
    "position": "signature",
    "fields": [
      {
        "id": "name",
        "type": "text",
        "label": "Attorney/Agent Name",
        "required": true
      },
      {
        "id": "registration_number",
        "type": "text",
        "label": "USPTO Registration No.",
        "required": true
      },
      {
        "id": "phone",
        "type": "text",
        "label": "Phone Number",
        "required": true
      },
      {
        "id": "email",
        "type": "text",
        "label": "Email Address",
        "required": true
      }
    ]
  }
]
```

### 6. Patent License Agreement
**Layout**: Side-by-side
**Reason**: Standard bilateral agreement format

```json
"signatureBlocks": [
  {
    "id": "licensor-signature",
    "type": "single",
    "placement": {
      "location": "after-section-13",
      "marker": "[SIGNATURE_BLOCK:licensor-signature]"
    },
    "layout": "side-by-side",
    "party": {
      "role": "licensor",
      "label": "LICENSOR",
      "entityName": "{{licensor_name}}",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": true, "label": "Title" },
        "date": { "required": true, "label": "Date" }
      }
    }
  },
  {
    "id": "licensee-signature",
    "type": "single",
    "placement": {
      "location": "after-section-13",
      "marker": "[SIGNATURE_BLOCK:licensee-signature]"
    },
    "layout": "side-by-side",
    "party": {
      "role": "licensee",
      "label": "LICENSEE",
      "entityName": "{{licensee_name}}",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": true, "label": "Title" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

### 7. Provisional Patent Application
**Layout**: Single inventor with optional witness
**Reason**: USPTO requires inventor signature, witness adds evidentiary value

```json
"signatureBlocks": [
  {
    "id": "inventor-signature",
    "type": "single",
    "placement": {
      "location": "after-section-signature",
      "marker": "[SIGNATURE_BLOCK:inventor-signature]"
    },
    "party": {
      "role": "inventor",
      "label": "Inventor",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "date": { "required": true, "label": "Date" }
      }
    }
  },
  {
    "id": "witness-signature",
    "type": "single",
    "placement": {
      "location": "after-inventor-signature",
      "marker": "[SIGNATURE_BLOCK:witness-signature]"
    },
    "party": {
      "role": "witness",
      "label": "Witness (Optional)",
      "fields": {
        "name": { "required": false, "label": "Name" },
        "date": { "required": false, "label": "Date" }
      }
    }
  }
]
```

### 8. Technology Transfer Agreement
**Layout**: Complex multi-party with initials
**Reason**: High-value agreements require extra acknowledgments

```json
"signatureBlocks": [
  {
    "id": "provider-signature",
    "type": "single",
    "layout": "side-by-side",
    "placement": {
      "location": "signatures-section",
      "marker": "[SIGNATURE_BLOCK:provider-signature]"
    },
    "party": {
      "role": "provider",
      "label": "PROVIDER",
      "entityName": "{{provider_name}}",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": true, "label": "Title" },
        "date": { "required": true, "label": "Date" }
      }
    }
  },
  {
    "id": "recipient-signature",
    "type": "single",
    "layout": "side-by-side",
    "placement": {
      "location": "signatures-section",
      "marker": "[SIGNATURE_BLOCK:recipient-signature]"
    },
    "party": {
      "role": "recipient",
      "label": "RECIPIENT",
      "entityName": "{{recipient_name}}",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": true, "label": "Title" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

## Initial Blocks

Initial blocks are used for page-by-page acknowledgment or critical section confirmation:

```json
"initialBlocks": [
  {
    "id": "page-initials",
    "placement": {
      "locations": ["each-page-footer"],
      "marker": "[INITIALS_BLOCK:page-initials]"
    },
    "party": {
      "role": "all-parties",
      "label": "Page __ of __  Initials: _____ / _____"
    }
  },
  {
    "id": "critical-section-initials",
    "placement": {
      "locations": ["end-of-section-assignment"],
      "marker": "[INITIALS_BLOCK:critical-section]"
    },
    "party": {
      "role": "all-parties",
      "label": "Initials"
    },
    "customText": "By initialing here, all parties acknowledge understanding of the assignment terms",
    "conditional": true  // Only shown based on template logic
  }
]
```

## Notary Blocks

For documents requiring notarization:

```json
"notaryBlocks": [
  {
    "id": "assignor-notary",
    "forSignatureId": "assignor-signature",
    "placement": {
      "location": "after-assignor-signature",
      "marker": "[NOTARY_BLOCK:assignor-notary]"
    }
  }
]
```

## Best Practices

### 1. Consistent Naming
- Use role-based IDs: `licensor-signature`, `assignee-signature`
- Match marker names to IDs for clarity
- Use standard role names across similar documents

### 2. Field Selection
- Always require `name` and `date`
- Include `title` for corporate signers
- Add `registrationNumber` for attorney signatures
- Use `company` when signing on behalf of an entity

### 3. Layout Decisions
- Use side-by-side for bilateral agreements
- Keep related signatures grouped
- Prevent page breaks between paired signatures
- Consider signature block width for side-by-side layouts

### 4. Marker Placement
- Place markers at the end of signature sections
- Ensure markers are on their own lines
- Don't embed markers within paragraphs
- Keep consistent spacing around markers

### 5. Optional Fields
- Make fields optional when they may not apply
- Witness signatures should typically be optional
- Consider jurisdiction-specific requirements

## Migration Guide

### Adding Signature Blocks to Existing Templates

1. **Analyze current signature placement**
   - Identify where signatures currently appear
   - Note any special formatting requirements

2. **Define the signature blocks**
   ```json
   "signatureBlocks": [
     // Add appropriate blocks
   ]
   ```

3. **Place markers in content**
   - Replace manual signature lines with markers
   - Remove redundant text like "By: _____"

4. **Test the template**
   - Verify template loads without errors
   - Generate a document and check marker placement
   - Ensure backward compatibility

### Common Migration Patterns

**Before:**
```
By: _________________________
Name: [CLIENT NAME]
Title: _____________________
Date: ______________________
```

**After:**
```
[SIGNATURE_BLOCK:client-signature]
```

## Quick Reference

### Single Signature Block
```json
{
  "id": "sender-signature",
  "type": "single",
  "placement": {
    "location": "after-section-X",
    "marker": "[SIGNATURE_BLOCK:sender-signature]"
  },
  "party": {
    "role": "sender",
    "label": "SENDER",
    "fields": {
      "name": { "required": true, "label": "Name" },
      "date": { "required": true, "label": "Date" }
    }
  }
}
```

### Side-by-Side Signatures
```json
// First block
{
  "id": "party-a-signature",
  "type": "single",
  "layout": "side-by-side",
  // ... rest of block
}
// Second block
{
  "id": "party-b-signature",
  "type": "single",
  "layout": "side-by-side",
  // ... rest of block
}
```

### Attorney Signature
```json
{
  "party": {
    "role": "attorney",
    "label": "ATTORNEY OF RECORD",
    "fields": {
      "name": { "required": true, "label": "Name" },
      "registrationNumber": { "required": true, "label": "Bar No." },
      "date": { "required": true, "label": "Date" }
    }
  }
}
```

### Initial Block
```json
{
  "id": "section-initials",
  "placement": {
    "locations": ["end-of-section"],
    "marker": "[INITIALS_BLOCK:section-initials]"
  },
  "party": {
    "role": "all-parties",
    "label": "Initials: ___ / ___"
  }
}
```

## Troubleshooting

### Common Issues

1. **Marker not appearing in generated document**
   - Check marker is properly placed in section content
   - Verify marker syntax matches exactly
   - Ensure section is not conditionally excluded

2. **TypeScript compilation errors**
   - Verify all required fields are present
   - Check field types match interface definitions
   - Use type guards for union types

3. **Layout not working as expected**
   - Confirm layout property syntax (string vs object)
   - Check groupWith references valid block ID
   - Verify both blocks have compatible layouts

### Validation Checklist

- [ ] All signature blocks have unique IDs
- [ ] Markers match block IDs
- [ ] Required fields are marked appropriately
- [ ] Layout options are valid
- [ ] Party roles are consistent
- [ ] Field labels are clear and professional

## Future Enhancements

- Support for digital signature integration
- Multi-page signature blocks
- Conditional signature requirements
- Signature block templates/inheritance
- Custom validation rules per field