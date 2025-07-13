# PDF Service API Reference

## Overview

The CaseThread PDF Service provides a modular, flexible API for generating legal documents in PDF format. The service supports file output (CLI), buffer output (GUI), and custom integrations with progress reporting.

## Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Factory Methods](#factory-methods)
3. [Progress Reporting](#progress-reporting)
4. [Output Options](#output-options)
5. [Service Configuration](#service-configuration)
6. [Error Handling](#error-handling)

## Core Interfaces

### IPDFExportService

The main interface for PDF generation services.

```typescript
interface IPDFExportService {
  export(
    text: string, 
    outputPath: string, 
    documentType: string, 
    options?: PDFExportOptions
  ): Promise<void>;
  
  exportToBuffer(
    text: string, 
    documentType: string, 
    options?: PDFExportOptions
  ): Promise<PDFExportResult>;
}
```

#### Methods

##### `export(text, outputPath, documentType, options?)`

Exports text content to a PDF file.

**Parameters:**
- `text` (string): The document content to convert to PDF
- `outputPath` (string): File path where the PDF will be saved
- `documentType` (string): Type of legal document (see [Document Types](#document-types))
- `options` (PDFExportOptions, optional): Export options

**Returns:** `Promise<void>`

**Example:**
```typescript
const service = PDFServiceFactory.forCLI();
await service.export(
  documentContent,
  '/path/to/output.pdf',
  'nda-ip-specific',
  {
    pageNumbers: true,
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  }
);
```

##### `exportToBuffer(text, documentType, options?)`

Exports text content to a PDF buffer for in-memory use.

**Parameters:**
- `text` (string): The document content to convert to PDF
- `documentType` (string): Type of legal document
- `options` (PDFExportOptions, optional): Export options

**Returns:** `Promise<PDFExportResult>`

**Example:**
```typescript
const service = PDFServiceFactory.forGUI(progressCallback);
const result = await service.exportToBuffer(
  documentContent,
  'patent-assignment-agreement'
);
console.log(`Generated ${result.pageCount} pages in ${result.processingTime}ms`);
```

### PDFExportOptions

Configuration options for PDF export.

```typescript
interface PDFExportOptions {
  pageNumbers?: boolean;
  margins?: Margins;
  lineSpacing?: 'single' | 'one-half' | 'double';
  fontSize?: number;
  paperSize?: 'letter' | 'legal' | 'a4';
  header?: string;
  watermark?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
  onProgress?: (step: string, detail?: string) => void;
  parseMarkdown?: boolean;
}
```

### PDFExportResult

Result object returned by buffer export.

```typescript
interface PDFExportResult {
  buffer?: Buffer;
  pageCount: number;
  metadata: PDFMetadata;
  processingTime: number;
  signatureBlockCount: number;
  hasTableOfContents: boolean;
  estimatedReadingTime: number;
}
```

## Factory Methods

### PDFServiceFactory

Factory class for creating pre-configured PDF services.

```typescript
class PDFServiceFactory {
  static forCLI(): IPDFExportService;
  static forGUI(onProgress: ProgressCallback): IPDFExportService;
  static forTesting(config?: Partial<ServiceConfiguration>): IPDFExportService;
  static createExportService(config: Partial<ServiceConfiguration>): IPDFExportService;
}
```

#### `forCLI()`

Creates a PDF service optimized for CLI usage with console progress reporting.

**Returns:** `IPDFExportService`

**Example:**
```typescript
const service = PDFServiceFactory.forCLI();
// Progress will be shown using ora spinners in the console
```

#### `forGUI(onProgress)`

Creates a PDF service optimized for GUI usage with callback-based progress.

**Parameters:**
- `onProgress` (ProgressCallback): Function called with progress updates

**Returns:** `IPDFExportService`

**Example:**
```typescript
const service = PDFServiceFactory.forGUI((step, detail) => {
  updateProgressBar(step);
  updateStatusText(detail || '');
});
```

#### `forTesting(config?)`

Creates a PDF service for testing with optional mock dependencies.

**Parameters:**
- `config` (Partial<ServiceConfiguration>, optional): Custom service configuration

**Returns:** `IPDFExportService`

**Example:**
```typescript
const mockFormatter = createMockFormatter();
const service = PDFServiceFactory.forTesting({
  documentFormatter: mockFormatter
});
```

## Progress Reporting

### ProgressReporter Interface

```typescript
interface ProgressReporter {
  report(step: string, detail?: string): void;
  start(taskName: string): void;
  complete(): void;
  fail(error: Error): void;
}
```

### Available Implementations

#### ConsoleProgressReporter

Uses ora spinners for console output.

```typescript
const reporter = new ConsoleProgressReporter({
  includeTimestamps: false,
  trackDuration: true
});
```

#### CallbackProgressReporter

Invokes a callback function with progress updates.

```typescript
const reporter = new CallbackProgressReporter(
  (step, detail) => console.log(`${step}: ${detail}`),
  { includeTimestamps: true }
);
```

#### NullProgressReporter

Silent reporter for testing or when progress isn't needed.

```typescript
const reporter = new NullProgressReporter();
```

## Output Options

### PDFOutput Interface

Abstract interface for PDF output targets.

```typescript
interface PDFOutput {
  write(chunk: Buffer): Promise<void>;
  end(): Promise<Buffer | void>;
  getType(): 'file' | 'buffer' | 'stream';
}
```

### Implementations

#### FileOutput

Writes PDF to a file.

```typescript
const output = new FileOutput('/path/to/file.pdf');
```

#### BufferOutput

Accumulates PDF in memory.

```typescript
const output = new BufferOutput();
const buffer = await output.end(); // Returns Buffer
```

## Service Configuration

### ServiceConfiguration Interface

```typescript
interface ServiceConfiguration {
  templateLoader?: ITemplateLoader;
  documentFormatter?: IDocumentFormatter;
  signatureParser?: ISignatureParser;
  markdownParser?: IMarkdownParser;
  layoutEngineFactory?: LayoutEngineFactory;
  pdfGeneratorFactory?: PDFGeneratorFactory;
  progressReporter?: ProgressReporter;
  logger?: Logger;
}
```

### Custom Configuration Example

```typescript
const customService = new PDFExportService(
  customFormatter,
  customSignatureParser,
  customMarkdownParser,
  customLayoutEngineFactory,
  customPDFGeneratorFactory,
  customProgressReporter,
  customLogger
);
```

## Document Types

Supported legal document types:

- `provisional-patent-application`
- `trademark-application`
- `office-action-response`
- `nda-ip-specific`
- `patent-assignment-agreement`
- `patent-license-agreement`
- `technology-transfer-agreement`
- `cease-and-desist-letter`

Each document type has specific formatting rules and requirements.

## Error Handling

The service throws errors for:
- Invalid document types
- File system errors (for file output)
- PDF generation failures
- Invalid options

**Example error handling:**
```typescript
try {
  await service.export(text, output, docType);
} catch (error) {
  if (error.message.includes('Invalid document type')) {
    // Handle invalid document type
  } else if (error.message.includes('EACCES')) {
    // Handle file permission error
  } else {
    // Handle other errors
  }
}
```

## Progress Events

During PDF generation, the following progress events are reported:

1. "Initializing PDF components"
2. "Loading document formatting rules"
3. "Parsing signature blocks"
4. "Preparing document layout"
5. "Calculating page breaks"
6. "Starting PDF generation"
7. "Measuring content for accurate pagination"
8. "Rendering page X of Y"
9. "Finalizing PDF document"
10. "PDF export completed"

## Complete Example

```typescript
import { PDFServiceFactory } from '@casethread/pdf-service';

async function generateLegalDocument() {
  // Create service for GUI with progress tracking
  const service = PDFServiceFactory.forGUI((step, detail) => {
    console.log(`Progress: ${step}`);
    if (detail) console.log(`  Details: ${detail}`);
  });

  // Document content
  const content = `
# NON-DISCLOSURE AGREEMENT

This Agreement is entered into...

[SIGNATURE_BLOCK:disclosing_party]
[SIGNATURE_BLOCK:receiving_party]
  `;

  try {
    // Generate PDF to buffer
    const result = await service.exportToBuffer(content, 'nda-ip-specific', {
      pageNumbers: true,
      metadata: {
        title: 'NDA - Confidential',
        author: 'Legal Department',
        keywords: ['nda', 'confidential', 'ip']
      }
    });

    console.log(`PDF generated successfully!`);
    console.log(`- Pages: ${result.pageCount}`);
    console.log(`- Size: ${result.metadata.fileSize} bytes`);
    console.log(`- Time: ${result.processingTime}ms`);
    console.log(`- Signatures: ${result.signatureBlockCount}`);

    // Use the buffer (e.g., display in viewer, save to database, etc.)
    return result.buffer;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}
```

## See Also

- [Integration Guide](../guides/pdf-integration-guide.md)
- [Migration Guide](../guides/pdf-migration-guide.md)
- [Architecture Overview](../architecture/pdf-service-architecture.md) 