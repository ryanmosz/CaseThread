# Developer R - Task Priority List

## 📢 IMPORTANT UPDATE: Task Structure Clarification
**Section 2 and 3 below have significant overlap with Parent Task 2.0!**
- Section 2 = Tasks 2.1, 2.2, and 2.3 from the detailed checklist (mostly complete)
- Section 3 = Tasks 2.4, 2.5, and parts of 2.7 from the detailed checklist
- Following the structured task list in `docs/tasks/tasks-parent-2.0-checklist.md` for clarity

### Task Mapping:
- **Section 2** (PDF Generation Service) = Parent Task 2.0
  - PDFKit setup ✅ = Task 2.1 (Complete)
  - PDF architecture ✅ = Task 2.2 (Complete)
  - Formatting rules ⏳ = Task 2.3 (60% complete)
- **Section 3** (Signature Blocks) = Tasks 2.4 & 2.5
  - Parse markers = Task 2.4 (Not started)
  - Position blocks = Task 2.5 (Not started)
- **Section 4** (CLI command) = Task 2.6 (Not started)
- **Section 5** (Testing) = Task 2.7 (Not started)
- **Section 6** (Integration) = Post-Task 2.0 work

## Current Focus: PDF Generation for Friday Demo

### ✅ COMPLETED: Task 6.0 - All 8 Templates Have Signature Blocks!
1. **Update JSON templates with signature block definitions** ✅
   - All 8 document types now have signature block metadata
   - Defined single vs side-by-side layouts  
   - Added party information structure
   - TypeScript types updated to support both standard and office action formats
   - All 318 tests passing (including 42 new signature block tests)
   - Comprehensive documentation created (602 lines)
   
   **🎉 Task 6.0 FULLY COMPLETE**: All 12 sub-tasks done!
   - 6.1 ✅ Designed signature block JSON schema
   - 6.2-6.9 ✅ Implemented all 8 templates
   - 6.10 ✅ Updated TypeScript interfaces
   - 6.11 ✅ Verified all tests pass
   - 6.12 ✅ Created comprehensive documentation

### 🟠 High Priority (Tuesday-Wednesday)
2. **Create Core PDF Generation Service with Legal Formatting** (IN PROGRESS - Task 2.0)
   - Set up PDFKit with legal document standards: ✅ DONE (Task 2.1)
     - Letter size (8.5 x 11) ✅
     - 1" margins all sides ✅
     - Times New Roman 12pt ✅
     - Double-spacing for body text (check legal requirements) ✅
     - Single-spacing for signature blocks and block quotes ✅
     - Page numbering (bottom center/right) ✅
   - Create modular PDF generation architecture: ✅ DONE (Task 2.2)
     - Base LegalPDFGenerator class ✅
     - Methods for title, paragraphs, sections, lists ✅
     - Professional document structure ✅
   - Implement document formatting rules: ⏳ IN PROGRESS (Task 2.3)
     - DocumentFormatter class ✅
     - All 8 document types configured ✅
     - Line spacing logic ✅
     - Special margins (office actions) ⏳
     - Configuration system ⏳
   - [NOTE: "Text parsing" listed here is unclear - may be covered by later tasks]

3. **Implement Signature Block Handling** 
   ⚠️ **OVERLAP ALERT**: This entire section is already part of Task 2.0!
   - Parse signature markers from generated text: = Task 2.4 (Signature Block Parser)
     - `[SIGNATURE_BLOCK:*]` markers
     - `[INITIALS_BLOCK:*]` markers
     - `[NOTARY_BLOCK:*]` markers
   - Implement signature block positioning: = Task 2.5 (PDF Layout Engine)
     - Page-break prevention logic
     - Single signature layout
     - Side-by-side signature layout
     - Grouped signature layout
   - Test with all 8 document types: = Task 2.7 (Comprehensive Tests)
     - Verify each template's unique requirements
     - Check positioning and spacing
     - Ensure no page splits

### 🟡 Medium Priority (Wednesday)
4. **Create CLI export command**
   - `casethread export input.txt output.pdf`
   - Ensure functions are callable from code
   - Basic error handling

### 🟢 Final Priority (Thursday)
5. **Test all 8 document types thoroughly**
   - Verify each template generates correctly
   - Check signature block placement
   - Validate legal formatting compliance

6. **Integration preparation**
   - Ensure PDF service is modular
   - Document function signatures
   - Support Developer G's API integration

### 📋 Definition of Done (Friday AM)
- [ ] All document types export to PDF via CLI (Task 2.6)
- [ ] Signature blocks properly positioned (Tasks 2.4 & 2.5)
- [x] Legal formatting standards met (Tasks 2.1-2.3, 60% complete)
- [ ] Functions ready for GUI integration (Throughout)
- [ ] Basic testing complete (Task 2.7)

### ⚠️ Key Reminders
- Currently on Task 2.3.3 (Document Formatting Rules) - 3 of 5 sub-tasks complete
- Section 3 "Signature Block Handling" = Tasks 2.4 & 2.5 in our detailed checklist
- No duplication needed - follow tasks-parent-2.0-checklist.md structure
- Signature blocks are next after completing Task 2.3 (formatting)
- Keep functions modular for easy GUI integration
- Test each document type as you go
- Coordinate with Developer G on Thursday for integration

### 🚫 Not in Scope for Friday
- Advanced formatting (headers, footers, TOC)
- PDF/A compliance
- Complex citation formatting
- Batch processing 