# Task 2.0 Checklist: Create Core PDF Generation Service with Legal Formatting

## Parent Task
- [ ] 2.0 Create Core PDF Generation Service with Legal Formatting

## Subtasks

### Setup and Foundation
- [x] 2.1 Install and Configure PDFKit (Details: tasks-parent-2.1-detailed.md)
  - [x] 2.1.1 Install PDFKit and TypeScript types
  - [x] 2.1.2 Verify PDFKit works in Docker container
  - [x] 2.1.3 Create basic PDF test to validate setup
  - [x] 2.1.4 Update tech stack documentation

### Core PDF Generation
- [x] 2.2 Create Base PDF Generator Class (Details: tasks-parent-2.2-detailed.md)
  - [x] 2.2.1 Create LegalPDFGenerator class structure
  - [x] 2.2.2 Implement basic document creation
  - [x] 2.2.3 Add text writing methods
  - [x] 2.2.4 Implement page management
  - [x] 2.2.5 Add page numbering

### Document Formatting
- [x] 2.3 Implement Document Formatting Rules (Details: tasks-parent-2.3-detailed.md)
  - [x] 2.3.1 Create DocumentFormatter class
  - [x] 2.3.2 Define formatting rules by document type
  - [x] 2.3.3 Implement line spacing logic
  - [x] 2.3.4 Handle special margin requirements
  - [x] 2.3.5 Create formatting configuration

### Signature Block Processing
- [x] 2.4 Build Signature Block Parser (Details: tasks-parent-2.4-detailed.md)
  - [x] 2.4.1 Create SignatureBlockParser class
  - [x] 2.4.2 Implement marker detection regex
  - [x] 2.4.3 Parse signature block content
  - [x] 2.4.4 Handle different block types
  - [x] 2.4.5 Extract layout information

### Layout Engine
- [x] 2.5 Implement PDF Layout Engine (Details: tasks-parent-2.5-detailed.md)
  - [x] 2.5.1 Create PDFLayoutEngine class
  - [x] 2.5.2 Implement signature block positioning
  - [x] 2.5.3 Add page break prevention logic
  - [x] 2.5.4 Handle side-by-side layouts
  - [x] 2.5.5 Implement orphan control

### CLI Integration
- [ ] 2.6 Create CLI Export Command (Details: tasks-parent-2.6-detailed.md)
  - [ ] 2.6.1 Create export command structure
  - [ ] 2.6.2 Add command line arguments
  - [ ] 2.6.3 Implement file reading logic
  - [ ] 2.6.4 Add progress indicators
  - [ ] 2.6.5 Handle errors gracefully

### Testing and Validation
- [ ] 2.7 Add Comprehensive Tests (Details: tasks-parent-2.7-detailed.md)
  - [ ] 2.7.1 Write unit tests for PDF generator
  - [ ] 2.7.2 Test signature block parser
  - [ ] 2.7.3 Test document formatter
  - [ ] 2.7.4 Create integration tests
  - [ ] 2.7.5 Test all 8 document types

## Definition of Done

- [ ] PDFKit successfully installed and working in Docker
- [ ] All classes implemented with proper TypeScript types
- [ ] PDF generation works for all 8 document types
- [ ] Legal formatting standards met:
  - [ ] Letter size (8.5 x 11)
  - [ ] Correct margins (1" standard, 1.5" for office actions)
  - [ ] Times New Roman 12pt
  - [ ] Document-specific line spacing
  - [ ] Page numbers positioned correctly
- [ ] Signature blocks:
  - [ ] All markers parsed correctly
  - [ ] Blocks positioned without page breaks
  - [ ] Side-by-side layouts working
- [ ] CLI export command functional
- [ ] All tests passing (318 existing + new PDF tests)
- [ ] Documentation updated
- [ ] No regression in existing functionality

## Testing Checklist

Before marking complete, verify:
- [ ] Run `docker exec casethread-dev npm test` - all pass
- [ ] Generate PDF for each document type manually
- [ ] Verify PDFs open in multiple readers
- [ ] Check print preview for margins/formatting
- [ ] Test with documents of various lengths
- [ ] Verify signature blocks don't split pages

## Relevant Files

- `src/types/pdf.ts` - TypeScript interfaces for PDF generation (includes formatting types and signature interfaces)
- `src/services/pdf/LegalPDFGenerator.ts` - Base PDF generator class (complete with all methods, enhanced moveTo())
- `src/services/pdf/DocumentFormatter.ts` - Document-specific formatting rules manager
- `src/services/pdf/SignatureBlockParser.ts` - Parser for signature block markers (Task 2.4 complete)
- `src/services/pdf/PDFLayoutEngine.ts` - PDF layout engine (Task 2.5 in progress)
- `src/config/pdf-formatting.ts` - Formatting configuration system
- `__tests__/services/pdf/LegalPDFGenerator.test.ts` - Unit tests for PDF generator (33 tests)
- `__tests__/services/pdf/DocumentFormatter.test.ts` - Unit tests for formatter (42 tests)
- `__tests__/services/pdf/SignatureBlockParser.test.ts` - Unit tests for signature parser (50 tests, all passing)
- `__tests__/services/pdf/PDFLayoutEngine.test.ts` - Unit tests for layout engine (10 tests, all passing)
- `__tests__/config/pdf-formatting.test.ts` - Unit tests for configuration (16 tests)
- `__tests__/services/pdf/pdfkit-setup.test.ts` - PDFKit setup validation tests (3 tests)
- `docs/testing/test-results/pdf-generation/` - Generated test PDFs (18+ files)

## Notes

- Focus on MVP functionality first
- Keep formatting rules configurable
- Ensure all work happens in Docker container
- Test frequently with real document examples
- Coordinate with Developer G on integration points 