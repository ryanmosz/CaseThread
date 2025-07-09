# MFT: Summarization Feature Design Options

## Current State
- Multi-agent system with ChromaDB for context
- Document generation working via CLI
- No summarization capability yet
- Planning to build Electron GUI for both features

## Decision Criteria for MVP
1. **Component reusability** (share with doc generation)
2. **Simplicity of development**
3. **Demo effectiveness**
4. **Time to implement** (by Friday)

## Shared Component Opportunities
- File upload/input interface
- Document display/preview area
- PDF export functionality
- Settings/configuration panel
- Progress indicators

---

## Option 1: Unified Document Workspace

### Description
- Single main interface for both features
- Toggle between "Generate" and "Summarize" modes
- Shared document viewer/editor
- Common toolbar for all actions

### Shared Components
- Main document area (input/output)
- File management sidebar
- Export options menu
- Settings panel

### Development Complexity: ⭐⭐ (2/5 - Easy)
- **Implementation**: 5-7 hours
- **Changes needed**:
  - Mode switcher component
  - Adapt existing viewer for summaries
  - Add summarization endpoint
- **Reuses**: Most UI components

### Pros
- Maximum code reuse
- Consistent user experience
- Single learning curve

### Cons
- May feel cramped
- Mode switching could confuse

---

## Option 2: Tabbed Interface

### Description
- Browser-style tabs
- "Generate" tab and "Summarize" tab
- Each tab has optimized layout
- Shared components across tabs

### Shared Components
- Tab navigation system
- Document preview pane
- File upload modal
- Export functionality
- Status bar

### Development Complexity: ⭐⭐⭐ (3/5 - Moderate)
- **Implementation**: 7-9 hours
- **Changes needed**:
  - Tab management system
  - State persistence between tabs
  - Shared service layer
- **Reuses**: Core components

### Pros
- Clear separation of features
- Can work on multiple documents
- Professional appearance

### Cons
- Slightly more complex state management
- Need to handle tab switching

---

## Option 3: Split Pane Design

### Description
- Left pane: Input (form or document upload)
- Right pane: Output (generated doc or summary)
- Top toolbar switches between features
- Bottom status bar shared

### Shared Components
- Split pane layout system
- Input pane (adapts to feature)
- Output pane with viewer
- Toolbar components
- Status indicators

### Development Complexity: ⭐⭐ (2/5 - Easy)
- **Implementation**: 6-8 hours
- **Changes needed**:
  - Resizable pane system
  - Adaptive input components
  - Unified output viewer
- **Reuses**: Layout and viewers

### Pros
- Visual clarity
- See input and output together
- Natural workflow

### Cons
- Less screen space per pane
- May need responsive design

---

## Option 4: Wizard/Pipeline Interface

### Description
- Step-by-step process for both features
- Step 1: Choose feature (Generate/Summarize)
- Step 2: Input (form or file upload)
- Step 3: Processing (with progress)
- Step 4: Review and export

### Shared Components
- Wizard navigation framework
- Step indicator
- Input components
- Progress animations
- Export wizard

### Development Complexity: ⭐⭐⭐⭐ (4/5 - Complex)
- **Implementation**: 10-12 hours
- **Changes needed**:
  - Wizard state machine
  - Step components
  - Navigation logic
- **New development**: Significant

### Pros
- Guided experience
- Hard to make mistakes
- Impressive for demo

### Cons
- More development time
- May feel slow for power users

---

## Option 5: Command Palette Style

### Description
- Central command bar (like VS Code)
- Type to select action
- Minimal UI, maximum flexibility
- Pop-up panels for input/output

### Shared Components
- Command palette system
- Action registry
- Modal system
- Results viewer

### Development Complexity: ⭐⭐⭐⭐⭐ (5/5 - Most Complex)
- **Implementation**: 15+ hours
- **Changes needed**:
  - Command system
  - Action handlers
  - Complex state management
- **New development**: Extensive

### Pros
- Very modern feel
- Extremely flexible
- Power user friendly

### Cons
- Too complex for timeline
- Not intuitive for demo

---

## Recommendation for MVP

### Primary: Option 3 (Split Pane Design)
- **Why**: Natural layout, easy to implement, clear workflow
- **Shared components**: Maximizes reuse
- **Timeline**: 6-8 hours
- **Risk**: Low

### Alternative: Option 1 (Unified Workspace)
- **Why**: Simplest to build
- **Timeline**: 5-7 hours
- **Risk**: Very low

### If Time Permits: Option 2 (Tabbed Interface)
- **Why**: Professional, scalable
- **Timeline**: 7-9 hours
- **Risk**: Moderate

## Shared Component Architecture

### Core Components (Used by Both Features)
```
- DocumentViewer
  - Renders generated documents
  - Displays summaries
  - Handles PDF preview

- FileUploader
  - YAML files for generation
  - PDFs/documents for summarization
  - Drag and drop support

- ExportPanel
  - PDF export for both features
  - Copy to clipboard
  - Save as text

- ProgressIndicator
  - Generation progress
  - Summarization progress
  - Consistent animations

- ErrorDisplay
  - Validation errors
  - API errors
  - User-friendly messages
```

### Implementation Strategy

1. **Build shared components first**
   - DocumentViewer
   - FileUploader
   - Basic layout

2. **Add generation feature**
   - Form/input system
   - Connect to existing backend

3. **Add summarization feature**
   - Reuse FileUploader
   - Add summary display mode
   - New backend endpoint

### Backend Considerations

```typescript
// Shared service structure
interface DocumentService {
  generate(input: FormData): Promise<Document>
  summarize(file: File): Promise<Summary>
  exportPDF(content: string): Promise<Blob>
}
```

## Demo Flow with Split Pane

1. **Open app** - Clean split pane interface
2. **Demo Generation** - Switch to generate mode, fill form, show document
3. **Demo Summarization** - Switch to summarize, upload document, show summary
4. **Show PDF Export** - Export from either feature
5. **Emphasize Speed** - Both features under 30 seconds

## Post-MVP Enhancement Ideas
- Batch processing for both features
- Summary of generated documents
- Generate documents from summaries
- Side-by-side comparison view
- Template library in left pane 