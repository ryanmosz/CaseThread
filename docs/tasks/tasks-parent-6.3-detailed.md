# Task 6.3: Update Trademark-Application Template

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Update the trademark-application.json template to include signature block definitions. Trademark applications typically require a single signature from the applicant or their authorized representative, making this a simpler signature structure than multi-party agreements.

## Sub-tasks

### 6.3.1 Analyze current trademark application template

**Implementation Steps:**
1. Open `templates/core/trademark-application.json`
2. Review the current structure
3. Identify applicant information fields
4. Determine signature placement requirements

**File:** `templates/core/trademark-application.json`

### 6.3.2 Design signature block for trademark application

**Implementation Steps:**
1. Determine signature requirements:
   - Single applicant or authorized signatory
   - Required declaration text (if any)
   - Date of signature required
2. Consider if company/title fields needed
3. No side-by-side layout needed (single signature)

**Expected Structure:**
```json
{
  "signatureBlocks": [
    {
      "id": "applicant-signature",
      "type": "single",
      "party": {
        "role": "applicant",
        "label": "APPLICANT/AUTHORIZED SIGNATORY",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": false, "label": "Title (if signing for entity)" },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ]
}
```

### 6.3.3 Add signature block to template JSON

**Implementation Steps:**
1. Open the template file
2. Add the `signatureBlocks` array at root level
3. Include the single applicant signature block
4. Ensure proper JSON formatting

**Code Changes:**
```json
{
  "id": "trademark-application",
  "name": "Trademark Application",
  "description": "...",
  "sections": [...],
  "signatureBlocks": [
    {
      "id": "applicant-signature",
      "type": "single",
      "party": {
        "role": "applicant",
        "label": "APPLICANT/AUTHORIZED SIGNATORY",
        "fields": {
          "name": { "required": true, "label": "Name" },
          "title": { "required": false, "label": "Title (if signing for entity)" },
          "date": { "required": true, "label": "Date" }
        }
      }
    }
  ]
}
```

### 6.3.4 Test template loading

**Implementation Steps:**
1. Run template service tests:
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```
2. Verify the template loads without errors
3. Check that signature block is accessible

**Quick Verification:**
```bash
# Use jq to verify JSON structure
docker exec casethread-dev cat templates/core/trademark-application.json | jq '.signatureBlocks'
```

### 6.3.5 Verify document generation compatibility

**Implementation Steps:**
1. Generate a test document:
   ```bash
   docker exec casethread-dev npm run cli -- generate trademark-application docs/testing/scenario-inputs/rtp-02-trademark-application.yaml
   ```
2. Confirm generation completes successfully
3. Verify output is unchanged (signature blocks not rendered yet)

## Testing Approach

1. **JSON Validation:**
   - Validate JSON syntax
   - Ensure no duplicate keys
   - Check proper nesting

2. **Template Loading:**
   - Run existing test suite
   - Verify no new errors

3. **Document Generation:**
   - Generate sample trademark application
   - Ensure backward compatibility

## Definition of Done

- [ ] Trademark application template has signature block defined
- [ ] Single applicant signature block included
- [ ] Appropriate fields for individual or entity signing
- [ ] Template service tests pass
- [ ] Document generation continues to work
- [ ] JSON is valid and well-formatted

## Common Pitfalls

1. **Overcomplicating single signatures** - Keep it simple for single-party documents
2. **Missing entity considerations** - Title field important for corporate applicants
3. **Forgetting declaration requirements** - Some jurisdictions need specific declaration text

## Code Example

Complete implementation:

```json
{
  "id": "trademark-application",
  "name": "Trademark Application",
  "description": "Template for filing a trademark application with the USPTO",
  "sections": [
    // ... existing sections ...
  ],
  "signatureBlocks": [
    {
      "id": "applicant-signature",
      "type": "single",
      "party": {
        "role": "applicant",
        "label": "APPLICANT/AUTHORIZED SIGNATORY",
        "fields": {
          "name": { 
            "required": true, 
            "label": "Name" 
          },
          "title": { 
            "required": false, 
            "label": "Title (if signing for entity)" 
          },
          "date": { 
            "required": true, 
            "label": "Date" 
          }
        }
      }
    }
  ]
}
```

## Notes

- Trademark applications are good examples of single-signature documents
- The title field is optional but important for corporate applicants
- This template can serve as a model for other single-party filings
- Consider if electronic signature declaration text is needed in future 