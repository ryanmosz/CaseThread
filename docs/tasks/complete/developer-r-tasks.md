# Developer R - Task Priority List

## Current Focus: PDF Generation for Friday Demo

### ✅ COMPLETED: Task 6.0 - All 8 Templates Have Signature Blocks!
1. **Update JSON templates with signature block definitions** ✅
   - All 8 document types now have signature block metadata
   - Defined single vs side-by-side layouts  
   - Added party information structure
   - TypeScript types updated to support both standard and office action formats
   - All 318 tests passing (including 42 new signature block tests)
   
   **🎉 Task 6.0 FULLY COMPLETE**: Templates ready, types updated, all tests pass!

### 🟠 High Priority (Tuesday-Wednesday)
2. **Implement PDF generation with PDFKit including signature blocks**
   - Set up Letter size, 1" margins, Times New Roman 12pt
   - Create modular PDF generation service
   - Parse signature markers from text
   - Implement signature block positioning with page-break prevention
   - Handle single and side-by-side layouts
   - Test with all document types

### 🟡 Medium Priority (Wednesday)
3. **Complete legal formatting requirements**
   - Page numbering (bottom center/right)
   - Double-spacing for body text
   - Single-spacing for signature blocks
   - Professional document structure

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