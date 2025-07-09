# Developer R - Task Priority List

## Current Focus: PDF Generation for Friday Demo

### 🔴 Critical Priority (Tuesday)
1. **Update JSON templates with signature block definitions**
   - All 8 document types need signature block metadata
   - Define single vs side-by-side layouts
   - Add party information structure

### 🟠 High Priority (Tuesday-Wednesday)
2. **Implement basic PDF generation with PDFKit**
   - Set up Letter size, 1" margins, Times New Roman 12pt
   - Create modular PDF generation service
   - Test with simple text-to-PDF conversion

3. **Add signature block positioning logic**
   - Parse signature markers from text
   - Implement page-break prevention
   - Handle single and side-by-side layouts

### 🟡 Medium Priority (Wednesday)
4. **Complete legal formatting requirements**
   - Page numbering (bottom center/right)
   - Double-spacing for body text
   - Single-spacing for signature blocks
   - Professional document structure

5. **Create CLI export command**
   - `casethread export input.txt output.pdf`
   - Ensure functions are callable from code
   - Basic error handling

### 🟢 Final Priority (Thursday)
6. **Test all 8 document types**
   - Verify each template generates correctly
   - Check signature block placement
   - Validate legal formatting compliance

7. **Integration preparation**
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
- Keep functions modular for easy GUI integration
- Test each document type as you go
- Coordinate with Developer G on Thursday for integration

### 🚫 Not in Scope for Friday
- Advanced formatting (headers, footers, TOC)
- PDF/A compliance
- Complex citation formatting
- Batch processing 