# Task 6.2: Update Patent-Assignment-Agreement Template

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Update the patent-assignment-agreement.json template to include signature block definitions. This document typically requires signatures from both the assignor (person/entity transferring rights) and assignee (person/entity receiving rights), usually displayed side-by-side.

## Sub-tasks

### 6.2.1 Analyze current patent assignment template structure

**Implementation Steps:**
1. Open `templates/core/patent-assignment-agreement.json`
2. Review current structure and fields
3. Identify where signature blocks should be added
4. Note any existing signature-related placeholders

**File:** `templates/core/patent-assignment-agreement.json`

### 6.2.2 Design signature blocks for patent assignment

**Implementation Steps:**
1. Determine parties needing signatures:
   - Assignor (transferring party)
   - Assignee (receiving party)
2. Define required fields for each party
3. Specify side-by-side layout preference

**Expected Structure:**
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
  ]
}
```

### 6.2.3 Add signature blocks to template JSON

**Implementation Steps:**
1. Open the template file in your editor
2. Add the `signatureBlocks` array at the root level
3. Ensure proper JSON formatting
4. Validate JSON syntax

**Code Changes:**
```json
{
  "id": "patent-assignment-agreement",
  "name": "Patent Assignment Agreement",
  "description": "...",
  "sections": [...],
  "signatureBlocks": [
    // Add signature block definitions here
  ]
}
```

### 6.2.4 Test template loading with new structure

**Implementation Steps:**
1. Run the template service tests:
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```
2. Verify no errors when loading the updated template
3. Check that existing functionality still works

**Manual Test:**
```typescript
// Quick test script to verify template loads
import { TemplateService } from './src/services/template';

const templateService = new TemplateService();
const template = await templateService.loadTemplate('patent-assignment-agreement');
console.log('Signature blocks:', template.signatureBlocks);
```

### 6.2.5 Verify backward compatibility

**Implementation Steps:**
1. Ensure document generation still works:
   ```bash
   docker exec casethread-dev npm run cli -- generate patent-assignment-agreement test-input.yaml
   ```
2. Confirm output is unchanged (signature blocks ignored for now)
3. Check no runtime errors occur

## Testing Approach

1. **Automated Testing:**
   - Run existing template service tests
   - All must pass without modification

2. **Manual Testing:**
   - Load template programmatically
   - Verify signature blocks are present
   - Generate a document to ensure backward compatibility

3. **JSON Validation:**
   - Use JSON linter to validate syntax
   - Ensure no duplicate keys or formatting issues

## Definition of Done

- [ ] Patent assignment template has signature blocks defined
- [ ] Both assignor and assignee signature blocks included
- [ ] Side-by-side layout specified
- [ ] All required and optional fields defined
- [ ] Template service tests pass
- [ ] Document generation still works
- [ ] JSON is valid and properly formatted

## Common Pitfalls

1. **Breaking existing structure** - Only add new fields, don't modify existing ones
2. **Invalid JSON** - Always validate after editing
3. **Missing required fields** - Ensure name and date are always required
4. **Incorrect layout specification** - Test the groupWith reference is correct

## Code Example

Complete signature blocks section to add:

```json
"signatureBlocks": [
  {
    "id": "assignor-signature",
    "type": "single",
    "party": {
      "role": "assignor",
      "label": "ASSIGNOR",
      "fields": {
        "name": { 
          "required": true, 
          "label": "Name" 
        },
        "title": { 
          "required": false, 
          "label": "Title" 
        },
        "date": { 
          "required": true, 
          "label": "Date" 
        }
      }
    }
  },
  {
    "id": "assignee-signature",
    "type": "single",
    "layout": {
      "position": "side-by-side",
      "groupWith": "assignor-signature",
      "preventPageBreak": true
    },
    "party": {
      "role": "assignee",
      "label": "ASSIGNEE",
      "fields": {
        "name": { 
          "required": true, 
          "label": "Name" 
        },
        "title": { 
          "required": false, 
          "label": "Title" 
        },
        "company": { 
          "required": true, 
          "label": "Company" 
        },
        "date": { 
          "required": true, 
          "label": "Date" 
        }
      }
    }
  }
]
```

## Notes

- This is one of the more complex signature layouts (side-by-side)
- Patent assignments often need corporate titles/positions
- Consider whether witness signatures might be needed in future
- This template will serve as a model for other two-party agreements 