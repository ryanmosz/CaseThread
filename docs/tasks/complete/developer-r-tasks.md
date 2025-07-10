# Developer R - Task Priority List

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
2. **Create Core PDF Generation Service with Legal Formatting**
   - Set up PDFKit with legal document standards:
     - Letter size (8.5 x 11)
     - 1" margins all sides
     - Times New Roman 12pt
     - Double-spacing for body text (check legal requirements)
     - Single-spacing for signature blocks and block quotes
     - Page numbering (bottom center/right)
   - Create modular PDF generation architecture:
     - Base LegalPDFGenerator class
     - Methods for title, paragraphs, sections, lists
     - Professional document structure
   - Implement text parsing:
     - Parse document sections
     - Identify paragraph types
     - Extract document metadata

3. **Implement Signature Block Handling**
   - Parse signature markers from generated text:
     - `[SIGNATURE_BLOCK:*]` markers
     - `[INITIALS_BLOCK:*]` markers
     - `[NOTARY_BLOCK:*]` markers
   - Implement signature block positioning:
     - Page-break prevention logic
     - Single signature layout
     - Side-by-side signature layout
     - Grouped signature layout
   - Test with all 8 document types:
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
- [ ] All document types export to PDF via CLI
- [ ] Signature blocks properly positioned
- [ ] Legal formatting standards met
- [ ] Functions ready for GUI integration
- [ ] Basic testing complete

### ⚠️ Key Reminders
- Signature blocks are HIGHEST PRIORITY - start here
- Consider main merge after task 1 if tests pass
- Keep functions modular for easy GUI integration
- Test each document type as you go
- Coordinate with Developer G on Thursday for integration

### 🚫 Not in Scope for Friday
- Advanced formatting (headers, footers, TOC)
- PDF/A compliance
- Complex citation formatting
- Batch processing 