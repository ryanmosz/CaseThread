# GUI Field Requirements Documentation Plan

## Purpose
Create comprehensive documentation for Developer G to implement forms that correctly handle required fields, optional fields, conditional fields, and dynamic document sections across all 8 templates.

## Document Location
`docs/templates/gui-field-requirements.md`

## Execution Steps

### Step 1: Analyze All Templates
For each of the 8 templates, extract:
1. All required fields (`"required": true`)
2. All optional fields (`"required": false`)
3. All conditional sections (`conditionalOn` blocks)
4. All signature blocks and their required/optional status
5. Field types and validation rules

### Step 2: Create Document Structure

```markdown
# GUI Field Requirements for CaseThread Templates

## Overview
This document defines field behavior, validation rules, and conditional logic for all CaseThread templates to ensure correct GUI form implementation.

## Field Type Definitions
1. **Required Fields**: Must have values before document generation
2. **Optional Fields**: Can be left blank, always visible in form
3. **Dependent Fields**: Only visible when specific conditions are met
4. **Trigger Fields**: Fields whose values affect other fields/sections

## Template-by-Template Requirements

### [Template Name]
#### Field Map
[Table with columns: Field ID | Display Name | Type | Required | Conditions | Validation Rules | Help Text]

#### Conditional Logic
[List all conditionalOn rules and their effects]

#### Signature Requirements
[Detail which signatures are required vs optional]

#### Special Behaviors
[Any template-specific quirks]
```

### Step 3: Document Each Template

For each template, create sections covering:

1. **Field Inventory**
   - Group by: Always visible vs Conditionally visible
   - Mark required vs optional
   - Include field type (text, textarea, select, date, boolean)

2. **Dependency Chains**
   Example:
   ```
   has_drawings (boolean) → 
     if true → show drawing_descriptions field
     if true → include drawing_descriptions_section in document
   ```

3. **Validation Rules**
   - Field-level validation (min/max length, patterns)
   - Cross-field validation (date dependencies)
   - Conditional validation (only validate visible fields)

4. **Section Rendering Logic**
   - Which sections are always included
   - Which sections depend on field values
   - How empty optional fields affect sections

### Step 4: Create Quick Reference Tables

1. **Fields That Trigger Show/Hide**
   ```
   | Template | Trigger Field | Affected Fields | Condition |
   |----------|--------------|-----------------|-----------|
   | provisional-patent | has_drawings | drawing_descriptions | = true |
   ```

2. **Optional Signature Summary**
   ```
   | Template | Signature Type | When Optional |
   |----------|---------------|---------------|
   | provisional-patent | witness | Always optional |
   ```

3. **Dynamic Document Sections**
   ```
   | Template | Section | Appears When |
   |----------|---------|--------------|
   | provisional-patent | Claims | include_claims = true |
   ```

### Step 5: Add Implementation Guidelines

1. **Form Layout Recommendations**
   - Group related fields
   - Place trigger fields before dependent fields
   - Clear visual separation for optional sections

2. **User Experience Notes**
   - Mark optional fields with "(Optional)" label
   - Use help text to explain dependencies
   - Show/hide dependent fields smoothly
   - Validate only visible fields

3. **Error Handling**
   - Required field validation messages
   - Conditional validation only when visible
   - Clear indication of which fields are missing

### Step 6: Include Test Scenarios

For each template, provide:
1. Minimum viable form (only required fields)
2. Full form (all fields populated)
3. Edge cases (specific field combinations)

### Step 7: Document Special Cases

1. **NDA Agreement Type**
   - Changes party labels throughout document
   - Affects multiple text strings

2. **Patent/Trademark Date Dependencies**
   - First use anywhere <= First use in commerce
   - Filing date validations

3. **Multiple Signatures**
   - Some templates need signature blocks for each party
   - Some need witness signatures
   - Some need notary blocks

## Validation Strategy

The document should make clear:
1. Frontend validation (immediate user feedback)
2. Backend validation (before document generation)
3. Which validations can be relaxed for drafts

## Success Metrics

The documentation is complete when:
- Developer G can build forms without asking about field behavior
- QA can create comprehensive test cases
- No ambiguity about optional vs required fields
- All conditional logic is clearly mapped
- Future developers can understand the system

## Tools to Use During Creation

1. Search templates for patterns:
   - `grep -r "required.*false" templates/core/`
   - `grep -r "conditionalOn" templates/core/`
   
2. Generate field lists from each template JSON

3. Test actual document generation to verify behavior

## Time Estimate
2-3 hours to create comprehensive documentation for all 8 templates 