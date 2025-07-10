# Developer R - Task Priority List

## 📢 IMPORTANT UPDATE: Task Structure Clarification
**Sections have been refactored to match Task 2.0 structure exactly**
- Section 2 now contains ALL of Parent Task 2.0 (Tasks 2.1-2.7)
- Section 3 (duplicate signature blocks) has been removed
- Following the structured task list in `docs/tasks/tasks-parent-2.0-checklist.md`

### Task Mapping:
- **Section 2** = Entire Parent Task 2.0 (35 sub-tasks)
  - ✅ PDFKit setup = Task 2.1 (Complete - 4/4 sub-tasks)
  - ✅ PDF architecture = Task 2.2 (Complete - 5/5 sub-tasks)
  - ⏳ Formatting rules = Task 2.3 (60% complete - 3/5 sub-tasks)
  - 📋 Signature parser = Task 2.4 (Not started - 0/5 sub-tasks)
  - 📋 Layout engine = Task 2.5 (Not started - 0/5 sub-tasks)
  - 📋 CLI command = Task 2.6 (Not started - 0/5 sub-tasks)
  - 📋 Testing = Task 2.7 (Not started - 0/5 sub-tasks)
- **Section 3** = Task 2.6 (CLI command) - redundant but kept for clarity
- **Section 4** = Task 2.7 (Testing) - redundant but kept for clarity
- **Section 5** = Post-Task 2.0 integration work

### Task 2.0 Progress Summary:
- **Complete**: 12 of 35 sub-tasks (34%)
- **In Progress**: Task 2.3 (Document Formatting)
- **Next Up**: Task 2.3.4 (Special margins for office actions)
- **Tests**: 377 passing (59 PDF-related tests)

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
2. **Create Core PDF Generation Service with Legal Formatting** (Task 2.0 - 35 sub-tasks)
   
   **✅ COMPLETE (Tasks 2.1-2.2):**
   - PDFKit setup with legal document standards (Task 2.1) ✅
     - Letter size (8.5 x 11), 1" margins, Times Roman 12pt
     - Works in Docker Alpine Linux environment
   - Base PDF Generator Class (Task 2.2) ✅
     - LegalPDFGenerator with document creation/finalization
     - Text methods: writeText(), writeParagraph(), writeTitle(), writeHeading()
     - Page management: tracking, breaks, space calculations
     - Page numbering (with PDFKit limitations noted)
   
   **⏳ IN PROGRESS (Task 2.3 - Document Formatting):**
   - DocumentFormatter class ✅
   - Formatting rules for all 8 document types ✅
   - Line spacing logic (applyLineSpacing, calculateLineHeight, etc.) ✅
   - Special margin requirements (office actions 1.5" top) ⏳ (Next: 2.3.4)
   - Formatting configuration system ⏳ (Task 2.3.5)
   
   **📋 NOT STARTED (Tasks 2.4-2.7):**
   - Signature Block Parser (Task 2.4)
     - Parse `[SIGNATURE_BLOCK:*]`, `[INITIALS_BLOCK:*]`, `[NOTARY_BLOCK:*]` markers
     - Extract block content and layout information
   - PDF Layout Engine (Task 2.5)
     - Position signature blocks without page breaks
     - Handle single, side-by-side, and grouped layouts
     - Implement orphan control
   - CLI Export Command (Task 2.6)
     - `casethread export <input> <output> [options]`
     - Progress indicators and error handling
   - Comprehensive Testing (Task 2.7)
     - Unit tests for all components
     - Integration tests
     - Test all 8 document types

### 🟡 Medium Priority (Wednesday)
3. **Create CLI export command** (Task 2.6)
   - `casethread export input.txt output.pdf`
   - Ensure functions are callable from code
   - Basic error handling

### 🟢 Final Priority (Thursday)
4. **Test all 8 document types thoroughly** (Task 2.7)
   - Verify each template generates correctly
   - Check signature block placement
   - Validate legal formatting compliance

5. **Integration preparation**
   - Ensure PDF service is modular
   - Document function signatures
   - Support Developer G's API integration

### 📋 Definition of Done (Friday AM)
- [ ] All document types export to PDF via CLI (Task 2.6)
- [ ] Signature blocks properly positioned (Tasks 2.4 & 2.5)
- [~] Legal formatting standards met (Tasks 2.1-2.3, 60% complete)
  - ✅ PDFKit setup and base generator
  - ✅ Document-specific formatting rules
  - ⏳ Special margins and configuration
- [ ] Functions ready for GUI integration (Throughout)
- [ ] Basic testing complete (Task 2.7)

### ⚠️ Key Reminders
- Section 2 now contains ALL of Task 2.0 (refactored for clarity)
- Currently on Task 2.3.3 (Document Formatting) - 3 of 5 sub-tasks complete
- Next: Task 2.3.4 (special margins), then 2.3.5 (configuration)
- Signature blocks come after formatting (Tasks 2.4 & 2.5)
- Total progress: 12 of 35 sub-tasks complete (34%)
- Keep functions modular for easy GUI integration
- Test each document type as you go
- Coordinate with Developer G on Thursday for integration

### 🚫 Not in Scope for Friday
- Advanced formatting (headers, footers, TOC)
- PDF/A compliance
- Complex citation formatting
- Batch processing 