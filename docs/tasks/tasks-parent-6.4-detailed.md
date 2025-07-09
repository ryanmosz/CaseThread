# Task 6.4: Cease and Desist Letter Signature/Initial Blocks

**Part of Parent Task 6.0: Update JSON Templates with Signature Block Definitions**

## Overview

Investigate and implement signature blocks, initial blocks, and placement markers for the Cease and Desist Letter template. These letters are typically sent by attorneys or rights holders and require formal signature with professional credentials.

## Sub-tasks

### 6.4.1 Investigate signature/initial requirements and positions

**Implementation Steps:**

1. **Generate sample document for analysis:**
   ```bash
   docker exec casethread-dev npm run cli -- generate cease-and-desist-letter docs/testing/scenario-inputs/cil-05-cease-desist-false-claims.yaml
   ```

2. **Analyze generated document structure:**
   - Review letter format and sections
   - Identify closing/signature area
   - Note professional tone requirements
   - Look for formal letter conventions

3. **Research legal requirements:**
   - Formal business letter format
   - Attorney signature with firm information
   - May need attorney registration number
   - No initials typically required
   - Some jurisdictions require specific disclaimers

4. **Document findings:**
   - Map letter structure
   - Identify signature placement
   - Note professional requirements
   - Consider letterhead implications

**Expected Findings:**
- Main signature: After closing salutation
- Layout: Single signature block
- Initials: Not required
- Fields needed: Name, Title, Law Firm/Company
- Special: Professional closing format

**Investigation Output:**
```markdown
## Cease and Desist Letter Placement Map

### Letter Structure:
1. Date
2. Recipient Information
3. Subject/Re: Line
4. Salutation
5. Body Paragraphs
   - Introduction
   - Facts/Allegations
   - Legal Basis
   - Demands
   - Consequences
6. Closing Statement
7. Closing Salutation

Sincerely,

[SIGNATURE_BLOCK:sender-signature]

8. CC/Enclosures (if any)
```

### 6.4.2 Implement blocks and test

**Implementation Steps:**

1. **Update cease-and-desist-letter.json:**
   ```json
   {
     "id": "cease-and-desist-letter",
     "name": "Cease and Desist Letter",
     "description": "...",
     "sections": [...],
     "signatureBlocks": [
       {
         "id": "sender-signature",
         "type": "single",
         "placement": {
           "location": "after-closing-salutation",
           "marker": "[SIGNATURE_BLOCK:sender-signature]"
         },
         "party": {
           "role": "sender",
           "label": "",
           "fields": {
             "name": { "required": true, "label": "Name" },
             "title": { "required": true, "label": "Title" },
             "company": { 
               "required": false, 
               "label": "Law Firm/Company" 
             },
             "registrationNumber": {
               "required": false,
               "label": "Bar No."
             }
           }
         }
       }
     ]
   }
   ```

2. **Consider professional formatting:**
   - No label needed (formal letter format)
   - Title is required for authority
   - Law firm typically included
   - Bar number may be required in some jurisdictions

3. **Test template loading:**
   ```bash
   docker exec casethread-dev npm test -- __tests__/services/template.test.ts
   ```

4. **Test document generation with marker:**
   ```bash
   docker exec casethread-dev npm run cli -- generate cease-and-desist-letter docs/testing/scenario-inputs/cil-05-cease-desist-false-claims.yaml
   ```

5. **Verify marker placement:**
   - Check that `[SIGNATURE_BLOCK:sender-signature]` appears after "Sincerely,"
   - Ensure proper spacing for formal letter
   - Verify professional appearance maintained

6. **Test different sender types:**
   - Attorney with bar number
   - Corporate representative
   - Individual rights holder

7. **Run full test suite:**
   ```bash
   docker exec casethread-dev npm test
   ```

## Testing Approach

1. **Template Loading Test:**
   - Verify template loads with signature block
   - Check all fields accessible
   - Ensure backward compatibility

2. **Document Generation Test:**
   - Generate with attorney sender
   - Generate with corporate sender
   - Verify formal letter format preserved

3. **Professional Standards:**
   - Marker placement maintains formality
   - Spacing appropriate for business letter
   - All professional fields included

## Definition of Done

- [ ] Investigation complete with documented findings
- [ ] Letter structure mapped
- [ ] JSON template updated with signature block
- [ ] Professional fields included
- [ ] Placement directive specified
- [ ] Marker appears after closing salutation
- [ ] Works for different sender types
- [ ] Template loading tests pass
- [ ] Document generation successful
- [ ] Full test suite passes

## Common Pitfalls

1. **Breaking letter format** - Maintain formal structure
2. **Missing title** - Authority must be clear
3. **Incorrect placement** - Must be after closing
4. **Too many fields** - Keep professional and clean
5. **Forgetting bar number** - May be legally required

## Notes

- Cease and desist letters require professional presentation
- Signature establishes sender's authority
- Format follows formal business letter conventions
- No initials needed in standard practice
- Consider jurisdiction-specific requirements 