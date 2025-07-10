# Technology Transfer Agreement - Conditional Logic

## Visual Diagram

```mermaid
flowchart TD
    Start([User Starts Form]) --> CoreFields[Show core fields:<br/>- provider/recipient names<br/>- technology description<br/>- transfer components<br/>- transfer type<br/>- territory<br/>- financial terms]
    
    CoreFields --> Training{training_required?}
    
    Training -->|true| ShowTraining[Show: training_details<br/>Make REQUIRED<br/>Include training section]
    Training -->|false| HideTraining[Hide: training_details<br/>No training section]
    
    ShowTraining --> Milestones{milestone_payments?}
    HideTraining --> Milestones
    
    Milestones -->|true| ShowMilestones[Include milestone<br/>payment subsection<br/>in financial terms]
    Milestones -->|false| NoMilestones[Standard payment<br/>terms only]
    
    ShowMilestones --> Export{export_controlled?}
    NoMilestones --> Export
    
    Export -->|true| ShowExport[Include export control<br/>section in document<br/>Add export initials]
    Export -->|false| NoExport[No export section<br/>Standard agreement]
    
    ShowExport --> OptionalFields[Optional fields visible:<br/>- patent_list<br/>- field_of_use]
    NoExport --> OptionalFields
    
    OptionalFields --> RoyaltyCheck{royalty_rate > 0?}
    
    RoyaltyCheck -->|true| DetailedRoyalty[Include detailed<br/>royalty provisions]
    RoyaltyCheck -->|false| MinimalRoyalty[Minimal royalty<br/>section (paid-up)]
    
    DetailedRoyalty --> Generate[Generate Agreement<br/>with selected sections]
    MinimalRoyalty --> Generate
    
    Generate --> ComplexSigning[Provider & Recipient Sign<br/>Initial blocks on:<br/>- Tech transfer<br/>- Financial terms<br/>- IP provisions<br/>- Export (if applicable)]
    
    ComplexSigning --> End([Agreement Complete])
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style Training fill:#cce5ff
    style Milestones fill:#cce5ff
    style Export fill:#cce5ff
    style ShowTraining fill:#fff3cd
    style ShowExport fill:#ffcccc
```

## Text Description for AI Agents

### Template: technology-transfer-agreement
**Trigger Fields**: 3 boolean + 1 numeric check
**Conditional Sections**: 3 major document sections
**Most Complex Template**: Multiple decision points

### Decision Tree:
1. **training_required** (boolean)
   - If true: Show training_details field (REQUIRED)
   - If true: Include Training & Support section
   - If false: Hide field and section

2. **milestone_payments** (boolean)
   - If true: Add milestone payment subsection to Financial Terms
   - If false: Standard payment terms only

3. **export_controlled** (boolean)
   - If true: Include Export Control section
   - If true: Add export control initial block
   - If false: No export provisions

4. **royalty_rate** (numeric)
   - If > 0: Detailed royalty calculations
   - If = 0: Minimal royalty text (paid-up license)

### Form States Matrix:
| Training | Milestones | Export | Sections Included |
|----------|------------|--------|-------------------|
| No | No | No | Minimal (base only) |
| Yes | No | No | +Training section |
| No | Yes | No | +Milestone subsection |
| No | No | Yes | +Export section |
| Yes | Yes | Yes | All sections (longest) |

### Always Optional Fields:
- `patent_list` - List of patents if applicable
- `field_of_use` - Usage restrictions

### Initial Blocks Required:
1. Technology Transfer section (always)
2. Financial Terms section (always)
3. IP Provisions section (always)
4. Export Control section (only if export_controlled = true)

### Implementation Complexity:
- Most decision points of any template
- Sections can combine in 8 different ways
- Document length varies significantly
- Multiple initial blocks to track

### Implementation Notes:
- Consider progressive disclosure
- Group related decisions together
- Preview which sections will be included
- Clear training_details when training_required changes to false 