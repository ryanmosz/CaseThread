# Task 6.4: Update Remaining 6 Document Templates

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Update the remaining 6 document templates with appropriate signature block definitions. Each template has different signature requirements based on the document type and parties involved.

## Templates to Update

1. cease-and-desist-letter.json
2. nda-ip-specific.json
3. office-action-response.json
4. patent-license-agreement.json
5. provisional-patent-application.json
6. technology-transfer-agreement.json

## Sub-tasks

### 6.4.1 Update cease-and-desist-letter.json

**Signature Requirements:**
- Single signature from sender (attorney or rights holder)
- Formal closing with name and title

**Implementation:**
```json
"signatureBlocks": [
  {
    "id": "sender-signature",
    "type": "single",
    "party": {
      "role": "sender",
      "label": "SENDER",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": true, "label": "Title" },
        "company": { "required": false, "label": "Law Firm/Company" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

### 6.4.2 Update nda-ip-specific.json

**Signature Requirements:**
- Two parties: Disclosing Party and Receiving Party
- Side-by-side layout preferred

**Implementation:**
```json
"signatureBlocks": [
  {
    "id": "disclosing-party-signature",
    "type": "single",
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
    "layout": {
      "position": "side-by-side",
      "groupWith": "disclosing-party-signature",
      "preventPageBreak": true
    },
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

### 6.4.3 Update office-action-response.json

**Signature Requirements:**
- Single signature from attorney/agent of record
- Registration number may be required

**Implementation:**
```json
"signatureBlocks": [
  {
    "id": "attorney-signature",
    "type": "single",
    "party": {
      "role": "attorney",
      "label": "ATTORNEY/AGENT OF RECORD",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "registrationNumber": { "required": false, "label": "Registration No." },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

### 6.4.4 Update patent-license-agreement.json

**Signature Requirements:**
- Two parties: Licensor and Licensee
- Side-by-side layout typical

**Implementation:**
```json
"signatureBlocks": [
  {
    "id": "licensor-signature",
    "type": "single",
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
]
```

### 6.4.5 Update provisional-patent-application.json

**Signature Requirements:**
- Single inventor or multiple inventors
- Declaration signature required

**Implementation:**
```json
"signatureBlocks": [
  {
    "id": "inventor-signature",
    "type": "single",
    "party": {
      "role": "inventor",
      "label": "INVENTOR",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

*Note: For multiple inventors, PDF generation will need to handle creating multiple signature blocks dynamically.*

### 6.4.6 Update technology-transfer-agreement.json

**Signature Requirements:**
- Two parties: Transferor and Transferee
- May require witness signatures

**Implementation:**
```json
"signatureBlocks": [
  {
    "id": "transferor-signature",
    "type": "single",
    "party": {
      "role": "transferor",
      "label": "TRANSFEROR",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": false, "label": "Title" },
        "company": { "required": true, "label": "Company/Institution" },
        "date": { "required": true, "label": "Date" }
      }
    }
  },
  {
    "id": "transferee-signature",
    "type": "single",
    "layout": {
      "position": "side-by-side",
      "groupWith": "transferor-signature",
      "preventPageBreak": true
    },
    "party": {
      "role": "transferee",
      "label": "TRANSFEREE",
      "fields": {
        "name": { "required": true, "label": "Name" },
        "title": { "required": false, "label": "Title" },
        "company": { "required": true, "label": "Company" },
        "date": { "required": true, "label": "Date" }
      }
    }
  }
]
```

### 6.4.7 Test all updated templates

**Implementation Steps:**
1. Run template service tests for all templates:
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```

2. Verify each template loads correctly:
   ```bash
   # Quick check using jq
   for template in cease-and-desist-letter nda-ip-specific office-action-response patent-license-agreement provisional-patent-application technology-transfer-agreement; do
     echo "Checking $template..."
     docker exec casethread-dev cat templates/core/$template.json | jq '.signatureBlocks' > /dev/null && echo "✓ Valid JSON"
   done
   ```

3. Test document generation for each:
   ```bash
   # Test each document type
   docker exec casethread-dev npm run cli -- generate cease-and-desist-letter test-input.yaml
   # Repeat for each document type
   ```

## Testing Approach

1. **Batch Validation:**
   - Validate JSON syntax for all 6 files
   - Ensure consistent structure across templates

2. **Template Loading:**
   - Run test suite once after all updates
   - Verify no loading errors

3. **Document Generation:**
   - Test at least 2-3 document types
   - Ensure backward compatibility

## Definition of Done

- [ ] All 6 remaining templates have signature blocks defined
- [ ] Appropriate signature layouts chosen for each document type
- [ ] All required and optional fields properly defined
- [ ] JSON validation passes for all templates
- [ ] Template service tests pass
- [ ] Document generation works for all types

## Common Pitfalls

1. **Inconsistent field naming** - Keep field names consistent across templates
2. **Copy-paste errors** - Carefully review each template after editing
3. **Missing company fields** - Most business documents need company/institution
4. **Wrong layout choices** - Consider standard practice for each document type

## Notes

- These 6 templates cover various signature patterns
- Cease & desist and office actions are single-signature
- NDA, license, and transfer agreements are typically side-by-side
- Provisional patents may need special handling for multiple inventors
- Consider future needs for witness or notary blocks 