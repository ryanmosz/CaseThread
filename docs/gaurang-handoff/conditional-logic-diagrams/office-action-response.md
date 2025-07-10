# Office Action Response - Conditional Logic

## Visual Diagram

```mermaid
flowchart TD
    Start([User Starts Form]) --> BasicFields[Show basic fields:<br/>- application_number<br/>- examiner_name<br/>- response_type<br/>- rejections<br/>- arguments]
    
    BasicFields --> AmendStrategy{amendment_strategy?}
    
    AmendStrategy -->|amend_claims or<br/>amend_and_argue| ShowAmendSection[Show Amendments<br/>section in document<br/>Include claims_to_amend]
    AmendStrategy -->|argue_only or<br/>interview_first| HideAmendSection[Hide Amendments<br/>section from document]
    
    ShowAmendSection --> InterviewDecision{interview_conducted?}
    HideAmendSection --> InterviewDecision
    
    InterviewDecision -->|true| ShowInterview[Show Interview Summary<br/>section in document<br/>Require interview_date]
    InterviewDecision -->|false| HideInterview[Hide Interview<br/>Summary section]
    
    ShowInterview --> Generate[Generate Document]
    HideInterview --> Generate
    
    Generate --> Sign[Attorney Signature<br/>with USPTO Reg #]
    Sign --> End([Document Complete])
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style ShowAmendSection fill:#fff3cd
    style ShowInterview fill:#fff3cd
    style AmendStrategy fill:#cce5ff
    style InterviewDecision fill:#cce5ff
```

## Text Description for AI Agents

### Template: office-action-response
**Trigger Fields**: 2 fields controlling document sections
**Conditional Sections**: 2 document sections (not fields)

### Decision Points:
1. **amendment_strategy** (select)
   - Options: amend_claims, argue_only, amend_and_argue, interview_first
   - If "amend_claims" OR "amend_and_argue": Show Amendments section
   - If "argue_only" OR "interview_first": Hide Amendments section
   - Controls: Document section, not a field

2. **interview_conducted** (boolean)
   - If true: Show Interview Summary section
   - If true: Make interview_date field visible and required
   - If false: Hide Interview Summary section and interview_date field

### Form Flow:
1. **Initial State**: Basic fields visible, conditional sections hidden
2. **First Decision**: User selects amendment_strategy
3. **Second Decision**: User indicates if interview was conducted
4. **Document Generation**: Include/exclude sections based on choices

### Field vs Section Conditional:
- `claims_to_amend` field is always visible (optional)
- The Amendments SECTION only appears if strategy includes amendments
- `interview_date` field only visible if interview_conducted = true

### Implementation Notes:
- Two independent conditionals
- Sections are conditionally included in document
- Different from simple field show/hide
- Remember interview_date is a dependent field 