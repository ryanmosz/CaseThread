# Product Requirements Document: Task 2.0 - Create Core PDF Generation Service with Legal Formatting

## 1. Task Overview

### Summary
This task implements a professional PDF generation service for the CaseThread CLI that converts generated legal documents into properly formatted PDFs. The service will parse text documents with signature block markers and create PDFs that meet legal industry standards for formatting, spacing, and layout.

### How It Fits Into CaseThread Architecture
- **Integrates with**: Existing text generation pipeline (templates → OpenAI → text output)
- **Extends**: CLI commands to include PDF export functionality
- **Enables**: Professional document delivery suitable for legal filing and client presentation
- **Foundation for**: Future GUI integration and batch processing capabilities

### Dependencies on Other Tasks
- **Requires**: Task 6.0 (Signature Blocks) - COMPLETED ✓
- **Requires**: Existing document generation pipeline - COMPLETED ✓
- **Independent of**: GUI development (Task being done by Developer G)

### What Becomes Possible
- Export any generated document to professional PDF format
- Maintain legal formatting standards across all document types
- Parse and position signature blocks correctly
- Provide print-ready documents for attorneys
- Enable e-filing compatible outputs

## 2. Technical Design

### Architecture Overview

```typescript
// Core PDF Service Architecture
src/
├── services/
│   ├── pdf/
│   │   ├── LegalPDFGenerator.ts      // Main PDF generation class
│   │   ├── PDFLayoutEngine.ts        // Layout and positioning logic
│   │   ├── SignatureBlockParser.ts   // Parse signature markers
│   │   └── DocumentFormatter.ts      // Format rules by document type
│   └── pdf-export.ts                 // High-level export service
├── types/
│   └── pdf.ts                        // PDF-specific type definitions
└── commands/
    └── export.ts                     // CLI export command
```

### Key Interfaces

```typescript
interface PDFGenerationOptions {
  documentType: string;
  inputText: string;
  outputPath: string;
  formatting?: DocumentFormattingOptions;
}

interface DocumentFormattingOptions {
  fontSize?: number;
  font?: 'Times-Roman' | 'Helvetica';
  lineSpacing?: 'single' | 'one-half' | 'double';
  margins?: Margins;
  pageNumbers?: PageNumberConfig;
}

interface SignatureBlock {
  id: string;
  type: 'signature' | 'initial' | 'notary';
  marker: string;
  layout: 'single' | 'side-by-side';
  content: string;
}
```

### Integration Points
1. **CLI Command**: New `export` command in Commander.js
2. **File System**: Read generated text files, write PDF outputs
3. **Template System**: Access document type metadata for formatting rules
4. **Logging**: Winston integration for debugging PDF generation

### Technology Stack (PDFKit)
- **PDFKit**: Core PDF generation library
- **Installation**: `npm install pdfkit @types/pdfkit`
- **Features Used**:
  - Document creation with custom page size
  - Font management (Times New Roman)
  - Text positioning and line spacing
  - Page numbering
  - Margin control

### Docker Considerations
- PDFKit runs in pure Node.js (no system dependencies)
- No additional Docker configuration needed
- Fonts bundled with PDFKit (no external font files)

## 3. Implementation Sequence

### Critical Path
1. **Setup PDFKit** → 2. **Basic Generator** → 3. **Formatting Rules** → 4. **Signature Parsing** → 5. **CLI Integration** → 6. **Testing**

### Subtask Order with Rationale
1. **Install and Configure PDFKit** (Foundation - blocks everything)
2. **Create Base PDF Generator Class** (Core functionality)
3. **Implement Document Formatting Rules** (Defines output quality)
4. **Build Signature Block Parser** (Critical feature from Task 6.0)
5. **Implement Layout Engine** (Handles positioning/page breaks)
6. **Create CLI Export Command** (User interface)
7. **Add Comprehensive Tests** (Validation)

### Parallel Work Opportunities
- Formatting rules can be developed alongside base generator
- Tests can be written in TDD style before implementation
- Documentation can be updated throughout

### Risk Points
- Font handling across different systems
- Page break logic for signature blocks
- Memory usage for large documents
- PDF file size optimization

## 4. Functional Requirements

1. **PDF Document Generation**
   - Generate PDF from text input with legal formatting
   - Support all 8 document types
   - Maintain consistent output quality

2. **Legal Formatting Standards**
   - Letter size (8.5 x 11 inches)
   - 1-inch margins (1.5" top for office actions)
   - Times New Roman 12pt font
   - Document-specific line spacing
   - Page numbers (bottom center/right)

3. **Signature Block Handling**
   - Parse `[SIGNATURE_BLOCK:*]` markers
   - Parse `[INITIALS_BLOCK:*]` markers
   - Parse `[NOTARY_BLOCK:*]` markers
   - Position blocks without page breaks
   - Support single and side-by-side layouts

4. **Document Type Specific Rules**
   - Double-spacing: Provisional patents, office actions
   - 1.5-spacing: Patent assignments
   - Single-spacing: Agreements, letters
   - Special headers for office actions

5. **CLI Export Command**
   - `casethread export <input-file> <output-pdf>`
   - Optional formatting overrides
   - Progress indication during generation
   - Error handling and user feedback

6. **Text Parsing**
   - Identify document sections
   - Preserve paragraph structure
   - Handle lists and indentation
   - Extract metadata for headers

7. **Page Management**
   - Automatic page breaks
   - Keep signature blocks together
   - Prevent orphaned headers
   - Consistent page numbering

8. **Output Quality**
   - Searchable text (not images)
   - Reasonable file sizes
   - Print-ready formatting
   - PDF/A compatibility (future)

## 5. Testing Strategy

### Unit Tests
- `LegalPDFGenerator.test.ts`: Core generation logic
- `SignatureBlockParser.test.ts`: Marker parsing accuracy
- `DocumentFormatter.test.ts`: Formatting rules by type
- `PDFLayoutEngine.test.ts`: Layout calculations

### Integration Tests
- Full document generation for each type
- CLI command execution
- File I/O operations
- Error scenarios

### Manual Testing
1. Generate PDFs for all 8 document types
2. Verify formatting in multiple PDF readers
3. Print samples to check margins/spacing
4. Test with documents of varying lengths

### Mock Requirements
- Mock file system for unit tests
- Sample documents with signature blocks
- Test fixtures for each document type

## 6. Integration Plan

### Integration with Existing Code
```typescript
// In existing generate command
const textOutput = await generator.generate(template, inputs);
await fileWriter.write(outputPath, textOutput);

// New PDF export option
if (options.pdf) {
  const pdfPath = outputPath.replace('.txt', '.pdf');
  await pdfExporter.export(textOutput, pdfPath, documentType);
}
```

### API Contracts
```typescript
// PDF Export Service
export interface PDFExportService {
  export(text: string, outputPath: string, documentType: string): Promise<void>;
  exportWithOptions(text: string, outputPath: string, options: PDFGenerationOptions): Promise<void>;
}
```

### Configuration
- No additional environment variables needed
- Document formatting rules in JSON config
- Optional user preferences for defaults

## 7. Documentation Requirements

### Code Documentation
- JSDoc comments for all public methods
- Interface documentation with examples
- Complex algorithm explanations

### README Updates
- Add PDF export section
- Include CLI usage examples
- Document formatting options

### API Documentation
- PDF service public methods
- Configuration options
- Integration examples

## 8. Success Metrics

### Completion Criteria
- All 8 document types generate valid PDFs
- Signature blocks positioned correctly
- Legal formatting standards met
- All tests passing (unit and integration)
- CLI command functioning

### Performance Benchmarks
- PDF generation < 3 seconds per document
- File sizes reasonable (< 500KB typical)
- Memory usage < 100MB during generation

### Quality Metrics
- Zero PDF corruption issues
- Consistent formatting across documents
- Readable in all major PDF viewers
- Print output matches screen display

## 9. Next Steps

### What Becomes Possible
- GUI integration for PDF preview
- Batch PDF generation
- Advanced formatting options
- Digital signature integration
- PDF/A archival format

### Recommended Follow-up Tasks
1. Task 3: Implement Signature Block Handling (detailed positioning)
2. Task 4: Create CLI Export Command (user interface)
3. Task 5: Test All Document Types (validation)
4. Task 6: Integration Preparation (for GUI)

### Future Enhancements
- Letterhead templates
- Custom fonts support
- Table of contents generation
- Bookmark/outline support
- Form field integration 