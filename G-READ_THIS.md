# 📋 Developer G - GUI Implementation Guide

## Overview

This document explains the resources created to help you implement the GUI forms for CaseThread. Developer R has completed all signature block definitions and created comprehensive documentation for GUI field requirements.

## What's Been Completed

### 1. ✅ All 8 Templates Have Signature Blocks (Task 6.0 Complete)
Every template now has properly defined signature blocks in their JSON files:
- Patent Assignment Agreement
- Trademark Application
- Cease and Desist Letter
- NDA IP Specific
- Office Action Response
- Patent License Agreement
- Provisional Patent Application
- Technology Transfer Agreement

**Total: 318 tests passing, including 42 signature block tests**

### 2. 📚 Comprehensive GUI Documentation Created
Location: `docs/templates/gui-field-requirements.md`

This 400+ line document contains everything you need:
- All required vs optional fields for each template
- Conditional field dependencies (which fields trigger show/hide)
- Validation rules
- Edge cases and special behaviors
- Quick reference tables
- Test scenarios

## Key Files for GUI Implementation

### 1. **GUI Field Requirements** (MUST READ)
**Path:** `docs/templates/gui-field-requirements.md`

This is your primary reference containing:
- Field-by-field breakdown for all 8 templates
- Which fields are required vs optional
- Conditional logic (e.g., "if has_drawings = true, show drawing_descriptions field")
- Validation rules for each field
- Quick reference tables showing all dynamic behaviors

### 2. **Template JSON Files**
**Path:** `templates/core/*.json`

Each template contains:
- `requiredFields` array - all form fields with types and validation
- `sections` array - document structure with conditional sections
- `signatureBlocks` array - signature requirements (NEW)
- `initialBlocks` array - initial block requirements (NEW)

### 3. **Signature Block Schema Documentation**
**Path:** `docs/templates/signature-block-schema.md`

Explains the signature block structure and all possible configurations.

## Critical Implementation Points

### 1. Optional Fields (34 total across all templates)
- Always visible in form
- Must be labeled with "(Optional)" suffix
- Can be left blank without validation errors
- Examples: patent_numbers, specific_products, witness signatures

### 2. Conditional Fields/Sections (10 conditional behaviors)
Key examples:
```
provisional-patent: has_drawings=true → show drawing_descriptions field
patent-assignment: consideration_type="monetary" → show dollar_amount field
technology-transfer: export_controlled=true → include export control section
```

### 3. Dynamic Document Sections
Some sections only appear in the final document based on field values:
- Claims section in provisional patent (if include_claims = true)
- Training section in technology transfer (if training_required = true)
- Export control section (if export_controlled = true)

### 4. Field Dependencies to Implement

**CRITICAL**: Place trigger fields BEFORE dependent fields in the form!

Examples:
- `filing_basis` field must come before `first_use_date` fields
- `consideration_type` must come before `dollar_amount`
- `has_amendments` must come before `amendments_text`

### 5. Validation Rules

Frontend validation needed for:
- Required field checking (only for visible fields)
- Min/max length constraints
- Number ranges (e.g., royalty_rate: 0-50%)
- Date relationships (e.g., first_use_date <= first_use_commerce_date)
- Format validation (USPTO numbers, patent numbers)

## Quick Start Checklist

1. [ ] Read `docs/templates/gui-field-requirements.md` thoroughly
2. [ ] Review the quick reference tables for conditional logic
3. [ ] Check each template's JSON file for the complete field list
4. [ ] Note which fields trigger show/hide of other fields
5. [ ] Implement progressive disclosure for complex forms
6. [ ] Add "(Optional)" labels to all optional fields
7. [ ] Only validate visible fields (hidden fields should be ignored)
8. [ ] Test minimum viable forms (only required fields)
9. [ ] Test maximum complexity forms (all options enabled)

## Common Pitfalls to Avoid

1. **Validating hidden fields** - Only validate fields that are currently visible
2. **Not clearing dependent field values** when trigger field changes
3. **Wrong field order** - Trigger fields must come before their dependents
4. **Missing optional labels** - Users assume all fields are required
5. **Not handling multiselect fields** properly (they need array handling)

## Template Complexity Ranking (Easiest to Hardest)

1. **Cease and Desist Letter** - No conditional fields
2. **Office Action Response** - One conditional field
3. **NDA IP Specific** - Changes labels but no field dependencies
4. **Trademark Application** - Date dependencies, specimen conditional
5. **Patent License Agreement** - Field exclusive conditionals
6. **Provisional Patent Application** - Two major conditionals
7. **Patent Assignment Agreement** - Consideration type branching
8. **Technology Transfer Agreement** - Most complex with 3 conditional sections

## Test Scenarios Provided

The GUI documentation includes specific test scenarios:
- Minimum viable forms (required fields only)
- Maximum complexity forms (all features enabled)
- Edge cases (date validation, zero values, etc.)

## Questions?

If something is unclear after reading the GUI field requirements document:
1. Check the actual template JSON file
2. Look at the signature block tests for examples
3. The conditional logic is defined in `conditionalOn` properties
4. All validation rules are in the `validation` property of each field

## Next Steps

1. Start with the simpler templates to establish patterns
2. Implement the conditional show/hide logic
3. Add proper validation for visible fields only
4. Test with the scenarios provided in the documentation
5. Ensure draft save functionality for long forms

---

**Remember**: The `docs/templates/gui-field-requirements.md` file is your comprehensive reference. It was specifically created to answer all questions about field behavior, validation, and conditional logic for the GUI implementation. 