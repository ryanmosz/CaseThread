# Conditional Logic Diagrams

This folder contains visual representations of the conditional field logic for all 8 CaseThread document templates. Each diagram shows:

- **Trigger Fields**: Fields that control visibility of other fields/sections
- **Decision Points**: Where the form logic branches based on user input  
- **Outcomes**: Which fields appear/disappear based on selections
- **Validation Rules**: Key validation requirements at each step

## How to Use These Diagrams

1. **Visual Format**: The `.md` files contain Mermaid diagrams that render visually in GitHub/VS Code
2. **Text Format**: Each diagram includes a text description for AI agents and accessibility
3. **Implementation Order**: Start with simpler templates (fewer decision points) and work up to complex ones

## Template Complexity Order (Easiest → Hardest)

1. **cease-and-desist.md** - No conditional fields (simplest)
2. **office-action-response.md** - 1 conditional field
3. **nda-ip-specific.md** - Field changes labels but no show/hide
4. **trademark-application.md** - 3 conditional fields based on filing basis
5. **patent-license.md** - 1 conditional field for exclusivity type
6. **provisional-patent.md** - 2 major conditional sections
7. **patent-assignment.md** - Branching based on consideration type
8. **technology-transfer.md** - 3 conditional sections (most complex)

## Quick Legend

- 🟦 **Diamonds**: Decision points (user selections)
- 🟨 **Yellow Boxes**: Fields that appear/disappear
- 🟩 **Green Boxes**: Start/End points
- 🔵 **Blue Boxes**: Document sections that may be included/excluded
- ➡️ **Arrows**: Show the flow based on user choices

Each diagram file contains both the visual Mermaid diagram and a structured text description for comprehensive understanding. 