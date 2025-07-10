# GUI Field Requirements for CaseThread Templates

## Overview

This document defines field behavior, validation rules, and conditional logic for all CaseThread templates to ensure correct GUI form implementation. It covers all 8 document types with emphasis on optional fields, conditional sections, and dynamic behavior.

**Key Statistics:**
- Total Templates: 8
- Optional Fields: 34
- Conditional Sections: 10
- Templates with Signature Blocks: 8 (all)

## Field Type Definitions

1. **Required Fields**: Must have values before document generation
2. **Optional Fields**: Can be left blank, always visible in form (marked with "Optional" label)
3. **Dependent Fields**: Only visible when specific conditions are met
4. **Trigger Fields**: Fields whose values affect other fields/sections visibility

## Quick Reference Tables

### Fields That Trigger Show/Hide

| Template | Trigger Field | Affected Fields/Sections | Show When |
|----------|--------------|-------------------------|-----------|
| provisional-patent | has_drawings | drawing_descriptions | = true |
| provisional-patent | include_claims | claims section | = true |
| patent-assignment | consideration_type | dollar_amount | = "monetary" |
| nda-ip-specific | mutual | section labels change | = true/false |
| office-action | amendment_strategy | amendments section (document) | = "amend_claims" or "amend_and_argue" |
| office-action | interview_conducted | interview_date, interview summary section | = true |
| patent-license | exclusivity | field_restrictions | = "field_exclusive" |
| technology-transfer | training_required | training_details, training_support section | = true |
| technology-transfer | export_controlled | export_control section | = true |
| technology-transfer | milestone_payments | milestone payment subsection | = true |
| multiple templates | has_exhibits | exhibit references | = true |

### Optional Signature Summary

| Template | Signature Type | Required/Optional | Notes |
|----------|---------------|-------------------|-------|
| patent-assignment | assignor | Required | Primary party |
| patent-assignment | assignee | Required | Primary party |
| patent-assignment | notary | Optional | For recording |
| provisional-patent | inventor | Required | All inventors must sign |
| provisional-patent | witness | Optional | Not legally required |
| trademark-app | attorney | Required | If represented |
| nda-ip-specific | first-party | Required | Disclosing/mutual party |
| nda-ip-specific | second-party | Required | Receiving/mutual party |
| cease-desist | attorney | Required | Sender's counsel |
| office-action | attorney | Required | Must include USPTO reg # |
| patent-license | licensor | Required | Patent owner |
| patent-license | licensee | Required | License recipient |
| tech-transfer | provider | Required | Technology owner |
| tech-transfer | recipient | Required | Technology receiver |

### Dynamic Document Sections

| Template | Section | Appears When | Required Fields When Active |
|----------|---------|--------------|---------------------------|
| provisional-patent | claims | include_claims = true | claims_text |
| provisional-patent | drawings | has_drawings = true | drawing_descriptions |
| patent-assignment | consideration | always | consideration_type, dollar_amount (if monetary) |
| office-action | amendments | amendment_strategy = "amend_claims" or "amend_and_argue" | claims_to_amend (always visible field) |
| office-action | interview | interview_conducted = true | interview summary |
| patent-license | royalties | royalty_rate > 0 | payment calculation details |
| technology-transfer | training | training_required = true | training_details |
| technology-transfer | export control | export_controlled = true | none (uses defaults) |
| technology-transfer | milestones | milestone_payments = true | milestone descriptions |

## Template-by-Template Requirements

### 1. Provisional Patent Application

#### Always Visible Fields
- **inventor_names** (required): Comma-separated list
- **invention_title** (required): Max 500 chars
- **field_of_invention** (required): Technical field
- **background** (required): Prior art discussion
- **summary** (required): Brief overview
- **detailed_description** (required): Complete disclosure
- **include_claims** (required, boolean): Triggers claims section
- **has_drawings** (required, boolean): Triggers drawings section
- **first_invented_date** (optional): Prior invention date

#### Conditional Fields
- **claims_text** (required if include_claims = true): Patent claims
- **drawing_descriptions** (required if has_drawings = true): Figure descriptions

#### Validation Rules
- invention_title: maxLength 500
- All text areas: minLength 50

#### Special Behaviors
- Multiple inventors supported (parse comma-separated)
- Witness signature always optional
- Claims section commonly included but not required

### 2. NDA IP Specific

#### Always Visible Fields
- **mutual** (required, boolean): Changes entire document structure
- **disclosing_party** (required): Party sharing information
- **receiving_party** (required): Party receiving information
- **confidential_information** (required): What's being protected
- **purpose** (required): Why information is shared
- **term_years** (required): Duration (1-10 years)
- **governing_state** (required): Legal jurisdiction

#### Conditional Fields
None - but `mutual` field changes party labels throughout

#### Validation Rules
- term_years: min 1, max 10
- Party names: minLength 2, maxLength 200

#### Special Behaviors
- When mutual = true:
  - Labels change to "FIRST PARTY" and "SECOND PARTY"
  - Both parties can disclose
- When mutual = false:
  - Labels are "DISCLOSING PARTY" and "RECEIVING PARTY"
  - One-way disclosure only

### 3. Patent Assignment Agreement

#### Always Visible Fields
- **assignor_name** (required): Current patent owner
- **assignee_name** (required): New patent owner
- **patent_numbers** (optional): List of patents
- **patent_applications** (optional): Pending applications
- **invention_description** (required): What's being assigned
- **consideration_type** (required, select): "monetary" or "other_consideration"
- **execution_date** (required): Agreement date
- **recordal_required** (required, boolean): USPTO recording needed

#### Conditional Fields
- **dollar_amount** (required if consideration_type = "monetary"): Payment amount
- **other_consideration_description** (required if consideration_type = "other_consideration")

#### Validation Rules
- dollar_amount: min 0 when visible
- patent_numbers: specific format validation

#### Special Behaviors
- Notary block included for recording
- Initial block for key assignment provisions
- Both parties must sign

### 4. Trademark Application

#### Always Visible Fields
- **mark_text** (required): The trademark
- **mark_type** (required, select): "standard_character" or "stylized"
- **applicant_name** (required): Owner
- **applicant_entity_type** (required, select): LLC, Corporation, etc.
- **goods_services** (required): What mark covers
- **class_numbers** (required): International classes
- **filing_basis** (required, select): "use" or "intent_to_use"
- **attorney_name** (required): Legal representative
- **attorney_registration** (required): USPTO reg number
- **attorney_address** (required): Full address

#### Conditional Fields
- **first_use_date** (required if filing_basis = "use"): When first used
- **first_use_commerce_date** (required if filing_basis = "use"): Interstate commerce
- **specimen_description** (required if filing_basis = "use"): Evidence of use

#### Validation Rules
- first_use_date <= first_use_commerce_date
- class_numbers: valid international class format
- attorney_registration: valid USPTO format

#### Special Behaviors
- Only attorney signs (applicant doesn't sign application)
- Specimen section only for use-based applications
- Commerce date can't be before first use date

### 5. Cease and Desist Letter

#### Always Visible Fields
- **sender_name** (required): Rights holder
- **sender_address** (required): Full address
- **recipient_name** (required): Alleged infringer
- **recipient_address** (required): Full address
- **ip_type** (required, select): patent/trademark/copyright/trade_secret
- **ip_description** (required): What's being infringed
- **infringement_description** (required): How they're infringing
- **demand_type** (required, multiselect): Multiple demands allowed
- **response_deadline** (required): Days to respond (7-30)
- **attorney_name** (required): Sender's counsel
- **attorney_firm** (required): Law firm

#### Conditional Fields
- **registration_numbers** (optional): Patent/trademark numbers
- **specific_products** (optional): Infringing products list

#### Validation Rules
- response_deadline: min 7, max 30
- All addresses: standard address validation

#### Special Behaviors
- Can select multiple demands (stop use, destroy inventory, accounting, etc.)
- Attorney signs on behalf of client
- Tone can vary based on demand types

### 6. Office Action Response

**Category**: Patent Response
**Complexity**: Medium (2 conditional sections)

**Always Required Fields**:
- **application_number** (required, pattern: XX/XXX,XXX): Patent app number
- **examiner_name** (required): USPTO examiner name
- **art_unit** (required, pattern: XXXX): 4-digit art unit
- **office_action_date** (required, date): When office action was mailed
- **rejection_types** (required, multiselect): Types of rejections received
- **amendment_strategy** (required, select): Response approach
- **claims_rejected** (required): Which claims were rejected
- **attorney_name** (required): Responding attorney
- **attorney_registration** (required, pattern): USPTO reg number

**Conditional Fields**:
- **interview_date** (required if interview_conducted = true): Date of examiner interview

**Always Optional Fields**:
- **claims_to_amend** (optional): Description of claim amendments
- **prior_art_references** (optional): List of cited references

**Conditional Sections**:
1. **Amendments Section**: Shown when amendment_strategy = "amend_claims" or "amend_and_argue"
2. **Interview Summary**: Shown when interview_conducted = true

### 7. Patent License Agreement

#### Always Visible Fields
- **licensor_name** (required): Patent owner
- **licensee_name** (required): License recipient  
- **patent_numbers** (required): Licensed patents
- **exclusivity** (required, select): exclusive/non_exclusive/field_exclusive
- **territory** (required, multiselect): Geographic scope
- **royalty_rate** (required): Percentage (0-50)
- **upfront_fee** (required): Initial payment
- **term_years** (required): Duration
- **governing_state** (required): Legal jurisdiction

#### Conditional Fields
- **field_restrictions** (required if exclusivity = "field_exclusive"): Limited field
- **sublicense_rights** (optional): Can licensee sublicense

#### Validation Rules
- royalty_rate: min 0, max 50
- upfront_fee: min 0
- term_years: min 1, max 50

#### Special Behaviors
- Both parties sign (side-by-side layout)
- Royalty section appears if rate > 0
- Field restrictions only for field-exclusive

### 8. Technology Transfer Agreement

#### Always Visible Fields
- **provider_name** (required): Technology owner
- **recipient_name** (required): Technology receiver
- **technology_field** (required, select): General field
- **technology_description** (required): Detailed description
- **transfer_components** (required, multiselect): What's included
- **transfer_type** (required, select): license/assignment
- **territory** (required, multiselect): Where can use
- **training_required** (required, boolean): Triggers training section
- **upfront_fee** (required): Initial payment
- **milestone_payments** (required, boolean): Triggers milestone section
- **royalty_rate** (required): Percentage
- **export_controlled** (required, boolean): Triggers export section
- **confidentiality_period** (required): Years (1-20)
- **term_years** (required): Agreement duration
- **governing_law** (required, select): Jurisdiction

#### Conditional Fields
- **patent_list** (optional): If patents included
- **field_of_use** (optional): Usage restrictions
- **training_details** (required if training_required = true): Training specs

#### Conditional Sections
- Training section (if training_required = true)
- Export control section (if export_controlled = true)
- Milestone payments (if milestone_payments = true)

#### Validation Rules
- technology_description: minLength 100, maxLength 2000
- confidentiality_period: min 1, max 20
- term_years: min 1, max 50

#### Special Behaviors
- Most complex template with multiple conditional sections
- Both parties sign with initial blocks on key sections
- Export control section critical for compliance

## Implementation Guidelines

### 1. Form Layout Recommendations
- Group related fields in collapsible sections
- Place trigger fields BEFORE their dependent fields
- Clear visual separation between required and optional
- Use progressive disclosure for complex forms

### 2. Field Labeling
- Required fields: Label normally with red asterisk (*)
- Optional fields: Append "(Optional)" to label
- Dependent fields: Show/hide smoothly with animation
- Help text: Explain dependencies and validations

### 3. Validation Strategy
- **Frontend (immediate feedback)**:
  - Required field checking
  - Format validation (emails, numbers, dates)
  - Length constraints
  - Cross-field validation (date relationships)
  
- **Backend (before generation)**:
  - Re-validate all frontend validations
  - Check conditional field requirements
  - Verify complete data for document generation

### 4. Error Handling
- Inline validation messages
- Summary of errors at form top
- Clear indication of which fields need attention
- Validate only visible fields (hidden fields ignored)

### 5. User Experience Tips
- Save draft functionality for long forms
- Progress indicator for multi-section forms
- Clear section headings
- Contextual help for complex fields
- Preview of how selections affect document

## Test Scenarios

### Minimum Viable Forms (Required Fields Only)

1. **Provisional Patent**: Skip claims and drawings
2. **NDA**: Mutual = false for simpler form
3. **Patent Assignment**: Other consideration (no dollar amount)
4. **Trademark**: Intent to use (no specimen needed)
5. **Office Action**: No amendments (arguments only)
6. **Technology Transfer**: No training, no export control

### Maximum Complexity Forms

1. **Provisional Patent**: Include claims and drawings
2. **Patent Assignment**: Monetary consideration with notary
3. **Trademark**: Use-based with specimen
4. **Office Action**: With amendments
5. **Technology Transfer**: All sections enabled

### Edge Cases to Test

1. **Date Validation**: First use vs commerce dates in trademark
2. **Conditional Clears**: Change consideration type - does dollar amount clear?
3. **Multi-value Fields**: Multiple patent numbers, territories
4. **Long Text**: Maximum length validations
5. **Zero Values**: 0% royalty rate behavior

## Common Pitfalls to Avoid

1. **Not clearing dependent fields** when trigger changes
2. **Validating hidden fields** - only validate visible
3. **Missing "Optional" labels** - users assume all fields required
4. **Poor conditional field placement** - trigger after dependent
5. **No draft save** - users lose work on long forms
6. **Unclear validation messages** - be specific
7. **Not handling multiselect properly** - needs array handling

## Notes for Developer G

- This document is generated from the actual JSON templates
- Each template has a `requiredFields` array in its JSON
- Conditional logic is in `conditionalOn` properties
- Signature blocks are defined in `signatureBlocks` array
- All templates now have complete signature definitions
- Test with actual template files for latest requirements 