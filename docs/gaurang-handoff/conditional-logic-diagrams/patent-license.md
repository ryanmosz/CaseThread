# Patent License Agreement - Conditional Logic

## Visual Diagram

```mermaid
flowchart TD
    Start([User Starts Form]) --> BasicFields[Show basic fields:<br/>- licensor/licensee names<br/>- patent_numbers<br/>- territory<br/>- royalty_rate<br/>- upfront_fee<br/>- term_years]
    
    BasicFields --> ExclusivityDecision{exclusivity?}
    
    ExclusivityDecision -->|"exclusive"| NoFieldRestriction[No field_restrictions<br/>Full exclusive rights]
    ExclusivityDecision -->|"non_exclusive"| NoFieldRestriction2[No field_restrictions<br/>Non-exclusive rights]
    ExclusivityDecision -->|"field_exclusive"| ShowFieldRestriction[Show: field_restrictions<br/>Make REQUIRED<br/>Define limited field]
    
    NoFieldRestriction --> CheckRoyalty{royalty_rate > 0?}
    NoFieldRestriction2 --> CheckRoyalty
    ShowFieldRestriction --> ValidateField[Validate field_restrictions<br/>not empty]
    
    ValidateField --> CheckRoyalty
    
    CheckRoyalty -->|true| IncludeRoyaltySection[Include detailed<br/>royalty section<br/>in document]
    CheckRoyalty -->|false| NoRoyaltySection[Minimal royalty<br/>section - 0% rate]
    
    IncludeRoyaltySection --> Generate[Generate Agreement]
    NoRoyaltySection --> Generate
    
    Generate --> BothPartiesSign[Both Parties Sign<br/>Side-by-side layout]
    BothPartiesSign --> End([Agreement Complete])
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style ExclusivityDecision fill:#cce5ff
    style ShowFieldRestriction fill:#fff3cd
    style CheckRoyalty fill:#e6f3ff
```

## Text Description for AI Agents

### Template: patent-license-agreement
**Trigger Field**: `exclusivity` (select: "exclusive", "non_exclusive", "field_exclusive")
**Conditional Field**: `field_restrictions`
**Condition**: Show when exclusivity = "field_exclusive"

### Form Flow:
1. **Initial State**: Basic fields visible, field_restrictions hidden
2. **Decision Point 1**: User selects exclusivity type
3. **If "FIELD_EXCLUSIVE" Selected**:
   - Show `field_restrictions` field
   - Make it REQUIRED
   - User must specify the limited field of use
4. **If "EXCLUSIVE" or "NON_EXCLUSIVE" Selected**:
   - Keep `field_restrictions` hidden
   - No field limitations apply
5. **Decision Point 2**: Check royalty_rate value
6. **If royalty_rate > 0**:
   - Include detailed royalty calculation section
7. **If royalty_rate = 0**:
   - Minimal royalty section (paid-up license)

### Optional Fields:
- `sublicense_rights` - Always visible but optional

### Signatures:
- Both parties (licensor & licensee) required
- Side-by-side layout for equal parties
- No witness/notary required

### Implementation Notes:
- Place exclusivity field BEFORE field_restrictions
- Clear field_restrictions when changing from field_exclusive
- Royalty section is dynamic based on rate value
- Consider showing example text for field restrictions 