# NDA IP Specific - Conditional Logic

## Visual Diagram

```mermaid
flowchart TD
    Start([User Starts Form]) --> MutualDecision{mutual?}
    
    MutualDecision -->|true| MutualLabels[Form Labels:<br/>FIRST PARTY<br/>SECOND PARTY<br/><br/>Both can disclose]
    MutualDecision -->|false| UnilateralLabels[Form Labels:<br/>DISCLOSING PARTY<br/>RECEIVING PARTY<br/><br/>One-way disclosure]
    
    MutualLabels --> SameFields[All fields remain visible:<br/>- Party names<br/>- Confidential info<br/>- Purpose<br/>- Term years<br/>- Governing state]
    UnilateralLabels --> SameFields
    
    SameFields --> Validation[Validate:<br/>- term_years: 1-10<br/>- All required fields]
    
    Validation --> Generate[Generate Document<br/>with appropriate labels]
    Generate --> BothSign[Both Parties Sign<br/>Page initials required]
    BothSign --> End([Document Complete])
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style MutualDecision fill:#cce5ff
    style MutualLabels fill:#d4edda
    style UnilateralLabels fill:#f0e68c
```

## Text Description for AI Agents

### Template: nda-ip-specific
**Trigger Field**: `mutual` (boolean)
**Conditional Behavior**: Label changes only (no fields show/hide)
**All Fields**: Always visible regardless of mutual selection

### Form Flow:
1. **Initial State**: All fields visible with default labels
2. **Decision Point**: User selects mutual (Yes/No)
3. **If MUTUAL (true)**:
   - Change party labels to "FIRST PARTY" and "SECOND PARTY"
   - Document allows bidirectional disclosure
   - Both parties can share confidential information
4. **If UNILATERAL (false)**:
   - Change party labels to "DISCLOSING PARTY" and "RECEIVING PARTY"  
   - Document allows one-way disclosure only
   - Only disclosing party shares information
5. **No Field Changes**: All fields remain visible and required

### Label Mapping:
| Field | Mutual=True Label | Mutual=False Label |
|-------|------------------|-------------------|
| disclosing_party | First Party | Disclosing Party |
| receiving_party | Second Party | Receiving Party |

### Special Features:
- Page initials required on each page
- Both parties always sign
- No fields appear/disappear

### Implementation Notes:
- Simple label swap based on boolean
- No show/hide logic needed
- Consider updating labels dynamically in form
- Document generation handles label substitution 