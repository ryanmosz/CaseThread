# Patent Assignment Agreement - Conditional Logic

## Visual Diagram

```mermaid
flowchart TD
    Start([User Starts Form]) --> BasicFields[Show basic fields:<br/>- assignor_name<br/>- assignee_name<br/>- invention_description<br/>- execution_date]
    
    BasicFields --> OptionalFields[Optional fields visible:<br/>- patent_numbers<br/>- patent_applications]
    
    OptionalFields --> ConsiderationType{consideration_type?}
    
    ConsiderationType -->|"monetary"| ShowDollar[Show: dollar_amount<br/>Make REQUIRED<br/>Hide: other_consideration]
    ConsiderationType -->|"other_consideration"| ShowOther[Show: other_consideration_description<br/>Make REQUIRED<br/>Hide: dollar_amount]
    
    ShowDollar --> ValidateDollar[Validate:<br/>dollar_amount >= 0]
    ShowOther --> ValidateOther[Validate:<br/>description not empty]
    
    ValidateDollar --> RecordalDecision{recordal_required?}
    ValidateOther --> RecordalDecision
    
    RecordalDecision -->|true| IncludeNotary[Include Notary Block<br/>for USPTO recording]
    RecordalDecision -->|false| NoNotary[No Notary Block<br/>Standard signatures only]
    
    IncludeNotary --> GenerateDoc[Generate Agreement<br/>with recording provisions]
    NoNotary --> GenerateDoc
    
    GenerateDoc --> Signatures[Both Parties Sign<br/>Initial Block on<br/>assignment provision]
    Signatures --> End([Assignment Complete])
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style ConsiderationType fill:#cce5ff
    style ShowDollar fill:#fff3cd
    style ShowOther fill:#ffe6cc
    style RecordalDecision fill:#e6f3ff
```

## Text Description for AI Agents

### Template: patent-assignment-agreement
**Primary Trigger**: `consideration_type` (select: "monetary" or "other_consideration")
**Secondary Trigger**: `recordal_required` (boolean)
**Conditional Fields**: `dollar_amount` OR `other_consideration_description`

### Form Flow:
1. **Initial State**: Basic fields visible, consideration fields hidden
2. **Decision Point 1**: User selects consideration_type
3. **If "MONETARY" Selected**:
   - Show `dollar_amount` field (REQUIRED)
   - Hide `other_consideration_description`
   - Validate dollar_amount >= 0
4. **If "OTHER_CONSIDERATION" Selected**:
   - Show `other_consideration_description` field (REQUIRED)
   - Hide `dollar_amount`
   - Validate description not empty
5. **Decision Point 2**: User selects recordal_required
6. **If RECORDAL Required (true)**:
   - Include notary block in document
   - Add recording-specific language
7. **If NO RECORDAL (false)**:
   - Standard signatures only
   - Simpler document format

### Validation Rules:
- Only ONE consideration field visible at a time
- dollar_amount must be >= 0 (when visible)
- Clear hidden field when switching types

### Document Features:
- Initial block for assignment acknowledgment
- Both parties must sign
- Optional notary block based on recordal needs

### Implementation Notes:
- Radio buttons or select for consideration_type
- Show currency symbol with dollar_amount field
- Consider placeholder text for other_consideration
- Notary block adds significant length to document 