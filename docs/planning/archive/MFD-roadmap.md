# MFD: Development Roadmap & Assignments

## Current Date: Tuesday (Demo: Friday)

## Developer Assignments

### Developer G (Gaurang) - GUI Lead
- Electron 3-pane GUI implementation
- Document editor integration in middle pane
- File browser for left pane
- Save/export workflow
- GUI architecture decisions
- API endpoints to connect GUI with backend

### Developer R (Ryan) - Backend/PDF
- PDF generation via CLI
- Legal formatting compliance
- PDF export functionality
- Ensure PDF generation is callable from code

---

## Completed ✅
- Multi-agent architecture integrated
- ChromaDB context system working
- All 8 document types generating via CLI
- Test suite passing (266 tests)
- Planning documents created

---

## In Progress 🔄

### Developer G - Current Tasks
- Setting up Electron app with 3-pane layout
- Implementing document type selectors in right pane
- Creating form system for middle pane
- Building document navigator for left pane

### Developer R - Current Tasks  
- Implementing PDFKit for legal document generation
- Creating PDF templates with proper formatting
- Building CLI command for PDF export
- Testing legal compliance of generated PDFs (margins, fonts, spacing, signature blocks)

---

## Todo by Friday 📋

### GUI Core (Developer G)
- Complete 3-pane layout implementation
- Document type selector buttons (8 types)
- Dynamic form generation in middle pane
- Text editor for generated documents
- Save edited documents functionality
- File browser showing text and PDF files
- PDF viewer in middle pane
    - initially implement with test PDF, then generated PDF's when available 
- Progress indicators during generation
     - same/similar to current progress indicators shown via cli tool
- API endpoints to call generation and PDF export
     - blocker: Ryan must complete PDF export functionality 

### PDF Generation (Developer R)
- Legal-compliant PDF formatting via CLI
- Page numbers and margins
- Signature blocks (attorney info, date lines, signature lines with proper placement)
    - WARNING:this requires updates to the json templates for all doc types
    - PUSH TO MAIN AS SOON AS COMPLETED AND TESTED
    - HIGHEST PRIORITY FOR DEVELOPER-R 
- Working CLI command: `casethread export input.txt output.pdf`
- Ensure PDF generation functions are modular and callable

### Integration Tasks (Both)
- Developer R completes PDF CLI functionality
- Developer G wraps functionality in API endpoints
- Test all 8 document types
- Ensure save/export workflow functions
- Performance optimization if needed

---

## Decisions Needed (Developer G to Decide)
- Save/Export button placement
- File organization structure for saved documents
- Naming convention for text/PDF pairs
- Left pane auto-refresh behavior
- Error handling UI patterns
- API endpoint structure and error responses

---

## Post-Friday Stretch Goals 🎯
- Generative editing functionality: AI-powered document modifications
- Advanced file management features (all optional - Developer G decides):
  - Folder organization by client/date/type
  - Search functionality
  - Bulk operations
  - File tagging
  - Sort/filter options
  - Metadata display
  - Rename/archive features
- Document summarization tab (optional)

---

## Timeline
- **Tuesday**: Core development begins
- **Wednesday**: Individual features complete
- **Thursday**: Integration and testing
- **Friday Morning**: Final polish and demo prep
- **Friday Afternoon**: Demo

---

## Risk Items
- Electron setup complexity
- PDF formatting compliance
- Integration time between GUI and backend
- Form validation for all document types 