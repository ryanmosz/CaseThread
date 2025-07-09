# MFD: GUI Architecture Decisions - Locked Features

## Status: DECISIONS LOCKED ✅
These architectural decisions are final for the MVP demo.

## Core Architecture: 3-Pane Layout

### Left Pane: Document Management
- **Function**: File browser similar to Cursor's project directory
- **Behavior**: Shows all documents in the system (text and PDF)
- **Selection**: 
  - Clicking text file → displays in middle pane (read-only for existing files)
  - Clicking PDF file → displays PDF viewer in middle pane
- **Status**: Basic concept locked, Developer G implementing

### Middle Pane: Multi-Purpose Viewer/Editor
- **Function**: Display and editing area
- **Multi-purpose**:
  - Shows forms during document generation
  - Shows progress indicators
  - **NEW**: Displays generated documents in editable text mode
  - **NEW**: Shows text files from left pane (read-only)
  - **NEW**: Shows PDF files with PDF viewer
- **Status**: Core purpose locked, implementation by Developer G

### Right Pane: Document Generation Tool
- **Structure**: Single feature pane (not tabbed for MVP)
- **Content**: Document generation controls
- **Future**: Can easily add tabs for additional features
- **Status**: Structure locked

---

## Document Generation Feature (Right Pane) ✅

### Initial State
- Shows 8 document type selector buttons:
  1. NDA (IP-Specific)
  2. Patent Assignment Agreement
  3. Patent License Agreement  
  4. Provisional Patent Application
  5. Office Action Response
  6. Trademark Application
  7. Cease and Desist Letter
  8. Technology Transfer Agreement

### Generation Workflow (Updated for Friday)
1. **User selects document type** → Button click
2. **Form appears in middle pane** → Dynamic form for selected type
3. **User fills form** → All required fields
4. **User clicks "Generate Now"** → Validation triggered
5. **Validation**:
   - If missing fields → Prompt to complete
   - If complete → Proceed
6. **Generation begins**:
   - Progress indicator in middle pane
   - Show generation status
7. **Document complete**:
   - Display in middle pane as **editable text**
   - User can manually edit the generated document
8. **Save & Export**:
   - User clicks "Save and Export to PDF" button (location TBD by Developer G)
   - System saves edited text file to project
   - System generates PDF from edited text
   - Both files appear in left pane

### File Viewing from Left Pane
- **Text Files**: Display as read-only in middle pane
- **PDF Files**: Display with PDF viewer in middle pane
- **Generated Files**: Can be re-opened and viewed

---

## Developer Responsibilities

### Developer G (GUI Lead)
- All GUI implementation
- Electron setup and architecture
- Editor integration
- File browser functionality
- Decides: button placement, file organization, UI patterns

### Developer R (Backend/PDF)
- PDF generation with legal formatting
- Export functionality
- Backend integration points

---

## Decisions Made by Developer G
These decisions will be made during implementation:
- [ ] Save/Export button placement
- [ ] File organization structure
- [ ] Naming convention for saved files
- [ ] Left pane refresh behavior
- [ ] Error handling UI
- [ ] Loading states design

---

## MVP Feature Set (Friday)

### Must Have ✅
1. 3-pane layout
2. 8 document type selectors
3. Form-based input
4. Generated document editing
5. Save edited text files
6. Export to PDF
7. View text and PDF files

### Removed from MVP
- Summarization feature (now optional)
- Multiple tabs in right pane
- Advanced file management

---

## Stretch Goal: Generative Editing (Weekend)

### Concept
Replace manual editing with AI-powered editing where users can request changes through natural language.

### Status: NOT DEFINED
- Implementation approach TBD
- UI/UX design TBD
- Only if Friday goals complete

---

## Visual Layout (Updated)

```
+----------------+------------------+------------------+
| File Browser   |  Form/Editor/    | Document Types:  |
|                |     Viewer       | [  ] NDA         |
| > Contract.txt |                  | [  ] Patent Lic. |
| > Contract.pdf | [Editable Text   | [  ] Patent Asg. |
| > NDA.txt      |  or              | [  ] Provisional |
| > Patent.pdf   |  PDF Viewer      | [  ] Office Act. |
|                |  or              | [  ] Trademark   |
|                |  Form Input]     | [  ] Cease & D.  |
|                |                  | [  ] Tech Trans. |
|                |                  |                  |
|                | [Save & Export]  | [Generate Now]   |
+----------------+------------------+------------------+
    Left Pane        Middle Pane        Right Pane
```

---

## Implementation Priority
1. Basic 3-pane structure (Developer G)
2. PDF generation system (Developer R)
3. Document generation flow (Developer G)
4. Text editor integration (Developer G)
5. Save/Export functionality (Both)
6. File browser with text/PDF viewing (Developer G) 