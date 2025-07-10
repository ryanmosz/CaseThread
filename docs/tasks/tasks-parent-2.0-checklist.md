# Task 2.0 Checklist: Create Core PDF Generation Service with Legal Formatting

## Parent Task
- [ ] 2.0 Create Core PDF Generation Service with Legal Formatting

## Subtasks

### Setup and Foundation
- [ ] 2.1 Install and Configure PDFKit (Details: tasks-parent-2.1-detailed.md)
  - [ ] 2.1.1 Install PDFKit and TypeScript types
  - [ ] 2.1.2 Verify PDFKit works in Docker container
  - [ ] 2.1.3 Create basic PDF test to validate setup
  - [ ] 2.1.4 Update tech stack documentation

### Core PDF Generation
- [ ] 2.2 Create Base PDF Generator Class (Details: tasks-parent-2.2-detailed.md)
  - [ ] 2.2.1 Create LegalPDFGenerator class structure
  - [ ] 2.2.2 Implement basic document creation
  - [ ] 2.2.3 Add text writing methods
  - [ ] 2.2.4 Implement page management
  - [ ] 2.2.5 Add page numbering

### Document Formatting
- [ ] 2.3 Implement Document Formatting Rules (Details: tasks-parent-2.3-detailed.md)
  - [ ] 2.3.1 Create DocumentFormatter class
  - [ ] 2.3.2 Define formatting rules by document type
  - [ ] 2.3.3 Implement line spacing logic
  - [ ] 2.3.4 Handle special margin requirements
  - [ ] 2.3.5 Create formatting configuration

### Signature Block Processing
- [ ] 2.4 Build Signature Block Parser (Details: tasks-parent-2.4-detailed.md)
  - [ ] 2.4.1 Create SignatureBlockParser class
  - [ ] 2.4.2 Implement marker detection regex
  - [ ] 2.4.3 Parse signature block content
  - [ ] 2.4.4 Handle different block types
  - [ ] 2.4.5 Extract layout information

### Layout Engine
- [ ] 2.5 Implement PDF Layout Engine (Details: tasks-parent-2.5-detailed.md)
  - [ ] 2.5.1 Create PDFLayoutEngine class
  - [ ] 2.5.2 Implement signature block positioning
  - [ ] 2.5.3 Add page break prevention logic
  - [ ] 2.5.4 Handle side-by-side layouts
  - [ ] 2.5.5 Implement orphan control

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

## Notes

- Focus on MVP functionality first
- Keep formatting rules configurable
- Ensure all work happens in Docker container
- Test frequently with real document examples
- Coordinate with Developer G on integration points 