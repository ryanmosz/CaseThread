# CaseThread Template Overview

This document provides an overview of the CaseThread template system for legal document generation.

## Template Structure

Each template is a JSON file containing:

```json
{
  "id": "unique-identifier",
  "name": "Human-readable name",
  "description": "Brief description of the document type",
  "version": "1.0.0",
  "category": "legal",
  "subcategory": "intellectual-property",
  "jurisdiction": "United States",
  "requiredFields": [...],
  "sections": [...],
  "metadata": {...},
  "signatureBlocks": [...],    // New in v2.0
  "initialBlocks": [...]       // New in v2.0
}
```

## Template Features

Each template includes:
- Basic template information (name, description, version)
- Category and subcategory for organization
- Required fields with validation rules
- Document sections with conditional logic
- Metadata for tracking and customization
- **Signature blocks for PDF generation (v2.0+)**

## Required Fields

Required fields define the data needed to generate a document:

```json
{
  "id": "field-id",
  "name": "Field Name",
  "type": "text|textarea|date|number|select|boolean",
  "description": "Help text for the field",
  "required": true,
  "validation": {
    "minLength": 1,
    "maxLength": 100,
    "pattern": "regex-pattern"
  }
}
```

## Document Sections

Sections contain the actual document content with variable substitution:

```json
{
  "id": "section-id",
  "title": "Section Title",
  "content": "Section content with {{variable}} substitution",
  "order": 1,
  "conditionalOn": "optional-field-id",
  "subsections": [...]
}
```

## Signature Blocks (New in v2.0)

Templates now support comprehensive signature block definitions for professional PDF generation. The signature block system includes:

- **Multiple signature layouts**: Single signatures, side-by-side arrangements, and complex multi-party setups
- **Flexible field definitions**: Name, title, company, date, registration numbers, and custom fields
- **Initial blocks**: For page-by-page acknowledgment or critical section confirmation
- **Notary blocks**: For documents requiring notarization
- **Smart positioning**: Markers placed in document text to control exact signature placement
- **Page break prevention**: Keep related signatures together on the same page

See the comprehensive [Signature Block Schema Documentation](./signature-block-schema.md) for:
- Complete schema structure and TypeScript interfaces
- Field definitions and layout options
- Examples for all 8 document types
- Best practices and migration guide
- Quick reference patterns

### Example Signature Block

```json
{
  "id": "assignor-signature",
  "type": "single",
  "placement": {
    "location": "after-section-signature",
    "marker": "[SIGNATURE_BLOCK:assignor-signature]"
  },
  "layout": "side-by-side",
  "party": {
    "role": "assignor",
    "label": "ASSIGNOR",
    "fields": {
      "name": { "required": true, "label": "Name" },
      "title": { "required": false, "label": "Title" },
      "date": { "required": true, "label": "Date" }
    }
  }
}
```

## Available Templates

CaseThread currently includes 8 document templates:

1. **Patent Assignment Agreement** - Transfer patent rights between parties
2. **Trademark Application** - Federal trademark registration filing
3. **Cease and Desist Letter** - Demand to stop infringing activity
4. **NDA IP Specific** - Confidentiality agreement for IP disclosures
5. **Office Action Response** - USPTO examination response
6. **Patent License Agreement** - Grant rights to use patented technology
7. **Provisional Patent Application** - Initial patent filing
8. **Technology Transfer Agreement** - Transfer technology and know-how

## Template Validation

All templates are validated for:
- Valid JSON structure
- Required properties present
- Unique field and section IDs
- Valid field types
- Proper variable references in content
- Valid signature block definitions

## Creating New Templates

To create a new template:

1. Copy an existing template as a starting point
2. Update the metadata (id, name, description)
3. Define required fields for data collection
4. Create sections with appropriate content
5. Add signature blocks following the schema
6. Place signature markers in section content
7. Test with the template validator
8. Generate sample documents for review

## Variable Substitution

Templates support variable substitution using double curly braces:

- `{{field_id}}` - Simple field substitution
- `{{field_id | uppercase}}` - With transformation
- `{{#if field_id}}...{{/if}}` - Conditional content
- `{{#each array_field}}...{{/each}}` - Loops (future)

## Conditional Logic

Sections and fields can be shown/hidden based on user input:

```json
{
  "conditionalOn": "field_id",
  "conditionalValue": "specific_value",
  "conditionalOperator": "equals|not_equals|contains"
}
```

## Best Practices

1. Use clear, descriptive field IDs
2. Provide helpful field descriptions
3. Group related fields logically
4. Use consistent naming conventions
5. Test with various input combinations
6. Document any special requirements
7. Include appropriate signature blocks
8. Place markers clearly in content

## Template Versioning

Templates use semantic versioning:
- Major version: Breaking changes
- Minor version: New features (backward compatible)
- Patch version: Bug fixes

When updating templates, consider backward compatibility with existing generated documents. 

## Related Documentation

- **[Signature Block Schema](./signature-block-schema.md)**: Detailed signature block implementation guide
- **[Formatting Requirements](./formatting-requirements-by-document.md)**: Specific formatting standards for each document type
- **[PDF Implementation Guide](./pdf-formatting-implementation-guide.md)**: Simplified implementation guide for PDF generation 